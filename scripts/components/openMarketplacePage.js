import { getMarketplaceListingHref } from "../core/marketplaceStore.js";
import { createButton, createSectionHeading } from "./primitives.js";

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

function createClientListingCard(listing, labels) {
  const ctaHref = listing.detailHref || getMarketplaceListingHref("client", listing.id || listing.slug);

  return `
    <article class="marketplace-card panel">
      <div class="marketplace-card__top">
        <span class="project-badge">${listing.projectType}</span>
        <span class="marketplace-card__location">${listing.location}</span>
      </div>
      <h3>${listing.title}</h3>
      <p class="marketplace-card__brief">${listing.brief}</p>
      <div class="marketplace-card__tags">
        ${listing.tags.map((tag) => `<span class="marketplace-tag">${tag}</span>`).join("")}
      </div>
      <div class="marketplace-card__facts">
        <div>
          <span>${labels.budget}</span>
          <strong>${listing.budget}</strong>
        </div>
        <div>
          <span>${labels.startDate}</span>
          <strong>${listing.startDate}</strong>
        </div>
        <div>
          <span>${labels.plotStatus}</span>
          <strong>${listing.plotStatus}</strong>
        </div>
      </div>
      <div class="marketplace-card__footer">
        <div class="marketplace-card__timeline">
          <span>${labels.timeline}</span>
          <strong>${listing.timeline}</strong>
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
  const clientCards = content.tabs.client.items
    .map((item) => createClientListingCard(item, content.tabs.client.labels))
    .join("");
  const developerCards = content.tabs.developer.items
    .map((item) => createDeveloperListingCard(item, content.tabs.developer.labels))
    .join("");

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
        <div class="marketplace-grid">${clientCards}</div>
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
