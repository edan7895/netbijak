// NetBijak.com - 为每个配套产生独立的静态HTML页面（含完整内容 + Reviews，SEO友好）
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WHATSAPP_NUMBER = "60178835110";

async function fetchFromSupabase(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch failed for ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

function isPlanCurrentlyPublished(plan) {
  const now = new Date();
  if (plan.publish_at && new Date(plan.publish_at) > now) return false;
  if (plan.unpublish_at && new Date(plan.unpublish_at) < now) return false;
  return true;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildProductSchema(plan, provider, pageUrl, approvedReviews) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": plan.name,
    "description": plan.seo_description || plan.tagline || plan.name,
    "brand": {
      "@type": "Brand",
      "name": provider ? provider.name : plan.provider,
    },
    "offers": {
      "@type": "Offer",
      "url": pageUrl,
      "priceCurrency": "MYR",
      "price": plan.promo_price,
      "availability": "https://schema.org/InStock",
    },
  };

  if (approvedReviews && approvedReviews.length > 0) {
    const avgRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length;
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": avgRating.toFixed(1),
      "reviewCount": approvedReviews.length,
    };
    schema.review = approvedReviews.slice(0, 10).map((r) => ({
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating,
        "bestRating": "5",
      },
      "author": {
        "@type": "Person",
        "name": r.reviewer_name,
      },
      "reviewBody": r.comment_text || "",
    }));
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function buildReviewsHtml(plan, providerName, approvedReviews) {
  const reviewTitle = `Reviews of ${plan.name}`;

  const summaryHtml = approvedReviews.length > 0
    ? (() => {
        const avgRating = (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1);
        const fullStars = Math.round(parseFloat(avgRating));
        const starsDisplay = "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
        return `
        <div class="reviews-summary-stars">${starsDisplay}</div>
        <div class="reviews-summary-number">${avgRating} <span>out of 5</span></div>
        <div class="reviews-summary-count">${approvedReviews.length} reviews</div>`;
      })()
    : `<p class="reviews-empty-text">No reviews yet. Be the first to share your experience!</p>`;

  const listHtml = approvedReviews
    .map((r) => {
      const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      const dateStr = new Date(r.created_at).toLocaleDateString();
      const tagsHtml = r.tags && r.tags.length > 0
        ? `<div class="review-item-tags">${r.tags.map((tag) => `<span class="review-item-tag">${escapeHtml(tag)}</span>`).join("")}</div>`
        : "";
      return `
      <div class="review-item">
        <div class="review-item-header">
          <span class="review-item-stars">${stars}</span>
          <span class="review-item-name">${escapeHtml(r.reviewer_name)}</span>
          <span class="review-item-date">${dateStr}</span>
        </div>
        ${r.comment_text ? `<p class="review-item-comment">${escapeHtml(r.comment_text)}</p>` : ""}
        ${tagsHtml}
      </div>`;
    })
    .join("");

  return `
    <div class="detail-section" id="reviews-section">
      <h2 class="reviews-section-title">${escapeHtml(reviewTitle)}</h2>
      <div class="reviews-summary-box" id="reviews-summary">${summaryHtml}</div>
      <div class="reviews-list" id="reviews-list">${listHtml}</div>

      <div class="review-form-box" id="review-form-wrap">
        <h3>${escapeHtml("Write a Review")}</h3>
        <div class="review-star-picker">
          <button type="button" class="review-star-btn" data-star="1">☆</button>
          <button type="button" class="review-star-btn" data-star="2">☆</button>
          <button type="button" class="review-star-btn" data-star="3">☆</button>
          <button type="button" class="review-star-btn" data-star="4">☆</button>
          <button type="button" class="review-star-btn" data-star="5">☆</button>
        </div>
        <div id="review-rating-label">0 / 5</div>

        <form id="review-submit-form">
          <div id="review-form-fields" class="hidden">
            <div id="review-tags-wrap" class="review-tags-wrap"></div>

            <div class="review-name-row">
              <input type="text" id="review-reviewer-name" placeholder="Enter your name" required />
              <button type="button" id="btn-generate-name" class="btn-generate-name">Generate Name</button>
            </div>

            <textarea id="review-comment-text" class="review-comment-textarea" placeholder="Share your experience with this plan (optional)..."></textarea>

            <div class="cf-turnstile" data-sitekey="0x4AAAAAAEuw3_WcwGmVO5A2" style="margin-bottom:1rem"></div>

            <button type="submit" id="btn-submit-review" class="wa-btn wa-btn-large" style="display:inline-flex">Submit Review</button>
          </div>
        </form>
      </div>

      <div id="review-thank-you" class="review-thank-you-box hidden">
        <strong>Thank you for your review!</strong>
        <p>Your review has been submitted and will appear once approved.</p>
      </div>
    </div>`;
}

function buildPlanPageHtml(plan, provider, banners, relatedArticles, canonicalOverrideUrl, approvedReviews) {
  const color = provider ? provider.color_hex : "#14b8a6";
  const logoUrl = provider ? provider.logo_url : "";
  const providerName = provider ? provider.name : plan.provider;
  const providerSlug = provider ? provider.slug : "";

  const title = plan.seo_title || `${plan.name} | NetBijak.com`;
  const description = plan.seo_description || plan.tagline || plan.name;
  const pageUrl = `https://netbijak.com/${providerSlug}/${plan.slug}/`;
  const canonicalUrl = canonicalOverrideUrl || pageUrl;
  const ogImage = "https://netbijak.com/assets/images/logo.png";

  const waMsg = plan.whatsapp_ref || `Hi NetBijak, I'm interested in ${plan.name}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;

  const activeBanner = (banners || []).find((b) => {
    if (!b.is_active) return false;
    const now = new Date();
    if (b.start_at && new Date(b.start_at) > now) return false;
    if (b.end_at && new Date(b.end_at) < now) return false;
    return true;
  });

  const bannerHtml = activeBanner
    ? `<div class="detail-banner">${activeBanner.link_url ? `<a href="${escapeHtml(activeBanner.link_url)}" target="_blank">` : ""}<img src="${escapeHtml(activeBanner.image_url)}" alt="Promotion" />${activeBanner.link_url ? `</a>` : ""}</div>`
    : "";

  const promoHtml = plan.promo_enabled
    ? `<div class="plan-promo-box">
        ${plan.promo_image_name ? `<img src="/assets/images/promos/${escapeHtml(plan.promo_image_name)}" alt="Promotion" class="plan-promo-image" />` : ""}
        <div class="plan-promo-text">
          <h3>🎁 Promotion</h3>
          <p>${escapeHtml(plan.promo_text || "")}</p>
        </div>
      </div>`
    : "";

  let overviewHtml = "";
  if (plan.deep_analysis && plan.deep_analysis.trim().length > 0) {
    overviewHtml = `<div class="plan-deep-analysis">${plan.deep_analysis}</div>`;
  } else if (plan.ai_overview) {
    overviewHtml = `<div class="plan-overview-box">
        <div class="plan-overview-badge">✨ NetBijak's Take</div>
        <p>${escapeHtml(plan.ai_overview)}</p>
      </div>`;
  }

  const featuresList = (plan.features || "").split(",").map((f) => f.trim()).filter((f) => f.length > 0);
  const featuresHtml = featuresList.length > 0
    ? `<div class="detail-section"><h2>Features</h2><ul class="detail-features-list">${featuresList.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul></div>`
    : "";

  const articlesHtml = (relatedArticles || []).length > 0
    ? `<div class="detail-section"><h2>Related Articles</h2><div class="detail-articles-list">${relatedArticles.map((a) => `<a href="/${a.language}/blog/${a.slug}/" class="detail-article-link">${a.cover_image_url ? `<img src="${escapeHtml(a.cover_image_url)}" alt="${escapeHtml(a.title)}" />` : ""}<span>${escapeHtml(a.title)}</span></a>`).join("")}</div></div>`
    : "";

  const reviewsHtml = buildReviewsHtml(plan, providerName, approvedReviews || []);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="geo.region" content="MY" />
  <meta name="geo.placename" content="Malaysia" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="${canonicalUrl}" />
  <link rel="icon" type="image/png" href="/assets/images/favicon.png" />
  <link rel="stylesheet" href="/assets/css/style.css" />
  ${buildProductSchema(plan, provider, pageUrl, approvedReviews)}
</head>
<body>
  <div id="site-header"></div>

  <main class="main">
    <div class="detail-breadcrumb">
      <a href="/${providerSlug}/">${escapeHtml(providerName)}</a> / ${escapeHtml(plan.name)}
    </div>
    ${bannerHtml}
    <div class="detail-header" style="border-color:${color}">
      <div style="height:6px;background:${color}"></div>
      <div class="detail-header-body">
        <div class="detail-provider-header">
          ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(providerName)}" class="detail-provider-logo" />` : ""}
          <span class="detail-provider-tag" style="color:${color}">${escapeHtml(providerName)}</span>
        </div>
        <h1 class="detail-plan-name">${escapeHtml(plan.name)}</h1>
        ${plan.tagline ? `<p class="detail-tagline">${escapeHtml(plan.tagline)}</p>` : ""}
        <div class="detail-price" style="color:${color}">
          RM${plan.promo_price}<small>/month</small>
          ${plan.original_price ? `<span class="detail-original-price">RM${plan.original_price}</span>` : ""}
        </div>
        <div class="detail-speed-row">
          <div class="detail-speed-box"><span class="detail-speed-label">Download</span><span class="detail-speed-value">${escapeHtml(plan.download_speed)}</span></div>
          <div class="detail-speed-box"><span class="detail-speed-label">Upload</span><span class="detail-speed-value">${escapeHtml(plan.upload_speed)}</span></div>
          <div class="detail-speed-box"><span class="detail-speed-label">Contract</span><span class="detail-speed-value">${plan.contract_months} months</span></div>
        </div>
        <a href="${waLink}" target="_blank" class="wa-btn wa-btn-large">Apply via NetBijak</a>
      </div>
    </div>
    ${promoHtml}
    ${overviewHtml}
    ${featuresHtml}
    ${articlesHtml}
    ${reviewsHtml}
  </main>

  <footer id="site-footer"></footer>

  <script>const ROOT_PATH = "/"; const CURRENT_PLAN_ID = ${plan.id};</script>
  <script src="/assets/js/tracking.js"></script>
  <script src="/assets/js/translations.js"></script>
  <script src="/assets/js/site.js"></script>
  <script src="/assets/js/supabase-client.js"></script>
  <script src="/assets/js/plan-reviews.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      if (typeof initPlanReviews === "function") {
        initPlanReviews(CURRENT_PLAN_ID);
      }
    });
  </script>
</body>
</html>`;
}

function normalizeNameForMatch(name) {
  return (name || "").toLowerCase().replace(/[()]/g, "").replace(/\s+/g, " ").trim();
}

function findCanonicalTarget(plan, allPlans) {
  const appType = (plan.new_and_transfer || "").toLowerCase();
  const isUpgrade = appType.includes("upgrade");
  if (!isUpgrade) return null;

  const normalizedName = normalizeNameForMatch(plan.name);

  const match = allPlans.find((p) => {
    if (p.id === plan.id) return false;
    if (p.provider_id !== plan.provider_id) return false;
    const otherAppType = (p.new_and_transfer || "").toLowerCase();
    if (!otherAppType.includes("new")) return false;
    return normalizeNameForMatch(p.name) === normalizedName;
  });

  if (!match || !match.providers) return null;
  return `https://netbijak.com/${match.providers.slug}/${match.slug}/`;
}

async function generatePlanPages() {
  console.log('Fetching data...');
  const plans = await fetchFromSupabase(
    'plans',
    'select=*,providers(id,name,slug,color_hex,logo_url),plan_banners(*)&is_published=eq.true'
  );
  const articles = await fetchFromSupabase('articles', 'select=*&is_published=eq.true');
  const allReviews = await fetchFromSupabase(
    'plan_reviews',
    'select=id,plan_id,rating,reviewer_name,comment_text,tags,created_at&is_approved=eq.true'
  );

  let count = 0;
  for (const plan of plans) {
    if (!isPlanCurrentlyPublished(plan)) continue;
    const provider = plan.providers;
    if (!provider) continue;

    const relatedArticles = articles.filter((a) => a.plan_id === plan.id);
    const canonicalOverrideUrl = findCanonicalTarget(plan, plans);
    const approvedReviews = allReviews.filter((r) => r.plan_id === plan.id);

    const dir = path.join(provider.slug, plan.slug);
    fs.mkdirSync(dir, { recursive: true });

    const html = buildPlanPageHtml(plan, provider, plan.plan_banners, relatedArticles, canonicalOverrideUrl, approvedReviews);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }

  console.log(`Generated ${count} plan pages.`);
}

generatePlanPages().catch((err) => {
  console.error(err);
  process.exit(1);
});