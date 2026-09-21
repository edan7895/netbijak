// NetBijak.com - 首页 Promotion Banner 轮播

let bannerCarouselIndex = 0;
let bannerCarouselTimer = null;
let activeBanners = [];

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

  activeBanners = banners.filter((b) => {
    if (b.start_at && b.start_at > now) return false;
    if (b.end_at && b.end_at < now) return false;
    return true;
  });

  if (activeBanners.length === 0) return;

  wrap.classList.remove("hidden");
  renderBannerSlides();

  if (activeBanners.length > 1) {
    bannerCarouselTimer = setInterval(() => {
      bannerCarouselIndex = (bannerCarouselIndex + 1) % activeBanners.length;
      updateBannerPosition();
    }, 5000);
  }
}

function renderBannerSlides() {
  const wrap = document.getElementById("homepage-banner-carousel");

  const slidesHtml = activeBanners
    .map(
      (b) => `
    <a href="${ROOT_PATH}${b.link_url.replace(/^\//, "")}" class="homepage-banner-slide">
      <img src="/assets/images/homepage-banners/processed/${b.image_name}" alt="Promotion" loading="lazy" />
    </a>
  `
    )
    .join("");

  const dotsHtml =
    activeBanners.length > 1
      ? `<div class="homepage-banner-dots">${activeBanners
          .map((_, i) => `<span class="homepage-banner-dot ${i === 0 ? "active" : ""}" data-index="${i}"></span>`)
          .join("")}</div>`
      : "";

  wrap.innerHTML = `
    <div class="homepage-banner-track" id="homepage-banner-track">${slidesHtml}</div>
    ${dotsHtml}
  `;

  wrap.querySelectorAll(".homepage-banner-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      bannerCarouselIndex = parseInt(dot.dataset.index, 10);
      updateBannerPosition();
      if (bannerCarouselTimer) clearInterval(bannerCarouselTimer);
      bannerCarouselTimer = setInterval(() => {
        bannerCarouselIndex = (bannerCarouselIndex + 1) % activeBanners.length;
        updateBannerPosition();
      }, 5000);
    });
  });
}

function updateBannerPosition() {
  const track = document.getElementById("homepage-banner-track");
  if (!track) return;
  track.style.transform = `translateX(-${bannerCarouselIndex * 100}%)`;

  document.querySelectorAll(".homepage-banner-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === bannerCarouselIndex);
  });
}

document.addEventListener("DOMContentLoaded", initHomepageBannerCarousel);