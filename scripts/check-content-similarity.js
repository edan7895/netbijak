// NetBijak.com - 文章内容相似度检测（TF-IDF + 余弦相似度，同语言互比）
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
  const url = `${SUPABASE_URL}/rest/v1/content_similarity_warnings`;
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
  // 每次重新检测前，清空旧的（未被使用者标记dismissed的）警告，避免累积过期/重复资料
  const url = `${SUPABASE_URL}/rest/v1/content_similarity_warnings?is_dismissed=eq.false`;
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

async function checkLanguageGroup(articles, language) {
  console.log(`  Checking ${articles.length} articles in language: ${language}`);
  if (articles.length < 2) return;

  const tokenSets = articles.map((a) => tokenize(stripHtml(a.content)));
  const idf = computeIDF(tokenSets);
  const vectors = tokenSets.map((tokens) => computeTFIDFVector(computeTF(tokens), idf));

  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const similarity = cosineSimilarity(vectors[i], vectors[j]);

      if (similarity >= SIMILARITY_THRESHOLD) {
        console.log(
          `    High similarity (${(similarity * 100).toFixed(1)}%): "${articles[i].title}" vs "${articles[j].title}"`
        );
        await insertWarning({
          article_a_id: articles[i].id,
          article_b_id: articles[j].id,
          similarity_score: parseFloat(similarity.toFixed(4)),
          language,
        });
      }
    }
  }
}

async function run() {
  console.log('Fetching published articles...');
  const articles = await fetchFromSupabase('articles', 'select=id,title,content,language&is_published=eq.true');

  console.log(`Found ${articles.length} published articles.`);

  console.log('Clearing old (non-dismissed) warnings...');
  await clearOldWarnings();

  const byLanguage = {};
  articles.forEach((a) => {
    const lang = a.language || 'unknown';
    if (!byLanguage[lang]) byLanguage[lang] = [];
    byLanguage[lang].push(a);
  });

  for (const lang of Object.keys(byLanguage)) {
    await checkLanguageGroup(byLanguage[lang], lang);
  }

  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});