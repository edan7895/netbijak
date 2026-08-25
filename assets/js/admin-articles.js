// NetBijak.com - Admin 文章管理逻辑（含Quill编辑器 + Banner + Link + FAQ + WhatsApp按钮）

let editingArticleId = null;
let quillEditor = null;
let allPlansCache = [];
let allArticlesCache = [];
let faqRowCount = 0;

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
  document.getElementById("btn-insert-whatsapp").addEventListener("click", openWhatsAppModal);
  document.getElementById("btn-add-faq-row").addEventListener("click", () => addFAQRow());

  document.getElementById("banner-modal-insert").addEventListener("click", insertBannerIntoEditor);
  document.getElementById("banner-modal-cancel").addEventListener("click", closeBannerModal);

  document.getElementById("link-modal-insert").addEventListener("click", insertLinkIntoEditor);
  document.getElementById("link-modal-cancel").addEventListener("click", closeLinkModal);
  document.getElementById("link-target-type").addEventListener("change", updateLinkTargetOptions);

  document.getElementById("whatsapp-modal-insert").addEventListener("click", insertWhatsAppIntoEditor);
  document.getElementById("whatsapp-modal-cancel").addEventListener("click", closeWhatsAppModal);
}

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
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

  const language = document.getElementById("filter-language").value;

  let query = supabaseClient.from("articles").select("*").order("created_at", { ascending: false });
  if (language) query = query.eq("language", language);

  const { data: articles, error } = await query;

  if (error || !articles || articles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8">No articles found.</td></tr>`;
    return;
  }

  tbody.innerHTML = articles
    .map((a) => {
      const dateStr = new Date(a.created_at).toLocaleDateString();
      const typeLabel = a.article_type === "news" ? "News" : "Article";
      return `
      <tr>
        <td>${a.title}</td>
        <td><span class="lang-tag">${(a.language || "-").toUpperCase()}</span></td>
        <td><span class="type-tag">${typeLabel}</span></td>
        <td>${dateStr}</td>
        <td>${a.is_published ? '<span class="badge-published">Published</span>' : '<span class="badge-unpublished">Draft</span>'}</td>
        <td>
          <button class="btn-small" onclick="openArticleForm(${a.id})">Edit</button>
          <button class="btn-small btn-delete" onclick="deleteArticle(${a.id}, '${(a.title || "").replace(/'/g, "\\'")}')">Delete</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

async function deleteArticle(articleId, title) {
  const confirmed = confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`);
  if (!confirmed) return;

  const { error } = await supabaseClient.from("articles").delete().eq("id", articleId);

  if (error) {
    alert("Error deleting article: " + error.message);
    return;
  }

  alert("Article deleted.");
  loadArticlesList();
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
  document.getElementById("faq-rows-wrap").innerHTML = "";
  faqRowCount = 0;

  if (articleId) {
    const { data: article } = await supabaseClient.from("articles").select("*").eq("id", articleId).single();
    if (article) {
      document.getElementById("form-article-title").value = article.title || "";
      document.getElementById("form-article-slug").value = article.slug || "";
      document.getElementById("form-article-slug").dataset.manuallyEdited = "true";
      document.getElementById("form-article-language").value = article.language || "en";
      document.getElementById("form-article-type").value = article.article_type || "article";
      quillEditor.root.innerHTML = article.content || "";
      document.getElementById("form-article-cover").value = article.cover_image_url || "";
      document.getElementById("form-article-seo-title").value = article.seo_title || "";
      document.getElementById("form-article-seo-description").value = article.seo_description || "";
      document.getElementById("form-article-geo").value = article.geo_tag || "";
      document.getElementById("form-article-plan-id").value = article.plan_id || "";
      document.getElementById("form-article-is-published").checked = article.is_published;
      document.getElementById("form-article-publish-at").value = article.publish_at ? article.publish_at.slice(0, 16) : "";

      if (article.faq_data) {
        try {
          const faqs = JSON.parse(article.faq_data);
          faqs.forEach((f) => addFAQRow(f.q, f.a));
        } catch (e) {
          console.error("Failed to parse faq_data", e);
        }
      }
    }
  } else {
    document.getElementById("form-article-language").value = "en";
    document.getElementById("form-article-type").value = "article";
    document.getElementById("form-article-is-published").checked = true;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeArticleForm() {
  document.getElementById("article-form-wrap").classList.add("hidden");
  editingArticleId = null;
}

// ===== FAQ 编辑区 =====
function addFAQRow(question, answer) {
  faqRowCount++;
  const wrap = document.getElementById("faq-rows-wrap");
  const row = document.createElement("div");
  row.className = "faq-edit-row";
  row.innerHTML = `
    <input type="text" placeholder="Question" class="faq-edit-question" value="${question ? question.replace(/"/g, "&quot;") : ""}" />
    <textarea placeholder="Answer" class="faq-edit-answer">${answer || ""}</textarea>
    <button type="button" class="btn-remove-faq" onclick="this.parentElement.remove()">✕ Remove</button>
  `;
  wrap.appendChild(row);
}

function collectFAQData() {
  const rows = document.querySelectorAll("#faq-rows-wrap .faq-edit-row");
  const faqs = [];
  rows.forEach((row) => {
    const q = row.querySelector(".faq-edit-question").value.trim();
    const a = row.querySelector(".faq-edit-answer").value.trim();
    if (q && a) faqs.push({ q, a });
  });
  return faqs.length > 0 ? JSON.stringify(faqs) : null;
}

async function saveArticle(e) {
  e.preventDefault();

  const articleData = {
    title: document.getElementById("form-article-title").value,
    slug: document.getElementById("form-article-slug").value,
    language: document.getElementById("form-article-language").value,
    article_type: document.getElementById("form-article-type").value,
    content: quillEditor.root.innerHTML,
    cover_image_url: document.getElementById("form-article-cover").value,
    seo_title: document.getElementById("form-article-seo-title").value,
    seo_description: document.getElementById("form-article-seo-description").value,
    geo_tag: document.getElementById("form-article-geo").value,
    plan_id: document.getElementById("form-article-plan-id").value || null,
    is_published: document.getElementById("form-article-is-published").checked,
    publish_at: document.getElementById("form-article-publish-at").value || null,
    faq_data: collectFAQData(),
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

// ===== 连结插入功能 =====
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
  const lang = document.getElementById("form-article-language").value;

  if (type === "external") {
    url = document.getElementById("link-external-url").value.trim();
    if (!url) {
      alert("Please enter a URL.");
      return;
    }
  } else if (type === "article") {
    const slug = document.getElementById("link-article-select").value;
    url = `/${lang}/blog/${slug}/`;
  } else if (type === "plan") {
    const val = document.getElementById("link-plan-select").value;
    const [providerSlug, planSlug] = val.split("|");
    url = `/${providerSlug}/${planSlug}/`;
  }

  quillEditor.formatText(range.index, range.length, "link", url);
  closeLinkModal();
}

// ===== WhatsApp 按钮插入功能 =====
function openWhatsAppModal() {
  document.getElementById("whatsapp-modal-text").value = "";
  document.getElementById("whatsapp-modal-message").value = "Hi NetBijak, I'm interested in this plan";
  document.getElementById("whatsapp-modal").classList.remove("hidden");
}
function closeWhatsAppModal() {
  document.getElementById("whatsapp-modal").classList.add("hidden");
}
function insertWhatsAppIntoEditor() {
  const btnText = document.getElementById("whatsapp-modal-text").value.trim() || "Apply via NetBijak";
  const msg = document.getElementById("whatsapp-modal-message").value.trim() || "Hi NetBijak, I'm interested";
  const waNumber = "60178835110";
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;

  const range = quillEditor.getSelection(true);
  const btnHtml = `<p><a href="${waLink}" target="_blank" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border-radius:10px;font-weight:700;text-decoration:none">${btnText}</a></p>`;
  quillEditor.clipboard.dangerouslyPasteHTML(range.index, btnHtml);
  closeWhatsAppModal();
}

document.addEventListener("DOMContentLoaded", initAdminArticlesPage);