import {
  getManagedFeaturedProjects,
  getManagedMarketplaceCollections,
  getManagedMarketplaceListing,
} from "./core/adminStore.js";
import {
  getAllowedMarketplaceSubmissionTypeForRole,
  fetchClientDashboardData,
  getLastSubmission,
  getLastSubmissionDetail,
  getOwnedSubmittedListings,
  getSubmittedListing,
  getSubmittedListings,
} from "./core/marketplaceStore.js";
import { getAuthSession } from "./core/state.js";

const componentModuleCache = new Map();

function loadComponentModule(key, loader) {
  if (!componentModuleCache.has(key)) {
    componentModuleCache.set(key, loader());
  }

  return componentModuleCache.get(key);
}

function loadNavbarApi() {
  return loadComponentModule("navbar", () => import("./components/navbar.js"));
}

function loadFooterApi() {
  return loadComponentModule("footer", () => import("./components/footer.js"));
}

function loadHeroApi() {
  return loadComponentModule("hero", () => import("./components/hero.js"));
}

function loadHowItWorksApi() {
  return loadComponentModule("how-it-works", () => import("./components/howItWorks.js"));
}

function loadFeaturesApi() {
  return loadComponentModule("features", () => import("./components/features.js"));
}

function loadProjectsApi() {
  return loadComponentModule("projects", () => import("./components/projects.js"));
}

function loadTestimonialsApi() {
  return loadComponentModule("testimonials", () => import("./components/testimonials.js"));
}

function loadAdminDashboardApi() {
  return loadComponentModule("admin-dashboard-page", () => import("./components/adminDashboardPage.js"));
}

function loadOpenMarketplaceApi() {
  return loadComponentModule("open-marketplace-page", () => import("./components/openMarketplacePage.js"));
}

function loadMarketplaceSubmissionApi() {
  return loadComponentModule("marketplace-submission-page", () => import("./components/marketplaceSubmissionPage.js"));
}

function loadMarketplaceSubmissionSuccessApi() {
  return loadComponentModule("marketplace-submission-success-page", () => import("./components/marketplaceSubmissionSuccessPage.js"));
}

function loadMarketplaceListingDetailApi() {
  return loadComponentModule("marketplace-listing-detail-page", () => import("./components/marketplaceListingDetailPage.js"));
}

function loadAccountSettingsApi() {
  return loadComponentModule("account-settings-page", () => import("./components/accountSettingsPage.js"));
}

function loadClientDashboardApi() {
  return loadComponentModule("client-dashboard-page", () => import("./components/clientDashboardPage.js"));
}

function loadClientBidsApi() {
  return loadComponentModule("client-bids-page", () => import("./components/clientBidsPage.js"));
}

function loadDeveloperDashboardApi() {
  return loadComponentModule("developer-dashboard-page", () => import("./components/developerDashboardPage.js"));
}

function loadDeveloperProfileApi() {
  return loadComponentModule("developer-profile-page", () => import("./components/developerProfilePage.js"));
}

function loadProjectDetailApi() {
  return loadComponentModule("project-detail-page", () => import("./components/projectDetailPage.js"));
}

function loadAuthPagesApi() {
  return loadComponentModule("auth-pages", () => import("./components/authPages.js"));
}

function loadProfessionalsApi() {
  return loadComponentModule("professionals-page", () => import("./components/professionalsPage.js"));
}

function isAdminUser() {
  const role = getAuthSession().user?.role;
  return role === "admin" || role === "moderator";
}

function withAdminNav(nav, adminLabel) {
  if (!isAdminUser()) {
    return nav;
  }

  const alreadyIncluded = nav.links.some((link) => link.href === "./admin-dashboard.html");
  if (alreadyIncluded) {
    return nav;
  }

  return {
    ...nav,
    links: [...nav.links, { label: adminLabel, href: "./admin-dashboard.html" }],
  };
}

function getMarketplaceHeaderAction(content, role, isAuthenticated) {
  if (!isAuthenticated) {
    return {
      label: content.openMarketplacePage.cta.guestHeaderLabel,
      href: "./create-account.html",
    };
  }

  if (role === "developer") {
    return {
      label: content.meta?.locale === "tr" ? "Geliştirici Teklifi Oluştur" : "Create Developer Proposal",
      href: "./professional-listing-submission.html",
    };
  }

  if (role === "client") {
    return {
      label: content.meta?.locale === "tr" ? "Talep İlanı Oluştur" : "Create Request Listing",
      href: "./client-project-submission.html",
    };
  }

  return null;
}

function createMarketplaceHeaderNav(content, role, isAuthenticated) {
  const navLinks = [...content.openMarketplacePage.nav.links];
  const headerAction = getMarketplaceHeaderAction(content, role, isAuthenticated);
  const createLinkIndex = navLinks.findIndex((link) => link.href === "./client-project-submission.html");
  const professionalLinkIndex = navLinks.findIndex((link) => link.href === "./professional-listing-submission.html");

  if (professionalLinkIndex >= 0) {
    navLinks.splice(professionalLinkIndex, 1);
  }

  if (createLinkIndex >= 0) {
    if (headerAction) {
      navLinks[createLinkIndex] = headerAction;
    } else {
      navLinks.splice(createLinkIndex, 1);
    }
  } else if (headerAction) {
    navLinks.push(headerAction);
  }

  return {
    ...content.openMarketplacePage.nav,
    links: navLinks,
  };
}

function createHomePageContent(content) {
  return {
    brand: content.brand,
    controls: content.controls,
    nav: withAdminNav(content.nav, content.adminDashboardPage.navLabel),
    hero: content.hero,
    howItWorks: content.howItWorks,
    features: content.features,
    projects: {
      ...content.projects,
      items: getManagedFeaturedProjects(content.projects.items),
    },
    testimonials: content.testimonials,
    footer: content.footer,
  };
}

function createProfessionalsPageContent(content) {
  return {
    brand: content.brand,
    controls: content.controls,
    ...content.professionalsPage,
    nav: withAdminNav(content.professionalsPage.nav, content.adminDashboardPage.navLabel),
  };
}

function createProjectDetailPageContent(content, projectSlug) {
  const detailPage = content.projectDetailPage;
  const projectEntries = Object.entries(detailPage.projects);
  const selectedProject = detailPage.projects[projectSlug] || projectEntries[0]?.[1];

  return {
    brand: content.brand,
    controls: content.controls,
    nav: {
      ...withAdminNav(detailPage.nav, content.adminDashboardPage.navLabel),
      cta: detailPage.sections.cta.requestLabel,
      ctaHref: detailPage.sections.cta.requestHref,
    },
    footer: detailPage.footer,
    detailPage,
    project: selectedProject,
  };
}

function createCreateAccountPageContent(content) {
  return {
    brand: content.brand,
    controls: content.controls,
    ...content.authPages.createAccount,
    nav: withAdminNav(content.authPages.createAccount.nav, content.adminDashboardPage.navLabel),
  };
}

function createLoginPageContent(content) {
  return {
    brand: content.brand,
    controls: content.controls,
    ...content.authPages.login,
    nav: withAdminNav(content.authPages.login.nav, content.adminDashboardPage.navLabel),
  };
}

function createModeratorLoginPageContent(content) {
  return {
    brand: content.brand,
    controls: content.controls,
    ...content.authPages.moderatorLogin,
    nav: withAdminNav(content.authPages.moderatorLogin.nav, content.adminDashboardPage.navLabel),
  };
}

function isClosedClientListing(listing) {
  const listingStatus = listing?.marketplaceMeta?.listingStatus || listing?.status || "";
  return Boolean(
    listing?.marketplaceMeta?.acceptedBidId
      || listing?.marketplaceMeta?.acceptedBid
      || ["closed", "completed", "awarded", "bid-accepted"].includes(listingStatus)
  );
}

/* ─── SWR cache helpers for dashboards ─── */
const DASHBOARD_SWR_KEY = "yapply-swr-client-dashboard";
const DEV_DASHBOARD_SWR_KEY = "yapply-swr-dev-dashboard";
const DASHBOARD_SWR_MAX_AGE_MS = 3 * 60 * 1000; // 3 minutes

function dashboardSwrRead(key) {
  // Always read from localStorage directly — no in-memory layer.
  // This avoids stale data bugs when other modules (marketplaceStore) write to localStorage.
  const cacheKey = key || DASHBOARD_SWR_KEY;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}

function dashboardSwrWrite(data, key) {
  const cacheKey = key || DASHBOARD_SWR_KEY;
  const entry = { ts: Date.now(), data };
  try {
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (_) {}
}

function dashboardSwrIsStale(cached) {
  return !cached || (Date.now() - (cached.ts || 0)) > DASHBOARD_SWR_MAX_AGE_MS;
}

function _listingsFingerprint(listings) {
  if (!Array.isArray(listings)) return "";
  return listings.map((l) => {
    if (!l) return "";
    const m = l.marketplaceMeta || {};
    const bids = Array.isArray(l.bids) ? l.bids : (Array.isArray(m.latestBids) ? m.latestBids : []);
    const bidStatuses = bids.map((b) => `${b?.id || ""}:${b?.status || ""}`).join("+");
    return `${l.id}|${m.listingStatus || l.status || ""}|${m.bidCount || 0}|${m.acceptedBidId || ""}|${bidStatuses}`;
  }).join(",");
}

async function createClientDashboardPageContent(content) {
  const session = getAuthSession();
  const ownerUserId = session?.authenticated ? session.user?.id || "" : "";

  // Read cached data from localStorage (always fresh read, no in-memory layer)
  const cached = dashboardSwrRead(DASHBOARD_SWR_KEY);
  const hasCachedListings = cached && Array.isArray(cached.data) && cached.data.length > 0;
  const localListings = getOwnedSubmittedListings("client", ownerUserId);

  // Network fetch — always runs
  const fetchFromNetwork = async () => {
    try {
      const data = await fetchClientDashboardData();
      const listings = data.listings || [];
      dashboardSwrWrite(listings, DASHBOARD_SWR_KEY);
      return listings;
    } catch (_) {
      return null; // signal failure
    }
  };

  let ownedListings;

  if (hasCachedListings) {
    // Show cached data instantly, refresh in background
    ownedListings = cached.data;
    const fingerprint = _listingsFingerprint(ownedListings);
    fetchFromNetwork().then((fresh) => {
      if (fresh && _listingsFingerprint(fresh) !== fingerprint) {
        console.log("[swr] Client dashboard data changed — re-rendering");
        window.__yapplyRenderPage?.();
      }
    }).catch(() => {});
  } else {
    // Cold start — MUST await network. Show local as fallback only if network fails.
    const fresh = await fetchFromNetwork();
    if (fresh && fresh.length > 0) {
      ownedListings = fresh;
    } else if (localListings.length > 0) {
      ownedListings = localListings;
    } else {
      // Re-read cache in case another module populated it during our await
      const retryCache = dashboardSwrRead(DASHBOARD_SWR_KEY);
      ownedListings = (retryCache && Array.isArray(retryCache.data)) ? retryCache.data : [];
    }
  }

  const activeListings = ownedListings.filter((listing) => !isClosedClientListing(listing));
  const closedListings = ownedListings.filter((listing) => isClosedClientListing(listing));

  return {
    meta: content.meta,
    brand: content.brand,
    controls: content.controls,
    ...content.clientDashboardPage,
    viewerSession: session,
    nav: withAdminNav(
      {
        ...content.clientDashboardPage.nav,
      },
      content.adminDashboardPage.navLabel
    ),
    footer: content.openMarketplacePage.footer,
    activeListings,
    closedListings,
  };
}

async function createClientBidsPageContent(content) {
  const session = getAuthSession();
  const ownerUserId = session?.authenticated ? session.user?.id || "" : "";

  const CLIENT_BIDS_SWR_KEY = "yapply-swr-client-bids";
  const cached = dashboardSwrRead(CLIENT_BIDS_SWR_KEY);
  const hasCachedListings = cached && Array.isArray(cached.data) && cached.data.length > 0;
  const localListings = getOwnedSubmittedListings("client", ownerUserId);

  // Network fetch — always runs
  const fetchFromNetwork = async () => {
    try {
      const data = await fetchClientDashboardData();
      const listings = data.listings || [];
      dashboardSwrWrite(listings, CLIENT_BIDS_SWR_KEY);
      return listings;
    } catch (_) {
      return null; // signal failure
    }
  };

  let allListings;

  if (hasCachedListings) {
    // Show cached data instantly, refresh in background
    allListings = cached.data;
    const fingerprint = _listingsFingerprint(allListings);
    fetchFromNetwork().then((fresh) => {
      if (fresh && _listingsFingerprint(fresh) !== fingerprint) {
        console.log("[swr] Client bids data changed — re-rendering");
        window.__yapplyRenderPage?.();
      }
    }).catch(() => {});
  } else {
    // Cold start — MUST await network. Show local as fallback only if network fails.
    const fresh = await fetchFromNetwork();
    if (fresh && fresh.length > 0) {
      allListings = fresh;
    } else if (localListings.length > 0) {
      allListings = localListings;
    } else {
      // Re-read cache in case another module populated it during our await
      const retryCache = dashboardSwrRead(CLIENT_BIDS_SWR_KEY);
      allListings = (retryCache && Array.isArray(retryCache.data)) ? retryCache.data : [];
    }
  }

  return {
    meta: content.meta,
    brand: content.brand,
    controls: content.controls,
    ...content.clientBidsPage,
    viewerSession: session,
    nav: {
      ...content.clientBidsPage.nav,
    },
    footer: content.openMarketplacePage.footer,
    allListings,
  };
}

function mergeDashboardItems(primaryItems = [], secondaryItems = []) {
  const merged = [...primaryItems, ...secondaryItems];

  return merged.filter((item, index, items) => {
    const itemKey = item?.id || item?.listingId || `${item?.createdAt || ""}-${item?.title || item?.name || ""}`;
    return items.findIndex((candidate) => {
      const candidateKey = candidate?.id || candidate?.listingId || `${candidate?.createdAt || ""}-${candidate?.title || candidate?.name || ""}`;
      return candidateKey === itemKey;
    }) === index;
  });
}

function mergeAdminListingSeeds(primaryItems = [], secondaryItems = []) {
  const merged = [...primaryItems, ...secondaryItems];

  return merged.filter((item, index, items) => {
    const itemKey = item?.adminKey || item?.id || item?.slug || `${item?.title || item?.name || ""}-${item?.createdAt || ""}`;
    return items.findIndex((candidate) => {
      const candidateKey =
        candidate?.adminKey || candidate?.id || candidate?.slug || `${candidate?.title || candidate?.name || ""}-${candidate?.createdAt || ""}`;
      return candidateKey === itemKey;
    }) === index;
  });
}

function applyViewerAvatarToOwnedListings(items = [], session = null) {
  if (!Array.isArray(items) || items.length === 0 || !session?.authenticated || !session.user?.id) {
    return items;
  }

  const viewerId = String(session.user.id || "").trim();
  const viewerAvatar = String(session.user.profilePictureSrc || "").trim();
  const viewerRole = String(session.user.role || "").trim();

  return items.map((item) => {
    if (!item || String(item.ownerUserId || "").trim() !== viewerId || item.creatorAvatarSrc) {
      return item;
    }

    return {
      ...item,
      creatorRole: item.creatorRole || viewerRole || item.ownerRole || "",
      creatorAvatarSrc: viewerAvatar,
    };
  });
}

function applyViewerAvatarToOwnedListing(item, session = null) {
  const [decoratedItem] = applyViewerAvatarToOwnedListings(item ? [item] : [], session);
  return decoratedItem || item;
}

function createDeveloperDashboardPageContent(content, runtimeData = {}) {
  const session = getAuthSession();
  const ownerUserId = session?.authenticated ? session.user?.id || "" : "";
  const localListings = getOwnedSubmittedListings("professional", ownerUserId);

  // SWR: try cached developer dashboard data for instant render
  const cached = dashboardSwrRead(DEV_DASHBOARD_SWR_KEY);
  const hasFreshCache = cached && !dashboardSwrIsStale(cached) && cached.data;

  let remoteListings, remoteBids, localBids;

  if (hasFreshCache && !runtimeData.developerOwnedListings) {
    // Use cache — runtimeData was empty (came from SWR path in loadMarketplaceRuntimeData)
    remoteListings = cached.data.listings || [];
    remoteBids = cached.data.bids || [];
    localBids = Array.isArray(runtimeData.developerLocalBidEntries) ? runtimeData.developerLocalBidEntries : [];
  } else {
    remoteListings = Array.isArray(runtimeData.developerOwnedListings) ? runtimeData.developerOwnedListings : [];
    remoteBids = Array.isArray(runtimeData.developerBidEntries) ? runtimeData.developerBidEntries : [];
    localBids = Array.isArray(runtimeData.developerLocalBidEntries) ? runtimeData.developerLocalBidEntries : [];
    // Write fresh data to cache
    if (remoteListings.length > 0 || remoteBids.length > 0) {
      dashboardSwrWrite({ listings: remoteListings, bids: remoteBids }, DEV_DASHBOARD_SWR_KEY);
    }
  }

  const ownedListings = mergeDashboardItems(localListings, remoteListings);
  const bidEntries = mergeDashboardItems(localBids, remoteBids);

  return {
    meta: content.meta,
    brand: content.brand,
    controls: content.controls,
    ...content.developerDashboardPage,
    viewerSession: session,
    nav: withAdminNav(
      {
        ...content.developerDashboardPage.nav,
      },
      content.adminDashboardPage.navLabel
    ),
    footer: content.openMarketplacePage.footer,
    ownedListings,
    bidEntries,
  };
}

function createAccountSettingsPageContent(content) {
  const session = getAuthSession();
  const isClient = session?.authenticated && session.user?.role === "client";
  const isDeveloper = session?.authenticated && session.user?.role === "developer";

  return {
    meta: content.meta,
    brand: content.brand,
    controls: content.controls,
    ...content.accountSettingsPage,
    viewerSession: session,
    nav: withAdminNav(
      {
        ...content.accountSettingsPage.nav,
        links: isClient
          ? content.accountSettingsPage.nav.clientLinks
          : isDeveloper
            ? content.accountSettingsPage.nav.developerLinks
            : content.accountSettingsPage.nav.links,
      },
      content.adminDashboardPage.navLabel
    ),
    footer: content.openMarketplacePage.footer,
  };
}

function createOpenMarketplacePageContent(content, runtimeData = {}) {
  const managedCollections = getManagedMarketplaceCollections(
    content.openMarketplacePage.tabs.client.items,
    content.openMarketplacePage.tabs.developer.items
  );
  const publicClientListings = Array.isArray(runtimeData.publicClientListings) ? runtimeData.publicClientListings : [];
  const publicProfessionalListings = Array.isArray(runtimeData.publicProfessionalListings) ? runtimeData.publicProfessionalListings : [];
  const hasBackendClientListings = publicClientListings.length > 0 || runtimeData.publicListingError === false;
  // Backend is considered "active" if we got data OR the request completed without error.
  // Seed data is ONLY used when the backend is completely unreachable (dev/preview mode).
  const hasBackendProfessionalListings = publicProfessionalListings.length > 0 || runtimeData.publicProfessionalListingError === false;
  // If EITHER listing type came from the backend, the backend is reachable —
  // never mix in seed / local-storage data because it creates ghost listings.
  const backendIsReachable = hasBackendClientListings || hasBackendProfessionalListings;
  const clientSeedFallback = hasBackendClientListings ? [] : managedCollections.client;
  // When backend is reachable, skip ALL local professional submissions and seed data.
  // This is the aggressive fix: local submissions and seed data only matter in
  // fully-offline / dev-preview mode where the backend is completely unreachable.
  const localProfessionalSubmissions = backendIsReachable ? [] : getSubmittedListings("professional");
  const professionalSeedFallback = backendIsReachable ? [] : managedCollections.professional;
  const dedupeListings = (items) => items.filter((item, index, all) => {
    const itemKey = item?.id || item?.slug || item?.adminKey;
    if (!itemKey) return true;
    return all.findIndex((c) => (c?.id || c?.slug || c?.adminKey) === itemKey) === index;
  });
  const mergedClientListings = dedupeListings([...publicClientListings, ...clientSeedFallback]);
  const mergedProfessionalListings = dedupeListings([...publicProfessionalListings, ...localProfessionalSubmissions, ...professionalSeedFallback]);
  const session = getAuthSession();
  const role = session?.authenticated ? session.user?.role || "" : "";
  const allowedSubmissionType = getAllowedMarketplaceSubmissionTypeForRole(role);
  const isAuthenticated = Boolean(session?.authenticated && session?.user);
  const guestListingHref = "./create-account.html";
  const listingCreateLabel =
    allowedSubmissionType === "professional" ? content.openMarketplacePage.cta.proLabel : content.openMarketplacePage.cta.clientLabel;
  const listingCreateHref =
    allowedSubmissionType === "professional"
      ? content.openMarketplacePage.cta.proHref
      : allowedSubmissionType === "client"
        ? content.openMarketplacePage.cta.clientHref
        : guestListingHref;
  const navLinks = createMarketplaceHeaderNav(content, role, isAuthenticated).links;

  const footerColumns = content.openMarketplacePage.footer.columns.map((column) => ({
    ...column,
    links: column.links
      .map((link) => {
        if (link.href !== "./client-project-submission.html") {
          return link;
        }

        if (allowedSubmissionType) {
          return {
            ...link,
            label: allowedSubmissionType === "professional" ? listingCreateLabel : link.label,
            href: listingCreateHref,
          };
        }

        if (isAuthenticated) {
          return null;
        }

        return {
          ...link,
          label: link.label,
          href: guestListingHref,
        };
      })
      .filter(Boolean),
  }));

  const heroPrimaryCta = isAuthenticated
    ? content.openMarketplacePage.hero.primaryCta
    : {
        ...content.openMarketplacePage.hero.primaryCta,
        label: content.openMarketplacePage.cta.guestHeroPrimaryLabel,
        href: "./open-marketplace.html#marketplace-listings",
      };
  const heroSecondaryCta = isAuthenticated
    ? content.openMarketplacePage.hero.secondaryCta
    : {
        ...content.openMarketplacePage.hero.secondaryCta,
        label: content.openMarketplacePage.cta.guestHeroSecondaryLabel,
        href: "./login.html",
      };

  return {
    meta: content.meta,
    brand: content.brand,
    controls: content.controls,
    ...content.openMarketplacePage,
    nav: withAdminNav(
      {
        ...createMarketplaceHeaderNav(content, role, isAuthenticated),
        links: navLinks,
      },
      content.adminDashboardPage.navLabel
    ),
    footer: {
      ...content.openMarketplacePage.footer,
      columns: footerColumns,
    },
    hero: {
      ...content.openMarketplacePage.hero,
      primaryCta: heroPrimaryCta,
      secondaryCta: heroSecondaryCta,
    },
    listingAccess: {
      authenticated: isAuthenticated,
      role,
      allowedSubmissionType,
    },
    tabs: {
      ...content.openMarketplacePage.tabs,
      client: {
        ...content.openMarketplacePage.tabs.client,
        items: applyViewerAvatarToOwnedListings(mergedClientListings, session),
      },
      developer: {
        ...content.openMarketplacePage.tabs.developer,
        items: applyViewerAvatarToOwnedListings(mergedProfessionalListings, session),
      },
    },
    publicListingFilters: runtimeData.publicListingFilters || { category: "", status: "open-for-bids" },
    publicListingError: Boolean(runtimeData.publicListingError),
  };
}

function createMarketplaceSubmissionPageContent(content, submissionType) {
  const submissionPage = content.marketplaceSubmissionPages[submissionType] || content.marketplaceSubmissionPages.client;
  const session = getAuthSession();
  const role = session?.authenticated ? session.user?.role || "" : "";
  const isAuthenticated = Boolean(session?.authenticated && session?.user);

  return {
    brand: content.brand,
    controls: content.controls,
    ...submissionPage,
    nav: withAdminNav(submissionPage.nav, content.adminDashboardPage.navLabel),
    submissionType,
    listingAccess: {
      authenticated: isAuthenticated,
      role,
      allowedSubmissionType: getAllowedMarketplaceSubmissionTypeForRole(role),
    },
  };
}

function createMarketplaceSubmissionSuccessContent(content, submissionType, listingId) {
  const lastSubmission = getLastSubmission();
  const resolvedId = listingId || (lastSubmission?.type === submissionType ? lastSubmission.id : "");
  const listing = getSubmittedListing(submissionType, resolvedId) || getLastSubmissionDetail(submissionType, resolvedId);

  return {
    brand: content.brand,
    controls: content.controls,
    ...content.marketplaceSubmissionPages[submissionType],
    nav: withAdminNav(content.marketplaceSubmissionPages[submissionType].nav, content.adminDashboardPage.navLabel),
    marketplaceFlow: content.marketplaceFlow,
    submissionType,
    listing,
  };
}

function createMarketplaceListingDetailContent(content, listingType, listingId, runtimeData = {}) {
  const session = getAuthSession();
  const role = session?.authenticated ? session.user?.role || "" : "";
  const isAuthenticated = Boolean(session?.authenticated && session?.user);
  const managedListing = getManagedMarketplaceListing(
    listingType,
    listingId,
    content.openMarketplacePage.tabs.client.items,
    content.openMarketplacePage.tabs.developer.items
  );
  const submittedListing = getSubmittedListing(listingType, listingId) || getLastSubmissionDetail(listingType, listingId);

  return {
    meta: content.meta,
    brand: content.brand,
    controls: content.controls,
    viewerSession: session,
    nav: withAdminNav(createMarketplaceHeaderNav(content, role, isAuthenticated), content.adminDashboardPage.navLabel),
    footer: content.openMarketplacePage.footer,
    marketplaceFlow: content.marketplaceFlow,
    listing: runtimeData.publicListing || applyViewerAvatarToOwnedListing(managedListing || submittedListing, session),
  };
}

function createDeveloperProfilePageContent(content, developerSlug) {
  const developerPage = content.developerProfilePage;
  const profileEntries = Object.entries(developerPage.profiles);
  const selectedProfile = developerPage.profiles[developerSlug] || profileEntries[0]?.[1];

  return {
    brand: content.brand,
    controls: content.controls,
    nav: {
      ...withAdminNav(developerPage.nav, content.adminDashboardPage.navLabel),
      cta: developerPage.hero.primaryCta,
      ctaHref: "#developer-inquiry",
    },
    footer: developerPage.footer,
    profilePage: developerPage,
    profile: selectedProfile,
  };
}

function createAdminDashboardPageContent(content, runtimeData = {}) {
  const remoteClientListings = Array.isArray(runtimeData.adminClientListings) ? runtimeData.adminClientListings : [];
  const remoteProfessionalListings = Array.isArray(runtimeData.adminProfessionalListings) ? runtimeData.adminProfessionalListings : [];
  const managedCollections = getManagedMarketplaceCollections(
    mergeAdminListingSeeds(remoteClientListings, content.openMarketplacePage.tabs.client.items),
    mergeAdminListingSeeds(remoteProfessionalListings, content.openMarketplacePage.tabs.developer.items)
  );

  return {
    brand: content.brand,
    controls: content.controls,
    ...content.adminDashboardPage,
    nav: withAdminNav(content.adminDashboardPage.nav, content.adminDashboardPage.navLabel),
    listings: {
      ...content.adminDashboardPage.listings,
      clientItems: managedCollections.client,
      professionalItems: managedCollections.professional,
    },
    featuredProjects: {
      ...content.adminDashboardPage.featuredProjects,
      items: getManagedFeaturedProjects(content.projects.items),
    },
  };
}

async function createHomePage(content, locale) {
  const pageContent = createHomePageContent(content);
  const [
    { createNavbar },
    { createHero },
    { createHowItWorks },
    { createFeatures },
    { createTestimonials },
    { createFooter },
  ] = await Promise.all([
    loadNavbarApi(),
    loadHeroApi(),
    loadHowItWorksApi(),
    loadFeaturesApi(),
    loadTestimonialsApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createHero(pageContent)}
        ${createFeatures(pageContent)}
        ${createHowItWorks(pageContent)}
        ${createTestimonials(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createProfessionalsPage(content, locale) {
  const pageContent = createProfessionalsPageContent(content);
  const [
    { createNavbar },
    {
      createProfessionalsBenefits,
      createProfessionalsFaq,
      createProfessionalsForm,
      createProfessionalsHero,
      createProfessionalsProcess,
      createProfessionalsStats,
      createProfessionalsWhoCanApply,
    },
    { createFooter },
  ] = await Promise.all([
    loadNavbarApi(),
    loadProfessionalsApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createProfessionalsHero(pageContent)}
        ${createProfessionalsBenefits(pageContent)}
        ${createProfessionalsWhoCanApply(pageContent)}
        ${createProfessionalsProcess(pageContent)}
        ${createProfessionalsStats(pageContent)}
        ${createProfessionalsForm(pageContent)}
        ${createProfessionalsFaq(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createProjectDetail(content, locale, projectSlug) {
  const pageContent = createProjectDetailPageContent(content, projectSlug);
  const [{ createNavbar }, { createProjectDetailPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadProjectDetailApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createProjectDetailPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createMarketplace(content, locale, runtimeData) {
  const pageContent = createOpenMarketplacePageContent(content, runtimeData);
  const [{ createNavbar }, { createOpenMarketplacePage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadOpenMarketplaceApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createOpenMarketplacePage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createMarketplaceSubmission(content, locale, submissionType) {
  const pageContent = createMarketplaceSubmissionPageContent(content, submissionType);
  const [{ createNavbar }, { createMarketplaceSubmissionPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadMarketplaceSubmissionApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createMarketplaceSubmissionPage(pageContent, submissionType)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createMarketplaceSubmissionSuccess(content, locale, submissionType, listingId) {
  const pageContent = createMarketplaceSubmissionSuccessContent(content, submissionType, listingId);
  const [{ createNavbar }, { createMarketplaceSubmissionSuccessPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadMarketplaceSubmissionSuccessApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createMarketplaceSubmissionSuccessPage(pageContent, pageContent.listing, submissionType)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createMarketplaceListingDetail(content, locale, listingType, listingId, runtimeData) {
  const pageContent = createMarketplaceListingDetailContent(content, listingType, listingId, runtimeData);
  const [{ createNavbar }, { createMarketplaceListingDetailPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadMarketplaceListingDetailApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createMarketplaceListingDetailPage(pageContent, listingType, pageContent.listing)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createDeveloperProfile(content, locale, developerSlug) {
  const pageContent = createDeveloperProfilePageContent(content, developerSlug);
  const [{ createNavbar }, { createDeveloperProfilePage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadDeveloperProfileApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createDeveloperProfilePage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createAccountPage(content, locale) {
  const pageContent = createCreateAccountPageContent(content);
  const [{ createNavbar }, { createCreateAccountPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadAuthPagesApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createCreateAccountPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createLoginEntryPage(content, locale) {
  const pageContent = createLoginPageContent(content);
  const [{ createNavbar }, { createLoginPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadAuthPagesApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createLoginPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createModeratorEntryPage(content, locale) {
  const pageContent = createModeratorLoginPageContent(content);
  const [{ createNavbar }, { createModeratorLoginPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadAuthPagesApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createModeratorLoginPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createAdminDashboard(content, locale, runtimeData) {
  const pageContent = createAdminDashboardPageContent(content, runtimeData);
  const isAdmin = isAdminUser();
  const [{ createNavbar }, { createAdminAccessDeniedPage, createAdminDashboardPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadAdminDashboardApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${isAdmin ? createAdminDashboardPage(pageContent) : createAdminAccessDeniedPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createClientDashboard(content, locale) {
  const pageContent = await createClientDashboardPageContent(content);
  const [{ createNavbar }, { createClientDashboardPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadClientDashboardApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createClientDashboardPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createAccountSettings(content, locale) {
  const pageContent = createAccountSettingsPageContent(content);
  const [{ createNavbar }, { createAccountSettingsPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadAccountSettingsApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createAccountSettingsPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createClientBids(content, locale, runtimeData) {
  const pageContent = await createClientBidsPageContent(content);
  const [{ createNavbar }, { createClientBidsPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadClientBidsApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createClientBidsPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

async function createDeveloperDashboard(content, locale, runtimeData) {
  const pageContent = createDeveloperDashboardPageContent(content, runtimeData);
  const [{ createNavbar }, { createDeveloperDashboardPage }, { createFooter }] = await Promise.all([
    loadNavbarApi(),
    loadDeveloperDashboardApi(),
    loadFooterApi(),
  ]);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createDeveloperDashboardPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

export async function createApp(
  content,
  locale,
  page = "home",
  projectSlug = "",
  submissionType = "",
  developerSlug = "",
  listingType = "",
  listingId = "",
  runtimeData = {}
) {
  if (page === "create-account") {
    return createAccountPage(content, locale);
  }

  if (page === "login") {
    return createLoginEntryPage(content, locale);
  }

  if (page === "moderator-login") {
    return createModeratorEntryPage(content, locale);
  }

  if (page === "admin-dashboard") {
    return createAdminDashboard(content, locale, runtimeData);
  }

  if (page === "client-dashboard") {
    return createClientDashboard(content, locale);
  }

  if (page === "client-bids") {
    return createClientBids(content, locale, runtimeData);
  }

  if (page === "developer-dashboard") {
    return createDeveloperDashboard(content, locale, runtimeData);
  }

  if (page === "account-settings") {
    return createAccountSettings(content, locale);
  }

  if (page === "professionals") {
    return createProfessionalsPage(content, locale);
  }

  if (page === "open-marketplace") {
    return createMarketplace(content, locale, runtimeData);
  }

  if (page === "marketplace-submission") {
    return createMarketplaceSubmission(content, locale, submissionType);
  }

  if (page === "marketplace-submission-success") {
    return createMarketplaceSubmissionSuccess(content, locale, submissionType, listingId);
  }

  if (page === "marketplace-listing-detail") {
    return createMarketplaceListingDetail(content, locale, listingType, listingId, runtimeData);
  }

  if (page === "developer-profile") {
    return createDeveloperProfile(content, locale, developerSlug);
  }

  if (page === "project-detail") {
    return createProjectDetail(content, locale, projectSlug);
  }

  return createHomePage(content, locale);
}
