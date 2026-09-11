// NetBijak.com - Admin 内容相似度警告检视页面

async function initAdminSimilarityPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  await loadSimilarityWarnings();
}

function escapeHtmlSim(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadSimilarityWarnings() {
  const wrap = document.getElementById("similarity-warnings-wrap");
  wrap.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;

  const { data: warnings, error } = await supabaseClient
    .from("content_similarity_warnings")
    .select("*, article_a:article_a_id(id, title, slug, language), article_b:article_b_id(id, title, slug, language)")
    .eq("is_dismissed", false)
    .order("similarity_score", { ascending: false });

  if (error || !warnings || warnings.length === 0) {
    wrap.innerHTML = `<p style="color:#94a3b8; padding:2rem; text-align:center">No similarity warnings found. Your content looks good!</p>`;
    return;
  }

  wrap.innerHTML = warnings
    .map((w) => {
      const pct = (w.similarity_score * 100).toFixed(1);
      const langBadge = w.language.toUpperCase();

      return `
      <div class="similarity-card">
        <div class="similarity-card-header">
          <span class="similarity-pct">${pct}% similar</span>
          <span class="lang-tag">${langBadge}</span>
          <button class="btn-small btn-dismiss" onclick="dismissWarning(${w.id})">Dismiss</button>
        </div>
        <div class="similarity-articles">
          <a href="/${w.article_a.language}/blog/${w.article_a.slug}/" target="_blank" class="similarity-article-link">
            📄 ${escapeHtmlSim(w.article_a.title)}
          </a>
          <span class="similarity-vs">vs</span>
          <a href="/${w.article_b.language}/blog/${w.article_b.slug}/" target="_blank" class="similarity-article-link">
            📄 ${escapeHtmlSim(w.article_b.title)}
          </a>
        </div>
      </div>
    `;
    })
    .join("");
}

async function dismissWarning(warningId) {
  const { error } = await supabaseClient
    .from("content_similarity_warnings")
    .update({ is_dismissed: true })
    .eq("id", warningId);

  if (error) {
    alert("Error dismissing warning: " + error.message);
    return;
  }

  loadSimilarityWarnings();
}

document.addEventListener("DOMContentLoaded", initAdminSimilarityPage);