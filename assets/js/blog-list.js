// NetBijak.com - Blog 列表页逻辑（读取静态JSON）

async function loadBlogList() {
  const gridEl = document.getElementById("blog-grid");
  if (!gridEl) return;

  const lang = getCurrentLang();

  setSEOMeta({
    title: t("blog_title") + " | NetBijak.com",
    description: t("blog_subtitle"),
    url: window.location.href,
  });

  const allArticles = await fetchStaticData("articles");

  const articles = allArticles
    .filter((a) => a.language === lang && isArticleCurrentlyPublished(a))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (articles.length === 0) {
    gridEl.innerHTML = `<p style="color:#94a3b8;padding:2rem;text-align:center">${t("no_articles")}</p>`;
    return;
  }

  gridEl.innerHTML = articles.map((a) => buildBlogCard(a)).join("");
}

function buildBlogCard(article) {
  const dateStr = new Date(article.created_at).toLocaleDateString();
  const excerpt = (article.content || "").replace(/<[^>]*>/g, "").slice(0, 120);
  const typeLabel = article.article_type === "news" ? "News" : "Article";

  return `
    <a href="${article.slug}/" class="blog-card">
      <div class="blog-card-img-wrap">
        ${article.cover_image_url ? `<img src="${article.cover_image_url}" alt="${article.title}" class="blog-card-img" />` : `<div class="blog-card-img blog-card-img-placeholder">📰</div>`}
        <span class="blog-card-type-badge">${typeLabel}</span>
      </div>
      <div class="blog-card-body">
        <div class="blog-card-date">${dateStr}</div>
        <div class="blog-card-title">${article.title}</div>
        <p class="blog-card-excerpt">${excerpt}${excerpt.length >= 120 ? "..." : ""}</p>
        <span class="blog-card-readmore">${t("read_more")} →</span>
      </div>
    </a>
  `;
}

document.addEventListener("DOMContentLoaded", loadBlogList);