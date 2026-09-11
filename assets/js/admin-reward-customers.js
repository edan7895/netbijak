// NetBijak.com - Admin Reward Customers 顾客登记管理

let currentEventId = null;
let currentEventName = "";
let allPlansForRewards = [];
let editingCustomerId = null;

async function initAdminRewardCustomersPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  const params = new URLSearchParams(window.location.search);
  currentEventId = params.get("event_id") ? parseInt(params.get("event_id"), 10) : null;
  currentEventName = params.get("event_name") || "";

  if (currentEventName) {
    document.getElementById("page-title").textContent = `Customers: ${currentEventName}`;
  }

  await loadEventOptions();
  await loadPlanOptions();
  await loadCustomersList();

  document.getElementById("btn-new-customer").addEventListener("click", () => openCustomerForm(null));
  document.getElementById("customer-form").addEventListener("submit", saveCustomer);
  document.getElementById("btn-cancel-customer-form").addEventListener("click", closeCustomerForm);
  document.getElementById("filter-event").addEventListener("change", () => {
    currentEventId = document.getElementById("filter-event").value || null;
    loadCustomersList();
  });
  document.getElementById("filter-date-start").addEventListener("change", loadCustomersList);
  document.getElementById("filter-date-end").addEventListener("change", loadCustomersList);
  document.getElementById("btn-clear-filters").addEventListener("click", clearFilters);

  let searchTimeout;
  document.getElementById("existing-customer-search").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length < 2) {
      document.getElementById("existing-customer-results").classList.add("hidden");
      return;
    }
    searchTimeout = setTimeout(() => searchExistingCustomers(query), 300);
  });
}

function escapeHtmlRC(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadEventOptions() {
  const { data: events } = await supabaseClient.from("reward_events").select("id, event_name").order("event_name");
  const select = document.getElementById("filter-event");
  const formSelect = document.getElementById("customer-event-id");

  const optionsHtml = (events || []).map((e) => `<option value="${e.id}">${escapeHtmlRC(e.event_name)}</option>`).join("");
  select.innerHTML = `<option value="">All Events</option>` + optionsHtml;
  formSelect.innerHTML = `<option value="">— No specific event —</option>` + optionsHtml;

  if (currentEventId) select.value = currentEventId;
}

async function loadPlanOptions() {
  const { data: plans } = await supabaseClient
    .from("plans")
    .select("id, name, providers(name)")
    .order("name");

  allPlansForRewards = plans || [];
  const formSelect = document.getElementById("customer-plan-id");
  formSelect.innerHTML =
    `<option value="">— Select plan —</option>` +
    allPlansForRewards.map((p) => `<option value="${p.id}">${p.providers ? p.providers.name + " - " : ""}${p.name}</option>`).join("");
}

function clearFilters() {
  document.getElementById("filter-event").value = "";
  document.getElementById("filter-date-start").value = "";
  document.getElementById("filter-date-end").value = "";
  currentEventId = null;
  loadCustomersList();
}

async function loadCustomersList() {
  const tbody = document.getElementById("customers-table-body");
  const countLabel = document.getElementById("customer-count-label");
  tbody.innerHTML = `<tr><td colspan="9">Loading...</td></tr>`;

  let query = supabaseClient
    .from("reward_customers")
    .select("*, reward_events(event_name), plans(name, providers(name)), reward_pins(pin_code, amount)")
    .order("application_date", { ascending: false });

  if (currentEventId) query = query.eq("event_id", currentEventId);

  const dateStart = document.getElementById("filter-date-start").value;
  const dateEnd = document.getElementById("filter-date-end").value;
  if (dateStart) query = query.gte("application_date", dateStart);
  if (dateEnd) query = query.lte("application_date", dateEnd);

  const { data: customers, error } = await query;

  if (error || !customers || customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#94a3b8">No customers found.</td></tr>`;
    countLabel.textContent = "0 customers";
    return;
  }

  countLabel.textContent = `${customers.length} customer${customers.length === 1 ? "" : "s"}`;

  tbody.innerHTML = customers
    .map((c) => {
      const eventName = c.reward_events ? c.reward_events.event_name : "-";
      const planName = c.plans ? `${c.plans.providers ? c.plans.providers.name + " - " : ""}${c.plans.name}` : "-";
      const installStatus = getInstallStatus(c.installation_date);
      const statusBadge = getStatusBadge(c.reward_status, c.is_excluded);
      const pinInfo = c.reward_pins ? `${c.reward_pins.pin_code} (RM${c.reward_pins.amount})` : "-";

      return `
      <tr>
        <td>${escapeHtmlRC(c.customer_name)}</td>
        <td>${escapeHtmlRC(c.email)}</td>
        <td>${escapeHtmlRC(eventName)}</td>
        <td>${escapeHtmlRC(planName)}</td>
        <td>${c.application_date || "-"}</td>
        <td>${c.installation_date || "-"} ${installStatus}</td>
        <td>${statusBadge}</td>
        <td style="font-size:0.75rem">${escapeHtmlRC(pinInfo)}</td>
        <td>
          <button class="btn-small" onclick="openCustomerForm(${c.id})">Edit</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function getInstallStatus(installationDate) {
  if (!installationDate) return `<span class="status-tag status-tag-gray">No install date</span>`;
  const oneMonthLater = new Date(installationDate);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const now = new Date();
  if (now >= oneMonthLater) {
    return `<span class="status-tag status-tag-green">1mo+ ✓</span>`;
  }
  return `<span class="status-tag status-tag-orange">Not yet 1mo</span>`;
}

function getStatusBadge(status, isExcluded) {
  if (isExcluded) return `<span class="status-tag status-tag-purple">Excluded</span>`;
  if (status === "sent") return `<span class="status-tag status-tag-green">TNG Sent</span>`;
  if (status === "manual_done") return `<span class="status-tag status-tag-green">Manual Done</span>`;
  return `<span class="status-tag status-tag-orange">Pending</span>`;
}

async function openCustomerForm(customerId) {
  editingCustomerId = customerId;
  document.getElementById("customer-form-wrap").classList.remove("hidden");
  document.getElementById("customer-form-title").textContent = customerId ? "Edit Customer" : "New Customer";
  document.getElementById("customer-form").reset();

  if (customerId) {
    const { data: c } = await supabaseClient.from("reward_customers").select("*").eq("id", customerId).single();
    if (c) {
      document.getElementById("customer-name-input").value = c.customer_name || "";
      document.getElementById("customer-email-input").value = c.email || "";
      document.getElementById("customer-event-id").value = c.event_id || "";
      document.getElementById("customer-plan-id").value = c.plan_id || "";
      document.getElementById("customer-application-date").value = c.application_date || "";
      document.getElementById("customer-installation-date").value = c.installation_date || "";
      document.getElementById("customer-is-excluded").checked = c.is_excluded || false;
      document.getElementById("customer-exclude-reason").value = c.exclude_reason || "";
    }
  } else if (currentEventId) {
    document.getElementById("customer-event-id").value = currentEventId;
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
    customer_name: document.getElementById("customer-name-input").value,
    email: document.getElementById("customer-email-input").value,
    event_id: document.getElementById("customer-event-id").value || null,
    plan_id: document.getElementById("customer-plan-id").value || null,
    application_date: document.getElementById("customer-application-date").value || null,
    installation_date: document.getElementById("customer-installation-date").value || null,
    is_excluded: document.getElementById("customer-is-excluded").checked,
    exclude_reason: document.getElementById("customer-exclude-reason").value || null,
  };

  let result;
  if (editingCustomerId) {
    result = await supabaseClient.from("reward_customers").update(customerData).eq("id", editingCustomerId);
  } else {
    result = await supabaseClient.from("reward_customers").insert(customerData);
  }

  if (result.error) {
    alert("Error saving customer: " + result.error.message);
    return;
  }

  alert("Customer saved!");
  closeCustomerForm();
  loadCustomersList();
}

async function searchExistingCustomers(query) {
  const resultsWrap = document.getElementById("existing-customer-results");

  const { data: matches } = await supabaseClient
    .from("customers")
    .select("id, customer_name, phone_number, email, plan_id, plans(name, providers(name))")
    .or(`customer_name.ilike.%${query}%,phone_number.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(8);

  if (!matches || matches.length === 0) {
    resultsWrap.innerHTML = `<div class="existing-customer-item" style="color:#94a3b8">No matches found.</div>`;
    resultsWrap.classList.remove("hidden");
    return;
  }

  resultsWrap.innerHTML = matches
    .map((c) => {
      const planName = c.plans ? `${c.plans.providers ? c.plans.providers.name + " - " : ""}${c.plans.name}` : "";
      return `
      <div class="existing-customer-item" onclick='fillFromExistingCustomer(${JSON.stringify({
        name: c.customer_name,
        email: c.email || "",
        plan_id: c.plan_id || "",
      }).replace(/'/g, "&apos;")})'>
        <strong>${escapeHtmlRC(c.customer_name)}</strong><br />
        <span>${escapeHtmlRC(c.phone_number || "")} ${c.email ? "· " + escapeHtmlRC(c.email) : ""} ${planName ? "· " + escapeHtmlRC(planName) : ""}</span>
      </div>
    `;
    })
    .join("");
  resultsWrap.classList.remove("hidden");
}

function fillFromExistingCustomer(data) {
  document.getElementById("customer-name-input").value = data.name || "";
  document.getElementById("customer-email-input").value = data.email || "";
  if (data.plan_id) document.getElementById("customer-plan-id").value = data.plan_id;
  document.getElementById("existing-customer-results").classList.add("hidden");
  document.getElementById("existing-customer-search").value = "";
}

document.addEventListener("DOMContentLoaded", initAdminRewardCustomersPage);