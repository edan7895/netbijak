// NetBijak.com - Admin 顾客管理逻辑（含合约提醒 + Rewards活动追踪）

const WHATSAPP_NUMBER_ADMIN = "60178835110";

let editingCustomerId = null;
let allPlansForCustomerForm = [];
let allEventsForCustomerForm = [];

async function initAdminCustomersPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  await loadPlanOptionsForCustomer();
  await loadEventOptionsForCustomer();
  await loadCustomersList();

  document.getElementById("filter-expiry").addEventListener("change", loadCustomersList);
  document.getElementById("btn-new-customer").addEventListener("click", () => openCustomerForm(null));
  document.getElementById("customer-form").addEventListener("submit", saveCustomer);
  document.getElementById("btn-cancel-customer-form").addEventListener("click", closeCustomerForm);
}

async function loadPlanOptionsForCustomer() {
  const { data: plans } = await supabaseClient
    .from("plans")
    .select("id, name, providers(name)")
    .order("name", { ascending: true });

  allPlansForCustomerForm = plans || [];

  const select = document.getElementById("form-customer-plan-id");
  select.innerHTML = allPlansForCustomerForm
    .map((p) => `<option value="${p.id}">${p.providers ? p.providers.name + " - " : ""}${p.name}</option>`)
    .join("");
}

async function loadEventOptionsForCustomer() {
  const { data: events } = await supabaseClient
    .from("reward_events")
    .select("id, event_name")
    .order("event_name", { ascending: true });

  allEventsForCustomerForm = events || [];

  const select = document.getElementById("form-customer-event-id");
  select.innerHTML =
    `<option value="">— No reward event —</option>` +
    allEventsForCustomerForm.map((e) => `<option value="${e.id}">${escapeHtmlCustomers(e.event_name)}</option>`).join("");
}

function escapeHtmlCustomers(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diffMs = target - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getInstallStatus(installationDate) {
  if (!installationDate) return "";
  const oneMonthLater = new Date(installationDate);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const now = new Date();
  if (now >= oneMonthLater) {
    return `<span class="badge-ok" style="margin-left:4px">1mo+ ✓</span>`;
  }
  return `<span class="badge-soon" style="margin-left:4px">Not yet 1mo</span>`;
}

function getRewardStatusBadge(status, isExcluded) {
  if (isExcluded) return `<span class="badge-excluded">Excluded</span>`;
  if (status === "sent") return `<span class="badge-ok">TNG Sent</span>`;
  if (status === "manual_done") return `<span class="badge-ok">Manual Done</span>`;
  return `<span class="badge-soon">Pending</span>`;
}

async function loadCustomersList() {
  const tbody = document.getElementById("customers-table-body");
  tbody.innerHTML = `<tr><td colspan="9">Loading...</td></tr>`;

  const expiryFilter = document.getElementById("filter-expiry").value;

  let query = supabaseClient
    .from("customers")
    .select("*, plans(name, providers(name, color_hex)), reward_events(event_name)")
    .order("contract_end_date", { ascending: true, nullsFirst: false });

  const { data: customers, error } = await query;

  if (error || !customers || customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#94a3b8">No customers found.</td></tr>`;
    return;
  }

  let filtered = customers;
  if (expiryFilter === "30") {
    filtered = customers.filter((c) => {
      const d = daysUntil(c.contract_end_date);
      return d !== null && d <= 30 && d >= 0;
    });
  } else if (expiryFilter === "overdue") {
    filtered = customers.filter((c) => {
      const d = daysUntil(c.contract_end_date);
      return d !== null && d < 0;
    });
  } else if (expiryFilter === "reward_pending") {
    filtered = customers.filter((c) => c.reward_event_id && c.reward_status === "pending" && !c.is_excluded);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#94a3b8">No customers match this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((c) => {
      const planName = c.plans ? c.plans.name : "-";
      const providerName = c.plans && c.plans.providers ? c.plans.providers.name : "";
      const days = daysUntil(c.contract_end_date);
      const eventName = c.reward_events ? c.reward_events.event_name : "-";

      let expiryBadge = `<span class="badge-neutral">-</span>`;
      if (days !== null) {
        if (days < 0) expiryBadge = `<span class="badge-overdue">Overdue ${Math.abs(days)}d</span>`;
        else if (days <= 30) expiryBadge = `<span class="badge-soon">${days}d left</span>`;
        else expiryBadge = `<span class="badge-ok">${days}d left</span>`;
      }

      const waMsg = `Hi ${c.customer_name}, this is NetBijak. Your ${planName} plan is expiring soon. Would you like to renew or explore a better plan?`;
      const waLink = `https://wa.me/${normalizePhone(c.phone_number)}?text=${encodeURIComponent(waMsg)}`;

      const rewardInfo = c.reward_event_id
        ? `${escapeHtmlCustomers(eventName)}<br />${getRewardStatusBadge(c.reward_status, c.is_excluded)} ${getInstallStatus(c.installation_date)}`
        : `<span class="badge-neutral">-</span>`;

      return `
      <tr>
        <td>${escapeHtmlCustomers(c.customer_name)}</td>
        <td>${c.phone_number || "-"}</td>
        <td style="font-size:0.8rem">${escapeHtmlCustomers(c.email || "-")}</td>
        <td>${providerName ? providerName + " - " : ""}${planName}</td>
        <td>${c.contract_end_date || "-"}</td>
        <td>${expiryBadge}</td>
        <td style="font-size:0.8rem">${rewardInfo}</td>
        <td><a href="${waLink}" target="_blank" class="btn-whatsapp-small">💬 WhatsApp</a></td>
        <td><button class="btn-small" onclick="openCustomerForm(${c.id})">Edit</button></td>
      </tr>
    `;
    })
    .join("");
}

function normalizePhone(phone) {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) cleaned = "6" + cleaned;
  if (!cleaned.startsWith("60")) cleaned = "60" + cleaned;
  return cleaned;
}

async function openCustomerForm(customerId) {
  editingCustomerId = customerId;
  document.getElementById("customer-form-wrap").classList.remove("hidden");
  document.getElementById("customer-form-title-label").textContent = customerId ? "Edit Customer" : "New Customer";
  document.getElementById("customer-form").reset();
  toggleExcludeReasonVisibility();

  if (customerId) {
    const { data: customer } = await supabaseClient.from("customers").select("*").eq("id", customerId).single();
    if (customer) {
      document.getElementById("form-customer-name").value = customer.customer_name || "";
      document.getElementById("form-customer-phone").value = customer.phone_number || "";
      document.getElementById("form-customer-email").value = customer.email || "";
      document.getElementById("form-customer-ic-last6").value = customer.ic_last6 || "";
      document.getElementById("form-customer-plan-id").value = customer.plan_id || "";
      document.getElementById("form-customer-signup-date").value = customer.signup_date || "";
      document.getElementById("form-customer-end-date").value = customer.contract_end_date || "";
      document.getElementById("form-customer-notes").value = customer.notes || "";
      document.getElementById("form-customer-reminder-sent").checked = customer.reminder_sent;

      document.getElementById("form-customer-event-id").value = customer.reward_event_id || "";
      document.getElementById("form-customer-installation-date").value = customer.installation_date || "";
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}


function closeCustomerForm() {
  document.getElementById("customer-form-wrap").classList.add("hidden");
  editingCustomerId = null;
}

async function saveCustomer(e) {
  e.preventDefault();

  const customerData = {
    customer_name: document.getElementById("form-customer-name").value,
    phone_number: document.getElementById("form-customer-phone").value,
    email: document.getElementById("form-customer-email").value || null,
    ic_last6: document.getElementById("form-customer-ic-last6").value || null,
    plan_id: document.getElementById("form-customer-plan-id").value || null,
    signup_date: document.getElementById("form-customer-signup-date").value || null,
    contract_end_date: document.getElementById("form-customer-end-date").value || null,
    notes: document.getElementById("form-customer-notes").value,
    reminder_sent: document.getElementById("form-customer-reminder-sent").checked,
    reward_event_id: document.getElementById("form-customer-event-id").value || null,
    installation_date: document.getElementById("form-customer-installation-date").value || null,
  };

  let result;
  if (editingCustomerId) {
    result = await supabaseClient.from("customers").update(customerData).eq("id", editingCustomerId);
  } else {
    result = await supabaseClient.from("customers").insert(customerData);
  }

  if (result.error) {
    alert("Error saving customer: " + result.error.message);
    return;
  }

  alert("Customer saved successfully!");
  closeCustomerForm();
  loadCustomersList();
}

document.addEventListener("DOMContentLoaded", initAdminCustomersPage);