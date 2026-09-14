// NetBijak.com - 为已有摘要但缺少社群内容的文章，补充生成社群文案+图卡文字
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const LANG_NAMES = { en: 'English', zh: 'Simplified Chinese', ms: 'Bahasa Malaysia' };

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

function parseSocialResponse(rawText) {
  const captionMatch = rawText.match(/SOCIAL_CAPTION:\s*([\s\S]+?)(?=\nCARD_TITLE:|$)/i);
  const cardTitleMatch = rawText.match(/CARD_TITLE:\s*(.+)/i);
  const cardPoint1Match = rawText.match(/CARD_POINT_1:\s*(.+)/i);
  const cardPoint2Match = rawText.match(/CARD_POINT_2:\s*(.+)/i);
  const cardPoint3Match = rawText.match(/CARD_POINT_3:\s*(.+)/i);
  const cardCtaMatch = rawText.match(/CARD_CTA:\s*(.+)/i);

  if (!captionMatch || !cardTitleMatch || !cardPoint1Match || !cardPoint2Match || !cardPoint3Match || !cardCtaMatch) {
    throw new Error('Gemini response missing expected fields');
  }

  return {
    socialCaption: captionMatch[1].trim(),
    socialCardTexts: {
      title: cardTitleMatch[1].trim(),
      points: [cardPoint1Match[1].trim(), cardPoint2Match[1].trim(), cardPoint3Match[1].trim()],
      cta: cardCtaMatch[1].trim(),
    },
  };
}

async function generateSocialContent(title, summary, language) {
  const langName = LANG_NAMES[language] || 'English';

  const prompt = `You are writing social media content for a Malaysian broadband/telecom website called NetBijak.

Article title: ${title}
Article summary: ${summary}

Produce the following in ${langName}, each on its own line in this exact format:

SOCIAL_CAPTION: <a punchy, scroll-stopping social media caption, 2-4 sentences, written to perform well on Facebook/Instagram — use a hook, some personality, and 1-2 relevant emojis. Do not include any links or hashtags.>

CARD_TITLE: <a short, attention-grabbing headline for a social media image card, under 12 words>

CARD_POINT_1: <first key takeaway from the article, under 15 words>

CARD_POINT_2: <second key takeaway, under 15 words>

CARD_POINT_3: <third key takeaway, under 15 words>

CARD_CTA: <a short call-to-action line for the final card, under 10 words>`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callGeminiOnce(prompt);
      return parseSocialResponse(raw);
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
  console.log('Fetching articles with summary but no social content...');
  const articles = await fetchFromSupabase(
    'articles',
    'select=id,title,ai_summary,language,social_caption&is_published=eq.true&ai_summary=not.is.null&social_caption=is.null'
  );

  console.log(`Found ${articles.length} articles needing social content.`);

  let successCount = 0;
  for (const article of articles) {
    try {
      console.log(`  Generating social content for: ${article.title} (${article.language})`);
      const { socialCaption, socialCardTexts } = await generateSocialContent(article.title, article.ai_summary, article.language);
      await updateSupabase('articles', article.id, {
        social_caption: socialCaption,
        social_card_texts: socialCardTexts,
      });
      successCount++;
      await new Promise((resolve) => setTimeout(resolve, 6000));
    } catch (err) {
      console.error(`  Failed for "${article.title}":`, err.message);
    }
  }

  console.log(`Done. Generated social content for ${successCount} articles.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});