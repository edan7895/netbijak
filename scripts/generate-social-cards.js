// NetBijak.com - 产生社群媒体图卡（5张一组：标题+3重点+CTA），1080x1080正方形
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const WATERMARK_PATH = path.join('assets', 'images', 'watermark-logo.png');
const OUTPUT_BASE_DIR = path.join('assets', 'images', 'social');
const CARD_SIZE = 1080;

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

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFontFamily(language) {
  if (language === 'zh') {
    return "'Noto Sans CJK SC', 'Noto Sans SC', sans-serif";
  }
  return "Arial, sans-serif";
}

function wrapLines(text, maxCharsPerLine, maxLines) {
  const words = text.split(' ');
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
  return lines.slice(0, maxLines);
}

function buildTitleCardSvg(title, language) {
  const fontFamily = getFontFamily(language);
  const lines = wrapLines(title, 18, 5);
  const lineHeight = 66;
  const startY = CARD_SIZE / 2 - (lines.length * lineHeight) / 2 + 24;

  const textLines = lines
    .map(
      (line, i) =>
        `<text x="${CARD_SIZE / 2}" y="${startY + i * lineHeight}" font-family="${fontFamily}" font-size="56" font-weight="900" fill="#ffffff" text-anchor="middle">${escapeXml(line)}</text>`
    )
    .join('');

  return `
    <svg width="${CARD_SIZE}" height="${CARD_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#0ea5e9" />
          <stop offset="100%" stop-color="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="url(#bg)" />
      <text x="${CARD_SIZE / 2}" y="140" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#5eead4" text-anchor="middle" letter-spacing="4">NETBIJAK</text>
      ${textLines}
    </svg>
  `;
}

function buildPointCardSvg(pointNumber, pointText, language) {
  const fontFamily = getFontFamily(language);
  const lines = wrapLines(pointText, 22, 5);
  const lineHeight = 58;
  const startY = CARD_SIZE / 2 - (lines.length * lineHeight) / 2 + 24;

  const textLines = lines
    .map(
      (line, i) =>
        `<text x="${CARD_SIZE / 2}" y="${startY + i * lineHeight}" font-family="${fontFamily}" font-size="46" font-weight="700" fill="#0f172a" text-anchor="middle">${escapeXml(line)}</text>`
    )
    .join('');

  return `
    <svg width="${CARD_SIZE}" height="${CARD_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="#f8fafc" />
      <circle cx="150" cy="150" r="70" fill="#14b8a6" />
      <text x="150" y="172" font-family="Arial, sans-serif" font-size="60" font-weight="900" fill="#ffffff" text-anchor="middle">${pointNumber}</text>
      ${textLines}
      <rect x="0" y="${CARD_SIZE - 16}" width="${CARD_SIZE}" height="16" fill="#0ea5e9" />
    </svg>
  `;
}

function buildCtaCardSvg(ctaText, language) {
  const fontFamily = getFontFamily(language);
  const lines = wrapLines(ctaText, 20, 4);
  const lineHeight = 60;
  const startY = CARD_SIZE / 2 - (lines.length * lineHeight) / 2;

  const textLines = lines
    .map(
      (line, i) =>
        `<text x="${CARD_SIZE / 2}" y="${startY + i * lineHeight}" font-family="${fontFamily}" font-size="50" font-weight="800" fill="#ffffff" text-anchor="middle">${escapeXml(line)}</text>`
    )
    .join('');

  return `
    <svg width="${CARD_SIZE}" height="${CARD_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#14b8a6" />
          <stop offset="50%" stop-color="#0ea5e9" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="url(#bg2)" />
      ${textLines}
      <text x="${CARD_SIZE / 2}" y="${CARD_SIZE - 100}" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="3">NETBIJAK.COM</text>
    </svg>
  `;
}

async function renderCardToFile(svg, outputPath) {
  let pipeline = sharp(Buffer.from(svg));

  if (fs.existsSync(WATERMARK_PATH)) {
    const watermark = await sharp(WATERMARK_PATH).resize(100).png().toBuffer();
    pipeline = pipeline.composite([{ input: watermark, gravity: 'southeast', blend: 'over', opacity: 0.9 }]);
  }

  await pipeline.webp({ quality: 85 }).toFile(outputPath);
}

async function generateCardsForArticle(article) {
  const cardTexts = article.social_card_texts;
  if (!cardTexts || !cardTexts.title || !cardTexts.points || cardTexts.points.length < 3 || !cardTexts.cta) {
    throw new Error('Incomplete social_card_texts data');
  }

  const outputDir = path.join(OUTPUT_BASE_DIR, article.slug);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const lang = article.language;

  await renderCardToFile(buildTitleCardSvg(cardTexts.title, lang), path.join(outputDir, 'card-1.webp'));
  await renderCardToFile(buildPointCardSvg(1, cardTexts.points[0], lang), path.join(outputDir, 'card-2.webp'));
  await renderCardToFile(buildPointCardSvg(2, cardTexts.points[1], lang), path.join(outputDir, 'card-3.webp'));
  await renderCardToFile(buildPointCardSvg(3, cardTexts.points[2], lang), path.join(outputDir, 'card-4.webp'));
  await renderCardToFile(buildCtaCardSvg(cardTexts.cta, lang), path.join(outputDir, 'card-5.webp'));

  return `/assets/images/social/${article.slug}/`;
}

async function run() {
  console.log('Fetching articles with social card texts but no generated cards...');
  const articles = await fetchFromSupabase(
    'articles',
    'select=id,slug,language,social_card_texts,social_cards_generated_path&is_published=eq.true&social_card_texts=not.is.null&social_cards_generated_path=is.null'
  );

  console.log(`Found ${articles.length} articles needing social cards.`);

  let successCount = 0;
  for (const article of articles) {
    try {
      console.log(`  Generating cards for: ${article.slug}`);
      const cardsPath = await generateCardsForArticle(article);
      await updateSupabase('articles', article.id, { social_cards_generated_path: cardsPath });
      successCount++;
    } catch (err) {
      console.error(`  Failed for "${article.slug}":`, err.message);
    }
  }

  console.log(`Done. Generated cards for ${successCount} articles.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});