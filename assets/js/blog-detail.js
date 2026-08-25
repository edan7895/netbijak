// NetBijak.com - Blog 文章详情页逻辑（读取静态JSON）

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

  const allArticles = await fetchStaticData("articles");
  const article = allArticles.find((a) => a.slug === slug);

  if (!article) {
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
  const typeLabel = article.article_type === "news" ? "News" : "Article";

  let faqHtml = "";
  let faqs = [];
  if (article.faq_data) {
    try {
      faqs = JSON.parse(article.faq_data);
    } catch (e) {
      faqs = [];
    }
  }

  if (faqs.length > 0) {
    faqHtml = `
      <section class="section-card" id="article-faq-section">
        <h2>Frequently Asked Questions</h2>
        <div id="article-faq-list" class="faq-list"></div>
      </section>
    `;
  }

  container.innerHTML = `
    <a href="../" class="blog-back-link">${t("back_to_blog")}</a>
    <span class="blog-type-tag">${typeLabel}</span>
    ${article.cover_image_url ? `<img src="${article.cover_image_url}" alt="${article.title}" class="blog-detail-cover" />` : ""}
    <div class="blog-detail-date">${dateStr}${article.geo_tag ? ` · ${article.geo_tag}` : ""}</div>
    <h1 class="blog-detail-title">${article.title}</h1>
    <div class="blog-detail-content">${article.content || ""}</div>
    ${faqHtml}
  `;

  if (faqs.length > 0) {
    renderArticleFAQ(faqs);
  }
}

function renderArticleFAQ(faqs) {
  const faqList = document.getElementById("article-faq-list");
  if (!faqList) return;

  faqList.innerHTML = faqs
    .map(
      (item, i) => `
    <div class="faq-item">
      <button type="button" class="faq-question" data-index="${i}">
        <span>${item.q}</span>
        <span class="faq-toggle-icon">+</span>
      </button>
      <div class="faq-answer"><p>${item.a}</p></div>
    </div>
  `
    )
    .join("");

  faqList.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const isOpen = item.classList.contains("open");
      faqList.querySelectorAll(".faq-item").forEach((el) => el.classList.remove("open"));
      if (!isOpen) item.classList.add("open");
    });
  });

  injectFAQSchema("article-faq-list");
}

document.addEventListener("DOMContentLoaded", loadBlogDetail);