import { deleteMarketplaceListing, getSubmittedListings } from "./marketplaceStore.js";

const STORAGE_KEY = "yapply-admin-layer-v1";

function getStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

function readStore() {
  const storage = getStorage();

  if (!storage) {
    return createDefaultStore();
  }

  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    return normalizeStore(parsed);
  } catch (error) {
    return createDefaultStore();
  }
}

function writeStore(store) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeStore(store)));
  } catch (error) {
    return;
  }
}

function createDefaultStore() {
  return {
    marketplace: {
      client: { overrides: {}, hidden: [], order: [] },
      professional: { overrides: {}, hidden: [], order: [] },
    },
    featuredProjects: {
      overrides: {},
      hidden: [],
      order: [],
      custom: [],
    },
  };
}

function normalizeStore(store) {
  const fallback = createDefaultStore();
  const nextStore = store && typeof store === "object" ? store : fallback;

  return {
    marketplace: {
      client: normalizeSection(nextStore.marketplace?.client),
      professional: normalizeSection(nextStore.marketplace?.professional),
    },
    featuredProjects: {
      overrides: isObject(nextStore.featuredProjects?.overrides) ? nextStore.featuredProjects.overrides : {},
      hidden: Array.isArray(nextStore.featuredProjects?.hidden) ? nextStore.featuredProjects.hidden : [],
      order: Array.isArray(nextStore.featuredProjects?.order) ? nextStore.featuredProjects.order : [],
      custom: Array.isArray(nextStore.featuredProjects?.custom) ? nextStore.featuredProjects.custom : [],
    },
  };
}

function normalizeSection(section) {
  return {
    overrides: isObject(section?.overrides) ? section.overrides : {},
    hidden: Array.isArray(section?.hidden) ? section.hidden : [],
    order: Array.isArray(section?.order) ? section.order : [],
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function createCustomId(prefix, seed) {
  return `${prefix}-${Date.now()}-${slugify(seed || prefix)}`.slice(0, 96);
}

function splitList(value, max = 4) {
  return String(value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
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

  return Promise.all(
    files.map(async (file, index) => ({
      id: `admin-attachment-${Date.now()}-${index}`,
      name: file.name || `attachment-${index + 1}`,
      mimeType: file.type || "application/octet-stream",
      kind: file.type.startsWith("image/") ? "image" : "file",
      dataUrl: await readFileAsDataUrl(file),
    }))
  );
}

function getListingKey(type, listing) {
  if (listing.adminKey) {
    return listing.adminKey;
  }

  if (listing.source === "submitted" && listing.id) {
    return `submitted:${type}:${listing.id}`;
  }

  return `seed:${type}:${listing.slug || listing.id || slugify(listing.name || listing.title)}`;
}

function getFeaturedProjectKey(project) {
  if (project.adminKey) {
    return project.adminKey;
  }

  if (project.source === "custom" && project.id) {
    return `custom:project:${project.id}`;
  }

  return `seed:project:${project.slug || slugify(project.title)}`;
}

function orderItems(items, order) {
  if (!Array.isArray(order) || order.length === 0) {
    return items;
  }

  const weights = new Map(order.map((key, index) => [key, index]));

  return [...items].sort((left, right) => {
    const leftWeight = weights.has(left.adminKey) ? weights.get(left.adminKey) : Number.MAX_SAFE_INTEGER;
    const rightWeight = weights.has(right.adminKey) ? weights.get(right.adminKey) : Number.MAX_SAFE_INTEGER;

    if (leftWeight !== rightWeight) {
      return leftWeight - rightWeight;
    }

    return (left.marketPosition || 0) - (right.marketPosition || 0);
  });
}

function buildMarketplaceItems(type, seedItems) {
  const submittedItems = getSubmittedListings(type);
  const baseItems = [...submittedItems, ...seedItems];
  const store = readStore().marketplace[type];
  const hidden = new Set(store.hidden);

  const items = baseItems
    .map((item, index) => {
      const adminKey = getListingKey(type, item);
      const override = store.overrides[adminKey] || {};

      return {
        ...clone(item),
        ...override,
        adminKey,
        source: item.source || "seeded",
        status: override.status || item.status || "active",
        marketPosition: index + 1,
      };
    })
    .filter((item) => !hidden.has(item.adminKey));

  return orderItems(items, store.order).map((item, index) => ({
    ...item,
    marketPosition: index + 1,
  }));
}

function buildFeaturedItems(seedItems) {
  const store = readStore().featuredProjects;
  const hidden = new Set(store.hidden);
  const baseItems = [
    ...seedItems.map((item) => ({ ...clone(item), source: item.source || "seeded" })),
    ...store.custom.map((item) => ({ ...clone(item), source: "custom" })),
  ];

  const items = baseItems
    .map((item, index) => {
      const adminKey = getFeaturedProjectKey(item);
      const override = store.overrides[adminKey] || {};

      return {
        ...item,
        ...override,
        adminKey,
        marketPosition: index + 1,
      };
    })
    .filter((item) => !hidden.has(item.adminKey));

  return orderItems(items, store.order).map((item, index) => ({
    ...item,
    marketPosition: index + 1,
  }));
}

function updateOrder(order, items, targetKey, direction) {
  const current = orderItems(items, order).map((item) => item.adminKey);
  const index = current.indexOf(targetKey);

  if (index === -1) {
    return current;
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= current.length) {
    return current;
  }

  [current[index], current[swapIndex]] = [current[swapIndex], current[index]];
  return current;
}

export function getManagedMarketplaceCollections(seedClientItems, seedProfessionalItems) {
  return {
    client: buildMarketplaceItems("client", seedClientItems),
    professional: buildMarketplaceItems("professional", seedProfessionalItems),
  };
}

export function getManagedMarketplaceListing(type, listingId, seedClientItems, seedProfessionalItems) {
  const collections = getManagedMarketplaceCollections(seedClientItems, seedProfessionalItems);
  const items = type === "professional" ? collections.professional : collections.client;

  return (
    items.find((item) => item.id === listingId || item.slug === listingId || item.adminKey === listingId || item.profileSlug === listingId) || null
  );
}

export async function updateManagedListing(type, adminKey, formData, existingListing) {
  const store = readStore();
  const section = store.marketplace[type];
  const uploads = await createAttachments(formData.getAll("attachments"));

  const patch =
    type === "professional"
      ? {
          name: String(formData.get("title") || existingListing?.name || "").trim(),
          specialty: String(formData.get("category") || existingListing?.specialty || "").trim(),
          location: String(formData.get("location") || existingListing?.location || "").trim(),
          startingPrice: String(formData.get("pricing") || existingListing?.startingPrice || "").trim(),
          deliveryRange: String(formData.get("timeline") || existingListing?.deliveryRange || "").trim(),
          summary: String(formData.get("description") || existingListing?.summary || "").trim(),
          services: splitList(formData.get("services") || existingListing?.services?.join(", ") || "", 6),
          status: String(formData.get("status") || existingListing?.status || "active").trim(),
        }
      : {
          title: String(formData.get("title") || existingListing?.title || "").trim(),
          projectType: String(formData.get("category") || existingListing?.projectType || "").trim(),
          location: String(formData.get("location") || existingListing?.location || "").trim(),
          budget: String(formData.get("pricing") || existingListing?.budget || "").trim(),
          timeline: String(formData.get("timeline") || existingListing?.timeline || "").trim(),
          startDate: String(formData.get("timeline") || existingListing?.startDate || "").trim(),
          brief: String(formData.get("description") || existingListing?.brief || "").trim(),
          plotStatus: String(formData.get("plotStatus") || existingListing?.plotStatus || "").trim(),
          status: String(formData.get("status") || existingListing?.status || "active").trim(),
        };

  if (uploads.length > 0) {
    patch.attachments = uploads;

    if (type === "professional") {
      const leadImage = uploads.find((item) => item.kind === "image");
      if (leadImage) {
        patch.imageSrc = leadImage.dataUrl;
      }
    }
  }

  section.overrides[adminKey] = {
    ...(section.overrides[adminKey] || {}),
    ...patch,
  };
  writeStore(store);
}

export function deleteManagedListing(type, listing) {
  const store = readStore();
  const section = store.marketplace[type];

  if (listing.source === "submitted" && listing.id) {
    deleteMarketplaceListing(type, listing.id);
  } else {
    section.hidden = [...new Set([...section.hidden, listing.adminKey])];
  }

  section.order = section.order.filter((key) => key !== listing.adminKey);
  delete section.overrides[listing.adminKey];
  writeStore(store);
}

export function moveManagedListing(type, listing, direction, seedClientItems, seedProfessionalItems) {
  const store = readStore();
  const section = store.marketplace[type];
  const items =
    type === "professional"
      ? buildMarketplaceItems("professional", seedProfessionalItems)
      : buildMarketplaceItems("client", seedClientItems);

  section.order = updateOrder(section.order, items, listing.adminKey, direction);
  writeStore(store);
}

export function getManagedFeaturedProjects(seedItems) {
  return buildFeaturedItems(seedItems);
}

export async function createManagedFeaturedProject(formData) {
  const store = readStore();
  const uploads = await createAttachments(formData.getAll("image"));
  const leadImage = uploads.find((item) => item.kind === "image");
  const title = String(formData.get("title") || "Featured Project").trim();
  const projectId = createCustomId("featured-project", title);

  store.featuredProjects.custom.unshift({
    id: projectId,
    source: "custom",
    badge: String(formData.get("badge") || "Featured Project").trim(),
    title,
    location: String(formData.get("location") || "").trim(),
    style: String(formData.get("style") || "").trim(),
    price: String(formData.get("price") || "").trim(),
    buildTime: String(formData.get("buildTime") || "").trim(),
    summary: String(formData.get("summary") || "").trim(),
    highlights: splitList(formData.get("highlights") || "", 3),
    ctaLabel: String(formData.get("ctaLabel") || "Explore Details").trim(),
    ctaHint: String(formData.get("ctaHint") || "").trim(),
    href: String(formData.get("href") || "#featured-projects").trim() || "#featured-projects",
    visual: "coast",
    imageSrc: leadImage?.dataUrl || "",
  });

  writeStore(store);
}

export async function updateManagedFeaturedProject(adminKey, formData, existingProject) {
  const store = readStore();
  const uploads = await createAttachments(formData.getAll("image"));
  const leadImage = uploads.find((item) => item.kind === "image");
  const patch = {
    badge: String(formData.get("badge") || existingProject?.badge || "").trim(),
    title: String(formData.get("title") || existingProject?.title || "").trim(),
    location: String(formData.get("location") || existingProject?.location || "").trim(),
    style: String(formData.get("style") || existingProject?.style || "").trim(),
    price: String(formData.get("price") || existingProject?.price || "").trim(),
    buildTime: String(formData.get("buildTime") || existingProject?.buildTime || "").trim(),
    summary: String(formData.get("summary") || existingProject?.summary || "").trim(),
    highlights: splitList(formData.get("highlights") || existingProject?.highlights?.join(", ") || "", 3),
    ctaLabel: String(formData.get("ctaLabel") || existingProject?.ctaLabel || "").trim(),
    ctaHint: String(formData.get("ctaHint") || existingProject?.ctaHint || "").trim(),
    href: String(formData.get("href") || existingProject?.href || "#featured-projects").trim() || "#featured-projects",
  };

  if (leadImage) {
    patch.imageSrc = leadImage.dataUrl;
  }

  if (existingProject?.source === "custom") {
    const projectIndex = store.featuredProjects.custom.findIndex((item) => getFeaturedProjectKey(item) === adminKey);

    if (projectIndex >= 0) {
      store.featuredProjects.custom[projectIndex] = {
        ...store.featuredProjects.custom[projectIndex],
        ...patch,
      };
    }
  } else {
    store.featuredProjects.overrides[adminKey] = {
      ...(store.featuredProjects.overrides[adminKey] || {}),
      ...patch,
    };
  }

  writeStore(store);
}

export function deleteManagedFeaturedProject(project) {
  const store = readStore();

  if (project.source === "custom") {
    store.featuredProjects.custom = store.featuredProjects.custom.filter((item) => getFeaturedProjectKey(item) !== project.adminKey);
  } else {
    store.featuredProjects.hidden = [...new Set([...store.featuredProjects.hidden, project.adminKey])];
    delete store.featuredProjects.overrides[project.adminKey];
  }

  store.featuredProjects.order = store.featuredProjects.order.filter((key) => key !== project.adminKey);
  writeStore(store);
}

export function moveManagedFeaturedProject(project, direction, seedItems) {
  const store = readStore();
  const items = buildFeaturedItems(seedItems);
  store.featuredProjects.order = updateOrder(store.featuredProjects.order, items, project.adminKey, direction);
  writeStore(store);
}
