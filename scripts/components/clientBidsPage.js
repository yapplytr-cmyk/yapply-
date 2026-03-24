import { createButton, createSectionHeading } from "./primitives.js";
import { getMarketplaceListingHref } from "../core/marketplaceStore.js";
import { createDashboardReloadButton } from "./dashboardReloadButton.js";

function getLocale(content) {
  return content.meta?.locale === "tr" ? "tr" : "en";
}

function formatDate(value, locale, fallback) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getListingBids(listing) {
  if (Array.isArray(listing?.bids) && listing.bids.length > 0) return listing.bids;
  if (Array.isArray(listing?.marketplaceMeta?.latestBids) && listing.marketplaceMeta.latestBids.length > 0) {
    return listing.marketplaceMeta.latestBids;
  }
  return [];
}

function isListingClosed(listing) {
  const accepted = listing?.marketplaceMeta?.acceptedBidId || listing?.marketplaceMeta?.acceptedBid;
  const status = listing?.marketplaceMeta?.listingStatus || listing?.status;
  return Boolean(accepted) || status === "closed";
}

function createBidCard(bid, listing, content, locale) {
  const acceptedBidId = listing?.marketplaceMeta?.acceptedBidId || listing?.marketplaceMeta?.acceptedBid?.id || "";
  const isAccepted = Boolean(acceptedBidId && bid.id === acceptedBidId);
  const isClosed = isListingClosed(listing);

  let actionMarkup;
  if (isAccepted) {
    actionMarkup = `
      <span class="client-bids-accept-badge client-bids-accept-badge--accepted">
        <svg class="client-bids-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ${content.acceptedLabel}
      </span>`;
  } else if (isClosed) {
    actionMarkup = `<span class="client-bids-closed-label">${content.closedLabel}</span>`;
  } else {
    actionMarkup = `
      <button class="client-bids-accept-btn" type="button"
              data-client-bids-accept="${bid.id}"
              data-client-bids-listing="${listing.id}">
        <span class="client-bids-accept-btn__label">${content.acceptLabel}</span>
        <span class="client-bids-accept-btn__loader" hidden>
          <svg class="client-bids-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        </span>
        <span class="client-bids-accept-btn__done" hidden>
          <svg class="client-bids-check-anim" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
      </button>`;
  }

  return `
    <div class="client-bids-card panel${isAccepted ? " client-bids-card--accepted" : ""}">
      <div class="client-bids-card__header">
        <div class="client-bids-card__dev">
          <a href="./developer-public-profile.html?dev=${encodeURIComponent(bid.bidderUserId || bid.bidder_user_id || bid.developerProfileReference?.userId || "")}" style="color:inherit;text-decoration:underline;text-underline-offset:2px"><strong>${bid.companyName || bid.developerProfileReference?.companyName || bid.developerName || content.fallback}</strong></a>
        </div>
        <div class="client-bids-card__amount">
          ${bid.bidAmount?.label || content.fallback}
        </div>
      </div>
      <div class="client-bids-card__details" data-client-bids-details="${bid.id}" hidden>
        <div class="client-bids-card__detail-row">
          <span class="client-bids-card__detail-label">${content.columns.timeline}</span>
          <span>${bid.estimatedCompletionTimeframe?.label || bid.timeframe || content.fallback}</span>
        </div>
        <div class="client-bids-card__detail-row">
          <span class="client-bids-card__detail-label">${content.columns.proposal}</span>
          <span>${bid.proposalMessage || bid.proposal || content.fallback}</span>
        </div>
        <div class="client-bids-card__detail-row">
          <span class="client-bids-card__detail-label">${content.columns.date}</span>
          <span>${formatDate(bid.createdAt, locale, content.fallback)}</span>
        </div>
      </div>
      <div class="client-bids-card__footer">
        <button class="client-bids-toggle" type="button" data-client-bids-toggle="${bid.id}">
          <svg class="client-bids-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          <span data-client-bids-toggle-label="${bid.id}">${locale === "tr" ? "Detaylar" : "Details"}</span>
        </button>
        ${actionMarkup}
      </div>
    </div>
  `;
}

function createListingGroup(listing, content, locale) {
  const bids = getListingBids(listing);
  const bidCount = bids.length;
  const detailHref = getMarketplaceListingHref("client", listing.id);

  if (bidCount === 0) return "";

  return `
    <div class="client-bids-group" data-client-bids-group="${listing.id}">
      <button class="client-bids-group__header" type="button" data-client-bids-group-toggle="${listing.id}">
        <div class="client-bids-group__info">
          <h3 class="client-bids-group__title">${listing.title || content.fallback}</h3>
          <span class="client-bids-group__count">${bidCount} ${content.bidCountLabel}</span>
        </div>
        <svg class="client-bids-chevron client-bids-group__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="client-bids-group__body" data-client-bids-group-body="${listing.id}" hidden>
        ${bids.map((bid) => createBidCard(bid, listing, content, locale)).join("")}
        <a class="client-bids-group__listing-link" href="${detailHref}">${locale === "tr" ? "İlanı Görüntüle" : "View Listing"} &rarr;</a>
      </div>
    </div>
  `;
}

function createAccessDenied(content) {
  return `
    <section class="section-shell marketplace-success">
      <div class="project-cta-panel panel marketplace-success-panel">
        <div>
          <p class="eyebrow">${content.accessDenied.eyebrow}</p>
          <h1 class="hero-title marketplace-success__title">${content.accessDenied.title}</h1>
          <p class="hero-lead">${content.accessDenied.description}</p>
        </div>
        <div class="hero-actions">
          ${createButton({ href: "./open-marketplace.html", label: content.accessDenied.backLabel, variant: "primary" })}
        </div>
      </div>
    </section>
  `;
}

export function createClientBidsSkeleton() {
  const item = `<div class="client-bids-group panel" style="opacity:0.5;pointer-events:none;padding:16px;margin-bottom:12px">
    <div style="background:var(--surface-200,#e5e7eb);height:18px;border-radius:4px;width:55%;margin-bottom:10px"></div>
    <div style="background:var(--surface-200,#e5e7eb);height:13px;border-radius:4px;width:30%"></div>
  </div>`;
  return `<section class="section-shell">${Array(3).fill(item).join("")}</section>`;
}

export function createClientBidsPage(content) {
  const session = content.viewerSession || { authenticated: false, user: null };

  if (!session.authenticated || session.user?.role !== "client") {
    return createAccessDenied(content);
  }

  const locale = getLocale(content);
  const listings = content.allListings || [];

  // Split into open (has bids, not accepted) and accepted (has acceptedBidId)
  const openListings = listings.filter((l) => getListingBids(l).length > 0 && !isListingClosed(l));
  const acceptedListings = listings.filter((l) => isListingClosed(l) && getListingBids(l).length > 0);

  const openGroups = openListings.map((listing) => createListingGroup(listing, content, locale)).join("");
  const acceptedGroups = acceptedListings.map((listing) => createListingGroup(listing, content, locale)).join("");

  return `
    <section class="section-shell client-bids-page" id="client-bids-section">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="flex:1">${createSectionHeading(content.heading)}</div>
        ${createDashboardReloadButton()}
      </div>
      ${openGroups || `<div class="marketplace-empty panel"><p>${content.empty}</p></div>`}

      ${acceptedListings.length > 0 ? `
        <div class="client-bids-accepted-section" style="margin-top: 2.5rem;">
          ${createSectionHeading(content.acceptedHeading || { eyebrow: "Accepted", title: "Accepted Bids", description: "" })}
          ${acceptedGroups}
        </div>
      ` : ""}
    </section>
  `;
}
