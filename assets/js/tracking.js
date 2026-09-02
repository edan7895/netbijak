// NetBijak.com - GA4 + Meta Pixel + 自建流量统计

(function () {
  // ===== Google tag (gtag.js) - GA4 =====
  var gaScript = document.createElement("script");
  gaScript.async = true;
  gaScript.src = "https://www.googletagmanager.com/gtag/js?id=G-BML2Z6HJ2C";
  document.head.appendChild(gaScript);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", "G-BML2Z6HJ2C");

  // ===== Meta Pixel =====
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", "1080344587849999");
  fbq("track", "PageView");

  // ===== NetBijak 自建流量统计 =====
  var NB_SUPABASE_URL = "https://yslzoodokunufsgeoazk.supabase.co";
  var NB_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbHpvb2Rva3VudWZzZ2VvYXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODgwMTcsImV4cCI6MjEwMjA2NDAxN30.LFQ8KoSfw_2kCDcoYgfLTrmFebEniQ1O5oUS1r2v-lg";

  function nbInsertRow(table, data) {
    fetch(NB_SUPABASE_URL + "/rest/v1/" + table, {
      method: "POST",
      headers: {
        apikey: NB_SUPABASE_ANON_KEY,
        Authorization: "Bearer " + NB_SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(function () {
      // 静默失败，不影响使用者体验
    });
  }

  function nbTrackPageView() {
    nbInsertRow("page_views", { page_path: window.location.pathname });
  }

  function nbExtractProviderSlugFromUrl(href) {
    // 尝试从当前页面网址推断运营商 slug（例如 /unifi/xxx/ 或 unifi/plan/?slug=）
    var path = window.location.pathname;
    var knownProviders = ["unifi-business", "maxis-business", "time-business", "unifi", "maxis", "celcomdigi", "time", "yes", "umobile"];
    for (var i = 0; i < knownProviders.length; i++) {
      if (path.indexOf("/" + knownProviders[i] + "/") !== -1) {
        return knownProviders[i];
      }
    }
    return null;
  }

  function nbTrackWhatsAppClicks() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest && e.target.closest("a.wa-btn");
      if (!link) return;

      var providerSlug = nbExtractProviderSlugFromUrl(link.href);
      nbInsertRow("whatsapp_clicks", {
        provider_slug: providerSlug,
        page_path: window.location.pathname,
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    nbTrackPageView();
    nbTrackWhatsAppClicks();
  });
})();