// NetBijak.com - 全站 Header / Footer 渲染

(function loadTrackingScript() {
  var script = document.createElement("script");
  script.src = "/assets/js/tracking.js";
  document.head.appendChild(script);
})();

function setFavicon() {
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = "/assets/images/favicon.png";
  document.head.appendChild(link);
}

function getPathAfterLang() {
  const path = window.location.pathname;
  const match = path.match(/\/(en|zh|ms)(\/.*)?$/);
  if (match && match[2]) {
    return match[2].startsWith("/") ? match[2].slice(1) : match[2];
  }
  return "";
}

function renderHeader() {
  const lang = getCurrentLang();
  const header = document.getElementById("site-header");
  if (!header) return;
  const root = typeof ROOT_PATH !== "undefined" ? ROOT_PATH : "../";
  const restOfPath = getPathAfterLang();
  const hasPageTranslations = typeof PAGE_TRANSLATIONS !== "undefined" && PAGE_TRANSLATIONS !== null;

  function langLink(targetLang) {
    if (hasPageTranslations && PAGE_TRANSLATIONS[targetLang]) {
      return PAGE_TRANSLATIONS[targetLang];
    }
    return `${root}${targetLang}/${restOfPath}`;
  }

  header.innerHTML = `
    <nav class="navbar">
      <div class="navbar-inner">
        <button class="hamburger-btn" id="hamburger-btn" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
        <a href="${root}${lang}/" class="nav-logo">
          <img src="${root}assets/images/logo.png" alt="NetBijak" class="nav-logo-img" />
        </a>
        <div class="lang-switcher lang-switcher-desktop">
          <a href="${langLink("en")}" class="${lang === "en" ? "active" : ""}">EN</a>
          <a href="${langLink("zh")}" class="${lang === "zh" ? "active" : ""}">中文</a>
          <a href="${langLink("ms")}" class="${lang === "ms" ? "active" : ""}">BM</a>
        </div>
      </div>
      <div class="nav-links" id="nav-links">
        <a href="${root}${lang}/">${t("nav_home")}</a>
        <a href="${root}${lang}/broadband-home/">${t("nav_broadband_home")}</a>
        <a href="${root}${lang}/broadband-business/">${t("nav_broadband_business")}</a>
        <a href="${root}${lang}/find-your-plan/">${t("nav_find_plan")}</a>
        <a href="${root}${lang}/compare/">${t("nav_compare")}</a>
        <a href="${root}${lang}/speedtest/">${t("nav_speedtest")}</a>
        <a href="${root}${lang}/blog/">${t("nav_blog")}</a>
        <a href="${root}${lang}/coverage/">${t("nav_coverage")}</a>
        <a href="${root}${lang}/about-us/">${t("nav_about")}</a>
        <div class="lang-switcher lang-switcher-mobile">
          <a href="${langLink("en")}" class="${lang === "en" ? "active" : ""}">EN</a>
          <a href="${langLink("zh")}" class="${lang === "zh" ? "active" : ""}">中文</a>
          <a href="${langLink("ms")}" class="${lang === "ms" ? "active" : ""}">BM</a>
        </div>
      </div>
    </nav>
  `;

  const hamburgerBtn = document.getElementById("hamburger-btn");
  const navLinks = document.getElementById("nav-links");
  hamburgerBtn.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    hamburgerBtn.classList.toggle("open");
  });
}

function renderFooter() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  const lang = getCurrentLang();
  const root = typeof ROOT_PATH !== "undefined" ? ROOT_PATH : "../";
  const year = new Date().getFullYear();

  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-col footer-col-brand">
        <img src="${root}assets/images/logo.png" alt="NetBijak" class="footer-logo-img" />
        <p class="footer-tagline">${t("footer_tagline")}</p>
      </div>

      <div class="footer-col">
        <h3 class="footer-col-title">${t("footer_tools_title")}</h3>
        <a href="${root}${lang}/find-your-plan/">${t("nav_find_plan")}</a>
        <a href="${root}${lang}/compare/">${t("nav_compare")}</a>
      </div>

      <div class="footer-col">
        <h3 class="footer-col-title">${t("footer_legal_title")}</h3>
        <a href="${root}${lang}/about-us/">${t("nav_about")}</a>
        <a href="${root}${lang}/blog/">${t("nav_blog")}</a>
        <a href="${root}${lang}/privacy-policy/">${t("footer_privacy")}</a>
        <a href="${root}${lang}/terms-conditions/">${t("footer_terms")}</a>
      </div>

      <div class="footer-col">
        <h3 class="footer-col-title">${t("footer_follow_title")}</h3>
        <a href="https://www.facebook.com/NetBijak" target="_blank" rel="noopener" class="footer-social-link">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/></svg>
          Facebook
        </a>
        <a href="https://www.instagram.com/netbijakdotcom" target="_blank" rel="noopener" class="footer-social-link">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.79.22 2.43.47.66.26 1.22.6 1.77 1.15.55.55.9 1.11 1.15 1.77.25.64.42 1.36.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.07-.22 1.79-.47 2.43a4.9 4.9 0 01-1.15 1.77 4.9 4.9 0 01-1.77 1.15c-.64.25-1.36.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.79-.22-2.43-.47a4.9 4.9 0 01-1.77-1.15 4.9 4.9 0 01-1.15-1.77c-.25-.64-.42-1.36-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.07.22-1.79.47-2.43.26-.66.6-1.22 1.15-1.77A4.9 4.9 0 015.45 2.53c.64-.25 1.36-.42 2.43-.47C8.94 2.01 9.28 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm0 8.25a3.25 3.25 0 110-6.5 3.25 3.25 0 010 6.5zm5.2-8.45a1.17 1.17 0 100-2.34 1.17 1.17 0 000 2.34z"/></svg>
          Instagram
        </a>
        <a href="https://wa.me/60178835110" target="_blank" rel="noopener" class="footer-social-link">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
      </div>
    </div>

    <div class="footer-bottom">
      <p>© ${year} NetBijak. ${t("footer_rights")}</p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  setFavicon();
  renderHeader();
  renderFooter();
});