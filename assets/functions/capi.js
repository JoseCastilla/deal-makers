/* ============================================================
   META CONVERSIONS API — proxy server-side
   ------------------------------------------------------------
   Recibe los eventos del browser, hashea PII (email/telefono),
   añade IP + UA del request y los envía a Meta. Usa el mismo
   event_id que el pixel para que Meta deduplique.

   Variables de entorno requeridas:
     META_PIXEL_ID         — el mismo Pixel ID
     META_CAPI_TOKEN       — Access Token (Events Manager → Settings → CAPI)
     META_TEST_EVENT_CODE  — opcional, sólo para tests en Events Manager

   Despliegue:
     • Netlify  — colocar este archivo en  netlify/functions/capi.js
                  endpoint: /.netlify/functions/capi
     • Vercel   — colocar en              api/capi.js
                  endpoint: /api/capi
     • Cloudflare Pages — adaptar a onRequest({ request, env })
   ============================================================ */
const crypto = require("crypto");

const sha256 = (v) => crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");
const PIXEL_ID = process.env.META_PIXEL_ID;
const CAPI_TOKEN = process.env.META_CAPI_TOKEN;
const TEST_CODE = process.env.META_TEST_EVENT_CODE || "";

function hashUserData(u = {}) {
  const out = {};
  if (u.em) out.em = sha256(u.em);
  if (u.ph) out.ph = sha256(u.ph.replace(/\D+/g, ""));
  if (u.fn) out.fn = sha256(u.fn);
  if (u.ln) out.ln = sha256(u.ln);
  if (u.ge) out.ge = sha256(u.ge);
  if (u.country) out.country = sha256(u.country);
  if (u.ct) out.ct = sha256(u.ct);
  if (u.zp) out.zp = sha256(u.zp);
  return out;
}

/* Netlify Functions handler signature. Vercel: export default async (req, res). */
exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  if (!PIXEL_ID || !CAPI_TOKEN) {
    return { statusCode: 500, body: "CAPI not configured" };
  }

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); }
  catch (e) { return { statusCode: 400, body: "bad json" }; }

  const headers = event.headers || {};
  const clientIp = (headers["x-nf-client-connection-ip"] || headers["x-forwarded-for"] || "").split(",")[0].trim();
  const userAgent = headers["user-agent"] || "";

  const userData = {
    ...hashUserData(payload.user_data || {}),
    client_ip_address: clientIp,
    client_user_agent: userAgent,
  };

  /* fbp / fbc desde cookies si llegan */
  const cookieHeader = headers.cookie || "";
  const cookieMap = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=").map(decodeURIComponent)).filter(p => p[0]));
  if (cookieMap._fbp) userData.fbp = cookieMap._fbp;
  if (cookieMap._fbc) userData.fbc = cookieMap._fbc;
  /* o reconstruir fbc desde fbclid en attribution */
  if (!userData.fbc && payload.attribution && payload.attribution.fbclid) {
    userData.fbc = `fb.1.${Date.now()}.${payload.attribution.fbclid}`;
  }

  const evt = {
    event_name: payload.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: payload.event_id,
    event_source_url: payload.event_source_url,
    action_source: "website",
    user_data: userData,
    custom_data: payload.custom_data || {},
  };

  const body = { data: [evt] };
  if (TEST_CODE) body.test_event_code = TEST_CODE;

  const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(CAPI_TOKEN)}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    return { statusCode: resp.status, body: text };
  } catch (e) {
    return { statusCode: 502, body: "capi error: " + e.message };
  }
};
