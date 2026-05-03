/* ============================================================
   DEAL MAKERS — CAPA DE TRACKING UNIFICADA
   ------------------------------------------------------------
   - Inicializa Meta Pixel
   - Persiste UTMs y click IDs entre páginas
   - Dispara eventos con content_category = ciudad para que
     Meta pueda optimizar a nivel de CONJUNTO DE ANUNCIOS
     (vía Custom Conversions filtradas por ciudad)
   - Genera event_id por evento para deduplicar con CAPI
   - Hookea CTAs de WhatsApp y formularios

   USO:
     1) Cargar /assets/js/dm-config.js
     2) Cargar este archivo
     3) En cada página declarar window.DM_CITY antes (o el slug
        en data-dm-city del <body>). En la principal, omitir.
   ============================================================ */
(function (w, d) {
  "use strict";
  var CFG = w.DM_CONFIG || {};
  var SS_KEY = "dm_attrib_v1";

  /* ---------- utils ---------- */
  function log() {
    if (w.DM_DEBUG && w.console) console.log.apply(console, ["[DM]"].concat([].slice.call(arguments)));
  }
  function uuid() {
    if (w.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "dm-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }
  function getQuery() {
    var out = {}; var s = w.location.search.replace(/^\?/, "");
    if (!s) return out;
    s.split("&").forEach(function (kv) {
      var p = kv.split("="); if (!p[0]) return;
      out[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " "));
    });
    return out;
  }
  function readAttribution() {
    try { return JSON.parse(sessionStorage.getItem(SS_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function writeAttribution(a) {
    try { sessionStorage.setItem(SS_KEY, JSON.stringify(a)); } catch (e) {}
  }
  function captureAttribution() {
    var q = getQuery();
    var a = readAttribution();
    (CFG.TRACKED_PARAMS || []).forEach(function (k) {
      if (q[k]) a[k] = q[k];
    });
    a._referrer = a._referrer || d.referrer || "";
    a._landing = a._landing || w.location.pathname;
    a._ts = a._ts || Date.now();
    writeAttribution(a);
    return a;
  }
  function buildQuery(obj) {
    return Object.keys(obj).filter(function (k) { return obj[k] !== undefined && obj[k] !== ""; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]); }).join("&");
  }

  /* ---------- ciudad ---------- */
  function detectCity() {
    if (w.DM_CITY) return w.DM_CITY;
    var bodyAttr = d.body && d.body.getAttribute("data-dm-city");
    if (bodyAttr) return bodyAttr;
    /* fallback por path */
    var p = w.location.pathname.toLowerCase();
    var keys = Object.keys(CFG.CITIES || {});
    for (var i = 0; i < keys.length; i++) if (p.indexOf("/" + keys[i]) !== -1) return keys[i];
    /* fallback por query (gracias) */
    var q = getQuery();
    if (q.city && CFG.CITIES && CFG.CITIES[q.city.toLowerCase()]) return q.city.toLowerCase();
    return null;
  }

  /* ---------- pixel ---------- */
  function initPixel() {
    if (!CFG.PIXEL_ID || CFG.PIXEL_ID === "3331815516988253") {
      log("Pixel ID no configurado, eventos no se dispararán.");
      return false;
    }
    /* base de Meta Pixel */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(w, d, "script", "https://connect.facebook.net/en_US/fbevents.js");
    w.fbq("init", CFG.PIXEL_ID);
    return true;
  }

  /* ---------- envío de eventos ---------- */
  function fireEvent(name, params, opts) {
    params = params || {};
    opts = opts || {};
    var eventId = opts.eventId || uuid();
    var attribution = readAttribution();

    if (w.fbq) {
      w.fbq("track", name, params, { eventID: eventId });
      log("fbq track", name, params, "eventID=" + eventId);
    }
    /* envío a CAPI server-side (deduplicado por eventID) */
    if (CFG.CAPI_ENDPOINT) {
      var payload = {
        event_name: name,
        event_id: eventId,
        event_source_url: w.location.href,
        user_data: opts.user_data || {},
        custom_data: params,
        attribution: attribution
      };
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(CFG.CAPI_ENDPOINT, new Blob([JSON.stringify(payload)], { type: "application/json" }));
        } else {
          fetch(CFG.CAPI_ENDPOINT, {
            method: "POST", credentials: "omit", keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).catch(function () {});
        }
      } catch (e) { log("CAPI err", e); }
    }
    return eventId;
  }

  /* ---------- payload por defecto con ciudad ---------- */
  function basePayload(citySlug) {
    var c = citySlug && CFG.CITIES ? CFG.CITIES[citySlug] : null;
    var p = { currency: CFG.CURRENCY || "MXN" };
    if (c) {
      p.content_name = "Deal Makers " + c.shortLabel;
      p.content_category = c.slug;        /* ← clave para optimización por ad set */
      p.content_ids = [c.contentId];
      p.content_type = "product";
      p.value = c.ticketValue || 0;
    } else {
      p.content_name = "Deal Makers Tour 2026";
      p.content_category = "general";
    }
    return p;
  }

  /* ---------- propagación de UTMs en links ---------- */
  function propagateUtmsToLinks(citySlug) {
    var attribution = readAttribution();
    var keep = (CFG.TRACKED_PARAMS || []).reduce(function (o, k) {
      if (attribution[k]) o[k] = attribution[k]; return o;
    }, {});
    if (citySlug) keep.city = citySlug;
    var qs = buildQuery(keep);

    /* internal links a /gracias/ */
    d.querySelectorAll('a[href*="/gracias"], a[data-dm-link="gracias"]').forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var hash = "";
      var hi = href.indexOf("#");
      if (hi !== -1) { hash = href.slice(hi); href = href.slice(0, hi); }
      var sep = href.indexOf("?") === -1 ? "?" : "&";
      a.setAttribute("href", href + (qs ? sep + qs : "") + hash);
    });

    /* WhatsApp links — agrega ciudad y campaign al texto pre-cargado */
    d.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var url; try { url = new URL(href, w.location.origin); } catch (e) { return; }
      var existing = url.searchParams.get("text") || "";
      if (!existing && citySlug && CFG.CITIES && CFG.CITIES[citySlug]) {
        var c = CFG.CITIES[citySlug];
        var parts = [
          "Hola, me interesa Deal Makers " + c.shortLabel + " (" + c.dates + ").",
          attribution.utm_campaign ? "Ref: " + attribution.utm_campaign : ""
        ].filter(Boolean);
        url.searchParams.set("text", parts.join(" "));
      }
      a.setAttribute("href", url.toString());
      a.setAttribute("data-dm-wa", "1");
    });
  }

  /* ---------- handlers ---------- */
  function attachHandlers(citySlug) {
    /* WhatsApp click → Contact event */
    d.addEventListener("click", function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[data-dm-wa]');
      if (!a) return;
      fireEvent("Contact", basePayload(citySlug));
    }, true);

    /* Formulario embebido (cuando esté el form definitivo).
       Se busca por id "form" o data-dm-form="lead". Submit dispara Lead
       y, si tiene action vacío o "#", redirige a /gracias/ con city. */
    var form = d.querySelector('form#form, form[data-dm-form="lead"]');
    if (form) {
      form.addEventListener("submit", function (e) {
        var hasAction = form.getAttribute("action") && form.getAttribute("action") !== "#";
        if (!hasAction) e.preventDefault();
        var emailEl = form.querySelector('input[type="email"], #em, [name*="email" i]');
        var phoneEl = form.querySelector('input[type="tel"], #wa, [name*="phone" i], [name*="whatsapp" i]');
        var fnEl = form.querySelector('#fn, [name*="first" i], [name*="nombre" i]');
        var lnEl = form.querySelector('#ln, [name*="last" i], [name*="apellido" i]');
        var user_data = {};
        if (emailEl && emailEl.value) user_data.em = emailEl.value.trim().toLowerCase();
        if (phoneEl && phoneEl.value) user_data.ph = phoneEl.value.replace(/\D+/g, "");
        if (fnEl && fnEl.value) user_data.fn = fnEl.value.trim().toLowerCase();
        if (lnEl && lnEl.value) user_data.ln = lnEl.value.trim().toLowerCase();

        var eventId = uuid();
        fireEvent("Lead", basePayload(citySlug), { eventId: eventId, user_data: user_data });

        if (!hasAction) {
          var attribution = readAttribution();
          var keep = (CFG.TRACKED_PARAMS || []).reduce(function (o, k) {
            if (attribution[k]) o[k] = attribution[k]; return o;
          }, {});
          if (citySlug) keep.city = citySlug;
          keep.event_id = eventId;
          var url = (CFG.BASE_PATH || "") + "/gracias/?" + buildQuery(keep);
          setTimeout(function () { w.location.href = url; }, 150);
        }
      });
    }
  }

  /* ---------- bootstrap ---------- */
  function boot() {
    captureAttribution();
    var citySlug = detectCity();
    var pixelOk = initPixel();

    /* PageView siempre */
    if (pixelOk) w.fbq("track", "PageView");

    /* En páginas de ciudad: ViewContent inmediato.
       En la principal: ViewContent general. En /gracias/: lo dispara la página. */
    var isGracias = /\/gracias\/?$/.test(w.location.pathname);
    if (!isGracias) {
      fireEvent("ViewContent", basePayload(citySlug));
    }

    propagateUtmsToLinks(citySlug);
    attachHandlers(citySlug);

    /* API pública */
    w.DM = {
      city: citySlug,
      cfg: CFG,
      fire: fireEvent,
      base: basePayload,
      attribution: readAttribution
    };
    log("boot", { city: citySlug, pixel: pixelOk });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window, document);
