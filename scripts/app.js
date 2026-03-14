import { createNavbar } from "./components/navbar.js";
import { createHero } from "./components/hero.js";
import { createHowItWorks } from "./components/howItWorks.js";
import { createFeatures } from "./components/features.js";
import { createProjects } from "./components/projects.js";
import { createTestimonials } from "./components/testimonials.js";
import { createFooter } from "./components/footer.js";
import { createAdminAccessDeniedPage, createAdminDashboardPage } from "./components/adminDashboardPage.js";
import { createOpenMarketplacePage } from "./components/openMarketplacePage.js";
import { createMarketplaceSubmissionPage } from "./components/marketplaceSubmissionPage.js";
import { createMarketplaceSubmissionSuccessPage } from "./components/marketplaceSubmissionSuccessPage.js";
import { createMarketplaceListingDetailPage } from "./components/marketplaceListingDetailPage.js";
import { createDeveloperProfilePage } from "./components/developerProfilePage.js";
import { createProjectDetailPage } from "./components/projectDetailPage.js";
import { createCreateAccountPage, createLoginPage, createModeratorLoginPage } from "./components/authPages.js";
import {
  getManagedFeaturedProjects,
  getManagedMarketplaceCollections,
  getManagedMarketplaceListing,
} from "./core/adminStore.js";
import {
  getAllowedMarketplaceSubmissionTypeForRole,
  getLastSubmission,
  getLastSubmissionDetail,
  getSubmittedListing,
} from "./core/marketplaceStore.js";
import { getAuthSession } from "./core/state.js";
import {
  createProfessionalsBenefits,
  createProfessionalsFaq,
  createProfessionalsForm,
  createProfessionalsHero,
  createProfessionalsProcess,
  createProfessionalsStats,
  createProfessionalsWhoCanApply,
} from "./components/professionalsPage.js";

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

function createOpenMarketplacePageContent(content, runtimeData = {}) {
  const managedCollections = getManagedMarketplaceCollections(
    content.openMarketplacePage.tabs.client.items,
    content.openMarketplacePage.tabs.developer.items
  );
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
  const navLinks = [...content.openMarketplacePage.nav.links];
  const createLinkIndex = navLinks.findIndex((link) => link.href === "./client-project-submission.html");

  if (createLinkIndex >= 0) {
    if (allowedSubmissionType) {
      navLinks[createLinkIndex] = {
          label: listingCreateLabel,
          href: listingCreateHref,
        };
    } else if (isAuthenticated) {
      navLinks.splice(createLinkIndex, 1);
    } else {
      navLinks[createLinkIndex] = {
        label: content.openMarketplacePage.cta.guestHeaderLabel,
        href: guestListingHref,
      };
    }
  }

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
        ...content.openMarketplacePage.nav,
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
        items: Array.isArray(runtimeData.publicClientListings) ? runtimeData.publicClientListings : managedCollections.client,
      },
      developer: {
        ...content.openMarketplacePage.tabs.developer,
        items: managedCollections.professional,
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
    viewerSession: getAuthSession(),
    nav: {
      ...withAdminNav(content.openMarketplacePage.nav, content.adminDashboardPage.navLabel),
      cta: content.marketplaceFlow.detail.backToMarketplace,
      ctaHref: "./open-marketplace.html",
    },
    footer: content.openMarketplacePage.footer,
    marketplaceFlow: content.marketplaceFlow,
    listing: runtimeData.publicListing || managedListing || submittedListing,
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

function createAdminDashboardPageContent(content) {
  const managedCollections = getManagedMarketplaceCollections(
    content.openMarketplacePage.tabs.client.items,
    content.openMarketplacePage.tabs.developer.items
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

function createHomePage(content, locale) {
  const pageContent = createHomePageContent(content);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createHero(pageContent)}
        ${createHowItWorks(pageContent)}
        ${createFeatures(pageContent)}
        ${createProjects(pageContent)}
        ${createTestimonials(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

function createProfessionalsPage(content, locale) {
  const pageContent = createProfessionalsPageContent(content);

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

function createProjectDetail(content, locale, projectSlug) {
  const pageContent = createProjectDetailPageContent(content, projectSlug);

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

function createMarketplace(content, locale, runtimeData) {
  const pageContent = createOpenMarketplacePageContent(content, runtimeData);

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

function createMarketplaceSubmission(content, locale, submissionType) {
  const pageContent = createMarketplaceSubmissionPageContent(content, submissionType);

  return `
    <div class="page-shell">
      ${createNavbar(pageContent, locale)}
      <main>
        ${createMarketplaceSubmissionPage(pageContent)}
      </main>
      ${createFooter(pageContent)}
    </div>
  `;
}

function createMarketplaceSubmissionSuccess(content, locale, submissionType, listingId) {
  const pageContent = createMarketplaceSubmissionSuccessContent(content, submissionType, listingId);

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

function createMarketplaceListingDetail(content, locale, listingType, listingId, runtimeData) {
  const pageContent = createMarketplaceListingDetailContent(content, listingType, listingId, runtimeData);

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

function createDeveloperProfile(content, locale, developerSlug) {
  const pageContent = createDeveloperProfilePageContent(content, developerSlug);

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

function createAccountPage(content, locale) {
  const pageContent = createCreateAccountPageContent(content);

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

function createLoginEntryPage(content, locale) {
  const pageContent = createLoginPageContent(content);

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

function createModeratorEntryPage(content, locale) {
  const pageContent = createModeratorLoginPageContent(content);

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

function createAdminDashboard(content, locale) {
  const pageContent = createAdminDashboardPageContent(content);
  const isAdmin = isAdminUser();

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

export function createApp(content, locale, page = "home", projectSlug = "", submissionType = "", developerSlug = "", listingType = "", listingId = "", runtimeData = {}) {
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
    return createAdminDashboard(content, locale);
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
