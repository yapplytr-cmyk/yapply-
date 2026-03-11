import { createNavbar } from "./components/navbar.js";
import { createHero } from "./components/hero.js";
import { createHowItWorks } from "./components/howItWorks.js";
import { createFeatures } from "./components/features.js";
import { createProjects } from "./components/projects.js";
import { createTestimonials } from "./components/testimonials.js";
import { createFooter } from "./components/footer.js";
import { createOpenMarketplacePage } from "./components/openMarketplacePage.js";
import { createMarketplaceSubmissionPage } from "./components/marketplaceSubmissionPage.js";
import { createDeveloperProfilePage } from "./components/developerProfilePage.js";
import { createProjectDetailPage } from "./components/projectDetailPage.js";
import {
  createProfessionalsBenefits,
  createProfessionalsFaq,
  createProfessionalsForm,
  createProfessionalsHero,
  createProfessionalsProcess,
  createProfessionalsStats,
  createProfessionalsWhoCanApply,
} from "./components/professionalsPage.js";

function createHomePageContent(content) {
  return {
    brand: content.brand,
    controls: content.controls,
    nav: content.nav,
    hero: content.hero,
    howItWorks: content.howItWorks,
    features: content.features,
    projects: content.projects,
    testimonials: content.testimonials,
    footer: content.footer,
  };
}

function createProfessionalsPageContent(content) {
  return {
    brand: content.brand,
    controls: content.controls,
    ...content.professionalsPage,
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
      ...detailPage.nav,
      cta: detailPage.sections.cta.requestLabel,
      ctaHref: detailPage.sections.cta.requestHref,
    },
    footer: detailPage.footer,
    detailPage,
    project: selectedProject,
  };
}

function createOpenMarketplacePageContent(content) {
  return {
    brand: content.brand,
    controls: content.controls,
    ...content.openMarketplacePage,
  };
}

function createMarketplaceSubmissionPageContent(content, submissionType) {
  const submissionPage = content.marketplaceSubmissionPages[submissionType] || content.marketplaceSubmissionPages.client;

  return {
    brand: content.brand,
    controls: content.controls,
    ...submissionPage,
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
      ...developerPage.nav,
      cta: developerPage.hero.primaryCta,
      ctaHref: "#developer-inquiry",
    },
    footer: developerPage.footer,
    profilePage: developerPage,
    profile: selectedProfile,
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

function createMarketplace(content, locale) {
  const pageContent = createOpenMarketplacePageContent(content);

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

export function createApp(content, locale, page = "home", projectSlug = "", submissionType = "", developerSlug = "") {
  if (page === "professionals") {
    return createProfessionalsPage(content, locale);
  }

  if (page === "open-marketplace") {
    return createMarketplace(content, locale);
  }

  if (page === "marketplace-submission") {
    return createMarketplaceSubmission(content, locale, submissionType);
  }

  if (page === "developer-profile") {
    return createDeveloperProfile(content, locale, developerSlug);
  }

  if (page === "project-detail") {
    return createProjectDetail(content, locale, projectSlug);
  }

  return createHomePage(content, locale);
}
