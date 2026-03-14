import { getMarketplaceListingHref } from "../core/marketplaceStore.js";
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

function getClientPreviewImage(listing) {
  const attachments = Array.isArray(listing.attachments) ? listing.attachments : [];
  return attachments.find((item) => item.kind === "image" && item.dataUrl)?.dataUrl || "";
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

function createMarketplaceIntro(content) {
  const pillars = content.intro.pillars
    .map(
      (item) => `
        <article class="feature-card marketplace-intro-card">
          <span class="feature-index">${item.index}</span>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="marketplace-intro">
      ${createSectionHeading(content.intro)}
      <div class="features-grid">${pillars}</div>
    </section>
  `;
}

function createClientListingCard(listing, labels, locale) {
  const ctaHref = listing.detailHref || getMarketplaceListingHref("client", listing.id || listing.slug);
  const marketplaceMeta = listing.marketplaceMeta || {};
  const previewImage = getClientPreviewImage(listing);
  const copy = getClientListingCopy(locale);
  const categoryValue = marketplaceMeta.category || normalizeFilterValue(listing.projectType);
  const categoryLabel =
    listing.projectType ||
    getLocalizedLabel(CLIENT_CATEGORY_OPTIONS, marketplaceMeta.category, locale, copy.fallback);
  const locationLabel = listing.location || marketplaceMeta.location || copy.fallback;
  const budgetLabel = listing.budget || marketplaceMeta.budgetRange?.label || copy.fallback;
  const timeframeLabel = listing.timeline || listing.startDate || marketplaceMeta.desiredTimeframe?.label || copy.fallback;
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
            ? `<img src="${previewImage}" alt="${listing.title}" />`
            : `<span class="marketplace-card__media-placeholder">${copy.mediaFallback}</span>`
        }
      </a>
      <div class="marketplace-card__top">
        <span class="project-badge">${categoryLabel}</span>
        <span class="marketplace-card__status">${listingStatusLabel}</span>
        <span class="marketplace-card__location">${locationLabel}</span>
      </div>
      <h3>${listing.title}</h3>
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

function createDeveloperListingCard(listing, labels) {
  const actions = listing.actions || labels.actions;
  const profileHref = listing.profileHref || getMarketplaceListingHref("professional", listing.id);
  const quoteHref = listing.quoteHref || `${profileHref}#listing-contact`;
  const projectsHref = listing.projectsHref || `${profileHref}#listing-services`;
  const contactHref = listing.contactHref || `${profileHref}#listing-contact`;
  const isSubmitted = listing.source === "submitted";
  const factItems = listing.facts || [
    { label: labels.startingPrice, value: listing.startingPrice },
    { label: isSubmitted ? labels.experience : labels.deliveryRange, value: isSubmitted ? `${listing.yearsExperience} ${labels.yearsSuffix}` : listing.deliveryRange },
    { label: isSubmitted ? labels.serviceArea : labels.services, value: isSubmitted ? listing.location : listing.services?.[0] || labels.fallback },
  ];

  return `
    <article class="marketplace-card panel">
      <a class="marketplace-card__media marketplace-card__media--developer" href="${profileHref}" aria-label="${listing.name}">
        <img src="${listing.imageSrc}" alt="${listing.name}" />
      </a>
      <div class="marketplace-card__top">
        <span class="project-badge">${listing.specialty}</span>
        <span class="marketplace-card__location">${listing.location}</span>
      </div>
      <h3>${listing.name}</h3>
      <p class="marketplace-card__brief">${listing.summary}</p>
      <div class="marketplace-card__tags">
        ${listing.tags.map((tag) => `<span class="marketplace-tag">${tag}</span>`).join("")}
      </div>
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
      <ul class="project-highlights marketplace-card__services">
        ${listing.services.map((service) => `<li>${service}</li>`).join("")}
      </ul>
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

function createMarketplaceListings(content) {
  const locale = getMarketplaceLocale(content);
  const clientCards = content.tabs.client.items
    .map((item) => createClientListingCard(item, content.tabs.client.labels, locale))
    .join("");
  const developerCards = content.tabs.developer.items
    .map((item) => createDeveloperListingCard(item, content.tabs.developer.labels))
    .join("");
  const clientPanelBody = content.publicListingError
    ? createClientEmptyState(content, "error")
    : content.tabs.client.items.length > 0
      ? `
        <div class="marketplace-grid" data-marketplace-client-grid>${clientCards}</div>
        <div data-marketplace-client-empty hidden>${createClientEmptyState(content)}</div>
      `
      : createClientEmptyState(content);

  return `
    <section class="section-shell" id="marketplace-listings">
      ${createSectionHeading(content.tabs.heading)}
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
        >
          ${content.tabs.developer.tabLabel}
        </button>
      </div>

      <div class="marketplace-panel is-active" data-marketplace-panel="client">
        ${createClientFilters(content)}
        ${clientPanelBody}
      </div>

      <div class="marketplace-panel" data-marketplace-panel="developer" hidden>
        <div class="marketplace-grid">${developerCards}</div>
      </div>
    </section>
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
    ${createMarketplaceHero(content)}
    ${createMarketplaceIntro(content)}
    ${createMarketplaceListings(content)}
    ${createMarketplaceCta(content)}
  `;
}
