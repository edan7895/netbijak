// NetBijak.com - 为每篇文章产生独立的静态HTML页面（含完整内容 + FAQ Schema + Hreflang + nofollow外链 + 相关文章）
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function fetchFromSupabase(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch failed for ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

function isArticleCurrentlyPublished(article) {
  const now = new Date();
  if (article.publish_at && new Date(article.publish_at) > now) return false;
  return true;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ===== 把文章内文里的外部连结自动加上 nofollow =====
function addNofollowToExternalLinks(html) {
  if (!html) return html;
  return html.replace(/<a\s+([^>]*?)href="([^"]*)"([^>]*)>/gi, (match, before, href, after) => {
    const isInternal = href.startsWith("/") || href.includes("netbijak.com") || href.startsWith("#");
    if (isInternal) {
      return `<a ${before}href="${href}"${after}>`;
    }
    // 外部连结：加上 rel="nofollow noopener"，并确保 target="_blank"
    const hasTarget = /target=/.test(before + after);
    const hasRel = /rel=/.test(before + after);
    let attrs = `${before}href="${href}"${after}`;
    if (!hasTarget) attrs += ` target="_blank"`;
    if (hasRel) {
      attrs = attrs.replace(/rel="([^"]*)"/, (relMatch, relValue) => {
        const relSet = new Set(relValue.split(/\s+/).filter(Boolean));
        relSet.add("nofollow");
        relSet.add("noopener");
        return `rel="${Array.from(relSet).join(" ")}"`;
      });
    } else {
      attrs += ` rel="nofollow noopener"`;
    }
    return `<a ${attrs}>`;
  });
}

function buildFAQSchemaScript(faqs) {
  if (!faqs || faqs.length === 0) return "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function buildFAQHtml(faqs) {
  if (!faqs || faqs.length === 0) return "";
  const items = faqs
    .map(
      (f, i) => `
    <div class="faq-item">
      <button type="button" class="faq-question" data-index="${i}">
        <span>${escapeHtml(f.q)}</span>
        <span class="faq-toggle-icon">+</span>
      </button>
      <div class="faq-answer"><p>${escapeHtml(f.a)}</p></div>
    </div>`
    )
    .join("");

  return `
    <section class="section-card" id="article-faq-section">
      <h2>Frequently Asked Questions</h2>
      <div id="article-faq-list" class="faq-list">${items}</div>
    </section>`;
}

// ===== 相关文章推荐（6篇） =====
function buildRelatedArticlesHtml(currentArticle, allArticles) {
  const sameLangOthers = allArticles.filter(
    (a) => a.id !== currentArticle.id && a.language === currentArticle.language
  );

  const sameType = sameLangOthers
    .filter((a) => a.article_type === currentArticle.article_type)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const otherType = sameLangOthers
    .filter((a) => a.article_type !== currentArticle.article_type)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const related = [...sameType, ...otherType].slice(0, 6);

  if (related.length === 0) return "";

  const cardsHtml = related
    .map((a) => {
      const excerpt = (a.content || "").replace(/<[^>]*>/g, "").slice(0, 80);
      const typeLabel = a.article_type === "news" ? "News" : "Article";
      const img = a.cover_image_url
        ? `<img src="${escapeHtml(a.cover_image_url)}" alt="${escapeHtml(a.title)}" />`
        : `<div class="latest-article-placeholder">📰</div>`;
      return `<a href="/${a.language}/blog/${a.slug}/" class="latest-article-card">
        <div class="latest-article-img-wrap">${img}<span class="latest-article-badge">${typeLabel}</span></div>
        <div class="latest-article-body">
          <div class="latest-article-date">${new Date(a.created_at).toLocaleDateString()}</div>
          <div class="latest-article-title">${escapeHtml(a.title)}</div>
          <p class="latest-article-excerpt">${escapeHtml(excerpt)}...</p>
        </div></a>`;
    })
    .join("");

  const sectionTitles = { en: "Related Articles", zh: "相关文章", ms: "Artikel Berkaitan" };
  const sectionTitle = sectionTitles[currentArticle.language] || sectionTitles.en;

  return `
    <section class="section-card" style="margin-top:1.5rem">
      <h2>${sectionTitle}</h2>
      <div class="latest-articles-track" style="overflow-x:visible;flex-wrap:wrap">${cardsHtml}</div>
    </section>`;
}

function buildArticlePageHtml(article, translations, allArticles) {
  const title = article.seo_title || `${article.title} | NetBijak.com`;
  const description = article.seo_description || "";
  const pageUrl = `https://netbijak.com/${article.language}/blog/${article.slug}/`;
  const ogImage = article.cover_image_url || "https://netbijak.com/assets/images/logo.png";

  const dateStr = new Date(article.created_at).toLocaleDateString();
  const typeLabel = article.article_type === "news" ? "News" : "Article";

  let faqs = [];
  if (article.faq_data) {
    try {
      faqs = JSON.parse(article.faq_data);
    } catch (e) {
      faqs = [];
    }
  }

  const geoTag = article.geo_tag
    ? `<meta name="geo.placename" content="${escapeHtml(article.geo_tag)}" />`
    : `<meta name="geo.placename" content="Malaysia" />`;

  const backLabels = { en: "← Back to Blog", zh: "← 返回部落格", ms: "← Kembali ke Blog" };
  const backLabel = backLabels[article.language] || backLabels.en;

  let hreflangHtml = "";
  if (translations && translations.length > 1) {
    hreflangHtml = translations
      .map((t) => `<link rel="alternate" hreflang="${t.language}" href="https://netbijak.com/${t.language}/blog/${t.slug}/" />`)
      .join("\n  ");
    const defaultVersion = translations.find((t) => t.language === "en") || translations[0];
    hreflangHtml += `\n  <link rel="alternate" hreflang="x-default" href="https://netbijak.com/${defaultVersion.language}/blog/${defaultVersion.slug}/" />`;
  }

  const processedContent = addNofollowToExternalLinks(article.content);
  const relatedHtml = buildRelatedArticlesHtml(article, allArticles);

  return `<!DOCTYPE html>
<html lang="${article.language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="geo.region" content="MY" />
  ${geoTag}
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="${pageUrl}" />
  ${hreflangHtml}
  <link rel="icon" type="image/png" href="/assets/images/favicon.png" />
  <link rel="stylesheet" href="/assets/css/style.css" />
  ${buildFAQSchemaScript(faqs)}
</head>
<body>
  <div id="site-header"></div>

  <main class="main">
    <div id="blog-detail-container">
      <a href="/${article.language}/blog/" class="blog-back-link">${backLabel}</a>
      <span class="blog-type-tag">${typeLabel}</span>
      ${article.cover_image_url ? `<img src="${escapeHtml(article.cover_image_url)}" alt="${escapeHtml(article.title)}" class="blog-detail-cover" />` : ""}
      <div class="blog-detail-date">${dateStr}${article.geo_tag ? ` · ${escapeHtml(article.geo_tag)}` : ""}</div>
      <h1 class="blog-detail-title">${escapeHtml(article.title)}</h1>
      <div class="blog-detail-content">${processedContent || ""}</div>
      ${buildFAQHtml(faqs)}
    </div>
    ${relatedHtml}
  </main>

  <footer id="site-footer"></footer>

  <script>const ROOT_PATH = "/";</script>
  <script src="/assets/js/translations.js"></script>
  <script src="/assets/js/site.js"></script>
  ${faqs.length > 0 ? `<script>
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll("#article-faq-list .faq-question").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = btn.closest(".faq-item");
          const isOpen = item.classList.contains("open");
          document.querySelectorAll("#article-faq-list .faq-item").forEach((el) => el.classList.remove("open"));
          if (!isOpen) item.classList.add("open");
        });
      });
    });
  </script>` : ""}
</body>
</html>`;
}

async function generateArticlePages() {
  console.log('Fetching articles...');
  const articles = await fetchFromSupabase('articles', 'select=*&is_published=eq.true');
  const publishedArticles = articles.filter(isArticleCurrentlyPublished);

  const groups = {};
  publishedArticles.forEach((a) => {
    const key = a.translation_key || `__single__${a.id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ language: a.language, slug: a.slug });
  });

  let count = 0;
  for (const article of publishedArticles) {
    if (!article.language || !article.slug) continue;

    const key = article.translation_key || `__single__${article.id}`;
    const translations = groups[key];

    const dir = path.join(article.language, 'blog', article.slug);
    fs.mkdirSync(dir, { recursive: true });

    const html = buildArticlePageHtml(article, translations, publishedArticles);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    count++;
  }

  console.log(`Generated ${count} article pages.`);
}

generateArticlePages().catch((err) => {
  console.error(err);
  process.exit(1);
});