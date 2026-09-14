// NetBijak.com - 一次性分析所有文章，生成10个分类框架建议（只需执行一次）
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchFromSupabase(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function callGeminiOnce(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${errText}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return text.trim();
}

async function run() {
  console.log('Fetching all published English articles (using EN as representative sample)...');
  // 只用英文版当样本判断分类框架，因为三语言主题是一致的，不需要三次都做
  const articles = await fetchFromSupabase(
    'articles',
    'select=title,ai_summary&is_published=eq.true&language=eq.en'
  );

  console.log(`Found ${articles.length} articles to analyze.`);

  const articleList = articles
    .map((a, i) => `${i + 1}. ${a.title}${a.ai_summary ? ' — ' + a.ai_summary.slice(0, 150) : ''}`)
    .join('\n');

  const prompt = `You are organizing content for a Malaysian broadband/telecom comparison website called NetBijak.

Below is a list of all published article titles (and short summaries where available) on the site:

${articleList}

Based on these articles, suggest exactly 10 category names that best cover the range of topics above. Categories should be broad enough that most articles fit into one of them, but specific enough to be meaningful (e.g. "Coverage & Installation", "Speed & Performance", "Contracts & Billing", "Troubleshooting", "Provider News", "Buying Guides", etc. — these are just examples, generate your own based on the actual content above).

Reply with EXACTLY this format, one category per line, nothing else:
1. Category Name
2. Category Name
...
10. Category Name`;

  console.log('Asking Gemini to suggest 10 categories...');
  const result = await callGeminiOnce(prompt);

  console.log('\n===== SUGGESTED CATEGORY FRAMEWORK =====\n');
  console.log(result);
  console.log('\n=========================================\n');
  console.log('Review these categories. If you approve, save them into your category list for the next step.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});