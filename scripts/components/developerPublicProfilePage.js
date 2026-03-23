import { createButton, createSectionHeading } from "./primitives.js";

function getLocale(content) {
  return content.meta?.locale === "tr" ? "tr" : "en";
}

function formatDate(value, locale, fallback) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return fallback || "";
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
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

  return `<span class="dev-profile-stars yapply-stars" style="display:inline-flex;align-items:center;gap:2px">
    ${starFull.repeat(full)}${hasHalf ? starHalf : ""}${starEmpty.repeat(empty)}
  </span>`;
}

function createStarInput(content) {
  const labels = content.reviewForm;
  const starPath = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z";
  const starInputs = [1, 2, 3, 4, 5]
    .map(
      (n) => {
        const gid = `si${Math.random().toString(36).slice(2, 8)}`;
        return `
      <button type="button" class="dev-profile-star-input yapply-star-input-btn" data-star-value="${n}" data-grad-id="${gid}" aria-label="${n} star${n > 1 ? "s" : ""}">
        <svg class="yapply-star yapply-star--empty" width="28" height="28" viewBox="0 0 24 24">
          <defs><linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs>
          <path d="${starPath}" fill="none" stroke="var(--text-300, #9ca3af)" stroke-width="1.2" data-star-path/>
        </svg>
      </button>`;
      }
    )
    .join("");

  return `
    <div class="dev-profile-star-input-group" data-star-input-group>
      <label class="form-field__label">${labels.ratingLabel}</label>
      <div class="dev-profile-star-input-row" style="display:flex;gap:4px;align-items:center">
        ${starInputs}
        <input type="hidden" name="rating" value="0" data-star-rating-value />
      </div>
    </div>
  `;
}

function createReviewCard(review, locale) {
  const dateLabel = formatDate(review.created_at, locale);
  return `
    <article class="dev-profile-review-card panel" style="padding:1rem;margin-bottom:0.75rem">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        ${createStarDisplay(review.rating, 16)}
        <span style="color:var(--text-300);font-size:0.85rem">${dateLabel}</span>
      </div>
      ${review.comment ? `<p style="margin:0;color:var(--text-100)">${review.comment}</p>` : ""}
    </article>
  `;
}

function createReviewsSection(content, reviews, locale) {
  const labels = content.reviewsSection;
  if (reviews.length === 0) {
    return `
      <div class="dev-profile-reviews-section">
        <h3 style="margin-bottom:0.75rem">${labels.title}</h3>
        <p style="color:var(--text-300)">${labels.empty}</p>
      </div>
    `;
  }

  return `
    <div class="dev-profile-reviews-section">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:0.75rem">
        <h3 style="margin:0;flex:1;min-width:0">${labels.title} (${reviews.length})</h3>
        <button class="button button--secondary" type="button" data-dev-profile-toggle-reviews style="font-size:0.78rem;padding:0.4rem 0.85rem;white-space:nowrap;flex-shrink:0">
          <span data-dev-profile-toggle-reviews-label>${labels.viewAll}</span>
          <span style="margin-left:4px;display:inline-block;transition:transform 200ms" data-dev-profile-toggle-arrow>▼</span>
        </button>
      </div>
      <div class="dev-profile-reviews-list" data-dev-profile-reviews-list hidden>
        ${reviews.map((r) => createReviewCard(r, locale)).join("")}
      </div>
    </div>
  `;
}

function createReviewForm(content, listing, bid) {
  const labels = content.reviewForm;
  return `
    <div class="dev-profile-review-form-wrapper panel" style="padding:1.25rem;margin-top:1rem" data-dev-profile-review-form-wrapper>
      <h3 style="margin-bottom:1rem">${labels.title}</h3>
      <form class="dev-profile-review-form" data-dev-profile-review-form>
        <input type="hidden" name="listingId" value="${listing.id}" />
        <input type="hidden" name="bidId" value="${bid.id}" />
        <input type="hidden" name="developerUserId" value="${bid.bidderUserId || bid.bidder_user_id || bid.developerUserId || ""}" />
        ${createStarInput(content)}
        <label class="form-field" style="margin-top:0.75rem">
          <span>${labels.commentLabel}</span>
          <textarea name="comment" rows="3" placeholder="${labels.commentPlaceholder}" style="width:100%;resize:vertical"></textarea>
        </label>
        <div class="dev-profile-review-form-feedback" data-review-feedback hidden style="padding:0.5rem 0"></div>
        <div style="margin-top:0.75rem">
          <button class="button button--primary" type="submit">${labels.submitLabel}</button>
        </div>
      </form>
    </div>
  `;
}

export function createDeveloperPublicProfileSkeleton() {
  return `
    <section class="section-shell" style="padding:2rem">
      <div style="background:var(--surface-200,#e5e7eb);height:24px;border-radius:6px;width:40%;margin-bottom:16px"></div>
      <div style="background:var(--surface-200,#e5e7eb);height:16px;border-radius:4px;width:70%;margin-bottom:12px"></div>
      <div style="background:var(--surface-200,#e5e7eb);height:16px;border-radius:4px;width:55%;margin-bottom:12px"></div>
      <div style="background:var(--surface-200,#e5e7eb);height:80px;border-radius:8px;width:100%;margin-bottom:16px"></div>
    </section>
  `;
}

export function createDeveloperPublicProfilePage(content) {
  const locale = getLocale(content);
  const labels = content.labels || {};
  const profileData = content.developerProfileData || {};
  const profile = profileData.profile || {};
  const reviews = profileData.reviews || [];
  const ratingAvg = profileData.ratingAverage || 0;
  const ratingCount = profileData.ratingCount || 0;
  const totalBids = profileData.totalBids || 0;
  const wonBids = profileData.wonBids || 0;

  const session = content.viewerSession || { authenticated: false, user: null };
  const isDeveloperOwn = session.authenticated && session.user?.id === profile.id && session.user?.role === "developer";
  const isClient = session.authenticated && session.user?.role === "client";

  const profileName = profile.company_name || profile.full_name || profile.username || profile.email || "";
  const description = profile.work_description || profile.specialties || "";
  const serviceArea = profile.service_area || "";
  const professionType = profile.profession_type || "";
  const specialties = profile.specialties || "";

  // Avatar resolution chain:
  // 1. profile_picture_src from Supabase fetch (may include default avatar fallback)
  // 2. Session avatar when viewing own profile (authoritative source from account settings)
  // 3. Hard-coded default bird avatar as last resort
  const DEFAULT_BIRD_AVATAR = "./assets/avatars/avatar-bird-business.png";
  const avatar =
    (isDeveloperOwn && session.user?.profilePictureSrc) ||
    profile.profile_picture_src ||
    DEFAULT_BIRD_AVATAR;

  // Completed listings where this developer has an accepted bid (for review)
  const completedListings = content.completedListings || [];

  return `
    <section class="section-shell" id="developer-public-profile">
      <div class="dev-profile-hero-avatar">
        <img class="dev-profile-hero-avatar__img" src="${avatar}" alt="${profileName}" loading="lazy" decoding="async" fetchpriority="low" />
        <p class="dev-profile-hero-avatar__name">${profileName}</p>
        ${professionType ? `<p class="dev-profile-hero-avatar__subtitle">${professionType}</p>` : ""}
      </div>

      <div class="developer-dashboard-overview" style="margin-bottom:2rem">
        <article class="panel developer-dashboard-profile">
          <div class="developer-dashboard-profile__header">
            <div class="developer-dashboard-profile__copy">
              <p class="eyebrow">${content.heading.eyebrow}</p>
              <h2 style="margin:0">${profileName}</h2>
              ${isDeveloperOwn ? `
                <div data-dev-profile-description-display>
                  <p style="margin:0.5rem 0">${description || labels.noDescription}</p>
                  <button class="button button--secondary" type="button" data-dev-profile-edit-desc style="font-size:0.8rem;padding:0.3rem 0.6rem;margin-top:0.4rem">
                    ${content.editDescription}
                  </button>
                </div>
                <form data-dev-profile-description-form hidden style="margin-top:0.5rem">
                  <textarea name="workDescription" rows="3" style="width:100%;resize:vertical">${description}</textarea>
                  <div style="display:flex;gap:8px;margin-top:0.5rem">
                    <button class="button button--primary" type="submit" style="font-size:0.8rem;padding:0.3rem 0.6rem">${content.saveDescription}</button>
                    <button class="button button--secondary" type="button" data-dev-profile-cancel-desc style="font-size:0.8rem;padding:0.3rem 0.6rem">${content.cancelEdit}</button>
                  </div>
                </form>
              ` : `
                <p style="margin:0.5rem 0">${description || labels.noDescription}</p>
              `}
            </div>
          </div>

          <div class="project-detail-card__facts developer-dashboard-profile__facts" style="margin-top:1rem">
            ${professionType ? `<div><span>${labels.professionType}</span><strong>${professionType}</strong></div>` : ""}
            ${specialties ? `<div><span>${labels.specialties}</span><strong>${specialties}</strong></div>` : ""}
            ${serviceArea ? `<div><span>${labels.serviceArea}</span><strong>${serviceArea}</strong></div>` : ""}
            <div>
              <span>${labels.totalBids}</span>
              <strong>${totalBids}</strong>
            </div>
            <div>
              <span>${labels.wonBids}</span>
              <strong>${wonBids}</strong>
            </div>
            <div>
              <span>${labels.avgRating}</span>
              <strong style="display:flex;align-items:center;gap:6px">
                ${ratingCount > 0 ? `${createStarDisplay(ratingAvg)} ${ratingAvg.toFixed(1)}` : labels.noReviews}
              </strong>
            </div>
            <div>
              <span>${labels.reviewCount}</span>
              <strong>${ratingCount}</strong>
            </div>
          </div>
        </article>
      </div>

      ${createReviewsSection(content, reviews, locale)}

      ${isClient && completedListings.length > 0 ? `
        <div class="dev-profile-client-review-section" style="margin-top:2rem">
          <h3 style="margin-bottom:0.75rem">${content.reviewForm.title}</h3>
          ${completedListings.map((item) => `
            <div class="panel" style="padding:1rem;margin-bottom:0.75rem">
              <p style="margin:0 0 0.5rem"><strong>${item.listing.title || ""}</strong></p>
              ${item.hasReview
                ? `<p style="color:var(--text-300);font-style:italic">${content.reviewForm.alreadyReviewed}</p>`
                : createReviewForm(content, item.listing, item.bid)
              }
            </div>
          `).join("")}
        </div>
      ` : ""}
    </section>
  `;
}
