// NetBijak.com - Home 首页逻辑（搜索 + 按运营商浏览）

const WHATSAPP_NUMBER = "60178835110"; // ⚠️ 改成你的真实WhatsApp Business号码

function initHomePage() {
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  if (!searchBtn) return;

  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") performSearch();
  });

  renderProviderGrid();
}

async function performSearch() {
  const input = document.getElementById("search-input");
  const keyword = input.value.trim();
  if (!keyword) return;

  const resultsSection = document.getElementById("results-section");
  const resultsGrid = document.getElementById("results-grid");
  const resultsTitleEl = document.getElementById("results-title");

  resultsSection.classList.remove("hidden");
  resultsTitleEl.textContent = `${t("search_results_for")} "${keyword}"`;
  resultsGrid.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;
  resultsSection.scrollIntoView({ behavior: "smooth" });

  const { data: plans, error } = await supabaseClient
    .from("plans")
    .select("*, providers(*)")
    .eq("is_published", true)
    .or(`name.ilike.%${keyword}%,tagline.ilike.%${keyword}%`)
    .order("promo_price", { ascending: true })
    .limit(24);

  if (error || !plans || plans.length === 0) {
    resultsGrid.innerHTML = `<p style="color:#94a3b8;padding:2rem;text-align:center">${t("no_results")}</p>`;
    return;
  }

  const lowestPrice = Math.min(...plans.map((p) => p.promo_price));
  resultsGrid.innerHTML = plans.map((plan) => buildResultCard(plan, plan.promo_price === lowestPrice)).join("");
}

async function renderProviderGrid() {
  const gridEl = document.getElementById("provider-browse-grid");
  if (!gridEl) return;

  gridEl.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;

  const { data: providers, error } = await supabaseClient
    .from("providers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !providers) {
    gridEl.innerHTML = "";
    return;
  }

  const filtered = providers.filter((p) => !p.slug.includes("-business"));

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

function buildResultCard(plan, isBest) {
  const provider = plan.providers;
  const color = provider ? provider.color_hex : "#14b8a6";
  const providerName = provider ? provider.name : plan.provider;
  const providerSlug = provider ? provider.slug : "";
  const logoUrl = provider ? provider.logo_url : "";

  const waMsg = plan.whatsapp_ref || `Hi NetBijak, I'm interested in ${plan.name}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  const detailLink = `../${providerSlug}/plan/?slug=${plan.slug}`;

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