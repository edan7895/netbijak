// NetBijak.com - 为已有摘要但缺少分类的文章，补充生成分类（不重新生成摘要）
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const FIXED_CATEGORIES = [
  "buying-guides",
  "coverage-installation",
  "troubleshooting",
  "speed-performance",
  "contracts-rights",
  "home-networking",
  "gaming-streaming",
  "isp-news",
  "government-regulation",
  "remote-work-business",
];

async function fetchFromSupabase(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateSupabase(table, id, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status} ${await res.text()}`);
  const result = await res.json();
  if (!result || result.length === 0) {
    throw new Error(`Update matched 0 rows for id=${id}`);
  }
  console.log(`    Confirmed updated row id=${result[0].id}`);
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
    const err = new Error(`Gemini API error: ${res.status} ${errText}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return text.trim();
}

async function classifyArticle(title, summary) {
  const categoryListStr = FIXED_CATEGORIES.join(', ');

  const prompt = `You are categorizing an article for a Malaysian broadband/telecom website called NetBijak.

Article title: ${title}
Article summary: ${summary}

You MUST choose exactly one category-code from this fixed list that best fits this article's main topic:
${categoryListStr}

Reply with EXACTLY the category-code, lowercase, nothing else. No explanation, no punctuation.`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callGeminiOnce(prompt);
      const category = raw.trim().toLowerCase();
      if (!FIXED_CATEGORIES.includes(category)) {
        throw new Error(`Gemini returned unrecognized category: "${category}"`);
      }
      return category;
    } catch (err) {
      const isRetryable = err.status === 503 || err.status === 429;
      if (isRetryable && attempt < maxRetries) {
        const waitMs = err.status === 429 ? attempt * 20000 : attempt * 8000;
        console.log(`    Attempt ${attempt} failed (${err.status}), retrying in ${waitMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw err;
    }
  }
}

async function run() {
  console.log('Fetching articles with summary but no category...');
  const articles = await fetchFromSupabase(
    'articles',
    'select=id,title,ai_summary,category&is_published=eq.true&ai_summary=not.is.null&category=is.null'
  );

  console.log(`Found ${articles.length} articles needing categories.`);

  let successCount = 0;
  for (const article of articles) {
    try {
      console.log(`  Classifying: ${article.title}`);
      const category = await classifyArticle(article.title, article.ai_summary);
      await updateSupabase('articles', article.id, { category });
      successCount++;
      await new Promise((resolve) => setTimeout(resolve, 6000));
    } catch (err) {
      console.error(`  Failed for "${article.title}":`, err.message);
    }
  }

  console.log(`Done. Classified ${successCount} articles.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});