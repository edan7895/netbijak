// NetBijak.com - 配套详情页逻辑

const WHATSAPP_NUMBER_DETAIL = "60123456789"; // ⚠️ 改成你的真实WhatsApp Business号码

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

async function loadPlanDetail() {
  const slug = getSlugFromUrl();
  const container = document.getElementById("plan-detail-container");
  if (!slug || !container) {
    if (container) container.innerHTML = `<p>Plan not found.</p>`;
    return;
  }

  const { data: plan, error } = await supabaseClient
    .from("plans")
    .select("*, providers(*), plan_banners(*)")
    .eq("slug", slug)
    .single();

  if (error || !plan) {
    container.innerHTML = `<p>Plan not found.</p>`;
    return;
  }

  const provider = plan.providers;
  const color = provider ? provider.color_hex : "#14b8a6";
  const logoUrl = provider ? provider.logo_url : "";

  document.title = plan.seo_title || `${plan.name} | NetBijak.com`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", plan.seo_description || plan.tagline || plan.name);

  const activeBanner = (plan.plan_banners || []).find((b) => {
    if (!b.is_active) return false;
    const now = new Date();
    if (b.start_at && new Date(b.start_at) > now) return false;
    if (b.end_at && new Date(b.end_at) < now) return false;
    return true;
  });

  const bannerHtml = activeBanner
    ? `<div class="detail-banner">
        ${activeBanner.link_url ? `<a href="${activeBanner.link_url}" target="_blank">` : ""}
        <img src="${activeBanner.image_url}" alt="Promotion" />
        ${activeBanner.link_url ? `</a>` : ""}
      </div>`
    : "";

  const waMsg = plan.whatsapp_ref || `Hi NetBijak, I'm interested in ${plan.name}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER_DETAIL}?text=${encodeURIComponent(waMsg)}`;

  const featuresList = (plan.features || "")
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  container.innerHTML = `
    <div class="detail-breadcrumb">
      <a href="../">${provider ? provider.name : plan.provider}</a> / ${plan.name}
    </div>
    ${bannerHtml}
    <div class="detail-header" style="border-color:${color}">
      <div style="height:6px;background:${color}"></div>
      <div class="detail-header-body">
        <div class="detail-provider-header">
          ${logoUrl ? `<img src="${ROOT_PATH}${logoUrl.replace(/^\//, "")}" alt="${provider ? provider.name : plan.provider}" class="detail-provider-logo" />` : ""}
          <span class="detail-provider-tag" style="color:${color}">${provider ? provider.name : plan.provider}</span>
        </div>
        <h1 class="detail-plan-name">${plan.name}</h1>
        ${plan.tagline ? `<p class="detail-tagline">${plan.tagline}</p>` : ""}
        <div class="detail-price" style="color:${color}">
          RM${plan.promo_price}<small>${t("per_month")}</small>
          ${plan.original_price ? `<span class="detail-original-price">RM${plan.original_price}</span>` : ""}
        </div>
        <div class="detail-speed-row">
          <div class="detail-speed-box">
            <span class="detail-speed-label">Download</span>
            <span class="detail-speed-value">${plan.download_speed}</span>
          </div>
          <div class="detail-speed-box">
            <span class="detail-speed-label">Upload</span>
            <span class="detail-speed-value">${plan.upload_speed}</span>
          </div>
          <div class="detail-speed-box">
            <span class="detail-speed-label">${t("contract_label")}</span>
            <span class="detail-speed-value">${plan.contract_months} ${t("months_label")}</span>
          </div>
        </div>
        <a href="${waLink}" target="_blank" class="wa-btn wa-btn-large">${t("apply_whatsapp")}</a>
      </div>
    </div>

    ${
      featuresList.length > 0
        ? `<div class="detail-section">
            <h2>Features</h2>
            <ul class="detail-features-list">
              ${featuresList.map((f) => `<li>${f}</li>`).join("")}
            </ul>
          </div>`
        : ""
    }

    <div id="detail-articles-section"></div>
  `;

  loadRelatedArticles(plan.id);
}

async function loadRelatedArticles(planId) {
  const lang = getCurrentLang();
  const { data: articles } = await supabaseClient
    .from("articles")
    .select("*")
    .eq("plan_id", planId)
    .eq("is_published", true)
    .eq("language", lang);

  const section = document.getElementById("detail-articles-section");
  if (!section || !articles || articles.length === 0) return;

  section.innerHTML = `
    <div class="detail-section">
      <h2>Related Articles</h2>
      <div class="detail-articles-list">
        ${articles
          .map(
            (a) => `
          <a href="../../blog/?slug=${a.slug}" class="detail-article-link">
            ${a.cover_image_url ? `<img src="${a.cover_image_url}" alt="${a.title}" />` : ""}
            <span>${a.title}</span>
          </a>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", loadPlanDetail);