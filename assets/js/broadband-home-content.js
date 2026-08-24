// NetBijak.com - Broadband (Home) 页面：ISP卡片 + FAQ + 文章（读取静态JSON）

async function loadBroadbandHomeContent() {
  const gridEl = document.getElementById("browse-page-grid");
  const titleEl = document.getElementById("browse-page-title");
  const contentWrap = document.getElementById("bh-content-wrap");
  if (!gridEl || typeof USAGE_TYPE === "undefined") return;

  const lang = getCurrentLang();

  titleEl.textContent = t("browse_home_page_title");
  document.title = titleEl.textContent + " | NetBijak.com";

  setSEOMeta({
    title: t("browse_home_page_title") + " | NetBijak.com",
    description: t("bh_faq_subtitle"),
    url: window.location.href,
  });

  const allProviders = await fetchStaticData("providers");
  const filtered = allProviders.filter((p) => {
    const isBusiness = p.slug.includes("-business");
    return p.is_active && !isBusiness;
  });

  if (filtered.length === 0) {
    gridEl.innerHTML = `<p style="color:#94a3b8">${t("no_results")}</p>`;
  } else {
    gridEl.innerHTML = filtered
      .map(
        (p) => `
      <a href="${ROOT_PATH}${p.slug}/" class="provider-browse-card" style="border-color:${p.color_hex}">
        <span class="provider-browse-info">
          ${p.logo_url ? `<img src="${ROOT_PATH}${p.logo_url.replace(/^\//, "")}" alt="${p.name}" class="provider-logo-img" />` : ""}
          <span class="provider-browse-name" style="color:${p.color_hex}">${p.name}</span>
        </span>
        <span class="provider-browse-arrow">→</span>
      </a>
    `
      )
      .join("");
  }

  const homeNames = filtered.map((p) => p.name).join(", ");

  const allArticles = await fetchStaticData("articles");
  const article = allArticles.find(
    (a) => a.slug === `home-fibre-broadband-buying-guide-${lang}` && isArticleCurrentlyPublished(a)
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
      <h2>${t("bh_faq_title")}</h2>
      <p class="section-sub">${t("bh_faq_subtitle")}</p>
      <div id="bh-faq-list" class="faq-list"></div>
    </section>
  `;

  buildBroadbandHomeFAQ(homeNames);
}

function buildBroadbandHomeFAQ(providerNamesStr) {
  const faqList = document.getElementById("bh-faq-list");
  if (!faqList) return;

  const items = [
    { q: t("bh_faq_q1"), a: `<p>${t("bh_faq_a1")}</p>` },
    {
      q: t("bh_faq_q2"),
      a: `<p>${t("bh_faq_a2_intro")} <strong>${providerNamesStr}</strong>. ${t("bh_faq_a2_outro")}</p>`,
    },
    { q: t("bh_faq_q3"), a: `<p>${t("bh_faq_a3")}</p>` },
    {
      q: t("bh_faq_q4"),
      a: `
        <table class="faq-table">
          <thead><tr><th>${t("bh_faq_table_household")}</th><th>${t("bh_faq_table_speed")}</th></tr></thead>
          <tbody>
            <tr><td>${t("bh_faq_row1_house")}</td><td>${t("bh_faq_row1_speed")}</td></tr>
            <tr><td>${t("bh_faq_row2_house")}</td><td>${t("bh_faq_row2_speed")}</td></tr>
            <tr><td>${t("bh_faq_row3_house")}</td><td>${t("bh_faq_row3_speed")}</td></tr>
          </tbody>
        </table>
        <p style="margin-top:10px">${t("bh_faq_a4_cta_text")} <a href="${ROOT_PATH}${getCurrentLang()}/find-your-plan/" class="faq-inline-link">${t("bh_faq_a4_cta_link")}</a>.</p>
      `,
    },
    { q: t("bh_faq_q5"), a: `<p>${t("bh_faq_a5")}</p>` },
    { q: t("bh_faq_q6"), a: `<p>${t("bh_faq_a6")}</p>` },
    { q: t("bh_faq_q7"), a: `<p>${t("bh_faq_a7")}</p>` },
    {
      q: t("bh_faq_q8"),
      a: `<p>${t("bh_faq_a8_intro")} <a href="${ROOT_PATH}${getCurrentLang()}/find-your-plan/" class="faq-inline-link">${t("bh_faq_a8_link1")}</a> ${t("bh_faq_a8_mid")} <a href="${ROOT_PATH}${getCurrentLang()}/compare/" class="faq-inline-link">${t("bh_faq_a8_link2")}</a> ${t("bh_faq_a8_outro")}</p>`,
    },
  ];

  faqList.innerHTML = items
    .map(
      (item, i) => `
    <div class="faq-item">
      <button type="button" class="faq-question" data-index="${i}">
        <span>${item.q}</span>
        <span class="faq-toggle-icon">+</span>
      </button>
      <div class="faq-answer">${item.a}</div>
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

  injectFAQSchema("bh-faq-list");
}

document.addEventListener("DOMContentLoaded", loadBroadbandHomeContent);