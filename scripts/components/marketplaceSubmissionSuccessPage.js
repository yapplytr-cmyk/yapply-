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

export function createMarketplaceSubmissionSuccessPage(content, listing, submissionType) {
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
