// NetBijak.com - 配套详情页评论功能（星级选择 + 动态标签 + Turnstile验证）

const TURNSTILE_SITE_KEY = "0x4AAAAAAEuw3_WcwGmVO5A2";

let selectedRating = 0;
let currentPlanIdForReview = null;

const REVIEW_TAGS = {
  positive: {
    en: ["Fast installation", "Stable connection", "Good value for speed", "Great customer service", "Easy signup process", "Works well for my household"],
    zh: ["安装快速", "连接稳定", "速度物有所值", "客服态度好", "申请流程简单", "适合我的家庭使用"],
    ms: ["Pemasangan pantas", "Sambungan stabil", "Nilai baik untuk kelajuan", "Perkhidmatan pelanggan bagus", "Proses pendaftaran mudah", "Sesuai untuk isi rumah saya"],
  },
  negative: {
    en: ["Frequent disconnections", "Poor customer service", "Installation took too long", "Speed slower than advertised", "Billing issues", "Difficult to cancel/downgrade"],
    zh: ["经常断线", "客服态度差", "安装太慢", "速度比宣传的慢", "账单问题", "难以取消/降级"],
    ms: ["Kerap terputus sambungan", "Perkhidmatan pelanggan lemah", "Pemasangan terlalu lama", "Kelajuan lebih perlahan daripada diiklankan", "Isu bil", "Sukar untuk batal/turun taraf"],
  },
};

function initPlanReviews(planId) {
  currentPlanIdForReview = planId;
  loadTurnstileScript();
  loadApprovedReviews(planId);
  setupReviewForm();
}

function loadTurnstileScript() {
  if (document.getElementById("turnstile-script")) return;
  const script = document.createElement("script");
  script.id = "turnstile-script";
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

function setupReviewForm() {
  const starButtons = document.querySelectorAll(".review-star-btn");
  starButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedRating = parseInt(btn.dataset.star, 10);
      updateStarDisplay();
      renderTagOptions();
      document.getElementById("review-form-fields").classList.remove("hidden");
    });
  });

  document.getElementById("btn-generate-name").addEventListener("click", () => {
    const randomName = "User" + Math.floor(1000 + Math.random() * 9000);
    document.getElementById("review-reviewer-name").value = randomName;
  });

  document.getElementById("review-submit-form").addEventListener("submit", submitReview);
}

function updateStarDisplay() {
  document.querySelectorAll(".review-star-btn").forEach((btn) => {
    const starValue = parseInt(btn.dataset.star, 10);
    btn.textContent = starValue <= selectedRating ? "★" : "☆";
    btn.classList.toggle("filled", starValue <= selectedRating);
  });
  document.getElementById("review-rating-label").textContent = `${selectedRating} / 5`;
}

function renderTagOptions() {
  const lang = getCurrentLang();
  const wrap = document.getElementById("review-tags-wrap");

  let tagsToShow = [];
  if (selectedRating >= 4) {
    tagsToShow = REVIEW_TAGS.positive[lang] || REVIEW_TAGS.positive.en;
  } else if (selectedRating <= 2) {
    tagsToShow = REVIEW_TAGS.negative[lang] || REVIEW_TAGS.negative.en;
  } else {
    tagsToShow = [...(REVIEW_TAGS.positive[lang] || REVIEW_TAGS.positive.en), ...(REVIEW_TAGS.negative[lang] || REVIEW_TAGS.negative.en)];
  }

  wrap.innerHTML = tagsToShow
    .map(
      (tag) => `
    <label class="review-tag-chip">
      <input type="checkbox" value="${tag}" class="review-tag-checkbox" />
      <span>${tag}</span>
    </label>
  `
    )
    .join("");
}

async function submitReview(e) {
  e.preventDefault();

  if (selectedRating === 0) {
    alert(t("review_select_rating_first"));
    return;
  }

  const turnstileResponse = document.querySelector('[name="cf-turnstile-response"]');
  const turnstileToken = turnstileResponse ? turnstileResponse.value : "";

  if (!turnstileToken) {
    alert(t("review_complete_verification"));
    return;
  }

  const reviewerName = document.getElementById("review-reviewer-name").value.trim();
  if (!reviewerName) {
    alert(t("review_enter_name"));
    return;
  }

  const commentText = document.getElementById("review-comment-text").value.trim();
  const selectedTags = Array.from(document.querySelectorAll(".review-tag-checkbox:checked")).map((cb) => cb.value);

  const submitBtn = document.getElementById("btn-submit-review");
  submitBtn.disabled = true;
  submitBtn.textContent = t("review_submitting");

  const { error } = await supabaseClient.rpc("submit_plan_review", {
    p_plan_id: currentPlanIdForReview,
    p_rating: selectedRating,
    p_reviewer_name: reviewerName,
    p_comment_text: commentText || null,
    p_tags: selectedTags.length > 0 ? selectedTags : null,
  });

  submitBtn.disabled = false;
  submitBtn.textContent = t("review_submit_btn");

  if (error) {
    alert(t("review_submit_error"));
    console.error(error);
    return;
  }

  document.getElementById("review-form-wrap").classList.add("hidden");
  document.getElementById("review-thank-you").classList.remove("hidden");
}

async function loadApprovedReviews(planId) {
  const { data: reviews } = await supabaseClient
    .from("plan_reviews")
    .select("*")
    .eq("plan_id", planId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  renderReviewsList(reviews || []);
}

function renderReviewsList(reviews) {
  const summaryWrap = document.getElementById("reviews-summary");
  const listWrap = document.getElementById("reviews-list");

  if (reviews.length === 0) {
    summaryWrap.innerHTML = `<p class="reviews-empty-text">${t("review_no_reviews_yet")}</p>`;
    listWrap.innerHTML = "";
    return;
  }

  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  const fullStars = Math.round(parseFloat(avgRating));
  const starsDisplay = "★".repeat(fullStars) + "☆".repeat(5 - fullStars);

  summaryWrap.innerHTML = `
    <div class="reviews-summary-stars">${starsDisplay}</div>
    <div class="reviews-summary-number">${avgRating} <span>${t("review_out_of_5")}</span></div>
    <div class="reviews-summary-count">${reviews.length} ${t("review_reviews_count")}</div>
  `;

  listWrap.innerHTML = reviews
    .map((r) => {
      const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      const dateStr = new Date(r.created_at).toLocaleDateString();
      const tagsHtml = r.tags && r.tags.length > 0
        ? `<div class="review-item-tags">${r.tags.map((tag) => `<span class="review-item-tag">${escapeHtmlReview(tag)}</span>`).join("")}</div>`
        : "";

      return `
      <div class="review-item">
        <div class="review-item-header">
          <span class="review-item-stars">${stars}</span>
          <span class="review-item-name">${escapeHtmlReview(r.reviewer_name)}</span>
          <span class="review-item-date">${dateStr}</span>
        </div>
        ${r.comment_text ? `<p class="review-item-comment">${escapeHtmlReview(r.comment_text)}</p>` : ""}
        ${tagsHtml}
      </div>
    `;
    })
    .join("");
}

function escapeHtmlReview(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}