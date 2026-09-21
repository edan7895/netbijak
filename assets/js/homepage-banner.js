// NetBijak.com - Promotion Banner 横向滚动卡片列表

async function initHomepageBannerCarousel() {
  const wrap = document.getElementById("homepage-banner-carousel");
  if (!wrap) return;

  const now = new Date().toISOString();

  const { data: banners, error } = await supabaseClient
    .from("homepage_banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !banners || banners.length === 0) return;

  const activeBanners = banners.filter((b) => {
    if (b.start_at && b.start_at > now) return false;
    if (b.end_at && b.end_at < now) return false;
    return true;
  });

  if (activeBanners.length === 0) return;

  wrap.classList.remove("hidden");

  const cardsHtml = activeBanners
    .map(
      (b) => `
    <a href="${ROOT_PATH}${b.link_url.replace(/^\//, "")}" class="promo-banner-card">
      <img src="${ROOT_PATH}assets/images/homepage-banners/processed/${b.image_name}" alt="Promotion" loading="lazy" />
    </a>
  `
    )
    .join("");

  wrap.innerHTML = `<div class="promo-banner-track">${cardsHtml}</div>`;
}

document.addEventListener("DOMContentLoaded", initHomepageBannerCarousel);