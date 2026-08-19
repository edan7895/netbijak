// NetBijak.com - Admin 顾客管理逻辑

const WHATSAPP_NUMBER_ADMIN = "60109316707"; // ⚠️ 改成你的真实WhatsApp Business号码（发提醒用）

let editingCustomerId = null;
let allPlansForCustomerForm = [];

async function initAdminCustomersPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  await loadPlanOptionsForCustomer();
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

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diffMs = target - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

async function loadCustomersList() {
  const tbody = document.getElementById("customers-table-body");
  tbody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;

  const expiryFilter = document.getElementById("filter-expiry").value;

  let query = supabaseClient
    .from("customers")
    .select("*, plans(name, providers(name, color_hex))")
    .order("contract_end_date", { ascending: true, nullsFirst: false });

  const { data: customers, error } = await query;

  if (error || !customers || customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8">No customers found.</td></tr>`;
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
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8">No customers match this filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((c) => {
      const planName = c.plans ? c.plans.name : "-";
      const providerName = c.plans && c.plans.providers ? c.plans.providers.name : "";
      const days = daysUntil(c.contract_end_date);

      let expiryBadge = `<span class="badge-neutral">-</span>`;
      if (days !== null) {
        if (days < 0) expiryBadge = `<span class="badge-overdue">Overdue ${Math.abs(days)}d</span>`;
        else if (days <= 30) expiryBadge = `<span class="badge-soon">${days}d left</span>`;
        else expiryBadge = `<span class="badge-ok">${days}d left</span>`;
      }

      const waMsg = `Hi ${c.customer_name}, this is NetBijak. Your ${planName} plan is expiring soon. Would you like to renew or explore a better plan?`;
      const waLink = `https://wa.me/${normalizePhone(c.phone_number)}?text=${encodeURIComponent(waMsg)}`;

      return `
      <tr>
        <td>${c.customer_name}</td>
        <td>${c.phone_number || "-"}</td>
        <td>${providerName ? providerName + " - " : ""}${planName}</td>
        <td>${c.contract_end_date || "-"}</td>
        <td>${expiryBadge}</td>
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

  if (customerId) {
    const { data: customer } = await supabaseClient.from("customers").select("*").eq("id", customerId).single();
    if (customer) {
      document.getElementById("form-customer-name").value = customer.customer_name || "";
      document.getElementById("form-customer-phone").value = customer.phone_number || "";
      document.getElementById("form-customer-plan-id").value = customer.plan_id || "";
      document.getElementById("form-customer-signup-date").value = customer.signup_date || "";
      document.getElementById("form-customer-end-date").value = customer.contract_end_date || "";
      document.getElementById("form-customer-notes").value = customer.notes || "";
      document.getElementById("form-customer-reminder-sent").checked = customer.reminder_sent;
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
    plan_id: document.getElementById("form-customer-plan-id").value || null,
    signup_date: document.getElementById("form-customer-signup-date").value || null,
    contract_end_date: document.getElementById("form-customer-end-date").value || null,
    notes: document.getElementById("form-customer-notes").value,
    reminder_sent: document.getElementById("form-customer-reminder-sent").checked,
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