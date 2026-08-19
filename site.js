// NetBijak.com - 全站 Header / Footer 渲染
function renderHeader() {
  const lang = getCurrentLang();
  const header = document.getElementById("site-header");
  if (!header) return;
  const root = typeof ROOT_PATH !== "undefined" ? ROOT_PATH : "../";

  header.innerHTML = `
    <nav class="navbar">
      <div class="navbar-inner">
        <button class="hamburger-btn" id="hamburger-btn" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
        <a href="${root}${lang}/" class="nav-logo">
          <div class="nav-logo-icon">📡</div>
          ${t("site_name")}
        </a>
        <div class="lang-switcher lang-switcher-desktop">
          <a href="${root}en/" class="${lang === "en" ? "active" : ""}">EN</a>
          <a href="${root}zh/" class="${lang === "zh" ? "active" : ""}">中文</a>
          <a href="${root}ms/" class="${lang === "ms" ? "active" : ""}">BM</a>
        </div>
      </div>
      <div class="nav-links" id="nav-links">
        <a href="${root}${lang}/">${t("nav_home")}</a>
        <a href="${root}${lang}/speedtest/">${t("nav_speedtest")}</a>
        <a href="${root}${lang}/blog/">${t("nav_blog")}</a>
        <div class="lang-switcher lang-switcher-mobile">
          <a href="${root}en/" class="${lang === "en" ? "active" : ""}">EN</a>
          <a href="${root}zh/" class="${lang === "zh" ? "active" : ""}">中文</a>
          <a href="${root}ms/" class="${lang === "ms" ? "active" : ""}">BM</a>
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
  renderHeader();
  renderFooter();
});