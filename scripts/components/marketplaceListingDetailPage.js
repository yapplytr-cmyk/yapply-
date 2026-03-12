import { createButton, createSectionHeading } from "./primitives.js";

function createSummaryGrid(items) {
  return items
    .map(
      (item) => `
        <div>
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `
    )
    .join("");
}

function createMediaSection(detailContent, listing) {
  const attachments = Array.isArray(listing.attachments) ? listing.attachments : [];

  if (attachments.length === 0) {
    return "";
  }

  const imageItems = attachments.filter((item) => item.kind === "image" && item.dataUrl);
  const fileItems = attachments.filter((item) => item.kind !== "image" && item.dataUrl);

  if (imageItems.length === 0 && fileItems.length === 0) {
    return "";
  }

  const galleryMarkup =
    imageItems.length > 0
      ? `
        <div class="marketplace-media-grid">
          ${imageItems
            .map(
              (item) => `
                <a class="marketplace-media-card panel" href="${item.dataUrl}" target="_blank" rel="noreferrer">
                  <img src="${item.dataUrl}" alt="${item.name}" />
                  <span>${item.name}</span>
                </a>
              `
            )
            .join("")}
        </div>
      `
      : "";
  const fileMarkup =
    fileItems.length > 0
      ? `
        <div class="marketplace-file-list">
          ${fileItems
            .map(
              (item) => `
                <a class="marketplace-file-card panel" href="${item.dataUrl}" download="${item.name}">
                  <div>
                    <span>${detailContent.filesLabel}</span>
                    <strong>${item.name}</strong>
                  </div>
                  <span class="marketplace-file-card__action">${detailContent.downloadLabel}</span>
                </a>
              `
            )
            .join("")}
        </div>
      `
      : "";

  return `
    <section class="section-shell" id="listing-media">
      ${createSectionHeading(detailContent.media)}
      ${galleryMarkup}
      ${fileMarkup}
    </section>
  `;
}

function createClientDetail(content, listing) {
  const detailContent = content.marketplaceFlow.detail.client;
  const summaryItems = [
    { label: detailContent.summary.type, value: listing.projectType },
    { label: detailContent.summary.location, value: listing.location },
    { label: detailContent.summary.budget, value: listing.budget },
    { label: detailContent.summary.timeline, value: listing.timeline },
    { label: detailContent.summary.plotStatus, value: listing.plotStatus },
    { label: detailContent.summary.size, value: listing.projectSize || detailContent.fallback },
  ];

  return `
    <section class="marketplace-detail-hero section-shell">
      <div class="marketplace-detail-hero__layout">
        <div class="marketplace-detail-hero__copy">
          <p class="eyebrow">${detailContent.eyebrow}</p>
          <h1 class="hero-title">${listing.title}</h1>
          <p class="hero-lead marketplace-detail-hero__lead">${listing.brief}</p>
          <div class="chip-row">
            ${(listing.tags || []).map((tag) => `<span class="chip">${tag}</span>`).join("")}
          </div>
          <div class="hero-actions">
            ${createButton({ href: "./professional-listing-submission.html", label: detailContent.primaryCta, variant: "primary" })}
            ${createButton({ href: "./open-marketplace.html?tab=client", label: detailContent.secondaryCta, variant: "secondary" })}
          </div>
        </div>
        <div class="project-hero-visual marketplace-detail-visual marketplace-detail-visual--client panel">
          <div class="project-hero-visual__grid"></div>
          <div class="project-hero-board">
            <span>${detailContent.boardTitle}</span>
            <strong>${listing.projectType}</strong>
            <p>${listing.location}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section-shell">
      ${createSectionHeading(detailContent.overview)}
      <div class="project-overview-grid">
        <article class="project-detail-card panel">
          <div class="project-detail-card__facts">
            ${createSummaryGrid(summaryItems)}
          </div>
        </article>
        <article class="project-note panel">
          <h3>${detailContent.styleTitle}</h3>
          <p>${listing.stylePreference || detailContent.fallback}</p>
          <h3>${detailContent.notesTitle}</h3>
          <p>${listing.additionalNotes || detailContent.noNotes}</p>
        </article>
      </div>
    </section>
    ${createMediaSection(detailContent, listing)}
  `;
}

function createProfessionalDetail(content, listing) {
  const detailContent = content.marketplaceFlow.detail.professional;
  const summaryItems = [
    { label: detailContent.summary.specialty, value: listing.specialty },
    { label: detailContent.summary.location, value: listing.location },
    { label: detailContent.summary.experience, value: listing.yearsExperience ? `${listing.yearsExperience} ${detailContent.yearsSuffix}` : detailContent.fallback },
    { label: detailContent.summary.price, value: listing.startingPrice || detailContent.fallback },
  ];
  const services = (listing.services || [])
    .map(
      (service) => `
        <article class="detail-list-card developer-service-card">
          <h3>${service}</h3>
          <p>${detailContent.serviceDescription}</p>
        </article>
      `
    )
    .join("");
  const websiteBlock = listing.websiteUrl
    ? `
      <h3>${detailContent.websiteTitle}</h3>
      <p>${listing.websiteUrl}</p>
    `
    : "";

  return `
    <section class="marketplace-detail-hero section-shell">
      <div class="marketplace-detail-hero__layout">
        <div class="marketplace-detail-hero__copy">
          <p class="eyebrow">${detailContent.eyebrow}</p>
          <h1 class="hero-title">${listing.name}</h1>
          <p class="hero-lead marketplace-detail-hero__lead">${listing.summary || detailContent.fallback}</p>
          <div class="chip-row">
            ${(listing.tags || []).map((tag) => `<span class="chip">${tag}</span>`).join("")}
          </div>
          <div class="hero-actions">
            ${createButton({ href: "#listing-contact", label: detailContent.primaryCta, variant: "primary" })}
            ${createButton({ href: "./open-marketplace.html?tab=developer", label: detailContent.secondaryCta, variant: "secondary" })}
          </div>
        </div>
        <div class="developer-profile-visual panel">
          <div class="developer-profile-visual__grid"></div>
          <img class="developer-profile-visual__image" src="${listing.imageSrc}" alt="${listing.name}" />
          <div class="developer-profile-visual__caption">
            <span>${detailContent.boardTitle}</span>
            <strong>${listing.specialty}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="section-shell">
      ${createSectionHeading(detailContent.overview)}
      <div class="project-overview-grid">
        <article class="project-detail-card panel">
          <div class="project-detail-card__facts">
            ${createSummaryGrid(summaryItems)}
          </div>
        </article>
        <article class="project-note panel">
          <h3>${detailContent.portfolioTitle}</h3>
          <p>${listing.portfolioSummary || listing.summary || detailContent.fallback}</p>
          ${websiteBlock}
        </article>
      </div>
    </section>
    ${createMediaSection(detailContent, listing)}

    <section class="section-shell" id="listing-services">
      ${createSectionHeading(detailContent.services)}
      <div class="detail-list-grid">${services}</div>
    </section>

    <section class="section-shell" id="listing-contact">
      ${createSectionHeading(detailContent.contact)}
      <div class="project-inquiry-layout">
        <article class="panel project-inquiry-summary developer-inquiry-summary">
          <span class="project-inquiry-summary__eyebrow">${detailContent.contactSummary}</span>
          <h3>${listing.name}</h3>
          <div class="project-inquiry-summary__grid">
            ${createSummaryGrid(summaryItems)}
          </div>
        </article>
        <div class="panel application-panel project-inquiry-panel">
          <div class="project-inquiry-panel__intro">
            <h3>${detailContent.contact.formTitle}</h3>
            <p>${detailContent.contact.formIntro}</p>
          </div>
          <form class="application-form project-inquiry-form" data-marketplace-listing-inquiry-form novalidate>
            <input type="hidden" name="professionalName" value="${listing.name}" data-marketplace-listing-name-field />
            <label class="form-field">
              <span>${detailContent.contact.fields.fullName}</span>
              <input type="text" name="fullName" placeholder="${detailContent.contact.placeholders.fullName}" required />
            </label>
            <label class="form-field">
              <span>${detailContent.contact.fields.email}</span>
              <input type="email" name="email" placeholder="${detailContent.contact.placeholders.email}" required />
            </label>
            <label class="form-field">
              <span>${detailContent.contact.fields.message}</span>
              <textarea name="message" rows="5" placeholder="${detailContent.contact.placeholders.message}" required></textarea>
            </label>
            <div class="form-actions form-field--full">
              <button class="button button--primary" type="submit">${detailContent.contact.submitLabel}</button>
            </div>
          </form>
          <div class="form-success project-inquiry-success" data-marketplace-listing-inquiry-success hidden>
            <h3>${detailContent.contact.successTitle}</h3>
            <p>${detailContent.contact.successText} <strong data-marketplace-listing-success-name>${listing.name}</strong>.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function createMarketplaceListingDetailPage(content, listingType, listing) {
  if (!listing) {
    return `
      <section class="section-shell marketplace-success">
        <div class="project-cta-panel panel marketplace-success-panel">
          <div>
            <p class="eyebrow">${content.marketplaceFlow.detail.missingEyebrow}</p>
            <h1 class="hero-title marketplace-success__title">${content.marketplaceFlow.detail.missingTitle}</h1>
            <p class="hero-lead">${content.marketplaceFlow.detail.missingDescription}</p>
          </div>
          <div class="hero-actions">
            ${createButton({ href: "./open-marketplace.html", label: content.marketplaceFlow.detail.backToMarketplace, variant: "primary" })}
          </div>
        </div>
      </section>
    `;
  }

  if (listingType === "professional") {
    return createProfessionalDetail(content, listing);
  }

  return createClientDetail(content, listing);
}
