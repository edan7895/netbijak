// NetBijak.com - 为文章生成AI摘要（只在缺少摘要时呼叫Gemini，避免重复消耗额度）
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status} ${await res.text()}`);
}

const LANG_NAMES = { en: 'English', zh: 'Simplified Chinese', ms: 'Bahasa Malaysia' };

async function callGeminiOnce(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
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
  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!summary) throw new Error('Gemini returned no summary text');
  return summary.trim();
}

async function generateSummary(title, content, language) {
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
  const langName = LANG_NAMES[language] || 'English';

  const prompt = `You are writing a concise AI summary for a broadband/telecom article on a Malaysian website called NetBijak.

Article title: ${title}

Article content:
${plainText}

Write a summary in ${langName}, 5-6 sentences long, covering the key points of the article. Write in a clear, neutral, helpful tone. Do not include a heading or title, just the summary text itself. Do not use markdown formatting.`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callGeminiOnce(prompt);
    } catch (err) {
      const isRetryable = err.status === 503 || err.status === 429;
      if (isRetryable && attempt < maxRetries) {
        const waitMs = attempt * 8000;
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
    'select=id,title,content,language,ai_summary&is_published=eq.true&ai_summary=is.null'
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
      const summary = await generateSummary(article.title, article.content, article.language);
      await updateSupabase('articles', article.id, { ai_summary: summary });
      successCount++;
      // 避免连续请求太快触发速率限制，稍微间隔一下
      await new Promise((resolve) => setTimeout(resolve, 4000));
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