// NetBijak.com - Admin Rewards：检视某个Event底下的顾客，管理Excluded状态

let viewingEventId = null;

async function initAdminRewardViewPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  const params = new URLSearchParams(window.location.search);
  viewingEventId = params.get("event_id");
  const eventName = params.get("event_name") || "";
  document.getElementById("page-title").textContent = eventName ? `Customers: ${eventName}` : "Reward Customers";

  await loadRewardCustomers();
}

function escapeHtmlRV(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getInstallStatusRV(installationDate) {
  if (!installationDate) return `<span class="badge-neutral">No install date</span>`;
  const oneMonthLater = new Date(installationDate);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const now = new Date();
  if (now >= oneMonthLater) return `<span class="badge-ok">1mo+ ✓</span>`;
  return `<span class="badge-soon">Not yet 1mo</span>`;
}

async function loadRewardCustomers() {
  const tbody = document.getElementById("reward-customers-table-body");
  const countLabel = document.getElementById("customer-count-label");
  tbody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;

  if (!viewingEventId) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8">No event selected.</td></tr>`;
    return;
  }

  const { data: customers, error } = await supabaseClient
    .from("customers")
    .select("*, plans(name, providers(name))")
    .eq("reward_event_id", viewingEventId)
    .order("signup_date", { ascending: false });

  if (error || !customers || customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8">No customers registered for this event yet.</td></tr>`;
    countLabel.textContent = "0 customers";
    return;
  }

  countLabel.textContent = `${customers.length} customer${customers.length === 1 ? "" : "s"}`;

  tbody.innerHTML = customers
    .map((c) => {
      const planName = c.plans ? `${c.plans.providers ? c.plans.providers.name + " - " : ""}${c.plans.name}` : "-";
      const installStatus = getInstallStatusRV(c.installation_date);
      const statusBadge = c.is_excluded
        ? `<span class="badge-excluded">Excluded</span>`
        : c.reward_status === "sent"
        ? `<span class="badge-ok">TNG Sent</span>`
        : `<span class="badge-soon">Pending</span>`;

      return `
      <tr>
        <td>${escapeHtmlRV(c.customer_name)}</td>
        <td>${escapeHtmlRV(c.email || "-")}</td>
        <td>${escapeHtmlRV(planName)}</td>
        <td>${c.installation_date || "-"} ${installStatus}</td>
        <td>${statusBadge}</td>
        <td>
          <label style="display:flex; align-items:center; gap:6px; font-size:0.8rem">
            <input type="checkbox" ${c.is_excluded ? "checked" : ""} onchange="toggleExcluded(${c.id}, this.checked)" />
            Excluded
          </label>
        </td>
        <td>
          <input type="text" value="${escapeHtmlRV(c.exclude_reason || "")}" placeholder="Reason..." 
                 style="width:140px; padding:5px 8px; border-radius:6px; border:1px solid #cbd5e1; font-size:0.75rem"
                 onblur="saveExcludeReason(${c.id}, this.value)" />
        </td>
      </tr>
    `;
    })
    .join("");
}

async function toggleExcluded(customerId, isExcluded) {
  const { error } = await supabaseClient
    .from("customers")
    .update({ is_excluded: isExcluded })
    .eq("id", customerId);

  if (error) {
    alert("Error updating: " + error.message);
    loadRewardCustomers();
  }
}

async function saveExcludeReason(customerId, reason) {
  await supabaseClient.from("customers").update({ exclude_reason: reason || null }).eq("id", customerId);
}

document.addEventListener("DOMContentLoaded", initAdminRewardViewPage);