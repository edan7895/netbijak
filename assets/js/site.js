// NetBijak.com - 全站 Header / Footer 渲染
function renderHeader() {
  const lang = getCurrentLang();
  const header = document.getElementById("site-header");
  if (!header) return;

  header.innerHTML = `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="/${lang}/" class="nav-logo">
          <div class="nav-logo-icon">📡</div>
          ${t("site_name")}
        </a>
        <div class="nav-links">
          <a href="/${lang}/">${t("nav_home")}</a>
          <a href="/${lang}/speedtest/">${t("nav_speedtest")}</a>
          <a href="/${lang}/blog/">${t("nav_blog")}</a>
        </div>
        <div class="lang-switcher">
          <a href="/en${getPathWithoutLang()}" class="${lang === "en" ? "active" : ""}">EN</a>
          <a href="/zh${getPathWithoutLang()}" class="${lang === "zh" ? "active" : ""}">中文</a>
          <a href="/ms${getPathWithoutLang()}" class="${lang === "ms" ? "active" : ""}">BM</a>
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

// 取得目前网址，去掉语言前缀部分，方便切换语言时跳到"同一页的另一语言版本"
function getPathWithoutLang() {
  const path = window.location.pathname;
  const withoutLang = path.replace(/^\/(en|zh|ms)/, "");
  return withoutLang === "" ? "/" : withoutLang;
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
});