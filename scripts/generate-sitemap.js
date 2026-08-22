// NetBijak.com - 自动产生动态Sitemap（配套 + 文章）
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SITE_URL = 'https://netbijak.com';
const LANGS = ['en', 'zh', 'ms'];

async function generateSitemap() {
  console.log('Fetching plans and providers...');

  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('slug, provider_id, providers(slug)')
    .eq('is_published', true);

  if (plansError) {
    console.error('Error fetching plans:', plansError);
    process.exit(1);
  }

  console.log('Fetching articles...');

  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('slug, language')
    .eq('is_published', true);

  if (articlesError) {
    console.error('Error fetching articles:', articlesError);
    process.exit(1);
  }

  let urls = [];

  // 配套详情页（不分语言，因为这些是共用网址）
  (plans || []).forEach((plan) => {
    if (plan.providers && plan.providers.slug && plan.slug) {
      urls.push(
        `  <url><loc>${SITE_URL}/${plan.providers.slug}/plan/?slug=${plan.slug}</loc><priority>0.6</priority></url>`
      );
    }
  });

  // 文章详情页（每篇文章依照它的language栏位，放进对应语言的blog资料夹网址）
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

generateSitemap();