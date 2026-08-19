// NetBijak.com - Admin 登入验证逻辑

async function checkAdminAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

async function handleAdminLogin(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });
  return { data, error };
}

async function handleAdminLogout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

async function initAdminPage() {
  const loginForm = document.getElementById("admin-login-form");
  const loginSection = document.getElementById("admin-login-section");
  const dashboardSection = document.getElementById("admin-dashboard-section");
  const loginError = document.getElementById("admin-login-error");
  const logoutBtn = document.getElementById("admin-logout-btn");
  const adminEmailDisplay = document.getElementById("admin-email-display");

  const session = await checkAdminAuth();

  if (session) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    if (adminEmailDisplay) adminEmailDisplay.textContent = session.user.email;
  } else {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      loginError.classList.add("hidden");
      const email = document.getElementById("admin-email").value;
      const password = document.getElementById("admin-password").value;

      const { error } = await handleAdminLogin(email, password);

      if (error) {
        loginError.textContent = "Login failed: " + error.message;
        loginError.classList.remove("hidden");
      } else {
        window.location.reload();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleAdminLogout);
  }
}

document.addEventListener("DOMContentLoaded", initAdminPage);