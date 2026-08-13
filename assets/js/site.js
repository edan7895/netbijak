// NetBijak.com - 全站 Header / Footer 渲染
function renderHeader() {
  const lang = getCurrentLang();
  const header = document.getElementById("site-header");
  if (!header) return;

  header.innerHTML = `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="./" class="nav-logo">
          <div class="nav-logo-icon">📡</div>
          ${t("site_name")}
        </a>
        <div class="nav-links">
          <a href="./">${t("nav_home")}</a>
          <a href="speedtest/">${t("nav_speedtest")}</a>
          <a href="blog/">${t("nav_blog")}</a>
        </div>
        <div class="lang-switcher">
          <a href="../en/" class="${lang === "en" ? "active" : ""}">EN</a>
          <a href="../zh/" class="${lang === "zh" ? "active" : ""}">中文</a>
          <a href="../ms/" class="${lang === "ms" ? "active" : ""}">BM</a>
        </div>
      </div>
    </nav>
  `;
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