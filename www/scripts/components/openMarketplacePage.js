import { getMarketplaceListingHref } from "../core/marketplaceStore.js";
import { getDefaultAvatarOptions } from "../core/accountSettingsStore.js";
import { createButton, createSectionHeading } from "./primitives.js";

const CLIENT_CATEGORY_OPTIONS = [
  { value: "pool-renovation", en: "Pool Renovation", tr: "Havuz Renovasyonu" },
  { value: "pool-construction", en: "Pool Construction", tr: "Havuz Yapımı" },
  { value: "wall-construction", en: "Wall Construction", tr: "Duvar Yapımı" },
  { value: "interior-renovation", en: "Interior Renovation", tr: "İç Mekan Renovasyonu" },
  { value: "kitchen-renovation", en: "Kitchen Renovation", tr: "Mutfak Renovasyonu" },
  { value: "bathroom-renovation", en: "Bathroom Renovation", tr: "Banyo Renovasyonu" },
  { value: "full-villa-construction", en: "Full Villa Construction", tr: "Komple Villa Yapımı" },
  { value: "landscaping", en: "Landscaping", tr: "Peyzaj" },
  { value: "exterior-renovation", en: "Exterior Renovation", tr: "Dış Cephe Renovasyonu" },
  { value: "roofing", en: "Roofing", tr: "Çatı" },
  { value: "flooring", en: "Flooring", tr: "Zemin Kaplama" },
  { value: "painting", en: "Painting", tr: "Boya" },
  { value: "tiling", en: "Tiling", tr: "Seramik / Fayans" },
  { value: "plumbing", en: "Plumbing", tr: "Sıhhi Tesisat" },
  { value: "electrical", en: "Electrical", tr: "Elektrik" },
  { value: "facade-work", en: "Facade Work", tr: "Cephe Uygulaması" },
  { value: "garden-design", en: "Garden Design", tr: "Bahçe Tasarımı" },
  { value: "pergola-outdoor-structures", en: "Pergola / Outdoor Structures", tr: "Pergola / Dış Mekan Yapıları" },
  { value: "demolition-site-prep", en: "Demolition / Site Prep", tr: "Yıkım / Saha Hazırlığı" },
  { value: "general-construction", en: "General Construction", tr: "Genel İnşaat" },
  { value: "architecture-design", en: "Architecture / Design", tr: "Mimarlık / Tasarım" },
  { value: "custom-project", en: "Custom Project", tr: "Özel Proje" },
];

const LISTING_STATUS_OPTIONS = [
  { value: "open-for-bids", en: "Open for Bids", tr: "Tekliflere Açık" },
  { value: "closed", en: "Closed", tr: "Kapalı" },
  { value: "awarded", en: "Awarded", tr: "Verildi" },
  { value: "in-progress", en: "In Progress", tr: "Sürüyor" },
  { value: "completed", en: "Completed", tr: "Tamamlandı" },
];

const PROJECT_STATUS_OPTIONS = [
  { value: "not-started", en: "Not Started", tr: "Başlanmadı" },
  { value: "planning-stage", en: "Planning Stage", tr: "Planlama Aşaması" },
  { value: "in-construction", en: "In Construction", tr: "İnşaat Halinde" },
  { value: "renovation-needed", en: "Renovation Needed", tr: "Renovasyon Gerekli" },
  { value: "shell-structure-complete", en: "Shell Structure Complete", tr: "Kaba Yapı Tamam" },
  { value: "interior-work-needed", en: "Interior Work Needed", tr: "İç Mekan İşleri Gerekli" },
  { value: "exterior-work-needed", en: "Exterior Work Needed", tr: "Dış Mekan İşleri Gerekli" },
  { value: "landscape-needed", en: "Landscape Needed", tr: "Peyzaj Gerekli" },
  { value: "other", en: "Other", tr: "Diğer" },
];

/**
 * Compute a "days left to bid" string from createdAt + timeframe text.
 * Tries to extract a month count from timeframe strings like "6 ay içinde",
 * "Delivery in 8-10 months", "14 ay içinde açılış hedefi", etc.
 * Falls back to 30 days if nothing can be parsed.
 */
function computeBidDeadline(createdAtISO, timeframeText, locale) {
  const isTr = locale === "tr";
  if (!createdAtISO) {
    return { publishedLabel: "", daysLeftLabel: "" };
  }

  const createdDate = new Date(createdAtISO);
  const now = new Date();
  const daysSincePosted = Math.max(0, Math.floor((now - createdDate) / 86400000));

  // Format published date
  const publishedLabel = isTr
    ? `${createdDate.getDate()} ${["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"][createdDate.getMonth()]} ${createdDate.getFullYear()}`
    : `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][createdDate.getMonth()]} ${createdDate.getDate()}, ${createdDate.getFullYear()}`;

  // Try to extract number of months from timeframe text
  let totalDays = 30; // default: 30 day bidding window
  const monthMatch = String(timeframeText || "").match(/(\d+)/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    if (months > 0 && months <= 36) {
      totalDays = months * 30;
    }
  }

  const daysLeft = Math.max(0, totalDays - daysSincePosted);

  let daysLeftLabel;
  if (daysLeft === 0) {
    daysLeftLabel = isTr ? "Teklif süresi doldu" : "Bidding period ended";
  } else {
    daysLeftLabel = isTr
      ? `${daysLeft} gün kaldı`
      : `${daysLeft} days left`;
  }

  return { publishedLabel, daysLeftLabel };
}

const INITIAL_MARKETPLACE_BATCH_SIZE = 12;

function getMarketplaceLocale(content) {
  return content.meta?.locale === "tr" ? "tr" : "en";
}

function humanizeSlug(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeFilterValue(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveClientCategoryValue(listing) {
  const marketplaceMeta = listing?.marketplaceMeta || {};
  const projectType = listing?.projectType || "";
  const normalizedProjectType = normalizeFilterValue(projectType);
  const matchedOption = CLIENT_CATEGORY_OPTIONS.find(
    (option) =>
      normalizedProjectType &&
      (normalizeFilterValue(option.en) === normalizedProjectType || normalizeFilterValue(option.tr) === normalizedProjectType)
  );

  if (matchedOption) {
    return matchedOption.value;
  }

  return marketplaceMeta.category || normalizedProjectType;
}

function getLocalizedLabel(options, value, locale, fallback = "") {
  const match = options.find((item) => item.value === value);
  if (match) {
    return locale === "tr" ? match.tr : match.en;
  }

  return fallback || humanizeSlug(value);
}

function getClientListingCopy(locale) {
  if (locale === "tr") {
    return {
      fallback: "Belirtilmedi",
      status: "İlan Durumu",
      location: "Konum",
      filters: {
        category: "Kategoriye Göre Filtrele",
        status: "Duruma Göre Filtrele",
        allCategories: "Tüm kategoriler",
        allStatuses: "Tüm durumlar",
      },
      empty: {
        title: "Henüz yayında tekliflere açık müşteri ilanı yok.",
        description: "İlk müşteri proje talebi yayınlandığında burada görünecek.",
      },
      error: {
        title: "İlanlar şu anda yüklenemiyor.",
        description: "Lütfen biraz sonra tekrar deneyin.",
      },
      mediaFallback: "Proje Görseli",
    };
  }

  return {
    fallback: "Not provided",
    status: "Listing Status",
    location: "Location",
    filters: {
      category: "Filter by Category",
      status: "Filter by Status",
      allCategories: "All categories",
      allStatuses: "All statuses",
    },
    empty: {
      title: "No open client listings are live yet.",
      description: "The first published client project request will appear here.",
    },
    error: {
      title: "Listings could not be loaded right now.",
      description: "Please try again in a moment.",
    },
    mediaFallback: "Project Visual",
  };
}

/* ─── Card preview image helper ─── */
/* Images are already compressed at upload time (800px max, ~200KB).
   Cards use the same image as detail pages — no separate thumbnail
   cache needed, which also prevents visual mismatch. */

/** No-op — kept as export so callers don't break */
export function scheduleBackgroundThumbnails() {}

function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url === "[base64-stripped]") return false;
  if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("/")) return true;
  return false;
}

function getClientPreviewImage(listing) {
  const attachments = Array.isArray(listing.attachments) ? listing.attachments : [];
  const dataUrl = attachments[0]?.dataUrl;
  if (isValidImageUrl(dataUrl)) return dataUrl;
  if (isValidImageUrl(listing.imageSrc)) return listing.imageSrc;
  return "";
}

function getCreatorRole(listing, fallbackRole = "client") {
  return (
    listing?.creatorRole
    || listing?.ownerRole
    || listing?.marketplaceMeta?.creatorRole
    || (listing?.type === "professional" ? "developer" : "")
    || fallbackRole
  );
}

function getCreatorAvatarSrc(listing, fallbackRole = "client") {
  const resolvedRole = getCreatorRole(listing, fallbackRole);
  const defaultAvatar = getDefaultAvatarOptions(resolvedRole)[0]?.src || getDefaultAvatarOptions(fallbackRole)[0]?.src || "";

  return (
    listing?.creatorAvatarSrc
    || listing?.creatorAvatarUrl
    || listing?.profilePictureSrc
    || listing?.avatarUrl
    || listing?.marketplaceMeta?.creatorAvatarSrc
    || listing?.marketplaceMeta?.developerProfileReference?.avatarUrl
    || defaultAvatar
  );
}

function createClientFilters(content) {
  const locale = getMarketplaceLocale(content);
  const copy = getClientListingCopy(locale);
  const filters = content.publicListingFilters || {};
  const statusValue = filters.status || "open-for-bids";
  const categoryValue = filters.category || "";

  return `
    <form class="marketplace-filters panel" data-marketplace-client-filters>
      <label class="form-field">
        <span>${copy.filters.category}</span>
        <select name="category">
          <option value="">${copy.filters.allCategories}</option>
          ${CLIENT_CATEGORY_OPTIONS
            .map(
              (option) =>
                `<option value="${option.value}" ${option.value === categoryValue ? "selected" : ""}>${
                  locale === "tr" ? option.tr : option.en
                }</option>`
            )
            .join("")}
        </select>
      </label>
      <label class="form-field">
        <span>${copy.filters.status}</span>
        <select name="status">
          <option value="all" ${statusValue === "all" ? "selected" : ""}>${copy.filters.allStatuses}</option>
          ${LISTING_STATUS_OPTIONS
            .map(
              (option) =>
                `<option value="${option.value}" ${option.value === statusValue ? "selected" : ""}>${
                  locale === "tr" ? option.tr : option.en
                }</option>`
            )
            .join("")}
        </select>
      </label>
    </form>
  `;
}

function createClientEmptyState(content, tone = "empty") {
  const locale = getMarketplaceLocale(content);
  const copy = getClientListingCopy(locale);
  const stateCopy = tone === "error" ? copy.error : copy.empty;

  return `
    <div class="marketplace-empty panel">
      <h3>${stateCopy.title}</h3>
      <p>${stateCopy.description}</p>
    </div>
  `;
}

function getMarketplaceCreateActions(content) {
  const access = content.listingAccess || {};

  if (access.authenticated && !access.allowedSubmissionType) {
    return [];
  }

  if (access.allowedSubmissionType === "client") {
    return [
      createButton({
        href: content.cta.clientHref,
        label: content.cta.clientLabel,
        variant: "primary",
      }),
    ];
  }

  if (access.allowedSubmissionType === "professional") {
    return [
      createButton({
        href: content.cta.proHref,
        label: content.cta.proLabel,
        variant: "primary",
      }),
    ];
  }

  return [
    createButton({ href: content.cta.clientHref, label: content.cta.clientLabel, variant: "primary" }),
    createButton({ href: content.cta.proHref, label: content.cta.proLabel, variant: "secondary" }),
  ];
}

function createMarketplaceHero(content) {
  const highlights = content.hero.highlights.map((item) => `<span class="chip">${item}</span>`).join("");
  const access = content.listingAccess || {};
  const secondaryAction =
    access.allowedSubmissionType === "client"
      ? createButton({ href: content.cta.clientHref, label: content.cta.clientLabel, variant: "secondary" })
      : access.allowedSubmissionType === "professional"
        ? createButton({ href: content.cta.proHref, label: content.cta.proLabel, variant: "secondary" })
        : access.authenticated
          ? ""
        : createButton({ href: content.hero.secondaryCta.href, label: content.hero.secondaryCta.label, variant: "secondary" });

  return `
    <section class="marketplace-hero section-shell">
      <div class="marketplace-hero__layout">
        <div class="marketplace-hero__copy">
          <p class="eyebrow">${content.hero.eyebrow}</p>
          <h1 class="hero-title marketplace-hero__title">${content.hero.title}</h1>
          <p class="hero-lead">${content.hero.description}</p>
          <div class="hero-actions">
            ${createButton({ href: content.hero.primaryCta.href, label: content.hero.primaryCta.label, variant: "primary" })}
            ${secondaryAction}
          </div>
          <div class="chip-row">${highlights}</div>
        </div>
      </div>
    </section>
  `;
}

const INTRO_BIRDS = [
  "./assets/avatars/step-bird-create.svg",
  "./assets/avatars/step-bird-bids.svg",
  "./assets/avatars/step-bird-compare.svg",
];

function createMarketplaceIntro(content) {
  const pillars = content.intro.pillars
    .map(
      (item, i) => `
        <article class="step-card" data-step="${i}">
          <div class="step-bird">
            <img class="step-bird__img" src="${INTRO_BIRDS[i] || INTRO_BIRDS[0]}" alt="" draggable="false" />
          </div>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="marketplace-intro">
      ${createSectionHeading(content.intro)}
      <div class="steps-grid">${pillars}</div>
    </section>
  `;
}

function createMarketplaceToggleMascot() {
  return `
    <div class="marketplace-toggle-mascot panel" data-marketplace-toggle-mascot data-mode="client" aria-hidden="true">
      <svg class="marketplace-toggle-bird" viewBox="0 0 120 120" fill="none">
        <ellipse class="marketplace-toggle-bird__shadow" cx="60" cy="97" rx="18" ry="5"></ellipse>
        <g class="marketplace-toggle-bird__character">
          <path class="marketplace-toggle-bird__tail" d="M31 65 20 60 29 73 38 69Z"></path>
          <ellipse class="marketplace-toggle-bird__body" cx="52" cy="64" rx="23" ry="18"></ellipse>
          <circle class="marketplace-toggle-bird__head" cx="74" cy="50" r="13"></circle>
          <ellipse class="marketplace-toggle-bird__wing" cx="49" cy="65" rx="11" ry="15" transform="rotate(-24 49 65)"></ellipse>
          <circle class="marketplace-toggle-bird__eye" cx="78" cy="47" r="2.2"></circle>
          <path class="marketplace-toggle-bird__beak" d="M85 50 95 46 88 55Z"></path>
          <path class="marketplace-toggle-bird__leg" d="M49 81V89"></path>
          <path class="marketplace-toggle-bird__leg" d="M58 81V89"></path>
          <g class="marketplace-toggle-bird__pen">
            <rect class="marketplace-toggle-bird__pen-body" x="67" y="73" width="30" height="5" rx="2.5" transform="rotate(-22 67 73)"></rect>
            <rect class="marketplace-toggle-bird__pen-cap" x="67" y="73" width="6" height="5" rx="1.2" transform="rotate(-22 67 73)"></rect>
            <path class="marketplace-toggle-bird__pen-tip" d="M97 61 104 58 101 66Z"></path>
          </g>
          <g class="marketplace-toggle-bird__helmet">
            <path class="marketplace-toggle-bird__helmet-shell" d="M60 42c0-7.4 6-13.4 13.4-13.4 7 0 12.8 5.4 13.4 12.2v2.2H60V42Z"></path>
            <path class="marketplace-toggle-bird__helmet-rim" d="M58 43h31c1.8 0 3.2 1.4 3.2 3.2 0 1.1-.5 2-1.4 2.7H58.4c-.9-.7-1.4-1.6-1.4-2.7 0-1.8 1.4-3.2 3.2-3.2Z"></path>
            <path class="marketplace-toggle-bird__helmet-stripe" d="M72 29h4v14h-4z"></path>
          </g>
        </g>
      </svg>
    </div>
  `;
}

function createClientListingCard(listing, labels, locale) {
  const ctaHref = listing.detailHref || getMarketplaceListingHref("client", listing.id || listing.slug);
  const marketplaceMeta = listing.marketplaceMeta || {};
  const previewImage = getClientPreviewImage(listing);
  const copy = getClientListingCopy(locale);
  const categoryValue = resolveClientCategoryValue(listing);
  const categoryLabel =
    listing.projectType ||
    getLocalizedLabel(CLIENT_CATEGORY_OPTIONS, marketplaceMeta.category, locale, copy.fallback);
  const locationLabel = listing.location || marketplaceMeta.location || copy.fallback;
  const budgetLabel = listing.budget || marketplaceMeta.budgetRange?.label || copy.fallback;
  const timeframeLabel = listing.timeline || listing.startDate || marketplaceMeta.desiredTimeframe?.label || copy.fallback;
  const createdAtRaw = listing.createdAt || listing.created_at || "";
  const bidDeadlineInfo = computeBidDeadline(createdAtRaw, timeframeLabel, locale);
  const projectStatusLabel =
    listing.plotStatus ||
    getLocalizedLabel(PROJECT_STATUS_OPTIONS, marketplaceMeta.projectStatus, locale, copy.fallback);
  const listingStatusLabel = getLocalizedLabel(
    LISTING_STATUS_OPTIONS,
    marketplaceMeta.listingStatus || listing.status,
    locale,
    copy.fallback
  );
  const tags = [...new Set([marketplaceMeta.subcategory, ...(listing.tags || [])].filter(Boolean))].slice(0, 4);
  const creatorAvatarSrc = getCreatorAvatarSrc(listing, "client");

  return `
    <article
      class="marketplace-card panel"
      data-marketplace-client-card
      data-marketplace-category="${categoryValue}"
      data-marketplace-status="${marketplaceMeta.listingStatus || listing.status || ""}"
    >
      <a class="marketplace-card__media marketplace-card__media--client" href="${ctaHref}" aria-label="${listing.title}">
        ${
          previewImage
            ? `<img src="${previewImage}" alt="${listing.title}" loading="lazy" decoding="async" fetchpriority="low" />`
            : `<span class="marketplace-card__media-placeholder">${copy.mediaFallback}</span>`
        }
      </a>
      <div class="marketplace-card__top">
        <span class="project-badge">${categoryLabel}</span>
        <span class="marketplace-card__status">${listingStatusLabel}</span>
        <span class="marketplace-card__location">${locationLabel}</span>
      </div>
      <div class="marketplace-card__title-row">
        <span class="marketplace-card__creator-avatar" aria-hidden="true">
          <img src="${creatorAvatarSrc}" alt="" loading="lazy" decoding="async" />
        </span>
        <h3>${listing.title}</h3>
      </div>
      <p class="marketplace-card__brief">${listing.brief}</p>
      <div class="marketplace-card__tags">
        ${tags.map((tag) => `<span class="marketplace-tag">${tag}</span>`).join("")}
      </div>
      <div class="marketplace-card__facts">
        <div>
          <span>${labels.location || copy.location}</span>
          <strong>${locationLabel}</strong>
        </div>
        <div>
          <span>${labels.budget}</span>
          <strong>${budgetLabel}</strong>
        </div>
        <div>
          <span>${labels.plotStatus}</span>
          <strong>${projectStatusLabel}</strong>
        </div>
      </div>
      <div class="marketplace-card__bid-deadline">
        <span class="marketplace-card__published">${bidDeadlineInfo.publishedLabel}</span>
        <span class="marketplace-card__days-left">${bidDeadlineInfo.daysLeftLabel}</span>
        ${(() => {
          const bids = Array.isArray(listing.bids) ? listing.bids : (Array.isArray(marketplaceMeta.latestBids) ? marketplaceMeta.latestBids : []);
          const bidCount = Number(marketplaceMeta.bidCount || 0) || bids.length;
          if (bidCount > 0) {
            const bidLabel = locale === "tr" ? `${bidCount} teklif` : `${bidCount} bid${bidCount > 1 ? "s" : ""}`;
            return `<span class="marketplace-card__bid-count">${bidLabel}</span>`;
          }
          return "";
        })()}
      </div>
      <div class="marketplace-card__footer">
        <div class="marketplace-card__timeline">
          <span>${labels.timeline}</span>
          <strong>${timeframeLabel}</strong>
        </div>
        <a class="button button--secondary marketplace-card__cta" href="${ctaHref}">${listing.ctaLabel || labels.viewListing}</a>
      </div>
    </article>
  `;
}

function getDeveloperPreviewImage(listing) {
  // Check normalized images array first (from normalizeMarketplaceListing)
  if (Array.isArray(listing.images) && isValidImageUrl(listing.images[0]?.src)) {
    return listing.images[0].src;
  }
  // Check attachments (same as client listings)
  const attachments = Array.isArray(listing.attachments) ? listing.attachments : [];
  const imageAttachment = attachments.find((item) => item?.kind === "image");
  if (isValidImageUrl(imageAttachment?.dataUrl)) return imageAttachment.dataUrl;
  // Fallback to imageSrc (seeded listings)
  if (isValidImageUrl(listing.imageSrc)) return listing.imageSrc;
  return "";
}

function createDeveloperListingCard(listing, labels) {
  const actions = listing.actions || labels.actions;
  const profileHref = listing.profileHref || getMarketplaceListingHref("professional", listing.id);
  const quoteHref = listing.quoteHref || `${profileHref}#listing-contact`;
  const projectsHref = listing.projectsHref || `${profileHref}#listing-services`;
  const contactHref = listing.contactHref || `${profileHref}#listing-contact`;
  const isSubmitted = listing.source === "submitted";
  const tags = Array.isArray(listing.tags) ? listing.tags : [];
  const services = Array.isArray(listing.services) ? listing.services : [];
  const factItems = listing.facts || [
    { label: labels.startingPrice, value: listing.startingPrice || labels.fallback },
    { label: isSubmitted ? labels.experience : labels.deliveryRange, value: isSubmitted ? `${listing.yearsExperience || ""} ${labels.yearsSuffix}` : (listing.deliveryRange || labels.fallback) },
    { label: isSubmitted ? labels.serviceArea : labels.services, value: isSubmitted ? (listing.location || labels.fallback) : (services[0] || labels.fallback) },
  ];
  const creatorAvatarSrc = getCreatorAvatarSrc(listing, "developer");
  const previewImage = getDeveloperPreviewImage(listing);
  const listingName = listing.name || listing.title || listing.companyName || "";
  const mediaFallback = labels.mediaFallback || "No Image";

  return `
    <article class="marketplace-card panel">
      <a class="marketplace-card__media marketplace-card__media--developer" href="${profileHref}" aria-label="${listingName}">
        ${
          previewImage
            ? `<img src="${previewImage}" alt="${listingName}" loading="lazy" decoding="async" fetchpriority="low" />`
            : `<span class="marketplace-card__media-placeholder">${mediaFallback}</span>`
        }
      </a>
      <div class="marketplace-card__top">
        <span class="project-badge">${listing.specialty || ""}</span>
        <span class="marketplace-card__location">${listing.location || ""}</span>
      </div>
      <div class="marketplace-card__title-row">
        <span class="marketplace-card__creator-avatar" aria-hidden="true">
          <img src="${creatorAvatarSrc}" alt="" loading="lazy" decoding="async" />
        </span>
        <h3>${listingName}</h3>
      </div>
      <p class="marketplace-card__brief">${listing.summary || listing.brief || ""}</p>
      ${tags.length > 0 ? `
      <div class="marketplace-card__tags">
        ${tags.map((tag) => `<span class="marketplace-tag">${tag}</span>`).join("")}
      </div>` : ""}
      <div class="marketplace-card__facts">
        ${factItems
          .map(
            (item) => `
              <div>
                <span>${item.label}</span>
                <strong>${item.value}</strong>
              </div>
            `
          )
          .join("")}
      </div>
      ${services.length > 0 ? `
      <ul class="project-highlights marketplace-card__services">
        ${services.map((service) => `<li>${service}</li>`).join("")}
      </ul>` : ""}
      <div class="marketplace-card__actions">
        <a class="button button--primary marketplace-card__cta" href="${profileHref}">${actions.viewProfile}</a>
        <a class="button button--secondary marketplace-card__cta" href="${quoteHref}">${actions.requestQuote}</a>
      </div>
      <div class="marketplace-card__quick-links">
        <a href="${projectsHref}">${actions.seeProjects}</a>
        <a href="${contactHref}">${actions.contactProfessional}</a>
      </div>
    </article>
  `;
}

function createSkeletonCard() {
  return `<div class="marketplace-card marketplace-card--skeleton panel" style="opacity:0.5;pointer-events:none">
    <div style="background:var(--surface-200,#e5e7eb);height:180px;border-radius:12px 12px 0 0"></div>
    <div style="padding:16px">
      <div style="background:var(--surface-200,#e5e7eb);height:16px;border-radius:4px;width:70%;margin-bottom:8px"></div>
      <div style="background:var(--surface-200,#e5e7eb);height:12px;border-radius:4px;width:50%"></div>
    </div>
  </div>`;
}

function createSkeletonCards(count = 3) {
  return Array(count).fill(null).map(() => createSkeletonCard()).join("");
}

function createDeferredCardsTemplate(cardsMarkup, kind) {
  if (!cardsMarkup) {
    return "";
  }

  const skeletonCards = createSkeletonCards(4); // Show 4 skeleton cards while loading
  return `
    <template data-marketplace-deferred-cards="${kind}">
      ${cardsMarkup}
    </template>
    <div data-marketplace-skeleton-cards="${kind}" style="display:none">
      <div class="marketplace-grid">
        ${skeletonCards}
      </div>
    </div>
  `;
}

function createMarketplaceListings(content) {
  const locale = getMarketplaceLocale(content);
  const clientItems = Array.isArray(content.tabs.client.items) ? content.tabs.client.items : [];
  const developerItems = Array.isArray(content.tabs.developer.items) ? content.tabs.developer.items : [];
  const initialClientCards = clientItems
    .slice(0, INITIAL_MARKETPLACE_BATCH_SIZE)
    .map((item) => createClientListingCard(item, content.tabs.client.labels, locale))
    .join("");
  const deferredClientCards = clientItems
    .slice(INITIAL_MARKETPLACE_BATCH_SIZE)
    .map((item) => createClientListingCard(item, content.tabs.client.labels, locale))
    .join("");
  const initialDeveloperCards = developerItems
    .slice(0, INITIAL_MARKETPLACE_BATCH_SIZE)
    .map((item) => createDeveloperListingCard(item, content.tabs.developer.labels))
    .join("");
  const deferredDeveloperCards = developerItems
    .slice(INITIAL_MARKETPLACE_BATCH_SIZE)
    .map((item) => createDeveloperListingCard(item, content.tabs.developer.labels))
    .join("");
  const clientPanelBody = content.publicListingError
    ? createClientEmptyState(content, "error")
    : clientItems.length > 0
      ? `
        <div class="marketplace-grid" data-marketplace-client-grid>${initialClientCards}</div>
        ${createDeferredCardsTemplate(deferredClientCards, "client")}
        <div data-marketplace-client-empty hidden>${createClientEmptyState(content)}</div>
      `
      : createClientEmptyState(content);

  // Skeleton placeholders for developer tab (shown while content loads)
  const developerSkeletonCards = createSkeletonCards(4);

  return `
    <section class="section-shell" id="marketplace-listings">
      <div class="marketplace-toggle-row">
        ${createMarketplaceToggleMascot()}
        <div class="marketplace-tabs" role="tablist" aria-label="${content.tabs.ariaLabel}">
          <button
            class="marketplace-tab is-active"
            type="button"
            role="tab"
            aria-selected="true"
            data-marketplace-tab="client"
          >
            ${content.tabs.client.tabLabel}
          </button>
          <button
            class="marketplace-tab"
            type="button"
            role="tab"
            aria-selected="false"
            data-marketplace-tab="developer"
            data-marketplace-prefetch-target="developer"
          >
            ${content.tabs.developer.tabLabel}
          </button>
        </div>
      </div>

      <div class="marketplace-panel is-active" data-marketplace-panel="client">
        ${clientPanelBody}
      </div>

      <div class="marketplace-panel" data-marketplace-panel="developer" hidden>
        ${initialDeveloperCards ? `<div class="marketplace-grid" data-marketplace-developer-grid>${initialDeveloperCards}</div>` : `<div class="marketplace-grid" data-marketplace-developer-grid>${developerSkeletonCards}</div>`}
        ${createDeferredCardsTemplate(deferredDeveloperCards, "developer")}
      </div>
    </section>
    <script>
      // Prefetch developer tab data early in idle time to avoid delays when user clicks the tab
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          const tab = document.querySelector('[data-marketplace-prefetch-target="developer"]');
          if (tab) {
            // Dispatch custom event that marketplace JavaScript can listen for to prefetch data
            window.dispatchEvent(new CustomEvent('marketplace:prefetch-tab', { detail: { tab: 'developer' } }));
          }
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          const tab = document.querySelector('[data-marketplace-prefetch-target="developer"]');
          if (tab) {
            window.dispatchEvent(new CustomEvent('marketplace:prefetch-tab', { detail: { tab: 'developer' } }));
          }
        }, 2000);
      }
    </script>
  `;
}

function createMarketplaceCta(content) {
  const actions = getMarketplaceCreateActions(content).join("");

  return `
    <section class="section-shell" id="marketplace-create">
      <div class="project-cta-panel panel marketplace-cta-panel">
        <div>
          <p class="eyebrow">${content.cta.eyebrow}</p>
          <h2 class="section-title">${content.cta.title}</h2>
          <p class="section-description">${content.cta.description}</p>
        </div>
        <div class="hero-actions">
          ${actions}
        </div>
      </div>
    </section>
  `;
}

export function createOpenMarketplacePage(content) {
  return `
    ${createMarketplaceListings(content)}
    ${createMarketplaceIntro(content)}
    ${createMarketplaceCta(content)}
  `;
}
