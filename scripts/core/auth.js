import { clearAuthSession, getAuthSession, setAuthSession } from "./state.js";
import { getRuntimeApiOrigin, getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";
import { getDefaultAvatarOptions } from "./accountSettingsStore.js";

const PROFILE_SELECT_FIELDS =
  "id,email,username,role,status,full_name,phone_number,company_name,profession_type,service_area,years_experience,specialties,preferred_region,website,avatar_url,work_description,developer_type,business_name,business_website,business_locations,business_description,business_photos,portfolio_links,selfie_url,current_plan,bid_limit,bids_used,bid_cycle_start,created_at,updated_at";

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

function resolveDefaultAvatarSrc(role = "", avatarId = "") {
  const options = getDefaultAvatarOptions(role || "client");

  if (avatarId) {
    const matched = options.find((option) => option.id === avatarId);
    if (matched?.src) {
      return matched.src;
    }
  }

  return options[0]?.src || "";
}

function normalizeProfilePictureSettings(metadata = {}, role = "", profileAvatarUrl = "") {
  const profilePictureType = normalizeText(metadata.profile_picture_type || metadata.profilePictureType) || "default";
  const profilePictureId = normalizeText(metadata.profile_picture_id || metadata.profilePictureId) || "";
  const profilePicturePath = normalizeText(metadata.profile_picture_path || metadata.profilePicturePath) || "";
  const profilePictureUrl = normalizeText(profileAvatarUrl || metadata.profile_picture_url || metadata.profilePictureUrl);
  const defaultAvatarSrc = resolveDefaultAvatarSrc(role, profilePictureId);
  const resolvedType = profilePictureUrl ? "upload" : profilePictureType;

  return {
    profilePictureSrc:
      resolvedType === "upload"
        ? profilePictureUrl || defaultAvatarSrc
        : defaultAvatarSrc,
    profilePictureId,
    profilePicturePath,
    profilePictureUrl,
    profilePictureType: resolvedType,
  };
}

function mapProfileRecord(data) {
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
    avatarUrl: data.avatar_url,
    workDescription: data.work_description || null,
    developerType: data.developer_type || null,
    businessName: data.business_name || null,
    businessWebsite: data.business_website || null,
    businessLocations: data.business_locations || null,
    businessDescription: data.business_description || null,
    businessPhotos: data.business_photos || [],
    portfolioLinks: data.portfolio_links || [],
    selfieUrl: data.selfie_url || null,
    currentPlan: data.current_plan || "free",
    bidLimit: data.bid_limit ?? 15,
    bidsUsed: data.bids_used ?? 0,
    bidCycleStart: data.bid_cycle_start || null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function normalizeSessionUser(authUser, profile) {
  const metadata = authUser.user_metadata || {};
  const resolvedRole = resolveProfileRole(profile, metadata, "");
  const profilePicture = normalizeProfilePictureSettings(metadata, resolvedRole, profile.avatarUrl || "");

  return {
    id: authUser.id,
    username: profile.username || normalizeText(metadata.username) || null,
    email: normalizeEmail(profile.email || authUser.email || metadata.email || ""),
    role: resolvedRole,
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
    workDescription: normalizeText(metadata.work_description || metadata.workDescription) || null,
    developerType: profile.developerType || normalizeText(metadata.developer_type || metadata.developerType) || null,
    businessName: profile.businessName || normalizeText(metadata.business_name || metadata.businessName) || null,
    businessWebsite: profile.businessWebsite || normalizeText(metadata.business_website || metadata.businessWebsite) || null,
    businessLocations: profile.businessLocations || normalizeText(metadata.business_locations || metadata.businessLocations) || null,
    businessDescription: profile.businessDescription || normalizeText(metadata.business_description || metadata.businessDescription) || null,
    businessPhotos: profile.businessPhotos || metadata.business_photos || metadata.businessPhotos || [],
    portfolioLinks: profile.portfolioLinks || metadata.portfolio_links || metadata.portfolioLinks || [],
    selfieUrl: profile.selfieUrl || normalizeText(metadata.selfie_url || metadata.selfieUrl) || null,
    currentPlan: profile.currentPlan || "free",
    bidLimit: profile.bidLimit ?? 15,
    bidsUsed: profile.bidsUsed ?? 0,
    bidCycleStart: profile.bidCycleStart || null,
    createdAt: profile.createdAt || authUser.created_at || null,
    profilePictureSrc: profilePicture.profilePictureSrc,
    profilePictureId: profilePicture.profilePictureId,
    profilePicturePath: profilePicture.profilePicturePath,
    profilePictureUrl: profilePicture.profilePictureUrl,
    profilePictureType: profilePicture.profilePictureType,
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

function resolveProfileRole(profile, metadata, expectedRole = "") {
  const directCandidates = [profile?.role, metadata.role, metadata.account_role, expectedRole];

  for (const candidate of directCandidates) {
    const normalized = normalizeText(candidate);
    if (isPublicRole(normalized) || isPrivilegedRole(normalized)) {
      return normalized;
    }
  }

  const hasDeveloperSignals = [
    profile?.companyName,
    profile?.professionType,
    profile?.serviceArea,
    profile?.specialties,
    metadata.company_name,
    metadata.companyName,
    metadata.profession_type,
    metadata.professionType,
    metadata.service_area,
    metadata.serviceArea,
    metadata.specialties,
  ].some((value) => normalizeText(value));

  if (hasDeveloperSignals) {
    return "developer";
  }

  const hasClientSignals = [profile?.preferredRegion, metadata.preferred_region, metadata.preferredRegion].some((value) =>
    normalizeText(value)
  );

  if (hasClientSignals) {
    return "client";
  }

  return "";
}

function mapProfileToUpsert(authUser, metadata, fallbackRole = "", existingProfile = null) {
  const role = resolveProfileRole(existingProfile, metadata, fallbackRole);
  const profile = existingProfile || {};

  return {
    id: authUser.id,
    email: normalizeEmail(authUser.email || metadata.email || profile.email || ""),
    username: normalizeText(metadata.username || profile.username) || null,
    role,
    status: normalizeText(profile.status) || "active",
    full_name: normalizeText(metadata.full_name || metadata.fullName || profile.fullName) || "",
    phone_number: normalizeText(metadata.phone_number || metadata.phoneNumber || profile.phoneNumber) || null,
    company_name: normalizeText(metadata.company_name || metadata.companyName || profile.companyName) || null,
    profession_type: normalizeText(metadata.profession_type || metadata.professionType || profile.professionType) || null,
    service_area: normalizeText(metadata.service_area || metadata.serviceArea || profile.serviceArea) || null,
    years_experience:
      metadata.years_experience === null || metadata.years_experience === undefined || metadata.years_experience === ""
        ? profile.yearsExperience ?? null
        : Number(metadata.years_experience),
    specialties: normalizeText(metadata.specialties || profile.specialties) || null,
    preferred_region: normalizeText(metadata.preferred_region || metadata.preferredRegion || profile.preferredRegion) || null,
    website: normalizeText(metadata.website || profile.website) || null,
    avatar_url: normalizeText(
      metadata.profile_picture_url || metadata.profilePictureUrl ||
      metadata.avatar_url || metadata.avatarUrl ||
      profile.avatarUrl
    ) || resolveDefaultAvatarSrc(role, normalizeText(metadata.profile_picture_id || metadata.profilePictureId) || "") || null,
    developer_type: normalizeText(metadata.developer_type || metadata.developerType || profile.developerType) || null,
    business_name: normalizeText(metadata.business_name || metadata.businessName || profile.businessName) || null,
    business_website: normalizeText(metadata.business_website || metadata.businessWebsite || profile.businessWebsite) || null,
    business_locations: normalizeText(metadata.business_locations || metadata.businessLocations || profile.businessLocations) || null,
    business_description: normalizeText(metadata.business_description || metadata.businessDescription || profile.businessDescription) || null,
  };
}

async function fetchOwnProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_FIELDS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "ACCOUNT_PROFILE_MISSING");
  }

  if (!data) {
    return null;
  }

  return mapProfileRecord(data);
}

async function ensureOwnProfile(supabase, authUser, expectedRole = "") {
  const metadata = authUser.user_metadata || {};
  let profile = await fetchOwnProfile(supabase, authUser.id);

  const fallbackRole = resolveProfileRole(profile, metadata, expectedRole);

  if (!isPublicRole(fallbackRole) && !isPrivilegedRole(fallbackRole)) {
    return profile || null;
  }

  const payload = mapProfileToUpsert(authUser, metadata, fallbackRole, profile);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(PROFILE_SELECT_FIELDS)
    .single();

  if (error) {
    throw mapSupabaseError(error, "ACCOUNT_PROFILE_MISSING");
  }

  profile = mapProfileRecord(data);

  return profile;
}

function normalizeAccountSettingsPayload(payload = {}) {
  const username = normalizeText(payload.username);
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const profilePictureId = normalizeText(payload.profilePictureId);
  const profilePictureType = normalizeText(payload.profilePictureType) || "default";
  const profilePictureUploadDataUrl = normalizeText(payload.profilePictureUploadDataUrl);
  const profilePictureUploadName = normalizeText(payload.profilePictureUploadName);
  const preserveProfilePictureUpload = Boolean(payload.preserveProfilePictureUpload);
  const workDescription = normalizeText(payload.workDescription);

  if (!username) {
    throw createAuthError("USERNAME_REQUIRED", "Please enter a username.");
  }

  if (!email || !validateEmail(email)) {
    throw createAuthError("EMAIL_INVALID", "Please enter a valid email address.");
  }

  if (password && password.length < 8) {
    throw createAuthError("PASSWORD_TOO_SHORT", "Password must be at least 8 characters.");
  }

  if (!["default", "upload"].includes(profilePictureType)) {
    throw createAuthError("PROFILE_PICTURE_INVALID", "The selected profile picture type is invalid.");
  }

  if (profilePictureType === "default" && !profilePictureId) {
    throw createAuthError("PROFILE_PICTURE_INVALID", "Please select a default profile picture.");
  }

  if (profilePictureType === "upload" && !profilePictureUploadDataUrl && !preserveProfilePictureUpload) {
    throw createAuthError("PROFILE_PICTURE_INVALID", "The selected profile picture could not be saved.");
  }

  return {
    username,
    email,
    password,
    profilePictureId,
    profilePictureType,
    profilePictureUploadDataUrl,
    profilePictureUploadName,
    preserveProfilePictureUpload,
    workDescription,
  };
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

  if (audience === "public" && isPrivilegedRole(sessionUser.role)) {
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
  const phoneNumber = normalizeText(payload.phoneNumber || payload.phone);
  const companyName = normalizeText(payload.companyName);
  const professionType = normalizeText(payload.professionType || payload.specialty || payload.specialties);
  const serviceArea = normalizeText(payload.serviceArea || payload.city || payload.preferredRegion);
  const specialties = normalizeText(payload.specialties || payload.specialty);
  const preferredRegion = normalizeText(payload.preferredRegion || payload.city);
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

  // Developer expansion fields (optional, pass-through)
  const developerType = normalizeText(payload.developerType);
  const businessName = normalizeText(payload.businessName);
  const businessWebsite = normalizeText(payload.businessWebsite);
  const businessLocations = normalizeText(payload.businessLocations);
  const businessDescription = normalizeText(payload.businessDescription);
  const businessPhotos = Array.isArray(payload.businessPhotos) ? payload.businessPhotos : [];
  const portfolioLinks = Array.isArray(payload.portfolioLinks) ? payload.portfolioLinks : [];
  const selfieUrl = normalizeText(payload.selfieUrl);

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
    developerType: developerType || null,
    businessName: businessName || null,
    businessWebsite: businessWebsite || null,
    businessLocations: businessLocations || null,
    businessDescription: businessDescription || null,
    businessPhotos,
    portfolioLinks,
    selfieUrl: selfieUrl || null,
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

function getModeratorEmailCandidate(identifier) {
  const value = normalizeText(identifier).toLowerCase();
  if (!value || value.includes("@")) {
    return value;
  }

  return `${value}@yapply.internal`;
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

async function requestAdminLogin(identifier, password) {
  const response = await fetch(createApiUrl("/api/auth/admin/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ identifier, password }),
  });

  const data = await readResponsePayload(response, "Admin login failed.");

  if (!response.ok) {
    throw createAuthError(data.code || "UNKNOWN_ERROR", data.message || "Admin login failed.");
  }

  return data;
}

async function requestPublicSignup(payload) {
  const response = await fetch(createApiUrl("/api/auth/signup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await readResponsePayload(response, "Account creation failed.");

  if (!response.ok) {
    throw createAuthError(data.code || "UNKNOWN_ERROR", data.message || "Account creation failed.");
  }

  return data;
}

async function requestPublicLogin(identifier, password, role) {
  const response = await fetch(createApiUrl("/api/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ identifier, password, role, audience: "public" }),
  });

  const data = await readResponsePayload(response, "Login failed.");

  if (!response.ok) {
    throw createAuthError(data.code || "UNKNOWN_ERROR", data.message || "Login failed.");
  }

  return data;
}

async function requestOwnAccountSettingsUpdate(payload) {
  const token = await getCurrentAccessToken();
  const response = await fetch(createApiUrl("/api/account/settings"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await readResponsePayload(response, "Account settings update failed.");

  if (!response.ok) {
    throw createAuthError(data.code || "ACCOUNT_SETTINGS_UPDATE_FAILED", data.message || "Account settings update failed.");
  }

  return data;
}

export async function signupAccount(payload) {
  const signupPayload = ensurePublicSignupPayload(payload);
  const supabase = await getSupabaseClient();

  const data = await requestPublicSignup(signupPayload);

  // Check if email verification is required (OTP flow).
  if (data?.pendingVerification) {
    const pending = new Error("Email verification required.");
    pending.code = "PENDING_EMAIL_VERIFICATION";
    pending.email = data.email;
    pending.role = data.role;
    pending.password = data.password;
    throw pending;
  }

  if (!data?.session?.access_token || !data?.session?.refresh_token) {
    throw createAuthError(
      "EMAIL_CONFIRMATION_REQUIRED",
      "Supabase email confirmation is enabled. Disable it to preserve the current instant signup flow."
    );
  }

  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  if (setSessionError) {
    throw mapSupabaseError(setSessionError, "ACCOUNT_SESSION_INVALID");
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

export async function verifySignupOtp(email, token, password) {
  const response = await fetch(createApiUrl("/api/auth/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, token, password }),
  });

  const data = await readResponsePayload(response, "Verification failed.");
  if (!response.ok) {
    throw createAuthError(data.code || "OTP_INVALID", data.message || "Invalid or expired verification code.");
  }

  if (!data?.session?.access_token || !data?.session?.refresh_token) {
    throw createAuthError("SESSION_INVALID", "Verification succeeded but no session was returned.");
  }

  const supabase = await getSupabaseClient();
  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  if (setSessionError) {
    throw mapSupabaseError(setSessionError, "ACCOUNT_SESSION_INVALID");
  }

  const session = await loadConfirmedSession({
    expectedRole: data.user?.role,
    audience: "public",
    strict: true,
  });

  if (!session.authenticated) {
    throw createAuthError("ACCOUNT_SESSION_INVALID", "Session could not be confirmed after verification.");
  }

  return session.user;
}

export async function resendSignupOtp(email) {
  const response = await fetch(createApiUrl("/api/auth/resend-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await readResponsePayload(response, "Could not resend code.");
  if (!response.ok) {
    throw createAuthError(data.code || "OTP_RESEND_FAILED", data.message || "Could not resend the verification code.");
  }

  return true;
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

  let email;
  if (audience === "admin") {
    if (rawIdentifier.includes("@")) {
      email = normalizeEmail(rawIdentifier);
    } else {
      email = getModeratorEmailCandidate(rawIdentifier);
    }
  } else {
    email = normalizeEmail(rawIdentifier);
  }

  if (!validateEmail(email)) {
    throw createAuthError("EMAIL_INVALID", "Please enter a valid email address.");
  }

  if (audience === "admin") {
    const result = await requestAdminLogin(rawIdentifier, password);
    const sessionPayload = result.session || {};

    if (!sessionPayload.access_token || !sessionPayload.refresh_token) {
      throw createAuthError(
        "ADMIN_SESSION_INVALID",
        "Admin authentication did not return a usable session."
      );
    }

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: sessionPayload.access_token,
      refresh_token: sessionPayload.refresh_token,
    });

    if (setSessionError) {
      throw mapSupabaseError(setSessionError, "ADMIN_SESSION_INVALID");
    }

    const session = await loadConfirmedSession({
      expectedRole: "",
      audience: "admin",
      strict: true,
    });

    if (!session.authenticated) {
      throw createAuthError("ADMIN_SESSION_INVALID", "Login succeeded but the admin session could not be confirmed.");
    }

    return session.user;
  }

  // In Capacitor, sign in directly with Supabase (no backend roundtrip needed)
  const isNativeApp = window.location.origin === "capacitor://localhost" || (window.location.hostname === "localhost" && !window.location.port);

  if (isNativeApp) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw mapSupabaseError(signInError, "INVALID_CREDENTIALS");
    }

    if (!signInData?.session) {
      throw createAuthError("SESSION_INVALID", "Supabase did not return a usable authenticated session.");
    }
  } else {
    const result = await requestPublicLogin(email, password, requestedRole);

    if (!result?.session?.access_token || !result?.session?.refresh_token) {
      throw createAuthError("SESSION_INVALID", "Supabase did not return a usable authenticated session.");
    }

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });

    if (setSessionError) {
      throw mapSupabaseError(setSessionError, "SESSION_INVALID");
    }
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

export async function fetchAuthSession(options = {}) {
  try {
    const audience = options.audience || "any";
    return await loadConfirmedSession({ strict: false, audience, expectedRole: options.expectedRole || "" });
  } catch (error) {
    clearAuthSession();
    return { authenticated: false, user: null };
  }
}

export async function saveOwnAccountSettings(payload = {}) {
  const nextSettings = normalizeAccountSettingsPayload(payload);
  const data = await requestOwnAccountSettingsUpdate(nextSettings);

  if (nextSettings.password) {
    const currentSession = getAuthSession();
    const currentUser = currentSession?.user || {};
    const updatedUser = data?.user || {};
    const resolvedRole = updatedUser.role || currentUser.role || "";
    const profilePicture = normalizeProfilePictureSettings(
      {
        profilePictureType: updatedUser.profilePictureType || currentUser.profilePictureType,
        profilePictureId: updatedUser.profilePictureId || currentUser.profilePictureId,
        profilePicturePath: updatedUser.profilePicturePath || currentUser.profilePicturePath,
        profilePictureUrl: updatedUser.profilePictureUrl || currentUser.profilePictureUrl,
      },
      resolvedRole,
      updatedUser.profilePictureUrl || currentUser.profilePictureUrl || ""
    );

    const mergedSession = {
      authenticated: true,
      user: {
        ...currentUser,
        ...updatedUser,
        email: normalizeEmail(updatedUser.email || currentUser.email || ""),
        username: updatedUser.username ?? currentUser.username ?? null,
        role: resolvedRole,
        status: updatedUser.status || currentUser.status || "active",
        workDescription: updatedUser.workDescription ?? currentUser.workDescription ?? null,
        profilePictureSrc: profilePicture.profilePictureSrc,
        profilePictureId: profilePicture.profilePictureId,
        profilePicturePath: profilePicture.profilePicturePath,
        profilePictureUrl: profilePicture.profilePictureUrl,
        profilePictureType: profilePicture.profilePictureType,
      },
    };

    setAuthSession(mergedSession);

    return {
      ...mergedSession,
      passwordUpdated: true,
    };
  }

  const confirmedSession = await loadConfirmedSession({
    strict: true,
    audience: "any",
    expectedRole: "",
  });

  if (!confirmedSession.authenticated) {
    throw createAuthError("ACCOUNT_SETTINGS_UPDATE_FAILED", "The updated account session could not be confirmed.");
  }

  return confirmedSession;
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

export async function deleteAdminMarketplaceListing(listingId) {
  const data = await requestAdminJson("/api/marketplace/listings/delete", { listingId }, "POST");
  return data.deletedListingId || null;
}
