// NetBijak.com - Admin Social Media 内容管理

let allSocialArticles = [];
let currentFilterStatus = "pending";

async function initAdminSocialPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  document.querySelectorAll(".filter-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-status-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilterStatus = btn.dataset.status;
      renderSocialList();
    });
  });

  await loadSocialArticles();
}

function escapeHtmlSocial(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadSocialArticles() {
  const wrap = document.getElementById("social-list-wrap");
  wrap.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;

  const { data: articles, error } = await supabaseClient
    .from("articles")
    .select("id, title, slug, language, social_caption, social_cards_generated_path, social_fb_posted, social_ig_posted, publish_at, created_at")
    .eq("is_published", true)
    .not("social_caption", "is", null)
    .order("created_at", { ascending: false });

  if (error || !articles) {
    wrap.innerHTML = `<p style="color:#dc2626">Error loading articles.</p>`;
    return;
  }

  allSocialArticles = articles;
  renderSocialList();
}

function renderSocialList() {
  const wrap = document.getElementById("social-list-wrap");

  let filtered = allSocialArticles;
  if (currentFilterStatus === "pending") {
    filtered = allSocialArticles.filter((a) => !a.social_fb_posted || !a.social_ig_posted);
  } else if (currentFilterStatus === "done") {
    filtered = allSocialArticles.filter((a) => a.social_fb_posted && a.social_ig_posted);
  }

  if (filtered.length === 0) {
    wrap.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:2rem">No articles found.</p>`;
    return;
  }

  wrap.innerHTML = filtered
    .map((a) => {
      const langLabel = { en: "EN", zh: "ZH", ms: "MS" }[a.language] || a.language;
      const articleUrl = `https://netbijak.com/${a.language}/blog/${a.slug}/`;
      const findPlanUrl = `https://netbijak.com/${a.language}/find-your-plan/`;

      const cardsHtml = a.social_cards_generated_path
        ? [1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<a href="${a.social_cards_generated_path}card-${n}.webp" target="_blank" class="social-card-thumb-link">
                  <img src="${a.social_cards_generated_path}card-${n}.webp" alt="Card ${n}" class="social-card-thumb" />
                </a>`
            )
            .join("")
        : `<p style="color:#94a3b8; font-size:0.8rem">Cards not generated yet.</p>`;

      const captionForCopy = `${a.social_caption}\n\n📖 Read more: ${articleUrl}\n🎯 Find your plan: ${findPlanUrl}`;

      return `
      <div class="social-article-card">
        <div class="social-article-header">
          <span class="lang-tag">${langLabel}</span>
          <h3>${escapeHtmlSocial(a.title)}</h3>
        </div>

        <p class="social-caption-preview">${escapeHtmlSocial(a.social_caption)}</p>

        <div class="social-cards-row">${cardsHtml}</div>

        <div class="social-actions-row">
          <button class="btn-copy-caption" data-copy-text="${escapeHtmlSocial(captionForCopy)}" onclick="copySocialCaption(this)">📋 Copy Caption + Links</button>
        </div>

        <div class="social-checkbox-row">
          <label>
            <input type="checkbox" ${a.social_fb_posted ? "checked" : ""} onchange="togglePostedStatus(${a.id}, 'social_fb_posted', this.checked)" />
            Facebook Posted
          </label>
          <label>
            <input type="checkbox" ${a.social_ig_posted ? "checked" : ""} onchange="togglePostedStatus(${a.id}, 'social_ig_posted', this.checked)" />
            Instagram Posted
          </label>
        </div>
      </div>
    `;
    })
    .join("");
}

function copySocialCaption(btn) {
  const text = btn.dataset.copyText.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = btn.textContent;
      btn.textContent = "✅ Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    });
  } else {
    // 备用方式，给不支援clipboard API的旧浏览器
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    alert("Copied!");
  }
}

async function togglePostedStatus(articleId, field, value) {
  const { error } = await supabaseClient
    .from("articles")
    .update({ [field]: value })
    .eq("id", articleId);

  if (error) {
    alert("Error updating status: " + error.message);
    return;
  }

  const article = allSocialArticles.find((a) => a.id === articleId);
  if (article) article[field] = value;
}

document.addEventListener("DOMContentLoaded", initAdminSocialPage);