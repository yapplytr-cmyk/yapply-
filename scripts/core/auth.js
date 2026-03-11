import { clearAuthSession, setAuthSession } from "./state.js";

function getLocalDevOrigin() {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4174`;
}

function resolveAuthOrigin() {
  const configuredOrigin = window.YAPPLY_AUTH_ORIGIN || document.documentElement.dataset.authOrigin || "";

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  const { hostname, port, origin } = window.location;
  const isLocalFrontend = (hostname === "127.0.0.1" || hostname === "localhost") && port === "4173";

  return isLocalFrontend ? getLocalDevOrigin() : origin;
}

function createApiUrl(path) {
  return `${resolveAuthOrigin()}${path}`;
}

async function requestJson(path, payload) {
  const response = await fetch(createApiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    const authError = new Error(data.message || "Authentication request failed.");
    authError.code = data.code || "UNKNOWN_ERROR";
    throw authError;
  }

  return data;
}

export async function signupAccount(payload) {
  const signupPayload = {
    ...payload,
    role: payload.role || payload.accountRole,
    yearsExperience: payload.yearsExperience || payload.experience,
  };
  delete signupPayload.accountRole;
  delete signupPayload.experience;

  const data = await requestJson("/api/auth/signup", signupPayload);
  setAuthSession({ authenticated: true, user: data.user });
  return data.user;
}

export async function loginAccount(payload, audience = "public") {
  const data = await requestJson("/api/auth/login", { ...payload, audience });
  setAuthSession({ authenticated: true, user: data.user });
  return data.user;
}

export async function logoutAccount() {
  await requestJson("/api/auth/logout", {});
  clearAuthSession();
}

export async function fetchAuthSession() {
  try {
    const response = await fetch(createApiUrl("/api/auth/session"), {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    const data = await response.json();
    setAuthSession(data);
    return data;
  } catch (error) {
    clearAuthSession();
    return { authenticated: false, user: null };
  }
}

export function getAuthOrigin() {
  return resolveAuthOrigin();
}

export async function fetchAdminAccounts() {
  const response = await fetch(createApiUrl("/api/admin/accounts"), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    const authError = new Error(data.message || "Account directory request failed.");
    authError.code = data.code || "UNKNOWN_ERROR";
    throw authError;
  }

  return data.accounts || [];
}

export async function updateAdminAccountStatus(userId, action) {
  const data = await requestJson("/api/admin/accounts/status", { userId, action });
  return data.user;
}

export async function deleteAdminAccount(userId) {
  const data = await requestJson("/api/admin/accounts/delete", { userId });
  return data.deletedUserId;
}
