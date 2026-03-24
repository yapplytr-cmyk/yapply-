let configPromise = null;
let modulePromise = null;
let clientPromise = null;
const NATIVE_SUPABASE_URL = "https://sgoicvqgfydwfpttzgqu.supabase.co";
const NATIVE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2ljdnFnZnlkd2ZwdHR6Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTY0MDgsImV4cCI6MjA4ODg5MjQwOH0.UOsoPsANDynWmiZ4eWM_dLYU8dBsZvALraKKLqHC6Wg";
function _isNativeApp() {
const { origin, hostname, port } = window.location;
return origin === "capacitor://localhost" || (hostname === "localhost" && !port);
}
const MAX_AUTH_STORAGE_CHARS = 180_000;
const STRIP_ALWAYS_KEYS = new Set([
"profile_picture_src",
"profilePictureSrc",
"profile_picture_upload_data_url",
"profilePictureUploadDataUrl",
]);
const STRIP_AGGRESSIVE_KEYS = new Set([
"profile_picture_url",
"profilePictureUrl",
"profile_picture_path",
"profilePicturePath",
]);
function getBackendOrigin() {
const { hostname, port, origin, protocol } = window.location;
const isLocalFrontend = (hostname === "127.0.0.1" || hostname === "localhost") && port === "4173";
const isCapacitor = origin === "capacitor://localhost" || hostname === "localhost" && !port;
if (isCapacitor) return "https://yapplytr.com";
return isLocalFrontend ? `${protocol}
}
function getBrowserStorage() {
try {
return window.localStorage;
} catch (error) {
return null;
}
}
function sanitizeStoredAuthValue(value, aggressive = false) {
if (typeof value !== "string" || !value) {
return value;
}
if (!value.includes("data:image") && value.length < MAX_AUTH_STORAGE_CHARS && !aggressive) {
return value;
}
try {
const parsed = JSON.parse(value);
const cleaned = sanitizeStoredAuthNode(parsed, aggressive);
return JSON.stringify(cleaned);
} catch (error) {
return "";
}
}
function sanitizeStoredAuthNode(value, aggressive = false) {
if (Array.isArray(value)) {
return value.map((entry) => sanitizeStoredAuthNode(entry, aggressive));
}
if (!value || typeof value !== "object") {
if (typeof value === "string" && value.startsWith("data:image/")) {
return "";
}
return value;
}
return Object.entries(value).reduce((next, [key, entry]) => {
if (STRIP_ALWAYS_KEYS.has(key) || (aggressive && STRIP_AGGRESSIVE_KEYS.has(key))) {
return next;
}
const cleaned = sanitizeStoredAuthNode(entry, aggressive);
if (cleaned === "" && typeof entry === "string" && entry.startsWith("data:image/")) {
return next;
}
next[key] = cleaned;
return next;
}, {});
}
function isQuotaExceededError(error) {
return Boolean(
error &&
(error.name === "QuotaExceededError" ||
error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
String(error.message || "").toLowerCase().includes("quota"))
);
}
function createSupabaseAuthStorage() {
return {
getItem(key) {
const storage = getBrowserStorage();
if (!storage) {
return null;
}
const raw = storage.getItem(key);
const sanitized = sanitizeStoredAuthValue(raw);
if (sanitized !== raw) {
try {
if (sanitized) {
storage.setItem(key, sanitized);
} else {
storage.removeItem(key);
}
} catch (error) {
try {
storage.removeItem(key);
} catch (_ignored) {}
}
}
return sanitized;
},
setItem(key, value) {
const storage = getBrowserStorage();
if (!storage) {
return;
}
const sanitized = sanitizeStoredAuthValue(value);
try {
if (sanitized) {
storage.setItem(key, sanitized);
} else {
storage.removeItem(key);
}
} catch (error) {
if (!isQuotaExceededError(error)) {
throw error;
}
const aggressiveSanitized = sanitizeStoredAuthValue(value, true);
try {
if (aggressiveSanitized) {
storage.setItem(key, aggressiveSanitized);
} else {
storage.removeItem(key);
}
} catch (_ignored) {
try {
storage.removeItem(key);
} catch (__ignored) {}
}
}
},
removeItem(key) {
const storage = getBrowserStorage();
storage?.removeItem(key);
},
};
}
async function readJson(response, fallbackMessage) {
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
export function getRuntimeApiOrigin() {
return getBackendOrigin();
}
export async function getSupabaseRuntimeConfig() {
if (!configPromise) {
if (_isNativeApp()) {
configPromise = Promise.resolve({
supabaseUrl: NATIVE_SUPABASE_URL,
supabaseAnonKey: NATIVE_SUPABASE_ANON_KEY,
});
} else {
configPromise = (async () => {
const response = await fetch(new URL("/api/auth/config", `${getBackendOrigin()}/`).toString(), {
method: "GET",
headers: {
Accept: "application/json",
},
cache: "no-store",
});
const data = await readJson(response, "Supabase configuration could not be loaded.");
if (!response.ok) {
const error = new Error(data.message || "Supabase configuration could not be loaded.");
error.code = data.code || "SUPABASE_NOT_CONFIGURED";
error.debug = data.debug || null;
error.reason = data.reason || null;
throw error;
}
return data;
})();
}
}
return configPromise;
}
async function loadSupabaseModule() {
if (!modulePromise) {
modulePromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
if (!document.querySelector('link[rel="preconnect"][href*="jsdelivr"]')) {
const link = document.createElement("link");
link.rel = "preconnect";
link.href = "https://cdn.jsdelivr.net";
link.crossOrigin = "anonymous";
document.head.appendChild(link);
}
}
return modulePromise;
}
export async function getSupabaseClient() {
if (!clientPromise) {
clientPromise = Promise.all([getSupabaseRuntimeConfig(), loadSupabaseModule()]).then(([config, module]) =>
module.createClient(config.supabaseUrl, config.supabaseAnonKey, {
auth: {
persistSession: true,
autoRefreshToken: true,
detectSessionInUrl: true,
storage: createSupabaseAuthStorage(),
},
})
);
}
return clientPromise;
}
export function preWarmSupabaseClient() {
const origins = [
"https://cdn.jsdelivr.net",
NATIVE_SUPABASE_URL,
"https://yapplytr.com",
];
origins.forEach((href) => {
if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
const link = document.createElement("link");
link.rel = "preconnect";
link.href = href;
link.crossOrigin = "anonymous";
document.head.appendChild(link);
}
});
getSupabaseClient().catch(() => {});
}