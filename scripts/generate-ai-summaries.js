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

  const captionMatch = rawText.match(/SOCIAL_CAPTION:\s*([\s\S]+?)(?=\nCARD_TITLE:|$)/i);
  const socialCaption = captionMatch ? captionMatch[1].trim() : null;

  const cardTitleMatch = rawText.match(/CARD_TITLE:\s*(.+)/i);
  const cardPoint1Match = rawText.match(/CARD_POINT_1:\s*(.+)/i);
  const cardPoint2Match = rawText.match(/CARD_POINT_2:\s*(.+)/i);
  const cardPoint3Match = rawText.match(/CARD_POINT_3:\s*(.+)/i);
  const cardCtaMatch = rawText.match(/CARD_CTA:\s*(.+)/i);

  let socialCardTexts = null;
  if (cardTitleMatch && cardPoint1Match && cardPoint2Match && cardPoint3Match && cardCtaMatch) {
    socialCardTexts = {
      title: cardTitleMatch[1].trim(),
      points: [cardPoint1Match[1].trim(), cardPoint2Match[1].trim(), cardPoint3Match[1].trim()],
      cta: cardCtaMatch[1].trim(),
    };
  }

  const summary = rawText
    .replace(/IMAGE_KEYWORDS:\s*.+/i, '')
    .replace(/CATEGORY:\s*.+/i, '')
    .replace(/SOCIAL_CAPTION:\s*[\s\S]+?(?=\nCARD_TITLE:|$)/i, '')
    .replace(/CARD_TITLE:\s*.+/i, '')
    .replace(/CARD_POINT_1:\s*.+/i, '')
    .replace(/CARD_POINT_2:\s*.+/i, '')
    .replace(/CARD_POINT_3:\s*.+/i, '')
    .replace(/CARD_CTA:\s*.+/i, '')
    .trim();

  return { summary, imageKeywords, category, socialCaption, socialCardTexts };
}

async function generateSummary(title, content, language) {
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
  const langName = LANG_NAMES[language] || 'English';
  const categoryListStr = FIXED_CATEGORIES.join(', ');

  const prompt = `You are writing content for a Malaysian broadband/telecom website called NetBijak.

Article title: ${title}

Article content:
${plainText}

Produce the following, each on the exact format shown, in ${langName} (except where noted):

1. A summary, 5-6 sentences long, covering the key points of the article. Write in a clear, neutral, helpful tone. No heading, no markdown.

2. On a new line: IMAGE_KEYWORDS: keyword1, keyword2, keyword3
(These 3 keywords MUST be in English regardless of the article language, describing a relevant stock photo concept, e.g. "wifi router", "frustrated customer". 1-3 words each.)

3. On a new line: CATEGORY: category-code
(You MUST choose exactly one from this fixed list, lowercase, exact code only: ${categoryListStr})

4. On a new line: SOCIAL_CAPTION: <a punchy, scroll-stopping social media caption in ${langName}, 2-4 sentences, written to perform well on Facebook/Instagram — use a hook, some personality, and 1-2 relevant emojis. Do not include any links or hashtags, those will be added separately.>

5. On a new line: CARD_TITLE: <a short, attention-grabbing headline for a social media image card, in ${langName}, under 12 words>

6. On a new line: CARD_POINT_1: <first key takeaway from the article, in ${langName}, under 15 words, written for a single image card>

7. On a new line: CARD_POINT_2: <second key takeaway, in ${langName}, under 15 words>

8. On a new line: CARD_POINT_3: <third key takeaway, in ${langName}, under 15 words>

9. On a new line: CARD_CTA: <a short call-to-action line for the final card, in ${langName}, under 10 words, e.g. inviting the reader to compare plans or read more>`;

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
      const { summary, imageKeywords, category, socialCaption, socialCardTexts } = await generateSummary(article.title, article.content, article.language);
      const updateData = { ai_summary: summary };
      if (imageKeywords && !article.image_keywords) {
        updateData.image_keywords = imageKeywords;
      }
      if (category && !article.category) {
        updateData.category = category;
      }
      if (socialCaption) {
        updateData.social_caption = socialCaption;
      }
      if (socialCardTexts) {
        updateData.social_card_texts = socialCardTexts;
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