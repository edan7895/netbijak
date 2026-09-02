// NetBijak.com - 为每个配套产生独立的静态HTML页面（含完整内容，SEO友好）
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

function buildPlanPageHtml(plan, provider, banners, relatedArticles) {
  const color = provider ? provider.color_hex : "#14b8a6";
  const logoUrl = provider ? provider.logo_url : "";
  const providerName = provider ? provider.name : plan.provider;
  const providerSlug = provider ? provider.slug : "";

  const title = plan.seo_title || `${plan.name} | NetBijak.com`;
  const description = plan.seo_description || plan.tagline || plan.name;
  const pageUrl = `https://netbijak.com/${providerSlug}/${plan.slug}/`;
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

  const featuresList = (plan.features || "").split(",").map((f) => f.trim()).filter((f) => f.length > 0);
  const featuresHtml = featuresList.length > 0
    ? `<div class="detail-section"><h2>Features</h2><ul class="detail-features-list">${featuresList.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul></div>`
    : "";

  const articlesHtml = (relatedArticles || []).length > 0
    ? `<div class="detail-section"><h2>Related Articles</h2><div class="detail-articles-list">${relatedArticles.map((a) => `<a href="/${a.language}/blog/${a.slug}/" class="detail-article-link">${a.cover_image_url ? `<img src="${escapeHtml(a.cover_image_url)}" alt="${escapeHtml(a.title)}" />` : ""}<span>${escapeHtml(a.title)}</span></a>`).join("")}</div></div>`
    : "";

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
  <link rel="canonical" href="${pageUrl}" />
  <link rel="icon" type="image/png" href="/assets/images/favicon.png" />
  <link rel="stylesheet" href="/assets/css/style.css" />
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
    ${featuresHtml}
    ${articlesHtml}
  </main>

  <footer id="site-footer"></footer>

  <script>const ROOT_PATH = "/";</script>
  <script src="/assets/js/tracking.js"></script>
  <script src="/assets/js/translations.js"></script>
  <script src="/assets/js/site.js"></script>
</body>
</html>`;
}

async function generatePlanPages() {
  console.log('Fetching data...');
  const plans = await fetchFromSupabase(
    'plans',
    'select=*,providers(id,name,slug,color_hex,logo_url),plan_banners(*)&is_published=eq.true'
  );
  const articles = await fetchFromSupabase('articles', 'select=*&is_published=eq.true');

  let count = 0;
  for (const plan of plans) {
    if (!isPlanCurrentlyPublished(plan)) continue;
    const provider = plan.providers;
    if (!provider) continue;

    const relatedArticles = articles.filter((a) => a.plan_id === plan.id);

    const dir = path.join(provider.slug, plan.slug);
    fs.mkdirSync(dir, { recursive: true });

    const html = buildPlanPageHtml(plan, provider, plan.plan_banners, relatedArticles);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }

  console.log(`Generated ${count} plan pages.`);
}

generatePlanPages().catch((err) => {
  console.error(err);
  process.exit(1);
});