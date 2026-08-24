// NetBijak.com - Compare 比较页逻辑（读取静态JSON）

const WHATSAPP_NUMBER_COMPARE = "60178835110";

let compareSlotCount = 0;
let allProvidersCompare = [];
let allPlansCompare = [];
const MAX_SLOTS = 4;

function matchesAppTypeCompare(applicationType, category) {
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

async function initComparePage() {
  setSEOMeta({
    title: t("compare_title") + " | NetBijak.com",
    description: t("compare_subtitle"),
    url: window.location.href,
  });

  allProvidersCompare = (await fetchStaticData("providers")).filter((p) => p.is_active);
  allPlansCompare = (await fetchStaticData("plans")).filter((p) => isPlanCurrentlyPublished(p));

  addCompareSlot();
  addCompareSlot();

  document.getElementById("btn-add-slot").addEventListener("click", () => {
    if (compareSlotCount < MAX_SLOTS) addCompareSlot();
  });
  document.getElementById("btn-compare-go").addEventListener("click", runCompareTable);

  loadCompareContent();
}

function addCompareSlot() {
  if (compareSlotCount >= MAX_SLOTS) return;
  compareSlotCount++;
  const slotId = compareSlotCount;

  const wrap = document.getElementById("compare-slots-wrap");
  const slotEl = document.createElement("div");
  slotEl.className = "compare-slot";
  slotEl.id = `slot-${slotId}`;

  const providerOptions = allProvidersCompare
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");

  slotEl.innerHTML = `
    <div class="compare-slot-header">
      <span>Plan ${slotId}</span>
      ${slotId > 2 ? `<button type="button" class="btn-remove-slot" onclick="removeCompareSlot(${slotId})">${t("compare_btn_remove")}</button>` : ""}
    </div>
    <label>${t("section_apptype_title")}</label>
    <select id="slot-apptype-${slotId}" onchange="updatePlanOptions(${slotId})">
      <option value="new">${t("apptype_new")}</option>
      <option value="transfer">${t("apptype_transfer")}</option>
      <option value="upgrade">${t("apptype_upgrade")}</option>
      <option value="existing">${t("apptype_existing")}</option>
    </select>
    <label>${t("compare_select_provider")}</label>
    <select id="slot-provider-${slotId}" onchange="updatePlanOptions(${slotId})">
      ${providerOptions}
    </select>
    <label>${t("compare_select_plan")}</label>
    <select id="slot-plan-${slotId}"></select>
  `;
  wrap.appendChild(slotEl);
  updatePlanOptions(slotId);
}

function removeCompareSlot(slotId) {
  const el = document.getElementById(`slot-${slotId}`);
  if (el) el.remove();
}

function updatePlanOptions(slotId) {
  const providerId = parseInt(document.getElementById(`slot-provider-${slotId}`).value, 10);
  const appType = document.getElementById(`slot-apptype-${slotId}`).value;
  const planSelect = document.getElementById(`slot-plan-${slotId}`);

  const filtered = allPlansCompare
    .filter((p) => p.provider_id === providerId)
    .filter((p) => matchesAppTypeCompare(p.new_and_transfer, appType))
    .sort((a, b) => a.promo_price - b.promo_price);

  planSelect.innerHTML =
    `<option value="">${t("compare_select_placeholder")}</option>` +
    filtered.map((p) => `<option value="${p.id}">${p.name} — RM${p.promo_price}</option>`).join("");
}

function runCompareTable() {
  const resultWrap = document.getElementById("compare-result-wrap");
  const selectedPlanIds = [];

  for (let i = 1; i <= compareSlotCount; i++) {
    const slotEl = document.getElementById(`slot-${i}`);
    if (!slotEl) continue;
    const planId = document.getElementById(`slot-plan-${i}`).value;
    if (planId) selectedPlanIds.push(parseInt(planId, 10));
  }

  if (selectedPlanIds.length < 2) {
    resultWrap.innerHTML = `<p class="compare-empty-msg">${t("compare_empty")}</p>`;
    return;
  }

  const orderedPlans = selectedPlanIds.map((id) => allPlansCompare.find((p) => p.id === id)).filter(Boolean);

  if (orderedPlans.length === 0) {
    resultWrap.innerHTML = `<p class="compare-empty-msg">${t("compare_empty")}</p>`;
    return;
  }

  renderCompareTable(orderedPlans);
}

function renderCompareTable(plans) {
  const resultWrap = document.getElementById("compare-result-wrap");

  const headerCells = plans
    .map((p) => {
      const logoUrl = p.providers ? p.providers.logo_url : "";
      const providerName = p.providers ? p.providers.name : p.provider;
      const color = p.providers ? p.providers.color_hex : "#0f172a";
      return `<th style="color:${color}">
        ${logoUrl ? `<img src="${ROOT_PATH}${logoUrl.replace(/^\//, "")}" alt="${providerName}" class="compare-th-logo" />` : ""}
        ${providerName}<br><span class="compare-th-plan">${p.name}</span>
      </th>`;
    })
    .join("");

  const priceCells = plans.map((p) => `<td class="compare-price-cell">RM${p.promo_price}${t("per_month")}</td>`).join("");
  const downloadCells = plans.map((p) => `<td>${p.download_speed || "-"}</td>`).join("");
  const uploadCells = plans.map((p) => `<td>${p.upload_speed || "-"}</td>`).join("");
  const contractCells = plans.map((p) => `<td>${p.contract_months ? p.contract_months + " " + t("months_label") : "-"}</td>`).join("");
  const featuresCells = plans
    .map((p) => `<td class="compare-features-cell">${(p.features || "-").split(",").map((f) => `<div>${f.trim()}</div>`).join("")}</td>`)
    .join("");
  const applyCells = plans
    .map((p) => {
      const waMsg = p.whatsapp_ref || `Hi NetBijak, I'm interested in ${p.name}`;
      const waLink = `https://wa.me/${WHATSAPP_NUMBER_COMPARE}?text=${encodeURIComponent(waMsg)}`;
      return `<td><a href="${waLink}" target="_blank" class="wa-btn" style="display:inline-flex">${t("apply_whatsapp")}</a></td>`;
    })
    .join("");

  resultWrap.innerHTML = `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th></th>${headerCells}</tr></thead>
        <tbody>
          <tr><td class="compare-row-label">${t("compare_row_price")}</td>${priceCells}</tr>
          <tr><td class="compare-row-label">${t("compare_row_download")}</td>${downloadCells}</tr>
          <tr><td class="compare-row-label">${t("compare_row_upload")}</td>${uploadCells}</tr>
          <tr><td class="compare-row-label">${t("compare_row_contract")}</td>${contractCells}</tr>
          <tr><td class="compare-row-label">${t("compare_row_features")}</td>${featuresCells}</tr>
          <tr><td class="compare-row-label">${t("compare_row_apply")}</td>${applyCells}</tr>
        </tbody>
      </table>
    </div>
  `;
}

// ===== 文章 + FAQ 区块 =====
async function loadCompareContent() {
  const contentWrap = document.getElementById("cp-content-wrap");
  if (!contentWrap) return;

  const lang = getCurrentLang();
  const allArticles = await fetchStaticData("articles");
  const article = allArticles.find(
    (a) => a.slug === `compare-plans-buying-guide-${lang}` && isArticleCurrentlyPublished(a)
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
      <h2>${t("cp_faq_title")}</h2>
      <p class="section-sub">${t("cp_faq_subtitle")}</p>
      <div id="cp-faq-list" class="faq-list"></div>
    </section>
  `;

  buildCompareFAQ();
}

function buildCompareFAQ() {
  const faqList = document.getElementById("cp-faq-list");
  if (!faqList) return;

  const lang = getCurrentLang();

  const items = [
    { q: t("cp_faq_q1"), a: `<p>${t("cp_faq_a1")}</p>` },
    { q: t("cp_faq_q2"), a: `<p>${t("cp_faq_a2")}</p>` },
    { q: t("cp_faq_q3"), a: `<p>${t("cp_faq_a3")}</p>` },
    { q: t("cp_faq_q4"), a: `<p>${t("cp_faq_a4")}</p>` },
    { q: t("cp_faq_q5"), a: `<p>${t("cp_faq_a5")}</p>` },
    {
      q: t("cp_faq_q6"),
      a: `<p>${t("cp_faq_a6_intro")}</p><p style="margin-top:10px">
        <a href="${ROOT_PATH}${lang}/broadband-home/" class="faq-inline-link">${t("cp_faq_a6_link1")}</a>
        &nbsp;/&nbsp;
        <a href="${ROOT_PATH}${lang}/broadband-business/" class="faq-inline-link">${t("cp_faq_a6_link2")}</a>
      </p>`,
    },
    { q: t("cp_faq_q7"), a: `<p>${t("cp_faq_a7")}</p>` },
    {
      q: t("cp_faq_q8"),
      a: `<p>${t("cp_faq_a8_intro")} <a href="${ROOT_PATH}${lang}/find-your-plan/" class="faq-inline-link">${t("cp_faq_a8_link")}</a> ${t("cp_faq_a8_outro")}</p>`,
    },
  ];

  faqList.innerHTML = items
    .map(
      (item, i) => `
    <div class="faq-item">
      <button type="button" class="faq-question" data-index="${i}">
        <span>${item.q}</span>
        <span class="faq-toggle-icon">+</span>
      </button>
      <div class="faq-answer">${item.a}</div>
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

  injectFAQSchema("cp-faq-list");
}

document.addEventListener("DOMContentLoaded", initComparePage);