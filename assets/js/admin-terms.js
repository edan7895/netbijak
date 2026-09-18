// NetBijak.com - Admin Terms & Conditions 模板管理

let editingTermsId = null;
let termsQuillEditor = null;

async function initAdminTermsPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  initTermsQuillEditor();
  await loadTermsList();

  document.getElementById("btn-new-terms").addEventListener("click", () => openTermsForm(null));
  document.getElementById("terms-form").addEventListener("submit", saveTerms);
  document.getElementById("btn-cancel-terms-form").addEventListener("click", closeTermsForm);
  document.getElementById("terms-name-input").addEventListener("input", autoFillTermsSlug);
}

function initTermsQuillEditor() {
  termsQuillEditor = new Quill("#terms-quill-editor", {
    theme: "snow",
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    },
    placeholder: "Write the full Terms & Conditions content here...",
  });
}

function escapeHtmlTerms(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function autoFillTermsSlug() {
  const nameInput = document.getElementById("terms-name-input");
  const slugInput = document.getElementById("terms-slug-input");
  if (!slugInput.dataset.manuallyEdited) {
    slugInput.value = nameInput.value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }
}

async function loadTermsList() {
  const tbody = document.getElementById("terms-table-body");
  tbody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;

  const { data: terms, error } = await supabaseClient
    .from("promo_terms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !terms || terms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#94a3b8">No T&C templates yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = terms
    .map(
      (t) => `
    <tr>
      <td>${escapeHtmlTerms(t.name)}</td>
      <td><a href="/terms/${escapeHtmlTerms(t.slug)}/" target="_blank">/terms/${escapeHtmlTerms(t.slug)}/</a></td>
      <td><button class="btn-small" onclick="openTermsForm(${t.id})">Edit</button></td>
    </tr>
  `
    )
    .join("");
}

async function openTermsForm(termsId) {
  editingTermsId = termsId;
  document.getElementById("terms-form-wrap").classList.remove("hidden");
  document.getElementById("terms-form-title").textContent = termsId ? "Edit T&C Template" : "New T&C Template";
  document.getElementById("terms-form").reset();
  document.getElementById("terms-slug-input").dataset.manuallyEdited = "";
  termsQuillEditor.root.innerHTML = "";

  if (termsId) {
    const { data: terms } = await supabaseClient.from("promo_terms").select("*").eq("id", termsId).single();
    if (terms) {
      document.getElementById("terms-name-input").value = terms.name || "";
      document.getElementById("terms-slug-input").value = terms.slug || "";
      document.getElementById("terms-slug-input").dataset.manuallyEdited = "true";
      termsQuillEditor.root.innerHTML = terms.content || "";
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeTermsForm() {
  document.getElementById("terms-form-wrap").classList.add("hidden");
  editingTermsId = null;
}

async function saveTerms(e) {
  e.preventDefault();

  const termsData = {
    name: document.getElementById("terms-name-input").value,
    slug: document.getElementById("terms-slug-input").value,
    content: termsQuillEditor.root.innerHTML,
  };

  let result;
  if (editingTermsId) {
    result = await supabaseClient.from("promo_terms").update(termsData).eq("id", editingTermsId);
  } else {
    result = await supabaseClient.from("promo_terms").insert(termsData);
  }

  if (result.error) {
    alert("Error saving T&C: " + result.error.message);
    return;
  }

  alert("T&C template saved!");
  closeTermsForm();
  loadTermsList();
}

document.addEventListener("DOMContentLoaded", initAdminTermsPage);