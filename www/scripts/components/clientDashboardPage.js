import { createButton, createSectionHeading } from "./primitives.js";
import { getMarketplaceListingHref } from "../core/marketplaceStore.js";
import { getUnreadNotifications, markAllRead } from "../core/notifications.js";

function getClientDashboardLocale(content) {
  return content.meta?.locale === "tr" ? "tr" : "en";
}

function getListingPreviewImage(listing) {
  const attachments = Array.isArray(listing.attachments) ? listing.attachments : [];
  return attachments[0]?.dataUrl || "";
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
          return `
            <div class="client-dashboard-bids-table__row">
              <strong>${bid.companyName || bid.developerProfileReference?.companyName || bid.developerName || content.fallback}</strong>
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

function createListingCard(listing, content, kind = "active") {
  const previewImage = getListingPreviewImage(listing);
  const bids = getListingBids(listing);
  const bidCount = Number(listing?.marketplaceMeta?.bidCount || bids.length || 0);
  const statusLabel = getListingStatusLabel(listing, content);
  const detailHref = getMarketplaceListingHref("client", listing.id);
  const actionButtons = [
    createButton({ href: detailHref, label: content.actions.viewListing, variant: "secondary" }),
    kind === "active"
      ? `<button class="button button--secondary" type="button" data-client-dashboard-toggle="edit" data-listing-id="${listing.id}">${content.actions.editListing}</button>`
      : "",
    `<button class="button button--primary" type="button" data-client-dashboard-toggle="bids" data-listing-id="${listing.id}">${content.actions.viewBids}</button>`,
  ]
    .filter(Boolean)
    .join("");

  return `
    <article class="client-dashboard-card panel">
      <div class="client-dashboard-card__summary">
        <a class="client-dashboard-card__media" href="${detailHref}" aria-label="${listing.title}">
          ${
            previewImage
              ? `<img src="${previewImage}" alt="${listing.title}" loading="lazy" decoding="async" fetchpriority="low" />`
              : `<span class="marketplace-card__media-placeholder">${content.mediaFallback}</span>`
          }
        </a>
        <div class="client-dashboard-card__content">
          <div class="client-dashboard-card__top">
            <span class="project-badge">${listing.projectType || content.fallback}</span>
            <span class="marketplace-card__status">${statusLabel}</span>
          </div>
          <h3>${listing.title}</h3>
          <div class="project-detail-card__facts client-dashboard-card__facts">
            <div>
              <span>${content.labels.location}</span>
              <strong>${listing.location || content.fallback}</strong>
            </div>
            <div>
              <span>${content.labels.budget}</span>
              <strong>${listing.budget || content.fallback}</strong>
            </div>
            <div>
              <span>${content.labels.bidCount}</span>
              <strong>${bidCount}</strong>
            </div>
            <div>
              <span>${content.labels.status}</span>
              <strong>${statusLabel}</strong>
            </div>
          </div>
          <div class="hero-actions client-dashboard-card__actions">
            ${actionButtons}
          </div>
        </div>
      </div>
      ${kind === "active" ? createEditPanel(listing, content) : ""}
      ${createBidsPanel(listing, content)}
    </article>
  `;
}

function createListingSection(sectionId, titleContent, listings, content, kind) {
  const cards = listings.map((listing) => createListingCard(listing, content, kind)).join("");

  return `
    <section class="section-shell" id="${sectionId}">
      ${createSectionHeading(titleContent)}
      ${cards || `<div class="marketplace-empty panel"><p>${titleContent.empty}</p></div>`}
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
  const skeletonCard = `<div class="client-dashboard-card panel" style="opacity:0.5;pointer-events:none">
    <div class="client-dashboard-card__summary">
      <div style="background:var(--surface-200,#e5e7eb);height:140px;border-radius:8px;flex-shrink:0;width:120px"></div>
      <div class="client-dashboard-card__content" style="flex:1;padding:12px">
        <div style="background:var(--surface-200,#e5e7eb);height:16px;border-radius:4px;width:60%;margin-bottom:10px"></div>
        <div style="background:var(--surface-200,#e5e7eb);height:12px;border-radius:4px;width:80%;margin-bottom:8px"></div>
        <div style="background:var(--surface-200,#e5e7eb);height:12px;border-radius:4px;width:40%"></div>
      </div>
    </div>
  </div>`;
  return `
    <section class="section-shell">${Array(3).fill(skeletonCard).join("")}</section>
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
    ${createListingSection("client-dashboard-active", content.activeSection, content.activeListings, content, "active")}
    ${createListingSection("client-dashboard-closed", content.closedSection, content.closedListings, content, "closed")}
  `;
}
