import { getMarketplaceListingHref } from "../core/marketplaceStore.js";
import { createButton } from "./primitives.js";

function createSummaryItems(items) {
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

function createAttachmentMarkup(attachments = [], isTr = false) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return "";
  }

  const imageItems = attachments.filter((item) => item.kind === "image" && item.dataUrl);
  const fileItems = attachments.filter((item) => item.kind !== "image" && item.dataUrl);

  if (imageItems.length === 0 && fileItems.length === 0) {
    return "";
  }

  return `
    <div class="marketplace-success__media">
      ${imageItems.length > 0
        ? `
          <div class="marketplace-media-grid">
            ${imageItems
              .map(
                (item) => `
                  <a class="marketplace-media-card panel" href="${item.dataUrl}" target="_blank" rel="noreferrer">
                    <img src="${item.dataUrl}" alt="${item.name}" loading="lazy" decoding="async" fetchpriority="low" />
                    <span>${item.name}</span>
                  </a>
                `
              )
              .join("")}
          </div>
        `
        : ""}
      ${fileItems.length > 0
        ? `
          <div class="marketplace-file-list">
            ${fileItems
              .map(
                (item) => `
                  <a class="marketplace-file-card panel" href="${item.dataUrl}" download="${item.name}">
                    <div>
                      <span>${isTr ? "Ek Dosya" : "Attachment"}</span>
                      <strong>${item.name}</strong>
                    </div>
                    <span class="marketplace-file-card__action">${isTr ? "İndir" : "Download"}</span>
                  </a>
                `
              )
              .join("")}
          </div>
        `
        : ""}
    </div>
  `;
}

export function createMarketplaceSubmissionSuccessPage(content, listing, submissionType) {
  const isTr = content?.meta?.locale === "tr";
  const pageContent = content.marketplaceFlow.success[submissionType];

  if (!listing) {
    return `
      <section class="section-shell marketplace-success">
        <div class="project-cta-panel panel marketplace-success-panel">
          <div>
            <p class="eyebrow">${pageContent.eyebrow}</p>
            <h1 class="hero-title marketplace-success__title">${pageContent.missingTitle}</h1>
            <p class="hero-lead">${pageContent.missingDescription}</p>
          </div>
          <div class="hero-actions">
            ${createButton({ href: "./open-marketplace.html", label: pageContent.backToMarketplace, variant: "secondary" })}
            ${createButton({ href: pageContent.submitAnotherHref, label: pageContent.submitAnother, variant: "primary" })}
          </div>
        </div>
      </section>
    `;
  }

  const summaryItems = submissionType === "professional"
    ? [
        { label: pageContent.summary.company, value: listing.name },
        { label: pageContent.summary.specialty, value: listing.specialty },
        { label: pageContent.summary.location, value: listing.location },
        { label: pageContent.summary.price, value: listing.startingPrice },
      ]
    : [
        { label: pageContent.summary.project, value: listing.title },
        { label: pageContent.summary.type, value: listing.projectType },
        { label: pageContent.summary.location, value: listing.location },
        { label: pageContent.summary.budget, value: listing.budget },
      ];

  const detailMarkup =
    submissionType === "professional"
      ? `
        <div class="project-overview-grid marketplace-success__details">
          <article class="project-detail-card panel">
            <div class="project-detail-card__facts">
              ${createSummaryItems([
                { label: pageContent.summary.company, value: listing.name },
                { label: pageContent.summary.specialty, value: listing.specialty },
                { label: pageContent.summary.location, value: listing.location },
                { label: pageContent.summary.price, value: listing.startingPrice },
              ])}
            </div>
          </article>
          <article class="project-note panel">
            <h3>${listing.name}</h3>
            <p>${listing.summary || listing.portfolioSummary || ""}</p>
          </article>
        </div>
      `
      : `
        <div class="project-overview-grid marketplace-success__details">
          <article class="project-detail-card panel">
            <div class="project-detail-card__facts">
              ${createSummaryItems([
                { label: pageContent.summary.project, value: listing.title },
                { label: pageContent.summary.type, value: listing.projectType },
                { label: pageContent.summary.location, value: listing.location },
                { label: pageContent.summary.budget, value: listing.budget },
                { label: pageContent.summary.timeline || (isTr ? "Zaman Çizelgesi" : "Timeline"), value: listing.timeline },
                { label: pageContent.summary.plotStatus || (isTr ? "Arsa Durumu" : "Plot Status"), value: listing.plotStatus },
              ])}
            </div>
          </article>
          <article class="project-note panel">
            <h3>${listing.title}</h3>
            <p>${listing.brief || ""}</p>
          </article>
        </div>
      `;

  return `
    <section class="section-shell marketplace-success">
      <div class="project-cta-panel panel marketplace-success-panel">
        <div class="marketplace-success__copy">
          <p class="eyebrow">${pageContent.eyebrow}</p>
          <h1 class="hero-title marketplace-success__title">${pageContent.title}</h1>
          <p class="hero-lead">${pageContent.description}</p>
        </div>
        <div class="submission-summary__grid marketplace-success__summary">
          ${createSummaryItems(summaryItems)}
        </div>
        ${detailMarkup}
        ${createAttachmentMarkup(listing.attachments, isTr)}
        <div class="hero-actions">
          ${createButton({ href: getMarketplaceListingHref(submissionType, listing.id), label: pageContent.viewListing, variant: "primary" })}
          ${createButton({ href: pageContent.marketplaceHref, label: pageContent.backToMarketplace, variant: "secondary" })}
          ${createButton({ href: pageContent.submitAnotherHref, label: pageContent.submitAnother, variant: "secondary" })}
        </div>
        <p class="marketplace-success__note">${pageContent.note}</p>
      </div>
    </section>
  `;
}
