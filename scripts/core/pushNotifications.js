/**
 * pushNotifications.js
 * Capacitor Push Notifications integration for iOS.
 *
 * Handles:
 * - Requesting push notification permission
 * - Registering the device token with Supabase
 * - Handling incoming push notifications in foreground
 * - Deep-linking from notification taps
 */

import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";

let _initialized = false;
let _PushNotifications = null;

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
 * Dynamically import the Capacitor Push Notifications plugin.
 * Returns null if not available (web environment).
 */
async function getPushPlugin() {
  if (_PushNotifications) return _PushNotifications;

  try {
    // Capacitor 5+ uses @capacitor/push-notifications
    const mod = await import("@capacitor/push-notifications");
    _PushNotifications = mod.PushNotifications;
    return _PushNotifications;
  } catch (_) {}

  // Try Capacitor global (older setups)
  try {
    if (window.Capacitor?.Plugins?.PushNotifications) {
      _PushNotifications = window.Capacitor.Plugins.PushNotifications;
      return _PushNotifications;
    }
  } catch (_) {}

  return null;
}

/**
 * Register device token in Supabase `device_tokens` table.
 */
async function saveDeviceToken(userId, token, platform = "ios") {
  if (!userId || !token) return;

  try {
    const supabase = await getSupabaseClient();

    // Upsert: if this user+token combo exists, just update timestamp
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

/**
 * Remove a device token (e.g. on logout).
 */
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

/**
 * Initialize push notifications. Call this once after the user has logged in.
 * @param {string} userId - The authenticated user's ID
 * @param {function} onNotificationTap - Callback when user taps a notification
 */
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

  // Check / request permission
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

  // Register with APNs
  try {
    await PushNotifications.register();
  } catch (err) {
    console.warn("[yapply-push] Registration error:", err?.message);
    return;
  }

  // Listen for successful registration → save token
  PushNotifications.addListener("registration", (tokenData) => {
    const token = tokenData?.value || "";
    console.log("[yapply-push] Registered with token:", token.substring(0, 12) + "...");

    // Store token locally so we can remove it on logout
    try {
      localStorage.setItem("yapply-push-token", token);
    } catch (_) {}

    // Save to Supabase
    saveDeviceToken(userId, token, "ios");
  });

  // Listen for registration errors
  PushNotifications.addListener("registrationError", (err) => {
    console.error("[yapply-push] Registration failed:", err?.error || err);
  });

  // Listen for incoming notifications while app is in foreground
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("[yapply-push] Notification received in foreground:", notification?.title);

    // Add to in-app notification system
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

  // Listen for notification taps (app was in background or closed)
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("[yapply-push] Notification tapped:", action?.notification?.data);

    const data = action?.notification?.data || {};

    if (typeof onNotificationTap === "function") {
      onNotificationTap(data);
      return;
    }

    // Default deep-link handling
    if (data.type === "bid_accepted" && data.listingId) {
      // Navigate to developer dashboard bids section
      if (window.__yapplyNavigateTo) {
        window.__yapplyNavigateTo("developer-dashboard");
      }
    }
  });

  console.log("[yapply-push] Push notification listeners registered");
}

/**
 * Clean up push token on logout.
 * @param {string} userId - The user who is logging out
 */
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
