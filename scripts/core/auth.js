import { clearAuthSession, setAuthSession } from "./state.js";
import { getRuntimeApiOrigin, getSupabaseClient } from "./supabaseClient.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function createAuthError(code, message, cause = null) {
  const error = new Error(message);
  error.code = code;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function isPrivilegedRole(role) {
  return role === "admin" || role === "moderator";
}

function isPublicRole(role) {
  return role === "client" || role === "developer";
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createApiUrl(path) {
  return `${getRuntimeApiOrigin()}${path}`;
}

async function readResponsePayload(response, fallbackMessage) {
  try {
    const raw = await response.text();

    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return {
        code: response.ok ? undefined : response.status >= 500 ? "SERVER_ERROR" : "UNKNOWN_ERROR",
        message: raw.replace(/\s+/g, " ").trim() || fallbackMessage,
      };
    }
  } catch (error) {
    return {};
  }
}

function normalizeSessionUser(authUser, profile) {
  const metadata = authUser.user_metadata || {};

  return {
    id: authUser.id,
    username: profile.username || normalizeText(metadata.username) || null,
    email: normalizeEmail(profile.email || authUser.email || metadata.email || ""),
    role: profile.role || normalizeText(metadata.role) || "",
    status: profile.status || "active",
    fullName: profile.fullName || normalizeText(metadata.full_name || metadata.fullName) || "",
    phoneNumber: profile.phoneNumber || normalizeText(metadata.phone_number || metadata.phoneNumber) || null,
    companyName: profile.companyName || normalizeText(metadata.company_name || metadata.companyName) || null,
    professionType: profile.professionType || normalizeText(metadata.profession_type || metadata.professionType) || null,
    serviceArea: profile.serviceArea || normalizeText(metadata.service_area || metadata.serviceArea) || null,
    yearsExperience:
      profile.yearsExperience !== null && profile.yearsExperience !== undefined
        ? profile.yearsExperience
        : metadata.years_experience ?? metadata.yearsExperience ?? null,
    specialties: profile.specialties || normalizeText(metadata.specialties) || null,
    preferredRegion: profile.preferredRegion || normalizeText(metadata.preferred_region || metadata.preferredRegion) || null,
    website: profile.website || normalizeText(metadata.website) || null,
    createdAt: profile.createdAt || authUser.created_at || null,
  };
}

function mapSupabaseError(error, fallbackCode = "AUTH_UNAVAILABLE") {
  const message = normalizeText(error?.message || "");

  if (!message) {
    return createAuthError(fallbackCode, "Authentication is not available right now.", error);
  }

  const lowered = message.toLowerCase();

  if (lowered.includes("invalid login credentials")) {
    return createAuthError("INVALID_CREDENTIALS", "Email or password is incorrect.", error);
  }

  if (lowered.includes("user already registered")) {
    return createAuthError("EMAIL_IN_USE", "An account with this email already exists.", error);
  }

  if (lowered.includes("email not confirmed")) {
    return createAuthError(
      "EMAIL_CONFIRMATION_REQUIRED",
      "Supabase email confirmation is enabled. Disable email confirmation to keep the current instant signup flow.",
      error
    );
  }

  if (lowered.includes("email address") && lowered.includes("invalid")) {
    return createAuthError("EMAIL_INVALID", "Please enter a valid email address.", error);
  }

  if (lowered.includes("network") || lowered.includes("fetch")) {
    return createAuthError("AUTH_UNAVAILABLE", "Authentication is not available right now. Please try again in a moment.", error);
  }

  return createAuthError(fallbackCode, message, error);
}

function mapProfileToUpsert(authUser, metadata, fallbackRole = "") {
  const role = normalizeText(metadata.role || fallbackRole);

  return {
    id: authUser.id,
    email: normalizeEmail(authUser.email || metadata.email || ""),
    username: normalizeText(metadata.username) || null,
    role,
    status: "active",
    full_name: normalizeText(metadata.full_name || metadata.fullName) || "",
    phone_number: normalizeText(metadata.phone_number || metadata.phoneNumber) || null,
    company_name: normalizeText(metadata.company_name || metadata.companyName) || null,
    profession_type: normalizeText(metadata.profession_type || metadata.professionType) || null,
    service_area: normalizeText(metadata.service_area || metadata.serviceArea) || null,
    years_experience:
      metadata.years_experience === null || metadata.years_experience === undefined || metadata.years_experience === ""
        ? null
        : Number(metadata.years_experience),
    specialties: normalizeText(metadata.specialties) || null,
    preferred_region: normalizeText(metadata.preferred_region || metadata.preferredRegion) || null,
    website: normalizeText(metadata.website) || null,
  };
}

async function fetchOwnProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,username,role,status,full_name,phone_number,company_name,profession_type,service_area,years_experience,specialties,preferred_region,website,created_at,updated_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "ACCOUNT_PROFILE_MISSING");
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    username: data.username,
    role: data.role,
    status: data.status,
    fullName: data.full_name,
    phoneNumber: data.phone_number,
    companyName: data.company_name,
    professionType: data.profession_type,
    serviceArea: data.service_area,
    yearsExperience: data.years_experience,
    specialties: data.specialties,
    preferredRegion: data.preferred_region,
    website: data.website,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function ensureOwnProfile(supabase, authUser, expectedRole = "") {
  const metadata = authUser.user_metadata || {};
  let profile = await fetchOwnProfile(supabase, authUser.id);

  if (profile) {
    return profile;
  }

  const fallbackRole = normalizeText(expectedRole || metadata.role);
  if (!isPublicRole(fallbackRole) && !isPrivilegedRole(fallbackRole)) {
    return null;
  }

  const payload = mapProfileToUpsert(authUser, metadata, fallbackRole);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id,email,username,role,status,full_name,phone_number,company_name,profession_type,service_area,years_experience,specialties,preferred_region,website,created_at,updated_at"
    )
    .single();

  if (error) {
    throw mapSupabaseError(error, "ACCOUNT_PROFILE_MISSING");
  }

  profile = {
    id: data.id,
    email: data.email,
    username: data.username,
    role: data.role,
    status: data.status,
    fullName: data.full_name,
    phoneNumber: data.phone_number,
    companyName: data.company_name,
    professionType: data.profession_type,
    serviceArea: data.service_area,
    yearsExperience: data.years_experience,
    specialties: data.specialties,
    preferredRegion: data.preferred_region,
    website: data.website,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return profile;
}

async function loadConfirmedSession({ expectedRole = "", audience = "public", strict = false } = {}) {
  const supabase = await getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    if (strict) {
      throw mapSupabaseError(sessionError, "SESSION_FAILED");
    }

    clearAuthSession();
    return { authenticated: false, user: null };
  }

  const session = sessionData?.session;
  if (!session?.user) {
    clearAuthSession();
    return { authenticated: false, user: null };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    if (strict) {
      throw mapSupabaseError(userError || new Error("Session verification failed."), "SESSION_FAILED");
    }

    clearAuthSession();
    return { authenticated: false, user: null };
  }

  const authUser = userData.user;
  const profile = await ensureOwnProfile(supabase, authUser, expectedRole);

  if (!profile) {
    if (strict) {
      throw createAuthError("ACCOUNT_PROFILE_MISSING", "The account profile could not be loaded.");
    }

    clearAuthSession();
    return { authenticated: false, user: null };
  }

  const sessionUser = normalizeSessionUser(authUser, profile);

  if (sessionUser.status !== "active") {
    await supabase.auth.signOut();
    clearAuthSession();

    if (strict) {
      throw createAuthError("ACCOUNT_DISABLED", "This account has been disabled. Please contact support.");
    }

    return { authenticated: false, user: null };
  }

  if (audience === "admin" && !isPrivilegedRole(sessionUser.role)) {
    await supabase.auth.signOut();
    clearAuthSession();
    throw createAuthError("ADMIN_SESSION_INVALID", "Admin authentication did not produce a valid admin session.");
  }

  if (audience !== "admin" && isPrivilegedRole(sessionUser.role)) {
    await supabase.auth.signOut();
    clearAuthSession();
    throw createAuthError("ADMIN_USE_INTERNAL", "Admin accounts must use the internal moderator login.");
  }

  if (expectedRole && sessionUser.role !== expectedRole) {
    await supabase.auth.signOut();
    clearAuthSession();
    throw createAuthError("ROLE_MISMATCH", "This account does not match the selected login role.");
  }

  const confirmedSession = { authenticated: true, user: sessionUser };
  setAuthSession(confirmedSession);
  return confirmedSession;
}

function ensurePublicSignupPayload(payload) {
  const role = normalizeText(payload.role || payload.accountRole);
  const fullName = normalizeText(payload.fullName);
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const confirmPassword = String(payload.confirmPassword || "");
  const phoneNumber = normalizeText(payload.phoneNumber);
  const companyName = normalizeText(payload.companyName);
  const professionType = normalizeText(payload.professionType);
  const serviceArea = normalizeText(payload.serviceArea);
  const specialties = normalizeText(payload.specialties);
  const preferredRegion = normalizeText(payload.preferredRegion);
  const website = normalizeText(payload.website);
  const yearsExperienceRaw = normalizeText(payload.yearsExperience || payload.experience);
  const yearsExperience = yearsExperienceRaw === "" ? null : Number(yearsExperienceRaw);

  if (!isPublicRole(role)) {
    throw createAuthError("INVALID_ROLE", "Only client and developer accounts can be created here.");
  }

  if (!fullName) {
    throw createAuthError("FULL_NAME_REQUIRED", "Please enter your full name.");
  }

  if (!email || !validateEmail(email)) {
    throw createAuthError("EMAIL_INVALID", "Please enter a valid email address.");
  }

  if (password.length < 8) {
    throw createAuthError("PASSWORD_TOO_SHORT", "Password must be at least 8 characters.");
  }

  if (confirmPassword && password !== confirmPassword) {
    throw createAuthError("PASSWORD_MISMATCH", "Password confirmation does not match.");
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

async function resolveAdminIdentifier(identifier) {
  const response = await fetch(createApiUrl("/api/auth/admin/resolve"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identifier }),
  });

  const data = await readResponsePayload(response, "Admin identifier lookup failed.");

  if (!response.ok) {
    throw createAuthError(data.code || "LOGIN_ACCOUNT_NOT_FOUND", data.message || "The admin account could not be found.");
  }

  return data.email;
}

async function getCurrentAccessToken() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw mapSupabaseError(error, "SESSION_FAILED");
  }

  const accessToken = data?.session?.access_token;
  if (!accessToken) {
    throw createAuthError("AUTH_REQUIRED", "A valid authenticated session is required.");
  }

  return accessToken;
}

async function requestAdminJson(path, payload = null, method = "GET") {
  const token = await getCurrentAccessToken();
  const response = await fetch(createApiUrl(path), {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const data = await readResponsePayload(response, "Admin request failed.");

  if (!response.ok) {
    throw createAuthError(data.code || "UNKNOWN_ERROR", data.message || "Admin request failed.");
  }

  return data;
}

export async function signupAccount(payload) {
  const signupPayload = ensurePublicSignupPayload(payload);
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email: signupPayload.email,
    password: signupPayload.password,
    options: {
      data: {
        role: signupPayload.role,
        full_name: signupPayload.fullName,
        phone_number: signupPayload.phoneNumber,
        company_name: signupPayload.companyName,
        profession_type: signupPayload.professionType,
        service_area: signupPayload.serviceArea,
        years_experience: signupPayload.yearsExperience,
        specialties: signupPayload.specialties,
        preferred_region: signupPayload.preferredRegion,
        website: signupPayload.website,
      },
    },
  });

  if (error) {
    throw mapSupabaseError(error, "AUTH_UNAVAILABLE");
  }

  if (!data?.session || !data?.user) {
    throw createAuthError(
      "EMAIL_CONFIRMATION_REQUIRED",
      "Supabase email confirmation is enabled. Disable it to preserve the current instant signup flow."
    );
  }

  const session = await loadConfirmedSession({
    expectedRole: signupPayload.role,
    audience: "public",
    strict: true,
  });

  if (!session.authenticated) {
    throw createAuthError("ACCOUNT_SESSION_INVALID", "Your account was created, but the new session could not be confirmed.");
  }

  return session.user;
}

export async function loginAccount(payload, audience = "public") {
  const supabase = await getSupabaseClient();
  const password = String(payload.password || "");
  const requestedRole = normalizeText(payload.role);
  const rawIdentifier = normalizeText(payload.identifier || payload.email || payload.username);

  if (!rawIdentifier) {
    throw createAuthError(
      audience === "admin" ? "IDENTIFIER_REQUIRED" : "EMAIL_INVALID",
      audience === "admin" ? "Please enter the moderator username or email." : "Please enter a valid email address."
    );
  }

  if (!password) {
    throw createAuthError("PASSWORD_REQUIRED", "Please enter your password.");
  }

  const email =
    audience === "admin"
      ? rawIdentifier.includes("@")
        ? normalizeEmail(rawIdentifier)
        : await resolveAdminIdentifier(rawIdentifier)
      : normalizeEmail(rawIdentifier);

  if (!validateEmail(email)) {
    throw createAuthError("EMAIL_INVALID", "Please enter a valid email address.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw mapSupabaseError(error, "INVALID_CREDENTIALS");
  }

  const session = await loadConfirmedSession({
    expectedRole: audience === "admin" ? "" : requestedRole,
    audience,
    strict: true,
  });

  if (!session.authenticated) {
    throw createAuthError(audience === "admin" ? "ADMIN_SESSION_INVALID" : "SESSION_INVALID", "Session could not be confirmed.");
  }

  return session.user;
}

export async function logoutAccount() {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw mapSupabaseError(error, "AUTH_UNAVAILABLE");
  }

  clearAuthSession();
}

export async function fetchAuthSession() {
  try {
    return await loadConfirmedSession({ strict: false });
  } catch (error) {
    clearAuthSession();
    return { authenticated: false, user: null };
  }
}

export function getAuthOrigin() {
  return getRuntimeApiOrigin();
}

export async function fetchAdminAccounts() {
  const data = await requestAdminJson("/api/admin/accounts");
  return data.accounts || [];
}

export async function updateAdminAccountStatus(userId, action) {
  const data = await requestAdminJson("/api/admin/accounts/status", { userId, action }, "POST");
  return data.user;
}

export async function deleteAdminAccount(userId) {
  const data = await requestAdminJson("/api/admin/accounts/delete", { userId }, "POST");
  return data.deletedUserId;
}

export async function fetchAdminAccountStoreStatus() {
  const data = await requestAdminJson("/api/admin/account-store-status");
  return data.status || {};
}
