// NetBijak.com - Broadband (Business) 页面：FAQ + 文章全文嵌入（仅在 USAGE_TYPE === "business" 时载入）

async function loadBroadbandBusinessContent() {
  const contentWrap = document.getElementById("bb-content-wrap");
  if (!contentWrap || typeof USAGE_TYPE === "undefined" || USAGE_TYPE !== "business") return;

  const lang = getCurrentLang();

  const { data: article } = await supabaseClient
    .from("articles")
    .select("*")
    .eq("slug", `business-broadband-buying-guide-${lang}`)
    .eq("is_published", true)
    .maybeSingle();

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
      <h2>${t("bb_faq_title")}</h2>
      <p class="section-sub">${t("bb_faq_subtitle")}</p>
      <div id="bb-faq-list" class="faq-list"></div>
    </section>
  `;

  buildBroadbandBusinessFAQ();
}

function buildBroadbandBusinessFAQ() {
  const faqList = document.getElementById("bb-faq-list");
  if (!faqList) return;

  const lang = getCurrentLang();

  const items = [
    { q: t("bb_faq_q1"), a: `<p>${t("bb_faq_a1")}</p>` },
    {
      q: t("bb_faq_q2"),
      a: `
        <table class="faq-table">
          <thead><tr><th>${t("bb_faq_table_feature")}</th><th>${t("bb_faq_table_home")}</th><th>${t("bb_faq_table_business")}</th></tr></thead>
          <tbody>
            <tr><td>${t("bb_faq_row_target")}</td><td>${t("bb_faq_row_target_home")}</td><td>${t("bb_faq_row_target_biz")}</td></tr>
            <tr><td>${t("bb_faq_row_support")}</td><td>${t("bb_faq_row_support_home")}</td><td>${t("bb_faq_row_support_biz")}</td></tr>
            <tr><td>${t("bb_faq_row_reliability")}</td><td>${t("bb_faq_row_reliability_home")}</td><td>${t("bb_faq_row_reliability_biz")}</td></tr>
            <tr><td>${t("bb_faq_row_staticip")}</td><td>${t("bb_faq_row_staticip_home")}</td><td>${t("bb_faq_row_staticip_biz")}</td></tr>
            <tr><td>${t("bb_faq_row_sla")}</td><td>${t("bb_faq_row_sla_home")}</td><td>${t("bb_faq_row_sla_biz")}</td></tr>
            <tr><td>${t("bb_faq_row_price")}</td><td>${t("bb_faq_row_price_home")}</td><td>${t("bb_faq_row_price_biz")}</td></tr>
          </tbody>
        </table>
        <p style="margin-top:10px;font-size:0.8rem;color:#94a3b8">${t("bb_faq_a2_note")}</p>
      `,
    },
    {
      q: t("bb_faq_q3"),
      a: `<p>${t("bb_faq_a3")}</p><p style="margin-top:10px"><a href="${ROOT_PATH}${lang}/compare/" class="faq-inline-link">${t("bb_faq_a3_cta_link")} →</a></p>`,
    },
    {
      q: t("bb_faq_q4"),
      a: `
        <ul style="margin:0 0 10px 1.25rem; color:#e2e8f0; font-size:0.9rem; line-height:1.8">
          <li>${t("bb_faq_speed_list1")}</li>
          <li>${t("bb_faq_speed_list2")}</li>
          <li>${t("bb_faq_speed_list3")}</li>
          <li>${t("bb_faq_speed_list4")}</li>
        </ul>
        <p>${t("bb_faq_a4_note")}</p>
      `,
    },
    { q: t("bb_faq_q5"), a: `<p>${t("bb_faq_a5")}</p>` },
    { q: t("bb_faq_q6"), a: `<p>${t("bb_faq_a6")}</p>` },
    {
      q: t("bb_faq_q7"),
      a: `<p>${t("bb_faq_a7")}</p><p style="margin-top:10px"><a href="${ROOT_PATH}${lang}/compare/" class="faq-inline-link">${t("bb_faq_a7_cta_link")} →</a></p>`,
    },
    {
      q: t("bb_faq_q8"),
      a: `<p>${t("bb_faq_a8")}</p><p style="margin-top:10px"><a href="${ROOT_PATH}${lang}/compare/" class="faq-inline-link">${t("bb_faq_a8_cta_link")} →</a></p>`,
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

document.addEventListener("DOMContentLoaded", loadBroadbandBusinessContent);