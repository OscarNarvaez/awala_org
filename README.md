# AWALA ONG - Sitio Web Institucional

![Estado](https://img.shields.io/badge/estado-en%20desarrollo-1f6feb)
![Tipo](https://img.shields.io/badge/tipo-sitio%20est%C3%A1tico-0ea5e9)
![Licencia](https://img.shields.io/badge/licencia-Apache--2.0-16a34a)

Sitio web institucional de **AWALA ONG**, enfocado en visibilizar su misión social, proyectos, noticias, formas de participación y canal de donaciones.

## Tabla de contenido

- [Resumen](#resumen)
- [Características principales](#caracter%C3%ADsticas-principales)
- [Tecnologías](#tecnolog%C3%ADas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Puesta en marcha local](#puesta-en-marcha-local)
- [Despliegue](#despliegue)
- [Configuraciones importantes](#configuraciones-importantes)
- [Hoja de ruta](#hoja-de-ruta)
- [Licencia](#licencia)

## Resumen

Este proyecto implementa un sitio **multi-página** en HTML, CSS y JavaScript vanilla para comunicar el trabajo de AWALA:

- Home institucional con propuesta de valor
- Sección de proyectos activos
- Página de noticias y novedades
- Página de participación (alianzas, voluntariado, convocatorias, empleo)
- Página de donaciones con formulario y resumen dinámico
- Formulario de contacto integrado vía backend SMTP

## Características principales

- **Navegación responsive** con menú hamburguesa en móviles
- **Header sticky** y navegación activa por sección/página
- **Carruseles reutilizables** (objetivos y proyectos)
- **Interacciones dinámicas** en participación (`data-participa-*`)
- **Selector de proveedor de correo** para envío de hoja de vida
- **Formulario de donación** con:
  - frecuencia (única/mensual)
  - montos predefinidos y monto personalizado
  - resumen de aporte en tiempo real
  - checkout integrado con **Wompi**
- **Estilo visual unificado** y componentes compartidos en una sola hoja CSS

## Tecnologías

- **HTML5**
- **CSS3** (estilos personalizados, diseño responsive)
- **JavaScript (ES6+)** sin frameworks
- **Google Fonts (Montserrat)**
- **Node.js + Express** para endpoints de contacto y donaciones
- **Nodemailer** para envío de correos de contacto

## Estructura del proyecto

```text
ONG/
├─ index.html
├─ projects.html
├─ news.html
├─ participa.html
├─ donaciones.html
├─ styles.css
├─ script.js
├─ images/
├─ LICENSE
└─ README.md
```

## Puesta en marcha local

### Opción 1: servidor Node (recomendado para donaciones)

1. Instalar dependencias:

```bash
npm install
```

2. Crear archivo `.env` tomando como base `.env.example` (copia y pega su contenido).

3. Completar variables en `.env`:
  - Wompi: `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`
  - Contacto SMTP: `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`

4. Levantar el sitio:

```bash
npm start
```

Luego abrir: `http://localhost:5500/`

### Opción 2: servidor local simple (sin backend de pagos)

```bash
# Python 3
python -m http.server 5500
```

Luego abrir: `http://localhost:5500/`

> También puedes usar la extensión **Live Server** en VS Code.

## Despliegue

El proyecto está alojado en GitHub:

- Repositorio: <https://github.com/OscarNarvaez/awala_org>

### Publicar en GitHub Pages (opcional)

1. Ir a **Settings > Pages** en el repositorio.
2. En **Build and deployment**, seleccionar:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` y carpeta `/ (root)`
3. Guardar y esperar la URL pública generada por GitHub Pages.

## Configuraciones importantes

### 1) Contacto por SMTP (backend)
El formulario de contacto envía al endpoint:

- `POST /api/contact`

El destinatario final se define con:

- `CONTACT_TO_EMAIL=awala@awalacolombia.org`

Si usas Google Workspace, configura SMTP con `smtp.gmail.com` y credenciales válidas en `.env`.

### 2) Donaciones (Wompi)
La pasarela quedó integrada con endpoints en `server.js`:

- `POST /api/wompi/checkout-data`
- `GET /api/wompi/transactions/:id`
- `POST /api/wompi/webhook`

El endpoint de webhook valida firma criptográfica (checksum SHA-256) con `WOMPI_EVENTS_SECRET` usando:

- `signature.properties`
- `timestamp`
- `signature.checksum`

> Para ambiente productivo, configura el webhook en el dashboard de Wompi apuntando a `/api/wompi/webhook`, define el secreto de eventos y usa llaves de producción.

### 3) Contenido pendiente de ajuste
Existen textos marcados en el sitio para reemplazo editorial (por ejemplo: estadísticas y destinos de donación).

## Hoja de ruta

- [x] Conectar donaciones con pasarela de pago
- [ ] Reemplazar datos placeholder por cifras verificadas
- [ ] Añadir analítica web (eventos de contacto y donación)
- [ ] Optimizar imágenes y rendimiento (LCP/CLS)
- [ ] Incorporar pruebas básicas de UI y accesibilidad

## Licencia

Este proyecto se distribuye bajo la licencia **Apache 2.0**. 
Consulta el archivo `LICENSE` para más información.
