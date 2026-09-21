// NetBijak.com - Admin 首页Banner轮播管理

let editingBannerId = null;

async function initAdminHomepageBannersPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  await loadBannersList();

  document.getElementById("btn-new-banner").addEventListener("click", () => openBannerForm(null));
  document.getElementById("banner-form").addEventListener("submit", saveBanner);
  document.getElementById("btn-cancel-banner-form").addEventListener("click", closeBannerForm);
}

async function loadBannersList() {
  const tbody = document.getElementById("banners-table-body");
  tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;

  const { data: banners, error } = await supabaseClient
    .from("homepage_banners")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !banners || banners.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8">No banners yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = banners
    .map(
      (b) => `
    <tr>
      <td><img src="${b.image_url}" style="width:80px;height:40px;object-fit:cover;border-radius:6px" /></td>
      <td style="font-size:0.8rem">${b.link_url}</td>
      <td>${b.sort_order}</td>
      <td>${b.is_active ? '<span class="badge-published">Active</span>' : '<span class="badge-unpublished">Inactive</span>'}</td>
      <td>
        <button class="btn-small" onclick="openBannerForm(${b.id})">Edit</button>
        <button class="btn-small btn-delete" onclick="deleteBanner(${b.id})">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");
}

async function deleteBanner(bannerId) {
  const confirmed = confirm("Delete this banner?");
  if (!confirmed) return;

  const { error } = await supabaseClient.from("homepage_banners").delete().eq("id", bannerId);
  if (error) {
    alert("Error: " + error.message);
    return;
  }
  loadBannersList();
}

async function openBannerForm(bannerId) {
  editingBannerId = bannerId;
  document.getElementById("banner-form-wrap").classList.remove("hidden");
  document.getElementById("banner-form-title").textContent = bannerId ? "Edit Banner" : "New Banner";
  document.getElementById("banner-form").reset();

  if (bannerId) {
    const { data: banner } = await supabaseClient.from("homepage_banners").select("*").eq("id", bannerId).single();
    if (banner) {
      document.getElementById("banner-image-url").value = banner.image_url || "";
      document.getElementById("banner-link-url").value = banner.link_url || "";
      document.getElementById("banner-sort-order").value = banner.sort_order || 0;
      document.getElementById("banner-is-active").checked = banner.is_active;
      document.getElementById("banner-start-at").value = banner.start_at ? banner.start_at.slice(0, 16) : "";
      document.getElementById("banner-end-at").value = banner.end_at ? banner.end_at.slice(0, 16) : "";
    }
  } else {
    document.getElementById("banner-is-active").checked = true;
    document.getElementById("banner-sort-order").value = 0;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeBannerForm() {
  document.getElementById("banner-form-wrap").classList.add("hidden");
  editingBannerId = null;
}

async function saveBanner(e) {
  e.preventDefault();

  const bannerData = {
    image_url: document.getElementById("banner-image-url").value,
    link_url: document.getElementById("banner-link-url").value,
    sort_order: parseInt(document.getElementById("banner-sort-order").value) || 0,
    is_active: document.getElementById("banner-is-active").checked,
    start_at: document.getElementById("banner-start-at").value || null,
    end_at: document.getElementById("banner-end-at").value || null,
  };

  let result;
  if (editingBannerId) {
    result = await supabaseClient.from("homepage_banners").update(bannerData).eq("id", editingBannerId);
  } else {
    result = await supabaseClient.from("homepage_banners").insert(bannerData);
  }

  if (result.error) {
    alert("Error saving banner: " + result.error.message);
    return;
  }

  alert("Banner saved!");
  closeBannerForm();
  loadBannersList();
}

document.addEventListener("DOMContentLoaded", initAdminHomepageBannersPage);