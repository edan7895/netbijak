// NetBijak.com - Admin 文章管理逻辑（Quill + Banner + Link + FAQ + WhatsApp + CTA按钮 + 表格）

let editingArticleId = null;
let quillEditor = null;
let allPlansCache = [];
let allArticlesCache = [];
let faqRowCount = 0;
let tableRows = 3;
let tableCols = 2;

function convertLocalToISOString(datetimeLocalValue) {
  if (!datetimeLocalValue) return null;
  // datetimeLocalValue 格式类似 "2026-09-04T14:00"，视为马来西亚时间 (UTC+8)
  // 直接拼接 +08:00 时区信息，不依赖浏览器/装置本身的时区设定
  return new Date(datetimeLocalValue + ":00+08:00").toISOString();
}

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
  document.getElementById("btn-insert-table").addEventListener("click", openTableModal);
  document.getElementById("btn-insert-cta").addEventListener("click", openCtaModal);
  document.getElementById("btn-add-faq-row").addEventListener("click", () => addFAQRow());

  document.getElementById("banner-modal-insert").addEventListener("click", insertBannerIntoEditor);
  document.getElementById("banner-modal-cancel").addEventListener("click", closeBannerModal);

  document.getElementById("link-modal-insert").addEventListener("click", insertLinkIntoEditor);
  document.getElementById("link-modal-cancel").addEventListener("click", closeLinkModal);
  document.getElementById("link-target-type").addEventListener("change", updateLinkTargetOptions);

  document.getElementById("whatsapp-modal-insert").addEventListener("click", insertWhatsAppIntoEditor);
  document.getElementById("whatsapp-modal-cancel").addEventListener("click", closeWhatsAppModal);

  document.getElementById("table-modal-rows").addEventListener("change", rebuildTableGrid);
  document.getElementById("table-modal-cols").addEventListener("change", rebuildTableGrid);
  document.getElementById("table-modal-insert").addEventListener("click", insertTableIntoEditor);
  document.getElementById("table-modal-cancel").addEventListener("click", closeTableModal);

  document.getElementById("cta-modal-insert").addEventListener("click", insertCtaIntoEditor);
  document.getElementById("cta-modal-cancel").addEventListener("click", closeCtaModal);
  document.getElementById("cta-modal-type").addEventListener("change", updateCtaPreviewText);
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

function setEditorContent(html) {
  quillEditor.root.innerHTML = html || "";
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

  let query = supabaseClient.from("articles").select("*");
  if (language) query = query.eq("language", language);

  const { data: articles, error } = await query;

  if (error || !articles || articles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8">No articles found.</td></tr>`;
    return;
  }

  const sorted = articles.sort((a, b) => {
    const dateA = new Date(a.publish_at || a.created_at);
    const dateB = new Date(b.publish_at || b.created_at);
    return dateB - dateA;
  });

  tbody.innerHTML = sorted
    .map((a) => {
      const displayDate = a.publish_at || a.created_at;
      const dateStr = new Date(displayDate).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });
      const typeLabel = a.article_type === "news" ? "News" : "Article";

      const now = new Date();
      const isScheduled = a.is_published && a.publish_at && new Date(a.publish_at) > now;
      let statusBadge;
      if (!a.is_published) {
        statusBadge = '<span class="badge-unpublished">Draft</span>';
      } else if (isScheduled) {
        statusBadge = '<span class="badge-scheduled">Scheduled</span>';
      } else {
        statusBadge = '<span class="badge-published">Published</span>';
      }

      return `
      <tr>
        <td>${a.title}</td>
        <td><span class="lang-tag">${(a.language || "-").toUpperCase()}</span></td>
        <td><span class="type-tag">${typeLabel}</span></td>
        <td>${dateStr}</td>
        <td>${statusBadge}</td>
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
  setEditorContent("");
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
      document.getElementById("form-article-translation-key").value = article.translation_key || "";
      setEditorContent(article.content || "");
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
    translation_key: document.getElementById("form-article-translation-key").value || null,
    content: quillEditor.root.innerHTML,
    cover_image_url: document.getElementById("form-article-cover").value,
    seo_title: document.getElementById("form-article-seo-title").value,
    seo_description: document.getElementById("form-article-seo-description").value,
    geo_tag: document.getElementById("form-article-geo").value,
    plan_id: document.getElementById("form-article-plan-id").value || null,
    is_published: document.getElementById("form-article-is-published").checked,
    publish_at: document.getElementById("form-article-is-published").checked
      ? (document.getElementById("form-article-publish-at").value
          ? convertLocalToISOString(document.getElementById("form-article-publish-at").value)
          : new Date().toISOString())
      : null,
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

  const waIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white" style="vertical-align:middle;margin-right:8px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

  const range = quillEditor.getSelection(true);
  const btnHtml = `<p><a href="${waLink}" target="_blank" style="display:inline-flex;align-items:center;padding:12px 28px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border-radius:10px;font-weight:700;text-decoration:none">${waIconSvg}${btnText}</a></p>`;
  quillEditor.clipboard.dangerouslyPasteHTML(range.index, btnHtml);
  closeWhatsAppModal();
}

// ===== 表格插入功能（手动填格子内容，保证格式正确） =====
function openTableModal() {
  tableRows = 3;
  tableCols = 2;
  document.getElementById("table-modal-rows").value = 3;
  document.getElementById("table-modal-cols").value = 2;
  document.getElementById("table-modal-header").checked = true;
  rebuildTableGrid();
  document.getElementById("table-modal").classList.remove("hidden");
}
function closeTableModal() {
  document.getElementById("table-modal").classList.add("hidden");
}
function rebuildTableGrid() {
  tableRows = Math.max(1, Math.min(20, parseInt(document.getElementById("table-modal-rows").value, 10) || 1));
  tableCols = Math.max(1, Math.min(10, parseInt(document.getElementById("table-modal-cols").value, 10) || 1));

  const gridWrap = document.getElementById("table-modal-grid");
  let html = "";
  for (let r = 0; r < tableRows; r++) {
    html += `<div class="table-modal-row">`;
    for (let c = 0; c < tableCols; c++) {
      html += `<input type="text" class="table-modal-cell" data-row="${r}" data-col="${c}" placeholder="${r === 0 ? "Header " + (c + 1) : "Row " + r + " Col " + (c + 1)}" />`;
    }
    html += `</div>`;
  }
  gridWrap.innerHTML = html;
}
function insertTableIntoEditor() {
  const hasHeader = document.getElementById("table-modal-header").checked;
  const cells = document.querySelectorAll("#table-modal-grid .table-modal-cell");

  const grid = [];
  for (let r = 0; r < tableRows; r++) grid.push(new Array(tableCols).fill(""));
  cells.forEach((cell) => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    grid[r][c] = cell.value.trim();
  });

  let tableHtml = "<table>";
  grid.forEach((row, rIndex) => {
    const isHeaderRow = hasHeader && rIndex === 0;
    const tag = isHeaderRow ? "th" : "td";
    tableHtml += "<tr>";
    row.forEach((cellText) => {
      tableHtml += `<${tag}>${cellText}</${tag}>`;
    });
    tableHtml += "</tr>";
  });
  tableHtml += "</table><p><br></p>";

  const range = quillEditor.getSelection(true);
  quillEditor.clipboard.dangerouslyPasteHTML(range.index, tableHtml);
  closeTableModal();
}

// ===== Find My Plan / Compare CTA 按钮插入功能 =====
const CTA_TEXTS = {
  find: { en: "Find My Plan →", zh: "为我找配套 →", ms: "Cari Pelan Saya →" },
  compare: { en: "Compare Plans →", zh: "比较配套 →", ms: "Bandingkan Pelan →" },
};
const CTA_PATHS = {
  find: "find-your-plan",
  compare: "compare",
};

function openCtaModal() {
  document.getElementById("cta-modal-type").value = "find";
  updateCtaPreviewText();
  document.getElementById("cta-modal").classList.remove("hidden");
}
function closeCtaModal() {
  document.getElementById("cta-modal").classList.add("hidden");
}
function updateCtaPreviewText() {
  const type = document.getElementById("cta-modal-type").value;
  const lang = document.getElementById("form-article-language").value || "en";
  document.getElementById("cta-modal-preview-text").value = CTA_TEXTS[type][lang] || CTA_TEXTS[type].en;
}
function insertCtaIntoEditor() {
  const type = document.getElementById("cta-modal-type").value;
  const lang = document.getElementById("form-article-language").value || "en";
  const customText = document.getElementById("cta-modal-preview-text").value.trim();
  const btnText = customText || CTA_TEXTS[type][lang] || CTA_TEXTS[type].en;
  const url = `/${lang}/${CTA_PATHS[type]}/`;

  const icon = type === "find" ? "🎯" : "⚖️";

  const range = quillEditor.getSelection(true);
  const btnHtml = `<p style="text-align:center"><a href="${url}" style="display:inline-flex;align-items:center;gap:10px;padding:14px 32px;background:linear-gradient(135deg,#0f172a,#0ea5e9,#14b8a6);color:#fff;border-radius:14px;font-weight:800;text-decoration:none;font-size:1rem"><span style="font-size:1.2rem">${icon}</span>${btnText}</a></p>`;
  quillEditor.clipboard.dangerouslyPasteHTML(range.index, btnHtml);
  closeCtaModal();
}

document.addEventListener("DOMContentLoaded", initAdminArticlesPage);