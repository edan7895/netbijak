// NetBijak.com - Admin Rewards 系统：Events管理 + Pin码库存

let editingEventId = null;

async function initAdminRewardsPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  await loadEventsList();
  await refreshPinStockSummary();

  document.getElementById("btn-new-event").addEventListener("click", () => openEventForm(null));
  document.getElementById("event-form").addEventListener("submit", saveEvent);
  document.getElementById("btn-cancel-event-form").addEventListener("click", closeEventForm);

  document.getElementById("pin-upload-form").addEventListener("submit", uploadPins);
}

// ===== Events 管理 =====
async function loadEventsList() {
  const tbody = document.getElementById("events-table-body");
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

  const { data: events, error } = await supabaseClient
    .from("reward_events")
    .select("*")
    .order("start_date", { ascending: false });

  if (error || !events || events.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8">No events yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = events
    .map(
      (e) => `
    <tr>
      <td>${escapeHtmlRewards(e.event_name)}</td>
      <td>${e.start_date || "-"} → ${e.end_date || "-"}</td>
      <td>RM${e.tng_amount || "-"}</td>
      <td style="max-width:200px">${escapeHtmlRewards(e.reward_type_note || "-")}</td>
      <td>
        <button class="btn-small" onclick="openEventForm(${e.id})">Edit</button>
        <button class="btn-small btn-delete" onclick="viewEventCustomers(${e.id}, '${escapeHtmlRewards(e.event_name).replace(/'/g, "\\'")}')">View Customers</button>
      </td>
    </tr>
  `
    )
    .join("");
}

function escapeHtmlRewards(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function openEventForm(eventId) {
  editingEventId = eventId;
  document.getElementById("event-form-wrap").classList.remove("hidden");
  document.getElementById("event-form-title").textContent = eventId ? "Edit Event" : "New Event";
  document.getElementById("event-form").reset();

  if (eventId) {
    const { data: event } = await supabaseClient.from("reward_events").select("*").eq("id", eventId).single();
    if (event) {
      document.getElementById("event-name").value = event.event_name || "";
      document.getElementById("event-start-date").value = event.start_date || "";
      document.getElementById("event-end-date").value = event.end_date || "";
      document.getElementById("event-tng-amount").value = event.tng_amount || "";
      document.getElementById("event-note").value = event.reward_type_note || "";
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeEventForm() {
  document.getElementById("event-form-wrap").classList.add("hidden");
  editingEventId = null;
}

async function saveEvent(e) {
  e.preventDefault();

  const eventData = {
    event_name: document.getElementById("event-name").value,
    start_date: document.getElementById("event-start-date").value || null,
    end_date: document.getElementById("event-end-date").value || null,
    tng_amount: parseFloat(document.getElementById("event-tng-amount").value) || null,
    reward_type_note: document.getElementById("event-note").value || null,
  };

  let result;
  if (editingEventId) {
    result = await supabaseClient.from("reward_events").update(eventData).eq("id", editingEventId);
  } else {
    result = await supabaseClient.from("reward_events").insert(eventData);
  }

  if (result.error) {
    alert("Error saving event: " + result.error.message);
    return;
  }

  alert("Event saved!");
  closeEventForm();
  loadEventsList();
}

function viewEventCustomers(eventId, eventName) {
  window.location.href = `../reward-view/?event_id=${eventId}&event_name=${encodeURIComponent(eventName)}`;
}

// ===== Pin码库存上传 =====
async function uploadPins(e) {
  e.preventDefault();

  const amount = parseFloat(document.getElementById("pin-upload-amount").value);
  const rawText = document.getElementById("pin-upload-text").value.trim();

  if (!amount || !rawText) {
    alert("Please enter an amount and paste at least one pin code.");
    return;
  }

  const pinCodes = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (pinCodes.length === 0) {
    alert("No valid pin codes found.");
    return;
  }

  const rows = pinCodes.map((code) => ({ pin_code: code, amount }));

  const uploadBtn = document.getElementById("btn-upload-pins");
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  const { data, error } = await supabaseClient.from("reward_pins").insert(rows).select();

  uploadBtn.disabled = false;
  uploadBtn.textContent = "Upload Pins";

  if (error) {
    alert("Error uploading pins: " + error.message + "\n\n(This may happen if some pin codes are duplicates.)");
    return;
  }

  alert(`Successfully added ${data.length} pins (RM${amount} each).`);
  document.getElementById("pin-upload-form").reset();
  refreshPinStockSummary();
}

async function refreshPinStockSummary() {
  const wrap = document.getElementById("pin-stock-summary");
  wrap.innerHTML = `<p style="color:#94a3b8">Loading...</p>`;

  const { data: pins, error } = await supabaseClient.from("reward_pins").select("amount, is_used");

  if (error || !pins) {
    wrap.innerHTML = `<p style="color:#dc2626">Error loading pin stock.</p>`;
    return;
  }

  const summary = {};
  pins.forEach((p) => {
    const key = p.amount;
    if (!summary[key]) summary[key] = { total: 0, used: 0 };
    summary[key].total++;
    if (p.is_used) summary[key].used++;
  });

  const amounts = Object.keys(summary).sort((a, b) => a - b);

  if (amounts.length === 0) {
    wrap.innerHTML = `<p style="color:#94a3b8">No pins uploaded yet.</p>`;
    return;
  }

  wrap.innerHTML = amounts
    .map((amount) => {
      const s = summary[amount];
      const available = s.total - s.used;
      return `
      <div class="pin-stock-row">
        <span class="pin-stock-amount">RM${amount}</span>
        <span class="pin-stock-available">${available} available</span>
        <span class="pin-stock-used">${s.used} used / ${s.total} total</span>
      </div>
    `;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", initAdminRewardsPage);