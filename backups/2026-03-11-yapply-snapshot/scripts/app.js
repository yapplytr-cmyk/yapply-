import { createNavbar } from "./components/navbar.js";
import { createHero } from "./components/hero.js";
import { createHowItWorks } from "./components/howItWorks.js";
import { createFeatures } from "./components/features.js";
import { createProjects } from "./components/projects.js";
import { createTestimonials } from "./components/testimonials.js";
import { createFooter } from "./components/footer.js";
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

export function createApp(content, locale, page = "home") {
  return page === "professionals" ? createProfessionalsPage(content, locale) : createHomePage(content, locale);
}
