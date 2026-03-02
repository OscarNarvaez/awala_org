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
- Formulario de contacto integrado vía Formspree

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
- **Estilo visual unificado** y componentes compartidos en una sola hoja CSS

## Tecnologías

- **HTML5**
- **CSS3** (estilos personalizados, diseño responsive)
- **JavaScript (ES6+)** sin frameworks
- **Google Fonts (Montserrat)**
- **Formspree** para el formulario de contacto

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

### Opción 1: apertura directa
Abrir `index.html` en el navegador.

### Opción 2: servidor local (recomendado)

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

### 1) Contacto por Formspree
En `index.html` se usa el atributo:

- `data-formspree-endpoint="https://formspree.io/f/mojnzygk"`

Si cambias de cuenta o formulario, actualiza ese endpoint.

### 2) Donaciones
La página `donaciones.html` incluye lógica de UI para donaciones, pero **no integra aún una pasarela de pago real**. 

Para producción, conectar el botón de envío con una pasarela (por ejemplo, Wompi, Mercado Pago, Stripe, PayU, etc.) y validar:

- seguridad
- trazabilidad
- confirmación de pagos
- cumplimiento legal y tratamiento de datos

### 3) Contenido pendiente de ajuste
Existen textos marcados en el sitio para reemplazo editorial (por ejemplo: estadísticas y destinos de donación).

## Hoja de ruta

- [ ] Conectar donaciones con pasarela de pago
- [ ] Reemplazar datos placeholder por cifras verificadas
- [ ] Añadir analítica web (eventos de contacto y donación)
- [ ] Optimizar imágenes y rendimiento (LCP/CLS)
- [ ] Incorporar pruebas básicas de UI y accesibilidad

## Licencia

Este proyecto se distribuye bajo la licencia **Apache 2.0**. 
Consulta el archivo `LICENSE` para más información.
