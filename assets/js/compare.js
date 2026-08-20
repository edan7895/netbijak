// NetBijak.com - Compare 比较页逻辑

const WHATSAPP_NUMBER_COMPARE = "60123456789"; // ⚠️ 改成你的真实WhatsApp号码

let compareSlotCount = 0;
let allProvidersCompare = [];
const MAX_SLOTS = 4;

async function initComparePage() {
  const { data: providers } = await supabaseClient
    .from("providers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  allProvidersCompare = providers || [];

  addCompareSlot();
  addCompareSlot();

  document.getElementById("btn-add-slot").addEventListener("click", () => {
    if (compareSlotCount < MAX_SLOTS) addCompareSlot();
  });
  document.getElementById("btn-compare-go").addEventListener("click", runCompareTable);
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
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");

  slotEl.innerHTML = `
    <div class="compare-slot-header">
      <span>Plan ${slotId}</span>
      ${slotId > 2 ? `<button type="button" class="btn-remove-slot" onclick="removeCompareSlot(${slotId})">${t("compare_btn_remove")}</button>` : ""}
    </div>
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

async function updatePlanOptions(slotId) {
  const providerId = document.getElementById(`slot-provider-${slotId}`).value;
  const planSelect = document.getElementById(`slot-plan-${slotId}`);

  const { data: plans } = await supabaseClient
    .from("plans")
    .select("id, name, promo_price")
    .eq("provider_id", providerId)
    .eq("is_published", true)
    .order("promo_price", { ascending: true });

  planSelect.innerHTML =
    `<option value="">${t("compare_select_placeholder")}</option>` +
    (plans || []).map((p) => `<option value="${p.id}">${p.name} — RM${p.promo_price}</option>`).join("");
}

async function runCompareTable() {
  const resultWrap = document.getElementById("compare-result-wrap");
  const selectedPlanIds = [];

  for (let i = 1; i <= compareSlotCount; i++) {
    const slotEl = document.getElementById(`slot-${i}`);
    if (!slotEl) continue;
    const planId = document.getElementById(`slot-plan-${i}`).value;
    if (planId) selectedPlanIds.push(planId);
  }

  if (selectedPlanIds.length < 2) {
    resultWrap.innerHTML = `<p class="compare-empty-msg">${t("compare_empty")}</p>`;
    return;
  }

  const { data: plans, error } = await supabaseClient
    .from("plans")
    .select("*, providers(*)")
    .in("id", selectedPlanIds);

  if (error || !plans || plans.length === 0) {
    resultWrap.innerHTML = `<p class="compare-empty-msg">${t("compare_empty")}</p>`;
    return;
  }

  const orderedPlans = selectedPlanIds.map((id) => plans.find((p) => p.id == id)).filter(Boolean);

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

document.addEventListener("DOMContentLoaded", initComparePage);