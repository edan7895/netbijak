// NetBijak.com - 把首页/ISP页/Compare/FindPlan/BroadbandHome-Business的内容预渲染进HTML
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WHATSAPP_NUMBER = "60178835110";
const LANGS = ["en", "zh", "ms"];

async function fetchFromSupabase(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!res.ok) throw new Error(`Fetch failed for ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isPlanPub(p) {
  const now = new Date();
  if (p.publish_at && new Date(p.publish_at) > now) return false;
  if (p.unpublish_at && new Date(p.unpublish_at) < now) return false;
  return true;
}
function isArticlePub(a) {
  const now = new Date();
  if (a.publish_at && new Date(a.publish_at) > now) return false;
  return true;
}
function matchesAppType(t, cat) {
  const s = (t || "").toLowerCase();
  const n = s.includes("new"), tr = s.includes("transfer"), u = s.includes("upgrade");
  if (cat === "new") return n;
  if (cat === "transfer") return tr;
  if (cat === "upgrade") return u;
  return !n && !tr && !u;
}

function inject(html, marker, content) {
  const re = new RegExp(`<!--SSG:${marker}-->[\\s\\S]*?<!--\\/SSG:${marker}-->`);
  return html.replace(re, `<!--SSG:${marker}-->${content}<!--/SSG:${marker}-->`);
}

function injectItemListSchema(html, providers, lang) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": providers.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": p.name,
      "url": `https://netbijak.com/${p.slug}/`,
    })),
  };
  const script = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  return html.replace("</head>", `  ${script}\n</head>`);
}

function writeIfExists(filePath, html) {
  if (!fs.existsSync(filePath)) { console.log(`  Skip (not found): ${filePath}`); return; }
  fs.writeFileSync(filePath, html);
  console.log(`  Updated: ${filePath}`);
}

// ===== 各种小组件HTML =====

function providerCardHtml(p, langPrefix) {
  const logo = p.logo_url ? `<img src="${esc(p.logo_url)}" alt="${esc(p.name)}" class="provider-logo-img" />` : "";
  return `<a href="${langPrefix}${p.slug}/" class="provider-browse-card" style="border-color:${p.color_hex}">
    <span class="provider-browse-info">${logo}<span class="provider-browse-name" style="color:${p.color_hex}">${esc(p.name)}</span></span>
    <span class="provider-browse-arrow">→</span></a>`;
}

const T = {
  en: { new: "New Application", transfer: "Transfer", upgrade: "Upgrade", existing: "Existing Customer / Special Offer", perMonth: "/month", contract: "Contract", months: "months", noResults: "No plans match your criteria." },
  zh: { new: "新申请", transfer: "转台", upgrade: "升级", existing: "现有客户 / 特别优惠", perMonth: "/月", contract: "合约", months: "个月", noResults: "没有符合条件的配套。" },
  ms: { new: "Permohonan Baharu", transfer: "Pindahan", upgrade: "Naik Taraf", existing: "Pelanggan Sedia Ada / Tawaran Istimewa", perMonth: "/bulan", contract: "Kontrak", months: "bulan", noResults: "Tiada pelan sepadan." },
};

function planMiniCardHtml(plan, color) {
  const banner = (plan.plan_banners || []).find((b) => {
    if (!b.is_active) return false;
    const now = new Date();
    if (b.start_at && new Date(b.start_at) > now) return false;
    if (b.end_at && new Date(b.end_at) < now) return false;
    return true;
  });
  const bannerHtml = banner ? `<div class="plan-card-banner"><img src="${esc(banner.image_url)}" alt="Promo" /></div>` : "";
  return `<a href="${plan.slug}/" class="plan-card-link"><div class="plan-mini-card" style="border-color:${color}">${bannerHtml}
    <div class="plan-mini-body">
      <div class="plan-mini-name">${esc(plan.name)}</div>
      ${plan.tagline ? `<div class="plan-mini-tagline">${esc(plan.tagline)}</div>` : ""}
      <div class="plan-mini-price" style="color:${color}">RM${plan.promo_price}<small>${T.en.perMonth}</small></div>
      <div class="plan-mini-speed"><span>⬇ ${esc(plan.download_speed)}</span><span>⬆ ${esc(plan.upload_speed)}</span></div>
    </div></div></a>`;
}

function resultCardHtml(plan, langPrefix, lang) {
  const provider = plan.providers;
  const color = provider ? provider.color_hex : "#14b8a6";
  const logo = provider && provider.logo_url ? `<img src="${esc(provider.logo_url)}" alt="${esc(provider.name)}" class="provider-logo-img" />` : "";
  const waMsg = plan.whatsapp_ref || `Hi NetBijak, I'm interested in ${plan.name}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  const detailLink = `${langPrefix}${provider ? provider.slug : ""}/${plan.slug}/`;
  return `<div class="result-card" style="border-color:${color}"><div style="height:5px;background:${color}"></div>
    <div class="result-card-body">
      <div class="result-card-header">${logo}<span class="result-provider-name" style="color:${color}">${esc(provider ? provider.name : plan.provider)}</span></div>
      <div class="result-plan-name">${esc(plan.name)}</div>
      ${plan.tagline ? `<div class="result-tagline">${esc(plan.tagline)}</div>` : ""}
      <div class="result-price" style="color:${color}">RM${plan.promo_price}<small>${T[lang].perMonth}</small></div>
      <div class="result-speed-row"><span>⬇ ${esc(plan.download_speed)}</span><span>⬆ ${esc(plan.upload_speed)}</span></div>
      <div class="result-contract">${T[lang].contract}: ${plan.contract_months} ${T[lang].months}</div>
    </div></div>`;
}

function faqListHtml(items) {
  return items.map((it, i) => `<div class="faq-item">
    <button type="button" class="faq-question" data-index="${i}"><span>${it.q}</span><span class="faq-toggle-icon">+</span></button>
    <div class="faq-answer">${it.a}</div></div>`).join("");
}

function articleFullHtml(article) {
  if (!article) return "";
  return `<article class="bh-article-full"><h2 class="bh-article-full-title">${esc(article.title)}</h2><div class="bh-article-full-content">${article.content || ""}</div></article>`;
}

// ===== 主流程 =====

async function run() {
  console.log('Fetching data...');
  const providers = await fetchFromSupabase('providers', 'select=*&order=sort_order.asc');
  const plansRaw = await fetchFromSupabase('plans', 'select=*,providers(id,name,slug,color_hex,logo_url),plan_banners(*)&is_published=eq.true');
  const plans = plansRaw.filter(isPlanPub);
  const articlesRaw = await fetchFromSupabase('articles', 'select=*&is_published=eq.true');
  const articles = articlesRaw.filter(isArticlePub);

  const activeProviders = providers.filter((p) => p.is_active);
  const homeProviders = activeProviders.filter((p) => !p.slug.includes("-business"));
  const bizProviders = activeProviders.filter((p) => p.slug.includes("-business"));

  // ===== 首页 =====
  for (const lang of LANGS) {
    const file = `${lang}/index.html`;
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, 'utf-8');

    const providersHtml = homeProviders.map((p) => providerCardHtml(p, "../")).join("");
    html = inject(html, "providers", providersHtml);

    const latestArticles = articles.filter((a) => a.language === lang).sort((a, b) => new Date(b.publish_at || b.created_at) - new Date(a.publish_at || a.created_at)).slice(0, 8);
    const articlesHtml = latestArticles.map((a) => {
      const excerpt = (a.content || "").replace(/<[^>]*>/g, "").slice(0, 80);
      const typeLabel = a.article_type === "news" ? "News" : "Article";
      const img = a.cover_image_url ? `<img src="${esc(a.cover_image_url)}" alt="${esc(a.title)}" />` : `<div class="latest-article-placeholder">📰</div>`;
      return `<a href="blog/${a.slug}/" class="latest-article-card"><div class="latest-article-img-wrap">${img}<span class="latest-article-badge">${typeLabel}</span></div>
                <div class="latest-article-body"><div class="latest-article-date">${new Date(a.publish_at || a.created_at).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</div>
                <div class="latest-article-title">${esc(a.title)}</div><p class="latest-article-excerpt">${esc(excerpt)}...</p></div></a>`;
    }).join("");
    html = inject(html, "articles", articlesHtml);

    writeIfExists(file, html);
  }

  // ===== ISP总览页（默认New tab）=====
  for (const provider of activeProviders) {
    const file = `${provider.slug}/index.html`;
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, 'utf-8');

    const providerPlans = plans.filter((p) => p.provider_id === provider.id).sort((a, b) => a.promo_price - b.promo_price);
    const categories = ["new", "transfer", "upgrade", "existing"].filter((cat) => providerPlans.some((p) => matchesAppType(p.new_and_transfer, cat)));
    const defaultCat = categories[0] || "new";

    const tabsHtml = categories.map((cat) => `<button class="tab-btn ${cat === defaultCat ? "active" : ""}" data-tab="${cat}">${T.en[cat]}</button>`).join("");
    html = inject(html, "tabs", tabsHtml);

    const nameHtml = `${provider.logo_url ? `<img src="${esc(provider.logo_url)}" alt="${esc(provider.name)}" class="provider-hero-logo" />` : ""}<span style="color:${provider.color_hex}">${esc(provider.name)}</span>`;
    html = inject(html, "pname", nameHtml);

    const defaultPlans = providerPlans.filter((p) => matchesAppType(p.new_and_transfer, defaultCat));
    const plansHtml = defaultPlans.length > 0
      ? defaultPlans.map((p) => planMiniCardHtml(p, provider.color_hex)).join("")
      : `<p style="color:#94a3b8;padding:2rem;text-align:center">${T.en.noResults}</p>`;
    html = inject(html, "plans", plansHtml);

    writeIfExists(file, html);
  }

  // ===== Broadband Home / Business =====
  for (const lang of LANGS) {
    const homeFile = `${lang}/broadband-home/index.html`;
    if (fs.existsSync(homeFile)) {
      let html = fs.readFileSync(homeFile, 'utf-8');
      html = inject(html, "btitle", "Home Broadband Providers");
      html = inject(html, "providers", homeProviders.map((p) => providerCardHtml(p, "../../")).join(""));
      const article = articles.find((a) => a.slug === `home-fibre-broadband-buying-guide-${lang}`);
      html = inject(html, "content", articleFullHtml(article));
      html = injectItemListSchema(html, homeProviders, lang);
      writeIfExists(homeFile, html);
    }

    const bizFile = `${lang}/broadband-business/index.html`;
    if (fs.existsSync(bizFile)) {
      let html = fs.readFileSync(bizFile, 'utf-8');
      html = inject(html, "btitle", "Business Broadband Providers");
      html = inject(html, "providers", bizProviders.map((p) => providerCardHtml(p, "../../")).join(""));
      const article = articles.find((a) => a.slug === `business-broadband-buying-guide-${lang}`);
      html = inject(html, "content", articleFullHtml(article));
      html = injectItemListSchema(html, bizProviders, lang);
      writeIfExists(bizFile, html);
    }
  }

  // ===== Find My Plan / Compare（只放文章，FAQ交给现有JS处理，因为逻辑复杂）=====
  for (const lang of LANGS) {
    const fypFile = `${lang}/find-your-plan/index.html`;
    if (fs.existsSync(fypFile)) {
      let html = fs.readFileSync(fypFile, 'utf-8');
      const article = articles.find((a) => a.slug === `find-my-plan-buying-guide-${lang}`);
      html = inject(html, "content", articleFullHtml(article));
      writeIfExists(fypFile, html);
    }

    const cpFile = `${lang}/compare/index.html`;
    if (fs.existsSync(cpFile)) {
      let html = fs.readFileSync(cpFile, 'utf-8');
      const article = articles.find((a) => a.slug === `compare-plans-buying-guide-${lang}`);
      html = inject(html, "content", articleFullHtml(article));
      writeIfExists(cpFile, html);
    }

    const coverageFile = `${lang}/coverage/index.html`;
    if (fs.existsSync(coverageFile)) {
      let html = fs.readFileSync(coverageFile, 'utf-8');
      const article = articles.find((a) => a.slug === `check-fibre-coverage-buying-guide-${lang}`);
      html = inject(html, "content", articleFullHtml(article));
      writeIfExists(coverageFile, html);
    }
  }

  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});