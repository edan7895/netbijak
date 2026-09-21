// NetBijak.com - 自动把 assets/images/homepage-banners/ 底下的图片，统一调整成固定尺寸
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE_DIR = path.join('assets', 'images', 'homepage-banners');
const PROCESSED_DIR = path.join('assets', 'images', 'homepage-banners', 'processed');
const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 400;

async function run() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.log('No homepage-banners directory found, skipping.');
    return;
  }

  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

  const files = fs.readdirSync(SOURCE_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) && fs.statSync(path.join(SOURCE_DIR, f)).isFile();
  });

  console.log(`Found ${files.length} banner image(s) to process.`);

  for (const file of files) {
    const inputPath = path.join(SOURCE_DIR, file);
    const outputName = path.parse(file).name + '.webp';
    const outputPath = path.join(PROCESSED_DIR, outputName);

    // 如果已经处理过、且原图没有更新，跳过（用修改时间比对，避免每次都重跑）
    if (fs.existsSync(outputPath)) {
      const inputStat = fs.statSync(inputPath);
      const outputStat = fs.statSync(outputPath);
      if (outputStat.mtimeMs > inputStat.mtimeMs) {
        console.log(`  Skipping ${file} (already processed, up to date).`);
        continue;
      }
    }

    try {
      await sharp(inputPath)
        .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toFile(outputPath);
      console.log(`  Processed: ${file} → processed/${outputName}`);
    } catch (err) {
      console.error(`  Failed to process ${file}:`, err.message);
    }
  }

  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});