// NetBijak.com - Home 首页比较器逻辑

const WHATSAPP_NUMBER = "60123456789"; // ⚠️ 改成你的真实WhatsApp Business号码

let selectedPropertyType = "highrise";
let selectedUserRange = { min: 2, max: 4 };

function initHomePage() {
  const landedBtn = document.getElementById("btn-landed");
  const highriseBtn = document.getElementById("btn-highrise");
  const userSelect = document.getElementById("user-select");
  const compareBtn = document.getElementById("btn-compare");

  if (!landedBtn) return; // 不是首页就不执行

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

  userSelect.addEventListener("change", (e) => {
    const [min, max] = e.target.value.split("-").map(Number);
    selectedUserRange = { min, max: max || 999 };
  });

  compareBtn.addEventListener("click", runComparison);
}

// 从配套的 recommended_for 文字（例如 "2-4 users/devices"）解析出数字范围
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

async function runComparison() {
  const resultsSection = document.getElementById("results-section");
  const resultsGrid = document.getElementById("results-grid");
  const budgetInput = document.getElementById("budget-input");
  const budget = parseFloat(budgetInput.value) || 9999;

  resultsSection.classList.remove("hidden");
  resultsGrid.innerHTML = `<p style="color:#64748b">Loading...</p>`;

  const housingColumn = selectedPropertyType === "landed" ? "supports_landed" : "supports_highrise";

  // 第1步：找出支持这个住宅类型的运营商
  const { data: providers, error: providerError } = await supabaseClient
    .from("providers")
    .select("*")
    .eq("is_active", true)
    .eq(housingColumn, true);

  if (providerError || !providers || providers.length === 0) {
    resultsGrid.innerHTML = `<p>${t("no_results")}</p>`;
    return;
  }

  const providerIds = providers.map((p) => p.id);
  const now = new Date().toISOString();

  // 第2步：找出符合预算、已发布、在发布时间范围内的配套
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

  // 第3步：用人数范围再过滤一次（前端处理，因为资料库里是文字格式）
  const filtered = (plans || []).filter((plan) => {
    const planRange = parseUserRange(plan.recommended_for);
    return rangesOverlap(planRange, selectedUserRange);
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
  const detailLink = `${providerSlug}/${plan.slug}/`;

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