/**
 * pushNotifications.js
 * Capacitor Push Notifications integration for iOS.
 * Writes debug info to push_debug_log table for remote diagnostics.
 */

import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";

let _initialized = false;

function isNative() {
  return (
    window.location.origin === "capacitor://localhost" ||
    (window.location.hostname === "localhost" && !window.location.port)
  );
}

/** Write a debug log entry to Supabase so we can read it remotely */
async function debugLog(userId, step, detail) {
  try {
    console.log("[yapply-push]", step, detail || "");
    const supabase = await getSupabaseClient();
    await supabase.from("push_debug_log").insert({
      user_id: userId || "unknown",
      step,
      detail: String(detail || ""),
    });
  } catch (_) {
    console.warn("[yapply-push] debugLog write failed:", _?.message);
  }
}

function getPushPlugin() {
  try {
    if (window.Capacitor?.registerPlugin) {
      return window.Capacitor.registerPlugin("PushNotifications", {});
    }
  } catch (e) {
    return null;
  }
  try {
    if (window.Capacitor?.Plugins?.PushNotifications) {
      return window.Capacitor.Plugins.PushNotifications;
    }
  } catch (_) {}
  return null;
}

async function saveDeviceToken(userId, token) {
  if (!userId || !token) return;
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("device_tokens")
      .upsert(
        { user_id: userId, token, platform: "ios", updated_at: new Date().toISOString() },
        { onConflict: "user_id,platform" }
      );
    if (error) {
      await debugLog(userId, "token_save_error", error.message);
    } else {
      await debugLog(userId, "token_saved", token.substring(0, 20) + "...");
    }
  } catch (err) {
    await debugLog(userId, "token_save_exception", err?.message);
  }
}

export async function initPushNotifications(userId, onNotificationTap) {
  if (_initialized) return;
  if (!isNative()) {
    console.log("[yapply-push] Not native — skipping");
    return;
  }

  await debugLog(userId, "init_start", "isNative=true");

  // Log Capacitor state
  const capState = {
    exists: !!window.Capacitor,
    registerPlugin: typeof window.Capacitor?.registerPlugin,
    isPluginAvailable: "unknown",
    pluginsKeys: "none",
  };
  try {
    capState.isPluginAvailable = String(window.Capacitor?.isPluginAvailable?.("PushNotifications"));
  } catch (_) {}
  try {
    capState.pluginsKeys = Object.keys(window.Capacitor?.Plugins || {}).join(",") || "empty";
  } catch (_) {}
  await debugLog(userId, "capacitor_state", JSON.stringify(capState));

  const Push = getPushPlugin();
  if (!Push) {
    await debugLog(userId, "plugin_not_found", "getPushPlugin returned null");
    return;
  }
  await debugLog(userId, "plugin_found", "OK");

  _initialized = true;

  // Check permissions
  try {
    let perm = await Push.checkPermissions();
    await debugLog(userId, "permission_check", JSON.stringify(perm));

    if (perm.receive !== "granted") {
      perm = await Push.requestPermissions();
      await debugLog(userId, "permission_request", JSON.stringify(perm));
    }

    if (perm.receive !== "granted") {
      await debugLog(userId, "permission_denied", perm.receive);
      return;
    }
  } catch (err) {
    await debugLog(userId, "permission_error", err?.message || String(err));
    return;
  }

  // Register with APNs
  try {
    await Push.register();
    await debugLog(userId, "apns_register_called", "OK");
  } catch (err) {
    await debugLog(userId, "apns_register_error", err?.message || String(err));
    return;
  }

  // Token listener
  Push.addListener("registration", (tokenData) => {
    const token = tokenData?.value || "";
    debugLog(userId, "token_received", token.substring(0, 30) + "...");
    try { localStorage.setItem("yapply-push-token", token); } catch (_) {}
    saveDeviceToken(userId, token);
  });

  // Error listener
  Push.addListener("registrationError", (err) => {
    debugLog(userId, "registration_error", JSON.stringify(err));
  });

  // Foreground
  Push.addListener("pushNotificationReceived", (notification) => {
    debugLog(userId, "foreground_notification", notification?.title);
    try {
      import("../components/notificationBell.js").then(async ({ updateBadge }) => {
        const { getUnreadCount } = await import("./notifications.js");
        updateBadge(await getUnreadCount(userId));
      });
    } catch (_) {}
  });

  // Tap
  Push.addListener("pushNotificationActionPerformed", (action) => {
    const data = action?.notification?.data || {};
    if (typeof onNotificationTap === "function") onNotificationTap(data);
  });

  await debugLog(userId, "listeners_registered", "waiting for token...");
}

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
