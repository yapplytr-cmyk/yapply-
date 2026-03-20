/**
 * emailNotifier.js
 * Fire-and-forget email notification triggers.
 * Calls the /api/notify endpoint after successful Supabase PG writes
 * so transactional emails still get sent via Resend (server-side).
 */

import { getAuthOrigin } from "./auth.js";

function getNotifyUrl() {
  try {
    const origin = getAuthOrigin();
    return `${origin}/api/notify`;
  } catch (_) {
    return "https://yapplytr.com/api/notify";
  }
}

/**
 * Send a fire-and-forget notification request.
 * Never throws — failures are silently logged.
 */
async function _sendNotification(type, payload) {
  try {
    const url = getNotifyUrl();
    console.log(`[yapply] Sending ${type} notification...`);

    // Use fetch with no-cors as fallback; we don't need the response
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });

    if (resp.ok) {
      console.log(`[yapply] ${type} notification sent successfully`);
    } else {
      console.warn(`[yapply] ${type} notification failed:`, resp.status);
    }
  } catch (err) {
    console.warn(`[yapply] ${type} notification error (non-blocking):`, err?.message);
  }
}

// ─── Public API ─────────────────────────────────────────

/**
 * Notify that a new listing was created.
 * @param {object} listing - The normalized listing object from Supabase
 * @param {string} listingType - "client" or "developer"
 */
export function notifyListingCreated(listing, listingType = "client") {
  _sendNotification("listing_created", {
    ...listing,
    listingType,
    type: listingType,
  });
}

/**
 * Notify that a new bid was placed on a listing (email goes to listing owner).
 * @param {object} listing - The listing that received the bid
 * @param {object} bid - The bid that was placed
 */
export function notifyBidReceived(listing, bid) {
  _sendNotification("bid_received", {
    listing: {
      id: listing?.id || "",
      title: listing?.title || "",
      ownerEmail: listing?.ownerEmail || "",
      ownerName: listing?.ownerName || "",
      contact: listing?.contact || {},
      marketplaceMeta: listing?.marketplaceMeta || {},
    },
    bid: {
      id: bid?.id || "",
      developerUserId: bid?.developerUserId || bid?.developerId || "",
      developerName: bid?.developerName || bid?.companyName || "",
      bidAmount: bid?.bidAmount || {},
      estimatedCompletionTimeframe: bid?.estimatedCompletionTimeframe || {},
      proposalMessage: bid?.proposalMessage || "",
      developerProfileReference: bid?.developerProfileReference || {},
    },
  });
}

/**
 * Notify that a bid was accepted (email + push notification go to developer).
 * @param {object} listing - The listing with the accepted bid
 * @param {object} bid - The accepted bid
 */
export function notifyBidAccepted(listing, bid) {
  _sendNotification("bid_accepted", {
    listing: {
      id: listing?.id || "",
      title: listing?.title || "",
      ownerEmail: listing?.ownerEmail || "",
      ownerName: listing?.ownerName || "",
      contact: listing?.contact || {},
      marketplaceMeta: listing?.marketplaceMeta || {},
    },
    bid: {
      id: bid?.id || "",
      developerUserId: bid?.developerUserId || bid?.developerId || "",
      developerEmail: bid?.developerEmail || "",
      developerName: bid?.developerName || bid?.companyName || "",
      bidAmount: bid?.bidAmount || {},
      estimatedCompletionTimeframe: bid?.estimatedCompletionTimeframe || {},
      proposalMessage: bid?.proposalMessage || "",
      developerProfileReference: bid?.developerProfileReference || {},
    },
  });
}

/**
 * Notify that an inquiry was received on a developer listing.
 * @param {object} listing - The developer listing
 * @param {object} inquiry - The inquiry data
 */
export function notifyInquiryReceived(listing, inquiry) {
  _sendNotification("inquiry_received", {
    listing: {
      id: listing?.id || "",
      title: listing?.title || listing?.name || "",
      ownerEmail: listing?.ownerEmail || "",
      ownerName: listing?.ownerName || "",
      contact: listing?.contact || {},
    },
    inquiry,
  });
}
