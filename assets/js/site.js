// NetBijak.com - 全站 Header / Footer 渲染

function setFavicon() {
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = "/assets/images/favicon.png";
  document.head.appendChild(link);
}

function getPathAfterLang() {
  // 取得目前网址里，语言代码(en/zh/ms)之后的部分
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
          <a href="${root}en/${restOfPath}" class="${lang === "en" ? "active" : ""}">EN</a>
          <a href="${root}zh/${restOfPath}" class="${lang === "zh" ? "active" : ""}">中文</a>
          <a href="${root}ms/${restOfPath}" class="${lang === "ms" ? "active" : ""}">BM</a>
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
        <div class="lang-switcher lang-switcher-mobile">
          <a href="${root}en/${restOfPath}" class="${lang === "en" ? "active" : ""}">EN</a>
          <a href="${root}zh/${restOfPath}" class="${lang === "zh" ? "active" : ""}">中文</a>
          <a href="${root}ms/${restOfPath}" class="${lang === "ms" ? "active" : ""}">BM</a>
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

  const year = new Date().getFullYear();
  footer.innerHTML = `
    <p><strong>NetBijak.com</strong> © ${year}</p>
    <p style="margin-top:4px">${t("footer_text")} ${t("footer_rights")}</p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  setFavicon();
  renderHeader();
  renderFooter();
});