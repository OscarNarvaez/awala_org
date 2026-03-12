require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const app = express();
const PORT = Number(process.env.PORT || 5500);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const WOMPI_PUBLIC_KEY = (process.env.WOMPI_PUBLIC_KEY || '').trim();
const WOMPI_PRIVATE_KEY = (process.env.WOMPI_PRIVATE_KEY || '').trim();
const WOMPI_INTEGRITY_SECRET = (process.env.WOMPI_INTEGRITY_SECRET || '').trim();
const WOMPI_EVENTS_SECRET = (process.env.WOMPI_EVENTS_SECRET || '').trim();
const WOMPI_API_BASE = 'https://api.wompi.co/v1';

// ═══════════════════════════════════════════════════════════════════════════
// SEGURIDAD: Headers HTTP con Helmet
// ═══════════════════════════════════════════════════════════════════════════
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.wompi.co"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://api.wompi.co", "https://formspree.io", "https://checkout.wompi.co"],
            frameSrc: ["'self'", "https://checkout.wompi.co"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: IS_PRODUCTION ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ═══════════════════════════════════════════════════════════════════════════
// SEGURIDAD: CORS - Orígenes permitidos
// ═══════════════════════════════════════════════════════════════════════════
const allowedOrigins = [
    'https://awalacolombia.org',
    'https://www.awalacolombia.org',
    `http://localhost:${PORT}`,
    BASE_URL
];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (ej: Postman, curl, mobile apps)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Origen no permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ═══════════════════════════════════════════════════════════════════════════
// SEGURIDAD: Rate Limiting - Protección contra DoS y spam
// ═══════════════════════════════════════════════════════════════════════════
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: { message: 'Demasiadas solicitudes, intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // más restrictivo para APIs
    message: { message: 'Demasiadas solicitudes a la API, intenta de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false
});

const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 50, // webhooks pueden ser frecuentes pero limitados
    message: { message: 'Demasiadas solicitudes de webhook.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(generalLimiter);
app.use('/api/', apiLimiter);
app.use('/api/wompi/webhook', webhookLimiter);

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES: Sanitización y validación de inputs
// ═══════════════════════════════════════════════════════════════════════════
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    return validator.escape(validator.trim(input));
};

const isValidEmail = (email) => {
    return validator.isEmail(email || '');
};

const isValidName = (name) => {
    const sanitized = sanitizeInput(name);
    return sanitized.length >= 2 && sanitized.length <= 100;
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES: Manejo seguro de errores
// ═══════════════════════════════════════════════════════════════════════════
const handleApiError = (res, statusCode, userMessage, internalError = null) => {
    if (internalError && !IS_PRODUCTION) {
        console.error(`[Error interno]: ${internalError.message || internalError}`);
    }
    res.status(statusCode).json({ message: userMessage });
};

app.use(express.json({ limit: '10kb' })); // Limitar tamaño del body
app.use(compression({ threshold: 1024 }));
app.use(express.static(__dirname, {
    etag: true,
    lastModified: true,
    maxAge: '7d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
            return;
        }

        if (/\.(?:css|js)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
            return;
        }

        if (/\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
        }
    }
}));

const assertWompiConfig = (res) => {
    if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY || !WOMPI_INTEGRITY_SECRET) {
        res.status(500).json({
            message: 'Faltan variables de entorno de Wompi. Revisa WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY y WOMPI_INTEGRITY_SECRET.'
        });
        return false;
    }

    return true;
};

const createReference = () => {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `AWALA-${stamp}-${random}`;
};

const buildIntegritySignature = ({ reference, amountInCents, currency }) => {
    const raw = `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
};

const getNestedValue = (source, pathExpression) => {
    if (!source || !pathExpression) {
        return undefined;
    }

    return pathExpression
        .split('.')
        .reduce((accumulator, key) => (accumulator == null ? undefined : accumulator[key]), source);
};

const toChecksumValue = (value) => {
    if (value === null || typeof value === 'undefined') {
        return '';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
};

const safeStringCompare = (valueA, valueB) => {
    if (!valueA || !valueB) {
        return false;
    }

    const bufferA = Buffer.from(String(valueA), 'utf8');
    const bufferB = Buffer.from(String(valueB), 'utf8');

    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
};

const validateWompiWebhookSignature = (payload, eventsSecret) => {
    const signature = payload?.signature;
    const properties = Array.isArray(signature?.properties) ? signature.properties : [];
    const receivedChecksum = String(signature?.checksum || '').trim().toLowerCase();
    const timestamp = payload?.timestamp;

    if (!eventsSecret) {
        return { ok: false, reason: 'Falta WOMPI_EVENTS_SECRET en el servidor.' };
    }

    if (!properties.length || !receivedChecksum || typeof timestamp === 'undefined') {
        return { ok: false, reason: 'El webhook no incluye firma, propiedades o timestamp válidos.' };
    }

    const baseString = properties
        .map((propertyPath) => {
            const normalizedPath = String(propertyPath).startsWith('data.')
                ? String(propertyPath).slice(5)
                : String(propertyPath);

            return toChecksumValue(getNestedValue(payload?.data || {}, normalizedPath));
        })
        .join('');

    const computedChecksum = crypto
        .createHash('sha256')
        .update(`${baseString}${String(timestamp)}${eventsSecret}`)
        .digest('hex');

    const isValid = safeStringCompare(receivedChecksum, computedChecksum);

    return {
        ok: isValid,
        reason: isValid ? '' : 'Checksum de webhook inválido.',
        computedChecksum,
        receivedChecksum
    };
};

const fetchMerchantInfo = async () => {
    const response = await fetch(`${WOMPI_API_BASE}/merchants/${encodeURIComponent(WOMPI_PUBLIC_KEY)}`);
    const payload = await response.json();

    if (!response.ok) {
        const detail = payload?.error?.reason || payload?.error?.messages?.[0] || 'No fue posible consultar la configuración del comercio en Wompi.';
        throw new Error(detail);
    }

    const acceptanceToken = payload?.data?.presigned_acceptance?.acceptance_token;

    if (!acceptanceToken) {
        throw new Error('Wompi no devolvió el acceptance token requerido.');
    }

    return { acceptanceToken };
};

app.post('/api/wompi/checkout-data', async (req, res) => {
    if (!assertWompiConfig(res)) {
        return;
    }

    const amount = Number(req.body?.amount || 0);
    const frequency = sanitizeInput(req.body?.frequency || 'unica');
    const destination = sanitizeInput(req.body?.destination || 'general');
    const donorName = sanitizeInput(req.body?.donorName || '');
    const donorEmail = validator.trim(req.body?.donorEmail || '').toLowerCase();

    // Validación de monto
    if (!Number.isFinite(amount) || amount < 5000 || amount > 50000000) {
        return handleApiError(res, 400, 'El monto debe estar entre $5.000 y $50.000.000 COP.');
    }

    // Validación de nombre
    if (!isValidName(donorName)) {
        return handleApiError(res, 400, 'El nombre debe tener entre 2 y 100 caracteres válidos.');
    }

    // Validación de email
    if (!isValidEmail(donorEmail)) {
        return handleApiError(res, 400, 'Por favor ingresa un correo electrónico válido.');
    }

    // Validación de frecuencia
    const allowedFrequencies = ['unica', 'mensual'];
    if (!allowedFrequencies.includes(frequency)) {
        return handleApiError(res, 400, 'Frecuencia de donación no válida.');
    }

    // Validación de destino
    const allowedDestinations = ['educacion', 'mujeres', 'territorio', 'general'];
    if (!allowedDestinations.includes(destination)) {
        return handleApiError(res, 400, 'Destino de donación no válido.');
    }

    const currency = 'COP';
    const amountInCents = Math.round(amount * 100);
    const reference = createReference();

    try {
        const { acceptanceToken } = await fetchMerchantInfo();

        const checkout = {
            publicKey: WOMPI_PUBLIC_KEY,
            currency,
            amountInCents,
            reference,
            signature: {
                integrity: buildIntegritySignature({ reference, amountInCents, currency })
            },
            acceptanceToken,
            redirectUrl: `${BASE_URL}/donaciones.html?estado=retorno`,
            customerData: {
                fullName: donorName,
                email: donorEmail
            },
            metadata: {
                frecuencia: frequency,
                destino: destination,
                origen: 'web-awala'
            }
        };

        res.json({ checkout });
    } catch (error) {
        handleApiError(res, 502, 'No se pudo iniciar el proceso de donación. Intenta de nuevo más tarde.', error);
    }
});

app.get('/api/wompi/transactions/:id', async (req, res) => {
    if (!assertWompiConfig(res)) {
        return;
    }

    const transactionId = sanitizeInput(req.params.id || '');

    // Validar formato del ID de transacción (solo alfanuméricos y guiones)
    if (!transactionId || !/^[a-zA-Z0-9\-]+$/.test(transactionId)) {
        return handleApiError(res, 400, 'ID de transacción inválido.');
    }

    try {
        const response = await fetch(`${WOMPI_API_BASE}/transactions/${encodeURIComponent(transactionId)}`, {
            headers: {
                Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`
            }
        });

        const payload = await response.json();

        if (!response.ok) {
            return handleApiError(res, 404, 'No se encontró la transacción solicitada.');
        }

        res.json({
            id: payload?.data?.id,
            status: payload?.data?.status,
            amountInCents: payload?.data?.amount_in_cents,
            reference: payload?.data?.reference,
            paymentMethodType: payload?.data?.payment_method_type
        });
    } catch (error) {
        handleApiError(res, 502, 'Error al consultar la transacción. Intenta de nuevo más tarde.', error);
    }
});

app.post('/api/wompi/webhook', (req, res) => {
    const signatureValidation = validateWompiWebhookSignature(req.body, WOMPI_EVENTS_SECRET);

    if (!signatureValidation.ok) {
        console.warn(`[Wompi webhook] Firma inválida: ${signatureValidation.reason}`);
        res.status(401).json({ ok: false, message: 'Firma de webhook inválida.' });
        return;
    }

    const event = req.body?.event;
    const transactionId = req.body?.data?.transaction?.id;
    const transactionStatus = req.body?.data?.transaction?.status;

    if (event && transactionId) {
        console.log(`[Wompi webhook] Evento verificado: ${event} | transaction: ${transactionId} | status: ${transactionStatus || 'N/A'}`);
    } else {
        console.log('[Wompi webhook] Evento verificado sin datos mínimos para rastreo.');
    }

    res.status(200).json({ ok: true });
});

app.get('/', (_, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ═══════════════════════════════════════════════════════════════════════════
// SEGURIDAD: Manejador de errores global
// ═══════════════════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
    if (err.message === 'Origen no permitido por CORS') {
        return res.status(403).json({ message: 'Acceso no autorizado.' });
    }

    console.error(`[Error no manejado]: ${err.message}`);
    res.status(500).json({ message: 'Ha ocurrido un error inesperado.' });
});

// Ruta 404 para APIs
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'Endpoint no encontrado.' });
});

app.listen(PORT, () => {
    console.log(`Awala web disponible en ${BASE_URL}`);
    console.log(`Modo: ${IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO'}`);

    if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY || !WOMPI_INTEGRITY_SECRET) {
        console.warn('⚠️  Wompi no está configurado. Crea tu archivo .env a partir de .env.example');
    }

    if (!WOMPI_EVENTS_SECRET) {
        console.warn('⚠️  Webhook de Wompi sin validación activa. Configura WOMPI_EVENTS_SECRET en .env');
    }

    console.log('✅ Seguridad habilitada: Helmet, CORS, Rate Limiting, Validación de inputs');
});
