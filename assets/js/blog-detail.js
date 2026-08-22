// NetBijak.com - Blog 文章详情页逻辑

function getSlugFromUrlBlog() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug");
}

async function loadBlogDetail() {
  const slug = getSlugFromUrlBlog();
  const container = document.getElementById("blog-detail-container");
  if (!slug || !container) {
    if (container) container.innerHTML = `<p>${t("article_not_found")}</p>`;
    return;
  }

  const { data: article, error } = await supabaseClient
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !article) {
    container.innerHTML = `<p>${t("article_not_found")}</p>`;
    return;
  }

  setSEOMeta({
    title: article.seo_title || `${article.title} | NetBijak.com`,
    description: article.seo_description || "",
    url: window.location.href,
    image: article.cover_image_url || undefined,
  });
  setGeoMeta(article.geo_tag);

  const dateStr = new Date(article.created_at).toLocaleDateString();

  container.innerHTML = `
    <a href="../" class="blog-back-link">${t("back_to_blog")}</a>
    ${article.cover_image_url ? `<img src="${article.cover_image_url}" alt="${article.title}" class="blog-detail-cover" />` : ""}
    <div class="blog-detail-date">${dateStr}${article.geo_tag ? ` · ${article.geo_tag}` : ""}</div>
    <h1 class="blog-detail-title">${article.title}</h1>
    <div class="blog-detail-content">${article.content || ""}</div>
  `;
}

document.addEventListener("DOMContentLoaded", loadBlogDetail);