function getLocalDevOrigin() {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4174`;
}

function getAuthOrigin() {
  const configuredOrigin = window.YAPPLY_AUTH_ORIGIN || document.documentElement.dataset.authOrigin || "";

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  const { hostname, port, origin } = window.location;
  const isLocalFrontend = (hostname === "127.0.0.1" || hostname === "localhost") && port === "4173";

  return isLocalFrontend ? getLocalDevOrigin() : origin;
}
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
  $("#moderator-login-error")?.setAttribute("hidden", "");
  $("#moderator-login-success")?.setAttribute("hidden", "");
  const errorText = $("#moderator-login-error-text");
  const successText = $("#moderator-login-success-text");
  if (errorText) {
    errorText.textContent = DEFAULT_ERROR_TEXT;
  }
  if (successText) {
    successText.textContent = DEFAULT_SUCCESS_TEXT;
  }
  const authOrigin = getAuthOrigin();
  setDebug(`Backend origin: ${authOrigin}`);
}

function showError(message) {
  const box = $("#moderator-login-error");
  const text = $("#moderator-login-error-text");

  if (text) {
    text.textContent = message;
  }

  box?.removeAttribute("hidden");
  $("#moderator-login-success")?.setAttribute("hidden", "");
  const successText = $("#moderator-login-success-text");
  if (successText) {
    successText.textContent = DEFAULT_SUCCESS_TEXT;
  }
}

function showSuccess(message) {
  const box = $("#moderator-login-success");
  const text = $("#moderator-login-success-text");

  if (text) {
    text.textContent = message;
  }

  box?.removeAttribute("hidden");
  $("#moderator-login-error")?.setAttribute("hidden", "");
  const errorText = $("#moderator-login-error-text");
  if (errorText) {
    errorText.textContent = DEFAULT_ERROR_TEXT;
  }
}

async function readJson(response) {
  try {
    const raw = await response.text();
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      const compact = raw.replace(/\s+/g, " ").trim();
      return {
        code: response.ok ? undefined : response.status >= 500 ? "SERVER_ERROR" : "UNKNOWN_ERROR",
        message: compact.startsWith("<")
          ? `Authentication request failed (HTTP ${response.status}).`
          : compact,
      };
    }
  } catch (error) {
    return {};
  }
}

async function loginModerator(identifier, password) {
  const authOrigin = getAuthOrigin();
  setDebug(`POST ${authOrigin}/api/auth/login`);

  const response = await fetch(`${authOrigin}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier,
      password,
      audience: "admin",
    }),
  });

  const data = await readJson(response);
  setDebug(`Login status: ${response.status}`);

  if (!response.ok) {
    const error = new Error(data.message || `Authentication request failed (HTTP ${response.status}).`);
    error.code = data.code || (response.status >= 500 ? "SERVER_ERROR" : "UNKNOWN_ERROR");
    error.status = response.status;
    throw error;
  }

  return data;
}

async function verifySession() {
  const authOrigin = getAuthOrigin();
  setDebug(`GET ${authOrigin}/api/auth/session`);

  const response = await fetch(`${authOrigin}/api/auth/session`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await readJson(response);
  setDebug(`Session status: ${response.status}`);

  if (!response.ok) {
    const error = new Error(data.message || `Session verification failed (HTTP ${response.status}).`);
    error.code = data.code || "SESSION_FAILED";
    error.status = response.status;
    throw error;
  }

  return data;
}

function getFailureMessage(error) {
  switch (error?.code) {
    case "IDENTIFIER_REQUIRED":
      return "Please enter the moderator username or email.";
    case "PASSWORD_REQUIRED":
      return "Please enter the moderator password.";
    case "INVALID_CREDENTIALS":
      return "Moderator username/email or password is incorrect.";
    case "ADMIN_ONLY":
      return "This login area is reserved for admin or moderator accounts.";
    case "LOGIN_ACCOUNT_NOT_FOUND":
      return "The moderator account could not be found in the live auth store.";
    case "ACCOUNT_NOT_FOUND":
      return "The moderator account could not be loaded from the live auth store.";
    case "AUTH_UNAVAILABLE":
      return `The backend auth server is not available on ${getAuthOrigin()}.`;
    case "PRODUCTION_ACCOUNT_STORE_UNAVAILABLE":
      return "The live admin account store is not available right now.";
    case "SESSION_INVALID":
      return "Login succeeded but the admin session could not be confirmed.";
    case "SERVER_ERROR":
      return "The admin authentication service encountered an internal error.";
    default:
      return error?.message || "Something went wrong during moderator login.";
  }
}

function bindModeratorLogin() {
  const form = $("#moderator-login-form");
  const submitButton = $("#moderator-login-submit");

  if (!form || !submitButton) {
    return;
  }

  resetState();

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
    setDebug(`Submitting to ${getAuthOrigin()}`);

    try {
      await loginModerator(identifier, password);
      const session = await verifySession();
      const role = session?.user?.role;

      if (!session?.authenticated || (role !== "admin" && role !== "moderator")) {
        const error = new Error("Login succeeded but the admin session could not be confirmed.");
        error.code = "SESSION_INVALID";
        throw error;
      }

      showSuccess(`Moderator access granted for ${session.user.username || session.user.email}. Redirecting to the dashboard...`);
      setDebug(`Session confirmed as ${role}. Redirecting...`);

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
