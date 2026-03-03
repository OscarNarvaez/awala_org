require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const PORT = Number(process.env.PORT || 5500);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

const WOMPI_PUBLIC_KEY = (process.env.WOMPI_PUBLIC_KEY || '').trim();
const WOMPI_PRIVATE_KEY = (process.env.WOMPI_PRIVATE_KEY || '').trim();
const WOMPI_INTEGRITY_SECRET = (process.env.WOMPI_INTEGRITY_SECRET || '').trim();
const WOMPI_EVENTS_SECRET = (process.env.WOMPI_EVENTS_SECRET || '').trim();
const WOMPI_API_BASE = 'https://api.wompi.co/v1';

const CONTACT_TO_EMAIL = (process.env.CONTACT_TO_EMAIL || 'awala@awalacolombia.org').trim();
const CONTACT_FROM_EMAIL = (process.env.CONTACT_FROM_EMAIL || '').trim();
const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true').trim().toLowerCase() === 'true';
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || '').trim();

app.use(express.json());
app.use(express.static(__dirname));

const hasSmtpConfig = () => Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

const contactTransporter = hasSmtpConfig()
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    })
    : null;

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

const sanitizeHeaderText = (value) => String(value || '').replace(/[\r\n]+/g, ' ').trim();

app.post('/api/contact', async (req, res) => {
    if (!contactTransporter) {
        res.status(500).json({
            message: 'El canal de contacto no está configurado en el servidor. Revisa SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS.'
        });
        return;
    }

    const name = sanitizeHeaderText(req.body?.nombre);
    const email = String(req.body?.correo || '').trim();
    const interest = sanitizeHeaderText(req.body?.interes || req.body?.tipo_contacto || 'Otro');
    const message = String(req.body?.mensaje || '').trim();

    if (!name || !email || !message) {
        res.status(400).json({ message: 'Nombre, correo y mensaje son obligatorios.' });
        return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
        res.status(400).json({ message: 'El correo electrónico no es válido.' });
        return;
    }

    const fromAddress = CONTACT_FROM_EMAIL || SMTP_USER;

    try {
        await contactTransporter.sendMail({
            from: fromAddress,
            to: CONTACT_TO_EMAIL,
            replyTo: email,
            subject: `Nuevo contacto web AWALA - ${interest}`,
            text: [
                'Nuevo mensaje desde el formulario de contacto de AWALA',
                '',
                `Nombre: ${name}`,
                `Correo: ${email}`,
                `Interés: ${interest}`,
                '',
                'Mensaje:',
                message
            ].join('\n'),
            html: `
                <h2>Nuevo mensaje desde el formulario de contacto de AWALA</h2>
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Correo:</strong> ${email}</p>
                <p><strong>Interés:</strong> ${interest}</p>
                <p><strong>Mensaje:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `
        });

        res.json({ ok: true, message: 'Mensaje enviado correctamente.' });
    } catch (error) {
        res.status(502).json({ message: `No se pudo enviar el correo de contacto: ${error.message}` });
    }
});

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
    const frequency = String(req.body?.frequency || 'unica');
    const destination = String(req.body?.destination || 'general');
    const donorName = String(req.body?.donorName || '').trim();
    const donorEmail = String(req.body?.donorEmail || '').trim();

    if (!Number.isFinite(amount) || amount < 5000) {
        res.status(400).json({ message: 'El monto mínimo de donación es $5.000 COP.' });
        return;
    }

    if (!donorName || !donorEmail) {
        res.status(400).json({ message: 'Nombre y correo son obligatorios para continuar.' });
        return;
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
        res.status(502).json({ message: `No se pudo iniciar el checkout en Wompi: ${error.message}` });
    }
});

app.get('/api/wompi/transactions/:id', async (req, res) => {
    if (!assertWompiConfig(res)) {
        return;
    }

    const transactionId = String(req.params.id || '').trim();

    if (!transactionId) {
        res.status(400).json({ message: 'Id de transacción inválido.' });
        return;
    }

    try {
        const response = await fetch(`${WOMPI_API_BASE}/transactions/${encodeURIComponent(transactionId)}`, {
            headers: {
                Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`
            }
        });

        const payload = await response.json();

        if (!response.ok) {
            const detail = payload?.error?.reason || payload?.error?.messages?.[0] || 'No fue posible consultar la transacción.';
            throw new Error(detail);
        }

        res.json({
            id: payload?.data?.id,
            status: payload?.data?.status,
            amountInCents: payload?.data?.amount_in_cents,
            reference: payload?.data?.reference,
            paymentMethodType: payload?.data?.payment_method_type
        });
    } catch (error) {
        res.status(502).json({ message: `Error validando transacción en Wompi: ${error.message}` });
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

app.listen(PORT, () => {
    console.log(`Awala web disponible en ${BASE_URL}`);

    if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY || !WOMPI_INTEGRITY_SECRET) {
        console.warn('Wompi no está configurado. Crea tu archivo .env a partir de .env.example');
    }

    if (!WOMPI_EVENTS_SECRET) {
        console.warn('Webhook de Wompi sin validación activa. Configura WOMPI_EVENTS_SECRET en .env');
    }

    if (!contactTransporter) {
        console.warn('Formulario de contacto sin envío activo. Configura SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS en .env');
    } else {
        console.log(`Formulario de contacto configurado para entregar mensajes en ${CONTACT_TO_EMAIL}`);
    }
});
