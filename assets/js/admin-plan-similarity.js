// NetBijak.com - Admin 配套内容相似度警告检视页面

async function initAdminPlanSimilarityPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  await loadPlanSimilarityWarnings();
}

function escapeHtmlPlanSim(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadPlanSimilarityWarnings() {
  const wrap = document.getElementById("plan-similarity-warnings-wrap");
  wrap.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;

  const { data: warnings, error } = await supabaseClient
    .from("plan_similarity_warnings")
    .select("*, plan_a:plan_a_id(id, name, slug, providers(name, slug)), plan_b:plan_b_id(id, name, slug, providers(name, slug))")
    .eq("is_dismissed", false)
    .order("similarity_score", { ascending: false });

  if (error || !warnings || warnings.length === 0) {
    wrap.innerHTML = `<p style="color:#94a3b8; padding:2rem; text-align:center">No similarity warnings found. Your plan content looks good!</p>`;
    return;
  }

  wrap.innerHTML = warnings
    .map((w) => {
      const pct = (w.similarity_score * 100).toFixed(1);
      const sourceLabel = w.content_source === "deep_analysis" ? "Deep Analysis" : "AI Overview";

      const planAUrl = w.plan_a.providers ? `/${w.plan_a.providers.slug}/${w.plan_a.slug}/` : "#";
      const planBUrl = w.plan_b.providers ? `/${w.plan_b.providers.slug}/${w.plan_b.slug}/` : "#";
      const planAProviderName = w.plan_a.providers ? w.plan_a.providers.name : "";
      const planBProviderName = w.plan_b.providers ? w.plan_b.providers.name : "";

      return `
      <div class="similarity-card">
        <div class="similarity-card-header">
          <span class="similarity-pct">${pct}% similar</span>
          <span class="lang-tag">${sourceLabel}</span>
          <button class="btn-small btn-dismiss" onclick="dismissPlanWarning(${w.id})">Dismiss</button>
        </div>
        <div class="similarity-articles">
          <a href="${planAUrl}" target="_blank" class="similarity-article-link">
            📦 ${escapeHtmlPlanSim(planAProviderName)} - ${escapeHtmlPlanSim(w.plan_a.name)}
          </a>
          <span class="similarity-vs">vs</span>
          <a href="${planBUrl}" target="_blank" class="similarity-article-link">
            📦 ${escapeHtmlPlanSim(planBProviderName)} - ${escapeHtmlPlanSim(w.plan_b.name)}
          </a>
        </div>
      </div>
    `;
    })
    .join("");
}

async function dismissPlanWarning(warningId) {
  const { error } = await supabaseClient
    .from("plan_similarity_warnings")
    .update({ is_dismissed: true })
    .eq("id", warningId);

  if (error) {
    alert("Error dismissing warning: " + error.message);
    return;
  }

  loadPlanSimilarityWarnings();
}

document.addEventListener("DOMContentLoaded", initAdminPlanSimilarityPage);