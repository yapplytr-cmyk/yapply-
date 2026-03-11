import { getAuthSession } from "./state.js";

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

function readJson(key, fallback) {
  const storage = getStorage();

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

function writeJson(key, value) {
  const storage = getStorage();

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

async function createClientListing(formData) {
  const session = getAuthSession();
  const rawTitle = formData.get("projectTitle") || "Client Project";
  const projectType = escapeHtml(formData.get("projectType") || "");
  const stylePreference = escapeHtml(formData.get("stylePreference") || "");
  const location = escapeHtml(formData.get("preferredLocation") || "");
  const projectBrief = escapeHtml(formData.get("projectBrief") || "");
  const desiredTimeline = escapeHtml(formData.get("desiredTimeline") || "");
  const additionalNotes = escapeHtml(formData.get("additionalNotes") || "");
  const projectSize = escapeHtml(formData.get("projectSize") || "");
  const plotStatus = escapeHtml(formData.get("plotStatus") || "");
  const attachments = await createAttachments(formData.getAll("referenceUpload"));

  return {
    id: createId("client", rawTitle),
    type: "client",
    source: "submitted",
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
    location,
    budget: escapeHtml(formData.get("estimatedBudget") || ""),
    startDate: desiredTimeline,
    timeline: desiredTimeline,
    plotStatus,
    brief: projectBrief,
    projectSize,
    stylePreference,
    additionalNotes,
    attachments,
    tags: [projectType, stylePreference, "New Submission"].filter(Boolean).slice(0, 3),
  };
}

async function createProfessionalListing(formData) {
  const session = getAuthSession();
  const rawCompanyName = formData.get("companyName") || "Professional Listing";
  const specialties = splitList(formData.get("specialties"));
  const pricingModel = escapeHtml(formData.get("pricingModel") || "");
  const location = escapeHtml(formData.get("serviceArea") || "");
  const attachments = await createAttachments(formData.getAll("uploads"));
  const leadImage = attachments.find((item) => item.kind === "image");

  return {
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
  };
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
  return [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getSubmittedListing(type, id) {
  return getSubmittedListings(type).find((item) => item.id === id) || null;
}

export async function saveMarketplaceSubmission(type, formData) {
  const store = getStore();
  const listing = type === "professional" ? await createProfessionalListing(formData) : await createClientListing(formData);
  store[type] = [listing, ...(store[type] || [])];
  const storeSaved = setStore(store);
  const summarySaved = writeJson(LAST_SUBMISSION_KEY, { type, id: listing.id, createdAt: listing.createdAt });
  const detailSaved = writeJson(LAST_SUBMISSION_DETAIL_KEY, { type, listing });

  if (!storeSaved || !summarySaved || !detailSaved) {
    throw Object.assign(new Error("The submission could not be saved in this browser."), {
      code: "SUBMISSION_SAVE_FAILED",
    });
  }

  if (!getSubmittedListing(type, listing.id)) {
    throw Object.assign(new Error("The submission could not be retrieved after saving."), {
      code: "SUBMISSION_SAVE_FAILED",
    });
  }

  return listing;
}

export function getLastSubmission() {
  return readJson(LAST_SUBMISSION_KEY, null);
}

export function getLastSubmissionDetail(type, id = "") {
  const payload = readJson(LAST_SUBMISSION_DETAIL_KEY, null);

  if (!payload?.listing || payload?.type !== type) {
    return null;
  }

  if (id && payload.listing.id !== id) {
    return null;
  }

  return payload.listing;
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

  const lastSubmission = getLastSubmission();
  if (lastSubmission?.type === type && lastSubmission?.id === id) {
    const storage = getStorage();
    storage?.removeItem(LAST_SUBMISSION_KEY);
    storage?.removeItem(LAST_SUBMISSION_DETAIL_KEY);
  }

  return true;
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
