// NetBijak.com - Admin 配套管理逻辑

let allProvidersCache = [];
let editingPlanId = null;

async function initAdminPlansPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  await loadProviderOptions();
  await loadPlansList();

  document.getElementById("filter-provider").addEventListener("change", loadPlansList);
  document.getElementById("btn-new-plan").addEventListener("click", () => openPlanForm(null));
  document.getElementById("plan-form").addEventListener("submit", savePlan);
  document.getElementById("btn-cancel-form").addEventListener("click", closePlanForm);
  document.getElementById("btn-add-banner").addEventListener("click", addBannerRow);
}

async function loadProviderOptions() {
  const { data: providers } = await supabaseClient
    .from("providers")
    .select("*")
    .order("sort_order", { ascending: true });

  allProvidersCache = providers || [];

  const filterSelect = document.getElementById("filter-provider");
  const formSelect = document.getElementById("form-provider-id");

  const optionsHtml = allProvidersCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  filterSelect.innerHTML = `<option value="">All Providers</option>` + optionsHtml;
  formSelect.innerHTML = optionsHtml;
}

async function loadPlansList() {
  const tbody = document.getElementById("plans-table-body");
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

  const providerId = document.getElementById("filter-provider").value;

  let query = supabaseClient
    .from("plans")
    .select("*, providers(name, color_hex)")
    .order("created_at", { ascending: false });

  if (providerId) query = query.eq("provider_id", providerId);

  const { data: plans, error } = await query;

  if (error || !plans || plans.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8">No plans found.</td></tr>`;
    return;
  }

  tbody.innerHTML = plans
    .map((p) => {
      const providerName = p.providers ? p.providers.name : p.provider;
      const providerColor = p.providers ? p.providers.color_hex : "#64748b";
      return `
      <tr>
        <td><span style="color:${providerColor};font-weight:700">${providerName}</span></td>
        <td>${p.name}</td>
        <td>RM${p.promo_price}</td>
        <td>${p.new_and_transfer || "-"}</td>
        <td>${p.is_published ? '<span class="badge-published">Published</span>' : '<span class="badge-unpublished">Hidden</span>'}</td>
        <td>
          <button class="btn-small" onclick="openPlanForm(${p.id})">Edit</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

async function openPlanForm(planId) {
  editingPlanId = planId;
  document.getElementById("plan-form-wrap").classList.remove("hidden");
  document.getElementById("plan-form-title").textContent = planId ? "Edit Plan" : "New Plan";
  document.getElementById("plan-form").reset();
  document.getElementById("banners-list").innerHTML = "";

  if (planId) {
    const { data: plan } = await supabaseClient.from("plans").select("*").eq("id", planId).single();
    if (plan) {
      document.getElementById("form-provider-id").value = plan.provider_id || "";
      document.getElementById("form-name").value = plan.name || "";
      document.getElementById("form-tagline").value = plan.tagline || "";
      document.getElementById("form-download-speed").value = plan.download_speed || "";
      document.getElementById("form-upload-speed").value = plan.upload_speed || "";
      document.getElementById("form-promo-price").value = plan.promo_price || "";
      document.getElementById("form-original-price").value = plan.original_price || "";
      document.getElementById("form-contract-months").value = plan.contract_months || "";
      document.getElementById("form-housing-type").value = plan.housing_type || "";
      document.getElementById("form-features").value = plan.features || "";
      document.getElementById("form-recommended-for").value = plan.recommended_for || "";
      document.getElementById("form-whatsapp-ref").value = plan.whatsapp_ref || "";
      document.getElementById("form-app-type").value = plan.new_and_transfer || "";
      document.getElementById("form-seo-title").value = plan.seo_title || "";
      document.getElementById("form-seo-description").value = plan.seo_description || "";
      document.getElementById("form-is-published").checked = plan.is_published;
      document.getElementById("form-publish-at").value = plan.publish_at ? plan.publish_at.slice(0, 16) : "";
      document.getElementById("form-unpublish-at").value = plan.unpublish_at ? plan.unpublish_at.slice(0, 16) : "";

      await loadBannersForPlan(planId);
    }
  } else {
    document.getElementById("form-is-published").checked = true;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closePlanForm() {
  document.getElementById("plan-form-wrap").classList.add("hidden");
  editingPlanId = null;
}

async function savePlan(e) {
  e.preventDefault();

  const planData = {
    provider_id: document.getElementById("form-provider-id").value || null,
    name: document.getElementById("form-name").value,
    tagline: document.getElementById("form-tagline").value,
    download_speed: document.getElementById("form-download-speed").value,
    upload_speed: document.getElementById("form-upload-speed").value,
    promo_price: parseFloat(document.getElementById("form-promo-price").value) || null,
    original_price: parseFloat(document.getElementById("form-original-price").value) || null,
    contract_months: parseInt(document.getElementById("form-contract-months").value) || null,
    housing_type: document.getElementById("form-housing-type").value,
    features: document.getElementById("form-features").value,
    recommended_for: document.getElementById("form-recommended-for").value,
    whatsapp_ref: document.getElementById("form-whatsapp-ref").value,
    new_and_transfer: document.getElementById("form-app-type").value,
    seo_title: document.getElementById("form-seo-title").value,
    seo_description: document.getElementById("form-seo-description").value,
    is_published: document.getElementById("form-is-published").checked,
    publish_at: document.getElementById("form-publish-at").value || null,
    unpublish_at: document.getElementById("form-unpublish-at").value || null,
  };

  // 自动生成 slug
  const appTypeSlug = (planData.new_and_transfer || "").toLowerCase().includes("new")
    ? "new"
    : (planData.new_and_transfer || "").toLowerCase().includes("transfer")
    ? "transfer"
    : (planData.new_and_transfer || "").toLowerCase().includes("upgrade")
    ? "upgrade"
    : "special";

  const baseSlug = planData.name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, "-");

  let result;
  if (editingPlanId) {
    result = await supabaseClient.from("plans").update(planData).eq("id", editingPlanId);
  } else {
    planData.slug = `${baseSlug}-${appTypeSlug}-${Date.now()}`;
    result = await supabaseClient.from("plans").insert(planData).select().single();
  }

  if (result.error) {
    alert("Error saving plan: " + result.error.message);
    return;
  }

  const savedPlanId = editingPlanId || result.data.id;
  await saveBanners(savedPlanId);

  alert("Plan saved successfully!");
  closePlanForm();
  loadPlansList();
}

// ===== Banner 管理 =====
async function loadBannersForPlan(planId) {
  const { data: banners } = await supabaseClient
    .from("plan_banners")
    .select("*")
    .eq("plan_id", planId);

  const list = document.getElementById("banners-list");
  list.innerHTML = "";
  (banners || []).forEach((b) => addBannerRow(b));
}

function addBannerRow(banner) {
  const list = document.getElementById("banners-list");
  const rowId = banner && banner.id ? banner.id : "new-" + Date.now();

  const row = document.createElement("div");
  row.className = "banner-row";
  row.dataset.bannerId = banner && banner.id ? banner.id : "";
  row.innerHTML = `
    <input type="text" placeholder="Image URL" class="banner-image-url" value="${banner ? banner.image_url || "" : ""}" />
    <input type="text" placeholder="Link URL (optional)" class="banner-link-url" value="${banner ? banner.link_url || "" : ""}" />
    <label class="banner-active-label">
      <input type="checkbox" class="banner-is-active" ${banner && banner.is_active ? "checked" : ""} /> Active
    </label>
    <input type="datetime-local" class="banner-start-at" value="${banner && banner.start_at ? banner.start_at.slice(0, 16) : ""}" />
    <input type="datetime-local" class="banner-end-at" value="${banner && banner.end_at ? banner.end_at.slice(0, 16) : ""}" />
    <button type="button" class="btn-remove-banner" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(row);
}

async function saveBanners(planId) {
  const rows = document.querySelectorAll("#banners-list .banner-row");

  for (const row of rows) {
    const imageUrl = row.querySelector(".banner-image-url").value;
    if (!imageUrl) continue;

    const bannerData = {
      plan_id: planId,
      image_url: imageUrl,
      link_url: row.querySelector(".banner-link-url").value,
      is_active: row.querySelector(".banner-is-active").checked,
      start_at: row.querySelector(".banner-start-at").value || null,
      end_at: row.querySelector(".banner-end-at").value || null,
    };

    const existingId = row.dataset.bannerId;
    if (existingId) {
      await supabaseClient.from("plan_banners").update(bannerData).eq("id", existingId);
    } else {
      await supabaseClient.from("plan_banners").insert(bannerData);
    }
  }
}

document.addEventListener("DOMContentLoaded", initAdminPlansPage);