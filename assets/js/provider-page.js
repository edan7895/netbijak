// NetBijak.com - ISP 总览页逻辑（读取静态JSON）

let currentTab = "new";
let allPlansForProvider = [];
let currentProviderData = null;

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

async function loadProviderPage() {
  const nameEl = document.getElementById("provider-name");
  const gridEl = document.getElementById("provider-plans-grid");
  if (!nameEl || typeof PROVIDER_SLUG === "undefined") return;

  const allProviders = await fetchStaticData("providers");
  const provider = allProviders.find((p) => p.slug === PROVIDER_SLUG);

  if (!provider) {
    nameEl.textContent = "Provider not found";
    return;
  }

  currentProviderData = provider;

  setSEOMeta({
    title: `${provider.name} Broadband Plans | NetBijak.com`,
    description: `Compare all ${provider.name} broadband plans in Malaysia.`,
    url: window.location.href,
  });

  nameEl.innerHTML = `
    ${provider.logo_url ? `<img src="${ROOT_PATH}${provider.logo_url.replace(/^\//, "")}" alt="${provider.name}" class="provider-hero-logo" />` : ""}
    <span style="color:${provider.color_hex}">${provider.name}</span>
  `;

  const allPlans = await fetchStaticData("plans");
  const plans = allPlans
    .filter((p) => p.provider_id === provider.id)
    .filter((p) => isPlanCurrentlyPublished(p))
    .sort((a, b) => a.promo_price - b.promo_price);

  allPlansForProvider = plans;
  buildTabs(plans);
  renderPlansForTab(currentTab);
}

function buildTabs(plans) {
  const tabsEl = document.getElementById("provider-tabs");
  if (!tabsEl) return;

  const categories = ["new", "transfer", "upgrade", "existing"];
  const availableCategories = categories.filter((cat) =>
    plans.some((p) => matchesAppType(p.new_and_transfer, cat))
  );

  if (availableCategories.length === 0) {
    tabsEl.innerHTML = "";
    return;
  }

  if (!availableCategories.includes(currentTab)) {
    currentTab = availableCategories[0];
  }

  tabsEl.innerHTML = availableCategories
    .map(
      (cat) => `
      <button class="tab-btn ${cat === currentTab ? "active" : ""}" data-tab="${cat}">
        ${t("apptype_" + cat)}
      </button>
    `
    )
    .join("");

  tabsEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTab = btn.getAttribute("data-tab");
      tabsEl.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderPlansForTab(currentTab);
    });
  });
}

function renderPlansForTab(tab) {
  const gridEl = document.getElementById("provider-plans-grid");
  const filtered = allPlansForProvider.filter((p) => matchesAppType(p.new_and_transfer, tab));

  if (filtered.length === 0) {
    gridEl.innerHTML = `<p style="color:#94a3b8;padding:2rem;text-align:center">${t("no_results")}</p>`;
    return;
  }

  gridEl.innerHTML = filtered.map((plan) => buildProviderPlanCard(plan)).join("");
}

function buildProviderPlanCard(plan) {
  const color = currentProviderData.color_hex;
  const detailLink = `${plan.slug}/`;

  const activeBanner = (plan.plan_banners || []).find((b) => {
    if (!b.is_active) return false;
    const now = new Date();
    if (b.start_at && new Date(b.start_at) > now) return false;
    if (b.end_at && new Date(b.end_at) < now) return false;
    return true;
  });

  const bannerHtml = activeBanner
    ? `<div class="plan-card-banner"><img src="${activeBanner.image_url}" alt="Promo" /></div>`
    : "";

  return `
    <a href="${detailLink}" class="plan-card-link">
      <div class="plan-mini-card" style="border-color:${color}">
        ${bannerHtml}
        <div class="plan-mini-body">
          <div class="plan-mini-name">${plan.name}</div>
          ${plan.tagline ? `<div class="plan-mini-tagline">${plan.tagline}</div>` : ""}
          <div class="plan-mini-price" style="color:${color}">
            RM${plan.promo_price}<small>${t("per_month")}</small>
          </div>
          <div class="plan-mini-speed">
            <span>⬇ ${plan.download_speed}</span>
            <span>⬆ ${plan.upload_speed}</span>
          </div>
        </div>
      </div>
    </a>
  `;
}

document.addEventListener("DOMContentLoaded", loadProviderPage);