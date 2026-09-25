# Despliegue en activatuvida.life/X39

> **Nada de esto se ha ejecutado.** No se ha publicado nada ni se ha tocado el DNS. Cada paso marcado con 🔐 requiere tu autorización y tus credenciales (GoDaddy, Canva, Cloudflare).

## Plan vigente (decisión del propietario, 25-sep-2026)

El propietario acepta que la web de Canva deje de verse. Todo `activatuvida.life` pasa a esta página:

- `activatuvida.life/` → **302** a `/X39` (302 para poder usar la raíz más adelante).
- `www.activatuvida.life/*` → **301** a `activatuvida.life`.
- `/X39` → esta página; `/x39`, `/X39/`, etc. → **301** a `/X39`.
- Otras rutas → 404.

Pasos:

1. 🔐 **Cloudflare:** crear cuenta gratuita → *Add a domain* → `activatuvida.life` → plan Free. Revisar los registros importados: **borrar** el registro A de `@` (`103.169.142.0`, Canva) y cualquier `www`. **Conservar** MX/TXT si hay correo en el dominio.
2. 🔐 **GoDaddy:** *Mi dominio → DNS → Servidores de nombres → Cambiar → Usar mis propios servidores* → pegar los 2 que indica Cloudflare. La propagación tarda de minutos a 24 h.
3. 🔐 **Token:** Cloudflare → *My Profile → API Tokens → Create Token → plantilla «Edit Cloudflare Workers»* (cuenta y zona `activatuvida.life`). Guardarlo como variable de entorno `CLOUDFLARE_API_TOKEN` en la configuración del entorno (nunca en el chat ni en el repositorio). Añadir también `CLOUDFLARE_ACCOUNT_ID`.
4. **Despliegue** (lo ejecuta Claude con autorización): `npm run build:production && cd deploy && npx wrangler deploy`. Los dominios personalizados de `wrangler.toml` crean los registros DNS y el certificado.
5. **Comprobación:** `/X39` 200, `/x39` 301, `/` 302, `www` 301, videos de Vimeo en el móvil.
6. Canva: opcionalmente, quitar `activatuvida.life` del sitio de Canva para evitar avisos de dominio.

> La sección siguiente describe la opción anterior (mantener Canva en la raíz). Se conserva por si se quiere volver a ella: basta con completar `CANVA_ORIGIN`.

## Situación actual (comprobada el 24-sep-2026)

| Elemento | Estado |
|---|---|
| DNS | Nameservers de GoDaddy (`ns11/ns12.domaincontrol.com`) |
| `activatuvida.life` | Registro A → `103.169.142.0`: sitio de **Canva** («Tecnología LifeWave · Fototerapia X39»), servido por la infraestructura de Canva sobre Cloudflare |
| `www.activatuvida.life` | Sin registro |
| `activatuvida.life/X39` | 404 (página «Not found» de Canva) |

**Limitación:** Canva no permite alojar código propio ni añadir rutas personalizadas como `/X39`. Además, exige que sus registros DNS **no** pasen por el proxy de Cloudflare ([ayuda de Canva: DNS](https://www.canva.com/help/dns-settings/)). Hay casos documentados en los que las reglas de Cloudflare del cliente no se aplican delante de un sitio de Canva ([ejemplo](https://martypete.com/cloudflare-canva-redirect-issue/)). Por eso no basta con «añadir una ruta» mientras el dominio apunte a Canva.

## Opción recomendada: Cloudflare Worker delante del dominio

Un Worker (`deploy/worker.js`) atiende todo `activatuvida.life`:

- `/X39` y `/X39/assets/*` → este sitio (`dist/`, Workers Static Assets).
- `/x39`, `/x39/`, `/X39/`, `/X39/index.html` → **301** a `/X39`, conservando la query string. Hay una única URL canónica.
- **Cualquier otra ruta** → se reenvía al sitio de Canva publicado en su **dominio gratuito** (`CANVA_ORIGIN`). Tu web actual sigue editándose en Canva como siempre y se ve igual en `activatuvida.life`.

Coste: plan gratuito de Cloudflare (Workers Free incluye 100 000 peticiones/día).

### 0. Preparar el build (sin riesgo)

```bash
cd sites/activatuvida
# 1) Completa site.config.mjs: revisa commerce.purchaseUrl, commerce.joinUrl, contact.whatsappUrl y distributor.*
# 2) Build de producción y validación:
npm run build:production
npm run check                 # validación estática
npm run test:worker           # enrutado del Worker
CHECK_LINKS=1 npm run check   # (opcional) enlaces externos
npm run preview               # http://localhost:4173/X39
```

### 1. Vista previa pública sin tocar el dominio (🔐 cuenta de Cloudflare)

```bash
cd sites/activatuvida/deploy
npx wrangler login
npx wrangler deploy --config wrangler.preview.toml
# → https://activatuvida-x39-preview.<tu-cuenta>.workers.dev/X39
```

Comprueba en tu móvil que los videos de Vimeo se reproducen desde ese dominio (ver VALIDACION.md → pendientes).

### 2. Publicar el sitio de Canva en su dominio gratuito (🔐 Canva)

1. Dominio gratuito ya reservado: **`activatuvida-x39.my.canva.site`** (25-sep-2026). El día del lanzamiento, en Canva, abre el diseño de la web → **Publicar sitio web** → elige ese dominio y pulsa **Publish changes**. Hasta entonces no se publica ahí para no dejar sin web a `activatuvida.life`.
2. Anota la URL exacta (por ejemplo `https://activatuvida.my.canva.site` o `https://<usuario>.my.canva.site/<sitio>`).
3. Escríbela en `deploy/wrangler.toml` → `[vars] CANVA_ORIGIN = "…"`.
4. Pruébala en la vista previa: añade la misma variable a `wrangler.preview.toml`, vuelve a desplegar y abre `https://…workers.dev/`. Debe verse tu web de Canva, y `/X39` la página nueva.

> Si la web de Canva no carga bien a través del proxy (recursos rotos o redirecciones), **no sigas**. Usa la opción alternativa B.

### 3. Pasar el DNS a Cloudflare (🔐 GoDaddy + Cloudflare)

1. Cloudflare → **Add a site** → `activatuvida.life` → plan Free. Cloudflare importa los registros existentes: revisa que estén **todos**, sobre todo MX y TXT si usas correo con este dominio.
2. De momento deja el registro `A @ 103.169.142.0` en **DNS only (nube gris)**, para que Canva siga funcionando durante el cambio.
3. GoDaddy → Mis dominios → activatuvida.life → **DNS → Nameservers → Cambiar** → «Usaré mis propios nameservers» → los dos que indique Cloudflare.
4. Espera a que Cloudflare marque la zona como **Active** (de minutos a 24 h). Durante ese tiempo la web sigue en Canva.

### 4. Activar el Worker (🔐, unos minutos de ventana)

1. Cloudflare → DNS: cambia el registro `A @` para que apunte a `192.0.2.1` y ponlo **Proxied (nube naranja)**. El Worker responde a todas las rutas; esa IP no se usa.
2. SSL/TLS → modo **Full (strict)**.
3. Despliega:

   ```bash
   cd sites/activatuvida
   npm run build:production && npm run check
   cd deploy && npx wrangler deploy
   ```

4. En Canva puedes desconectar el dominio propio; la web sigue publicada en el dominio gratuito.

### 5. Verificación posterior

```bash
curl -sI https://activatuvida.life/X39            # 200, text/html
curl -sI https://activatuvida.life/x39            # 301 → /X39
curl -sI "https://activatuvida.life/X39/?a=1"     # 301 → /X39?a=1
curl -sI https://activatuvida.life/               # 200: tu web de Canva
```

Después, en el navegador: menú, videos, diálogo de paquetes y botones de compra, WhatsApp y correo. Comprueba también la vista previa al compartir en WhatsApp o Facebook (Open Graph): https://developers.facebook.com/tools/debug/

### Volver atrás

- **Rápido:** en Cloudflare, borra la ruta del Worker y vuelve a poner `A @ 103.169.142.0` en DNS only. Reconecta el dominio propio en Canva.
- **Total:** en GoDaddy, restaura los nameservers `ns11.domaincontrol.com` / `ns12.domaincontrol.com`.

## Opción B: alojar todo el dominio en un host estático

Si prefieres Netlify, Vercel o Cloudflare Pages en lugar del Worker:

1. Publica `dist/` (contiene `X39.html`, `X39/assets/`, `_redirects` y `_headers`). En Pages y Netlify, `/X39` sirve `X39.html` y `_redirects` resuelve `/X39/` → `/X39`.
2. Añade una redirección o reescritura del resto de rutas hacia el dominio gratuito de Canva (reescritura «proxy» `/* → https://<sitio>.my.canva.site/:splat 200`).
3. Las variantes en minúsculas (`/x39`) **no** se incluyen en `_redirects`, porque algunos hosts comparan rutas sin distinguir mayúsculas y se crearía un bucle. En esta opción quedarían sin redirección salvo que el host permita reglas sensibles a mayúsculas.

## Opción C: sin cambiar el DNS

Si no quieres mover el DNS: publica en un subdominio (`x39.activatuvida.life`, con un CNAME en GoDaddy hacia Pages, Netlify o Vercel) o en la URL `*.workers.dev`, y enlázalo desde un botón de la web de Canva. **No** cumple la ruta exacta `/X39`: cambia `site.path` y `site.origin` en `site.config.mjs` para que el canonical sea el correcto.

## Qué hace el build

| Archivo | Uso |
|---|---|
| `dist/X39.html` | Página completa (≈ 16 KB comprimida con gzip) |
| `dist/X39/assets/app.<hash>.css/js` | Caché inmutable (1 año) |
| `dist/X39/assets/{img,video,fonts}` | WebP responsive, pósters de Vimeo y fuentes Inter y Sora (OFL) |
| `dist/_redirects`, `dist/_headers` | Para Pages o Netlify (opción B) |

Modo `preview` (por defecto): `noindex`, aviso de vista previa y botones pendientes visibles pero desactivados. Modo `production`: indexable, sin aviso, y los botones sin destino se ocultan (el build lo advierte).
