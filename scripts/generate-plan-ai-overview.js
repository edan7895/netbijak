// NetBijak.com - 为配套生成AI介绍文字（只在缺少介绍时才呼叫Gemini，已有内容永不覆盖）
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
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status} ${await res.text()}`);
  const result = await res.json();
  if (!result || result.length === 0) {
    throw new Error(`Update matched 0 rows for id=${id}`);
  }
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

async function generateOverview(plan, providerName) {
  const features = (plan.features || '').split(',').map((f) => f.trim()).filter(Boolean).join(', ');

  const prompt = `You are writing a short "NetBijak's Take" section for a broadband plan comparison website in Malaysia.

Plan details:
- Provider: ${providerName}
- Plan name: ${plan.name}
- Price: RM${plan.promo_price}/month
- Download speed: ${plan.download_speed}
- Upload speed: ${plan.upload_speed}
- Contract: ${plan.contract_months} months
- Features: ${features || "Not specified"}
- Recommended for: ${plan.recommended_for || "Not specified"}

Write 3-4 sentences that go beyond simply restating the numbers above. Focus on:
- What kind of household or user this plan genuinely suits (based on speed/price/features)
- Any meaningful trade-off worth knowing (e.g. contract length, value vs other tiers)
- Practical advice a real buyer would find useful

Do not just repeat the speed and price numbers as a sentence. Do not use markdown. Write in a neutral, helpful tone, in English.`;

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
  console.log('Fetching plans without AI overview...');
  const plans = await fetchFromSupabase(
    'plans',
    'select=id,name,promo_price,download_speed,upload_speed,contract_months,features,recommended_for,ai_overview,providers(name)&is_published=eq.true&ai_overview=is.null'
  );

  console.log(`Found ${plans.length} plans needing overviews.`);

  let successCount = 0;
  for (const plan of plans) {
    const providerName = plan.providers ? plan.providers.name : 'this provider';
    try {
      console.log(`  Generating overview for: ${plan.name}`);
      const overview = await generateOverview(plan, providerName);
      await updateSupabase('plans', plan.id, { ai_overview: overview });
      successCount++;
      await new Promise((resolve) => setTimeout(resolve, 6000));
    } catch (err) {
      console.error(`  Failed for "${plan.name}":`, err.message);
    }
  }

  console.log(`Done. Generated ${successCount} overviews.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});