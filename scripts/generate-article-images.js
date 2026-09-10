// NetBijak.com - 抓取Unsplash图片、加上NetBijak浮水印、压缩成WebP（找不到图时自动生成标题卡片备案）
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const MAX_REQUESTS_PER_RUN = 15;
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

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapTitleLines(title, maxCharsPerLine) {
  const words = title.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    if ((current + ' ' + word).trim().length > maxCharsPerLine) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  });
  if (current) lines.push(current.trim());
  return lines.slice(0, 4); // 最多4行，避免文字太长挤爆
}

async function generateTitleCardImage(title, outputSlug) {
  const width = 800;
  const height = 450;
  const lines = wrapTitleLines(title, 28);
  const lineHeight = 48;
  const startY = height / 2 - (lines.length * lineHeight) / 2 + 20;

  const textSvgLines = lines
    .map(
      (line, i) =>
        `<text x="60" y="${startY + i * lineHeight}" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#ffffff">${escapeXml(line)}</text>`
    )
    .join('');

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#0ea5e9" />
          <stop offset="100%" stop-color="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      ${textSvgLines}
    </svg>
  `;

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${outputSlug}.webp`);

  let pipeline = sharp(Buffer.from(svg));

  if (fs.existsSync(WATERMARK_PATH)) {
    const watermark = await sharp(WATERMARK_PATH).resize(80).png().toBuffer();
    pipeline = pipeline.composite([{ input: watermark, gravity: 'southeast', blend: 'over', opacity: 0.85 }]);
  }

  await pipeline.webp({ quality: 80 }).toFile(outputPath);
  return `/assets/images/articles/${outputSlug}.webp`;
}

async function downloadAndProcessImage(imageUrl, outputSlug) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const baseImage = sharp(buffer).resize(800, 450, { fit: 'cover' });

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${outputSlug}.webp`);

  if (fs.existsSync(WATERMARK_PATH)) {
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
    'select=id,title,slug,translation_key,image_keywords,generated_image_path&is_published=eq.true&image_keywords=not.is.null&generated_image_path=is.null'
  );

  console.log(`Found ${articles.length} articles needing images.`);

  const groups = {};
  articles.forEach((a) => {
    const key = a.translation_key || `__single__${a.id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  let requestCount = 0;
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    const representative = group[0];
    const outputSlug = representative.translation_key || representative.slug;

    try {
      let generatedPath;

      if (requestCount >= MAX_REQUESTS_PER_RUN) {
        console.log(`  Skipping Unsplash for group "${key}" (rate limit reached this run), generating title card instead.`);
        generatedPath = await generateTitleCardImage(representative.title, outputSlug);
      } else {
        console.log(`  Fetching image for group "${key}" (keywords: ${representative.image_keywords})`);
        const imageUrl = await fetchUnsplashImage(representative.image_keywords);
        requestCount++;

        if (imageUrl) {
          generatedPath = await downloadAndProcessImage(imageUrl, outputSlug);
        } else {
          console.log(`    No Unsplash result, generating title card instead.`);
          generatedPath = await generateTitleCardImage(representative.title, outputSlug);
        }
      }

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