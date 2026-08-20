// NetBijak.com - 首页 FAQ 手风琴逻辑

function initFAQ() {
  const faqList = document.getElementById("faq-list");
  if (!faqList) return;

  const questionKeys = ["faq_q1", "faq_q2", "faq_q3", "faq_q4", "faq_q5", "faq_q6", "faq_q7", "faq_q8"];
  const answerKeys = ["faq_a1", "faq_a2", "faq_a3", "faq_a4", "faq_a5", "faq_a6", "faq_a7", "faq_a8"];

  faqList.innerHTML = questionKeys
    .map(
      (qKey, i) => `
    <div class="faq-item">
      <button type="button" class="faq-question" data-index="${i}">
        <span>${t(qKey)}</span>
        <span class="faq-toggle-icon">+</span>
      </button>
      <div class="faq-answer">
        <p>${t(answerKeys[i])}</p>
      </div>
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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("faq-title") && (document.getElementById("faq-title").textContent = t("faq_title"));
  document.getElementById("faq-subtitle") && (document.getElementById("faq-subtitle").textContent = t("faq_subtitle"));
  initFAQ();
});