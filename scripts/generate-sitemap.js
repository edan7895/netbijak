// NetBijak.com - 自动产生动态Sitemap（配套 + 文章）
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

async function generateSitemap() {
  console.log('Fetching plans...');
  const plans = await fetchFromSupabase(
    'plans',
    'select=slug,providers(slug)&is_published=eq.true'
  );

  console.log('Fetching articles...');
  const articles = await fetchFromSupabase(
    'articles',
    'select=slug,language&is_published=eq.true'
  );

  let urls = [];

  (plans || []).forEach((plan) => {
    if (plan.providers && plan.providers.slug && plan.slug) {
      urls.push(
        `  <url><loc>${SITE_URL}/${plan.providers.slug}/plan/?slug=${plan.slug}</loc><priority>0.6</priority></url>`
      );
    }
  });

  (articles || []).forEach((article) => {
    if (article.slug && article.language && LANGS.includes(article.language)) {
      urls.push(
        `  <url><loc>${SITE_URL}/${article.language}/blog/post/?slug=${article.slug}</loc><priority>0.6</priority></url>`
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