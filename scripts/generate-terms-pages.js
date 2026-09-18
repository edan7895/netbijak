// NetBijak.com - 为每个T&C模板产生独立的静态HTML页面（A4文件风格呈现）
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function fetchFromSupabase(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch failed for ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildTermsPageHtml(terms) {
  const title = `${terms.name} - Terms & Conditions | NetBijak.com`;
  const pageUrl = `https://netbijak.com/terms/${terms.slug}/`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="icon" type="image/png" href="/assets/images/favicon.png" />
  <link rel="stylesheet" href="/assets/css/style.css" />
  <style>
    body { background: #e2e8f0; }
    .terms-page-wrap { max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
    .terms-back-link {
      display: inline-block; margin-bottom: 1.5rem; color: #475569;
      text-decoration: none; font-size: 0.9rem; font-weight: 600;
    }
    .terms-document {
      background: #ffffff;
      max-width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 80px 70px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      border-radius: 2px;
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #1e293b;
      line-height: 1.8;
    }
    .terms-document h1 {
      font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;
      font-family: Arial, sans-serif; color: #0f172a;
    }
    .terms-document .terms-subtitle {
      font-size: 0.85rem; color: #94a3b8; margin-bottom: 2.5rem;
      font-family: Arial, sans-serif; padding-bottom: 1.5rem; border-bottom: 2px solid #f1f5f9;
    }
    .terms-document h2 {
      font-size: 1.15rem; font-weight: 700; margin: 1.75rem 0 0.75rem; color: #0f172a;
      font-family: Arial, sans-serif;
    }
    .terms-document h3 {
      font-size: 1rem; font-weight: 700; margin: 1.25rem 0 0.5rem; color: #0f172a;
      font-family: Arial, sans-serif;
    }
    .terms-document p { margin-bottom: 1rem; font-size: 0.95rem; }
    .terms-document ul, .terms-document ol { margin: 0 0 1rem 1.5rem; }
    .terms-document li { margin-bottom: 0.5rem; font-size: 0.95rem; }
    .terms-document a { color: #0ea5e9; }

    @media (max-width: 850px) {
      .terms-document { padding: 40px 24px; min-height: auto; }
    }
    @media print {
      body { background: #fff; }
      .terms-back-link { display: none; }
      .terms-document { box-shadow: none; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="terms-page-wrap">
    <a href="javascript:history.back()" class="terms-back-link">← Back</a>
    <div class="terms-document">
      <h1>${escapeHtml(terms.name)}</h1>
      <div class="terms-subtitle">Terms & Conditions · NetBijak.com</div>
      ${terms.content || ""}
    </div>
  </div>
</body>
</html>`;
}

async function generateTermsPages() {
  console.log('Fetching T&C templates...');
  const termsList = await fetchFromSupabase('promo_terms', 'select=*');

  let count = 0;
  for (const terms of termsList) {
    if (!terms.slug) continue;

    const dir = path.join('terms', terms.slug);
    fs.mkdirSync(dir, { recursive: true });

    const html = buildTermsPageHtml(terms);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }

  console.log(`Generated ${count} T&C pages.`);
}

generateTermsPages().catch((err) => {
  console.error(err);
  process.exit(1);
});