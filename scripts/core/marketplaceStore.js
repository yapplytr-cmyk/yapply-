import { getAuthSession } from "./state.js";
import { deleteAdminMarketplaceListing, getAuthOrigin } from "./auth.js";
import { getSupabaseClient } from "./supabaseClient.js?v=20260312-supabase-runtime-fix";
import {
  createDeveloperProfileReference,
  validateMarketplaceBidDraft,
  validateMarketplaceListingDraft,
} from "./marketplaceSchema.js";

const STORAGE_KEY = "yapply-marketplace-submissions-v1";
const LAST_SUBMISSION_KEY = "yapply-marketplace-last-submission-v1";
const LAST_SUBMISSION_DETAIL_KEY = "yapply-marketplace-last-submission-detail-v1";
const ADMIN_MODE_KEY = "yapply-marketplace-admin-mode-v1";
const DEVELOPER_BIDS_KEY = "yapply-developer-bids-v1";
const MAX_IMAGE_UPLOAD_BYTES = 400 * 1024; // 400KB max — balanced quality & speed
const MAX_IMAGE_DIMENSION = 1024;          // 1024px longest side — sharp on retina
const IMAGE_COMPRESSION_QUALITY = 0.68;    // Good visual quality
const CACHE_TTL_MS = 180000;               // 3 minutes TTL for listing cache

const publicListingsRequestCache = new Map();
const publicListingDetailCache = new Map();
const creatorAvatarCache = new Map();
const _normalizeCache = new WeakMap();

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

function buildPublicListingsCacheKey({
  type = "client",
  status = "open-for-bids",
  category = "",
  limit = 24,
} = {}) {
  return JSON.stringify({
    type: String(type || ""),
    status: String(status || ""),
    category: String(category || ""),
    limit: Number(limit || 0),
  });
}

export function invalidateMarketplaceRequestCache(listingId = "") {
  publicListingsRequestCache.clear();

  if (listingId) {
    publicListingDetailCache.delete(String(listingId).trim());
    return;
  }

  publicListingDetailCache.clear();
}

export function seedListingDetailCache(listing) {
  if (listing?.id) {
    publicListingDetailCache.set(
      String(listing.id).trim(),
      { promise: Promise.resolve(normalizeMarketplaceListing(listing)), timestamp: Date.now() }
    );
  }
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
  // Generate a proper UUID so PG never rejects the ID format.
  // PG will generate its own UUID on INSERT, but if the listing
  // is only saved locally (PG creation fails), at least the ID
  // won't cause "invalid uuid syntax" errors on bid attempts.
  try {
    return crypto.randomUUID();
  } catch (_) {
    // Fallback UUID v4 for older WebViews
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
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

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be decoded."));
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), mimeType, quality);
  });
}

function replaceFileExtension(filename, extension) {
  const safeExtension = String(extension || "").replace(/^\./, "");
  if (!safeExtension) {
    return filename;
  }

  const sourceName = String(filename || "image");
  const dotIndex = sourceName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? sourceName.slice(0, dotIndex) : sourceName;
  return `${baseName}.${safeExtension}`;
}

function getImageCompressionMimeType(fileType, canvas) {
  if (fileType === "image/jpeg" || fileType === "image/webp") {
    return fileType;
  }

  if (fileType === "image/png") {
    const webpCandidate = canvas.toDataURL("image/webp", IMAGE_COMPRESSION_QUALITY);
    if (webpCandidate.startsWith("data:image/webp")) {
      return "image/webp";
    }
  }

  return fileType || "image/jpeg";
}

function getExtensionForMimeType(mimeType) {
  if (mimeType === "image/webp") {
    return "webp";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  return "jpg";
}

export async function optimizeMarketplaceImageFile(file, {
  maxBytes = MAX_IMAGE_UPLOAD_BYTES,
  maxDimension = MAX_IMAGE_DIMENSION,
} = {}) {
  if (!(file instanceof File)) {
    return null;
  }

  const fileType = String(file.type || "").toLowerCase();
  if (!fileType.startsWith("image/")) {
    return file;
  }

  if (fileType === "image/svg+xml" || fileType === "image/gif") {
    return file.size <= maxBytes ? file : null;
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(sourceDataUrl);
  const naturalWidth = Number(image.naturalWidth || image.width || 0);
  const naturalHeight = Number(image.naturalHeight || image.height || 0);

  if (!naturalWidth || !naturalHeight) {
    return file.size <= maxBytes ? file : null;
  }

  const longestSide = Math.max(naturalWidth, naturalHeight);
  const baseScale = longestSide > maxDimension ? maxDimension / longestSide : 1;
  const mimeType = getImageCompressionMimeType(fileType, document.createElement("canvas"));
  const qualitySteps = [IMAGE_COMPRESSION_QUALITY, 0.55, 0.42, 0.30];
  const scaleSteps = [1, 0.85, 0.7, 0.5];

  if (file.size <= maxBytes && baseScale >= 1) {
    return file;
  }

  let smallestCandidate = null;

  for (const scaleStep of scaleSteps) {
    const width = Math.max(1, Math.round(naturalWidth * baseScale * scaleStep));
    const height = Math.max(1, Math.round(naturalHeight * baseScale * scaleStep));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      continue;
    }

    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualitySteps) {
      const blob = mimeType === "image/png"
        ? await canvasToBlob(canvas, mimeType)
        : await canvasToBlob(canvas, mimeType, quality);

      if (!blob) {
        continue;
      }

      if (!smallestCandidate || blob.size < smallestCandidate.size) {
        smallestCandidate = blob;
      }

      if (blob.size <= maxBytes) {
        return new File(
          [blob],
          replaceFileExtension(file.name, getExtensionForMimeType(blob.type || mimeType)),
          {
            type: blob.type || mimeType,
            lastModified: file.lastModified,
          }
        );
      }
    }
  }

  if (file.size <= maxBytes) {
    return file;
  }

  if (smallestCandidate && smallestCandidate.size <= maxBytes) {
    return new File(
      [smallestCandidate],
      replaceFileExtension(file.name, getExtensionForMimeType(smallestCandidate.type || mimeType)),
      {
        type: smallestCandidate.type || mimeType,
        lastModified: file.lastModified,
      }
    );
  }

  return null;
}

async function readOptimizedImageDataUrl(file) {
  const optimizedFile = await optimizeMarketplaceImageFile(file, {
    maxBytes: MAX_IMAGE_UPLOAD_BYTES,
    maxDimension: MAX_IMAGE_DIMENSION,
  });

  if (!(optimizedFile instanceof File)) {
    throw createSubmissionError(
      "IMAGE_TOO_LARGE",
      "One or more images still exceed the 2MB limit after compression."
    );
  }

  return readFileAsDataUrl(optimizedFile);
}

export function normalizeMarketplaceListing(listing) {
  if (!listing || typeof listing !== "object") {
    return listing;
  }

  // Check memoization cache first — avoid re-normalizing the same object
  if (_normalizeCache.has(listing)) {
    return _normalizeCache.get(listing);
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

  // Map snake_case backend fields → camelCase frontend fields
  // (Supabase returns snake_case from PostgreSQL columns)
  const fieldMap = {
    starting_price: "startingPrice",
    delivery_range: "deliveryRange",
    company_name: "companyName",
    years_experience: "yearsExperience",
    service_area: "serviceArea",
    owner_user_id: "ownerUserId",
    image_src: "imageSrc",
    profession_type: "professionType",
    preferred_region: "preferredRegion",
    avatar_url: "avatarUrl",
    created_at: "createdAt",
    updated_at: "updatedAt",
    admin_key: "adminKey",
  };
  const mapped = {};
  for (const [snakeKey, camelKey] of Object.entries(fieldMap)) {
    if (listing[snakeKey] !== undefined && listing[camelKey] === undefined) {
      mapped[camelKey] = listing[snakeKey];
    }
  }

  const normalized = {
    ...listing,
    ...mapped,
    marketplaceMeta,
    images,
  };

  // Store in cache for future calls with the same object
  _normalizeCache.set(listing, normalized);

  return normalized;
}

export async function enrichMarketplaceListingsWithCreatorAvatars(listings = []) {
  if (!Array.isArray(listings) || listings.length === 0) {
    return [];
  }

  const ownerIds = [...new Set(
    listings
      .map((listing) => String(listing?.ownerUserId || "").trim())
      .filter(Boolean)
  )];

  if (ownerIds.length === 0) {
    return listings;
  }

  const unresolvedOwnerIds = ownerIds.filter((id) => !creatorAvatarCache.has(id));

  try {
    if (unresolvedOwnerIds.length > 0) {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id,role,avatar_url")
        .in("id", unresolvedOwnerIds);

      if (!error) {
        const fetchedRows = Array.isArray(data) ? data : [];
        const seenIds = new Set();

        fetchedRows.forEach((row) => {
          const rowId = String(row?.id || "").trim();
          if (!rowId) {
            return;
          }

          seenIds.add(rowId);
          creatorAvatarCache.set(rowId, {
            role: String(row?.role || "").trim(),
            avatarUrl: String(row?.avatar_url || "").trim(),
          });
        });

        unresolvedOwnerIds
          .filter((id) => !seenIds.has(id))
          .forEach((id) => creatorAvatarCache.set(id, null));
      }
    }

    return listings.map((listing) => {
      const ownerUserId = String(listing?.ownerUserId || "").trim();
      const creatorProfile = creatorAvatarCache.get(ownerUserId);

      if (!creatorProfile) {
        return listing;
      }

      return normalizeMarketplaceListing({
        ...listing,
        creatorRole: creatorProfile.role || listing.creatorRole || listing.ownerRole || "",
        creatorAvatarSrc: creatorProfile.avatarUrl || listing.creatorAvatarSrc || "",
      });
    });
  } catch (error) {
    return listings;
  }
}

export async function enrichMarketplaceListingWithCreatorAvatar(listing) {
  if (!listing || typeof listing !== "object") {
    return listing;
  }

  const [decoratedListing] = await enrichMarketplaceListingsWithCreatorAvatars([listing]);
  return decoratedListing || listing;
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
      const dataUrl = file.type.startsWith("image/")
        ? await readOptimizedImageDataUrl(file).catch(() => readFileAsDataUrl(file))
        : await readFileAsDataUrl(file);
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

/**
 * Strip base64 data URLs from a listing before sending to PG.
 * Attachments with embedded images can be megabytes — far too large for JSONB.
 */
function stripBase64FromPayload(obj) {
  if (!obj || typeof obj !== "object") return obj;
  try {
    const json = JSON.stringify(obj, (key, value) => {
      // Strip any string that looks like a data URL (base64-encoded file)
      if (typeof value === "string" && value.startsWith("data:") && value.length > 200) {
        return "[base64-stripped]";
      }
      return value;
    });
    return JSON.parse(json);
  } catch (_) {
    // If serialization fails, return a minimal safe object
    return {
      type: obj.type || "",
      title: obj.title || obj.name || "",
      status: obj.status || "",
      createdAt: obj.createdAt || "",
    };
  }
}

function getStore() {
  const stored = readJson(STORAGE_KEY, { client: [], professional: [] });

  return {
    client: Array.isArray(stored.client) ? stored.client : [],
    professional: Array.isArray(stored.professional) ? stored.professional : [],
  };
}

/**
 * One-time cleanup: remove stale local marketplace data on app load.
 * v20260321v2: Aggressive cleanup — wipe ALL local listings and SWR caches
 * so the app only shows data from Supabase PG.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLEANUP_VERSION_KEY = "yapply-local-cleanup-v";
const CURRENT_CLEANUP_VERSION = "20260321v2";
let _storeCleanedUp = false;
function cleanupStaleLocalListings() {
  if (_storeCleanedUp) return;
  _storeCleanedUp = true;
  try {
    const lastVersion = localStorage.getItem(CLEANUP_VERSION_KEY) || "";
    if (lastVersion === CURRENT_CLEANUP_VERSION) return;

    console.log("[yapply] Running marketplace cleanup v" + CURRENT_CLEANUP_VERSION);

    // 1. Clear ALL local listings (they should come from PG now)
    const store = getStore();
    let removedCount = 0;
    for (const section of ["client", "professional"]) {
      if (Array.isArray(store[section])) {
        removedCount += store[section].length;
        store[section] = [];
      }
    }
    if (removedCount > 0) {
      setStore(store);
      console.log("[yapply] Removed", removedCount, "stale local listings");
    }

    // 2. Clear SWR caches so pages fetch fresh from PG
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("yapply-swr-") || key === "yapply-last-submission" || key === "yapply-last-submission-detail")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log("[yapply] Cleared cache:", key);
    });

    localStorage.setItem(CLEANUP_VERSION_KEY, CURRENT_CLEANUP_VERSION);
  } catch (e) {
    console.warn("[yapply] Cleanup failed:", e?.message);
  }
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

  invalidateMarketplaceRequestCache(listingId);

  return {
    bid: storedBid,
    listing: storedListing,
  };
}

function getStoredClientListingBids(listing) {
  if (Array.isArray(listing?.bids) && listing.bids.length > 0) {
    return listing.bids;
  }

  if (Array.isArray(listing?.marketplaceMeta?.latestBids) && listing.marketplaceMeta.latestBids.length > 0) {
    return listing.marketplaceMeta.latestBids;
  }

  return [];
}

/* ── Standalone developer bid storage ─────────── */

function getStoredDeveloperBids(ownerUserId) {
  if (!ownerUserId) return [];
  const all = readJson(DEVELOPER_BIDS_KEY, []);
  if (!Array.isArray(all)) return [];
  return all.filter((b) => {
    // Check top-level developerUserId first (always set by saveDeveloperBidEntry)
    if (b?.developerUserId === ownerUserId) return true;
    // Fallback to standard resolution
    return getBidDeveloperId(b) === ownerUserId;
  });
}

function saveDeveloperBidEntry(bidEntry, ownerUserId) {
  if (!bidEntry || !ownerUserId) return;
  // Always stamp the developer's userId at top level for reliable retrieval
  const entry = {
    ...bidEntry,
    developerUserId: ownerUserId,
  };
  const all = readJson(DEVELOPER_BIDS_KEY, []);
  const entries = Array.isArray(all) ? all : [];
  // Dedup by multiple possible keys
  const entryKey = entry.id || `${entry.listingId || ""}-${entry.createdAt || ""}`;
  const alreadyExists = entries.some((b) => {
    const bKey = b.id || `${b.listingId || ""}-${b.createdAt || ""}`;
    return bKey === entryKey && bKey !== "-";
  });
  if (!alreadyExists) {
    entries.unshift(entry);
    writeJson(DEVELOPER_BIDS_KEY, entries.slice(0, 100));
  }
}

function createDeveloperDashboardBidEntry(bid, listing) {
  const listingCategory =
    listing?.projectType
    || listing?.marketplaceCategory
    || listing?.marketplaceMeta?.category
    || "";
  const listingStatus =
    listing?.marketplaceMeta?.listingStatus
    || listing?.status
    || "";

  return {
    ...bid,
    listing: {
      id: listing?.id || bid?.listingId || "",
      title: listing?.title || "",
      location: listing?.location || "",
      category: listingCategory,
      status: listingStatus,
      type: listing?.type || "client",
    },
  };
}

function getBidDeveloperId(bid) {
  return String(
    bid?.developerUserId
      || bid?.developerId
      || bid?.bidderUserId
      || bid?.developerProfileReference?.userId
      || ""
  ).trim();
}

async function getCurrentAccessToken() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw createSubmissionError("AUTH_REQUIRED", error.message || "A valid authenticated session is required.");
  }

  const accessToken = data?.session?.access_token;
  if (!accessToken) {
    throw createSubmissionError("AUTH_REQUIRED", "A valid authenticated session is required.");
  }

  return accessToken;
}

function assertOwnedClientListing(listingId, ownerUserId) {
  const listing = getSubmittedListing("client", listingId);

  if (!listing) {
    throw createSubmissionError("LISTING_NOT_FOUND", "The selected listing could not be found.");
  }

  if (!ownerUserId || listing.ownerUserId !== ownerUserId) {
    throw createSubmissionError("LISTING_ACCESS_DENIED", "You can only manage your own client listings.");
  }

  return listing;
}

function assertOwnedProfessionalListing(listingId, ownerUserId) {
  const listing = getSubmittedListing("professional", listingId);

  if (!listing) {
    throw createSubmissionError("LISTING_NOT_FOUND", "The selected listing could not be found.");
  }

  if (!ownerUserId || listing.ownerUserId !== ownerUserId) {
    throw createSubmissionError("LISTING_ACCESS_DENIED", "You can only manage your own developer listings.");
  }

  return listing;
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

// Maximum bytes of base64 image data to keep per listing in localStorage.
// Anything larger is replaced with a compact thumbnail to avoid quota errors.
const LOCAL_STORAGE_IMAGE_BUDGET = 150 * 1024; // 150KB total per listing

function compactImageDataUrl(dataUrl, maxBytes) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) return dataUrl;
  if (dataUrl.length <= maxBytes) return dataUrl;
  // Try to create a tiny thumbnail via canvas (runs synchronously if possible)
  try {
    const img = new Image();
    img.src = dataUrl;
    // If image isn't loaded yet (async), keep the original — it will be
    // compacted on the next save cycle when the image is cached.
    if (!img.complete || !img.naturalWidth) return dataUrl;
    const maxDim = 200;
    const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.5);
  } catch (_) {
    // Canvas failed — return original rather than losing the image entirely
    return dataUrl;
  }
}

function createBrowserMirror(listing) {
  // Calculate total image data size to decide if we need to compact
  const rawAttachments = Array.isArray(listing.attachments) ? listing.attachments : [];
  const totalImageBytes = rawAttachments
    .filter((item) => item?.kind === "image" && item?.dataUrl)
    .reduce((sum, item) => sum + (item.dataUrl?.length || 0), 0);
  const needsCompaction = totalImageBytes > LOCAL_STORAGE_IMAGE_BUDGET;

  const attachments = rawAttachments.map((item) => ({
    id: item.id,
    name: item.name,
    mimeType: item.mimeType,
    kind: item.kind,
    dataUrl: item.kind === "image"
      ? (needsCompaction ? compactImageDataUrl(item.dataUrl, Math.floor(LOCAL_STORAGE_IMAGE_BUDGET / Math.max(1, rawAttachments.filter(a => a?.kind === "image").length))) : item.dataUrl)
      : undefined,
  }));
  // Keep imageSrc as-is — if it's base64, compact it the same way as attachments.
  // Don't replace with a placeholder SVG path that may not resolve in all environments.
  let imageSrc = listing.imageSrc;
  if (typeof imageSrc === "string" && imageSrc.startsWith("data:image") && needsCompaction) {
    imageSrc = compactImageDataUrl(imageSrc, Math.floor(LOCAL_STORAGE_IMAGE_BUDGET / 2));
  }

  return {
    ...normalizeMarketplaceListing(listing),
    attachments,
    imageSrc,
  };
}

function createSubmissionRedirectMirror(listing) {
  return {
    ...normalizeMarketplaceListing(listing),
    attachments: [],
    images: [],
    imageSrc:
      typeof listing?.imageSrc === "string" && !listing.imageSrc.startsWith("data:")
        ? listing.imageSrc
        : "",
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
    status: "open-for-bids",
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

  const owner = session?.user
    ? {
        id: session.user.id,
        role: session.user.role,
        fullName: session.user.fullName,
        email: session.user.email,
      }
    : null;

  console.log("[Yapply] createBackendMarketplaceListing:", {
    listingType: listing?.type,
    listingName: listing?.name || listing?.title,
    hasOwner: !!owner,
    ownerRole: owner?.role || "none",
  });

  // ─── 100% Supabase PostgreSQL direct — no Vercel API ───
  // Strip base64 image data from the payload to keep the PG row small.
  // Attachments with data URLs can be megabytes — PG JSONB chokes on them.
  const pgPayload = stripBase64FromPayload(listing);

  const { createListing: pgCreateListing } = await import("./supabaseMarketplace.js?v=20260321v2");
  const result = await pgCreateListing({
    ownerUserId: owner?.id || null,
    ownerEmail: owner?.email || "",
    ownerRole: owner?.role || "client",
    listingType: listing?.type || "client",
    title: listing?.title || listing?.name || "",
    description: listing?.brief || listing?.description || "",
    location: listing?.location || "",
    budget: listing?.budget || "",
    timeframe: listing?.timeline || listing?.timeframe || "",
    projectType: listing?.projectType || "",
    category: listing?.marketplaceCategory || listing?.category || "",
    payload: pgPayload,
  });
  console.log("[Yapply] Listing created via Supabase PG:", result.id);

  // Fire-and-forget email notification
  try {
    const { notifyListingCreated } = await import("./emailNotifier.js");
    notifyListingCreated({ ...result, ownerName: owner?.fullName || "", contact: { fullName: owner?.fullName, email: owner?.email } }, listing?.type || "client");
  } catch (_) {}

  return result;
}

async function updateBackendListingStatus(listingId, status, { bidId, bidStatus } = {}) {
  const session = getAuthSession();
  try {
    const body = {
      listingId,
      status,
      owner: session?.user
        ? { id: session.user.id, role: session.user.role, fullName: session.user.fullName, email: session.user.email }
        : null,
    };
    if (bidId) body.bidId = bidId;
    if (bidStatus) body.bidStatus = bidStatus;
    const accessToken = await getCurrentAccessToken().catch(() => null);
    const headers = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetch(createApiUrl("/api/marketplace/listings/update-status"), {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error("[Yapply] Backend listing status update failed:", response.status);
    }
  } catch (error) {
    console.error("[Yapply] Backend listing status update error:", error);
  }
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
      label: (() => {
        const raw = escapeHtml(formData.get("bidAmount") || "");
        return raw && !raw.includes("TL") ? `${raw} TL` : raw;
      })(),
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

  // ── ALWAYS save bid to standalone developer store immediately ──
  // This ensures the bid appears in Tekliflerim regardless of what the backend does.
  const earlyBidEntry = createDeveloperDashboardBidEntry(bid, { id: bid.listingId, type: "client" });
  saveDeveloperBidEntry(earlyBidEntry, session.user.id);

  // ─── 100% Supabase PostgreSQL direct — no Vercel API ───
  let data = {};
  const {
    createBid: pgCreateBid,
    fetchListing: pgFetchListing,
    ensureListingInPg,
  } = await import("./supabaseMarketplace.js?v=20260321v3");

  // ── Step 1: Ensure the listing exists in PG before bidding ──
  // The listing might only exist in Cloud Storage or localStorage.
  // We need it in PG so the bid's listing_id reference is valid.
  try {
    // Try to get listing data from any available source
    let listingData = null;

    // Source 1: PG
    try { listingData = await pgFetchListing(bid.listingId); } catch (_) {}

    // Source 2: localStorage (same-device listings)
    if (!listingData) {
      listingData = getSubmittedListing("client", bid.listingId)
                 || getSubmittedListing("professional", bid.listingId);
    }

    // Source 3: Vercel API / Cloud Storage fallback
    if (!listingData) {
      try { listingData = await fetchPublicMarketplaceListing(bid.listingId); } catch (_) {}
    }

    if (listingData) {
      await ensureListingInPg(listingData);
    } else {
      console.warn("[yapply] Could not find listing data to sync:", bid.listingId);
    }
  } catch (syncErr) {
    console.warn("[yapply] ensureListingInPg failed (will try bid anyway):", syncErr?.message);
  }

  // ── Step 2: Create the bid ──
  const pgBid = await pgCreateBid({
    listingId: bid.listingId,
    bidderUserId: session.user.id,
    companyName: bidder?.companyName || "",
    bidAmount: bid.bidAmount?.label || "",
    estimatedTimeframe: bid.estimatedCompletionTimeframe?.label || "",
    proposalMessage: bid.proposalMessage || "",
    payload: bid,
  });

  // Fetch the listing to return with the bid
  let pgListing = null;
  try {
    pgListing = await pgFetchListing(bid.listingId);
  } catch (_) {}

  data = { bid: pgBid, listing: pgListing };
  console.log("[yapply] Bid submitted via Supabase PG:", pgBid.id);

  // Fire-and-forget email notification
  try {
    const { notifyBidReceived } = await import("./emailNotifier.js");
    notifyBidReceived(pgListing, { ...pgBid, developerProfileReference: bid.developerProfileReference });
  } catch (_) {}

  invalidateMarketplaceRequestCache(bid.listingId);

  // Ensure the new bid appears in the listing even if storage read is delayed.
  const returnedListing = data.listing || null;
  const returnedBid = data.bid || null;
  if (returnedListing && returnedBid) {
    const meta = returnedListing.marketplaceMeta || {};
    const existingBids = Array.isArray(meta.latestBids) ? meta.latestBids : [];
    const alreadyPresent = existingBids.some((b) => b.id === returnedBid.id);
    if (!alreadyPresent) {
      returnedListing.marketplaceMeta = {
        ...meta,
        latestBids: [returnedBid, ...existingBids],
        bidCount: (Number(meta.bidCount) || existingBids.length) + 1,
      };
    }
    // Also add to top-level bids array for dashboards
    const topBids = Array.isArray(returnedListing.bids) ? returnedListing.bids : [];
    if (!topBids.some((b) => b.id === returnedBid.id)) {
      returnedListing.bids = [returnedBid, ...topBids];
    }
    // Seed the cache so the re-render uses this data immediately.
    seedListingDetailCache(returnedListing);

    // Also update the local storage copy if it exists.
    saveBidIntoStoredClientListing(bid.listingId, returnedBid, session.user);

    // Update standalone entry with richer backend data
    const dashboardBidEntry = createDeveloperDashboardBidEntry(returnedBid, returnedListing);
    saveDeveloperBidEntry(dashboardBidEntry, session.user.id);
  }

  return {
    bid: returnedBid || bid,
    listing: returnedListing,
  };
}

export async function fetchPublicMarketplaceListings({
  type = "client",
  status = "open-for-bids",
  category = "",
  limit = 24,
} = {}) {
  const cacheKey = buildPublicListingsCacheKey({ type, status, category, limit });
  const cachedEntry = publicListingsRequestCache.get(cacheKey);

  // Check if request is already in-flight or cached result is still fresh
  if (cachedEntry) {
    if (cachedEntry.promise) {
      return cachedEntry.promise;
    }
    // Check TTL: if timestamp is recent enough, return cached result
    if (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      return cachedEntry.promise || Promise.resolve(cachedEntry.data);
    }
    // Expired — remove from cache
    publicListingsRequestCache.delete(cacheKey);
  }

  const request = (async () => {
    // ─── Try Supabase PostgreSQL first (fast, direct) ───
    try {
      const { fetchListings } = await import("./supabaseMarketplace.js?v=20260321v2");
      const results = await fetchListings({ type, status, category, limit });
      console.log("[yapply] Kesfet: loaded", results.length, "listings from Supabase PG");
      return results;
    } catch (supaErr) {
      console.warn("[yapply] Kesfet: Supabase PG query failed, falling back to API:", supaErr?.message);
    }

    // ─── Fallback: Vercel API ───
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    params.set("limit", String(limit));
    params.set("fields", "card");

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
  })();

  // Store promise in cache for in-flight deduplication
  publicListingsRequestCache.set(cacheKey, { promise: request, timestamp: Date.now() });

  try {
    const result = await request;
    // Update cache with result data for TTL checks
    publicListingsRequestCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    publicListingsRequestCache.delete(cacheKey);
    throw error;
  }
}

export async function fetchPublicMarketplaceListing(listingId) {
  if (!listingId) {
    return null;
  }

  const cacheKey = String(listingId).trim();
  const cachedEntry = publicListingDetailCache.get(cacheKey);

  // Return cached detail if still fresh (2 minute TTL)
  if (cachedEntry) {
    if (cachedEntry.timestamp && (Date.now() - cachedEntry.timestamp < 120000)) {
      return cachedEntry.promise;
    }
    if (!cachedEntry.timestamp) {
      return cachedEntry; // Legacy format — treat as valid
    }
    publicListingDetailCache.delete(cacheKey);
  }

  const request = (async () => {
    // ─── Try Supabase PostgreSQL first ───
    try {
      const { fetchListing } = await import("./supabaseMarketplace.js?v=20260321v2");
      const result = await fetchListing(listingId);
      console.log("[yapply] Detail: loaded listing", listingId, "from Supabase PG");
      return result;
    } catch (supaErr) {
      console.warn("[yapply] Detail: Supabase PG query failed, falling back to API:", supaErr?.message);
    }

    // ─── Fallback: Vercel API ───
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
  })();

  publicListingDetailCache.set(cacheKey, { promise: request, timestamp: Date.now() });

  try {
    return await request;
  } catch (error) {
    publicListingDetailCache.delete(cacheKey);
    throw error;
  }
}

export function getDeveloperDashboardLocalBidEntries(ownerUserId) {
  if (!ownerUserId) {
    return [];
  }

  // Source 1: Bids embedded inside locally-stored client listings
  const listingBids = getSubmittedListings("client")
    .flatMap((listing) =>
      getStoredClientListingBids(listing)
        .filter((bid) => getBidDeveloperId(bid) === ownerUserId)
        .map((bid) => createDeveloperDashboardBidEntry(bid, listing))
    );

  // Source 2: Standalone developer bid store (catches bids on backend-only listings)
  const standaloneBids = getStoredDeveloperBids(ownerUserId);

  // Merge and deduplicate
  const merged = [...listingBids, ...standaloneBids];
  const seen = new Set();
  const deduped = merged.filter((entry) => {
    const key = entry.id || `${entry.listingId}-${entry.createdAt}-${entry.proposalMessage || entry.proposal || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
}

let _devDashboardInFlight = null;
export async function fetchDeveloperDashboardData() {
  // In-flight deduplication: reuse pending request if one exists
  if (_devDashboardInFlight) return _devDashboardInFlight;
  _devDashboardInFlight = _fetchDeveloperDashboardDataImpl().finally(() => { _devDashboardInFlight = null; });
  return _devDashboardInFlight;
}
async function _fetchDeveloperDashboardDataImpl() {
  const session = getAuthSession();
  const ownerUserId = session?.authenticated ? session.user?.id || "" : "";
  const localListings = getOwnedSubmittedListings("professional", ownerUserId);
  const localBids = getDeveloperDashboardLocalBidEntries(ownerUserId);

  if (!session?.authenticated || session.user?.role !== "developer") {
    return {
      listings: localListings,
      bids: localBids,
      localListings,
      localBids,
    };
  }

  // ─── Try Supabase PostgreSQL first ───
  try {
    const { fetchBidsForDeveloper, fetchMyListings } = await import("./supabaseMarketplace.js?v=20260321v2");
    const [pgListings, pgBidEntries] = await Promise.all([
      fetchMyListings(ownerUserId),
      fetchBidsForDeveloper(ownerUserId),
    ]);
    console.log("[yapply] DevDashboard: loaded", pgListings.length, "listings,", pgBidEntries.length, "bids from Supabase PG");
    return {
      listings: pgListings,
      bids: pgBidEntries,
      localListings,
      localBids,
    };
  } catch (supaErr) {
    console.warn("[yapply] DevDashboard: Supabase PG query failed, falling back to API:", supaErr?.message);
  }

  // ─── Fallback: Vercel API ───
  let accessToken = "";
  try {
    accessToken = await getCurrentAccessToken();
  } catch (_) {
    return {
      listings: localListings,
      bids: localBids,
      localListings,
      localBids,
    };
  }
  const response = await fetch(createApiUrl("/api/account/developer-dashboard"), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw Object.assign(new Error(data.message || "Developer dashboard data could not be loaded."), {
      code: data.code || "DEVELOPER_DASHBOARD_LOAD_FAILED",
    });
  }

  const remoteListings = Array.isArray(data.listings) ? data.listings.map((listing) => normalizeMarketplaceListing(listing)) : [];
  const remoteBids = Array.isArray(data.bids) ? data.bids : [];

  return {
    listings: remoteListings,
    bids: remoteBids,
    localListings,
    localBids,
  };
}

export async function updateClientDashboardListing(listingId, ownerUserId, formData) {
  const currentListing = assertOwnedClientListing(listingId, ownerUserId);
  const removeAttachmentIds = new Set(
    formData
      .getAll("removeAttachmentIds")
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );
  const retainedAttachments = (Array.isArray(currentListing.attachments) ? currentListing.attachments : []).filter(
    (item) => !removeAttachmentIds.has(String(item?.id || ""))
  );
  const uploadedAttachments = await createAttachments(formData.getAll("newImages"));
  const attachments = [...retainedAttachments, ...uploadedAttachments].slice(0, 6);
  const now = new Date().toISOString();
  const nextListing = validateMarketplaceListingDraft({
    ...currentListing,
    title: escapeHtml(formData.get("title") || currentListing.title || ""),
    brief: escapeHtml(formData.get("brief") || currentListing.brief || ""),
    projectType: escapeHtml(formData.get("projectType") || currentListing.projectType || ""),
    marketplaceCategory: escapeHtml(formData.get("projectType") || currentListing.projectType || ""),
    budget: escapeHtml(formData.get("budget") || currentListing.budget || ""),
    timeline: escapeHtml(formData.get("timeline") || currentListing.timeline || currentListing.startDate || ""),
    startDate: escapeHtml(formData.get("timeline") || currentListing.startDate || currentListing.timeline || ""),
    plotStatus: escapeHtml(formData.get("projectStatus") || currentListing.plotStatus || ""),
    marketplaceProjectStatus: escapeHtml(formData.get("projectStatus") || currentListing.plotStatus || ""),
    attachments,
    updatedAt: now,
    tags: [
      escapeHtml(formData.get("projectType") || currentListing.projectType || ""),
      currentListing.location,
      escapeHtml(formData.get("projectStatus") || currentListing.plotStatus || ""),
    ]
      .filter(Boolean)
      .slice(0, 3),
    marketplaceMeta: {
      ...(currentListing.marketplaceMeta || {}),
      permitsStatus: currentListing.marketplaceMeta?.permitsStatus || currentListing.permitsStatus || "",
      constructionStarted: currentListing.marketplaceMeta?.constructionStarted || currentListing.constructionStarted || "",
      latestBids: getStoredClientListingBids(currentListing).slice(0, 4),
      bidCount: Number(currentListing.marketplaceMeta?.bidCount || getStoredClientListingBids(currentListing).length || 0),
    },
  });

  const storedListing = updateStoredListing("client", listingId, () => ({
    ...nextListing,
    updatedAt: now,
  }));

  if (!storedListing) {
    throw createSubmissionError("LISTING_UPDATE_FAILED", "The listing could not be updated.");
  }

  invalidateMarketplaceRequestCache(listingId);

  return normalizeMarketplaceListing(storedListing);
}

export async function updateDeveloperDashboardListing(listingId, ownerUserId, formData) {
  const currentListing = assertOwnedProfessionalListing(listingId, ownerUserId);
  const removeAttachmentIds = new Set(
    formData
      .getAll("removeAttachmentIds")
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );
  const retainedAttachments = (Array.isArray(currentListing.attachments) ? currentListing.attachments : []).filter(
    (item) => !removeAttachmentIds.has(String(item?.id || ""))
  );
  const uploadedAttachments = await createAttachments(formData.getAll("newImages"));
  const attachments = [...retainedAttachments, ...uploadedAttachments].slice(0, 6);
  const specialties = splitList(formData.get("specialties"));
  const now = new Date().toISOString();
  const leadImage = attachments.find((item) => item.kind === "image");
  const title = escapeHtml(formData.get("title") || currentListing.name || currentListing.title || "");
  const category = escapeHtml(formData.get("category") || currentListing.specialty || "");
  const location = escapeHtml(formData.get("serviceArea") || currentListing.location || "");
  const pricing = escapeHtml(formData.get("pricing") || currentListing.startingPrice || "");
  const description = escapeHtml(formData.get("description") || currentListing.summary || currentListing.portfolioSummary || "");
  const nextListing = validateMarketplaceListingDraft({
    ...currentListing,
    name: title,
    title,
    specialty: category,
    location,
    startingPrice: pricing,
    summary: description,
    portfolioSummary: description,
    services: specialties.length > 0 ? specialties : Array.isArray(currentListing.services) ? currentListing.services : [],
    attachments,
    imageSrc: leadImage?.dataUrl || currentListing.imageSrc || "./assets/developer-previews/submitted-professional.svg",
    updatedAt: now,
    tags: [category, location, "Updated Listing"].filter(Boolean).slice(0, 3),
    marketplaceMeta: {
      ...(currentListing.marketplaceMeta || {}),
      developerProfileReference: createDeveloperProfileReference({
        ...(currentListing.marketplaceMeta?.developerProfileReference || {}),
        userId: ownerUserId,
        companyName: title,
        specialties: specialties.length > 0 ? specialties : currentListing.services || [],
        portfolioImages: attachments.filter((item) => item.kind === "image").map((item) => item.dataUrl),
      }),
    },
  });

  const storedListing = updateStoredListing("professional", listingId, () => ({
    ...nextListing,
    updatedAt: now,
  }));

  if (!storedListing) {
    throw createSubmissionError("LISTING_UPDATE_FAILED", "The developer listing could not be updated.");
  }

  invalidateMarketplaceRequestCache(listingId);

  return normalizeMarketplaceListing(storedListing);
}

export function syncClientDashboardListingBids(listingId, ownerUserId, sourceListing) {
  const currentListing = assertOwnedClientListing(listingId, ownerUserId);

  if (!sourceListing || sourceListing.id !== listingId) {
    return normalizeMarketplaceListing(currentListing);
  }

  const publicBids = getStoredClientListingBids(sourceListing).filter((bid) => {
    const bidListingId = String(bid?.listingId || listingId);
    return bidListingId === String(listingId);
  });
  const nextListingStatus =
    sourceListing?.marketplaceMeta?.listingStatus
    || sourceListing?.status
    || currentListing?.marketplaceMeta?.listingStatus
    || currentListing?.status
    || "open-for-bids";

  const storedListing = updateStoredListing("client", listingId, (listing) => ({
    ...listing,
    status: nextListingStatus,
    bids: publicBids,
    marketplaceMeta: {
      ...(listing.marketplaceMeta || {}),
      ...(sourceListing.marketplaceMeta || {}),
      latestBids: publicBids.slice(0, 4),
      bidCount: Number(sourceListing?.marketplaceMeta?.bidCount || publicBids.length || 0),
      listingStatus: nextListingStatus,
    },
  }));

  invalidateMarketplaceRequestCache(listingId);
  return normalizeMarketplaceListing(storedListing || currentListing);
}

/**
 * Accept a bid — LOCAL only (instant, no network).
 * Updates localStorage so the UI can re-render immediately.
 */
export function acceptClientDashboardBidLocal(listingId, bidId, ownerUserId) {
  let currentListing = getSubmittedListing("client", listingId);

  // Also check ALL SWR caches in case the listing was fetched from backend
  if (!currentListing) {
    const swrKeys = ["yapply-swr-client-bids", "yapply-swr-client-dashboard"];
    for (const swrKey of swrKeys) {
      if (currentListing) break;
      try {
        const cacheRaw = localStorage.getItem(swrKey);
        if (!cacheRaw) continue;
        const cacheData = JSON.parse(cacheRaw);
        const listings = Array.isArray(cacheData?.data) ? cacheData.data : [];
        currentListing = listings.find((l) => l?.id === listingId) || null;
      } catch (_) {}
    }
  }

  // Last resort: check per-listing detail SWR cache
  if (!currentListing) {
    try {
      const detailRaw = localStorage.getItem("yapply-swr-marketplace:detail-" + listingId);
      if (detailRaw) {
        const detailData = JSON.parse(detailRaw);
        if (detailData?.data?.id === listingId) {
          currentListing = detailData.data;
        }
      }
    } catch (_) {}
  }

  // Nuclear scan: check EVERY localStorage key for any array containing this listing
  if (!currentListing) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        if (currentListing) break;
        const key = localStorage.key(i);
        if (!key || !key.startsWith("yapply-")) continue;
        try {
          const raw = localStorage.getItem(key);
          if (!raw || raw.length < 10) continue;
          const parsed = JSON.parse(raw);
          // Check { data: [...listings...] } shape (SWR caches)
          const arr = Array.isArray(parsed?.data) ? parsed.data : (Array.isArray(parsed) ? parsed : null);
          if (arr) {
            const found = arr.find((item) => item && item.id === listingId);
            if (found) {
              currentListing = found;
              console.log("[yapply] Found listing via nuclear scan in key:", key);
            }
          }
          // Check { data: { id: ... } } shape (detail caches)
          if (!currentListing && parsed?.data?.id === listingId) {
            currentListing = parsed.data;
            console.log("[yapply] Found listing via nuclear scan (detail) in key:", key);
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  if (!currentListing) {
    throw createSubmissionError("LISTING_NOT_FOUND", "The selected listing could not be found.");
  }

  if (ownerUserId && currentListing.ownerUserId && currentListing.ownerUserId !== ownerUserId) {
    throw createSubmissionError("LISTING_ACCESS_DENIED", "You can only manage your own client listings.");
  }

  const currentBids = getStoredClientListingBids(currentListing);
  const selectedBid = currentBids.find((bid) => bid?.id === bidId);

  if (!selectedBid) {
    throw createSubmissionError("BID_NOT_FOUND", "The selected bid could not be found.");
  }

  if (currentListing.marketplaceMeta?.acceptedBidId) {
    throw createSubmissionError("BID_ALREADY_ACCEPTED", "A bid has already been accepted for this listing.");
  }

  const acceptedAt = new Date().toISOString();
  const nextBids = currentBids.map((bid) => ({
    ...bid,
    status: bid.id === bidId ? "accepted" : bid.status || "submitted",
  }));
  const acceptedBid = {
    ...selectedBid,
    status: "accepted",
    acceptedAt,
  };

  const acceptedMeta = {
    ...(currentListing.marketplaceMeta || {}),
    listingStatus: "bid-accepted",
    latestBids: nextBids.slice(0, 4),
    bidCount: Math.max(Number(currentListing.marketplaceMeta?.bidCount || 0), nextBids.length),
    acceptedBidId: bidId,
    acceptedBid,
    acceptedAt,
  };

  // Update localStorage if listing exists there.
  let storedListing = updateStoredListing("client", listingId, (listing) => ({
    ...listing,
    status: "bid-accepted",
    updatedAt: acceptedAt,
    bids: nextBids,
    marketplaceMeta: acceptedMeta,
  }));

  // If not in localStorage yet, add it so the dashboard re-render picks up the accepted state.
  if (!storedListing) {
    const updatedListing = {
      ...currentListing,
      status: "bid-accepted",
      updatedAt: acceptedAt,
      bids: nextBids,
      marketplaceMeta: acceptedMeta,
    };
    const store = getStore();
    store.client = [updatedListing, ...(store.client || []).filter((item) => item.id !== listingId)];
    setStore(store);
    storedListing = updatedListing;
  }

  // Update ALL SWR caches: dashboard caches (update listing) + kesfet caches (remove listing)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Dashboard SWR caches — update the listing status
      if (key === "yapply-swr-client-bids" || key === "yapply-swr-client-dashboard") {
        try {
          const parsed = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(parsed?.data)) {
            parsed.data = parsed.data.map((l) =>
              l?.id === listingId ? { ...l, status: "bid-accepted", bids: nextBids, marketplaceMeta: acceptedMeta } : l
            );
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch (_) {}
      }

      // Kesfet SWR caches — remove the accepted listing so it disappears from marketplace
      if (key.startsWith("yapply-swr-marketplace:client-")) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(parsed?.data)) {
            parsed.data = parsed.data.filter((l) => l?.id !== listingId);
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  invalidateMarketplaceRequestCache(listingId);
  return normalizeMarketplaceListing(storedListing);
}

/**
 * Accept a bid — REMOTE (fire-and-forget, runs in background).
 * Syncs the acceptance to Supabase PG + triggers email + push notification.
 */
export async function acceptClientDashboardBidRemote(listingId, bidId) {
  const session = getAuthSession();
  const ownerUserId = session?.user?.id || "";

  // Try Supabase PG accept first
  let updatedListing = null;
  try {
    const { acceptBid: pgAcceptBid } = await import("./supabaseMarketplace.js?v=20260321v2");
    updatedListing = await pgAcceptBid(listingId, bidId, ownerUserId);
    console.log("[yapply] Bid accepted via Supabase PG:", bidId);
  } catch (supaErr) {
    console.warn("[yapply] Supabase PG accept failed, falling back to API:", supaErr?.message);
  }

  // Also sync to Vercel API (for backward compat / old storage)
  try {
    await updateBackendListingStatus(listingId, "bid-accepted", { bidId, bidStatus: "accepted" });
  } catch (_) {}

  // Fire-and-forget email + push notification for bid acceptance
  try {
    const acceptedBid = updatedListing?.bids?.find(b => b.id === bidId || b.status === "accepted") || null;
    if (updatedListing && acceptedBid) {
      const { notifyBidAccepted } = await import("./emailNotifier.js");
      notifyBidAccepted(
        { ...updatedListing, ownerName: session?.user?.fullName || "", contact: { fullName: session?.user?.fullName, email: session?.user?.email } },
        acceptedBid
      );
    }
  } catch (_) {}
}

/** @deprecated Use acceptClientDashboardBidLocal + acceptClientDashboardBidRemote instead */
export async function acceptClientDashboardBid(listingId, bidId, ownerUserId) {
  const result = acceptClientDashboardBidLocal(listingId, bidId, ownerUserId);
  await acceptClientDashboardBidRemote(listingId, bidId);
  return result;
}

export async function closeClientDashboardListing(listingId, ownerUserId) {
  assertOwnedClientListing(listingId, ownerUserId);
  const closedAt = new Date().toISOString();
  const storedListing = updateStoredListing("client", listingId, (listing) => ({
    ...listing,
    status: "closed",
    updatedAt: closedAt,
    marketplaceMeta: {
      ...(listing.marketplaceMeta || {}),
      listingStatus: "closed",
      closedAt,
    },
  }));

  if (!storedListing) {
    throw createSubmissionError("LISTING_CLOSE_FAILED", "The listing could not be closed.");
  }

  await updateBackendListingStatus(listingId, "closed");
  invalidateMarketplaceRequestCache(listingId);
  return normalizeMarketplaceListing(storedListing);
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

function stripAllImageDataFromStore(store) {
  // Emergency space-saving: remove all base64 image data from older listings
  for (const section of ["client", "professional"]) {
    const items = Array.isArray(store[section]) ? store[section] : [];
    for (const item of items) {
      if (Array.isArray(item.attachments)) {
        for (const att of item.attachments) {
          if (att?.kind === "image" && att?.dataUrl && att.dataUrl.length > 1000) {
            att.dataUrl = "";
          }
        }
      }
      if (Array.isArray(item.images)) {
        item.images = [];
      }
    }
  }
  return store;
}

function persistSubmissionArtifacts(type, listing) {
  const store = getStore();
  const browserMirror = createBrowserMirror(listing);
  store[type] = [browserMirror, ...(store[type] || []).filter((item) => item.id !== listing.id)];

  let storeSaved = setStore(store);

  // If localStorage is full, strip image data from older listings and retry
  if (!storeSaved) {
    console.warn("Yapply localStorage full — compacting image data and retrying");
    const compacted = stripAllImageDataFromStore(store);
    storeSaved = setStore(compacted);
  }

  // If STILL full, keep only the 5 most recent listings per type
  if (!storeSaved) {
    console.warn("Yapply localStorage still full — trimming old listings");
    for (const section of ["client", "professional"]) {
      if (Array.isArray(store[section]) && store[section].length > 5) {
        store[section] = store[section].slice(0, 5);
      }
    }
    storeSaved = setStore(store);
  }

  const summarySaved = writeJson(LAST_SUBMISSION_KEY, { type, id: listing.id, createdAt: listing.createdAt });
  const detailSaved = writeJson(LAST_SUBMISSION_DETAIL_KEY, { type, listing: browserMirror });
  writeJsonTo(getSessionStorage(), LAST_SUBMISSION_DETAIL_KEY, { type, listing });
  invalidateMarketplaceRequestCache(listing.id);

  if (storeSaved && detailSaved && getSubmittedListing(type, listing.id)) {
    return listing;
  }

  const redirectMirror = createSubmissionRedirectMirror(listing);
  if (!summarySaved) {
    writeJson(LAST_SUBMISSION_KEY, {
      type,
      id: listing.id,
      createdAt: listing.createdAt,
    });
  }
  const fallbackDetailSaved =
    writeJsonTo(getSessionStorage(), LAST_SUBMISSION_DETAIL_KEY, { type, listing: redirectMirror })
    || writeJson(LAST_SUBMISSION_DETAIL_KEY, { type, listing: redirectMirror });

  if (!fallbackDetailSaved) {
    throw createSubmissionError(
      "SUBMISSION_SAVE_FAILED",
      "The listing was created, but the saved result could not be prepared for the redirect."
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
  cleanupStaleLocalListings();
  const store = getStore();
  const items = store[type] || [];
  return [...items]
    .map((item) => normalizeMarketplaceListing(item))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getSubmittedListing(type, id) {
  // Direct lookup by ID without normalizing ALL items — avoid O(n) normalization
  const store = getStore();
  const items = store[type] || [];
  const found = items.find((item) => item.id === id);
  return found ? normalizeMarketplaceListing(found) : null;
}

export async function saveMarketplaceSubmission(type, formData) {
  requireListingOwner(type);
  const draftListing = type === "professional" ? await createProfessionalListing(formData) : await createClientListing(formData);
  const draftId = draftListing?.id;

  // Always persist the draft locally first so the listing is never lost,
  // even if the backend call fails (network error, auth issue, etc).
  persistSubmissionArtifacts(type, draftListing);

  let listing;
  try {
    listing = await createBackendMarketplaceListing(draftListing);
    // Backend succeeded — the PG listing has a different UUID than the draft.
    // Remove the old draft entry and save the canonical PG version.
    if (listing.id !== draftId) {
      removeDraftFromStore(type, draftId);
    }
    persistSubmissionArtifacts(type, listing);
    console.log("[Yapply] Listing saved to PG:", listing.id, "(draft was:", draftId, ")");
  } catch (error) {
    // Backend failed — show the error to the user so they know what happened.
    const errMsg = error?.message || "Unknown error";
    const errCode = error?.code || "";
    console.error("[Yapply] Backend listing create FAILED:", errCode, errMsg, {
      type,
      draftId,
      details: error?.details || "",
    });

    // CRITICAL: Remove the local-only draft — it can never be bid on
    // because it doesn't exist in PG. Keeping it misleads the user.
    removeDraftFromStore(type, draftId);

    // Re-throw so the UI shows the error instead of a fake "success"
    throw error;
  }

  return listing;
}

/**
 * Remove a specific listing from the local store by ID.
 * Used when PG returns a different UUID than the draft.
 */
function removeDraftFromStore(type, draftId) {
  if (!draftId) return;
  try {
    const store = getStore();
    if (Array.isArray(store[type])) {
      store[type] = store[type].filter((item) => item.id !== draftId);
      setStore(store);
    }
  } catch (_) {}
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

let _clientDashboardInFlight = null;
export async function fetchClientDashboardData() {
  // In-flight deduplication: reuse pending request if one exists
  if (_clientDashboardInFlight) return _clientDashboardInFlight;
  _clientDashboardInFlight = _fetchClientDashboardDataImpl().finally(() => { _clientDashboardInFlight = null; });
  return _clientDashboardInFlight;
}
async function _fetchClientDashboardDataImpl() {
  const session = getAuthSession();
  const ownerUserId = session?.authenticated ? session.user?.id || "" : "";
  const localListings = getOwnedSubmittedListings("client", ownerUserId);

  if (!session?.authenticated || session.user?.role !== "client") {
    return { listings: localListings };
  }

  // ─── Try Supabase PostgreSQL first ───
  try {
    const { fetchMyListings } = await import("./supabaseMarketplace.js?v=20260321v2");
    const pgListings = await fetchMyListings(ownerUserId);
    console.log("[yapply] ClientDashboard: loaded", pgListings.length, "listings from Supabase PG");
    return { listings: pgListings };
  } catch (supaErr) {
    console.warn("[yapply] ClientDashboard: Supabase PG query failed, falling back to API:", supaErr?.message);
  }

  // ─── Fallback: Vercel API ───
  try {
    const accessToken = await getCurrentAccessToken();
    const response = await fetch(createApiUrl("/api/account/client-dashboard"), {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      return { listings: localListings };
    }

    const remoteListings = Array.isArray(data.listings)
      ? data.listings.map((listing) => normalizeMarketplaceListing(listing))
      : [];

    // Merge: remote listings take priority, but local accepted/closed state
    // wins over stale remote data (eventual consistency workaround).
    const localById = new Map(localListings.map((l) => [l.id, l]));
    const mergedRemote = remoteListings.map((remote) => {
      const local = localById.get(remote.id);
      if (local && local.marketplaceMeta?.acceptedBidId && !remote.marketplaceMeta?.acceptedBidId) {
        return local;
      }
      return remote;
    });
    const remoteIds = new Set(remoteListings.map((l) => l.id));
    const localOnly = localListings.filter((l) => !remoteIds.has(l.id));
    const merged = [...mergedRemote, ...localOnly].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return { listings: merged };
  } catch (_) {
    return { listings: localListings };
  }
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
  invalidateMarketplaceRequestCache(id);

  return true;
}

export async function deleteBackendMarketplaceListing(listingId) {
  if (!listingId) {
    return false;
  }

  try {
    await deleteAdminMarketplaceListing(listingId);
    invalidateMarketplaceRequestCache(listingId);
    return true;
  } catch (error) {
    console.error("[Yapply] Backend listing delete failed:", error?.code || "", error?.message || error);
    return false;
  }
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
