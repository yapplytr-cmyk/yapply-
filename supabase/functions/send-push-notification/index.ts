/**
 * send-push-notification
 * Supabase Edge Function that sends iOS push notifications via APNs.
 *
 * Called via database webhook when a new row is inserted into `notifications`.
 * Also callable directly via POST with a JSON body:
 *   { user_id, title, message, type, href, listing_id, bid_id }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

/* ── APNs configuration ── */
const APNS_KEY_ID = "V6DDS77P93";
const TEAM_ID = "WW25QHRUUL";
const BUNDLE_ID = "com.yapply.app";

// Use sandbox for development, production for App Store
// We'll check an env var, default to sandbox
const USE_PRODUCTION = Deno.env.get("APNS_PRODUCTION") === "true";
const APNS_HOST = USE_PRODUCTION
  ? "https://api.push.apple.com"
  : "https://api.sandbox.push.apple.com";

/* ── Supabase config ── */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://sgoicvqgfydwfpttzgqu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/* ── APNs private key (embedded — loaded from env or hardcoded for now) ── */
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY") || `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgmVCTIzF8HT7SWyO4
Nb8RJLylMndv/0psxN5SR20bXyigCgYIKoZIzj0DAQehRANCAAS2BGwV4YJDWIzH
kkR91pnKm1CGAiRfYuZSwgB1kAIn9mGIWeLWCdIuNVrxtMjx3dDmJq9B1uB3tRns
ww75DW48
-----END PRIVATE KEY-----`;

/* ── JWT token cache ── */
let _cachedJWT: string | null = null;
let _cachedJWTExpiry = 0;

/**
 * Generate a signed JWT for APNs authentication.
 * Tokens are valid for up to 60 minutes; we cache for 50 min.
 */
async function getAPNsJWT(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (50 min buffer)
  if (_cachedJWT && _cachedJWTExpiry > now) {
    return _cachedJWT;
  }

  const privateKey = await importPKCS8(APNS_PRIVATE_KEY, "ES256");

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: APNS_KEY_ID })
    .setIssuer(TEAM_ID)
    .setIssuedAt(now)
    .sign(privateKey);

  _cachedJWT = jwt;
  _cachedJWTExpiry = now + 50 * 60; // Cache for 50 minutes

  return jwt;
}

/**
 * Send a push notification to a single device via APNs.
 */
async function sendPushToDevice(
  deviceToken: string,
  payload: {
    title: string;
    body: string;
    type?: string;
    href?: string;
    listingId?: string;
    bidId?: string;
  }
): Promise<{ success: boolean; status?: number; reason?: string }> {
  try {
    const jwt = await getAPNsJWT();

    const apnsPayload = {
      aps: {
        alert: {
          title: payload.title || "Yapply",
          body: payload.body || "",
        },
        sound: "default",
        badge: 1,
        "interruption-level": payload.type === "bid-accepted" ? "time-sensitive" : "active",
        "thread-id": payload.type || "general",
      },
      // Custom data for deep linking
      type: payload.type || "general",
      href: payload.href || "",
      listingId: payload.listingId || "",
      bidId: payload.bidId || "",
    };

    const response = await fetch(
      `${APNS_HOST}/3/device/${deviceToken}`,
      {
        method: "POST",
        headers: {
          Authorization: `bearer ${jwt}`,
          "apns-topic": BUNDLE_ID,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "apns-expiration": "0",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apnsPayload),
      }
    );

    if (response.ok) {
      return { success: true, status: response.status };
    }

    // Parse error
    let reason = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      reason = errBody.reason || reason;
    } catch (_) {}

    console.error(`[apns] Push failed for token ${deviceToken.substring(0, 8)}...: ${reason}`);
    return { success: false, status: response.status, reason };
  } catch (err) {
    console.error(`[apns] Push error:`, err?.message || err);
    return { success: false, reason: err?.message || "Unknown error" };
  }
}

/**
 * Main handler for the Edge Function.
 */
serve(async (req: Request) => {
  // CORS headers for browser calls
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json();

    // Database webhook sends { type: "INSERT", table: "notifications", record: {...} }
    const record = body.record || body;
    const userId = record.user_id;
    const title = record.title || "Yapply";
    const message = record.message || "";
    const type = record.type || "general";
    const href = record.href || "";
    const listingId = record.listing_id || "";
    const bidId = record.bid_id || "";

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user's device tokens from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: tokens, error: tokensError } = await supabase
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", userId);

    if (tokensError) {
      console.error("[push] Error fetching device tokens:", tokensError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch device tokens" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log(`[push] No device tokens for user ${userId} — skipping push`);
      return new Response(
        JSON.stringify({ sent: 0, message: "No device tokens found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send push to all user's devices
    const results = await Promise.all(
      tokens
        .filter((t: { platform: string }) => t.platform === "ios")
        .map((t: { token: string }) =>
          sendPushToDevice(t.token, { title, body: message, type, href, listingId, bidId })
        )
    );

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    // Clean up invalid tokens (410 Gone = token no longer valid)
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 410 || results[i].reason === "BadDeviceToken") {
        const badToken = tokens[i].token;
        console.log(`[push] Removing invalid token: ${badToken.substring(0, 8)}...`);
        await supabase
          .from("device_tokens")
          .delete()
          .eq("user_id", userId)
          .eq("token", badToken);
      }
    }

    console.log(`[push] Sent ${sent}/${tokens.length} pushes to user ${userId}`);

    return new Response(
      JSON.stringify({ sent, total: tokens.length, failed: failed.length }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("[push] Handler error:", err?.message || err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
