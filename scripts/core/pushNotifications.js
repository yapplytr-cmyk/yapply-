import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";
let _initialized = false;
let _PushNotifications = null;
function isNative() {
return (
window.location.origin === "capacitor://localhost" ||
(window.location.hostname === "localhost" && !window.location.port)
);
}
async function getPushPlugin() {
if (_PushNotifications) return _PushNotifications;
try {
const mod = await import("@capacitor/push-notifications");
_PushNotifications = mod.PushNotifications;
return _PushNotifications;
} catch (_) {}
try {
if (window.Capacitor?.Plugins?.PushNotifications) {
_PushNotifications = window.Capacitor.Plugins.PushNotifications;
return _PushNotifications;
}
} catch (_) {}
return null;
}
async function saveDeviceToken(userId, token, platform = "ios") {
if (!userId || !token) return;
try {
const supabase = await getSupabaseClient();
const { error } = await supabase
.from("device_tokens")
.upsert(
{
user_id: userId,
token: token,
platform: platform,
updated_at: new Date().toISOString(),
},
{ onConflict: "user_id,token" }
);
if (error) {
console.warn("[yapply-push] Failed to save device token:", error.message);
} else {
console.log("[yapply-push] Device token saved for user:", userId);
}
} catch (err) {
console.warn("[yapply-push] Token save error:", err?.message);
}
}
async function removeDeviceToken(userId, token) {
if (!userId || !token) return;
try {
const supabase = await getSupabaseClient();
await supabase
.from("device_tokens")
.delete()
.eq("user_id", userId)
.eq("token", token);
console.log("[yapply-push] Device token removed for user:", userId);
} catch (err) {
console.warn("[yapply-push] Token removal error:", err?.message);
}
}
export async function initPushNotifications(userId, onNotificationTap) {
if (_initialized || !isNative()) {
if (!isNative()) console.log("[yapply-push] Skipping push init (not native)");
return;
}
const PushNotifications = await getPushPlugin();
if (!PushNotifications) {
console.log("[yapply-push] Push plugin not available");
return;
}
_initialized = true;
console.log("[yapply-push] Initializing push notifications...");
let permResult;
try {
permResult = await PushNotifications.checkPermissions();
if (permResult.receive !== "granted") {
permResult = await PushNotifications.requestPermissions();
}
} catch (err) {
console.warn("[yapply-push] Permission check error:", err?.message);
return;
}
if (permResult.receive !== "granted") {
console.log("[yapply-push] Push permission denied");
return;
}
try {
await PushNotifications.register();
} catch (err) {
console.warn("[yapply-push] Registration error:", err?.message);
return;
}
PushNotifications.addListener("registration", (tokenData) => {
const token = tokenData?.value || "";
console.log("[yapply-push] Registered with token:", token.substring(0, 12) + "...");
try {
localStorage.setItem("yapply-push-token", token);
} catch (_) {}
saveDeviceToken(userId, token, "ios");
});
PushNotifications.addListener("registrationError", (err) => {
console.error("[yapply-push] Registration failed:", err?.error || err);
});
PushNotifications.addListener("pushNotificationReceived", (notification) => {
console.log("[yapply-push] Notification received in foreground:", notification?.title);
try {
import("./notifications.js").then(({ addNotification }) => {
addNotification(userId, {
type: notification?.data?.type || "push",
message: notification?.body || notification?.title || "",
href: notification?.data?.href || "",
listingId: notification?.data?.listingId || "",
});
});
} catch (_) {}
});
PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
console.log("[yapply-push] Notification tapped:", action?.notification?.data);
const data = action?.notification?.data || {};
if (typeof onNotificationTap === "function") {
onNotificationTap(data);
return;
}
if (data.type === "bid_accepted" && data.listingId) {
if (window.__yapplyNavigateTo) {
window.__yapplyNavigateTo("developer-dashboard");
}
}
});
console.log("[yapply-push] Push notification listeners registered");
}
export async function cleanupPushNotifications(userId) {
if (!isNative()) return;
try {
const token = localStorage.getItem("yapply-push-token");
if (token && userId) {
await removeDeviceToken(userId, token);
}
localStorage.removeItem("yapply-push-token");
} catch (_) {}
_initialized = false;
}