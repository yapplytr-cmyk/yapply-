/**
 * Supabase Edge Function: send-push
 *
 * Sends APNs push notifications to iOS devices.
 * Called from the /api/notify Vercel endpoint when a bid is accepted.
 *
 * Environment variables required:
 *   APNS_KEY_ID      — Apple APNs Key ID
 *   APNS_TEAM_ID     — Apple Team ID
 *   APNS_PRIVATE_KEY — APNs Auth Key (.p8) contents (base64 encoded)
 *   APNS_BUNDLE_ID   — Your app's bundle identifier (e.g., com.yapply.app)
 *   APNS_ENVIRONMENT  — "production" or "development" (default: "production")
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") || "";
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") || "";
const APNS_PRIVATE_KEY_B64 = Deno.env.get("APNS_PRIVATE_KEY") || "";
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") || "com.yapply.app";
const APNS_ENV = Deno.env.get("APNS_ENVIRONMENT") || "production";

const APNS_HOST =
  APNS_ENV === "production"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";

// Cache the JWT for 50 minutes (APNs tokens are valid for 60 min)
let _cachedJwt = "";
let _jwtExpiry = 0;

/**
 * Create a JWT for APNs authentication using ES256.
 */
async function createApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (_cachedJwt && now < _jwtExpiry) {
    return _cachedJwt;
  }

  // Decode the private key from base64
  const privateKeyPem = atob(APNS_PRIVATE_KEY_B64);

  // Import the ECDSA P-256 key
  const pemContents = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Build JWT header and payload
  const header = { alg: "ES256", kid: APNS_KEY_ID };
  const payload = { iss: APNS_TEAM_ID, iat: now };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const signingInput = encoder.encode(`${headerB64}.${payloadB64}`);

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    signingInput
  );

  // Convert DER signature to raw r||s format for JWT
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  _cachedJwt = `${headerB64}.${payloadB64}.${sigB64}`;
  _jwtExpiry = now + 3000; // 50 minutes

  return _cachedJwt;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { token, title, body: notifBody, data } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Device token is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_PRIVATE_KEY_B64) {
      return new Response(
        JSON.stringify({
          error: "APNs not configured",
          hint: "Set APNS_KEY_ID, APNS_TEAM_ID, and APNS_PRIVATE_KEY env vars",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const jwt = await createApnsJwt();

    // Build APNs payload
    const apnsPayload = {
      aps: {
        alert: {
          title: title || "Yapply",
          body: notifBody || "",
        },
        sound: "default",
        badge: 1,
        "mutable-content": 1,
      },
      ...(data || {}),
    };

    const apnsUrl = `${APNS_HOST}/3/device/${token}`;

    const apnsResp = await fetch(apnsUrl, {
      method: "POST",
      headers: {
        Authorization: `bearer ${jwt}`,
        "apns-topic": APNS_BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apnsPayload),
    });

    if (apnsResp.ok) {
      return new Response(
        JSON.stringify({ ok: true, apnsId: apnsResp.headers.get("apns-id") }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const errBody = await apnsResp.text();
    console.error("APNs error:", apnsResp.status, errBody);

    return new Response(
      JSON.stringify({
        ok: false,
        apnsStatus: apnsResp.status,
        apnsError: errBody,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Push function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
