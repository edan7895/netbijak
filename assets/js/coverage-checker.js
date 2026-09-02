// NetBijak.com - Coverage Checker 核心逻辑

const WHATSAPP_NUMBER_COVERAGE = "60178835110";

let selectedHousingType = "landed";
let selectedProviderSlug = "";
let allProvidersForCoverage = [];
let currentLocationsList = [];

async function initCoverageCheckerPage() {
  setSEOMeta({
    title: t("coverage_title") + " | NetBijak.com",
    description: t("coverage_subtitle"),
    url: window.location.href,
  });

  allProvidersForCoverage = (await fetchStaticData("providers")).filter(
    (p) => !p.slug.includes("-business")
  );

  populateProviderSelect();

  document.getElementById("btn-housing-landed").addEventListener("click", () => {
    selectedHousingType = "landed";
    document.getElementById("btn-housing-landed").classList.add("active");
    document.getElementById("btn-housing-highrise").classList.remove("active");
  });

  document.getElementById("btn-housing-highrise").addEventListener("click", () => {
    selectedHousingType = "highrise";
    document.getElementById("btn-housing-highrise").classList.add("active");
    document.getElementById("btn-housing-landed").classList.remove("active");
  });

  document.getElementById("postcode-search-btn").addEventListener("click", onPostcodeEntered);
  document.getElementById("postcode-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onPostcodeEntered();
    }
  });

  document.getElementById("provider-select").addEventListener("change", (e) => {
    selectedProviderSlug = e.target.value;
  });

  document.getElementById("btn-check-coverage").addEventListener("click", checkCoverage);

  loadCoverageContent();
}

function populateProviderSelect() {
  const select = document.getElementById("provider-select");
  select.innerHTML =
    `<option value="">${t("coverage_select_provider_placeholder")}</option>` +
    allProvidersForCoverage.map((p) => `<option value="${p.slug}">${p.name}</option>`).join("");
}

async function onPostcodeEntered() {
  const postcodeInput = document.getElementById("postcode-input");
  const postcode = postcodeInput.value.trim();
  const postcodeInfoBox = document.getElementById("postcode-info-box");
  const locationSection = document.getElementById("location-input-section");

  if (!/^\d{5}$/.test(postcode)) {
    postcodeInfoBox.innerHTML = "";
    locationSection.classList.add("hidden");
    return;
  }

  postcodeInfoBox.innerHTML = `<p class="coverage-loading-text">${t("coverage_checking_postcode")}</p>`;

  const { data: postcodeRow, error } = await supabaseClient
    .from("postcodes")
    .select("*")
    .eq("postcode", postcode)
    .maybeSingle();

  if (error || !postcodeRow) {
    postcodeInfoBox.innerHTML = `<p class="coverage-error-text">${t("coverage_postcode_not_found")}</p>`;
    locationSection.classList.add("hidden");
    return;
  }

  postcodeInfoBox.innerHTML = `
    <div class="coverage-postcode-confirm">📍 ${postcodeRow.postcode} — ${postcodeRow.city}, ${postcodeRow.state}</div>
  `;

  locationSection.classList.remove("hidden");
  await loadLocationOptions(postcodeRow);
}

async function loadLocationOptions(postcodeRow) {
  const select = document.getElementById("location-select");
  const suggestionHint = document.getElementById("location-loading-hint");

  select.innerHTML = `<option value="">${t("coverage_location_loading")}</option>`;
  suggestionHint.classList.remove("hidden");
  suggestionHint.textContent = t("coverage_location_loading_hint");

  const { data: locations } = await supabaseClient
    .from("locations")
    .select("*")
    .eq("postcode_id", postcodeRow.id)
    .order("name", { ascending: true });

  currentLocationsList = locations || [];

  if (currentLocationsList.length === 0) {
    const fetched = await fetchAndSaveOsmLocations(postcodeRow);
    currentLocationsList = fetched;
  }

  suggestionHint.classList.add("hidden");
  populateLocationSelect();
}

function populateLocationSelect() {
  const select = document.getElementById("location-select");
  if (currentLocationsList.length === 0) {
    select.innerHTML = `<option value="">${t("coverage_no_locations_found")}</option>`;
  } else {
    select.innerHTML =
      `<option value="">${t("coverage_select_location_placeholder")}</option>` +
      currentLocationsList.map((loc) => `<option value="${loc.id}">${loc.name}</option>`).join("") +
      `<option value="__other__">${t("coverage_location_other")}</option>`;
  }

  select.onchange = () => {
    const otherInputWrap = document.getElementById("location-other-input-wrap");
    if (select.value === "__other__") {
      otherInputWrap.classList.remove("hidden");
    } else {
      otherInputWrap.classList.add("hidden");
    }
  };
}

async function fetchAndSaveOsmLocations(postcodeRow) {
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?postalcode=${postcodeRow.postcode}&country=Malaysia&format=json&limit=1`;
    const geoRes = await fetch(geoUrl, { headers: { "Accept-Language": "en" } });
    if (!geoRes.ok) return [];
    const geoResults = await geoRes.json();
    if (!geoResults || geoResults.length === 0) return [];

    const lat = parseFloat(geoResults[0].lat);
    const lon = parseFloat(geoResults[0].lon);
    const radius = 1500;

    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["building"~"apartments|residential|house"]["name"](around:${radius},${lat},${lon});
        way["building"~"apartments|residential|house"]["name"](around:${radius},${lat},${lon});
        node["place"~"neighbourhood|suburb"]["name"](around:${radius},${lat},${lon});
      );
      out center 30;
    `;

    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: overpassQuery,
    });

    if (!overpassRes.ok) return [];
    const overpassData = await overpassRes.json();

    const nameToType = new Map();
    (overpassData.elements || []).forEach((el) => {
      const name = el.tags && el.tags.name;
      if (!name || nameToType.has(name.toLowerCase())) return;

      const buildingTag = (el.tags && el.tags.building) || "";
      let housingType = "both";
      if (buildingTag === "apartments") {
        housingType = "highrise";
      } else if (buildingTag === "house") {
        housingType = "landed";
      }
      nameToType.set(name.toLowerCase(), { name, housingType });
    });

    if (nameToType.size === 0) return [];

    const rows = Array.from(nameToType.values()).map(({ name, housingType }) => ({
      name,
      postcode_id: postcodeRow.id,
      housing_type: housingType,
      source: "osm",
    }));

    const { data: inserted } = await supabaseClient.from("locations").insert(rows).select();

    return inserted || [];
  } catch (err) {
    console.error("OSM/Overpass fetch failed:", err);
    return [];
  }
}

async function checkCoverage() {
  if (!selectedProviderSlug) {
    alert(t("coverage_select_provider_first"));
    return;
  }

  const select = document.getElementById("location-select");
  const otherInput = document.getElementById("location-other-input");
  const resultSection = document.getElementById("coverage-result-section");

  let locationId = select.value;
  let locationName = "";

  if (locationId === "__other__") {
    locationName = otherInput.value.trim();
    if (!locationName) {
      alert(t("coverage_enter_location_name"));
      return;
    }
    locationId = await saveUserContributedLocation(locationName);
  } else if (locationId) {
    const found = currentLocationsList.find((l) => String(l.id) === String(locationId));
    locationName = found ? found.name : "";
  } else {
    alert(t("coverage_select_location_first"));
    return;
  }

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });

  let isConfirmed = false;
  if (locationId) {
    const provider = allProvidersForCoverage.find((p) => p.slug === selectedProviderSlug);
    if (provider) {
      const { data: coverage } = await supabaseClient
        .from("location_coverage")
        .select("id")
        .eq("location_id", locationId)
        .eq("provider_id", provider.id)
        .maybeSingle();
      isConfirmed = !!coverage;
    }
  }

  renderCoverageResult(locationName, isConfirmed);
}

async function saveUserContributedLocation(name) {
  const postcodeInput = document.getElementById("postcode-input");
  const postcode = postcodeInput.value.trim();

  const { data: postcodeRow } = await supabaseClient
    .from("postcodes")
    .select("id")
    .eq("postcode", postcode)
    .maybeSingle();

  if (!postcodeRow) return null;

  const { data: inserted, error } = await supabaseClient
    .from("locations")
    .insert({
      name,
      postcode_id: postcodeRow.id,
      housing_type: selectedHousingType === "landed" ? "landed" : "highrise",
      source: "user",
    })
    .select()
    .single();

  if (error) {
    const { data: existing } = await supabaseClient
      .from("locations")
      .select("id")
      .eq("postcode_id", postcodeRow.id)
      .ilike("name", name)
      .maybeSingle();
    return existing ? existing.id : null;
  }

  return inserted ? inserted.id : null;
}

const COVERAGE_TEMPLATES = {
  en: {
    confirmed: (provider) => `✅ Confirmed: ${provider} covers this location.`,
    default: {
      standard: "Typically covers most landed and high-rise properties in this area. Confirm exact availability for your unit.",
      time: "Coverage varies by building, especially for high-rise properties where management approval may be required. Confirm exact availability for your unit.",
      wireless: "Coverage depends on 5G network availability in this area. Confirm exact availability for your unit.",
    },
  },
  zh: {
    confirmed: (provider) => `✅ 已确认：${provider} 覆盖此地点。`,
    default: {
      standard: "通常覆盖本区绝大多数排屋与公寓。请查询你具体单位的可安装状态。",
      time: "覆盖视楼盘而定，高层住宅须视管理层许可。请查询你具体单位的开通情况。",
      wireless: "体验取决于本区的 5G 信号。请查询你所在位置的信号覆盖。",
    },
  },
  ms: {
    confirmed: (provider) => `✅ Disahkan: ${provider} meliputi lokasi ini.`,
    default: {
      standard: "Lazimnya meliputi kebanyakan kediaman bertanah dan pangsapuri di kawasan ini. Sila semak status liputan untuk unit anda.",
      time: "Liputan mengikut bangunan; hartanah tinggi tertakluk pada kelulusan pengurusan (JMB/MC). Sila semak ketersediaan untuk unit anda.",
      wireless: "Perkhidmatan bergantung pada liputan 5G di kawasan ini. Sila semak tahap capaian bagi lokasi anda.",
    },
  },
};

function getProviderTemplateType(slug) {
  if (slug === "time") return "time";
  if (slug === "yes" || slug === "umobile") return "wireless";
  return "standard";
}

function renderCoverageResult(locationName, isConfirmed) {
  const lang = getCurrentLang();
  const templates = COVERAGE_TEMPLATES[lang] || COVERAGE_TEMPLATES.en;
  const resultGrid = document.getElementById("coverage-result-grid");
  const resultLocationLabel = document.getElementById("coverage-result-location");

  resultLocationLabel.textContent = locationName;

  const provider = allProvidersForCoverage.find((p) => p.slug === selectedProviderSlug);
  if (!provider) return;

  const templateType = getProviderTemplateType(provider.slug);
  const text = isConfirmed ? templates.confirmed(provider.name) : templates.default[templateType];

  resultGrid.innerHTML = `
    <div class="coverage-result-card ${isConfirmed ? "coverage-confirmed" : ""}" style="border-color:${provider.color_hex}">
      ${provider.logo_url ? `<img src="${ROOT_PATH}${provider.logo_url.replace(/^\//, "")}" alt="${provider.name}" class="coverage-result-logo" />` : ""}
      <div class="coverage-result-body">
        <div class="coverage-result-name" style="color:${provider.color_hex}">${provider.name}</div>
        <p class="coverage-result-text">${text}</p>
      </div>
    </div>
  `;

  const waMessage = `Hi NetBijak, I'd like to check exact ${provider.name} availability.\nPostcode: ${document.getElementById("postcode-input").value}\nLocation: ${locationName}\nProperty Type: ${selectedHousingType === "landed" ? "Landed" : "High-Rise"}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER_COVERAGE}?text=${encodeURIComponent(waMessage)}`;
  document.getElementById("coverage-cta-btn").href = waLink;
}

// ===== 文章 + FAQ 区块 =====
async function loadCoverageContent() {
  const contentWrap = document.getElementById("coverage-content-wrap");
  if (!contentWrap) return;

  const lang = getCurrentLang();
  const allArticles = await fetchStaticData("articles");
  const article = allArticles.find(
    (a) => a.slug === `check-fibre-coverage-buying-guide-${lang}` && isArticleCurrentlyPublished(a)
  );

  const articleHtml = article
    ? `
    <article class="bh-article-full" id="buying-guide">
      <h2 class="bh-article-full-title">${article.title}</h2>
      <div class="bh-article-full-content">${article.content || ""}</div>
    </article>
  `
    : "";

  contentWrap.innerHTML = `
    ${articleHtml}
    <section class="section-card">
      <h2>${t("coverage_faq_title")}</h2>
      <p class="section-sub">${t("coverage_faq_subtitle")}</p>
      <div id="coverage-faq-list" class="faq-list"></div>
    </section>
  `;

  buildCoverageFAQ();
}

function buildCoverageFAQ() {
  const faqList = document.getElementById("coverage-faq-list");
  if (!faqList) return;

  const questionKeys = ["coverage_faq_q1", "coverage_faq_q2", "coverage_faq_q3", "coverage_faq_q4", "coverage_faq_q5"];
  const answerKeys = ["coverage_faq_a1", "coverage_faq_a2", "coverage_faq_a3", "coverage_faq_a4", "coverage_faq_a5"];

  faqList.innerHTML = questionKeys
    .map(
      (qKey, i) => `
    <div class="faq-item">
      <button type="button" class="faq-question" data-index="${i}">
        <span>${t(qKey)}</span>
        <span class="faq-toggle-icon">+</span>
      </button>
      <div class="faq-answer"><p>${t(answerKeys[i])}</p></div>
    </div>
  `
    )
    .join("");

  faqList.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const isOpen = item.classList.contains("open");
      faqList.querySelectorAll(".faq-item").forEach((el) => el.classList.remove("open"));
      if (!isOpen) item.classList.add("open");
    });
  });

  injectFAQSchema("coverage-faq-list");
}

document.addEventListener("DOMContentLoaded", initCoverageCheckerPage);