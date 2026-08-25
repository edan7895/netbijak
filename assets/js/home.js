// NetBijak.com - Home 首页逻辑（读取静态JSON，不再问Supabase）

const WHATSAPP_NUMBER = "60178835110";

function initHomePage() {
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  if (!searchBtn) return;

  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") performSearch();
  });

  renderProviderGrid();
  renderLatestArticles();
}

async function performSearch() {
  const input = document.getElementById("search-input");
  const keyword = input.value.trim().toLowerCase();
  if (!keyword) return;

  const resultsSection = document.getElementById("results-section");
  const resultsGrid = document.getElementById("results-grid");
  const resultsTitleEl = document.getElementById("results-title");

  resultsSection.classList.remove("hidden");
  resultsTitleEl.textContent = `${t("search_results_for")} "${keyword}"`;
  resultsGrid.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;
  resultsSection.scrollIntoView({ behavior: "smooth" });

  const allPlans = await fetchStaticData("plans");

  const matched = allPlans
    .filter((p) => isPlanCurrentlyPublished(p))
    .filter((p) => {
      const name = (p.name || "").toLowerCase();
      const tagline = (p.tagline || "").toLowerCase();
      return name.includes(keyword) || tagline.includes(keyword);
    })
    .sort((a, b) => a.promo_price - b.promo_price)
    .slice(0, 24);

  if (matched.length === 0) {
    resultsGrid.innerHTML = `<p style="color:#94a3b8;padding:2rem;text-align:center">${t("no_results")}</p>`;
    return;
  }

  const lowestPrice = Math.min(...matched.map((p) => p.promo_price));
  resultsGrid.innerHTML = matched.map((plan) => buildResultCard(plan, plan.promo_price === lowestPrice)).join("");
}

async function renderProviderGrid() {
  const gridEl = document.getElementById("provider-browse-grid");
  if (!gridEl) return;

  gridEl.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;

  const allProviders = await fetchStaticData("providers");
  const filtered = allProviders.filter((p) => p.is_active && !p.slug.includes("-business"));

  if (filtered.length === 0) {
    gridEl.innerHTML = `<p style="color:#94a3b8">${t("no_results")}</p>`;
    return;
  }

  gridEl.innerHTML = filtered
    .map(
      (p) => `
    <a href="../${p.slug}/" class="provider-browse-card" style="border-color:${p.color_hex}">
      <span class="provider-browse-info">
        ${p.logo_url ? `<img src="${ROOT_PATH}${p.logo_url.replace(/^\//, "")}" alt="${p.name}" class="provider-logo-img" />` : ""}
        <span class="provider-browse-name" style="color:${p.color_hex}">${p.name}</span>
      </span>
      <span class="provider-browse-arrow">→</span>
    </a>
  `
    )
    .join("");
}

// ===== 最新文章横向轮播 =====
async function renderLatestArticles() {
  const trackEl = document.getElementById("latest-articles-track");
  const sectionEl = document.getElementById("latest-articles-section");
  if (!trackEl) return;

  const lang = getCurrentLang();
  const allArticles = await fetchStaticData("articles");

  const filtered = allArticles
    .filter((a) => a.language === lang && isArticleCurrentlyPublished(a))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  if (filtered.length === 0) {
    if (sectionEl) sectionEl.classList.add("hidden");
    return;
  }

  trackEl.innerHTML = filtered.map((a) => buildArticleMiniCard(a)).join("");

  const prevBtn = document.getElementById("latest-articles-prev");
  const nextBtn = document.getElementById("latest-articles-next");
  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      trackEl.scrollBy({ left: -280, behavior: "smooth" });
    });
    nextBtn.addEventListener("click", () => {
      trackEl.scrollBy({ left: 280, behavior: "smooth" });
    });
  }
}

function buildArticleMiniCard(article) {
  const dateStr = new Date(article.created_at).toLocaleDateString();
  const excerpt = (article.content || "").replace(/<[^>]*>/g, "").slice(0, 80);
  const typeLabel = article.article_type === "news" ? "News" : "Article";

  return `
    <a href="blog/${article.slug}/" class="latest-article-card">
      <div class="latest-article-img-wrap">
        ${article.cover_image_url ? `<img src="${article.cover_image_url}" alt="${article.title}" />` : `<div class="latest-article-placeholder">📰</div>`}
        <span class="latest-article-badge">${typeLabel}</span>
      </div>
      <div class="latest-article-body">
        <div class="latest-article-date">${dateStr}</div>
        <div class="latest-article-title">${article.title}</div>
        <p class="latest-article-excerpt">${excerpt}${excerpt.length >= 80 ? "..." : ""}</p>
      </div>
    </a>
  `;
}

function buildResultCard(plan, isBest) {
  const provider = plan.providers;
  const color = provider ? provider.color_hex : "#14b8a6";
  const providerName = provider ? provider.name : plan.provider;
  const providerSlug = provider ? provider.slug : "";
  const logoUrl = provider ? provider.logo_url : "";

  const waMsg = plan.whatsapp_ref || `Hi NetBijak, I'm interested in ${plan.name}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  const detailLink = `../${providerSlug}/${plan.slug}/`;

  return `
    <div class="result-card" style="border-color:${color}">
      ${isBest ? `<div class="best-badge">💰 ${t("best_badge")}</div>` : ""}
      <div style="height:5px;background:${color}"></div>
      <div class="result-card-body">
        <div class="result-card-header">
          ${logoUrl ? `<img src="${ROOT_PATH}${logoUrl.replace(/^\//, "")}" alt="${providerName}" class="provider-logo-img" />` : ""}
          <span class="result-provider-name" style="color:${color}">${providerName}</span>
        </div>
        <div class="result-plan-name">${plan.name}</div>
        ${plan.tagline ? `<div class="result-tagline">${plan.tagline}</div>` : ""}
        <div class="result-price" style="color:${color}">
          RM${plan.promo_price}<small>${t("per_month")}</small>
        </div>
        <div class="result-speed-row">
          <span>⬇ ${plan.download_speed}</span>
          <span>⬆ ${plan.upload_speed}</span>
        </div>
        <div class="result-contract">${t("contract_label")}: ${plan.contract_months} ${t("months_label")}</div>
        <div class="result-actions">
          <a href="${detailLink}" class="btn-view-details">${t("view_details")}</a>
          <a href="${waLink}" target="_blank" class="wa-btn">${t("apply_whatsapp")}</a>
        </div>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", initHomePage);