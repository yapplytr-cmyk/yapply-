const CLIENT_LISTING_TYPE = "client";
const PROFESSIONAL_LISTING_TYPE = "professional";
const DEFAULT_CLIENT_CATEGORY = "custom-project";
const DEFAULT_PROFESSIONAL_CATEGORY = "general-construction";
const DEFAULT_LISTING_STATUS = "open-for-bids";
const DEFAULT_BID_STATUS = "submitted";
const BID_PREVIEW_LIMIT = 4;

export const MARKETPLACE_CATEGORY_OPTIONS = [
  { value: "pool-renovation", label: "Pool Renovation" },
  { value: "pool-construction", label: "Pool Construction" },
  { value: "wall-construction", label: "Wall Construction" },
  { value: "interior-renovation", label: "Interior Renovation" },
  { value: "kitchen-renovation", label: "Kitchen Renovation" },
  { value: "bathroom-renovation", label: "Bathroom Renovation" },
  { value: "full-villa-construction", label: "Full Villa Construction" },
  { value: "landscaping", label: "Landscaping" },
  { value: "exterior-renovation", label: "Exterior Renovation" },
  { value: "roofing", label: "Roofing" },
  { value: "flooring", label: "Flooring" },
  { value: "painting", label: "Painting" },
  { value: "tiling", label: "Tiling" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "facade-work", label: "Facade Work" },
  { value: "garden-design", label: "Garden Design" },
  { value: "pergola-outdoor-structures", label: "Pergola / Outdoor Structures" },
  { value: "demolition-site-prep", label: "Demolition / Site Prep" },
  { value: "general-construction", label: "General Construction" },
  { value: "architecture-design", label: "Architecture / Design" },
  { value: "custom-project", label: "Custom Project" },
];

export const MARKETPLACE_PROJECT_STATUS_OPTIONS = [
  { value: "not-started", label: "Not Started" },
  { value: "planning-stage", label: "Planning Stage" },
  { value: "in-construction", label: "In Construction" },
  { value: "renovation-needed", label: "Renovation Needed" },
  { value: "shell-structure-complete", label: "Shell Structure Complete" },
  { value: "interior-work-needed", label: "Interior Work Needed" },
  { value: "exterior-work-needed", label: "Exterior Work Needed" },
  { value: "landscape-needed", label: "Landscape Needed" },
  { value: "other", label: "Other" },
];

export const MARKETPLACE_LISTING_STATUS_OPTIONS = [
  { value: "open-for-bids", label: "Open for Bids" },
  { value: "closed", label: "Closed" },
  { value: "awarded", label: "Awarded" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export const MARKETPLACE_BID_STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "declined", label: "Declined" },
  { value: "accepted", label: "Accepted" },
];

const CATEGORY_VALUES = new Set(MARKETPLACE_CATEGORY_OPTIONS.map((option) => option.value));
const PROJECT_STATUS_VALUES = new Set(MARKETPLACE_PROJECT_STATUS_OPTIONS.map((option) => option.value));
const LISTING_STATUS_VALUES = new Set(MARKETPLACE_LISTING_STATUS_OPTIONS.map((option) => option.value));
const BID_STATUS_VALUES = new Set(MARKETPLACE_BID_STATUS_OPTIONS.map((option) => option.value));

const CATEGORY_ALIASES = new Map([
  ["villa-build", "full-villa-construction"],
  ["villa-yapimi", "full-villa-construction"],
  ["apartment-renovation", "interior-renovation"],
  ["daire-renovasyonu", "interior-renovation"],
  ["commercial-project", "general-construction"],
  ["ticari-proje", "general-construction"],
  ["residential-development", "full-villa-construction"],
  ["konut-gelistirme", "full-villa-construction"],
  ["hospitality-concept", "architecture-design"],
  ["konaklama-konsepti", "architecture-design"],
  ["renovation", "interior-renovation"],
  ["luxury-residence", "full-villa-construction"],
  ["development-study", "architecture-design"],
  ["architect", "architecture-design"],
  ["architect-design", "architecture-design"],
  ["architecture", "architecture-design"],
  ["interior-design", "interior-renovation"],
  ["contractor", "general-construction"],
  ["construction-company", "general-construction"],
  ["landscape-design", "garden-design"],
]);

const PROJECT_STATUS_ALIASES = new Map([
  ["i-already-own-the-plot", "not-started"],
  ["arsa-bana-ait", "not-started"],
  ["plot-reserved-under-review", "planning-stage"],
  ["arsa-rezerve-inceleme-asamasinda", "planning-stage"],
  ["looking-for-land-options", "planning-stage"],
  ["arsa-secenekleri-araniyor", "planning-stage"],
  ["need-advisory-support-on-land-and-feasibility", "other"],
  ["arsa-ve-fizibilite-danismanligina-ihtiyacim-var", "other"],
  ["plot-secured", "not-started"],
  ["existing-apartment-owned", "renovation-needed"],
  ["land-owned-feasibility-open", "planning-stage"],
  ["site-under-review", "planning-stage"],
  ["land-shortlist-in-progress", "planning-stage"],
  ["land-option-under-negotiation", "planning-stage"],
]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function slugifyValue(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseBudgetToken(token) {
  const match = String(token).trim().match(/(\d+(?:\.\d+)?)\s*([kKmM]?)/);
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1]);
  if (Number.isNaN(amount)) {
    return null;
  }

  const suffix = match[2].toLowerCase();
  if (suffix === "m") {
    return Math.round(amount * 1_000_000);
  }
  if (suffix === "k") {
    return Math.round(amount * 1_000);
  }
  return Math.round(amount);
}

export function normalizeMarketplaceCategory(value, listingType = CLIENT_LISTING_TYPE) {
  const slug = slugifyValue(value);
  const resolved = CATEGORY_ALIASES.get(slug) || slug;

  if (CATEGORY_VALUES.has(resolved)) {
    return resolved;
  }

  return listingType === PROFESSIONAL_LISTING_TYPE ? DEFAULT_PROFESSIONAL_CATEGORY : DEFAULT_CLIENT_CATEGORY;
}

export function normalizeMarketplaceProjectStatus(value) {
  const slug = slugifyValue(value);
  const resolved = PROJECT_STATUS_ALIASES.get(slug) || slug;

  if (PROJECT_STATUS_VALUES.has(resolved)) {
    return resolved;
  }

  return value ? "other" : "not-started";
}

export function normalizeMarketplaceListingStatus(value) {
  const slug = slugifyValue(value);
  return LISTING_STATUS_VALUES.has(slug) ? slug : DEFAULT_LISTING_STATUS;
}

export function normalizeMarketplaceBidStatus(value) {
  const slug = slugifyValue(value);
  return BID_STATUS_VALUES.has(slug) ? slug : DEFAULT_BID_STATUS;
}

export function normalizeMarketplaceBudgetRange(value) {
  const label = normalizeText(value);
  if (!label) {
    return null;
  }

  const tokens = label.split(/-|–|—|to/i).map((item) => item.trim()).filter(Boolean);
  const lowerLabel = label.toLowerCase();
  const minimum = tokens[0] ? parseBudgetToken(tokens[0]) : null;
  const maximum = tokens[1] ? parseBudgetToken(tokens[1]) : null;

  return {
    label,
    currency: lowerLabel.includes("eur") ? "EUR" : null,
    minAmount: lowerLabel.includes("under") || lowerLabel.includes("alti") ? null : minimum,
    maxAmount: lowerLabel.includes("+") ? null : maximum || minimum,
    isFlexible: lowerLabel.includes("tbd") || lowerLabel.includes("flex") || lowerLabel.includes("custom"),
  };
}

export function normalizeMarketplaceDesiredTimeframe(value) {
  const label = normalizeText(value);
  if (!label) {
    return null;
  }

  return {
    label,
    estimatedDays: null,
    unit: "custom",
  };
}

export function createMarketplacePhotoReferences(attachments = []) {
  return attachments
    .filter((item) => item && item.kind === "image")
    .slice(0, 8)
    .map((item) => ({
      id: item.id || null,
      name: item.name || null,
      mimeType: item.mimeType || null,
      kind: item.kind || "image",
    }));
}

export function createDeveloperProfileReference(source = {}) {
  const specialties = Array.isArray(source.specialties)
    ? source.specialties.map((entry) => normalizeText(entry)).filter(Boolean).slice(0, 6)
    : normalizeText(source.specialties)
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 6);
  const portfolioImages = Array.isArray(source.portfolioImages)
    ? source.portfolioImages.filter(Boolean).slice(0, 6)
    : [];
  const portfolioProjects = Array.isArray(source.portfolioProjects)
    ? source.portfolioProjects.filter(Boolean).slice(0, 4)
    : [];

  return {
    userId: normalizeText(source.userId || source.id) || null,
    companyName: normalizeText(source.companyName || source.name) || null,
    specialties,
    ratingAverage: Number.isFinite(Number(source.ratingAverage)) ? Number(source.ratingAverage) : null,
    ratingCount: Number.isFinite(Number(source.ratingCount)) ? Number(source.ratingCount) : 0,
    portfolioImages,
    portfolioProjects,
  };
}

export function validateMarketplaceListingDraft(listing) {
  if (!listing || typeof listing !== "object") {
    throw Object.assign(new Error("A marketplace listing payload is required."), { code: "INVALID_LISTING" });
  }

  const listingType = listing.type;
  const title = normalizeText(listing.title || listing.name);
  const location = normalizeText(listing.location);
  const description = normalizeText(listing.brief || listing.summary || listing.portfolioSummary);
  const existingMarketplaceMeta =
    listing.marketplaceMeta && typeof listing.marketplaceMeta === "object" ? listing.marketplaceMeta : {};

  if (listingType !== CLIENT_LISTING_TYPE && listingType !== PROFESSIONAL_LISTING_TYPE) {
    throw Object.assign(new Error("A valid marketplace listing type is required."), { code: "INVALID_LISTING" });
  }

  if (!title) {
    throw Object.assign(new Error("A listing title is required."), { code: "INVALID_LISTING" });
  }

  if (!location) {
    throw Object.assign(new Error("A listing location is required."), { code: "INVALID_LISTING" });
  }

  if (!description) {
    throw Object.assign(new Error("A listing description is required."), { code: "INVALID_LISTING" });
  }

  const categorySeed =
    listingType === CLIENT_LISTING_TYPE
      ? listing.marketplaceCategory || listing.projectType
      : listing.marketplaceCategory || listing.specialty || listing.services?.[0];
  const category = normalizeMarketplaceCategory(categorySeed, listingType);
  const subcategory = normalizeText(
    listing.marketplaceSubcategory ||
      (listingType === CLIENT_LISTING_TYPE ? listing.projectType : listing.specialty || listing.services?.[0])
  );
  const projectStatus = normalizeMarketplaceProjectStatus(listing.marketplaceProjectStatus || listing.plotStatus);
  const listingStatus = normalizeMarketplaceListingStatus(listing.marketplaceListingStatus || listing.status);
  const budgetRange = normalizeMarketplaceBudgetRange(
    listing.marketplaceBudgetRange?.label || listing.budget || listing.startingPrice
  );
  const desiredTimeframe = normalizeMarketplaceDesiredTimeframe(
    listing.marketplaceDesiredTimeframe?.label || listing.timeline || listing.startDate || listing.deliveryRange
  );
  const photoReferences = createMarketplacePhotoReferences(listing.attachments);
  const latestBids = Array.isArray(existingMarketplaceMeta.latestBids)
    ? existingMarketplaceMeta.latestBids.slice(0, BID_PREVIEW_LIMIT)
    : [];
  const bidCount = Number.isFinite(Number(existingMarketplaceMeta.bidCount)) ? Number(existingMarketplaceMeta.bidCount) : 0;
  const permitsStatus = normalizeText(existingMarketplaceMeta.permitsStatus || listing.permitsStatus);
  const constructionStarted = normalizeText(existingMarketplaceMeta.constructionStarted || listing.constructionStarted);

  if (listingType === CLIENT_LISTING_TYPE) {
    if (!normalizeText(listing.marketplaceCategory || listing.projectType)) {
      throw Object.assign(new Error("A client listing category is required."), { code: "INVALID_LISTING" });
    }

    if (!normalizeText(listing.marketplaceProjectStatus || listing.plotStatus)) {
      throw Object.assign(new Error("A land or project status is required."), { code: "INVALID_LISTING" });
    }

    if (!constructionStarted) {
      throw Object.assign(new Error("Please indicate whether construction has started."), { code: "INVALID_LISTING" });
    }

    if (photoReferences.length === 0) {
      throw Object.assign(new Error("At least one area or project photo is required."), { code: "INVALID_LISTING" });
    }
  }

  return {
    ...listing,
    marketplaceMeta: {
      ...existingMarketplaceMeta,
      schemaVersion: 1,
      category,
      subcategory: subcategory && slugifyValue(subcategory) !== category ? subcategory : "",
      location,
      budgetRange,
      desiredTimeframe,
      projectStatus,
      listingStatus,
      permitsStatus,
      constructionStarted,
      photoReferences,
      latestBids,
      bidCount,
      developerProfileReference:
        listingType === PROFESSIONAL_LISTING_TYPE
          ? createDeveloperProfileReference({
              userId: listing.ownerUserId,
              companyName: listing.name,
              specialties: listing.services,
              portfolioImages: photoReferences,
              ratingAverage: listing.ratingAverage,
              ratingCount: listing.ratingCount,
            })
          : null,
    },
  };
}

export function validateMarketplaceBidDraft(bid) {
  if (!bid || typeof bid !== "object") {
    throw Object.assign(new Error("A bid payload is required."), { code: "INVALID_BID" });
  }

  const listingId = normalizeText(bid.listingId);
  const bidAmountLabel = normalizeText(bid.bidAmount?.label || bid.bidAmount);
  const timeframeLabel = normalizeText(
    bid.estimatedCompletionTimeframe?.label || bid.estimatedCompletionTimeframe || bid.timeframe
  );
  const proposalMessage = normalizeText(bid.proposalMessage || bid.message);
  const developerProfileReference = createDeveloperProfileReference(
    bid.developerProfileReference || {
      userId: bid.developerUserId,
      companyName: bid.companyName,
      specialties: bid.specialties,
      ratingAverage: bid.ratingAverage,
      ratingCount: bid.ratingCount,
      portfolioImages: bid.portfolioImages,
      portfolioProjects: bid.portfolioProjects,
    }
  );

  if (!listingId || !bidAmountLabel || !timeframeLabel || !proposalMessage || !developerProfileReference.userId) {
    throw Object.assign(new Error("Listing id, developer reference, bid amount, timeframe, and proposal are required."), {
      code: "INVALID_BID",
    });
  }

  return {
    listingId,
    status: normalizeMarketplaceBidStatus(bid.status),
    bidAmount: {
      label: bidAmountLabel,
      currency: normalizeText(bid.bidAmount?.currency) || null,
      amount: Number.isFinite(Number(bid.bidAmount?.amount)) ? Number(bid.bidAmount.amount) : null,
    },
    estimatedCompletionTimeframe: {
      label: timeframeLabel,
      estimatedDays: Number.isFinite(Number(bid.estimatedCompletionTimeframe?.estimatedDays))
        ? Number(bid.estimatedCompletionTimeframe.estimatedDays)
        : null,
    },
    proposalMessage,
    developerProfileReference,
    createdAt: normalizeText(bid.createdAt) || new Date().toISOString(),
  };
}
