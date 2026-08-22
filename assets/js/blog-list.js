// NetBijak.com - Blog 列表页逻辑

async function loadBlogList() {
  const gridEl = document.getElementById("blog-grid");
  if (!gridEl) return;

  const lang = getCurrentLang();

  setSEOMeta({
    title: t("blog_title") + " | NetBijak.com",
    description: t("blog_subtitle"),
    url: window.location.href,
  });

  const now = new Date().toISOString();

  const { data: articles, error } = await supabaseClient
    .from("articles")
    .select("*")
    .eq("language", lang)
    .eq("is_published", true)
    .or(`publish_at.is.null,publish_at.lte.${now}`)
    .order("created_at", { ascending: false });

  if (error || !articles || articles.length === 0) {
    gridEl.innerHTML = `<p style="color:#94a3b8;padding:2rem;text-align:center">${t("no_articles")}</p>`;
    return;
  }

  gridEl.innerHTML = articles.map((a) => buildBlogCard(a)).join("");
}

function buildBlogCard(article) {
  const dateStr = new Date(article.created_at).toLocaleDateString();
  const excerpt = (article.content || "").replace(/<[^>]*>/g, "").slice(0, 120);

  return `
    <a href="post/?slug=${article.slug}" class="blog-card">
      ${article.cover_image_url ? `<img src="${article.cover_image_url}" alt="${article.title}" class="blog-card-img" />` : `<div class="blog-card-img blog-card-img-placeholder">📰</div>`}
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