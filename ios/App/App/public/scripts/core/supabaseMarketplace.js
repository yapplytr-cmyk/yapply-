/**
 * supabaseMarketplace.js
 * Direct Supabase PostgreSQL queries for marketplace data.
 * Replaces all Vercel API roundtrips — app talks to Supabase directly.
 */

import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";

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
        *,
        listing_bids (id, bidder_user_id, status, company_name, bid_amount, estimated_timeframe, proposal_message, payload, created_at)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (type) query = query.eq("listing_type", type);
    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (!error && data) return (data || []).map(normalizeListing);
    if (error) console.warn("[yapply] fetchListings JS error:", error.message);
  } catch (e) {
    console.warn("[yapply] fetchListings JS threw:", e?.message);
  }

  // ── Attempt 2: Raw REST API ──
  const SUPABASE_URL = "https://sgoicvqgfydwfpttzgqu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2ljdnFnZnlkd2ZwdHR6Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTY0MDgsImV4cCI6MjA4ODg5MjQwOH0.UOsoPsANDynWmiZ4eWM_dLYU8dBsZvALraKKLqHC6Wg";
  const params = new URLSearchParams({
    select: "*,listing_bids(id,bidder_user_id,status,company_name,bid_amount,estimated_timeframe,proposal_message,payload,created_at)",
    order: "created_at.desc",
    limit: String(limit),
  });
  if (type) params.append("listing_type", `eq.${type}`);
  if (status) params.append("status", `eq.${status}`);
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
  const SUPABASE_URL = "https://sgoicvqgfydwfpttzgqu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2ljdnFnZnlkd2ZwdHR6Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTY0MDgsImV4cCI6MjA4ODg5MjQwOH0.UOsoPsANDynWmiZ4eWM_dLYU8dBsZvALraKKLqHC6Wg";
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
  const SUPABASE_URL = "https://sgoicvqgfydwfpttzgqu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2ljdnFnZnlkd2ZwdHR6Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTY0MDgsImV4cCI6MjA4ODg5MjQwOH0.UOsoPsANDynWmiZ4eWM_dLYU8dBsZvALraKKLqHC6Wg";
  let accessToken = null;
  try {
    const { data: sd } = await supabase.auth.getSession();
    accessToken = sd?.session?.access_token || null;
  } catch (_) {}
  const authHeader = accessToken || SUPABASE_ANON_KEY;

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
  const SUPABASE_URL = "https://sgoicvqgfydwfpttzgqu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2ljdnFnZnlkd2ZwdHR6Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTY0MDgsImV4cCI6MjA4ODg5MjQwOH0.UOsoPsANDynWmiZ4eWM_dLYU8dBsZvALraKKLqHC6Wg";
  let accessToken = null;
  try {
    const { data: sd } = await supabase.auth.getSession();
    accessToken = sd?.session?.access_token || null;
  } catch (_) {}
  const authHeader = accessToken || SUPABASE_ANON_KEY;

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
  const supabase = await getSupabaseClient();

  // Get the current JWT access token for raw REST fallback
  let accessToken = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    accessToken = sessionData?.session?.access_token || null;
    const authUid = sessionData?.session?.user?.id || "NO_SESSION";
    console.log("[yapply] createBid: auth.uid =", authUid, "| bidder =", bidderUserId, "| match =", authUid === bidderUserId, "| hasToken =", !!accessToken);
  } catch (e) {
    console.warn("[yapply] createBid: getSession failed:", e?.message);
  }

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

  // ── Attempt 2: Raw REST API fetch (bypasses Supabase JS client HTTP layer) ──
  console.log("[yapply] createBid: trying raw REST API fallback...");
  const SUPABASE_URL = "https://sgoicvqgfydwfpttzgqu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2ljdnFnZnlkd2ZwdHR6Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTY0MDgsImV4cCI6MjA4ODg5MjQwOH0.UOsoPsANDynWmiZ4eWM_dLYU8dBsZvALraKKLqHC6Wg";

  // If we don't have a JWT, try refreshing
  if (!accessToken) {
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      accessToken = refreshData?.session?.access_token || null;
    } catch (_) {}
  }

  const authHeader = accessToken || SUPABASE_ANON_KEY;

  const rawResponse = await fetch(`${SUPABASE_URL}/rest/v1/listing_bids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${authHeader}`,
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
export async function createListing({ ownerUserId, ownerEmail, ownerRole = "client", listingType = "client", title, description, location, budget, timeframe, projectType, category, payload = {} }) {
  const supabase = await getSupabaseClient();

  // Get JWT for raw REST fallback
  let accessToken = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    accessToken = sessionData?.session?.access_token || null;
    console.log("[yapply] createListing: hasToken =", !!accessToken, "| owner =", ownerUserId);
  } catch (e) {
    console.warn("[yapply] createListing: getSession failed:", e?.message);
  }

  const listingRow = {
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
      .insert(listingRow)
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

  // ── Attempt 2: Raw REST API fetch ──
  console.log("[yapply] createListing: trying raw REST API fallback...");
  const SUPABASE_URL = "https://sgoicvqgfydwfpttzgqu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2ljdnFnZnlkd2ZwdHR6Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTY0MDgsImV4cCI6MjA4ODg5MjQwOH0.UOsoPsANDynWmiZ4eWM_dLYU8dBsZvALraKKLqHC6Wg";

  if (!accessToken) {
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      accessToken = refreshData?.session?.access_token || null;
    } catch (_) {}
  }

  const authHeader = accessToken || SUPABASE_ANON_KEY;

  const rawResponse = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${authHeader}`,
      "Prefer": "return=representation",
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

// ─── Normalization (DB rows → frontend format) ───────────────

function normalizeListing(row) {
  if (!row) return null;

  const bids = Array.isArray(row.listing_bids) ? row.listing_bids.map(normalizeBid) : [];
  const acceptedBid = bids.find((b) => b.status === "accepted") || null;

  return {
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
    // Preserve the payload for any extra fields the frontend uses
    ...(typeof row.payload === "object" && row.payload !== null ? row.payload : {}),
    // Build marketplaceMeta for backward compatibility with existing UI components
    marketplaceMeta: {
      listingStatus: row.status,
      bidCount: bids.length,
      latestBids: bids.slice(0, 4),
      acceptedBidId: row.accepted_bid_id || "",
      acceptedBid,
      category: row.category || "",
      ...(typeof row.payload?.marketplaceMeta === "object" ? row.payload.marketplaceMeta : {}),
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
