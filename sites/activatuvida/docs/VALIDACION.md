# Validación (24-sep-2026)

> **Versión simplificada:** 51/51 comprobaciones en navegador superadas (se añade la ventana de estudios con sus 14 PDF). Validación estática superada. HTML de 55,8 KB.

Comandos: `npm run validate` (build + validación estática + Worker + navegador) y `CHECK_LINKS=1 npm run check` (enlaces externos). Resultados detallados en `capturas/resultados.json`.

## Resultado

| Área | Comprobación | Resultado |
|---|---|---|
| Build | `npm run build` y `npm run build:production` | ✅ HTML de 82,5 KB (15,7 KB gzip), CSS de 8,2 KB gzip, JS de 2,9 KB gzip, fuentes de 82 KB. Sin dependencias npm |
| Responsive | 360, 390, 768 y 1440 px: sin scroll horizontal | ✅ exceso de 0 px en los cuatro anchos |
| Carga | Sin peticiones a terceros al cargar la página | ✅ solo recursos propios; Vimeo se carga al pulsar play |
| Imágenes | Todas cargan (recorriendo la página) | ✅ en los cuatro anchos |
| Menú móvil | Abrir, foco en el primer enlace, Esc cierra, el foco vuelve al botón, el resto de la página queda `inert` | ✅ 360, 390 y 768 px |
| Anclas | Enlace del menú → `#uso` con compensación de la cabecera fija | ✅ |
| Diálogos | «Información sobre paquetes y precios»: abre y cierra con Esc | ✅ los cuatro anchos |
| Carrusel | Navegación manual (botones, teclado ← →, deslizar), sin autoplay | ✅ contador 1/7 → 2/7 |
| Video principal | El iframe no existe hasta el clic; después, `player.vimeo.com/video/1133177065` | ✅ |
| Testimonios | Se abren en un diálogo, y al cerrar se elimina el iframe (el audio se detiene) | ✅ |
| Consola | Sin errores | ✅ los cuatro anchos |
| Movimiento reducido | Con `prefers-reduced-motion: reduce` todo el contenido es visible y sin animaciones | ✅ |
| Teclado | Primer Tab = «Saltar al contenido»; foco visible (contorno cian) | ✅ |
| Sin JavaScript | Contenido visible, acordeones nativos (`<details>`); videos con enlace a Vimeo | ✅ |
| Accesibilidad (axe-core 4, WCAG 2.1 AA + buenas prácticas) | 390 y 1440 px | ✅ 0 incidencias (47 reglas superadas) |
| Rutas | `/X39` 200 · `/x39` 301 · `/X39/` 301 · `/x39/?utm=1` 301 conservando la query · `/X39/index.html` 301 · `/otra-ruta` sin interferencias | ✅ servidor local que emula producción + `npm run test:worker` (14 casos, incluido el reenvío a Canva) |
| Validación estática | Anclas y `aria-*` a ids existentes; recursos locales presentes; `alt` en todas las imágenes; un único `<h1>`; canonical, Open Graph y `lang`; sin iframes iniciales; sin restos de GA ni Elementor del original; `noindex` solo en vista previa | ✅ 56 ids, 38 recursos |
| Enlaces externos | 12 PDF de estudios, 2 PDF de patentes, PubMed, estudios de otros productos, fichas oficiales de LifeWave | ✅ 200 (PubMed 203) |
| | Google Patents (2) y GlobeNewswire | ⚠ 503 a peticiones automatizadas (anti-bot). Verificados a mano en este entorno: Google Patents devolvió 200 con el título correcto en otra petición, y el comunicado se leyó en su copia de Yahoo Finance |
| Aislamiento | La app WeWebinars (Next.js) no cambia: `sites/**` queda excluido de ESLint y `dist/` de git | ✅ |

## Antes del despliegue (25-sep-2026)

| Paso | Resultado |
|---|---|
| `npm run build:production` | ✅ `X39.html` de 81,4 KB, modo production |
| `npm run check:production` | ✅ 56 ids, 43 recursos locales. `npm run check` sin `SITE_MODE` valida en modo preview y falla sobre un build de producción («La vista previa debe llevar noindex»); por eso se añade `check:production` |
| `npm run test:worker` | ✅ incluidos `/` → 302 `/X39`, `www` → 301 y `/x39` → 301 |
| DNS público | ✅ NS de `activatuvida.life` = `demi`/`newt.ns.cloudflare.com`; sin registro A (la web de Canva ya no se sirve) |
| Token de Cloudflare | ✅ corregido: `/user/tokens/verify` → *active*; cuenta accesible; zona `activatuvida.life` **activa** |
| Subida de Static Assets | ❌ `401` en `/workers/assets/upload` (el proxy reemplaza el JWT de subida) → se despliega con los archivos incrustados (`deploy/worker-inline.js`) |
| Vista previa `workers.dev` | ✅ <https://activatuvida-x39-preview.activatuvida-x39.workers.dev/X39>: `/X39` 200 (HTML con `noindex`, cabeceras `Cache-Control`, `nosniff`, `Referrer-Policy`) · `/x39` 301 · `/x39/?utm_source=wa` 301 conservando la query · `/X39/` 301 · `/` 302 → `/X39` · `/otra` 404 · CSS, WebP y WOFF2 200 con su tipo MIME · `If-None-Match` → 304 · WebP idéntico byte a byte a `dist/` |
| Dominio `activatuvida.life` | ⏳ pendiente de la confirmación del propietario en el chat |

## Capturas

En `capturas/`:

- `x39-{360,390,768,1440}-hero.jpg`: primera pantalla.
- `x39-{360,390,768,1440}-full.jpg`: página completa.
- `x39-{360,390,768}-menu.jpg`: menú móvil abierto.
- `x39-390-dialogo.jpg`: diálogo de paquetes.

Las capturas son de la vista previa: incluyen el aviso «Vista previa · 3 destinos pendientes» y los botones marcados como «Pendiente».

## Pendiente de verificar fuera de este entorno

1. **Reproducción de Vimeo desde `activatuvida.life`.** Los 13 videos existen (el oEmbed público responde con título y duración). El navegador automatizado recibe un desafío de Cloudflare de Vimeo desde este centro de datos, así que no se pudo reproducir ninguno. Si algún video tiene restringida la inserción a whythelight.com, el reproductor mostrará el aviso de Vimeo. Debajo de cada video queda el enlace «Ábrelo en Vimeo». Pruébalo en la vista previa: <https://activatuvida-x39-preview.activatuvida-x39.workers.dev/X39>.
2. **Botones de compra, WhatsApp y correo:** pendientes de configurar (`site.config.mjs`).
3. ~~Proxy del sitio de Canva~~: ya no aplica. El propietario decidió el 25-sep-2026 que todo el dominio pase a esta página (`CANVA_ORIGIN` vacío).
4. **Comprobación en producción:** `/X39` 200, `/x39` 301, `/` 302 y `www` 301 en `activatuvida.life`, cuando se despliegue.

## Cobertura frente al inventario

Todas las secciones del inventario tienen ubicación final o una decisión registrada (ver INVENTARIO.md, columna «Estado»). No se perdió ningún bloque. Lo que cambia es la forma de algunas afirmaciones, documentado en REGISTRO-EDITORIAL.md:

- 4 testimonios no publicados y 3 desactivados.
- La ventana emergente con formulario de pago, sustituida por un diálogo sin cifras.
- La cronología reformulada según lo que midieron los estudios.
- Las afirmaciones de enfermedad de la subpágina GHK-Cu.
- El selector de idiomas.
