// NetBijak.com - Admin Coverage 管理逻辑

let allProvidersCache = [];
let currentPostcodeId = null;
let currentLocationId = null;

async function initAdminCoveragePage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  await loadProviders();

  document.getElementById("postcode-search-btn").addEventListener("click", searchPostcode);
  document.getElementById("postcode-search-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchPostcode();
  });

  document.getElementById("location-select").addEventListener("change", onLocationSelect);
  document.getElementById("btn-add-location").addEventListener("click", addNewLocation);
  document.getElementById("btn-save-coverage").addEventListener("click", saveCoverage);
}

async function loadProviders() {
  const { data: providers } = await supabaseClient
    .from("providers")
    .select("id, name, slug, color_hex, logo_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  allProvidersCache = providers || [];
}

async function searchPostcode() {
  const input = document.getElementById("postcode-search-input").value.trim();
  const resultBox = document.getElementById("postcode-result-box");
  const locationSection = document.getElementById("location-section");

  if (!input) {
    alert("Please enter a postcode.");
    return;
  }

  resultBox.innerHTML = `<p style="color:#94a3b8">Searching...</p>`;
  locationSection.classList.add("hidden");

  const { data: postcode, error } = await supabaseClient
    .from("postcodes")
    .select("*")
    .eq("postcode", input)
    .maybeSingle();

  if (error || !postcode) {
    resultBox.innerHTML = `<p style="color:#dc2626">Postcode not found. Please check and try again.</p>`;
    currentPostcodeId = null;
    return;
  }

  currentPostcodeId = postcode.id;
  resultBox.innerHTML = `
    <div class="postcode-confirm-box">
      📍 <strong>${postcode.postcode}</strong> — ${postcode.city}, ${postcode.state}
    </div>
  `;

  await loadLocationsForPostcode(postcode.id);
  locationSection.classList.remove("hidden");
}

async function loadLocationsForPostcode(postcodeId) {
  const { data: locations } = await supabaseClient
    .from("locations")
    .select("*")
    .eq("postcode_id", postcodeId)
    .order("name", { ascending: true });

  const select = document.getElementById("location-select");
  select.innerHTML =
    `<option value="">— Select existing location —</option>` +
    (locations || [])
      .map((loc) => `<option value="${loc.id}">${loc.name} (${loc.housing_type})</option>`)
      .join("");

  currentLocationId = null;
  document.getElementById("coverage-checkboxes-wrap").innerHTML = "";
  document.getElementById("coverage-checkboxes-wrap").classList.add("hidden");
}

function onLocationSelect(e) {
  const locationId = e.target.value;
  if (!locationId) {
    currentLocationId = null;
    document.getElementById("coverage-checkboxes-wrap").classList.add("hidden");
    return;
  }
  currentLocationId = parseInt(locationId, 10);
  loadCoverageCheckboxes(currentLocationId);
}

async function addNewLocation() {
  if (!currentPostcodeId) {
    alert("Please search a postcode first.");
    return;
  }
  const name = document.getElementById("new-location-name").value.trim();
  const housingType = document.getElementById("new-location-type").value;

  if (!name) {
    alert("Please enter a Taman/Condo name.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("locations")
    .insert({
      name,
      postcode_id: currentPostcodeId,
      housing_type: housingType,
      source: "admin",
    })
    .select()
    .single();

  if (error) {
    alert("Error adding location: " + error.message);
    return;
  }

  document.getElementById("new-location-name").value = "";
  await loadLocationsForPostcode(currentPostcodeId);
  document.getElementById("location-select").value = data.id;
  currentLocationId = data.id;
  loadCoverageCheckboxes(data.id);
}

async function loadCoverageCheckboxes(locationId) {
  const { data: coverage } = await supabaseClient
    .from("location_coverage")
    .select("provider_id")
    .eq("location_id", locationId);

  const coveredProviderIds = new Set((coverage || []).map((c) => c.provider_id));

  const wrap = document.getElementById("coverage-checkboxes-wrap");
  wrap.classList.remove("hidden");
  wrap.innerHTML = allProvidersCache
    .map(
      (p) => `
    <label class="coverage-checkbox-row">
      <input type="checkbox" value="${p.id}" ${coveredProviderIds.has(p.id) ? "checked" : ""} />
      ${p.logo_url ? `<img src="${p.logo_url}" alt="${p.name}" class="coverage-provider-logo" />` : ""}
      <span style="color:${p.color_hex}">${p.name}</span>
    </label>
  `
    )
    .join("");
}

async function saveCoverage() {
  if (!currentLocationId) {
    alert("Please select a location first.");
    return;
  }

  const checkboxes = document.querySelectorAll("#coverage-checkboxes-wrap input[type=checkbox]");
  const checkedProviderIds = Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => parseInt(cb.value, 10));

  // 先删除这个location现有的所有覆盖记录，再重新插入目前打勾的
  const { error: deleteError } = await supabaseClient
    .from("location_coverage")
    .delete()
    .eq("location_id", currentLocationId);

  if (deleteError) {
    alert("Error saving: " + deleteError.message);
    return;
  }

  if (checkedProviderIds.length > 0) {
    const rows = checkedProviderIds.map((providerId) => ({
      location_id: currentLocationId,
      provider_id: providerId,
    }));

    const { error: insertError } = await supabaseClient.from("location_coverage").insert(rows);

    if (insertError) {
      alert("Error saving: " + insertError.message);
      return;
    }
  }

  alert("Coverage saved successfully!");
}

document.addEventListener("DOMContentLoaded", initAdminCoveragePage);