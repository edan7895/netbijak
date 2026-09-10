// NetBijak.com - 抓取Unsplash图片、加上NetBijak浮水印、压缩成WebP（三语言共用translation_key只请求一次）
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const MAX_REQUESTS_PER_RUN = 15; // 每次执行最多处理15组（保守，避免用光每小时50次额度）
const WATERMARK_PATH = path.join('assets', 'images', 'watermark-logo.png');
const OUTPUT_DIR = path.join('assets', 'images', 'articles');

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
  if (!result || result.length === 0) throw new Error(`Update matched 0 rows for id=${id}`);
}

async function fetchUnsplashImage(keywords) {
  const query = encodeURIComponent(keywords.split(',')[0].trim());
  const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });
  if (!res.ok) throw new Error(`Unsplash API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0].urls.regular;
}

async function downloadAndProcessImage(imageUrl, outputSlug) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const baseImage = sharp(buffer).resize(800, 450, { fit: 'cover' });

  let hasWatermark = false;
  try {
    if (fs.existsSync(WATERMARK_PATH)) {
      hasWatermark = true;
    }
  } catch (e) {
    hasWatermark = false;
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${outputSlug}.webp`);

  if (hasWatermark) {
    const watermark = await sharp(WATERMARK_PATH).resize(80).png().toBuffer();
    await baseImage
      .composite([{ input: watermark, gravity: 'southeast', blend: 'over', opacity: 0.85 }])
      .webp({ quality: 75 })
      .toFile(outputPath);
  } else {
    await baseImage.webp({ quality: 75 }).toFile(outputPath);
  }

  return `/assets/images/articles/${outputSlug}.webp`;
}

async function run() {
  console.log('Fetching articles with keywords but no generated image...');
  const articles = await fetchFromSupabase(
    'articles',
    'select=id,slug,translation_key,image_keywords,generated_image_path&is_published=eq.true&image_keywords=not.is.null&generated_image_path=is.null'
  );

  console.log(`Found ${articles.length} articles needing images.`);

  // 依 translation_key 分组，同一组只请求一次Unsplash
  const groups = {};
  articles.forEach((a) => {
    const key = a.translation_key || `__single__${a.id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  let requestCount = 0;
  for (const key of Object.keys(groups)) {
    if (requestCount >= MAX_REQUESTS_PER_RUN) {
      console.log('Reached max requests for this run, stopping (will continue next run).');
      break;
    }

    const group = groups[key];
    const representative = group[0];

    try {
      console.log(`  Fetching image for group "${key}" (keywords: ${representative.image_keywords})`);
      const imageUrl = await fetchUnsplashImage(representative.image_keywords);
      requestCount++;

      if (!imageUrl) {
        console.log(`    No image found for keywords, skipping.`);
        continue;
      }

      const outputSlug = representative.translation_key || representative.slug;
      const generatedPath = await downloadAndProcessImage(imageUrl, outputSlug);

      for (const article of group) {
        await updateSupabase('articles', article.id, { generated_image_path: generatedPath });
      }

      console.log(`    Saved image for ${group.length} language version(s): ${generatedPath}`);
    } catch (err) {
      console.error(`  Failed for group "${key}":`, err.message);
    }
  }

  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});