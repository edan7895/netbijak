// NetBijak.com - Broadband (Home) 页面：FAQ + 文章推荐区块（仅在 USAGE_TYPE === "home" 时载入）

async function loadBroadbandHomeContent() {
  const contentWrap = document.getElementById("bh-content-wrap");
  if (!contentWrap || typeof USAGE_TYPE === "undefined" || USAGE_TYPE !== "home") return;

  // 抓取 Home 类运营商名单（排除 Business）
  const { data: providers } = await supabaseClient
    .from("providers")
    .select("name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const homeProviderNames = (providers || [])
    .filter((p) => true)
    .map((p) => p.name);

  const { data: allProviders } = await supabaseClient
    .from("providers")
    .select("name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const homeNames = (allProviders || [])
    .filter((p) => !p.slug.includes("-business"))
    .map((p) => p.name)
    .join(", ");

  const lang = getCurrentLang();

  // 尝试找到固定 slug 的 Buying Guide 文章
  const { data: article } = await supabaseClient
    .from("articles")
    .select("*")
    .eq("slug", "home-fibre-broadband-buying-guide")
    .eq("language", lang)
    .eq("is_published", true)
    .maybeSingle();

  const articleHtml = article
    ? `
    <a href="${ROOT_PATH}${lang}/blog/post/?slug=${article.slug}" class="bh-article-card">
      <div class="bh-article-card-body">
        <div class="bh-article-card-title">${t("bh_article_title")}</div>
        <p class="bh-article-card-desc">${t("bh_article_desc")}</p>
        <span class="bh-article-card-cta">${t("bh_article_cta")}</span>
      </div>
    </a>
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
}

document.addEventListener("DOMContentLoaded", loadBroadbandHomeContent);