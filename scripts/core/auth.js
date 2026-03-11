import { clearAuthSession, setAuthSession } from "./state.js";

async function requestJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
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
  const data = await requestJson("/api/auth/signup", payload);
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
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
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
