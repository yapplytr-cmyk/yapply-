import { createButton, createSectionHeading } from "./primitives.js";
import { getMarketplaceListingHref } from "../core/marketplaceStore.js";
import { getUnreadNotifications, markAllRead } from "../core/notifications.js";
import { createDashboardReloadButton } from "./dashboardReloadButton.js";

function getDeveloperDashboardLocale(content) {
  return content.meta?.locale === "tr" ? "tr" : "en";
}

function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url === "[base64-stripped]") return false;
  if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("/")) return true;
  return false;
}

function getListingPreviewImage(listing) {
  if (Array.isArray(listing?.images) && isValidImageUrl(listing.images[0]?.src)) {
    return listing.images[0].src;
  }
  const attachments = Array.isArray(listing.attachments) ? listing.attachments : [];
  const imgAtt = attachments.find((item) => item?.kind === "image");
  if (isValidImageUrl(imgAtt?.dataUrl)) return imgAtt.dataUrl;
  if (isValidImageUrl(listing.imageSrc)) return listing.imageSrc;
  return "";
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

function getDeveloperListingStatusLabel(listing, content) {
  const rawStatus = String(listing?.marketplaceMeta?.listingStatus || listing?.status || "").trim().toLowerCase();

  if (rawStatus === "active" || rawStatus === "live" || rawStatus === "open-for-bids") {
    return content.status.active;
  }

  if (rawStatus === "draft") {
    return content.status.draft;
  }

  if (rawStatus === "hidden") {
    return content.status.hidden;
  }

  return content.status.active;
}

function getBidStatusLabel(bid, content) {
  const rawStatus = String(bid?.status || "").trim().toLowerCase();

  if (rawStatus === "accepted") {
    return content.bidStatus.accepted;
  }

  if (rawStatus === "rejected") {
    return content.bidStatus.rejected;
  }

  if (rawStatus === "withdrawn") {
    return content.bidStatus.withdrawn;
  }

  return content.bidStatus.submitted;
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

function createStarDisplay(rating, size = 18) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  const uid = `sg${Math.random().toString(36).slice(2, 8)}`;

  const gradDef = `<defs><linearGradient id="${uid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs>`;
  const starPath = `M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z`;

  const starFull = `<svg class="yapply-star yapply-star--full" width="${size}" height="${size}" viewBox="0 0 24 24">${gradDef}<path d="${starPath}" fill="url(#${uid})" stroke="#b45309" stroke-width="0.6"/></svg>`;
  const halfId = `${uid}h`;
  const starHalf = `<svg class="yapply-star yapply-star--half" width="${size}" height="${size}" viewBox="0 0 24 24">${gradDef}<defs><clipPath id="${halfId}"><rect x="0" y="0" width="12" height="24"/></clipPath></defs><path d="${starPath}" fill="none" stroke="#b45309" stroke-width="0.6"/><path d="${starPath}" fill="url(#${uid})" clip-path="url(#${halfId})"/></svg>`;
  const starEmpty = `<svg class="yapply-star yapply-star--empty" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${starPath}" fill="none" stroke="var(--text-300, #9ca3af)" stroke-width="1.2"/></svg>`;

  return `<span class="yapply-stars" style="display:inline-flex;align-items:center;gap:2px">${starFull.repeat(full)}${hasHalf ? starHalf : ""}${starEmpty.repeat(empty)}</span>`;
}

function createDeveloperOverviewSection(content, session, listingCount, bidCount, wonBidCount, ratingAverage, ratingCount) {
  const locale = getDeveloperDashboardLocale(content);
  const user = session.user || {};
  const profileName = user.companyName || user.username || user.fullName || user.email || content.fallback;
  const workDescription = user.workDescription || content.profileOverview.emptyDescription;
  const specialties = user.specialties || content.fallback;
  const serviceArea = user.serviceArea || content.fallback;
  const professionType = user.professionType || content.fallback;
  const avatar = user.profilePictureSrc || "";

  const wonBidsLabel = locale === "tr" ? "Kazanilan" : "Won Bids";
  const avgRatingLabel = locale === "tr" ? "Puan" : "Rating";
  const reviewCountLabel = locale === "tr" ? "Degerlendirme" : "Reviews";
  const noReviewsLabel = locale === "tr" ? "Henuz yok" : "None yet";

  return `
    <section class="section-shell" id="developer-dashboard-overview">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="flex:1">${createSectionHeading(content.profileOverview.heading)}</div>
        ${createDashboardReloadButton()}
      </div>
      <div class="developer-dashboard-overview">
        <article class="panel developer-dashboard-profile">
          <div class="developer-dashboard-profile__header">
            <div class="account-settings-avatar developer-dashboard-profile__avatar">
              <img src="${avatar}" alt="${profileName}" loading="lazy" decoding="async" fetchpriority="low" />
            </div>
            <div class="developer-dashboard-profile__copy">
              <p class="eyebrow">${content.profileOverview.eyebrow}</p>
              <h3>${profileName}</h3>
              <p>${workDescription}</p>
              <div style="margin-top:0.5rem">
                ${createButton({ href: "./developer-public-profile.html", label: locale === "tr" ? "Profilim" : "My Profile", variant: "primary" })}
              </div>
            </div>
          </div>
          <div class="project-detail-card__facts developer-dashboard-profile__facts">
            <div>
              <span>${content.profileOverview.labels.profileType}</span>
              <strong>${content.profileOverview.profileType}</strong>
            </div>
            <div>
              <span>${content.profileOverview.labels.professionType}</span>
              <strong>${professionType}</strong>
            </div>
            <div>
              <span>${content.profileOverview.labels.specialties}</span>
              <strong>${specialties}</strong>
            </div>
            <div>
              <span>${content.profileOverview.labels.serviceArea}</span>
              <strong>${serviceArea}</strong>
            </div>
            <div>
              <span>${content.profileOverview.labels.listingCount}</span>
              <strong>${listingCount}</strong>
            </div>
            <div>
              <span>${content.profileOverview.labels.bidCount}</span>
              <strong>${bidCount}</strong>
            </div>
            <div>
              <span>${wonBidsLabel}</span>
              <strong>${wonBidCount}</strong>
            </div>
            <div>
              <span>${avgRatingLabel}</span>
              <strong style="display:flex;align-items:center;gap:6px">
                ${ratingCount > 0 ? `${createStarDisplay(ratingAverage)} ${ratingAverage.toFixed(1)}` : noReviewsLabel}
              </strong>
            </div>
            <div>
              <span>${reviewCountLabel}</span>
              <strong>${ratingCount}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  `;
}

function createBidCard(bid, content) {
  const locale = getDeveloperDashboardLocale(content);
  const listingHref = getMarketplaceListingHref("client", bid.listing?.id || bid.listingId || "");
  const listingTitle = bid.listing?.title || content.fallback;
  const dateLabel = formatDashboardDate(bid.createdAt, locale, content.fallback);

  return `
    <article class="detail-list-card marketplace-bid-accordion panel" data-bid-item>
      <button class="marketplace-bid-row" type="button" data-bid-trigger aria-expanded="false">
        <span class="marketplace-bid-row__amount"><strong>${bid.bidAmount?.label || content.fallback}</strong> — ${listingTitle}</span>
        <span class="dev-bid-row__status">${getBidStatusLabel(bid, content)}</span>
        <span class="marketplace-bid-row__chevron" aria-hidden="true"></span>
      </button>
      <div class="marketplace-bid-detail" data-bid-panel hidden>
        <div class="project-detail-card__facts developer-dashboard-bid-card__facts">
          <div>
            <span>${content.bidLabels.amount}</span>
            <strong>${bid.bidAmount?.label || content.fallback}</strong>
          </div>
          <div>
            <span>${content.bidLabels.timeline}</span>
            <strong>${bid.estimatedCompletionTimeframe?.label || bid.timeframe || content.fallback}</strong>
          </div>
          <div>
            <span>${content.bidLabels.date}</span>
            <strong>${dateLabel}</strong>
          </div>
          <div>
            <span>${content.bidLabels.location}</span>
            <strong>${bid.listing?.location || content.fallback}</strong>
          </div>
        </div>
        <p class="developer-dashboard-bid-card__proposal">${bid.proposalMessage || bid.proposal || content.fallback}</p>
        <div class="hero-actions developer-dashboard-bid-card__actions">
          ${createButton({ href: listingHref, label: content.actions.viewRelatedListing, variant: "primary" })}
        </div>
      </div>
    </article>
  `;
}

function createWonBidCard(bid, content) {
  const locale = getDeveloperDashboardLocale(content);
  const listingHref = getMarketplaceListingHref("client", bid.listing?.id || bid.listingId || "");
  const contact = bid.clientContact || {};
  const clientName = contact.name || content.fallback;
  const clientEmail = contact.email || content.fallback;
  const clientPhone = contact.phone || content.fallback;
  const wonLabel = locale === "tr" ? "Kazanılan Teklif" : "Won Bid";
  const dateLabel = formatDashboardDate(bid.createdAt, locale, content.fallback);

  return `
    <article class="detail-list-card marketplace-bid-accordion panel" data-bid-item>
      <button class="marketplace-bid-row" type="button" data-bid-trigger aria-expanded="false">
        <span class="marketplace-bid-row__amount"><strong>${bid.bidAmount?.label || content.fallback}</strong> — ${bid.listing?.title || content.fallback}</span>
        <span class="dev-bid-row__status dev-bid-row__status--won">${wonLabel}</span>
        <span class="marketplace-bid-row__chevron" aria-hidden="true"></span>
      </button>
      <div class="marketplace-bid-detail" data-bid-panel hidden>
        <div class="project-detail-card__facts developer-dashboard-bid-card__facts">
          <div>
            <span>${locale === "tr" ? "Müşteri" : "Client"}</span>
            <strong>${clientName}</strong>
          </div>
          <div>
            <span>${locale === "tr" ? "E-posta" : "Email"}</span>
            <strong>${clientEmail}</strong>
          </div>
          <div>
            <span>${locale === "tr" ? "Telefon" : "Phone"}</span>
            <strong>${clientPhone}</strong>
          </div>
          <div>
            <span>${content.bidLabels.amount}</span>
            <strong>${bid.bidAmount?.label || content.fallback}</strong>
          </div>
          <div>
            <span>${content.bidLabels.timeline}</span>
            <strong>${bid.estimatedCompletionTimeframe?.label || bid.timeframe || content.fallback}</strong>
          </div>
          <div>
            <span>${content.bidLabels.date}</span>
            <strong>${dateLabel}</strong>
          </div>
          <div>
            <span>${content.bidLabels.location}</span>
            <strong>${bid.listing?.location || content.fallback}</strong>
          </div>
        </div>
        <p class="developer-dashboard-bid-card__proposal">${bid.proposalMessage || bid.proposal || content.fallback}</p>
        <div class="hero-actions developer-dashboard-bid-card__actions">
          ${createButton({ href: listingHref, label: content.actions.viewRelatedListing, variant: "primary" })}
        </div>
      </div>
    </article>
  `;
}

function createWonBidsSection(content, wonBids) {
  const locale = getDeveloperDashboardLocale(content);
  const heading = locale === "tr" ? "Kazanılan Teklifler" : "Won Bids";
  const emptyText = locale === "tr" ? "Henüz kazanılan teklif yok." : "No won bids yet.";

  return `
    <section class="section-shell" id="developer-dashboard-won-bids">
      ${createSectionHeading({ eyebrow: locale === "tr" ? "Profesyonel Paneli" : "Professional Panel", title: heading, description: locale === "tr" ? "Kabul edilen teklifleriniz" : "Your accepted bids" })}
      ${
        wonBids.length
          ? `<div class="developer-dashboard-bids-list">${wonBids.map((bid) => createWonBidCard(bid, content)).join("")}</div>`
          : `<div class="marketplace-empty panel"><p>${emptyText}</p></div>`
      }
    </section>
  `;
}

function createBidsSection(content, bids) {
  return `
    <section class="section-shell" id="developer-dashboard-bids">
      ${createSectionHeading(content.bidsSection)}
      ${
        bids.length
          ? `<div class="developer-dashboard-bids-list">${bids.map((bid) => createBidCard(bid, content)).join("")}</div>`
          : `<div class="marketplace-empty panel"><p>${content.bidsSection.empty}</p></div>`
      }
    </section>
  `;
}

function createEditPanel(listing, content) {
  const copy = content.editPanel;
  const specialties = Array.isArray(listing.services) ? listing.services.join(", ") : "";

  return `
    <section class="client-dashboard-card__panel panel" data-developer-dashboard-panel="edit" data-listing-id="${listing.id}" hidden>
      ${createSectionHeading(copy.heading)}
      <form class="application-form developer-dashboard-edit-form" data-developer-dashboard-edit-form novalidate>
        <input type="hidden" name="listingId" value="${listing.id}" />
        <div class="auth-form-error form-field--full" data-developer-dashboard-error hidden style="display: none;">
          <strong data-developer-dashboard-error-title>${copy.errorTitle}</strong>
          <p data-developer-dashboard-error-text>${copy.errorFallback}</p>
        </div>
        <div class="form-success form-field--full" data-developer-dashboard-success hidden style="display: none;">
          <h3>${copy.successTitle}</h3>
          <p>${copy.successText}</p>
        </div>
        <label class="form-field form-field--full">
          <span>${copy.fields.title}</span>
          <input type="text" name="title" value="${listing.name || listing.title || ""}" required />
        </label>
        <label class="form-field">
          <span>${copy.fields.category}</span>
          <input type="text" name="category" value="${listing.specialty || ""}" required />
        </label>
        <label class="form-field">
          <span>${copy.fields.serviceArea}</span>
          <input type="text" name="serviceArea" value="${listing.location || ""}" required />
        </label>
        <label class="form-field">
          <span>${copy.fields.pricing}</span>
          <input type="text" name="pricing" value="${listing.startingPrice || ""}" />
        </label>
        <label class="form-field form-field--full">
          <span>${copy.fields.specialties}</span>
          <input type="text" name="specialties" value="${specialties}" />
        </label>
        <label class="form-field form-field--full">
          <span>${copy.fields.description}</span>
          <textarea name="description" rows="5" required>${listing.summary || listing.portfolioSummary || ""}</textarea>
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
        </div>
      </form>
    </section>
  `;
}

function createListingCard(listing, content) {
  const previewImage = getListingPreviewImage(listing);
  const detailHref = getMarketplaceListingHref("professional", listing.id);
  const statusLabel = getDeveloperListingStatusLabel(listing, content);
  const listingTitle = listing.name || listing.title || content.fallback;

  return `
    <article class="marketplace-card panel" data-listing-id="${listing.id}">
      <a class="marketplace-card__media marketplace-card__media--client" href="${detailHref}" aria-label="${listingTitle}">
        ${
          previewImage
            ? `<img src="${previewImage}" alt="${listingTitle}" loading="lazy" decoding="async" fetchpriority="low" />`
            : `<span class="marketplace-card__media-placeholder">${content.mediaFallback}</span>`
        }
      </a>
      <div class="marketplace-card__top">
        <span class="project-badge">${listing.specialty || content.fallback}</span>
        <span class="marketplace-card__status">${statusLabel}</span>
        <span class="marketplace-card__location">${listing.location || content.fallback}</span>
      </div>
      <div class="marketplace-card__title-row">
        <h3>${listingTitle}</h3>
      </div>
      <div class="marketplace-card__facts">
        <div>
          <span>${content.labels.location}</span>
          <strong>${listing.location || content.fallback}</strong>
        </div>
        <div>
          <span>${content.labels.category}</span>
          <strong>${listing.specialty || content.fallback}</strong>
        </div>
        <div>
          <span>${content.labels.pricing}</span>
          <strong>${listing.startingPrice || content.fallback}</strong>
        </div>
      </div>
      <div class="marketplace-card__footer">
        <div class="marketplace-card__timeline">
          <span>${content.labels.status}</span>
          <strong>${statusLabel}</strong>
        </div>
      </div>
      <div class="hero-actions client-dashboard-card__actions" style="padding:0 0 0.4rem;gap:0.5rem;display:flex;flex-wrap:wrap">
        ${createButton({ href: detailHref, label: content.actions.viewListing, variant: "secondary" })}
        <button class="button button--secondary" type="button" data-developer-dashboard-toggle="edit" data-listing-id="${listing.id}">${content.actions.editListing}</button>
      </div>
      ${createEditPanel(listing, content)}
    </article>
  `;
}

function createListingsSection(content, listings) {
  const cards = listings.map((listing) => createListingCard(listing, content)).join("");
  return `
    <section class="section-shell" id="developer-dashboard-listings">
      ${createSectionHeading(content.listingsSection)}
      ${
        listings.length
          ? `<div class="marketplace-grid">${cards}</div>`
          : `<div class="marketplace-empty panel"><p>${content.listingsSection.empty}</p></div>`
      }
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
          ${createButton({ href: "./open-marketplace.html?tab=developer", label: content.accessDenied.backLabel, variant: "primary" })}
        </div>
      </div>
    </section>
  `;
}

export function createDeveloperDashboardSkeleton() {
  const skeletonCard = `<div class="marketplace-card panel" style="opacity:0.5;pointer-events:none">
    <div style="background:var(--surface-200,#e5e7eb);aspect-ratio:16/10;border-radius:12px;width:100%"></div>
    <div style="padding:0.6rem 0">
      <div style="background:var(--surface-200,#e5e7eb);height:16px;border-radius:4px;width:60%;margin-bottom:10px"></div>
      <div style="background:var(--surface-200,#e5e7eb);height:12px;border-radius:4px;width:80%;margin-bottom:8px"></div>
      <div style="background:var(--surface-200,#e5e7eb);height:12px;border-radius:4px;width:40%"></div>
    </div>
  </div>`;
  const skeletonBid = `<div class="detail-list-card panel" style="opacity:0.5;pointer-events:none;padding:16px">
    <div style="background:var(--surface-200,#e5e7eb);height:14px;border-radius:4px;width:70%;margin-bottom:8px"></div>
    <div style="background:var(--surface-200,#e5e7eb);height:12px;border-radius:4px;width:50%"></div>
  </div>`;
  return `
    <section class="section-shell"><div style="padding:16px">${Array(2).fill(skeletonBid).join("")}</div></section>
    <section class="section-shell">${Array(2).fill(skeletonCard).join("")}</section>
  `;
}

export function createDeveloperDashboardPage(content) {
  const session = content.viewerSession || { authenticated: false, user: null };

  if (!session.authenticated || session.user?.role !== "developer") {
    return createAccessDenied(content);
  }

  const notifications = getUnreadNotifications(session.user.id).filter((n) => n.type === "bid-accepted");
  const bellSvg = `<svg class="dashboard-notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
  const notificationBanner = notifications.length > 0
    ? `<div class="dashboard-notification-banner" data-dashboard-notifications>
        ${notifications.map((n) => `<a class="dashboard-notification-item" href="${n.href || "#"}">${bellSvg}<span class="dashboard-notification-text">${n.message}</span></a>`).join("")}
      </div>`
    : "";

  if (notifications.length > 0) {
    markAllRead(session.user.id);
  }

  const allBids = content.bidEntries || [];
  const wonBids = allBids.filter((bid) => String(bid.status || "").toLowerCase() === "accepted");
  const otherBids = allBids.filter((bid) => String(bid.status || "").toLowerCase() !== "accepted");
  const ratingAverage = content.ratingAverage || 0;
  const ratingCount = content.ratingCount || 0;

  return `
    ${notificationBanner}
    ${createDeveloperOverviewSection(content, session, content.ownedListings.length, allBids.length, wonBids.length, ratingAverage, ratingCount)}
    ${createWonBidsSection(content, wonBids)}
    ${createBidsSection(content, otherBids)}
    ${createListingsSection(content, content.ownedListings)}
  `;
}
