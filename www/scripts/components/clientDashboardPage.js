import { createButton, createSectionHeading } from "./primitives.js";
import { getMarketplaceListingHref } from "../core/marketplaceStore.js";
import { getUnreadNotifications, markAllRead } from "../core/notifications.js";
import { createDashboardReloadButton } from "./dashboardReloadButton.js";

function getClientDashboardLocale(content) {
  return content.meta?.locale === "tr" ? "tr" : "en";
}

function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url === "[base64-stripped]") return false;
  if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("/")) return true;
  return false;
}

function getListingPreviewImage(listing) {
  const attachments = Array.isArray(listing.attachments) ? listing.attachments : [];
  const dataUrl = attachments[0]?.dataUrl;
  if (isValidImageUrl(dataUrl)) return dataUrl;
  if (isValidImageUrl(listing.imageSrc)) return listing.imageSrc;
  return "";
}

function getListingBids(listing) {
  if (Array.isArray(listing?.bids) && listing.bids.length > 0) {
    return listing.bids;
  }

  if (Array.isArray(listing?.marketplaceMeta?.latestBids) && listing.marketplaceMeta.latestBids.length > 0) {
    return listing.marketplaceMeta.latestBids;
  }

  return [];
}

function getListingStatusLabel(listing, copy) {
  if (listing?.marketplaceMeta?.acceptedBidId || listing?.marketplaceMeta?.acceptedBid) {
    return copy.status.accepted;
  }

  if ((listing?.marketplaceMeta?.listingStatus || listing?.status) === "closed") {
    return copy.status.closed;
  }

  return copy.status.open;
}

function formatDashboardDate(value, locale, fallback) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function createImageManager(listing, copy) {
  const imageAttachments = (Array.isArray(listing.attachments) ? listing.attachments : []).filter((item) => item?.kind === "image");

  if (imageAttachments.length === 0) {
    return `<p class="client-dashboard-edit__hint">${copy.images.empty}</p>`;
  }

  return `
    <div class="client-dashboard-image-list">
      ${imageAttachments
        .map(
          (item) => `
            <label class="client-dashboard-image-item panel">
              <img src="${item.dataUrl}" alt="${item.name}" loading="lazy" decoding="async" fetchpriority="low" />
              <span>${item.name}</span>
              <span class="client-dashboard-image-item__remove">
                <input type="checkbox" name="removeAttachmentIds" value="${item.id}" />
                ${copy.images.remove}
              </span>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function createEditPanel(listing, content) {
  const copy = content.editPanel;

  return `
    <section class="client-dashboard-card__panel panel" data-client-dashboard-panel="edit" data-listing-id="${listing.id}" hidden>
      ${createSectionHeading(copy.heading)}
      <form class="application-form client-dashboard-edit-form" data-client-dashboard-edit-form novalidate>
        <input type="hidden" name="listingId" value="${listing.id}" />
        <div class="auth-form-error form-field--full" data-client-dashboard-error hidden style="display: none;">
          <strong data-client-dashboard-error-title>${copy.errorTitle}</strong>
          <p data-client-dashboard-error-text>${copy.errorFallback}</p>
        </div>
        <div class="form-success form-field--full" data-client-dashboard-success hidden style="display: none;">
          <h3>${copy.successTitle}</h3>
          <p>${copy.successText}</p>
        </div>
        <label class="form-field form-field--full">
          <span>${copy.fields.title}</span>
          <input type="text" name="title" value="${listing.title || ""}" required />
        </label>
        <label class="form-field form-field--full">
          <span>${copy.fields.brief}</span>
          <textarea name="brief" rows="5" required>${listing.brief || ""}</textarea>
        </label>
        <label class="form-field">
          <span>${copy.fields.category}</span>
          <input type="text" name="projectType" value="${listing.projectType || ""}" required />
        </label>
        <label class="form-field">
          <span>${copy.fields.budget}</span>
          <input type="text" name="budget" value="${listing.budget || ""}" />
        </label>
        <label class="form-field">
          <span>${copy.fields.timeline}</span>
          <input type="text" name="timeline" value="${listing.timeline || listing.startDate || ""}" />
        </label>
        <label class="form-field">
          <span>${copy.fields.projectStatus}</span>
          <input type="text" name="projectStatus" value="${listing.plotStatus || ""}" required />
        </label>
        <div class="form-field form-field--full">
          <span>${copy.fields.currentImages}</span>
          ${createImageManager(listing, copy)}
        </div>
        <label class="form-field form-field--full">
          <span>${copy.fields.uploadImages}</span>
          <input type="file" name="newImages" accept="image/*" multiple />
          <small>${copy.uploadHint}</small>
        </label>
        <div class="form-actions form-field--full client-dashboard-card__panel-actions">
          <button class="button button--primary" type="submit">${copy.saveLabel}</button>
          <button class="button button--secondary" type="submit" name="dashboardAction" value="close">${copy.closeLabel}</button>
        </div>
      </form>
    </section>
  `;
}

function createBidRows(listing, content, locale) {
  const bids = getListingBids(listing);
  const acceptedBidId = listing?.marketplaceMeta?.acceptedBidId || listing?.marketplaceMeta?.acceptedBid?.id || "";

  if (bids.length === 0) {
    return `<div class="marketplace-empty panel"><p>${content.bidsPanel.empty}</p></div>`;
  }

  return `
    <div class="client-dashboard-bids-table panel">
      <div class="client-dashboard-bids-table__head">
        <span>${content.bidsPanel.columns.developer}</span>
        <span>${content.bidsPanel.columns.amount}</span>
        <span>${content.bidsPanel.columns.timeline}</span>
        <span>${content.bidsPanel.columns.proposal}</span>
        <span>${content.bidsPanel.columns.date}</span>
        <span>${content.bidsPanel.columns.actions}</span>
      </div>
      ${bids
        .map((bid) => {
          const isAccepted = Boolean(acceptedBidId && bid.id === acceptedBidId);
          const actionsMarkup = isAccepted
            ? `<span class="project-badge project-badge--accepted">${content.bidsPanel.acceptedLabel}</span>`
            : acceptedBidId || (listing.marketplaceMeta?.listingStatus || listing.status) === "closed"
              ? `<span class="client-dashboard-bids-table__muted">${content.bidsPanel.closedLabel}</span>`
              : `<button class="button button--secondary client-dashboard-bids-table__accept" type="button" data-client-dashboard-accept-bid="${bid.id}" data-listing-id="${listing.id}">${content.bidsPanel.acceptLabel}</button>`;
          const bidDevUserId = bid.bidderUserId || bid.bidder_user_id || bid.developerProfileReference?.userId || "";
          return `
            <div class="client-dashboard-bids-table__row">
              <a href="./developer-public-profile.html?dev=${encodeURIComponent(bidDevUserId)}" style="color:inherit;text-decoration:underline;text-underline-offset:2px"><strong>${bid.companyName || bid.developerProfileReference?.companyName || bid.developerName || content.fallback}</strong></a>
              <span>${bid.bidAmount?.label || content.fallback}</span>
              <span>${bid.estimatedCompletionTimeframe?.label || bid.timeframe || content.fallback}</span>
              <span>${bid.proposalMessage || bid.proposal || content.fallback}</span>
              <span>${formatDashboardDate(bid.createdAt, locale, content.fallback)}</span>
              <span>${actionsMarkup}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function createBidsPanel(listing, content) {
  const locale = getClientDashboardLocale(content);

  return `
    <section class="client-dashboard-card__panel panel" data-client-dashboard-panel="bids" data-listing-id="${listing.id}" hidden>
      ${createSectionHeading(content.bidsPanel.heading)}
      ${createBidRows(listing, content, locale)}
    </section>
  `;
}

function createInlineReviewPanel(listing, content, acceptedDevUserId, acceptedBidId) {
  const labels = content.reviewForm || {};
  return `
    <section class="client-dashboard-card__panel panel" data-client-dashboard-panel="review" data-listing-id="${listing.id}" hidden style="padding:1rem">
      <h4 style="margin:0 0 0.75rem;font-size:1rem">${labels.title || "Rate this Developer"}</h4>
      <form data-inline-review-form data-review-dev="${acceptedDevUserId}" data-review-listing="${listing.id}" data-review-bid="${acceptedBidId}">
        <div class="inline-star-input-group" data-star-input-group>
          <label class="form-field__label" style="display:block;margin-bottom:0.35rem;font-size:0.85rem;color:var(--text-muted)">${labels.ratingLabel || "Your Rating"}</label>
          <div style="display:flex;gap:4px;align-items:center">
            ${[1, 2, 3, 4, 5]
              .map(
                (n) => `<button type="button" class="dev-profile-star-input" data-star-value="${n}" aria-label="${n} star${n > 1 ? "s" : ""}" style="background:none;border:none;padding:2px;cursor:pointer">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-300, #9ca3af)" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
                </button>`
              )
              .join("")}
            <input type="hidden" name="rating" value="0" data-star-rating-value />
          </div>
        </div>
        <label class="form-field" style="display:block;margin-top:0.75rem">
          <span style="font-size:0.85rem;color:var(--text-muted)">${labels.commentLabel || "Comment (optional)"}</span>
          <textarea name="comment" rows="3" placeholder="${labels.commentPlaceholder || ""}" style="width:100%;resize:vertical;margin-top:0.25rem;padding:0.5rem;border-radius:8px;border:1px solid var(--border-200, #333);background:var(--surface-100, #1a1a1a);color:var(--text-100, #fff);font-size:0.9rem"></textarea>
        </label>
        <div style="margin-top:0.75rem">
          <label style="display:block;font-size:0.85rem;color:var(--text-muted);margin-bottom:0.35rem">${labels.photosLabel || "Add photos of the work (max 2)"}</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="file" name="review-photos" accept="image/*" multiple data-review-photo-input style="font-size:0.85rem;max-width:240px" />
            <div data-review-photo-preview style="display:flex;gap:6px"></div>
          </div>
        </div>
        <div data-inline-review-feedback hidden style="padding:0.4rem 0;font-size:0.85rem"></div>
        <div style="margin-top:0.75rem">
          <button class="button button--primary" type="submit" style="font-size:0.9rem">${labels.submitLabel || "Submit Review"}</button>
        </div>
      </form>
    </section>
  `;
}

function createListingCard(listing, content, kind = "active") {
  const previewImage = getListingPreviewImage(listing);
  const bids = getListingBids(listing);
  const bidCount = Number(listing?.marketplaceMeta?.bidCount || bids.length || 0);
  const statusLabel = getListingStatusLabel(listing, content);
  const detailHref = getMarketplaceListingHref("client", listing.id);
  const locale = getClientDashboardLocale(content);
  const bidLabel = locale === "tr" ? `${bidCount} teklif` : `${bidCount} bid${bidCount !== 1 ? "s" : ""}`;

  // For closed listings with accepted bid — show developer profile link & review button
  const acceptedBidId = listing?.marketplaceMeta?.acceptedBidId || listing?.marketplaceMeta?.acceptedBid?.id || "";
  const acceptedBid = bids.find((b) => b.id === acceptedBidId);
  const acceptedDevUserId = acceptedBid?.bidderUserId || acceptedBid?.bidder_user_id || acceptedBid?.developerProfileReference?.userId || "";
  const acceptedDevName = acceptedBid?.companyName || acceptedBid?.developerProfileReference?.companyName || acceptedBid?.developerName || "";
  const alreadyReviewed = Boolean(listing._hasReview);

  const actionButtons = [
    createButton({ href: detailHref, label: content.actions.viewListing, variant: "secondary" }),
    kind === "active"
      ? `<button class="button button--secondary" type="button" data-client-dashboard-toggle="edit" data-listing-id="${listing.id}">${content.actions.editListing}</button>`
      : "",
    `<button class="button button--primary" type="button" data-client-dashboard-toggle="bids" data-listing-id="${listing.id}">${content.actions.viewBids}</button>`,
    kind === "active"
      ? `<button class="button button--danger" type="button" data-client-dashboard-close="${listing.id}">${content.actions.closeListing}</button>`
      : "",
    kind === "closed" && acceptedDevUserId
      ? `<a class="button button--secondary" href="./developer-public-profile.html?dev=${encodeURIComponent(acceptedDevUserId)}">${content.actions.viewProfile}</a>`
      : "",
    kind === "closed" && acceptedDevUserId && !alreadyReviewed
      ? `<button class="button button--primary" type="button" data-client-dashboard-toggle="review" data-listing-id="${listing.id}">${content.actions.leaveReview}</button>`
      : "",
    kind === "closed"
      ? `<button class="button button--danger" type="button" data-client-dashboard-delete="${listing.id}">${content.actions.deleteListing || "Delete"}</button>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `
    <article class="marketplace-card panel${kind === "closed" ? " marketplace-card--closed" : ""}" data-listing-id="${listing.id}">
      <a class="marketplace-card__media marketplace-card__media--client" href="${detailHref}" aria-label="${listing.title}">
        ${
          previewImage
            ? `<img src="${previewImage}" alt="${listing.title}" loading="lazy" decoding="async" fetchpriority="low" />`
            : `<span class="marketplace-card__media-placeholder">${content.mediaFallback}</span>`
        }
      </a>
      <div class="marketplace-card__top">
        <span class="project-badge">${listing.projectType || content.fallback}</span>
        <span class="marketplace-card__status">${statusLabel}</span>
        <span class="marketplace-card__location">${listing.location || content.fallback}</span>
      </div>
      <div class="marketplace-card__title-row">
        <h3>${listing.title}</h3>
      </div>
      <div class="marketplace-card__facts">
        <div>
          <span>${content.labels.location}</span>
          <strong>${listing.location || content.fallback}</strong>
        </div>
        <div>
          <span>${content.labels.budget}</span>
          <strong>${listing.budget || content.fallback}</strong>
        </div>
        <div>
          <span>${content.labels.status}</span>
          <strong>${statusLabel}</strong>
        </div>
      </div>
      ${bidCount > 0 ? `<div class="marketplace-card__bid-deadline"><span class="marketplace-card__bid-count">${bidLabel}</span></div>` : ""}
      ${kind === "closed" ? `<button class="client-dashboard-card__delete-compact" type="button" data-client-dashboard-delete="${listing.id}" aria-label="${content.actions.deleteListing || "Delete"}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>` : ""}
      <div class="marketplace-card__footer">
        <div class="marketplace-card__timeline">
          <span>${content.labels.bidCount}</span>
          <strong>${bidCount}</strong>
        </div>
      </div>
      <div class="hero-actions client-dashboard-card__actions" style="padding:0 0 0.4rem;gap:0.5rem;display:flex;flex-wrap:wrap">
        ${actionButtons}
      </div>
      ${kind === "active" ? createEditPanel(listing, content) : ""}
      ${createBidsPanel(listing, content)}
      ${kind === "closed" && acceptedDevUserId && !alreadyReviewed ? createInlineReviewPanel(listing, content, acceptedDevUserId, acceptedBidId) : ""}
    </article>
  `;
}

function createListingSection(sectionId, titleContent, listings, content, kind) {
  const cards = listings.map((listing) => createListingCard(listing, content, kind)).join("");

  return `
    <section class="section-shell" id="${sectionId}">
      ${createSectionHeading(titleContent)}
      ${cards ? `<div class="marketplace-grid">${cards}</div>` : `<div class="marketplace-empty panel"><p>${titleContent.empty}</p></div>`}
    </section>
  `;
}

function createListingSectionWithReload(sectionId, titleContent, listings, content, kind) {
  const cards = listings.map((listing) => createListingCard(listing, content, kind)).join("");

  return `
    <section class="section-shell" id="${sectionId}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="flex:1">${createSectionHeading(titleContent)}</div>
        ${createDashboardReloadButton()}
      </div>
      ${cards ? `<div class="marketplace-grid">${cards}</div>` : `<div class="marketplace-empty panel"><p>${titleContent.empty}</p></div>`}
    </section>
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

export function createClientDashboardSkeleton() {
  const skeletonCard = `<div class="marketplace-card panel" style="opacity:0.5;pointer-events:none">
    <div style="background:var(--surface-200,#e5e7eb);aspect-ratio:16/10;border-radius:12px;width:100%"></div>
    <div style="padding:0.6rem 0">
      <div style="background:var(--surface-200,#e5e7eb);height:16px;border-radius:4px;width:60%;margin-bottom:10px"></div>
      <div style="background:var(--surface-200,#e5e7eb);height:12px;border-radius:4px;width:80%;margin-bottom:8px"></div>
      <div style="background:var(--surface-200,#e5e7eb);height:12px;border-radius:4px;width:40%"></div>
    </div>
  </div>`;
  return `
    <section class="section-shell"><div class="marketplace-grid">${Array(3).fill(skeletonCard).join("")}</div></section>
  `;
}

export function createClientDashboardPage(content) {
  const session = content.viewerSession || { authenticated: false, user: null };

  if (!session.authenticated || session.user?.role !== "client") {
    return createAccessDenied(content);
  }

  const notifications = getUnreadNotifications(session.user.id).filter((n) => n.type === "new-bid");
  const notificationBanner = notifications.length > 0
    ? `<div class="dashboard-notification-banner" data-dashboard-notifications>
        ${notifications.map((n) => `<a class="dashboard-notification-item" href="${n.href || "#"}">${n.message}</a>`).join("")}
      </div>`
    : "";

  if (notifications.length > 0) {
    markAllRead(session.user.id);
  }

  return `
    ${notificationBanner}
    ${createListingSectionWithReload("client-dashboard-active", content.activeSection, content.activeListings, content, "active")}
    ${createListingSection("client-dashboard-closed", content.closedSection, content.closedListings, content, "closed")}
  `;
}
