// NetBijak.com - Admin Reviews 审核管理逻辑

let currentFilterStatus = "pending";

async function initAdminReviewsPage() {
  const session = await checkAdminAuth();
  if (!session) {
    window.location.href = "../";
    return;
  }
  document.getElementById("admin-email-display").textContent = session.user.email;
  document.getElementById("admin-logout-btn").addEventListener("click", handleAdminLogout);

  document.querySelectorAll(".filter-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-status-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilterStatus = btn.dataset.status;
      loadReviews();
    });
  });

  loadReviews();
}

async function loadReviews() {
  const tbody = document.getElementById("reviews-table-body");
  tbody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;

  let query = supabaseClient
    .from("plan_reviews")
    .select("*, plans(name, providers(name))")
    .order("created_at", { ascending: false });

  if (currentFilterStatus === "pending") {
    query = query.eq("is_approved", false);
  } else if (currentFilterStatus === "approved") {
    query = query.eq("is_approved", true);
  }

  const { data: reviews, error } = await query;

  if (error || !reviews || reviews.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8">No reviews found.</td></tr>`;
    return;
  }

  tbody.innerHTML = reviews
    .map((r) => {
      const planName = r.plans ? r.plans.name : "(deleted plan)";
      const providerName = r.plans && r.plans.providers ? r.plans.providers.name : "";
      const stars = "⭐".repeat(r.rating);
      const tags = r.tags && r.tags.length > 0 ? r.tags.join(", ") : "-";
      const dateStr = new Date(r.created_at).toLocaleDateString();

      return `
      <tr>
        <td>${escapeHtmlAdmin(providerName)} - ${escapeHtmlAdmin(planName)}</td>
        <td>${stars}</td>
        <td>${escapeHtmlAdmin(r.reviewer_name)}</td>
        <td style="max-width:250px">${escapeHtmlAdmin(r.comment_text || "(no comment)")}</td>
        <td style="font-size:0.75rem">${escapeHtmlAdmin(tags)}</td>
        <td>${dateStr}</td>
        <td>
          ${!r.is_approved ? `<button class="btn-small btn-approve" onclick="approveReview(${r.id})">Approve</button>` : `<span class="badge-published">Approved</span>`}
          <button class="btn-small btn-delete" onclick="deleteReview(${r.id})">Delete</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function escapeHtmlAdmin(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function approveReview(reviewId) {
  const { error } = await supabaseClient
    .from("plan_reviews")
    .update({ is_approved: true })
    .eq("id", reviewId);

  if (error) {
    alert("Error approving review: " + error.message);
    return;
  }

  loadReviews();
}

async function deleteReview(reviewId) {
  const confirmed = confirm("Are you sure you want to permanently delete this review?");
  if (!confirmed) return;

  const { error } = await supabaseClient.from("plan_reviews").delete().eq("id", reviewId);

  if (error) {
    alert("Error deleting review: " + error.message);
    return;
  }

  loadReviews();
}

document.addEventListener("DOMContentLoaded", initAdminReviewsPage);