// NetBijak.com - Admin Analytics 仪表板逻辑

let currentRangeStart = null;
let currentRangeEnd = null;

async function initAdminAnalyticsPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  document.querySelectorAll(".date-range-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".date-range-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyPresetRange(btn.dataset.range);
    });
  });

  document.getElementById("btn-apply-custom-range").addEventListener("click", () => {
    document.querySelectorAll(".date-range-btn").forEach((b) => b.classList.remove("active"));
    const start = document.getElementById("custom-range-start").value;
    const end = document.getElementById("custom-range-end").value;
    if (!start || !end) {
      alert("Please select both start and end dates.");
      return;
    }
    currentRangeStart = new Date(start + "T00:00:00");
    currentRangeEnd = new Date(end + "T23:59:59");
    loadAnalyticsData();
  });

  document.getElementById("btn-delete-range").addEventListener("click", deleteDataInRange);

  applyPresetRange("today");
}

function applyPresetRange(rangeKey) {
  const now = new Date();
  let start, end;

  if (rangeKey === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (rangeKey === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
    end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
  } else if (rangeKey === "7d") {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (rangeKey === "30d") {
    start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (rangeKey === "1y") {
    start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  }

  currentRangeStart = start;
  currentRangeEnd = end;
  loadAnalyticsData();
}

async function loadAnalyticsData() {
  const summaryWrap = document.getElementById("analytics-summary");
  summaryWrap.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;

  const startIso = currentRangeStart.toISOString();
  const endIso = currentRangeEnd.toISOString();

  const { data: pageViews, error: pvError } = await supabaseClient
    .from("page_views")
    .select("page_path, created_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const { data: waClicks, error: waError } = await supabaseClient
    .from("whatsapp_clicks")
    .select("provider_slug, page_path, created_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (pvError || waError) {
    summaryWrap.innerHTML = `<p style="color:#dc2626">Error loading data.</p>`;
    return;
  }

  renderSummary(pageViews || [], waClicks || []);
  renderPagePathBreakdown(pageViews || []);
  renderProviderBreakdown(waClicks || []);
}

function renderSummary(pageViews, waClicks) {
  const wrap = document.getElementById("analytics-summary");
  wrap.innerHTML = `
    <div class="analytics-stat-card">
      <div class="analytics-stat-number">${pageViews.length}</div>
      <div class="analytics-stat-label">Total Page Views</div>
    </div>
    <div class="analytics-stat-card">
      <div class="analytics-stat-number">${waClicks.length}</div>
      <div class="analytics-stat-label">WhatsApp Clicks</div>
    </div>
  `;
}

function renderPagePathBreakdown(pageViews) {
  const wrap = document.getElementById("page-breakdown-list");
  const counts = {};
  pageViews.forEach((pv) => {
    counts[pv.page_path] = (counts[pv.page_path] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);

  if (sorted.length === 0) {
    wrap.innerHTML = `<p style="color:#94a3b8; padding:1rem">No data for this range.</p>`;
    return;
  }

  wrap.innerHTML = sorted
    .map(
      ([path, count]) => `
    <div class="breakdown-row">
      <span class="breakdown-path">${path}</span>
      <span class="breakdown-count">${count}</span>
    </div>
  `
    )
    .join("");
}

function renderProviderBreakdown(waClicks) {
  const wrap = document.getElementById("provider-breakdown-list");
  const counts = {};
  waClicks.forEach((c) => {
    const key = c.provider_slug || "(Unspecified / Compare / Other)";
    counts[key] = (counts[key] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    wrap.innerHTML = `<p style="color:#94a3b8; padding:1rem">No data for this range.</p>`;
    return;
  }

  wrap.innerHTML = sorted
    .map(
      ([provider, count]) => `
    <div class="breakdown-row">
      <span class="breakdown-path">${provider}</span>
      <span class="breakdown-count">${count}</span>
    </div>
  `
    )
    .join("");
}

async function deleteDataInRange() {
  const start = document.getElementById("delete-range-start").value;
  const end = document.getElementById("delete-range-end").value;

  if (!start || !end) {
    alert("Please select both start and end dates to delete.");
    return;
  }

  const confirmed = confirm(
    `Are you sure you want to permanently delete all analytics data from ${start} to ${end}? This cannot be undone.`
  );
  if (!confirmed) return;

  const confirmedAgain = confirm(`This is your final confirmation. Delete data from ${start} to ${end}?`);
  if (!confirmedAgain) return;

  const startIso = new Date(start + "T00:00:00").toISOString();
  const endIso = new Date(end + "T23:59:59").toISOString();

  const { error: pvError } = await supabaseClient
    .from("page_views")
    .delete()
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const { error: waError } = await supabaseClient
    .from("whatsapp_clicks")
    .delete()
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (pvError || waError) {
    alert("Error deleting data.");
    return;
  }

  alert("Data deleted successfully.");
  loadAnalyticsData();
}

document.addEventListener("DOMContentLoaded", initAdminAnalyticsPage);