import { fetchAuthSession, loginAccount } from "./core/auth.js?v=20260312-admin-backend-login";

const REDIRECT_URL = "./admin-dashboard.html";
const DEFAULT_ERROR_TEXT = "Enter valid moderator credentials to continue.";
const DEFAULT_SUCCESS_TEXT = "Admin authentication succeeded. Redirecting to the dashboard...";

function $(selector) {
  return document.querySelector(selector);
}

function setDebug(message) {
  const node = $("#moderator-login-debug");
  if (node) {
    node.textContent = message || "";
  }
}

function resetState() {
  const errorBox = $("#moderator-login-error");
  const successBox = $("#moderator-login-success");
  const errorText = $("#moderator-login-error-text");
  const successText = $("#moderator-login-success-text");

  errorBox?.setAttribute("hidden", "");
  successBox?.setAttribute("hidden", "");

  if (errorBox) {
    errorBox.style.display = "none";
  }

  if (successBox) {
    successBox.style.display = "none";
  }

  if (errorText) {
    errorText.textContent = DEFAULT_ERROR_TEXT;
  }

  if (successText) {
    successText.textContent = DEFAULT_SUCCESS_TEXT;
  }

  setDebug("");
}

function showError(message) {
  const box = $("#moderator-login-error");
  const text = $("#moderator-login-error-text");
  const successBox = $("#moderator-login-success");
  const successText = $("#moderator-login-success-text");

  if (text) {
    text.textContent = message;
  }

  box?.removeAttribute("hidden");
  if (box) {
    box.style.display = "grid";
  }

  successBox?.setAttribute("hidden", "");
  if (successBox) {
    successBox.style.display = "none";
  }

  if (successText) {
    successText.textContent = DEFAULT_SUCCESS_TEXT;
  }
}

function showSuccess(message) {
  const box = $("#moderator-login-success");
  const text = $("#moderator-login-success-text");
  const errorBox = $("#moderator-login-error");
  const errorText = $("#moderator-login-error-text");

  if (text) {
    text.textContent = message;
  }

  box?.removeAttribute("hidden");
  if (box) {
    box.style.display = "grid";
  }

  errorBox?.setAttribute("hidden", "");
  if (errorBox) {
    errorBox.style.display = "none";
  }

  if (errorText) {
    errorText.textContent = DEFAULT_ERROR_TEXT;
  }
}

function getFailureMessage(error) {
  switch (error?.code) {
    case "IDENTIFIER_REQUIRED":
      return "Please enter the moderator username or email.";
    case "PASSWORD_REQUIRED":
      return "Please enter the moderator password.";
    case "LOGIN_ACCOUNT_NOT_FOUND":
      return "The moderator account could not be found in Supabase.";
    case "ADMIN_IDENTIFIER_RESOLUTION_FAILED":
      return "Moderator username lookup is unavailable right now. Try logging in with the full admin email instead.";
    case "INVALID_CREDENTIALS":
      return "Moderator username/email or password is incorrect.";
    case "ACCOUNT_DISABLED":
      return "This moderator account has been disabled. Please contact support.";
    case "ADMIN_ONLY":
      return "This login area is reserved for admin accounts.";
    case "ADMIN_SESSION_INVALID":
      return "Login succeeded but the admin session could not be confirmed.";
    case "SUPABASE_NOT_CONFIGURED":
      return "Supabase auth is not configured for this environment yet.";
    case "SUPABASE_SERVICE_ROLE_MISSING":
      return "The admin auth helper is missing the Supabase service role key.";
    case "AUTH_UNAVAILABLE":
      return "The authentication service is not available right now.";
    default:
      return error?.message || "Something went wrong during moderator login.";
  }
}

async function bootstrapExistingAdminSession() {
  try {
    const session = await fetchAuthSession();
    const role = session?.user?.role;

    if (session?.authenticated && (role === "admin" || role === "moderator")) {
      window.location.replace(REDIRECT_URL);
    }
  } catch (error) {
    // Keep the login page visible if session boot fails.
  }
}

function bindModeratorLogin() {
  const form = $("#moderator-login-form");
  const submitButton = $("#moderator-login-submit");

  if (!form || !submitButton) {
    return;
  }

  resetState();
  bootstrapExistingAdminSession();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    resetState();

    const formData = new FormData(form);
    const identifier = String(formData.get("adminIdentifier") || "").trim();
    const password = String(formData.get("adminPassword") || "");

    if (!identifier) {
      showError("Please enter the moderator username or email.");
      return;
    }

    if (!password) {
      showError("Please enter the moderator password.");
      return;
    }

    submitButton.disabled = true;
    setDebug("Submitting moderator auth via Supabase...");

    try {
      const user = await loginAccount({ identifier, password }, "admin");
      showSuccess(`Moderator access granted for ${user.username || user.email}. Redirecting to the dashboard...`);
      setDebug(`Admin session confirmed as ${user.role}.`);

      window.setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, 220);
    } catch (error) {
      showError(getFailureMessage(error));
      setDebug(`Failure: ${error?.code || "UNKNOWN_ERROR"}${error?.message ? ` / ${error.message}` : ""}`);
    } finally {
      submitButton.disabled = false;
    }
  });
}

bindModeratorLogin();
