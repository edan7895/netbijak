// NetBijak.com - 抓取Supabase资料，产生静态JSON（给前台读取用）
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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

async function generateData() {
  if (!fs.existsSync('data')) fs.mkdirSync('data');

  console.log('Fetching providers...');
  const providers = await fetchFromSupabase('providers', 'select=*&order=sort_order.asc');
  fs.writeFileSync('data/providers.json', JSON.stringify(providers, null, 0));
  console.log(`  ${providers.length} providers saved.`);

  console.log('Fetching plans...');
  const plans = await fetchFromSupabase(
    'plans',
    'select=*,providers(id,name,slug,color_hex,logo_url,connection_type,supports_landed,supports_highrise),plan_banners(*)&is_published=eq.true&order=promo_price.asc'
  );
  fs.writeFileSync('data/plans.json', JSON.stringify(plans, null, 0));
  console.log(`  ${plans.length} plans saved.`);

  console.log('Fetching articles...');
  const articles = await fetchFromSupabase(
    'articles',
    'select=*&is_published=eq.true&order=created_at.desc'
  );
  fs.writeFileSync('data/articles.json', JSON.stringify(articles, null, 0));
  console.log(`  ${articles.length} articles saved.`);

  const meta = { generated_at: new Date().toISOString() };
  fs.writeFileSync('data/meta.json', JSON.stringify(meta));

  console.log('Done.');
}

generateData().catch((err) => {
  console.error(err);
  process.exit(1);
});