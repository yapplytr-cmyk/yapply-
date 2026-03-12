import { clearAuthSession, getAuthSession, setAuthSession } from "./state.js";

const PUBLIC_BROWSER_ACCOUNTS_KEY = "yapply-browser-public-accounts-v1";
const PUBLIC_BROWSER_SESSION_KEY = "yapply-browser-public-session-v1";

function getLocalDevOrigin() {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4174`;
}

function getStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

function isLocalFrontend() {
  const { hostname, port } = window.location;
  return (hostname === "127.0.0.1" || hostname === "localhost") && port === "4173";
}

function resolveAuthOrigin() {
  const configuredOrigin = window.YAPPLY_AUTH_ORIGIN || document.documentElement.dataset.authOrigin || "";

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  return isLocalFrontend() ? getLocalDevOrigin() : window.location.origin;
}

function createApiUrl(path) {
  return `${resolveAuthOrigin()}${path}`;
}

function usesBrowserPublicAuth() {
  return !isLocalFrontend();
}

function isPrivilegedRole(role) {
  return role === "admin" || role === "moderator";
}

function isBrowserManagedPublicRole(role) {
  return role === "client" || role === "developer";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function createAuthError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireBrowserStorage() {
  if (!getStorage()) {
    throw createAuthError(
      "AUTH_UNAVAILABLE",
      "This browser is blocking secure local account storage. Please enable site storage and try again."
    );
  }
}

function loadBrowserPublicAccounts() {
  const raw = getStorage()?.getItem(PUBLIC_BROWSER_ACCOUNTS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveBrowserPublicAccounts(accounts) {
  try {
    getStorage()?.setItem(PUBLIC_BROWSER_ACCOUNTS_KEY, JSON.stringify(accounts));
    return true;
  } catch (error) {
    return false;
  }
}

function loadBrowserPublicSession() {
  const raw = getStorage()?.getItem(PUBLIC_BROWSER_SESSION_KEY);

  if (!raw) {
    return { authenticated: false, user: null };
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed?.authenticated && parsed?.user ? parsed : { authenticated: false, user: null };
  } catch (error) {
    return { authenticated: false, user: null };
  }
}

function saveBrowserPublicSession(user) {
  try {
    getStorage()?.setItem(
      PUBLIC_BROWSER_SESSION_KEY,
      JSON.stringify({
        authenticated: true,
        user,
      })
    );
    return true;
  } catch (error) {
    return false;
  }
}

function clearBrowserPublicSession() {
  getStorage()?.removeItem(PUBLIC_BROWSER_SESSION_KEY);
}

function createAccountSortValue(account) {
  const timestamp = account?.createdAt ? Date.parse(account.createdAt) : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortAccountsByCreatedAt(accounts) {
  return [...accounts].sort((left, right) => {
    const delta = createAccountSortValue(right) - createAccountSortValue(left);

    if (delta !== 0) {
      return delta;
    }

    return String(left.fullName || left.email || "").localeCompare(String(right.fullName || right.email || ""));
  });
}

function getMergedAccountKey(account) {
  if (account?.id) {
    return `id:${account.id}`;
  }

  return `email:${normalizeEmail(account?.email || "")}`;
}

function getBrowserPublicAccountsForAdmin() {
  return sortAccountsByCreatedAt(
    loadBrowserPublicAccounts()
      .filter((account) => isBrowserManagedPublicRole(account.role))
      .map((account) => ({
        ...serializeBrowserUser(account),
        source: "browser-public",
      }))
  );
}

function mergeAccountCollections(primaryAccounts, secondaryAccounts) {
  const merged = new Map();

  [...primaryAccounts, ...secondaryAccounts].forEach((account) => {
    if (!account) {
      return;
    }

    const key = getMergedAccountKey(account);

    if (!merged.has(key)) {
      merged.set(key, account);
    }
  });

  return sortAccountsByCreatedAt([...merged.values()]);
}

function syncBrowserManagedSessionForAccount(account) {
  const storedSession = loadBrowserPublicSession();

  if (!storedSession.authenticated || storedSession.user?.id !== account?.id) {
    return;
  }

  if (account.status === "inactive") {
    clearBrowserPublicSession();

    const activeSession = getAuthSession();
    if (activeSession?.user?.id === account.id && !isPrivilegedRole(activeSession.user.role)) {
      clearAuthSession();
    }

    return;
  }

  const user = serializeBrowserUser(account);

  if (!saveBrowserPublicSession(user)) {
    clearBrowserPublicSession();

    const activeSession = getAuthSession();
    if (activeSession?.user?.id === account.id && !isPrivilegedRole(activeSession.user.role)) {
      clearAuthSession();
    }

    return;
  }

  const activeSession = getAuthSession();
  if (activeSession?.user?.id === account.id && !isPrivilegedRole(activeSession.user.role)) {
    setAuthSession({ authenticated: true, user });
  }
}

function clearBrowserManagedSessionForUser(userId) {
  const storedSession = loadBrowserPublicSession();

  if (!storedSession.authenticated || storedSession.user?.id !== userId) {
    return;
  }

  clearBrowserPublicSession();

  const activeSession = getAuthSession();
  if (activeSession?.user?.id === userId && !isPrivilegedRole(activeSession.user.role)) {
    clearAuthSession();
  }
}

function generateRecordId(prefix) {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function digestSecret(secret) {
  if (window.crypto?.subtle?.digest && window.TextEncoder) {
    const encoded = new TextEncoder().encode(secret);
    const digest = await window.crypto.subtle.digest("SHA-256", encoded);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  return btoa(unescape(encodeURIComponent(secret)));
}

function serializeBrowserUser(account) {
  return {
    id: account.id,
    username: account.username || null,
    email: account.email,
    role: account.role,
    fullName: account.fullName,
    phoneNumber: account.phoneNumber || null,
    companyName: account.companyName || null,
    professionType: account.professionType || null,
    serviceArea: account.serviceArea || null,
    yearsExperience: account.yearsExperience ?? null,
    specialties: account.specialties || null,
    preferredRegion: account.preferredRegion || null,
    website: account.website || null,
    createdAt: account.createdAt,
    status: account.status || "active",
  };
}

function ensurePublicSignupPayload(payload) {
  const role = normalizeText(payload.role || payload.accountRole);
  const fullName = normalizeText(payload.fullName);
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const phoneNumber = normalizeText(payload.phoneNumber);
  const companyName = normalizeText(payload.companyName);
  const professionType = normalizeText(payload.professionType);
  const serviceArea = normalizeText(payload.serviceArea);
  const specialties = normalizeText(payload.specialties);
  const preferredRegion = normalizeText(payload.preferredRegion);
  const website = normalizeText(payload.website);
  const yearsExperienceRaw = normalizeText(payload.yearsExperience || payload.experience);
  const yearsExperience = yearsExperienceRaw === "" ? null : Number(yearsExperienceRaw);

  if (role !== "client" && role !== "developer") {
    throw createAuthError("INVALID_ROLE", "Only client and developer accounts can be created here.");
  }

  if (!fullName) {
    throw createAuthError("FULL_NAME_REQUIRED", "Please enter your full name.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createAuthError("EMAIL_INVALID", "Please enter a valid email address.");
  }

  if (password.length < 8) {
    throw createAuthError("PASSWORD_TOO_SHORT", "Password must be at least 8 characters.");
  }

  if (!phoneNumber) {
    throw createAuthError("PHONE_REQUIRED", "Phone number is required for this account type.");
  }

  if (role === "developer") {
    if (!companyName) {
      throw createAuthError("COMPANY_REQUIRED", "Company or professional name is required for developer accounts.");
    }

    if (!professionType) {
      throw createAuthError("PROFESSION_REQUIRED", "Profession type is required for developer accounts.");
    }

    if (!serviceArea) {
      throw createAuthError("SERVICE_AREA_REQUIRED", "City or service area is required for developer accounts.");
    }

    if (yearsExperience === null || Number.isNaN(yearsExperience) || yearsExperience < 0) {
      throw createAuthError("EXPERIENCE_INVALID", "Years of experience must be a valid non-negative number.");
    }

    if (!specialties) {
      throw createAuthError("SPECIALTIES_REQUIRED", "Please enter at least one specialty for the developer account.");
    }
  }

  if (role === "client" && !preferredRegion) {
    throw createAuthError("REGION_REQUIRED", "Preferred city or region is required for client accounts.");
  }

  return {
    role,
    fullName,
    email,
    password,
    phoneNumber,
    companyName: companyName || null,
    professionType: professionType || null,
    serviceArea: serviceArea || null,
    yearsExperience: yearsExperience === null || Number.isNaN(yearsExperience) ? null : yearsExperience,
    specialties: specialties || null,
    preferredRegion: preferredRegion || null,
    website: website || null,
  };
}

async function signupBrowserPublicAccount(payload) {
  requireBrowserStorage();
  const cleanPayload = ensurePublicSignupPayload(payload);
  const accounts = loadBrowserPublicAccounts();

  if (accounts.some((account) => account.email === cleanPayload.email)) {
    throw createAuthError("EMAIL_IN_USE", "An account with this email already exists.");
  }

  const account = {
    id: generateRecordId("acct"),
    username: null,
    email: cleanPayload.email,
    passwordHash: await digestSecret(cleanPayload.password),
    role: cleanPayload.role,
    fullName: cleanPayload.fullName,
    phoneNumber: cleanPayload.phoneNumber,
    companyName: cleanPayload.companyName,
    professionType: cleanPayload.professionType,
    serviceArea: cleanPayload.serviceArea,
    yearsExperience: cleanPayload.yearsExperience,
    specialties: cleanPayload.specialties,
    preferredRegion: cleanPayload.preferredRegion,
    website: cleanPayload.website,
    createdAt: new Date().toISOString(),
    status: "active",
  };
  const user = serializeBrowserUser(account);

  accounts.unshift(account);
  if (!saveBrowserPublicAccounts(accounts) || !saveBrowserPublicSession(user)) {
    throw createAuthError(
      "AUTH_UNAVAILABLE",
      "This browser could not persist the new account securely. Please enable site storage and try again."
    );
  }

  setAuthSession({ authenticated: true, user });
  return user;
}

async function loginBrowserPublicAccount(payload) {
  requireBrowserStorage();
  const identifier = normalizeEmail(payload.identifier || payload.email);
  const password = String(payload.password || "");
  const expectedRole = normalizeText(payload.role);
  const accounts = loadBrowserPublicAccounts();

  if (!identifier) {
    throw createAuthError("EMAIL_INVALID", "Please enter a valid email address.");
  }

  if (!password) {
    throw createAuthError("PASSWORD_REQUIRED", "Please enter your password.");
  }

  const account = accounts.find((entry) => entry.email === identifier);

  if (!account) {
    throw createAuthError("INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  if (expectedRole && account.role !== expectedRole) {
    throw createAuthError("ROLE_MISMATCH", "This account does not match the selected login role.");
  }

  if (account.role === "admin" || account.role === "moderator") {
    throw createAuthError("ADMIN_USE_INTERNAL", "Admin accounts must use the internal moderator login.");
  }

  if (account.status === "inactive") {
    throw createAuthError("ACCOUNT_DISABLED", "This account has been disabled. Please contact support.");
  }

  const incomingHash = await digestSecret(password);

  if (incomingHash !== account.passwordHash) {
    throw createAuthError("INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  try {
    await syncBrowserPublicAccountToBackend(account, password);
  } catch (error) {
    // Keep legacy browser-backed login available even if backend sync fails.
  }

  const user = serializeBrowserUser(account);

  if (!saveBrowserPublicSession(user)) {
    throw createAuthError(
      "AUTH_UNAVAILABLE",
      "This browser could not persist the new login session. Please enable site storage and try again."
    );
  }

  setAuthSession({ authenticated: true, user });
  return user;
}

async function syncBrowserPublicAccountToBackend(account, password) {
  if (!usesBrowserPublicAuth()) {
    return;
  }

  const signupPayload = {
    role: account.role,
    fullName: account.fullName,
    email: account.email,
    password,
    confirmPassword: password,
    phoneNumber: account.phoneNumber || "",
    companyName: account.companyName || "",
    professionType: account.professionType || "",
    serviceArea: account.serviceArea || "",
    yearsExperience: account.yearsExperience ?? "",
    specialties: account.specialties || "",
    preferredRegion: account.preferredRegion || "",
    website: account.website || "",
  };

  try {
    await requestJson("/api/auth/signup", signupPayload);
  } catch (error) {
    if (error?.code === "EMAIL_IN_USE") {
      return;
    }

    if (error?.code) {
      throw error;
    }
  }
}

async function fetchBackendAdminAccounts() {
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

  if (usesBrowserPublicAuth()) {
    try {
      const data = await requestJson("/api/auth/signup", signupPayload);
      setAuthSession({ authenticated: true, user: data.user });
      return data.user;
    } catch (error) {
      if (error?.code) {
        throw error;
      }
    }

    return signupBrowserPublicAccount(payload);
  }

  const data = await requestJson("/api/auth/signup", signupPayload);
  setAuthSession({ authenticated: true, user: data.user });
  return data.user;
}

export async function loginAccount(payload, audience = "public") {
  if (audience === "public" && usesBrowserPublicAuth()) {
    try {
      const data = await requestJson("/api/auth/login", { ...payload, audience });
      setAuthSession({ authenticated: true, user: data.user });
      return data.user;
    } catch (error) {
      if (error?.code && error.code !== "INVALID_CREDENTIALS") {
        throw error;
      }
    }

    return loginBrowserPublicAccount(payload);
  }

  const data = await requestJson("/api/auth/login", { ...payload, audience });
  setAuthSession({ authenticated: true, user: data.user });
  return data.user;
}

export async function logoutAccount() {
  if (usesBrowserPublicAuth()) {
    requireBrowserStorage();
    clearBrowserPublicSession();

    try {
      await requestJson("/api/auth/logout", {});
    } catch (error) {
      // Ignore backend logout failures when the active public session is browser-managed.
    }

    clearAuthSession();
    return;
  }

  await requestJson("/api/auth/logout", {});
  clearAuthSession();
}

export async function fetchAuthSession() {
  if (usesBrowserPublicAuth()) {
    if (!getStorage()) {
      clearAuthSession();
      return { authenticated: false, user: null };
    }

    try {
      const response = await fetch(createApiUrl("/api/auth/session"), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json();

      if (data?.authenticated && data?.user) {
        setAuthSession(data);
        return data;
      }
    } catch (error) {
      // Fall back to the browser-managed public session below.
    }

    const session = loadBrowserPublicSession();
    setAuthSession(session);
    return session;
  }

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
  const backendAccounts = await fetchBackendAdminAccounts();

  if (!usesBrowserPublicAuth()) {
    return backendAccounts;
  }

  return mergeAccountCollections(backendAccounts, getBrowserPublicAccountsForAdmin());
}

export async function updateAdminAccountStatus(userId, action) {
  if (usesBrowserPublicAuth()) {
    const accounts = loadBrowserPublicAccounts();
    const index = accounts.findIndex((account) => account.id === userId && isBrowserManagedPublicRole(account.role));

    if (index >= 0) {
      const nextStatus = action === "disable" ? "inactive" : "active";
      const updatedAccount = {
        ...accounts[index],
        status: nextStatus,
      };

      accounts[index] = updatedAccount;
      if (!saveBrowserPublicAccounts(accounts)) {
        throw createAuthError("AUTH_UNAVAILABLE", "The updated account state could not be saved in this browser.");
      }

      syncBrowserManagedSessionForAccount(updatedAccount);

      return {
        ...serializeBrowserUser(updatedAccount),
        source: "browser-public",
      };
    }
  }

  const data = await requestJson("/api/admin/accounts/status", { userId, action });
  return data.user;
}

export async function deleteAdminAccount(userId) {
  if (usesBrowserPublicAuth()) {
    const accounts = loadBrowserPublicAccounts();
    const nextAccounts = accounts.filter((account) => !(account.id === userId && isBrowserManagedPublicRole(account.role)));

    if (nextAccounts.length !== accounts.length) {
      if (!saveBrowserPublicAccounts(nextAccounts)) {
        throw createAuthError("AUTH_UNAVAILABLE", "The updated account directory could not be saved in this browser.");
      }

      clearBrowserManagedSessionForUser(userId);

      try {
        const marketplaceStore = await import("./marketplaceStore.js");
        marketplaceStore.deleteOwnedMarketplaceListings?.(userId);
      } catch (error) {
        // Keep account deletion resilient even if marketplace cleanup is unavailable.
      }

      return userId;
    }
  }

  const data = await requestJson("/api/admin/accounts/delete", { userId });
  return data.deletedUserId;
}
