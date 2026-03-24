/**
 * pushNotifications.js
 * Capacitor Push Notifications integration for iOS.
 * Uses native AppDelegate token injection (bypasses broken Capacitor plugin listeners).
 */

import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";

let _initialized = false;

function isNative() {
  return (
    window.location.origin === "capacitor://localhost" ||
    (window.location.hostname === "localhost" && !window.location.port)
  );
}

async function debugLog(userId, step, detail) {
  try {
    console.log("[yapply-push]", step, detail || "");
    const supabase = await getSupabaseClient();
    await supabase.from("push_debug_log").insert({
      user_id: userId || "unknown",
      step,
      detail: String(detail || "").substring(0, 500),
    });
  } catch (_) {}
}

async function saveDeviceToken(userId, token) {
  if (!userId || !token) return;
  try {
    const supabase = await getSupabaseClient();

    // Try upsert first
    const { error } = await supabase
      .from("device_tokens")
      .upsert(
        { user_id: userId, token, platform: "ios", updated_at: new Date().toISOString() },
        { onConflict: "user_id,platform" }
      );

    if (error) {
      // Fallback: delete existing + fresh insert
      await debugLog(userId, "upsert_failed_trying_delete_insert", error.message);
      await supabase.from("device_tokens").delete().eq("user_id", userId).eq("platform", "ios");
      const { error: insertErr } = await supabase.from("device_tokens").insert({
        user_id: userId, token, platform: "ios", updated_at: new Date().toISOString(),
      });
      if (insertErr) {
        await debugLog(userId, "insert_also_failed", insertErr.message);
      } else {
        await debugLog(userId, "token_saved_via_delete_insert", token.substring(0, 20) + "...");
      }
    } else {
      await debugLog(userId, "token_saved", token.substring(0, 20) + "...");
    }
  } catch (err) {
    await debugLog(userId, "token_save_exception", err?.message);
  }
}

export async function initPushNotifications(userId, onNotificationTap) {
  if (_initialized || !isNative()) return;
  _initialized = true;

  await debugLog(userId, "init_v2_start", "native token injection approach");

  // Step 1: Request push permission via Capacitor plugin
  try {
    const Push = window.Capacitor?.Plugins?.PushNotifications;
    if (!Push) {
      await debugLog(userId, "no_plugin", "Capacitor.Plugins.PushNotifications missing");
      return;
    }

    let perm = await Push.checkPermissions();
    await debugLog(userId, "perm_check", JSON.stringify(perm));

    if (perm.receive !== "granted") {
      perm = await Push.requestPermissions();
      await debugLog(userId, "perm_request", JSON.stringify(perm));
    }
    if (perm.receive !== "granted") {
      await debugLog(userId, "perm_denied", perm.receive);
      return;
    }

    // Step 2: Call register() — this triggers APNs registration
    await Push.register();
    await debugLog(userId, "register_called", "OK");

  } catch (err) {
    await debugLog(userId, "plugin_error", err?.message || String(err));
    return;
  }

  // Step 3: Listen for token injected by AppDelegate.swift (bypasses broken plugin listeners)
  // The native AppDelegate dispatches a 'yapply-apns-token' CustomEvent on window
  window.addEventListener("yapply-apns-token", (event) => {
    const token = event?.detail?.token || "";
    debugLog(userId, "native_token_received", token.substring(0, 30) + "...");
    try { localStorage.setItem("yapply-push-token", token); } catch (_) {}
    saveDeviceToken(userId, token);
  });

  // Also listen for errors from native
  window.addEventListener("yapply-apns-error", (event) => {
    debugLog(userId, "native_apns_error", event?.detail?.error || "unknown");
  });

  // Step 4: Check if token was already injected (native may fire before JS listener is ready)
  if (window.__yapplyAPNsToken) {
    const token = window.__yapplyAPNsToken;
    await debugLog(userId, "token_already_present", token.substring(0, 30) + "...");
    try { localStorage.setItem("yapply-push-token", token); } catch (_) {}
    await saveDeviceToken(userId, token);
  }

  if (window.__yapplyAPNsError) {
    await debugLog(userId, "error_already_present", window.__yapplyAPNsError);
  }

  // Step 5: Also try polling for the global token (belt and suspenders)
  let pollCount = 0;
  const pollInterval = setInterval(() => {
    pollCount++;
    if (window.__yapplyAPNsToken && !localStorage.getItem("yapply-push-token-saved")) {
      const token = window.__yapplyAPNsToken;
      debugLog(userId, "token_found_by_poll", token.substring(0, 30) + "...");
      localStorage.setItem("yapply-push-token", token);
      localStorage.setItem("yapply-push-token-saved", "1");
      saveDeviceToken(userId, token);
      clearInterval(pollInterval);
    }
    if (pollCount >= 20) clearInterval(pollInterval); // stop after 10 seconds
  }, 500);

  await debugLog(userId, "listeners_v2_ready", "waiting for native token injection...");
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
    localStorage.removeItem("yapply-push-token-saved");
  } catch (_) {}
  _initialized = false;
}
