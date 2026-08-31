// NetBijak.com - 自动产生动态Sitemap（配套 + 文章，使用干净网址格式）
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const SITE_URL = 'https://netbijak.com';
const LANGS = ['en', 'zh', 'ms'];

async function fetchFromSupabase(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch failed for ${table}: ${res.status} ${text}`);
  }
  return res.json();
}

function isPlanCurrentlyPublished(plan) {
  const now = new Date();
  if (plan.publish_at && new Date(plan.publish_at) > now) return false;
  if (plan.unpublish_at && new Date(plan.unpublish_at) < now) return false;
  return true;
}

function isArticleCurrentlyPublished(article) {
  const now = new Date();
  if (article.publish_at && new Date(article.publish_at) > now) return false;
  return true;
}

function toMalaysiaDateString(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  // 用马来西亚时区（en-CA 格式恰好输出 YYYY-MM-DD）
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

async function generateSitemap() {
    console.log('Fetching plans...');
  const plans = await fetchFromSupabase(
    'plans',
    'select=slug,publish_at,unpublish_at,created_at,providers(slug)&is_published=eq.true'
  );

  console.log('Fetching articles...');
  const articles = await fetchFromSupabase(
    'articles',
    'select=slug,language,publish_at,created_at&is_published=eq.true'
  );

  let urls = [];

  // 配套详情页（干净网址：/provider-slug/plan-slug/）
  (plans || []).forEach((plan) => {
    if (!isPlanCurrentlyPublished(plan)) return;
    if (plan.providers && plan.providers.slug && plan.slug) {
     const lastmod = toMalaysiaDateString(plan.publish_at || plan.created_at);
      urls.push(
        `  <url><loc>${SITE_URL}/${plan.providers.slug}/${plan.slug}/</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>0.6</priority></url>`
      );
    }
  });

  // 文章详情页（干净网址：/lang/blog/article-slug/）
  (articles || []).forEach((article) => {
    if (!isArticleCurrentlyPublished(article)) return;
    if (article.slug && article.language && LANGS.includes(article.language)) {
     const lastmod = toMalaysiaDateString(article.publish_at || article.created_at);
      urls.push(
        `  <url><loc>${SITE_URL}/${article.language}/blog/${article.slug}/</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>0.6</priority></url>`
      );
    }
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  fs.writeFileSync('sitemap-dynamic.xml', xml);
  console.log(`Sitemap generated with ${urls.length} URLs.`);
}

generateSitemap().catch((err) => {
  console.error(err);
  process.exit(1);
});