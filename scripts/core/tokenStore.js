/**
 * tokenStore.js
 * Token balance + bid-cost logic for the membership/token system.
 *
 * Design:
 *  - Token balances live in Supabase (token_accounts + token_transactions),
 *    all writes via SECURITY DEFINER RPCs — the client can never forge a balance.
 *  - Bid costs come from the bid_token_costs table (editable without code changes),
 *    with a hardcoded fallback if the table is unreachable.
 *  - If the token RPCs are not deployed yet, every call degrades gracefully
 *    to the legacy 15-bids-per-30-days cycle so bidding never breaks.
 */

import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";

const SUPABASE_URL = "https://sgoicvqgfydwfpttzgqu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb2ljdnFnZnlkd2ZwdHR6Z3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTY0MDgsImV4cCI6MjA4ODg5MjQwOH0.UOsoPsANDynWmiZ4eWM_dLYU8dBsZvALraKKLqHC6Wg";

// Fallback tiers if bid_token_costs can't be fetched (kept in sync with the seed data)
const FALLBACK_TIERS = [
  { min: 0, max: 50000, cost: 1 },
  { min: 50000, max: 150000, cost: 2 },
  { min: 150000, max: 500000, cost: 3 },
  { min: 500000, max: 1500000, cost: 5 },
  { min: 1500000, max: null, cost: 8 },
];

let _tiersCache = null;
let _tiersCacheAt = 0;
const TIERS_TTL_MS = 10 * 60 * 1000;

function _getAccessToken() {
  try {
    const raw = localStorage.getItem("sb-sgoicvqgfydwfpttzgqu-auth-token");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access_token) return parsed.access_token;
    }
  } catch (_) {}
  return null;
}

/** Fetch bid cost tiers from Supabase (cached 10 min, REST — no SDK needed). */
export async function fetchBidCostTiers() {
  if (_tiersCache && Date.now() - _tiersCacheAt < TIERS_TTL_MS) return _tiersCache;
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/bid_token_costs?select=min_budget_tl,max_budget_tl,token_cost&order=min_budget_tl.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (resp.ok) {
      const rows = await resp.json();
      if (Array.isArray(rows) && rows.length > 0) {
        _tiersCache = rows.map((r) => ({
          min: Number(r.min_budget_tl) || 0,
          max: r.max_budget_tl == null ? null : Number(r.max_budget_tl),
          cost: Number(r.token_cost) || 1,
        }));
        _tiersCacheAt = Date.now();
        return _tiersCache;
      }
    }
  } catch (_) {}
  return FALLBACK_TIERS;
}

/**
 * Parse a Yapply budget label ("10,000 - 50,000 TL", "1.500.000 TL+", "150000")
 * into a numeric TL amount (uses the UPPER bound of a range — bid cost is
 * priced on the job's potential value).
 */
export function parseBudgetToTl(budgetLabel) {
  if (budgetLabel == null) return 0;
  const raw = String(budgetLabel);
  // Strip everything except digits, separators and range dashes
  const numbers = raw
    .replace(/TL|₺|\+/gi, " ")
    .split(/[-–—]/)
    .map((part) => {
      const digits = part.replace(/[^\d]/g, "");
      return digits ? Number(digits) : 0;
    })
    .filter((n) => n > 0);

  if (numbers.length === 0) return 0;
  return Math.max(...numbers);
}

/** Compute the token cost for a listing (by its budget + optional reward factor). */
export async function getBidCostForListing(listing) {
  const tiers = await fetchBidCostTiers();
  const budgetTl = parseBudgetToTl(
    listing?.budget?.label ?? listing?.budget ?? listing?.marketplaceMeta?.budget ?? ""
  );

  let cost = tiers[0]?.cost || 1;
  for (const tier of tiers) {
    const inMin = budgetTl >= tier.min;
    const inMax = tier.max == null || budgetTl < tier.max;
    if (inMin && inMax) {
      cost = tier.cost;
      break;
    }
  }

  // Optional reward factor: listings can carry a rewardFactor (e.g. featured
  // or urgent listings) that multiplies cost. Clamped to keep things sane.
  const rewardFactor = Number(listing?.marketplaceMeta?.rewardFactor || listing?.payload?.rewardFactor || 1);
  if (Number.isFinite(rewardFactor) && rewardFactor > 0) {
    cost = Math.round(cost * Math.min(3, Math.max(0.5, rewardFactor)));
  }

  return Math.max(1, cost);
}

/** Current token status for the signed-in user. Returns null if RPC unavailable. */
export async function getTokenStatus(userId) {
  if (!userId) return null;
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("get_token_status", { p_user_id: userId });
    if (error) {
      console.warn("[yapply] get_token_status error:", error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      balance: row.balance ?? 0,
      freeGrantTokens: row.free_grant_tokens ?? 0,
      lastFreeGrantAt: row.last_free_grant_at || null,
    };
  } catch (e) {
    console.warn("[yapply] getTokenStatus threw:", e?.message);
    return null;
  }
}

/**
 * Spend tokens to place a bid. Returns:
 *  { success, mode: 'tokens', cost, balance }             — token system active
 *  { success, mode: 'legacy', bidsRemaining, bidLimit }   — fell back to bid cycle
 *  { success: false, code: 'INSUFFICIENT_TOKENS', ... }   — needs membership/tokens
 */
export async function spendTokensForBid(userId, listing) {
  const cost = await getBidCostForListing(listing);

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.rpc("spend_tokens_for_bid", {
      p_user_id: userId,
      p_listing_id: String(listing?.id || ""),
      p_cost: cost,
    });

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        if (row.success) {
          return { success: true, mode: "tokens", cost: row.cost ?? cost, balance: row.new_balance ?? 0 };
        }
        return {
          success: false,
          mode: "tokens",
          code: "INSUFFICIENT_TOKENS",
          cost: row.cost ?? cost,
          balance: row.new_balance ?? 0,
        };
      }
    } else {
      console.warn("[yapply] spend_tokens_for_bid error:", error.message);
    }
  } catch (e) {
    console.warn("[yapply] spendTokensForBid threw:", e?.message);
  }

  // ── Legacy fallback: token RPCs not deployed → use the old bid cycle ──
  try {
    const { consumeDeveloperBid } = await import("./supabaseMarketplace.js?v=20260727-rest-first");
    const legacy = await consumeDeveloperBid(userId);
    return {
      success: !!legacy.success,
      mode: "legacy",
      code: legacy.success ? undefined : "BID_LIMIT_REACHED",
      bidsRemaining: legacy.bidsRemaining,
      bidLimit: legacy.bidLimit,
    };
  } catch (e) {
    // If even the legacy path fails, allow the bid rather than block business.
    console.warn("[yapply] legacy bid fallback threw:", e?.message);
    return { success: true, mode: "open", cost: 0 };
  }
}

/** Fetch active membership plans for display. */
export async function fetchMembershipPlans() {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/membership_plans?active=eq.true&select=*&order=sort_order.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (resp.ok) {
      const rows = await resp.json();
      if (Array.isArray(rows)) return rows;
    }
  } catch (_) {}
  return [
    { id: "starter", name: "Starter", price_try: 499, tokens_per_month: 20 },
    { id: "pro", name: "Pro", price_try: 999, tokens_per_month: 50 },
    { id: "elite", name: "Elite", price_try: 1999, tokens_per_month: 120 },
  ];
}

/** Fetch the signed-in user's membership (or null). */
export async function fetchMyMembership(userId) {
  if (!userId) return null;
  const token = _getAccessToken();
  if (!token) return null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/memberships?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (resp.ok) {
      const rows = await resp.json();
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    }
  } catch (_) {}
  return null;
}

/** Start a Stripe Checkout for a plan (web only — native app must use App Store IAP). */
export async function startStripeCheckout(planId, userId, userEmail) {
  const isNative = window.location.origin === "capacitor://localhost" ||
    (window.location.hostname === "localhost" && !window.location.port);
  if (isNative) {
    return { ok: false, code: "NATIVE_USE_IAP", message: "In the iOS app, memberships are purchased through the App Store." };
  }

  try {
    const resp = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, userId, userEmail }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data?.url) {
      window.location.href = data.url;
      return { ok: true };
    }
    return { ok: false, code: data?.code || "CHECKOUT_FAILED", message: data?.message || "Checkout could not be started." };
  } catch (e) {
    return { ok: false, code: "NETWORK", message: e?.message || "Network error" };
  }
}
