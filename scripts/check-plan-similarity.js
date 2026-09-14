// NetBijak.com - 配套深度内容相似度检测（TF-IDF + 余弦相似度，比对 deep_analysis 优先，否则 ai_overview）
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SIMILARITY_THRESHOLD = 0.6; // 60%

async function fetchFromSupabase(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function insertWarning(data) {
  const url = `${SUPABASE_URL}/rest/v1/plan_similarity_warnings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Insert warning failed: ${res.status} ${await res.text()}`);
}

async function clearOldWarnings() {
  const url = `${SUPABASE_URL}/rest/v1/plan_similarity_warnings?is_dismissed=eq.false`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Clear old warnings failed: ${res.status} ${await res.text()}`);
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function tokenize(text) {
  return text.match(/[a-z0-9\u4e00-\u9fa5]+/gi) || [];
}

function computeTF(tokens) {
  const tf = {};
  tokens.forEach((t) => {
    tf[t] = (tf[t] || 0) + 1;
  });
  const total = tokens.length;
  Object.keys(tf).forEach((k) => (tf[k] = tf[k] / total));
  return tf;
}

function computeIDF(allTokenSets) {
  const idf = {};
  const docCount = allTokenSets.length;
  const vocabulary = new Set();
  allTokenSets.forEach((tokens) => tokens.forEach((t) => vocabulary.add(t)));

  vocabulary.forEach((term) => {
    const docsWithTerm = allTokenSets.filter((tokens) => tokens.includes(term)).length;
    idf[term] = Math.log(docCount / (1 + docsWithTerm)) + 1;
  });

  return idf;
}

function computeTFIDFVector(tf, idf) {
  const vector = {};
  Object.keys(tf).forEach((term) => {
    vector[term] = tf[term] * (idf[term] || 0);
  });
  return vector;
}

function cosineSimilarity(vecA, vecB) {
  const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  allTerms.forEach((term) => {
    const a = vecA[term] || 0;
    const b = vecB[term] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getComparableContent(plan) {
  if (plan.deep_analysis && plan.deep_analysis.trim().length > 50) {
    return { text: plan.deep_analysis, source: 'deep_analysis' };
  }
  if (plan.ai_overview && plan.ai_overview.trim().length > 50) {
    return { text: plan.ai_overview, source: 'ai_overview' };
  }
  return null;
}

async function checkProviderGroup(plans, providerName) {
  const withContent = plans
    .map((p) => {
      const content = getComparableContent(p);
      return content ? { ...p, comparableText: content.text, contentSource: content.source } : null;
    })
    .filter(Boolean);

  console.log(`  Checking ${withContent.length} plans with content for provider: ${providerName}`);
  if (withContent.length < 2) return;

  const tokenSets = withContent.map((p) => tokenize(stripHtml(p.comparableText)));
  const idf = computeIDF(tokenSets);
  const vectors = tokenSets.map((tokens) => computeTFIDFVector(computeTF(tokens), idf));

  for (let i = 0; i < withContent.length; i++) {
    for (let j = i + 1; j < withContent.length; j++) {
      const similarity = cosineSimilarity(vectors[i], vectors[j]);

      if (similarity >= SIMILARITY_THRESHOLD) {
        console.log(
          `    High similarity (${(similarity * 100).toFixed(1)}%): "${withContent[i].name}" vs "${withContent[j].name}"`
        );
        await insertWarning({
          plan_a_id: withContent[i].id,
          plan_b_id: withContent[j].id,
          similarity_score: parseFloat(similarity.toFixed(4)),
          content_source: withContent[i].contentSource,
        });
      }
    }
  }
}

async function run() {
  console.log('Fetching published plans...');
  const plans = await fetchFromSupabase(
    'plans',
    'select=id,name,deep_analysis,ai_overview,provider_id,providers(name)&is_published=eq.true'
  );

  console.log(`Found ${plans.length} published plans.`);

  console.log('Clearing old (non-dismissed) warnings...');
  await clearOldWarnings();

  const byProvider = {};
  plans.forEach((p) => {
    const providerId = p.provider_id || 'unknown';
    if (!byProvider[providerId]) byProvider[providerId] = { name: p.providers ? p.providers.name : 'Unknown', plans: [] };
    byProvider[providerId].plans.push(p);
  });

  for (const providerId of Object.keys(byProvider)) {
    await checkProviderGroup(byProvider[providerId].plans, byProvider[providerId].name);
  }

  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});