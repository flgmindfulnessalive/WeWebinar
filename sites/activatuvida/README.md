# ACTIVA TU VIDA · /X39

Sitio estático, rápido y sin dependencias para **https://activatuvida.life/X39**. Presenta el parche LifeWave X39 a partir del contenido de https://whythelight.com/es/, rediseñado y verificado con fuentes oficiales de LifeWave. Es la iniciativa de un Brand Partner independiente, no el sitio oficial de LifeWave.

Vive en este repositorio como proyecto independiente: no forma parte de la app WeWebinars (Next.js) ni afecta a su build.

## Uso rápido

Requiere Node 18 o superior. No hay que instalar nada.

```bash
cd sites/activatuvida
npm run build          # vista previa (noindex, botones pendientes visibles)
npm run preview        # http://localhost:4173/X39
npm run validate       # build + validación estática + Worker + navegador (requiere Playwright)
npm run build:production
```

## Dónde se cambia cada cosa

| Quiero cambiar… | Archivo |
|---|---|
| Enlace de compra, WhatsApp, correo, datos del distribuidor, analítica, videos, PDF y estudios | **`site.config.mjs`** |
| Textos de cualquier sección, testimonios activos (`enabled`) | `content/x39.mjs` |
| Estructura y marcado de las secciones | `src/components/sections.mjs` |
| Componentes base (botones, reproductor, parche, imágenes) | `src/components/ui.mjs` |
| Estilos y dirección de arte (tokens en `:root`) | `src/styles/main.css` |
| Interacción (menú, videos, carrusel, diálogos) | `src/client/app.js` |
| Imágenes | `assets/img/<nombre>-<ancho>.webp` (el build detecta anchos y tamaños) |

## Documentación de entrega

- [docs/INVENTARIO.md](docs/INVENTARIO.md): inventario del sitio original y ubicación final de cada elemento.
- [docs/REGISTRO-EDITORIAL.md](docs/REGISTRO-EDITORIAL.md): correcciones y afirmaciones pendientes de revisión.
- [docs/VALIDACION.md](docs/VALIDACION.md): pruebas realizadas y resultados. Capturas en `docs/capturas/`.
- [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md): pasos exactos para publicar en activatuvida.life/X39.

## Pendiente de configurar antes de publicar

En `site.config.mjs`:

- `contact.email` (opcional; aparece en el pie si se completa).
- `distributor.location` (opcional).
- En `deploy/wrangler.toml`: `CANVA_ORIGIN`: URL exacta de la web de Canva en `activatuvida-x39.my.canva.site` (se completa el día del lanzamiento).

## Créditos y licencias

- **Tipografías:** Inter y Sora (SIL Open Font License), autoalojadas.
- **Fotografía ambiental:** Unsplash (Licencia Unsplash, no exige atribución). Ola del cierre (`ola-propia`): imagen propia del propietario, generada con ChatGPT (25-sep-2026). Ya no se usa la foto «Teahupoo1» (CC BY 2.0), que obligaba a citar al autor en el pie.
- **El parche:** representación vectorial propia.
- **Videos:** alojados en Vimeo por sus autores y cargados solo a demanda.
- LifeWave, X39, Cellergize y X2O son marcas de LifeWave, Inc.
