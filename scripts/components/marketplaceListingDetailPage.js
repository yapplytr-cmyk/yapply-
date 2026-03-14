import { createButton, createSectionHeading } from "./primitives.js";

const LISTING_STATUS_LABELS = {
  "open-for-bids": { en: "Open for Bids", tr: "Tekliflere Açık" },
  closed: { en: "Closed", tr: "Kapalı" },
  awarded: { en: "Awarded", tr: "Verildi" },
  "in-progress": { en: "In Progress", tr: "Sürüyor" },
  completed: { en: "Completed", tr: "Tamamlandı" },
};

const PROJECT_STATUS_LABELS = {
  "not-started": { en: "Not Started", tr: "Başlanmadı" },
  "planning-stage": { en: "Planning Stage", tr: "Planlama Aşaması" },
  "in-construction": { en: "In Construction", tr: "İnşaat Halinde" },
  "renovation-needed": { en: "Renovation Needed", tr: "Renovasyon Gerekli" },
  "shell-structure-complete": { en: "Shell Structure Complete", tr: "Kaba Yapı Tamam" },
  "interior-work-needed": { en: "Interior Work Needed", tr: "İç Mekan İşleri Gerekli" },
  "exterior-work-needed": { en: "Exterior Work Needed", tr: "Dış Mekan İşleri Gerekli" },
  "landscape-needed": { en: "Landscape Needed", tr: "Peyzaj Gerekli" },
  other: { en: "Other", tr: "Diğer" },
};

function getDetailLocale(content) {
  return content.meta?.locale === "tr" ? "tr" : "en";
}

function getDetailCopy(locale) {
  if (locale === "tr") {
    return {
      fallback: "Belirtilmedi",
      subcategory: "Alt Kategori",
      permitsStatus: "İzin / Plan Durumu",
      constructionStarted: "İnşaat Başladı mı?",
      listingStatus: "İlan Durumu",
      bidForm: {
        eyebrow: "Geliştirici Teklifi",
        title: "Bu proje için teklif verin.",
        description: "Yalnızca giriş yapmış geliştirici hesapları açık müşteri ilanlarına teklif verebilir.",
        noteTitle: "Güçlü bir teklif için",
        noteBody: "Net fiyat aralığı, gerçekçi tamamlanma süresi ve kısa ama güven veren bir teklif notu paylaşın.",
        closedTitle: "Teklif verme kapalı",
        closedDescription: "Bu ilan şu anda yeni geliştirici tekliflerine açık değil.",
        guestTitle: "Teklif vermek için geliştirici hesabıyla giriş yapın.",
        guestDescription: "İlanı inceleyebilirsiniz, ancak teklif göndermek için aktif bir geliştirici hesabı gerekir.",
        roleTitle: "Yalnızca geliştirici hesapları teklif verebilir.",
        roleDescription: "Müşteri hesapları bu ilanı görüntüleyebilir fakat teklif gönderemez.",
        amount: "Teklif Tutarı",
        timeframe: "Tamamlanma Süresi",
        proposal: "Teklif Mesajı",
        amountPlaceholder: "Örn. EUR 480K - 620K",
        timeframePlaceholder: "Örn. 5-7 ay",
        proposalPlaceholder: "Kısa yaklaşımınızı, kapsamı nasıl ele alacağınızı ve neden uygun olduğunuzu yazın.",
        submit: "Teklif Gönder",
        successTitle: "Teklifiniz gönderildi.",
        successText: "Teklif şimdi bu ilanın son teklifler alanında görünecek.",
        errorTitle: "Teklif gönderilemedi",
        errorFallback: "Teklifiniz şu anda kaydedilemedi. Lütfen tekrar deneyin.",
      },
      latestBids: {
        eyebrow: "Son Teklifler",
        title: "Bu ilan için son teklifler",
        description: "Canlı teklif akışı ilerledikçe en yeni 3-4 geliştirici teklifi burada görünecek.",
        empty: "Henüz teklif yok.",
        amount: "Teklif Tutarı",
        timeframe: "Tamamlanma Süresi",
        proposal: "Teklif Notu",
        bidder: "Geliştirici",
        rating: "Puan",
        submitted: "Gönderildi",
        noRating: "Henüz puan yok",
      },
    };
  }

  return {
    fallback: "Not provided",
    subcategory: "Subcategory",
    permitsStatus: "Permits / Plans",
    constructionStarted: "Construction Started",
    listingStatus: "Listing Status",
    bidForm: {
      eyebrow: "Developer Bid",
      title: "Submit a bid for this project.",
      description: "Only signed-in developer accounts can bid on open client project listings.",
      noteTitle: "For a stronger bid",
      noteBody: "Share a clear amount range, a realistic delivery window, and a short proposal that builds confidence quickly.",
      closedTitle: "Bidding is closed",
      closedDescription: "This listing is not currently accepting new developer bids.",
      guestTitle: "Sign in with a developer account to place a bid.",
      guestDescription: "You can review the listing publicly, but bidding requires an active developer account.",
      roleTitle: "Only developer accounts can submit bids.",
      roleDescription: "Client accounts can view this listing but cannot place bids.",
      amount: "Bid Amount",
      timeframe: "Completion Timeframe",
      proposal: "Proposal",
      amountPlaceholder: "Example: EUR 480K - 620K",
      timeframePlaceholder: "Example: 5-7 months",
      proposalPlaceholder: "Share your approach, delivery confidence, and why your team is a fit for the project.",
      submit: "Submit Bid",
      successTitle: "Your bid was submitted.",
      successText: "The bid will now appear in the latest bids area for this listing.",
      errorTitle: "Bid could not be submitted",
      errorFallback: "Your bid could not be saved right now. Please try again.",
    },
    latestBids: {
      eyebrow: "Latest bids",
      title: "Recent bids for this listing",
      description: "When live developer bidding begins, the latest 3-4 proposals will appear here.",
      empty: "No bids yet.",
      amount: "Bid Amount",
      timeframe: "Completion Timeframe",
      proposal: "Proposal",
      bidder: "Developer",
      rating: "Rating",
      submitted: "Submitted",
      noRating: "No rating yet",
    },
  };
}

function getListingStatusLabel(value, locale, fallback) {
  const labels = LISTING_STATUS_LABELS[value];
  if (labels) {
    return locale === "tr" ? labels.tr : labels.en;
  }

  return fallback;
}

function getProjectStatusLabel(value, locale, fallback) {
  const labels = PROJECT_STATUS_LABELS[value];
  if (labels) {
    return locale === "tr" ? labels.tr : labels.en;
  }

  return fallback;
}

function formatRelativeTime(value, locale, fallback) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const diffMs = date.getTime() - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const rtf = new Intl.RelativeTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { numeric: "auto" });

  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }

  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }

  if (Math.abs(diffMs) < week) {
    return rtf.format(Math.round(diffMs / day), "day");
  }

  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatBidRating(reference, locale, fallback) {
  const ratingAverage = Number(reference?.ratingAverage);
  const ratingCount = Number(reference?.ratingCount || 0);

  if (!Number.isFinite(ratingAverage) || ratingAverage <= 0) {
    return fallback;
  }

  if (locale === "tr") {
    return `${ratingAverage.toFixed(1)} / 5${ratingCount > 0 ? ` · ${ratingCount} değerlendirme` : ""}`;
  }

  return `${ratingAverage.toFixed(1)} / 5${ratingCount > 0 ? ` · ${ratingCount} reviews` : ""}`;
}

function createBidSubmissionSection(content, listing) {
  const locale = getDetailLocale(content);
  const copy = getDetailCopy(locale);
  const bidForm = copy.bidForm;
  const viewerSession = content.viewerSession || { authenticated: false, user: null };
  const viewerRole = viewerSession.user?.role || "";
  const listingStatus = (listing.marketplaceMeta || {}).listingStatus || listing.status;

  let bodyMarkup = "";

  if (listingStatus !== "open-for-bids") {
    bodyMarkup = `
      <div class="marketplace-empty panel">
        <h3>${bidForm.closedTitle}</h3>
        <p>${bidForm.closedDescription}</p>
      </div>
    `;
  } else if (!viewerSession.authenticated) {
    bodyMarkup = `
      <div class="marketplace-empty panel">
        <h3>${bidForm.guestTitle}</h3>
        <p>${bidForm.guestDescription}</p>
      </div>
    `;
  } else if (viewerRole !== "developer") {
    bodyMarkup = `
      <div class="marketplace-empty panel">
        <h3>${bidForm.roleTitle}</h3>
        <p>${bidForm.roleDescription}</p>
      </div>
    `;
  } else {
    bodyMarkup = `
      <div class="project-overview-grid">
        <article class="project-note panel">
          <h3>${bidForm.noteTitle}</h3>
          <p>${bidForm.noteBody}</p>
        </article>
        <div class="panel application-panel">
          <form class="application-form" data-marketplace-bid-form novalidate>
            <input type="hidden" name="listingId" value="${listing.id}" />
            <div class="auth-form-error form-field--full" data-marketplace-bid-error hidden>
              <strong data-marketplace-bid-error-title>${bidForm.errorTitle}</strong>
              <p data-marketplace-bid-error-text>${bidForm.errorFallback}</p>
            </div>
            <label class="form-field">
              <span>${bidForm.amount}</span>
              <input type="text" name="bidAmount" placeholder="${bidForm.amountPlaceholder}" required />
            </label>
            <label class="form-field">
              <span>${bidForm.timeframe}</span>
              <input type="text" name="estimatedCompletionTimeframe" placeholder="${bidForm.timeframePlaceholder}" required />
            </label>
            <label class="form-field form-field--full">
              <span>${bidForm.proposal}</span>
              <textarea name="proposalMessage" rows="5" placeholder="${bidForm.proposalPlaceholder}" required></textarea>
            </label>
            <div class="form-actions form-field--full">
              <button class="button button--primary" type="submit">${bidForm.submit}</button>
            </div>
          </form>
          <div class="form-success" data-marketplace-bid-success hidden>
            <h3>${bidForm.successTitle}</h3>
            <p>${bidForm.successText}</p>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <section class="section-shell" id="listing-bid-submit">
      ${createSectionHeading({
        eyebrow: bidForm.eyebrow,
        title: bidForm.title,
        description: bidForm.description,
      })}
      ${bodyMarkup}
    </section>
  `;
}

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
  const locale = getDetailLocale(content);
  const copy = getDetailCopy(locale);
  const marketplaceMeta = listing.marketplaceMeta || {};
  const categoryLabel = listing.projectType || copy.fallback;
  const locationLabel = listing.location || marketplaceMeta.location || copy.fallback;
  const budgetLabel = listing.budget || marketplaceMeta.budgetRange?.label || copy.fallback;
  const timeframeLabel = listing.timeline || marketplaceMeta.desiredTimeframe?.label || listing.startDate || copy.fallback;
  const projectStatusLabel = listing.plotStatus
    || getProjectStatusLabel(marketplaceMeta.projectStatus, locale, copy.fallback);
  const listingStatus = getListingStatusLabel(
    marketplaceMeta.listingStatus || listing.status,
    locale,
    listing.status || copy.fallback
  );
  const summaryItems = [
    { label: detailContent.summary.type, value: categoryLabel },
    { label: copy.subcategory, value: marketplaceMeta.subcategory || copy.fallback },
    { label: detailContent.summary.location, value: locationLabel },
    { label: detailContent.summary.budget, value: budgetLabel },
    { label: detailContent.summary.timeline, value: timeframeLabel },
    { label: detailContent.summary.plotStatus, value: projectStatusLabel },
    { label: detailContent.summary.size, value: listing.projectSize || detailContent.fallback },
    { label: copy.permitsStatus, value: marketplaceMeta.permitsStatus || listing.permitsStatus || copy.fallback },
    { label: copy.constructionStarted, value: marketplaceMeta.constructionStarted || listing.constructionStarted || copy.fallback },
    { label: copy.listingStatus, value: listingStatus },
  ];
  const latestBids = Array.isArray(marketplaceMeta.latestBids) ? marketplaceMeta.latestBids.slice(0, 4) : [];
  const latestBidsMarkup =
    latestBids.length > 0
      ? `
        <div class="detail-list-grid marketplace-bids-grid">
          ${latestBids
            .map((bid) => {
              const developerReference = bid.developerProfileReference || {};
              const developerName =
                developerReference.companyName ||
                developerReference.userId ||
                copy.fallback;
              const ratingLabel = formatBidRating(developerReference, locale, copy.latestBids.noRating);
              const submittedLabel = formatRelativeTime(bid.createdAt, locale, copy.fallback);
              return `
                <article class="detail-list-card marketplace-bid-card">
                  <div class="project-detail-card__facts">
                    ${createSummaryGrid([
                      { label: copy.latestBids.bidder, value: developerName },
                      { label: copy.latestBids.amount, value: bid.bidAmount?.label || copy.fallback },
                      { label: copy.latestBids.timeframe, value: bid.estimatedCompletionTimeframe?.label || copy.fallback },
                      { label: copy.latestBids.rating, value: ratingLabel },
                      { label: copy.latestBids.submitted, value: submittedLabel },
                    ])}
                  </div>
                  <p><strong>${copy.latestBids.proposal}</strong></p>
                  <p>${bid.proposalMessage || copy.fallback}</p>
                </article>
              `;
            })
            .join("")}
        </div>
      `
      : `<div class="marketplace-empty panel"><p>${copy.latestBids.empty}</p></div>`;

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
    ${createBidSubmissionSection(content, listing)}
    <section class="section-shell" id="listing-bids">
      ${createSectionHeading(copy.latestBids)}
      ${latestBidsMarkup}
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
