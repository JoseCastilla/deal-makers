# Deal Makers Inmobiliarios — Tour 2026

Landing multi-ciudad para el evento Deal Makers. Estática, deployable en Netlify / Vercel / Cloudflare Pages, con tracking de Meta Pixel + Conversions API preparado para **optimizar campañas a nivel de conjunto de anuncios por ciudad**.

---

## Estructura del proyecto

```
deal-makers/
├── index.html                 → tudominio.com/deal-makers/
├── cdmx/index.html            → tudominio.com/deal-makers/cdmx/
├── guadalajara/index.html     → tudominio.com/deal-makers/guadalajara/
├── monterrey/index.html       → tudominio.com/deal-makers/monterrey/
├── gracias/index.html         → tudominio.com/deal-makers/gracias/?city=…
├── assets/
│   ├── js/
│   │   ├── dm-config.js       ← editá aquí Pixel ID, dominio, precios, ciudades
│   │   └── dm-tracking.js     ← capa de tracking unificada (no editar salvo features)
│   ├── functions/
│   │   └── capi.js            ← serverless para Conversions API (Netlify/Vercel)
│   ├── css/                   ← reservada para extracción futura del CSS inline
│   └── img/                   ← imágenes OG, logos, fotos extraídas (opcional)
├── netlify.toml               ← deploy + redirects + headers (Netlify)
├── vercel.json                ← equivalente para Vercel
├── _redirects                 ← fallback (Netlify / Cloudflare Pages)
├── robots.txt
├── sitemap.xml
└── README.md                  ← este archivo
```

---

## Setup inicial — 5 minutos

### 1. Configurá `assets/js/dm-config.js`

Es el único archivo que tenés que tocar para ir a producción:

```js
PIXEL_ID:       "1234567890"            ← reemplazá YOUR_PIXEL_ID
DOMAIN:         "https://tudominio.com" ← dominio real
WHATSAPP:       "5217341429646"         ← ya configurado, validar
CAPI_ENDPOINT:  "/.netlify/functions/capi"   (Netlify)
            o   "/api/capi"                   (Vercel)
            o   ""                            (deshabilitado por ahora)
CITIES:         ticketValue por ciudad si querés ROAS por ad set
```

### 2. Variables de entorno para CAPI (cuando lo activés)

En Netlify (Site settings → Environment variables) o Vercel (Project → Settings → Environment Variables):

| Variable | Valor |
|---|---|
| `META_PIXEL_ID` | El mismo Pixel ID |
| `META_CAPI_TOKEN` | Generálo en Events Manager → Settings → Conversions API → Generate access token |
| `META_TEST_EVENT_CODE` | (Opcional) Código de Test Events mientras validás |

### 3. Reemplazá imágenes OG

Las páginas referencian `assets/img/og-cdmx.jpg`, `og-guadalajara.jpg`, `og-monterrey.jpg`, `og-main.jpg`. Subílas en 1200×630px. Mientras no existan, los enlaces compartidos en redes no mostrarán preview.

---

## ⭐ Playbook: optimización a nivel de conjunto de anuncios por ciudad

Esta es la parte clave por la que el proyecto está estructurado así. Meta no permite "optimizar el ad set por la ciudad X" directamente — pero sí permite **filtrar un evento por un parámetro custom y crear una Custom Conversion por ciudad**. Ese es el truco.

### Lo que dispara el código automáticamente

| Página | Evento | `content_category` | Cuándo |
|---|---|---|---|
| `/deal-makers/` | `PageView` + `ViewContent` | `general` | al cargar |
| `/deal-makers/cdmx/` | `PageView` + `ViewContent` | `cdmx` | al cargar |
| `/deal-makers/guadalajara/` | `PageView` + `ViewContent` | `guadalajara` | al cargar |
| `/deal-makers/monterrey/` | `PageView` + `ViewContent` | `monterrey` | al cargar |
| Cualquier WhatsApp click | `Contact` | (la ciudad de la página) | click en `wa.me/...` |
| Submit del form | `Lead` | (la ciudad de la página) | submit + redirect a `/gracias/?city=…` |
| `/deal-makers/gracias/` | `Lead` | (la ciudad del query param) | al cargar |

### Cómo crear las Custom Conversions en Meta (una vez)

1. Andá a **Events Manager → Custom Conversions → Create**.
2. Para cada ciudad, creá una con esta config:
   - **Event source:** tu pixel
   - **Event:** `Lead`
   - **Rule:** `content_category` `equals` `cdmx` (y luego `guadalajara`, `monterrey`)
   - **Category:** Lead
   - **Value:** From the event (usa el `value` que ya manda el código)
3. Resultado: tendrás **Lead — CDMX**, **Lead — Guadalajara**, **Lead — Monterrey** como objetivos seleccionables al crear ad sets.

### Cómo armar las campañas

Recomendado:
- **1 campaña por ciudad** (objetivo: Sales/Leads) — más limpio para presupuesto y aprendizaje.
- Cada **ad set** dentro de esa campaña optimiza por su Custom Conversion de ciudad.
- **Targeting geográfico** por ciudad/área metropolitana correspondiente.

Alternativa (1 campaña, 3 ad sets):
- Una sola campaña con 3 ad sets, cada uno apuntando a su ciudad y a su Custom Conversion. Útil si querés que CBO redistribuya presupuesto entre ciudades — pero perdés control.

### UTM convention sugerida

Para que en Meta Ads Manager los breakdowns coincidan y puedas cruzar con GA4:

```
utm_source=meta
utm_medium=paid_social
utm_campaign=dealmakers_cdmx_2026
utm_content={{adset.name}}
utm_term={{ad.name}}
```

El código persiste TODOS los UTM en `sessionStorage` y los propaga automáticamente a:
- el link de WhatsApp (van en el texto pre-cargado)
- el link a `/gracias/`
- los hashed user_data al backend de CAPI

---

## Verificación con Meta Pixel Helper

1. Instalá la extensión **Meta Pixel Helper** en Chrome.
2. Visitá `tudominio.com/deal-makers/cdmx/?utm_source=test&utm_campaign=qa` con el helper abierto.
3. Esperás ver:
   - `PageView` ✓
   - `ViewContent` con `content_category: cdmx`, `content_ids: ["dm-cdmx-2026"]`, `value: 4990`, `currency: MXN`
4. Hacé click en el botón de WhatsApp → debe disparar `Contact` con la misma `content_category`.
5. Si configuraste CAPI, en Events Manager → **Test Events** deberías ver el mismo `event_id` llegando del browser y del server (deduplicado).

---

## Deploy

### Netlify
1. Subí el contenido de `deal-makers/` al repo.
2. Si el sitio entero vive en `tudominio.com/deal-makers/`, dejá el `publish = "."` y ajustá tu DNS para que el dominio apunte al deploy.
3. Si `tudominio.com` ya tiene un sitio principal, el approach correcto es deployar este folder como subcarpeta del repo principal y servirlo desde ahí, no como Netlify aparte.

### Vercel
Similar: el `vercel.json` ya está armado. Asegurate que la estructura de carpetas en el repo refleje `/deal-makers/...`.

### Hosting tradicional (FTP / cPanel)
Subí la carpeta `deal-makers/` completa a la raíz pública del sitio. Las rutas funcionan tal cual. Para CAPI necesitarás un endpoint server-side propio (PHP/Node) — el código de `assets/functions/capi.js` se traduce en pocas líneas.

---

## Próximos pasos / TODO

Cuando definas la siguiente etapa del flow de conversión:

- [ ] **Form definitivo** — el landing principal (`index.html`) ya tiene `<form id="form">`. El código detecta los IDs `em`, `fn`, `ln`, `wa` y dispara `Lead` automáticamente. Si cambiás los IDs, agregá `data-dm-form="lead"` al `<form>` y `name="email|phone|first_name|last_name"` a los inputs.
- [ ] **Backend del form** — actualmente el submit redirige a `/gracias/`. Necesitás un endpoint que reciba los datos y los mande a tu CRM (Brevo, Mailchimp, ConvertKit, HubSpot, Sheets via Make, etc.). Recomiendo Netlify Forms si vas con Netlify — es zero config.
- [ ] **CAPI deploy** — subir la function, llenar variables de entorno, pegar el endpoint en `dm-config.js`.
- [ ] **Imágenes OG** — diseñar 4 imágenes 1200×630.
- [ ] **Optimización de peso** — los HTML pesan ~520KB c/u por imágenes en base64. Si querés mejorar Core Web Vitals, extraé los `data:image/...` a archivos en `assets/img/` y reemplazá en el HTML. Reducción esperada: 80% del peso.
- [ ] **GA4** — si querés cross-tracking, agregar el snippet de GTM en `dm-tracking.js`. Ya lo dejé pensado para extender.
- [ ] **Pago online** — si el ticket pasa a ser pagado, el flujo correcto es Lead en submit → Stripe/MercadoPago → `Purchase` en `/gracias/?city=…&order_id=…`. La página de gracias ya está preparada para recibir el `event_id` que dispara el form para deduplicación.

---

## Convenciones internas

- **No editar `dm-tracking.js`** salvo features nuevas. Toda config va en `dm-config.js`.
- **Nuevas ciudades**: agregar entrada al objeto `CITIES` en config + crear carpeta `deal-makers/<slug>/` con copia del HTML de una ciudad existente, cambiando título/fechas/`window.DM_CITY`.
- **Eventos custom adicionales**: usar `window.DM.fire("EventName", window.DM.base(window.DM.city))` desde la consola o desde código de página. La ciudad y los UTMs se incluyen automáticamente.
- **Debug**: `window.DM_DEBUG = true` antes de cargar tracking, o `localStorage.setItem('DM_DEBUG','1')` y refrescar (no implementado aún, simple feature toggle si lo querés).

---

© 2026 Deal Makers Inmobiliarios
