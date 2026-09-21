// NetBijak.com - Admin 可重用促销FAQ模板管理

let editingFaqTemplateId = null;

async function initAdminPromoFaqsPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  await loadFaqTemplatesList();

  document.getElementById("btn-new-faq-template").addEventListener("click", () => openFaqTemplateForm(null));
  document.getElementById("faq-template-form").addEventListener("submit", saveFaqTemplate);
  document.getElementById("btn-cancel-faq-template-form").addEventListener("click", closeFaqTemplateForm);
  document.getElementById("btn-add-faq-template-row").addEventListener("click", () => addFaqTemplateRow());
}

function escapeHtmlFaqTemplate(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadFaqTemplatesList() {
  const tbody = document.getElementById("faq-templates-table-body");
  tbody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;

  const { data: templates, error } = await supabaseClient
    .from("promo_faqs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !templates || templates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#94a3b8">No FAQ templates yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = templates
    .map((t) => {
      let count = 0;
      try {
        count = JSON.parse(t.faq_data).length;
      } catch (e) {}
      return `
      <tr>
        <td>${escapeHtmlFaqTemplate(t.name)}</td>
        <td>${count} question(s)</td>
        <td><button class="btn-small" onclick="openFaqTemplateForm(${t.id})">Edit</button></td>
      </tr>
    `;
    })
    .join("");
}

async function openFaqTemplateForm(templateId) {
  editingFaqTemplateId = templateId;
  document.getElementById("faq-template-form-wrap").classList.remove("hidden");
  document.getElementById("faq-template-form-title").textContent = templateId ? "Edit FAQ Template" : "New FAQ Template";
  document.getElementById("faq-template-form").reset();
  document.getElementById("faq-template-rows-wrap").innerHTML = "";

  if (templateId) {
    const { data: template } = await supabaseClient.from("promo_faqs").select("*").eq("id", templateId).single();
    if (template) {
      document.getElementById("faq-template-name-input").value = template.name || "";
      if (template.faq_data) {
        try {
          const faqs = JSON.parse(template.faq_data);
          faqs.forEach((f) => addFaqTemplateRow(f.q, f.a));
        } catch (e) {
          console.error("Failed to parse faq_data", e);
        }
      }
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeFaqTemplateForm() {
  document.getElementById("faq-template-form-wrap").classList.add("hidden");
  editingFaqTemplateId = null;
}

function addFaqTemplateRow(question, answer) {
  const wrap = document.getElementById("faq-template-rows-wrap");
  const row = document.createElement("div");
  row.className = "faq-edit-row";
  row.innerHTML = `
    <input type="text" placeholder="Question" class="faq-template-question" value="${question ? question.replace(/"/g, "&quot;") : ""}" />
    <textarea placeholder="Answer" class="faq-template-answer">${answer || ""}</textarea>
    <button type="button" class="btn-remove-faq" onclick="this.parentElement.remove()">✕ Remove</button>
  `;
  wrap.appendChild(row);
}

function collectFaqTemplateData() {
  const rows = document.querySelectorAll("#faq-template-rows-wrap .faq-edit-row");
  const faqs = [];
  rows.forEach((row) => {
    const q = row.querySelector(".faq-template-question").value.trim();
    const a = row.querySelector(".faq-template-answer").value.trim();
    if (q && a) faqs.push({ q, a });
  });
  return faqs;
}

async function saveFaqTemplate(e) {
  e.preventDefault();

  const faqs = collectFaqTemplateData();
  if (faqs.length === 0) {
    alert("Please add at least one FAQ question.");
    return;
  }

  const templateData = {
    name: document.getElementById("faq-template-name-input").value,
    faq_data: JSON.stringify(faqs),
  };

  let result;
  if (editingFaqTemplateId) {
    result = await supabaseClient.from("promo_faqs").update(templateData).eq("id", editingFaqTemplateId);
  } else {
    result = await supabaseClient.from("promo_faqs").insert(templateData);
  }

  if (result.error) {
    alert("Error saving FAQ template: " + result.error.message);
    return;
  }

  alert("FAQ template saved!");
  closeFaqTemplateForm();
  loadFaqTemplatesList();
}

document.addEventListener("DOMContentLoaded", initAdminPromoFaqsPage);