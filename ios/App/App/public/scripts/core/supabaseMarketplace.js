/**
 * supabaseMarketplace.js
 * Direct Supabase PostgreSQL queries for marketplace data.
 * Replaces all Vercel API roundtrips — app talks to Supabase directly.
 *
 * IMPORTANT: On Capacitor iOS, CapacitorHttp intercepts ALL fetch() and XHR.
 * This can corrupt Supabase JS client internals. To work around this:
 *   1. We read the JWT access token directly from localStorage (no HTTP involved)
 *   2. We always send the JWT in raw REST calls
 *   3. Supabase JS client is tried first but we don't rely on it
 */

import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";

// ─── Constants ────────────────────────────────────────────────
const SUPABASE_URL = "https://sgoicvqgfydwfpttzgqu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2ljdnFnZnlkd2ZwdHR6Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTY0MDgsImV4cCI6MjA4ODg5MjQwOH0.UOsoPsANDynWmiZ4eWM_dLYU8dBsZvALraKKLqHC6Wg";
const AUTH_STORAGE_KEY = "sb-sgoicvqgfydwfpttzgqu-auth-token";

/**
 * Read the Supabase JWT access token directly from localStorage.
 * This BYPASSES CapacitorHttp entirely — localStorage is a sync browser API.
 * The Supabase JS client stores the session here automatically.
 */
function getStoredAccessToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Supabase stores: { access_token, refresh_token, expires_at, ... }
    if (parsed?.access_token) {
      // Check if token is expired (with 60s buffer)
      if (parsed.expires_at && Date.now() / 1000 > parsed.expires_at - 60) {
        console.warn("[yapply] Stored JWT expired, will try refresh");
        return null;
      }
      return parsed.access_token;
    }
  } catch (_) {}
  return null;
}

/**
 * Get the best available JWT access token, trying multiple sources:
 * 1. Direct localStorage read (most reliable on Capacitor)
 * 2. Supabase JS client getSession()
 * 3. Supabase JS client refreshSession()
 */
async function getBestAccessToken(supabase) {
  // Source 1: localStorage direct read (bypasses CapacitorHttp)
  let token = getStoredAccessToken();
  if (token) {
    console.log("[yapply] JWT from localStorage: OK");
    return token;
  }

  // Source 2: Supabase JS client getSession
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || null;
    if (token) {
      console.log("[yapply] JWT from getSession: OK");
      return token;
    }
  } catch (e) {
    console.warn("[yapply] getSession failed:", e?.message);
  }

  // Source 3: Supabase JS client refreshSession
  try {
    const { data } = await supabase.auth.refreshSession();
    token = data?.session?.access_token || null;
    if (token) {
      console.log("[yapply] JWT from refreshSession: OK");
      return token;
    }
  } catch (e) {
    console.warn("[yapply] refreshSession failed:", e?.message);
  }

  console.warn("[yapply] No JWT available from any source");
  return null;
}

// ─── Listings ────────────────────────────────────────────────

/**
 * Fetch all open marketplace listings (for Kesfet page).
 */
export async function fetchListings({ type = "client", status = "open-for-bids", category = "", limit = 24 } = {}) {
  const supabase = await getSupabaseClient();

  // ── Attempt 1: Supabase JS client ──
  try {
    let query = supabase
      .from("marketplace_listings")
      .select(`
        id,listing_type,status,title,description,location,budget,timeframe,project_type,category,owner_user_id,owner_email,owner_role,created_at,updated_at,accepted_bid_id,payload,
        listing_bids (id, bidder_user_id, status, company_name, bid_amount, estimated_timeframe, proposal_message, payload, created_at)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (type) query = query.eq("listing_type", type);
    if (status && status !== "all") query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (!error && data) return (data || []).map(normalizeListing);
    if (error) console.warn("[yapply] fetchListings JS error:", error.message);
  } catch (e) {
    console.warn("[yapply] fetchListings JS threw:", e?.message);
  }

  // ── Attempt 2: Raw REST API ──
  const params = new URLSearchParams({
    select: "id,listing_type,status,title,description,location,budget,timeframe,project_type,category,owner_user_id,owner_email,owner_role,created_at,updated_at,accepted_bid_id,payload,listing_bids(id,bidder_user_id,status,company_name,bid_amount,estimated_timeframe,proposal_message,payload,created_at)",
    order: "created_at.desc",
    limit: String(limit),
  });
  if (type) params.append("listing_type", `eq.${type}`);
  if (status && status !== "all") params.append("status", `eq.${status}`);
  if (category) params.append("category", `eq.${category}`);

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings?${params}`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!resp.ok) throw new Error(`fetchListings failed (HTTP ${resp.status})`);
  const rows = await resp.json();
  return (rows || []).map(normalizeListing);
}

/**
 * Fetch a single listing with all its bids (for detail page).
 */
export async function fetchListing(listingId) {
  if (!listingId) return null;

  const supabase = await getSupabaseClient();

  // ── Attempt 1: Supabase JS client ──
  try {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(`
        *,
        listing_bids (id, bidder_user_id, bidder_role, status, company_name, bid_amount, estimated_timeframe, proposal_message, payload, created_at)
      `)
      .eq("id", listingId)
      .single();

    if (!error && data) return normalizeListing(data);
    if (error && error.code === "PGRST116") return null;
    if (error) console.warn("[yapply] fetchListing JS error:", error.message);
  } catch (e) {
    console.warn("[yapply] fetchListing JS threw:", e?.message);
  }

  // ── Attempt 2: Raw REST API ──
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings?id=eq.${encodeURIComponent(listingId)}&select=*,listing_bids(id,bidder_user_id,bidder_role,status,company_name,bid_amount,estimated_timeframe,proposal_message,payload,created_at)&limit=1`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!resp.ok) throw new Error(`fetchListing failed (HTTP ${resp.status})`);
  const rows = await resp.json();
  if (!rows || rows.length === 0) return null;
  return normalizeListing(rows[0]);
}

/**
 * Fetch all listings owned by a specific user (for İlanlarım page).
 */
export async function fetchMyListings(ownerUserId) {
  if (!ownerUserId) return [];

  const supabase = await getSupabaseClient();

  // ── Attempt 1: Supabase JS client ──
  try {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(`
        *,
        listing_bids (id, bidder_user_id, bidder_role, status, company_name, bid_amount, estimated_timeframe, proposal_message, payload, created_at)
      `)
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false });

    if (!error && data) return (data || []).map(normalizeListing);
    if (error) console.warn("[yapply] fetchMyListings JS error:", error.message);
  } catch (e) {
    console.warn("[yapply] fetchMyListings JS threw:", e?.message);
  }

  // ── Attempt 2: Raw REST API ──
  const authHeader = (await getBestAccessToken(supabase)) || SUPABASE_ANON_KEY;

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings?owner_user_id=eq.${encodeURIComponent(ownerUserId)}&select=*,listing_bids(id,bidder_user_id,bidder_role,status,company_name,bid_amount,estimated_timeframe,proposal_message,payload,created_at)&order=created_at.desc`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${authHeader}` },
  });
  if (!resp.ok) throw new Error(`fetchMyListings failed (HTTP ${resp.status})`);
  const rows = await resp.json();
  return (rows || []).map(normalizeListing);
}

/**
 * Fetch all listings that have bids from a specific developer (for developer dashboard).
 */
export async function fetchBidsForDeveloper(bidderUserId) {
  if (!bidderUserId) return [];

  const supabase = await getSupabaseClient();

  // ── Attempt 1: Supabase JS client ──
  try {
    const { data, error } = await supabase
      .from("listing_bids")
      .select(`
        *,
        marketplace_listings (id, title, status, owner_user_id, listing_type, payload, created_at, updated_at)
      `)
      .eq("bidder_user_id", bidderUserId)
      .order("created_at", { ascending: false });

    if (!error && data) return (data || []).map(normalizeBidWithListing);
    if (error) console.warn("[yapply] fetchBidsForDeveloper JS error:", error.message);
  } catch (e) {
    console.warn("[yapply] fetchBidsForDeveloper JS threw:", e?.message);
  }

  // ── Attempt 2: Raw REST API ──
  const authHeader = (await getBestAccessToken(supabase)) || SUPABASE_ANON_KEY;

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/listing_bids?bidder_user_id=eq.${encodeURIComponent(bidderUserId)}&select=*,marketplace_listings(id,title,status,owner_user_id,listing_type,payload,created_at,updated_at)&order=created_at.desc`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${authHeader}` },
  });
  if (!resp.ok) throw new Error(`fetchBidsForDeveloper failed (HTTP ${resp.status})`);
  const rows = await resp.json();
  return (rows || []).map(normalizeBidWithListing);
}

// ─── Accept Bid ──────────────────────────────────────────────

/**
 * Accept a bid — updates both the listing and bid status in one go.
 * This is the ONLY accept function needed. No local cache gymnastics.
 */
export async function acceptBid(listingId, bidId, ownerUserId) {
  const supabase = await getSupabaseClient();

  // 1. Verify the listing belongs to this user
  const { data: listing, error: listingErr } = await supabase
    .from("marketplace_listings")
    .select("id, owner_user_id, status, accepted_bid_id")
    .eq("id", listingId)
    .single();

  if (listingErr || !listing) {
    throw new Error("Bu ilan bulunamadı. / This listing could not be found.");
  }

  if (listing.owner_user_id !== ownerUserId) {
    throw new Error("Sadece kendi ilanlarınızı yönetebilirsiniz. / You can only manage your own listings.");
  }

  if (listing.accepted_bid_id) {
    throw new Error("Bu ilan için zaten bir teklif kabul edildi. / A bid has already been accepted for this listing.");
  }

  // 2. Update the bid status to "accepted"
  const { error: bidErr } = await supabase
    .from("listing_bids")
    .update({ status: "accepted" })
    .eq("id", bidId)
    .eq("listing_id", listingId);

  if (bidErr) throw bidErr;

  // 3. Update the listing status to "bid-accepted" and record the accepted bid
  const { data: updatedListing, error: updateErr } = await supabase
    .from("marketplace_listings")
    .update({
      status: "bid-accepted",
      accepted_bid_id: bidId,
    })
    .eq("id", listingId)
    .select(`
      *,
      listing_bids (id, bidder_user_id, bidder_role, status, company_name, bid_amount, estimated_timeframe, proposal_message, payload, created_at)
    `)
    .single();

  if (updateErr) throw updateErr;

  return normalizeListing(updatedListing);
}

// ─── Create Bid ──────────────────────────────────────────────

/**
 * Developer submits a new bid on a listing.
 * Two-layer approach:
 *   1. Try Supabase JS client (uses auth.uid() for RLS)
 *   2. If that fails, try raw REST API fetch with JWT token (bypasses any CapacitorHttp issues)
 */
export async function createBid({ listingId, bidderUserId, companyName, bidAmount, estimatedTimeframe, proposalMessage, payload = {} }) {
  // ── Validate listing ID is a proper UUID before even trying ──
  if (!isValidUUID(listingId)) {
    console.error("[yapply] createBid: listingId is NOT a valid UUID:", listingId);
    throw Object.assign(
      new Error("Bu ilan henüz sunucuya kaydedilmemiş. Lütfen yeni bir ilan oluşturun. / This listing was not saved to the server. Please create a new listing."),
      { code: "LISTING_NOT_IN_PG", details: `listingId "${listingId}" is not a UUID — listing only exists locally` }
    );
  }

  const supabase = await getSupabaseClient();

  // Get JWT from localStorage first (bypasses CapacitorHttp)
  const accessToken = await getBestAccessToken(supabase);
  console.log("[yapply] createBid: hasToken =", !!accessToken, "| bidder =", bidderUserId, "| listing =", listingId);

  const bidRow = {
    listing_id: listingId,
    bidder_user_id: bidderUserId,
    company_name: companyName || "",
    bid_amount: bidAmount || "",
    estimated_timeframe: estimatedTimeframe || "",
    proposal_message: proposalMessage || "",
    payload: typeof payload === "string" ? JSON.parse(payload) : (payload || {}),
  };

  // ── Attempt 1: Supabase JS client ──
  try {
    const { data, error } = await supabase
      .from("listing_bids")
      .insert(bidRow)
      .select()
      .single();

    if (!error && data) {
      console.log("[yapply] createBid OK via Supabase JS client, id =", data.id);
      return normalizeBid(data);
    }
    if (error) {
      console.warn("[yapply] createBid Supabase JS error:", error.code, error.message, error.details, error.hint);
    }
  } catch (jsClientErr) {
    console.warn("[yapply] createBid Supabase JS threw:", jsClientErr?.message);
  }

  // ── Attempt 2: Raw REST API with JWT from localStorage ──
  console.log("[yapply] createBid: trying raw REST API...");

  if (!accessToken) {
    throw Object.assign(
      new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın. / Session not found. Please log in again."),
      { code: "NO_AUTH_TOKEN" }
    );
  }

  const rawResponse = await fetch(`${SUPABASE_URL}/rest/v1/listing_bids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(bidRow),
  });

  if (!rawResponse.ok) {
    const errBody = await rawResponse.text().catch(() => "");
    console.error("[yapply] createBid raw REST failed:", rawResponse.status, errBody);
    const parsed = (() => { try { return JSON.parse(errBody); } catch { return {}; } })();
    throw Object.assign(
      new Error(parsed.message || parsed.msg || `Bid insert failed (HTTP ${rawResponse.status})`),
      { code: parsed.code || "PG_INSERT_FAILED", status: rawResponse.status, details: errBody }
    );
  }

  const rows = await rawResponse.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  console.log("[yapply] createBid OK via raw REST, id =", row?.id);
  return normalizeBid(row);
}

// ─── Create Listing ──────────────────────────────────────────

/**
 * Client creates a new marketplace listing.
 * Two-layer approach (same as createBid):
 *   1. Try Supabase JS client
 *   2. If that fails, raw REST API fetch (bypasses CapacitorHttp issues)
 */
export async function createListing({ id, ownerUserId, ownerEmail, ownerRole = "client", listingType = "client", title, description, location, budget, timeframe, projectType, category, payload = {} }) {
  const supabase = await getSupabaseClient();

  // Get JWT from localStorage first (bypasses CapacitorHttp)
  const accessToken = await getBestAccessToken(supabase);
  console.log("[yapply] createListing: hasToken =", !!accessToken, "| owner =", ownerUserId);

  const listingRow = {
    // Use client-side UUID if provided — makes insert idempotent across retries
    ...(id ? { id } : {}),
    owner_user_id: ownerUserId,
    owner_email: ownerEmail || "",
    owner_role: ownerRole,
    listing_type: listingType,
    title: title || "",
    description: description || "",
    location: location || "",
    budget: budget || "",
    timeframe: timeframe || "",
    project_type: projectType || "",
    category: category || "",
    payload: typeof payload === "string" ? JSON.parse(payload) : (payload || {}),
  };

  // ── Attempt 1: Supabase JS client ──
  try {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .upsert(listingRow, { onConflict: "id", ignoreDuplicates: false })
      .select(`
        *,
        listing_bids (id, bidder_user_id, status, company_name, bid_amount, estimated_timeframe, proposal_message, payload, created_at)
      `)
      .single();

    if (!error && data) {
      console.log("[yapply] createListing OK via Supabase JS client, id =", data.id);
      return normalizeListing(data);
    }
    if (error) {
      console.warn("[yapply] createListing Supabase JS error:", error.code, error.message, error.details, error.hint);
    }
  } catch (jsClientErr) {
    console.warn("[yapply] createListing Supabase JS threw:", jsClientErr?.message);
  }

  // ── Attempt 2: Raw REST API with JWT from localStorage ──
  console.log("[yapply] createListing: trying raw REST API...");

  if (!accessToken) {
    throw Object.assign(
      new Error("Oturum bulunamadı. İlan oluşturmak için lütfen tekrar giriş yapın. / Session not found. Please log in again to create a listing."),
      { code: "NO_AUTH_TOKEN" }
    );
  }

  const rawResponse = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Prefer": "return=representation,resolution=merge-duplicates",
    },
    body: JSON.stringify(listingRow),
  });

  if (!rawResponse.ok) {
    const errBody = await rawResponse.text().catch(() => "");
    console.error("[yapply] createListing raw REST failed:", rawResponse.status, errBody);
    const parsed = (() => { try { return JSON.parse(errBody); } catch { return {}; } })();
    throw Object.assign(
      new Error(parsed.message || parsed.msg || `Listing insert failed (HTTP ${rawResponse.status})`),
      { code: parsed.code || "PG_INSERT_FAILED", status: rawResponse.status, details: errBody }
    );
  }

  const rows = await rawResponse.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  console.log("[yapply] createListing OK via raw REST, id =", row?.id);
  // Add empty bids array since raw REST doesn't join
  row.listing_bids = [];
  return normalizeListing(row);
}

// ─── Update Listing Status ───────────────────────────────────

export async function updateListingStatus(listingId, newStatus) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("marketplace_listings")
    .update({ status: newStatus })
    .eq("id", listingId)
    .select()
    .single();

  if (error) throw error;
  return normalizeListing(data);
}

// ─── Bulk-update bid statuses for a listing ─────────────────
/**
 * Set the status of ALL non-accepted bids on a listing.
 * When a listing is deactivated  → close all open bids  ("closed")
 * When a listing is reactivated  → reopen all closed bids ("pending")
 * Accepted bids are never touched.
 */
export async function updateBidStatusesForListing(listingId, fromStatus, toStatus) {
  if (!listingId) return;
  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from("listing_bids")
    .update({ status: toStatus })
    .eq("listing_id", listingId)
    .eq("status", fromStatus);

  if (error) {
    console.error("[yapply] updateBidStatusesForListing failed:", error);
    throw error;
  }
}

// ─── Delete Listing from PG ─────────────────────────────────

/**
 * Delete a listing from the PG `marketplace_listings` table.
 * Also deletes associated bids via ON DELETE CASCADE on the FK.
 * Uses raw REST call with the user's JWT so RLS owner check passes.
 */
export async function deleteListingFromPg(listingId) {
  if (!listingId) return false;

  const supabase = await getSupabaseClient();

  // Try RPC function first (SECURITY DEFINER — bypasses RLS)
  try {
    const { data, error: rpcErr } = await supabase.rpc("delete_listing_from_pg", { p_id: listingId });
    if (!rpcErr) {
      console.log("[yapply] deleteListingFromPg: deleted via RPC:", listingId);
      return true;
    }
    console.warn("[yapply] deleteListingFromPg RPC error:", rpcErr.message);
  } catch (e) {
    console.warn("[yapply] deleteListingFromPg RPC threw:", e?.message);
  }

  // Fallback: Supabase JS client direct delete
  try {
    const { error } = await supabase
      .from("marketplace_listings")
      .delete()
      .eq("id", listingId);

    if (!error) {
      console.log("[yapply] deleteListingFromPg: deleted via JS client:", listingId);
      return true;
    }
    console.warn("[yapply] deleteListingFromPg JS client error:", error.message);
  } catch (e) {
    console.warn("[yapply] deleteListingFromPg JS client threw:", e?.message);
  }

  // Fallback: raw REST DELETE
  try {
    const accessToken = await getBestAccessToken(supabase);
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/marketplace_listings?id=eq.${encodeURIComponent(listingId)}`,
      {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          "Prefer": "return=minimal",
        },
      }
    );
    if (resp.ok) {
      console.log("[yapply] deleteListingFromPg: deleted via REST:", listingId);
      return true;
    }
    console.warn("[yapply] deleteListingFromPg REST error:", resp.status, await resp.text());
  } catch (e) {
    console.warn("[yapply] deleteListingFromPg REST threw:", e?.message);
  }

  return false;
}

// ─── Ensure Listing Exists in PG ─────────────────────────────

/**
 * Ensure a listing exists in the PG `marketplace_listings` table.
 * Uses the `ensure_listing_in_pg` RPC function (SECURITY DEFINER)
 * which bypasses RLS. Falls back to direct INSERT if RPC unavailable.
 *
 * Call this BEFORE creating a bid so the FK constraint is satisfied.
 */
export async function ensureListingInPg(listingData) {
  if (!listingData?.id) return;
  const supabase = await getSupabaseClient();

  // First check if listing already exists in PG
  try {
    const { data: existing } = await supabase
      .from("marketplace_listings")
      .select("id")
      .eq("id", listingData.id)
      .maybeSingle();
    if (existing) {
      console.log("[yapply] ensureListingInPg: listing already in PG:", listingData.id);
      return;
    }
  } catch (_) {}

  console.log("[yapply] ensureListingInPg: listing NOT in PG, syncing:", listingData.id);

  // Try RPC function first (SECURITY DEFINER — bypasses RLS)
  try {
    const { error: rpcErr } = await supabase.rpc("ensure_listing_in_pg", {
      p_id: listingData.id,
      p_owner_user_id: listingData.ownerUserId || null,
      p_title: listingData.title || listingData.name || "",
      p_listing_type: listingData.type || "client",
      p_status: listingData.status || "open-for-bids",
      p_description: listingData.brief || listingData.description || "",
      p_location: listingData.location || "",
      p_budget: listingData.budget || "",
      p_timeframe: listingData.timeline || listingData.timeframe || "",
      p_project_type: listingData.projectType || "",
      p_category: listingData.marketplaceCategory || listingData.category || "",
      p_owner_email: listingData.contact?.email || listingData.ownerEmail || "",
      p_owner_role: listingData.ownerRole || "client",
      p_payload: {},
    });
    if (!rpcErr) {
      console.log("[yapply] ensureListingInPg: synced via RPC");
      return;
    }
    console.warn("[yapply] ensureListingInPg RPC error:", rpcErr.message);
  } catch (e) {
    console.warn("[yapply] ensureListingInPg RPC threw:", e?.message);
  }

  // Fallback: direct INSERT (works if RLS is relaxed or user is owner)
  try {
    const accessToken = await getBestAccessToken(supabase);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        "Prefer": "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: listingData.id,
        owner_user_id: listingData.ownerUserId || null,
        title: listingData.title || listingData.name || "",
        listing_type: listingData.type || "client",
        status: listingData.status || "open-for-bids",
        description: listingData.brief || listingData.description || "",
        location: listingData.location || "",
        budget: listingData.budget || "",
        timeframe: listingData.timeline || listingData.timeframe || "",
        project_type: listingData.projectType || "",
        category: listingData.marketplaceCategory || listingData.category || "",
        owner_email: listingData.contact?.email || listingData.ownerEmail || "",
        owner_role: listingData.ownerRole || "client",
        payload: {},
      }),
    });
    if (resp.ok || resp.status === 409) {
      console.log("[yapply] ensureListingInPg: synced via direct INSERT");
      return;
    }
    console.warn("[yapply] ensureListingInPg direct INSERT failed:", resp.status);
  } catch (e) {
    console.warn("[yapply] ensureListingInPg direct INSERT threw:", e?.message);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id) {
  return typeof id === "string" && UUID_RE.test(id);
}

// ─── Normalization (DB rows → frontend format) ───────────────

function normalizeListing(row) {
  if (!row) return null;

  const bids = Array.isArray(row.listing_bids) ? row.listing_bids.map(normalizeBid) : [];
  const acceptedBid = bids.find((b) => b.status === "accepted") || null;

  // Spread payload FIRST so explicit PG column values below take precedence.
  // This prevents payload.id / payload.type / payload.status from overwriting
  // the authoritative PG row values.
  const payloadFields = typeof row.payload === "object" && row.payload !== null ? row.payload : {};

  return {
    ...payloadFields,
    // ── Authoritative PG columns — MUST come after spread ──
    id: row.id,
    type: row.listing_type,
    status: row.status,
    title: row.title || "",
    description: row.description || "",
    location: row.location || "",
    budget: row.budget || "",
    timeframe: row.timeframe || "",
    projectType: row.project_type || "",
    category: row.category || "",
    ownerUserId: row.owner_user_id || "",
    ownerEmail: row.owner_email || "",
    ownerRole: row.owner_role || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acceptedBidId: row.accepted_bid_id || "",
    bids,
    // Build marketplaceMeta for backward compatibility with existing UI components
    marketplaceMeta: {
      ...(typeof row.payload?.marketplaceMeta === "object" ? row.payload.marketplaceMeta : {}),
      // ── Authoritative PG values — MUST come after payload spread ──
      listingStatus: row.status,
      bidCount: bids.length,
      latestBids: bids.slice(0, 4),
      acceptedBidId: row.accepted_bid_id || "",
      acceptedBid,
      category: row.category || "",
    },
    // Preserve attachments from payload
    attachments: Array.isArray(row.payload?.attachments) ? row.payload.attachments : [],
    imageSrc: row.payload?.imageSrc || "",
    images: Array.isArray(row.payload?.images) ? row.payload.images : [],
  };
}

function normalizeBid(row) {
  if (!row) return null;

  const payloadData = typeof row.payload === "object" && row.payload !== null ? row.payload : {};

  return {
    id: row.id,
    listingId: row.listing_id,
    developerId: row.bidder_user_id || "",
    developerUserId: row.bidder_user_id || "",
    bidderRole: row.bidder_role || "developer",
    status: row.status || "submitted",
    companyName: row.company_name || payloadData.companyName || "",
    developerName: payloadData.developerName || row.company_name || "",
    bidAmount: payloadData.bidAmount || { label: row.bid_amount || "" },
    estimatedCompletionTimeframe: payloadData.estimatedCompletionTimeframe || { label: row.estimated_timeframe || "" },
    proposalMessage: row.proposal_message || payloadData.proposalMessage || "",
    createdAt: row.created_at,
    developerProfileReference: payloadData.developerProfileReference || { userId: row.bidder_user_id },
    ...payloadData,
  };
}

function normalizeBidWithListing(row) {
  const bid = normalizeBid(row);
  if (row.marketplace_listings) {
    bid.listing = normalizeListing(row.marketplace_listings);
  }
  return bid;
}

// ─── Developer Reviews ──────────────────────────────────────

/**
 * Fetch all reviews for a developer by their user ID.
 */
export async function fetchReviewsForDeveloper(developerUserId) {
  if (!developerUserId) return [];
  const supabase = await getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("developer_reviews")
      .select("*")
      .eq("developer_user_id", developerUserId)
      .order("created_at", { ascending: false });

    if (!error && data) return data;
    if (error) console.warn("[yapply] fetchReviewsForDeveloper JS error:", error.message);
  } catch (e) {
    console.warn("[yapply] fetchReviewsForDeveloper JS threw:", e?.message);
  }

  // Fallback: raw REST
  const authHeader = (await getBestAccessToken(supabase)) || SUPABASE_ANON_KEY;
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/developer_reviews?developer_user_id=eq.${encodeURIComponent(developerUserId)}&order=created_at.desc`,
    { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${authHeader}` } }
  );
  if (!resp.ok) return [];
  return (await resp.json()) || [];
}

/**
 * Submit a review for a developer. Only allowed if:
 * - The reviewer is the listing owner (client)
 * - The listing has an accepted bid from the developer
 */
export async function submitDeveloperReview({ developerUserId, reviewerUserId, listingId, bidId, rating, comment }) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("developer_reviews")
    .insert({
      developer_user_id: developerUserId,
      reviewer_user_id: reviewerUserId,
      listing_id: listingId,
      bid_id: bidId,
      rating: Math.min(5, Math.max(1, Math.round(rating))),
      comment: (comment || "").trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if a review already exists for a given client + listing combo.
 */
export async function hasExistingReview(reviewerUserId, listingId) {
  if (!reviewerUserId || !listingId) return false;
  const supabase = await getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("developer_reviews")
      .select("id")
      .eq("reviewer_user_id", reviewerUserId)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (!error && data) return true;
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Fetch developer's public profile data: profile info + bid stats + reviews.
 */
export async function fetchDeveloperPublicProfile(developerUserId) {
  if (!developerUserId) return null;
  const supabase = await getSupabaseClient();

  // Fetch profile
  let profile = null;
  try {
    const authHeader = (await getBestAccessToken(supabase)) || SUPABASE_ANON_KEY;
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(developerUserId)}&select=*`,
      { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${authHeader}` } }
    );
    if (resp.ok) {
      const rows = await resp.json();
      profile = Array.isArray(rows) ? rows[0] : rows;
    }
  } catch (_) {}

  // Resolve avatar — profile_picture_src for the template
  // Default bird avatars by role (inlined so this never fails)
  const DEFAULT_AVATARS = {
    developer: "./assets/avatars/avatar-bird-business.png",
    client: "./assets/avatars/avatar-bird-business.png",
  };
  if (profile) {
    const role = profile.role || "developer";
    const avatarUrl = profile.avatar_url || "";
    if (avatarUrl) {
      profile.profile_picture_src = avatarUrl;
    } else {
      // Try to use accountSettingsStore for full avatar options
      try {
        const { getDefaultAvatarOptions } = await import("./accountSettingsStore.js");
        const options = getDefaultAvatarOptions(role);
        profile.profile_picture_src = options[0]?.src || DEFAULT_AVATARS[role] || DEFAULT_AVATARS.developer;
      } catch (_) {
        profile.profile_picture_src = DEFAULT_AVATARS[role] || DEFAULT_AVATARS.developer;
      }
    }
  }

  // Fetch bid stats
  let totalBids = 0;
  let wonBids = 0;
  try {
    const authHeader = (await getBestAccessToken(supabase)) || SUPABASE_ANON_KEY;
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/listing_bids?bidder_user_id=eq.${encodeURIComponent(developerUserId)}&select=id,status`,
      { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${authHeader}` } }
    );
    if (resp.ok) {
      const bids = await resp.json();
      totalBids = bids.length;
      wonBids = bids.filter((b) => b.status === "accepted").length;
    }
  } catch (_) {}

  // Fetch reviews
  const reviews = await fetchReviewsForDeveloper(developerUserId);

  // Compute average rating
  const ratingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  const ratingAverage = reviews.length > 0 ? ratingSum / reviews.length : 0;

  return {
    profile,
    totalBids,
    wonBids,
    reviews,
    ratingAverage,
    ratingCount: reviews.length,
  };
}

// ─── Developer Bid Limit System ─────────────────────────────

/**
 * Check how many bids remain in the current 30-day cycle.
 * Calls the Supabase RPC function `check_and_reset_bid_cycle`.
 */
export async function checkDeveloperBidStatus(userId) {
  const supabase = await getSupabaseClient();
  try {
    const { data, error } = await supabase.rpc("check_and_reset_bid_cycle", { p_user_id: userId });
    if (error) {
      console.warn("[yapply] checkDeveloperBidStatus error:", error.message);
      return { bidsRemaining: 15, bidLimit: 15, cycleEnd: null };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      bidsRemaining: row?.bids_remaining ?? 15,
      bidLimit: row?.bid_limit ?? 15,
      cycleEnd: row?.cycle_end || null,
    };
  } catch (e) {
    console.warn("[yapply] checkDeveloperBidStatus threw:", e?.message);
    return { bidsRemaining: 15, bidLimit: 15, cycleEnd: null };
  }
}

/**
 * Consume one bid from the developer's allocation.
 * Returns { success, bidsRemaining, bidLimit }.
 * If success is false, the developer has hit their limit.
 */
export async function consumeDeveloperBid(userId) {
  const supabase = await getSupabaseClient();
  try {
    const { data, error } = await supabase.rpc("consume_developer_bid", { p_user_id: userId });
    if (error) {
      console.warn("[yapply] consumeDeveloperBid error:", error.message);
      return { success: false, bidsRemaining: 0, bidLimit: 15 };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      success: row?.success ?? false,
      bidsRemaining: row?.bids_remaining ?? 0,
      bidLimit: row?.bid_limit ?? 15,
    };
  } catch (e) {
    console.warn("[yapply] consumeDeveloperBid threw:", e?.message);
    return { success: false, bidsRemaining: 0, bidLimit: 15 };
  }
}
