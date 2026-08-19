// NetBijak.com - Home 首页比较器逻辑

const WHATSAPP_NUMBER = "60123456789"; // ⚠️ 改成你的真实WhatsApp Business号码

let selectedUsageType = "home";
let selectedPropertyType = "highrise";
let selectedAppType = "new";
let selectedUserRange = { min: 2, max: 4 };

function initHomePage() {
  const usageHomeBtn = document.getElementById("btn-usage-home");
  const usageBusinessBtn = document.getElementById("btn-usage-business");
  const landedBtn = document.getElementById("btn-landed");
  const highriseBtn = document.getElementById("btn-highrise");
  const appTypeSelect = document.getElementById("apptype-select");
  const userSelect = document.getElementById("user-select");
  const compareBtn = document.getElementById("btn-compare");

  if (!landedBtn) return;

  usageHomeBtn.addEventListener("click", () => {
    selectedUsageType = "home";
    usageHomeBtn.classList.add("active");
    usageBusinessBtn.classList.remove("active");
    renderProviderGrid();
  });

  usageBusinessBtn.addEventListener("click", () => {
    selectedUsageType = "business";
    usageBusinessBtn.classList.add("active");
    usageHomeBtn.classList.remove("active");
    renderProviderGrid();
  });

  landedBtn.addEventListener("click", () => {
    selectedPropertyType = "landed";
    landedBtn.classList.add("active");
    highriseBtn.classList.remove("active");
  });

  highriseBtn.addEventListener("click", () => {
    selectedPropertyType = "highrise";
    highriseBtn.classList.add("active");
    landedBtn.classList.remove("active");
  });

  appTypeSelect.addEventListener("change", (e) => {
    selectedAppType = e.target.value;
  });

  userSelect.addEventListener("change", (e) => {
    const [min, max] = e.target.value.split("-").map(Number);
    selectedUserRange = { min, max: max || 999 };
  });

  compareBtn.addEventListener("click", runComparison);

  initIconNav();
  renderProviderGrid();
}

function initIconNav() {
  const iconHome = document.getElementById("icon-nav-home");
  const iconBusiness = document.getElementById("icon-nav-business");
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");

  if (iconHome) {
    iconHome.addEventListener("click", () => {
      document.getElementById("btn-usage-home").click();
      document.getElementById("usage-section").scrollIntoView({ behavior: "smooth" });
    });
  }
  if (iconBusiness) {
    iconBusiness.addEventListener("click", () => {
      document.getElementById("btn-usage-business").click();
      document.getElementById("usage-section").scrollIntoView({ behavior: "smooth" });
    });
  }
  if (searchBtn) {
    searchBtn.addEventListener("click", performSearch);
  }
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") performSearch();
    });
  }
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
  resultsGrid.innerHTML = `<p style="color:#64748b">Loading...</p>`;
  resultsSection.scrollIntoView({ behavior: "smooth" });

  const { data: plans, error } = await supabaseClient
    .from("plans")
    .select("*, providers(*)")
    .eq("is_published", true)
    .or(`name.ilike.%${keyword}%,tagline.ilike.%${keyword}%`)
    .order("promo_price", { ascending: true })
    .limit(24);

  if (error || !plans || plans.length === 0) {
    resultsGrid.innerHTML = `<p style="color:#64748b;padding:2rem;text-align:center">${t("no_results")}</p>`;
    return;
  }

  const lowestPrice = Math.min(...plans.map((p) => p.promo_price));
  resultsGrid.innerHTML = plans.map((plan) => buildResultCard(plan, plan.promo_price === lowestPrice)).join("");
}

async function renderProviderGrid() {
  const gridEl = document.getElementById("provider-browse-grid");
  if (!gridEl) return;

  gridEl.innerHTML = `<p style="color:#64748b">Loading...</p>`;

  const { data: providers, error } = await supabaseClient
    .from("providers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !providers) {
    gridEl.innerHTML = "";
    return;
  }

  const filtered = providers.filter((p) => {
    const isBusiness = p.slug.includes("-business");
    return selectedUsageType === "business" ? isBusiness : !isBusiness;
  });

  if (filtered.length === 0) {
    gridEl.innerHTML = `<p style="color:#64748b">${t("no_results")}</p>`;
    return;
  }

  gridEl.innerHTML = filtered
    .map(
      (p) => `
    <a href="../${p.slug}/" class="provider-browse-card" style="border-color:${p.color_hex}">
      <span class="provider-browse-name" style="color:${p.color_hex}">${p.name}</span>
      <span class="provider-browse-arrow">→</span>
    </a>
  `
    )
    .join("");
}

function parseUserRange(text) {
  if (!text) return { min: 0, max: 999 };
  const match = text.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return { min: 0, max: 999 };
  const min = parseInt(match[1], 10);
  let max = parseInt(match[2], 10);
  if (text.includes("+")) max = 999;
  return { min, max };
}

function rangesOverlap(a, b) {
  return a.min <= b.max && b.min <= a.max;
}

function matchesAppType(applicationType, category) {
  const text = (applicationType || "").toLowerCase();
  const hasNew = text.includes("new");
  const hasTransfer = text.includes("transfer");
  const hasUpgrade = text.includes("upgrade");

  if (category === "new") return hasNew;
  if (category === "transfer") return hasTransfer;
  if (category === "upgrade") return hasUpgrade;
  if (category === "existing") return !hasNew && !hasTransfer && !hasUpgrade;
  return true;
}

async function runComparison() {
  const resultsSection = document.getElementById("results-section");
  const resultsGrid = document.getElementById("results-grid");
  const resultsTitleEl = document.getElementById("results-title");
  const budgetInput = document.getElementById("budget-input");
  const budget = parseFloat(budgetInput.value) || 9999;

  resultsTitleEl.textContent = t("results_title");
  resultsSection.classList.remove("hidden");
  resultsGrid.innerHTML = `<p style="color:#64748b">Loading...</p>`;

  const housingColumn = selectedPropertyType === "landed" ? "supports_landed" : "supports_highrise";

  const { data: allProviders, error: providerError } = await supabaseClient
    .from("providers")
    .select("*")
    .eq("is_active", true)
    .eq(housingColumn, true);

  if (providerError || !allProviders) {
    resultsGrid.innerHTML = `<p>${t("no_results")}</p>`;
    return;
  }

  const providers = allProviders.filter((p) => {
    const isBusiness = p.slug.includes("-business");
    return selectedUsageType === "business" ? isBusiness : !isBusiness;
  });

  if (providers.length === 0) {
    resultsGrid.innerHTML = `<p style="color:#64748b;padding:2rem;text-align:center">${t("no_results")}</p>`;
    return;
  }

  const providerIds = providers.map((p) => p.id);
  const now = new Date().toISOString();

  const { data: plans, error: planError } = await supabaseClient
    .from("plans")
    .select("*, providers(*)")
    .in("provider_id", providerIds)
    .eq("is_published", true)
    .lte("promo_price", budget)
    .or(`publish_at.is.null,publish_at.lte.${now}`)
    .or(`unpublish_at.is.null,unpublish_at.gte.${now}`)
    .order("promo_price", { ascending: true });

  if (planError) {
    resultsGrid.innerHTML = `<p>${t("no_results")}</p>`;
    return;
  }

  const filtered = (plans || []).filter((plan) => {
    const planRange = parseUserRange(plan.recommended_for);
    const userMatch = rangesOverlap(planRange, selectedUserRange);
    const appTypeMatch = matchesAppType(plan.new_and_transfer, selectedAppType);
    return userMatch && appTypeMatch;
  });

  renderResults(filtered);
}

function renderResults(plans) {
  const resultsGrid = document.getElementById("results-grid");

  if (!plans || plans.length === 0) {
    resultsGrid.innerHTML = `<p style="color:#64748b;padding:2rem;text-align:center">${t("no_results")}</p>`;
    return;
  }

  const lowestPrice = Math.min(...plans.map((p) => p.promo_price));

  resultsGrid.innerHTML = plans.map((plan) => buildResultCard(plan, plan.promo_price === lowestPrice)).join("");
}

function buildResultCard(plan, isBest) {
  const provider = plan.providers;
  const color = provider ? provider.color_hex : "#14b8a6";
  const providerName = provider ? provider.name : plan.provider;
  const providerSlug = provider ? provider.slug : "";

  const waMsg = plan.whatsapp_ref || `Hi NetBijak, I'm interested in ${plan.name}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  const detailLink = `../${providerSlug}/plan/?slug=${plan.slug}`;

  return `
    <div class="result-card" style="border-color:${color}">
      ${isBest ? `<div class="best-badge">💰 ${t("best_badge")}</div>` : ""}
      <div style="height:5px;background:${color}"></div>
      <div class="result-card-body">
        <div class="result-card-header">
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