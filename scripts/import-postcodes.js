// NetBijak.com - 一次性汇入马来西亚Postcode资料（只需要跑一次）
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function fetchPostcodeCsv() {
  const res = await fetch(
    'https://raw.githubusercontent.com/heiswayi/malaysia-postcodes/master/data/csv/postcodes.csv'
  );
  if (!res.ok) throw new Error(`Failed to fetch postcode CSV: ${res.status}`);
  return res.text();
}

function parseCsv(csvText) {
  const lines = csvText.trim().split('\n');
  const rows = [];
  // 跳过标题行（postcode,city,state,state_code）
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const [postcode, city, state] = parts;
    if (postcode && city && state) {
      rows.push({ postcode: postcode.trim(), city: city.trim(), state: state.trim() });
    }
  }
  return rows;
}

async function insertBatch(rows) {
  const url = `${SUPABASE_URL}/rest/v1/postcodes`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Insert failed: ${res.status} ${errText}`);
  }
}

async function run() {
  console.log('Fetching Malaysia postcode data...');
  const csvText = await fetchPostcodeCsv();
  const rows = parseCsv(csvText);
  console.log(`Parsed ${rows.length} postcode rows.`);

  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await insertBatch(batch);
    inserted += batch.length;
    console.log(`  Inserted ${inserted} / ${rows.length}...`);
  }

  console.log('Done importing postcodes.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});