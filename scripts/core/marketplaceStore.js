import { getAuthSession } from "./state.js";
import { getAuthOrigin } from "./auth.js";
import {
  createDeveloperProfileReference,
  validateMarketplaceBidDraft,
  validateMarketplaceListingDraft,
} from "./marketplaceSchema.js";

const STORAGE_KEY = "yapply-marketplace-submissions-v1";
const LAST_SUBMISSION_KEY = "yapply-marketplace-last-submission-v1";
const LAST_SUBMISSION_DETAIL_KEY = "yapply-marketplace-last-submission-detail-v1";
const ADMIN_MODE_KEY = "yapply-marketplace-admin-mode-v1";

function getStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch (error) {
    return null;
  }
}

function readJsonFrom(storage, key, fallback) {
  if (!storage) {
    return fallback;
  }

  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function readJson(key, fallback) {
  return readJsonFrom(getStorage(), key, fallback);
}

function writeJsonTo(storage, key, value) {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function writeJson(key, value) {
  return writeJsonTo(getStorage(), key, value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map(escapeHtml);
}

function createId(prefix, seed) {
  const slug = slugify(seed) || prefix;
  return `${prefix}-${Date.now()}-${slug}`.slice(0, 96);
}

function createApiUrl(path) {
  return `${getAuthOrigin()}${path}`;
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

export function getAllowedMarketplaceSubmissionTypeForRole(role) {
  if (role === "client") {
    return "client";
  }

  if (role === "developer") {
    return "professional";
  }

  return null;
}

export function canRoleCreateMarketplaceSubmission(role, type) {
  return getAllowedMarketplaceSubmissionTypeForRole(role) === type;
}

function isLocalFrontend() {
  const { hostname, port } = window.location;
  return (hostname === "127.0.0.1" || hostname === "localhost") && port === "4173";
}

function usesBrowserManagedListings() {
  return isLocalFrontend();
}

function createSubmissionError(code, message) {
  return Object.assign(new Error(message), { code });
}

function normalizeMarketplaceImageItem(item, index = 0) {
  if (typeof item === "string" && item.trim()) {
    return {
      id: `listing-image-${index + 1}`,
      name: `Project image ${index + 1}`,
      src: item.trim(),
    };
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const srcCandidates = [item.dataUrl, item.url, item.src, item.href];
  const src = srcCandidates.find((value) => typeof value === "string" && value.trim());
  if (!src) {
    return null;
  }

  return {
    id: item.id || `listing-image-${index + 1}`,
    name: item.name || `Project image ${index + 1}`,
    src,
  };
}

export function normalizeMarketplaceListing(listing) {
  if (!listing || typeof listing !== "object") {
    return listing;
  }

  const attachments = Array.isArray(listing.attachments) ? listing.attachments : [];
  const marketplaceMeta = listing.marketplaceMeta && typeof listing.marketplaceMeta === "object"
    ? listing.marketplaceMeta
    : {};
  const photoReferences = Array.isArray(marketplaceMeta.photoReferences) ? marketplaceMeta.photoReferences : [];
  const existingImages = Array.isArray(listing.images) ? listing.images : [];

  const imageCandidates = [
    ...attachments.filter((item) => item && item.kind === "image"),
    ...photoReferences,
    ...(typeof listing.imageSrc === "string" && listing.imageSrc.trim() ? [listing.imageSrc] : []),
    ...existingImages,
  ];

  const seenSources = new Set();
  const images = imageCandidates
    .map((item, index) => normalizeMarketplaceImageItem(item, index))
    .filter((item) => item && !seenSources.has(item.src) && seenSources.add(item.src));

  return {
    ...listing,
    marketplaceMeta,
    images,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function createAttachments(fileValue) {
  const files = Array.from(fileValue || []).filter((file) => file instanceof File && file.size > 0).slice(0, 6);

  const attachments = await Promise.all(
    files.map(async (file, index) => {
      const dataUrl = await readFileAsDataUrl(file);
      return {
        id: `attachment-${Date.now()}-${index}`,
        name: escapeHtml(file.name || `attachment-${index + 1}`),
        mimeType: escapeHtml(file.type || "application/octet-stream"),
        kind: file.type.startsWith("image/") ? "image" : "file",
        dataUrl,
      };
    })
  );

  return attachments;
}

function getStore() {
  const stored = readJson(STORAGE_KEY, { client: [], professional: [] });

  return {
    client: Array.isArray(stored.client) ? stored.client : [],
    professional: Array.isArray(stored.professional) ? stored.professional : [],
  };
}

function setStore(store) {
  return writeJson(STORAGE_KEY, store);
}

function updateStoredListing(type, listingId, updater) {
  if (!type || !listingId || typeof updater !== "function") {
    return null;
  }

  const store = getStore();
  const items = Array.isArray(store[type]) ? [...store[type]] : [];
  const index = items.findIndex((item) => item?.id === listingId);

  if (index === -1) {
    return null;
  }

  const nextListing = updater({ ...items[index] });
  if (!nextListing) {
    return null;
  }

  items[index] = nextListing;
  store[type] = items;
  setStore(store);

  const lastSubmission = getLastSubmission();
  if (lastSubmission?.type === type && lastSubmission?.id === listingId) {
    writeJson(LAST_SUBMISSION_DETAIL_KEY, { type, listing: nextListing });
    writeJsonTo(getSessionStorage(), LAST_SUBMISSION_DETAIL_KEY, { type, listing: nextListing });
  }

  return nextListing;
}

function createStoredBidRecord(bid, user) {
  const companyName = user?.companyName || user?.fullName || user?.username || user?.email || "";

  return {
    ...bid,
    id: createId("bid", `${bid.listingId}-${user?.id || "developer"}`),
    developerId: user?.id || "",
    developerName: user?.fullName || user?.username || user?.email || companyName,
    companyName,
    timeframe: bid.estimatedCompletionTimeframe?.label || "",
    proposal: bid.proposalMessage || "",
    createdAt: new Date().toISOString(),
  };
}

function saveBidIntoStoredClientListing(listingId, bid, user) {
  const storedBid = createStoredBidRecord(bid, user);
  const storedListing = updateStoredListing("client", listingId, (listing) => {
    const existingMeta = listing.marketplaceMeta && typeof listing.marketplaceMeta === "object" ? listing.marketplaceMeta : {};
    const existingBids = Array.isArray(listing.bids) ? listing.bids : Array.isArray(existingMeta.latestBids) ? existingMeta.latestBids : [];
    const nextBids = [storedBid, ...existingBids]
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .slice(0, 4);

    return {
      ...listing,
      bids: nextBids,
      marketplaceMeta: {
        ...existingMeta,
        latestBids: nextBids,
        bidCount: Number(existingMeta.bidCount || 0) + 1,
      },
    };
  });

  if (!storedListing) {
    return null;
  }

  return {
    bid: storedBid,
    listing: storedListing,
  };
}

function clearLastSubmissionState(type = "", id = "") {
  const lastSubmission = getLastSubmission();

  if (!lastSubmission) {
    return;
  }

  if ((type && lastSubmission.type !== type) || (id && lastSubmission.id !== id)) {
    return;
  }

  const storage = getStorage();
  storage?.removeItem(LAST_SUBMISSION_KEY);
  storage?.removeItem(LAST_SUBMISSION_DETAIL_KEY);
  getSessionStorage()?.removeItem(LAST_SUBMISSION_DETAIL_KEY);
}

function createBrowserMirror(listing) {
  const attachments = Array.isArray(listing.attachments)
    ? listing.attachments.map((item) => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        kind: item.kind,
        dataUrl: item.kind === "image" ? item.dataUrl : undefined,
      }))
    : [];
  const imageSrc =
    typeof listing.imageSrc === "string" && listing.imageSrc.startsWith("data:")
      ? "./assets/developer-previews/submitted-professional.svg"
      : listing.imageSrc;

  return {
    ...normalizeMarketplaceListing(listing),
    attachments,
    imageSrc,
  };
}

async function createClientListing(formData) {
  const session = getAuthSession();
  const rawTitle = formData.get("projectTitle") || "Client Project";
  const projectType = escapeHtml(formData.get("projectType") || "");
  const marketplaceSubcategory = escapeHtml(formData.get("marketplaceSubcategory") || "");
  const stylePreference = escapeHtml(formData.get("stylePreference") || "");
  const location = escapeHtml(formData.get("preferredLocation") || "");
  const projectBrief = escapeHtml(formData.get("projectBrief") || "");
  const estimatedBudget = escapeHtml(formData.get("estimatedBudget") || "");
  const desiredTimeline = escapeHtml(formData.get("desiredTimeline") || "");
  const additionalNotes = escapeHtml(formData.get("additionalNotes") || "");
  const projectSize = escapeHtml(formData.get("projectSize") || "");
  const plotStatus = escapeHtml(formData.get("plotStatus") || "");
  const permitsStatus = escapeHtml(formData.get("permitsStatus") || "");
  const constructionStarted = escapeHtml(formData.get("constructionStarted") || "");
  const attachments = await createAttachments(formData.getAll("referenceUpload"));

  return validateMarketplaceListingDraft({
    id: createId("client", rawTitle),
    type: "client",
    source: "submitted",
    status: "open-for-bids",
    createdAt: new Date().toISOString(),
    ownerUserId: session?.user?.id || null,
    ownerRole: session?.user?.role || "client",
    contact: {
      fullName: escapeHtml(formData.get("fullName") || ""),
      email: escapeHtml(formData.get("email") || ""),
      phone: escapeHtml(formData.get("phone") || ""),
    },
    title: escapeHtml(rawTitle),
    projectType,
    marketplaceCategory: projectType,
    marketplaceSubcategory,
    location,
    budget: estimatedBudget,
    startDate: desiredTimeline,
    timeline: desiredTimeline,
    plotStatus,
    marketplaceProjectStatus: plotStatus,
    brief: projectBrief,
    projectSize,
    stylePreference,
    permitsStatus,
    constructionStarted,
    additionalNotes,
    attachments,
    tags: [projectType, location, plotStatus].filter(Boolean).slice(0, 3),
    marketplaceMeta: {
      permitsStatus,
      constructionStarted,
      listingStatus: "open-for-bids",
    },
  });
}

async function createProfessionalListing(formData) {
  const session = getAuthSession();
  const rawCompanyName = formData.get("companyName") || "Professional Listing";
  const specialties = splitList(formData.get("specialties"));
  const pricingModel = escapeHtml(formData.get("pricingModel") || "");
  const location = escapeHtml(formData.get("serviceArea") || "");
  const attachments = await createAttachments(formData.getAll("uploads"));
  const leadImage = attachments.find((item) => item.kind === "image");

  return validateMarketplaceListingDraft({
    id: createId("professional", rawCompanyName),
    type: "professional",
    source: "submitted",
    createdAt: new Date().toISOString(),
    ownerUserId: session?.user?.id || null,
    ownerRole: session?.user?.role || "developer",
    contact: {
      fullName: escapeHtml(formData.get("fullName") || ""),
      email: escapeHtml(formData.get("contactEmail") || ""),
      phone: escapeHtml(formData.get("phone") || ""),
    },
    name: escapeHtml(rawCompanyName),
    specialty: escapeHtml(formData.get("professionType") || ""),
    location,
    yearsExperience: escapeHtml(formData.get("experience") || ""),
    startingPrice: pricingModel,
    summary: escapeHtml(formData.get("companyDescription") || formData.get("portfolioSummary") || ""),
    portfolioSummary: escapeHtml(formData.get("portfolioSummary") || ""),
    websiteUrl: escapeHtml(formData.get("website") || ""),
    services: specialties.length > 0 ? specialties : [escapeHtml(formData.get("specialties") || "")].filter(Boolean),
    deliveryRange: `${escapeHtml(formData.get("experience") || "")} years experience`,
    attachments,
    tags: [escapeHtml(formData.get("professionType") || ""), location, "New Listing"].filter(Boolean).slice(0, 3),
    imageSrc: leadImage?.dataUrl || "./assets/developer-previews/submitted-professional.svg",
    marketplaceMeta: {
      developerProfileReference: createDeveloperProfileReference({
        userId: session?.user?.id,
        companyName: rawCompanyName,
        specialties,
        portfolioImages: attachments.filter((item) => item.kind === "image").map((item) => item.dataUrl),
      }),
    },
  });
}

async function createBackendMarketplaceListing(listing) {
  const session = getAuthSession();
  const response = await fetch(createApiUrl("/api/marketplace/listings/create"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      listing,
      owner: session?.user
        ? {
            id: session.user.id,
            role: session.user.role,
            fullName: session.user.fullName,
            email: session.user.email,
          }
        : null,
    }),
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    throw Object.assign(new Error(data.message || "The listing could not be created."), {
      code: data.code || "LISTING_CREATE_FAILED",
    });
  }

  return data.listing;
}

export async function submitMarketplaceBid(formData) {
  const session = getAuthSession();

  if (!session?.authenticated || !session?.user) {
    throw createSubmissionError("AUTH_REQUIRED", "Please sign in with a developer account to submit a bid.");
  }

  if (session.user.role !== "developer") {
    throw createSubmissionError("BIDDER_ROLE_INVALID", "Only developer accounts can submit bids.");
  }

  const bid = validateMarketplaceBidDraft({
    listingId: escapeHtml(formData.get("listingId") || ""),
    bidAmount: {
      label: escapeHtml(formData.get("bidAmount") || ""),
    },
    estimatedCompletionTimeframe: {
      label: escapeHtml(formData.get("estimatedCompletionTimeframe") || ""),
    },
    proposalMessage: escapeHtml(formData.get("proposalMessage") || ""),
    developerProfileReference: createDeveloperProfileReference({
      userId: session.user.id,
      companyName: session.user.companyName || session.user.fullName || session.user.username || "",
      specialties: session.user.specialties || "",
      ratingAverage: session.user.ratingAverage,
      ratingCount: session.user.ratingCount,
      portfolioImages: [],
      portfolioProjects: [],
    }),
  });

  const bidder = session?.user
    ? {
        id: session.user.id,
        role: session.user.role,
        fullName: session.user.fullName,
        email: session.user.email,
        companyName: session.user.companyName,
        specialties: session.user.specialties,
        yearsExperience: session.user.yearsExperience,
      }
    : null;

  const localListing = getSubmittedListing("client", bid.listingId) || getLastSubmissionDetail("client", bid.listingId);
  if (localListing) {
    const storedResult = saveBidIntoStoredClientListing(bid.listingId, bid, session.user);
    if (storedResult) {
      return storedResult;
    }
  }

  let data = {};
  try {
    const response = await fetch(createApiUrl("/api/marketplace/bids/create"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bid,
        bidder,
      }),
    });
    data = await readJsonResponse(response);

    if (!response.ok) {
      throw Object.assign(new Error(data.message || "The bid could not be submitted."), {
        code: data.code || "BID_CREATE_FAILED",
      });
    }
  } catch (error) {
    if (error?.code !== "LISTING_NOT_FOUND") {
      throw error;
    }
    const storedResult = saveBidIntoStoredClientListing(bid.listingId, bid, session.user);
    if (storedResult) {
      return storedResult;
    }
    throw error;
  }

  return {
    bid: data.bid || null,
    listing: data.listing || null,
  };
}

export async function fetchPublicMarketplaceListings({
  type = "client",
  status = "open-for-bids",
  category = "",
  limit = 24,
} = {}) {
  const params = new URLSearchParams();

  if (type) {
    params.set("type", type);
  }

  if (status) {
    params.set("status", status);
  }

  if (category) {
    params.set("category", category);
  }

  params.set("limit", String(limit));

  const response = await fetch(createApiUrl(`/api/marketplace/listings?${params.toString()}`), {
    method: "GET",
    credentials: "include",
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw Object.assign(new Error(data.message || "Marketplace listings could not be loaded."), {
      code: data.code || "LISTINGS_LOAD_FAILED",
    });
  }

  return Array.isArray(data.listings) ? data.listings.map((listing) => normalizeMarketplaceListing(listing)) : [];
}

export async function fetchPublicMarketplaceListing(listingId) {
  if (!listingId) {
    return null;
  }

  const params = new URLSearchParams({ id: listingId });
  const response = await fetch(createApiUrl(`/api/marketplace/listings/detail?${params.toString()}`), {
    method: "GET",
    credentials: "include",
  });
  const data = await readJsonResponse(response);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw Object.assign(new Error(data.message || "Marketplace listing could not be loaded."), {
      code: data.code || "LISTING_LOAD_FAILED",
    });
  }

  return data.listing ? normalizeMarketplaceListing(data.listing) : null;
}

function requireListingOwner(type) {
  const session = getAuthSession();

  if (!session?.authenticated || !session?.user) {
    throw createSubmissionError("AUTH_REQUIRED", "You need to be signed in before creating a listing.");
  }

  if (!canRoleCreateMarketplaceSubmission(session.user.role, type)) {
    if (type === "client") {
      throw createSubmissionError("ROLE_MISMATCH", "Only client accounts can submit a project request.");
    }

    if (type === "professional") {
      throw createSubmissionError("ROLE_MISMATCH", "Only developer accounts can publish a professional listing.");
    }
  }
}

function persistSubmissionArtifacts(type, listing) {
  const store = getStore();
  const browserMirror = createBrowserMirror(listing);
  store[type] = [browserMirror, ...(store[type] || []).filter((item) => item.id !== listing.id)];

  const storeSaved = setStore(store);
  const summarySaved = writeJson(LAST_SUBMISSION_KEY, { type, id: listing.id, createdAt: listing.createdAt });
  const detailSaved = writeJson(LAST_SUBMISSION_DETAIL_KEY, { type, listing: browserMirror });
  writeJsonTo(getSessionStorage(), LAST_SUBMISSION_DETAIL_KEY, { type, listing });

  if (!storeSaved || !summarySaved || !detailSaved) {
    throw createSubmissionError(
      "SUBMISSION_SAVE_FAILED",
      "The listing was created, but the saved result could not be prepared for the redirect."
    );
  }

  if (!getSubmittedListing(type, listing.id)) {
    throw createSubmissionError(
      "SUBMISSION_SAVE_FAILED",
      "The listing was created, but the saved preview could not be retrieved."
    );
  }

  return listing;
}

export function getMarketplaceListingHref(type, id) {
  if (type === "professional") {
    return `./marketplace-professional-listing.html?id=${encodeURIComponent(id)}`;
  }

  return `./marketplace-client-listing.html?id=${encodeURIComponent(id)}`;
}

export function getSubmissionSuccessHref(type, id) {
  if (type === "professional") {
    return `./professional-listing-submission-success.html?id=${encodeURIComponent(id)}`;
  }

  return `./client-project-submission-success.html?id=${encodeURIComponent(id)}`;
}

export function getSubmittedListings(type) {
  const store = getStore();
  const items = store[type] || [];
  return [...items]
    .map((item) => normalizeMarketplaceListing(item))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getSubmittedListing(type, id) {
  return getSubmittedListings(type).find((item) => item.id === id) || null;
}

export async function saveMarketplaceSubmission(type, formData) {
  requireListingOwner(type);
  const draftListing = type === "professional" ? await createProfessionalListing(formData) : await createClientListing(formData);
  let listing;

  if (usesBrowserManagedListings()) {
    try {
      listing = await createBackendMarketplaceListing(draftListing);
    } catch (error) {
      listing = draftListing;
    }
  } else {
    listing = await createBackendMarketplaceListing(draftListing);
  }

  return persistSubmissionArtifacts(type, listing);
}

export function getLastSubmission() {
  return readJson(LAST_SUBMISSION_KEY, null);
}

export function getLastSubmissionDetail(type, id = "") {
  const sessionPayload = readJsonFrom(getSessionStorage(), LAST_SUBMISSION_DETAIL_KEY, null);
  const payload = sessionPayload || readJson(LAST_SUBMISSION_DETAIL_KEY, null);

  if (!payload?.listing || payload?.type !== type) {
    return null;
  }

  if (id && payload.listing.id !== id) {
    return null;
  }

  return normalizeMarketplaceListing(payload.listing);
}

export function getOwnedSubmittedListings(type, ownerUserId) {
  if (!ownerUserId) {
    return [];
  }

  return getSubmittedListings(type).filter((item) => item.ownerUserId === ownerUserId);
}

export function deleteMarketplaceListing(type, id) {
  const store = getStore();
  const nextItems = (store[type] || []).filter((item) => item.id !== id);
  const changed = nextItems.length !== (store[type] || []).length;

  if (!changed) {
    return false;
  }

  store[type] = nextItems;
  setStore(store);
  clearLastSubmissionState(type, id);

  return true;
}

export function deleteOwnedMarketplaceListings(ownerUserId) {
  if (!ownerUserId) {
    return 0;
  }

  const store = getStore();
  const counts = ["client", "professional"].map((type) => {
    const items = store[type] || [];
    const nextItems = items.filter((item) => item.ownerUserId !== ownerUserId);
    const removedCount = items.length - nextItems.length;
    store[type] = nextItems;

    items
      .filter((item) => item.ownerUserId === ownerUserId)
      .forEach((item) => clearLastSubmissionState(type, item.id));

    return removedCount;
  });

  setStore(store);
  return counts.reduce((sum, count) => sum + count, 0);
}

export function syncMarketplaceAdminMode() {
  const storage = getStorage();

  if (!storage) {
    return false;
  }

  const url = new URL(window.location.href);
  const mode = url.searchParams.get("admin");

  if (mode === "1") {
    storage.setItem(ADMIN_MODE_KEY, "true");
  }

  if (mode === "0") {
    storage.removeItem(ADMIN_MODE_KEY);
  }

  return storage.getItem(ADMIN_MODE_KEY) === "true";
}

export function isMarketplaceAdminMode() {
  const storage = getStorage();
  return storage?.getItem(ADMIN_MODE_KEY) === "true";
}

export { validateMarketplaceBidDraft } from "./marketplaceSchema.js";
