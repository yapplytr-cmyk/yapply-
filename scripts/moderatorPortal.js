const AUTH_ORIGIN = "http://127.0.0.1:4174";
const REDIRECT_URL = "./admin-dashboard.html";

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
  setDebug(`Backend origin: ${AUTH_ORIGIN}`);
}

function showError(message) {
  const box = $("#moderator-login-error");
  const text = $("#moderator-login-error-text");

  if (text) {
    text.textContent = message;
  }

  box?.removeAttribute("hidden");
  $("#moderator-login-success")?.setAttribute("hidden", "");
}

function showSuccess(message) {
  const box = $("#moderator-login-success");
  const text = $("#moderator-login-success-text");

  if (text) {
    text.textContent = message;
  }

  box?.removeAttribute("hidden");
  $("#moderator-login-error")?.setAttribute("hidden", "");
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function loginModerator(identifier, password) {
  setDebug(`POST ${AUTH_ORIGIN}/api/auth/login`);

  const response = await fetch(`${AUTH_ORIGIN}/api/auth/login`, {
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
    const error = new Error(data.message || "Authentication request failed.");
    error.code = data.code || "UNKNOWN_ERROR";
    throw error;
  }

  return data;
}

async function verifySession() {
  setDebug(`GET ${AUTH_ORIGIN}/api/auth/session`);

  const response = await fetch(`${AUTH_ORIGIN}/api/auth/session`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await readJson(response);
  setDebug(`Session status: ${response.status}`);

  if (!response.ok) {
    const error = new Error(data.message || "Session verification failed.");
    error.code = data.code || "SESSION_FAILED";
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
    case "AUTH_UNAVAILABLE":
      return "The backend auth server is not available on 127.0.0.1:4174.";
    case "SESSION_INVALID":
      return "Login succeeded but the admin session could not be confirmed.";
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
    setDebug(`Submitting to ${AUTH_ORIGIN}`);

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
