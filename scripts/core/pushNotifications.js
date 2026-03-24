/**
 * pushNotifications.js
 * Capacitor Push Notifications integration for iOS.
 * Simplified approach — uses Capacitor bridge directly.
 */

import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";

let _initialized = false;

/**
 * Check if we're running in a native Capacitor environment.
 */
function isNative() {
  return (
    window.location.origin === "capacitor://localhost" ||
    (window.location.hostname === "localhost" && !window.location.port)
  );
}

/**
 * Get the PushNotifications plugin via any available method.
 */
function getPushPlugin() {
  // Try registerPlugin first (Capacitor 5+/8 standard)
  try {
    if (window.Capacitor?.registerPlugin) {
      return window.Capacitor.registerPlugin("PushNotifications", {});
    }
  } catch (e) {
    console.warn("[yapply-push] registerPlugin error:", e?.message);
  }

  // Fallback: direct Plugins access
  try {
    if (window.Capacitor?.Plugins?.PushNotifications) {
      return window.Capacitor.Plugins.PushNotifications;
    }
  } catch (_) {}

  return null;
}

/**
 * Register device token in Supabase `device_tokens` table.
 */
async function saveDeviceToken(userId, token) {
  if (!userId || !token) return;

  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("device_tokens")
      .upsert(
        {
          user_id: userId,
          token: token,
          platform: "ios",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform" }
      );

    if (error) {
      console.error("[yapply-push] Token save FAILED:", error.message, error.code);
    } else {
      console.log("[yapply-push] Token saved OK for user:", userId);
    }
  } catch (err) {
    console.error("[yapply-push] Token save exception:", err?.message);
  }
}

/**
 * Initialize push notifications. Call once after user login.
 */
export async function initPushNotifications(userId, onNotificationTap) {
  if (_initialized || !isNative()) {
    if (!isNative()) console.log("[yapply-push] Not native — skipping");
    return;
  }

  console.log("[yapply-push] Starting push init for user:", userId);
  console.log("[yapply-push] Capacitor available:", !!window.Capacitor);
  console.log("[yapply-push] Capacitor.registerPlugin:", typeof window.Capacitor?.registerPlugin);
  console.log("[yapply-push] isPluginAvailable:", window.Capacitor?.isPluginAvailable?.("PushNotifications"));

  const Push = getPushPlugin();
  if (!Push) {
    console.error("[yapply-push] FAILED: No push plugin found");
    return;
  }

  _initialized = true;
  console.log("[yapply-push] Plugin obtained, checking permissions...");

  // Check / request permission
  try {
    let perm = await Push.checkPermissions();
    console.log("[yapply-push] Permission status:", perm?.receive);

    if (perm.receive !== "granted") {
      perm = await Push.requestPermissions();
      console.log("[yapply-push] Permission after request:", perm?.receive);
    }

    if (perm.receive !== "granted") {
      console.warn("[yapply-push] Permission denied by user");
      return;
    }
  } catch (err) {
    console.error("[yapply-push] Permission error:", err?.message || err);
    return;
  }

  // Register with APNs
  try {
    await Push.register();
    console.log("[yapply-push] APNs register() called");
  } catch (err) {
    console.error("[yapply-push] APNs register error:", err?.message || err);
    return;
  }

  // Listen for token
  Push.addListener("registration", (tokenData) => {
    const token = tokenData?.value || "";
    console.log("[yapply-push] GOT TOKEN:", token.substring(0, 20) + "...");

    try { localStorage.setItem("yapply-push-token", token); } catch (_) {}
    saveDeviceToken(userId, token);
  });

  // Listen for registration errors
  Push.addListener("registrationError", (err) => {
    console.error("[yapply-push] APNs registration FAILED:", JSON.stringify(err));
  });

  // Foreground notification
  Push.addListener("pushNotificationReceived", (notification) => {
    console.log("[yapply-push] Foreground notification:", notification?.title);
    try {
      import("../components/notificationBell.js").then(async ({ updateBadge }) => {
        const { getUnreadCount } = await import("./notifications.js");
        const count = await getUnreadCount(userId);
        updateBadge(count);
      });
    } catch (_) {}
  });

  // Notification tap
  Push.addListener("pushNotificationActionPerformed", (action) => {
    console.log("[yapply-push] Notification tapped:", action?.notification?.data);
    const data = action?.notification?.data || {};
    if (typeof onNotificationTap === "function") {
      onNotificationTap(data);
    }
  });

  console.log("[yapply-push] All listeners registered — waiting for token...");
}

/**
 * Clean up push token on logout.
 */
export async function cleanupPushNotifications(userId) {
  if (!isNative()) return;
  try {
    const token = localStorage.getItem("yapply-push-token");
    if (token && userId) {
      const supabase = await getSupabaseClient();
      await supabase.from("device_tokens").delete().eq("user_id", userId).eq("token", token);
    }
    localStorage.removeItem("yapply-push-token");
  } catch (_) {}
  _initialized = false;
}
