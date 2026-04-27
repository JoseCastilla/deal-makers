/* ============================================================
   DEAL MAKERS — CONFIG GLOBAL
   ------------------------------------------------------------
   Editá únicamente este archivo para cambiar IDs, precios o
   info por ciudad. Todas las páginas y scripts leen de aquí.
   ============================================================ */
window.DM_CONFIG = {
  /* Sustituí por el Pixel ID real cuando esté listo */
  PIXEL_ID: "YOUR_PIXEL_ID",

  /* Dominio canónico — usado en OG tags y enlaces absolutos */
  DOMAIN: "https://tudominio.com",
  BASE_PATH: "/deal-makers",

  /* WhatsApp comercial (sin +, formato wa.me) */
  WHATSAPP: "5217341429646",

  /* Endpoint del backend para Conversions API.
     Si usás Netlify Functions => "/.netlify/functions/capi"
     Si usás Vercel Functions  => "/api/capi"
     Dejá vacío para deshabilitar CAPI hasta tenerlo deployado. */
  CAPI_ENDPOINT: "",

  /* Moneda por defecto para los eventos value/currency */
  CURRENCY: "MXN",

  /* Catálogo de ciudades. La key se usa como content_category
     en TODOS los eventos de pixel. Esto es lo que Meta lee
     para optimizar a nivel de conjunto de anuncios. */
  CITIES: {
    cdmx: {
      slug: "cdmx",
      label: "Ciudad de México",
      shortLabel: "CDMX",
      dates: "13-14 Junio 2026",
      contentId: "dm-cdmx-2026",
      ticketValue: 4990,
      pageUrl: "/deal-makers/cdmx/"
    },
    guadalajara: {
      slug: "guadalajara",
      label: "Guadalajara",
      shortLabel: "GDL",
      dates: "27-28 Junio 2026",
      contentId: "dm-gdl-2026",
      ticketValue: 4990,
      pageUrl: "/deal-makers/guadalajara/"
    },
    monterrey: {
      slug: "monterrey",
      label: "Monterrey",
      shortLabel: "MTY",
      dates: "29-30 Agosto 2026",
      contentId: "dm-mty-2026",
      ticketValue: 4990,
      pageUrl: "/deal-makers/monterrey/"
    }
  },

  /* Parámetros de UTM/click que se persisten y propagan */
  TRACKED_PARAMS: [
    "utm_source","utm_medium","utm_campaign",
    "utm_term","utm_content","utm_id",
    "fbclid","gclid","ttclid","msclkid",
    "ad_id","adset_id","campaign_id"
  ]
};
