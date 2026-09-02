// NetBijak.com - 自动清理超过1年的流量统计资料
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function deleteOldRows(table, cutoffIso) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?created_at=lt.${cutoffIso}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to clean up ${table}: ${res.status} ${text}`);
  }
}

async function run() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const cutoffIso = oneYearAgo.toISOString();

  console.log(`Cleaning up analytics data older than ${cutoffIso}...`);

  await deleteOldRows("page_views", cutoffIso);
  console.log("  page_views cleaned.");

  await deleteOldRows("whatsapp_clicks", cutoffIso);
  console.log("  whatsapp_clicks cleaned.");

  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});