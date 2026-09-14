// NetBijak.com - 为文章生成AI摘要 + 分类判断（只在缺少摘要时呼叫Gemini，避免重复消耗额度）
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
    throw new Error(`Update matched 0 rows for id=${id} (check id type/value)`);
  }
  console.log(`    Confirmed updated row id=${result[0].id}`);
}

const LANG_NAMES = { en: 'English', zh: 'Simplified Chinese', ms: 'Bahasa Malaysia' };

async function callGeminiOnce(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini API error: ${res.status} ${errText}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini returned no summary text');

  const keywordMatch = rawText.match(/IMAGE_KEYWORDS:\s*(.+)/i);
  const imageKeywords = keywordMatch ? keywordMatch[1].trim() : null;

  const categoryMatch = rawText.match(/CATEGORY:\s*(.+)/i);
  let category = categoryMatch ? categoryMatch[1].trim().toLowerCase() : null;
  if (category && !FIXED_CATEGORIES.includes(category)) {
    console.log(`    Warning: Gemini returned unrecognized category "${category}", defaulting to null.`);
    category = null;
  }

  const summary = rawText
    .replace(/IMAGE_KEYWORDS:\s*.+/i, '')
    .replace(/CATEGORY:\s*.+/i, '')
    .trim();

  return { summary, imageKeywords, category };
}

async function generateSummary(title, content, language) {
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
  const langName = LANG_NAMES[language] || 'English';
  const categoryListStr = FIXED_CATEGORIES.join(', ');

  const prompt = `You are writing a concise AI summary for a broadband/telecom article on a Malaysian website called NetBijak.

Article title: ${title}

Article content:
${plainText}

Write a summary in ${langName}, 5-6 sentences long, covering the key points of the article. Write in a clear, neutral, helpful tone. Do not include a heading or title, just the summary text itself. Do not use markdown formatting.

After the summary, on a new line, add exactly this format: IMAGE_KEYWORDS: keyword1, keyword2, keyword3
The 3 keywords must be in English, describing a relevant stock photo concept for this article (e.g. "wifi router", "frustrated customer", "fiber cable"). Keep each keyword short (1-3 words).

After that, on a new line, add exactly this format: CATEGORY: category-code
You MUST choose exactly one category-code from this fixed list (reply with the exact code, lowercase, nothing else):
${categoryListStr}
Choose the single best-fitting category for this article's main topic.`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callGeminiOnce(prompt);
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
  console.log('Fetching articles without AI summary...');
  const articles = await fetchFromSupabase(
    'articles',
    'select=id,title,content,language,ai_summary,category&is_published=eq.true&ai_summary=is.null'
  );

  console.log(`Found ${articles.length} articles needing summaries.`);

  let successCount = 0;
  for (const article of articles) {
    if (!article.content || article.content.trim().length < 100) {
      console.log(`  Skipping "${article.title}" (content too short)`);
      continue;
    }
    try {
      console.log(`  Generating summary for: ${article.title} (${article.language})`);
      const { summary, imageKeywords, category } = await generateSummary(article.title, article.content, article.language);
      const updateData = { ai_summary: summary };
      if (imageKeywords && !article.image_keywords) {
        updateData.image_keywords = imageKeywords;
      }
      if (category && !article.category) {
        updateData.category = category;
      }
      await updateSupabase('articles', article.id, updateData);
      successCount++;
      await new Promise((resolve) => setTimeout(resolve, 6000));
    } catch (err) {
      console.error(`  Failed for "${article.title}":`, err.message);
    }
  }

  console.log(`Done. Generated ${successCount} summaries.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});