// NetBijak.com - Broadband Home/Business 浏览页（纯ISP卡片列表）

async function loadBrowsePage() {
  const gridEl = document.getElementById("browse-page-grid");
  const titleEl = document.getElementById("browse-page-title");
  if (!gridEl || typeof USAGE_TYPE === "undefined") return;

  titleEl.textContent = USAGE_TYPE === "business" ? t("browse_business_page_title") : t("browse_home_page_title");
  document.title = titleEl.textContent + " | NetBijak.com";

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
    return USAGE_TYPE === "business" ? isBusiness : !isBusiness;
  });

  if (filtered.length === 0) {
    gridEl.innerHTML = `<p style="color:#64748b">${t("no_results")}</p>`;
    return;
  }

  gridEl.innerHTML = filtered
    .map(
      (p) => `
    <a href="${ROOT_PATH}${p.slug}/" class="provider-browse-card" style="border-color:${p.color_hex}">
      <span class="provider-browse-name" style="color:${p.color_hex}">${p.name}</span>
      <span class="provider-browse-arrow">→</span>
    </a>
  `
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", loadBrowsePage);