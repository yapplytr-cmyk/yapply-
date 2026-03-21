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
  if (error) throw error;

  return (data || []).map(normalizeListing);
}

/**
 * Fetch a single listing with all its bids (for detail page).
 */
export async function fetchListing(listingId) {
  if (!listingId) return null;

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(`
      *,
      listing_bids (id, bidder_user_id, bidder_role, status, company_name, bid_amount, estimated_timeframe, proposal_message, payload, created_at)
    `)
    .eq("id", listingId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }

  return normalizeListing(data);
}

/**
 * Fetch all listings owned by a specific user (for İlanlarım page).
 */
export async function fetchMyListings(ownerUserId) {
  if (!ownerUserId) return [];

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(`
      *,
      listing_bids (id, bidder_user_id, bidder_role, status, company_name, bid_amount, estimated_timeframe, proposal_message, payload, created_at)
    `)
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeListing);
}

/**
 * Fetch all listings that have bids from a specific developer (for developer dashboard).
 */
export async function fetchBidsForDeveloper(bidderUserId) {
  if (!bidderUserId) return [];

  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("listing_bids")
    .select(`
      *,
      marketplace_listings (id, title, status, owner_user_id, listing_type, payload, created_at, updated_at)
    `)
    .eq("bidder_user_id", bidderUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(normalizeBidWithListing);
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
 */
export async function createBid({ listingId, bidderUserId, companyName, bidAmount, estimatedTimeframe, proposalMessage, payload = {} }) {
  const supabase = await getSupabaseClient();

  // Force-refresh the auth session before insert to avoid expired JWT / RLS failures
  try {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session) {
      console.log("[yapply] createBid: session refreshed, uid =", refreshData.session.user?.id);
    }
  } catch (_refreshErr) {
    console.warn("[yapply] createBid: session refresh failed, proceeding with current session");
  }

  // Debug: log Supabase auth state before bid insert
  const { data: sessionData } = await supabase.auth.getSession();
  const authUid = sessionData?.session?.user?.id || "NO_SESSION";
  console.log("[yapply] createBid: auth.uid =", authUid, "| bidder_user_id =", bidderUserId, "| match =", authUid === bidderUserId);

  if (authUid === "NO_SESSION") {
    throw new Error("No active Supabase auth session. Please log in again.");
  }

  const { data, error } = await supabase
    .from("listing_bids")
    .insert({
      listing_id: listingId,
      bidder_user_id: bidderUserId,
      company_name: companyName || "",
      bid_amount: bidAmount || "",
      estimated_timeframe: estimatedTimeframe || "",
      proposal_message: proposalMessage || "",
      payload,
    })
    .select()
    .single();

  if (error) {
    console.error("[yapply] createBid PG error:", error.code, error.message, error.details, error.hint);
    throw error;
  }

  return normalizeBid(data);
}

// ─── Create Listing ──────────────────────────────────────────

/**
 * Client creates a new marketplace listing.
 */
export async function createListing({ ownerUserId, ownerEmail, ownerRole = "client", listingType = "client", title, description, location, budget, timeframe, projectType, category, payload = {} }) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("marketplace_listings")
    .insert({
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
      payload,
    })
    .select(`
      *,
      listing_bids (id, bidder_user_id, status, company_name, bid_amount, estimated_timeframe, proposal_message, payload, created_at)
    `)
    .single();

  if (error) throw error;

  return normalizeListing(data);
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
