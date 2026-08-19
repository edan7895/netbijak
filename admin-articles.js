// NetBijak.com - Admin 文章管理逻辑（含Quill所见即所得编辑器）

let editingArticleId = null;
let quillEditor = null;
let allPlansCache = [];
let allArticlesCache = [];

async function initAdminArticlesPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  initQuillEditor();
  await loadPlanOptions();
  await loadArticlesList();

  document.getElementById("filter-language").addEventListener("change", loadArticlesList);
  document.getElementById("btn-new-article").addEventListener("click", () => openArticleForm(null));
  document.getElementById("article-form").addEventListener("submit", saveArticle);
  document.getElementById("btn-cancel-article-form").addEventListener("click", closeArticleForm);
  document.getElementById("form-article-title").addEventListener("input", autoFillSlug);
  document.getElementById("btn-insert-banner").addEventListener("click", openBannerModal);
  document.getElementById("btn-insert-link").addEventListener("click", openLinkModal);

  // Banner Modal 按钮
  document.getElementById("banner-modal-insert").addEventListener("click", insertBannerIntoEditor);
  document.getElementById("banner-modal-cancel").addEventListener("click", closeBannerModal);

  // Link Modal 按钮
  document.getElementById("link-modal-insert").addEventListener("click", insertLinkIntoEditor);
  document.getElementById("link-modal-cancel").addEventListener("click", closeLinkModal);
  document.getElementById("link-target-type").addEventListener("change", updateLinkTargetOptions);
}

// ===== Quill 编辑器初始化 =====
function initQuillEditor() {
  quillEditor = new Quill("#quill-editor", {
    theme: "snow",
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["clean"],
      ],
    },
    placeholder: "Write your article here...",
  });
}

// ===== 加载配套选项（用于 Related Plan + 连结选择器）=====
async function loadPlanOptions() {
  const { data: plans } = await supabaseClient
    .from("plans")
    .select("id, name, slug, providers(name, slug)")
    .order("name", { ascending: true });

  allPlansCache = plans || [];

  const select = document.getElementById("form-article-plan-id");
  select.innerHTML =
    `<option value="">— None (standalone article) —</option>` +
    allPlansCache
      .map((p) => `<option value="${p.id}">${p.providers ? p.providers.name + " - " : ""}${p.name}</option>`)
      .join("");

  const { data: articles } = await supabaseClient.from("articles").select("id, title, slug, language");
  allArticlesCache = articles || [];
}

async function loadArticlesList() {
  const tbody = document.getElementById("articles-table-body");
  tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;

  const language = document.getElementById("filter-language").value;

  let query = supabaseClient.from("articles").select("*").order("created_at", { ascending: false });
  if (language) query = query.eq("language", language);

  const { data: articles, error } = await query;

  if (error || !articles || articles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8">No articles found.</td></tr>`;
    return;
  }

  tbody.innerHTML = articles
    .map((a) => {
      const dateStr = new Date(a.created_at).toLocaleDateString();
      return `
      <tr>
        <td>${a.title}</td>
        <td><span class="lang-tag">${(a.language || "-").toUpperCase()}</span></td>
        <td>${dateStr}</td>
        <td>${a.is_published ? '<span class="badge-published">Published</span>' : '<span class="badge-unpublished">Draft</span>'}</td>
        <td><button class="btn-small" onclick="openArticleForm(${a.id})">Edit</button></td>
      </tr>
    `;
    })
    .join("");
}

function autoFillSlug() {
  const titleInput = document.getElementById("form-article-title");
  const slugInput = document.getElementById("form-article-slug");
  if (!slugInput.dataset.manuallyEdited) {
    slugInput.value = titleInput.value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }
}

async function openArticleForm(articleId) {
  editingArticleId = articleId;
  document.getElementById("article-form-wrap").classList.remove("hidden");
  document.getElementById("article-form-title-label").textContent = articleId ? "Edit Article" : "New Article";
  document.getElementById("article-form").reset();
  document.getElementById("form-article-slug").dataset.manuallyEdited = "";
  quillEditor.root.innerHTML = "";

  if (articleId) {
    const { data: article } = await supabaseClient.from("articles").select("*").eq("id", articleId).single();
    if (article) {
      document.getElementById("form-article-title").value = article.title || "";
      document.getElementById("form-article-slug").value = article.slug || "";
      document.getElementById("form-article-slug").dataset.manuallyEdited = "true";
      document.getElementById("form-article-language").value = article.language || "en";
      quillEditor.root.innerHTML = article.content || "";
      document.getElementById("form-article-cover").value = article.cover_image_url || "";
      document.getElementById("form-article-seo-title").value = article.seo_title || "";
      document.getElementById("form-article-seo-description").value = article.seo_description || "";
      document.getElementById("form-article-geo").value = article.geo_tag || "";
      document.getElementById("form-article-plan-id").value = article.plan_id || "";
      document.getElementById("form-article-is-published").checked = article.is_published;
      document.getElementById("form-article-publish-at").value = article.publish_at ? article.publish_at.slice(0, 16) : "";
    }
  } else {
    document.getElementById("form-article-language").value = "en";
    document.getElementById("form-article-is-published").checked = true;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeArticleForm() {
  document.getElementById("article-form-wrap").classList.add("hidden");
  editingArticleId = null;
}

async function saveArticle(e) {
  e.preventDefault();

  const articleData = {
    title: document.getElementById("form-article-title").value,
    slug: document.getElementById("form-article-slug").value,
    language: document.getElementById("form-article-language").value,
    content: quillEditor.root.innerHTML,
    cover_image_url: document.getElementById("form-article-cover").value,
    seo_title: document.getElementById("form-article-seo-title").value,
    seo_description: document.getElementById("form-article-seo-description").value,
    geo_tag: document.getElementById("form-article-geo").value,
    plan_id: document.getElementById("form-article-plan-id").value || null,
    is_published: document.getElementById("form-article-is-published").checked,
    publish_at: document.getElementById("form-article-publish-at").value || null,
  };

  let result;
  if (editingArticleId) {
    result = await supabaseClient.from("articles").update(articleData).eq("id", editingArticleId);
  } else {
    result = await supabaseClient.from("articles").insert(articleData);
  }

  if (result.error) {
    alert("Error saving article: " + result.error.message);
    return;
  }

  alert("Article saved successfully!");
  closeArticleForm();
  loadArticlesList();
}

// ===== Banner 插入功能 =====
function openBannerModal() {
  document.getElementById("banner-modal-image").value = "";
  document.getElementById("banner-modal-link").value = "";
  document.getElementById("banner-modal").classList.remove("hidden");
}

function closeBannerModal() {
  document.getElementById("banner-modal").classList.add("hidden");
}

function insertBannerIntoEditor() {
  const imageUrl = document.getElementById("banner-modal-image").value.trim();
  const linkUrl = document.getElementById("banner-modal-link").value.trim();

  if (!imageUrl) {
    alert("Please enter an image URL.");
    return;
  }

  const range = quillEditor.getSelection(true);
  const bannerHtml = linkUrl
    ? `<p><a href="${linkUrl}" target="_blank"><img src="${imageUrl}" style="width:100%;border-radius:12px" /></a></p>`
    : `<p><img src="${imageUrl}" style="width:100%;border-radius:12px" /></p>`;

  quillEditor.clipboard.dangerouslyPasteHTML(range.index, bannerHtml);
  closeBannerModal();
}

// ===== 连结插入功能（连去文章 / 配套 / 外部网址）=====
function openLinkModal() {
  const range = quillEditor.getSelection();
  if (!range || range.length === 0) {
    alert("Please select some text first, then click Insert Link.");
    return;
  }
  document.getElementById("link-target-type").value = "external";
  document.getElementById("link-external-url").value = "";
  updateLinkTargetOptions();
  document.getElementById("link-modal").classList.remove("hidden");
}

function closeLinkModal() {
  document.getElementById("link-modal").classList.add("hidden");
}

function updateLinkTargetOptions() {
  const type = document.getElementById("link-target-type").value;
  document.getElementById("link-external-row").classList.toggle("hidden", type !== "external");
  document.getElementById("link-article-row").classList.toggle("hidden", type !== "article");
  document.getElementById("link-plan-row").classList.toggle("hidden", type !== "plan");

  if (type === "article") {
    const currentLang = document.getElementById("form-article-language").value;
    const select = document.getElementById("link-article-select");
    select.innerHTML = allArticlesCache
      .filter((a) => a.language === currentLang)
      .map((a) => `<option value="${a.slug}">${a.title}</option>`)
      .join("");
  }

  if (type === "plan") {
    const select = document.getElementById("link-plan-select");
    select.innerHTML = allPlansCache
      .map((p) => `<option value="${p.providers ? p.providers.slug : ""}|${p.slug}">${p.providers ? p.providers.name + " - " : ""}${p.name}</option>`)
      .join("");
  }
}

function insertLinkIntoEditor() {
  const type = document.getElementById("link-target-type").value;
  const range = quillEditor.getSelection();
  if (!range) return;

  let url = "";

  if (type === "external") {
    url = document.getElementById("link-external-url").value.trim();
    if (!url) {
      alert("Please enter a URL.");
      return;
    }
  } else if (type === "article") {
    const slug = document.getElementById("link-article-select").value;
    const currentLang = document.getElementById("form-article-language").value;
    url = `/${currentLang}/blog/post/?slug=${slug}`;
  } else if (type === "plan") {
    const val = document.getElementById("link-plan-select").value;
    const [providerSlug, planSlug] = val.split("|");
    url = `/${providerSlug}/plan/?slug=${planSlug}`;
  }

  quillEditor.formatText(range.index, range.length, "link", url);
  closeLinkModal();
}

document.addEventListener("DOMContentLoaded", initAdminArticlesPage);