// NetBijak.com - Find Your Plan 页面逻辑（读取静态JSON）

const WHATSAPP_NUMBER_FYP = "60178835110";

let selectedUsageType = "home";
let selectedPropertyType = "highrise";
let selectedAppType = "new";
let selectedConnType = "all";
let selectedUserRange = { min: 2, max: 4 };

function initFindYourPlanPage() {
  const usageHomeBtn = document.getElementById("btn-usage-home");
  const usageBusinessBtn = document.getElementById("btn-usage-business");
  const landedBtn = document.getElementById("btn-landed");
  const highriseBtn = document.getElementById("btn-highrise");
  const appTypeSelect = document.getElementById("apptype-select");
  const connTypeSelect = document.getElementById("conntype-select");
  const userSelect = document.getElementById("user-select");
  const compareBtn = document.getElementById("btn-compare");

  if (!landedBtn) return;

  usageHomeBtn.addEventListener("click", () => {
    selectedUsageType = "home";
    usageHomeBtn.classList.add("active");
    usageBusinessBtn.classList.remove("active");
  });

  usageBusinessBtn.addEventListener("click", () => {
    selectedUsageType = "business";
    usageBusinessBtn.classList.add("active");
    usageHomeBtn.classList.remove("active");
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

  connTypeSelect.addEventListener("change", (e) => {
    selectedConnType = e.target.value;
  });

  userSelect.addEventListener("change", (e) => {
    const [min, max] = e.target.value.split("-").map(Number);
    selectedUserRange = { min, max: max || 999 };
  });

  compareBtn.addEventListener("click", runComparison);

  setSEOMeta({
    title: t("findplan_title") + " | NetBijak.com",
    description: t("findplan_subtitle"),
    url: window.location.href,
  });

  loadFindYourPlanContent();
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
  const budgetInput = document.getElementById("budget-input");
  const budget = parseFloat(budgetInput.value) || 9999;

  resultsSection.classList.remove("hidden");
  resultsGrid.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;
  resultsSection.scrollIntoView({ behavior: "smooth" });

  const housingColumn = selectedPropertyType === "landed" ? "supports_landed" : "supports_highrise";

  const allProviders = await fetchStaticData("providers");

  let providers = allProviders.filter((p) => p.is_active && p[housingColumn] === true);

  if (selectedConnType !== "all") {
    providers = providers.filter((p) => p.connection_type === selectedConnType);
  }

  providers = providers.filter((p) => {
    const isBusiness = p.slug.includes("-business");
    return selectedUsageType === "business" ? isBusiness : !isBusiness;
  });

  if (providers.length === 0) {
    resultsGrid.innerHTML = `<p style="color:#94a3b8;padding:2rem;text-align:center">${t("no_results")}</p>`;
    return;
  }

  const providerIds = providers.map((p) => p.id);
  const allPlans = await fetchStaticData("plans");

  const filtered = allPlans
    .filter((plan) => providerIds.includes(plan.provider_id))
    .filter((plan) => isPlanCurrentlyPublished(plan))
    .filter((plan) => plan.promo_price <= budget)
    .filter((plan) => {
      const planRange = parseUserRange(plan.recommended_for);
      const userMatch = rangesOverlap(planRange, selectedUserRange);
      const appTypeMatch = matchesAppType(plan.new_and_transfer, selectedAppType);
      return userMatch && appTypeMatch;
    })
    .sort((a, b) => a.promo_price - b.promo_price);

  renderResults(filtered);
}

function renderResults(plans) {
  const resultsGrid = document.getElementById("results-grid");

  if (!plans || plans.length === 0) {
    resultsGrid.innerHTML = `<p style="color:#94a3b8;padding:2rem;text-align:center">${t("no_results")}</p>`;
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
  const logoUrl = provider ? provider.logo_url : "";

  const waMsg = plan.whatsapp_ref || `Hi NetBijak, I'm interested in ${plan.name}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER_FYP}?text=${encodeURIComponent(waMsg)}`;
  const detailLink = `${ROOT_PATH}${providerSlug}/${plan.slug}/`;

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

// ===== 文章 + FAQ 区块 =====
async function loadFindYourPlanContent() {
  const contentWrap = document.getElementById("fyp-content-wrap");
  if (!contentWrap) return;

  const lang = getCurrentLang();
  const allArticles = await fetchStaticData("articles");
  const article = allArticles.find(
    (a) => a.slug === `find-my-plan-buying-guide-${lang}` && isArticleCurrentlyPublished(a)
  );

  const articleHtml = article
    ? `
    <article class="bh-article-full" id="buying-guide">
      <h2 class="bh-article-full-title">${article.title}</h2>
      <div class="bh-article-full-content">${article.content || ""}</div>
    </article>
  `
    : "";

  contentWrap.innerHTML = `
    ${articleHtml}

    <section class="section-card">
      <h2>${t("fyp_faq_title")}</h2>
      <p class="section-sub">${t("fyp_faq_subtitle")}</p>
      <div id="fyp-faq-list" class="faq-list"></div>
    </section>
  `;

  buildFindYourPlanFAQ();
}

function buildFindYourPlanFAQ() {
  const faqList = document.getElementById("fyp-faq-list");
  if (!faqList) return;

  const questionKeys = ["fyp_faq_q1", "fyp_faq_q2", "fyp_faq_q3", "fyp_faq_q4", "fyp_faq_q5", "fyp_faq_q6", "fyp_faq_q7", "fyp_faq_q8"];
  const answerKeys = ["fyp_faq_a1", "fyp_faq_a2", "fyp_faq_a3", "fyp_faq_a4", "fyp_faq_a5", "fyp_faq_a6", "fyp_faq_a7", "fyp_faq_a8"];

  faqList.innerHTML = questionKeys
    .map(
      (qKey, i) => `
    <div class="faq-item">
      <button type="button" class="faq-question" data-index="${i}">
        <span>${t(qKey)}</span>
        <span class="faq-toggle-icon">+</span>
      </button>
      <div class="faq-answer"><p>${t(answerKeys[i])}</p></div>
    </div>
  `
    )
    .join("");

  faqList.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const isOpen = item.classList.contains("open");
      faqList.querySelectorAll(".faq-item").forEach((el) => el.classList.remove("open"));
      if (!isOpen) item.classList.add("open");
    });
  });

  injectFAQSchema("fyp-faq-list");
}

document.addEventListener("DOMContentLoaded", initFindYourPlanPage);