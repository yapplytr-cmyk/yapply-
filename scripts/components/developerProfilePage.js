import { createButton, createSectionHeading } from "./primitives.js";

function createFactCards(labels, profile) {
  const facts = [
    { label: labels.specialty, value: profile.specialty },
    { label: labels.location, value: profile.location },
    { label: labels.startingPrice, value: profile.startingPrice },
    { label: labels.deliveryRange, value: profile.deliveryRange },
  ];

  return facts
    .map(
      (item) => `
        <article class="developer-profile-fact panel">
          <span class="developer-profile-fact__label">${item.label}</span>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");
}

function createMetricCards(labels, profile) {
  const metrics = [
    { label: labels.experience, value: profile.experience },
    { label: labels.projectsDelivered, value: profile.projectsDelivered },
    { label: labels.serviceArea, value: profile.serviceArea },
  ];

  return metrics
    .map(
      (item) => `
        <article class="metric-card developer-profile-metric">
          <span class="metric-value">${item.value}</span>
          <p class="metric-label">${item.label}</p>
        </article>
      `
    )
    .join("");
}

function createDeveloperHero(content, profile) {
  return `
    <section class="developer-profile-hero section-shell">
      <div class="developer-profile-hero__layout">
        <div class="developer-profile-hero__copy">
          <p class="eyebrow">${content.hero.eyebrow}</p>
          <h1 class="hero-title developer-profile-hero__title">${profile.name}</h1>
          <p class="hero-lead developer-profile-hero__lead">${profile.subtitle}</p>
          <div class="hero-actions">
            ${createButton({ href: "#developer-inquiry", label: content.hero.primaryCta, variant: "primary" })}
            ${createButton({ href: "#developer-projects", label: content.hero.secondaryCta, variant: "secondary" })}
          </div>
          <div class="chip-row">
            ${profile.tags.map((tag) => `<span class="chip">${tag}</span>`).join("")}
          </div>
        </div>

        <div class="developer-profile-visual panel">
          <div class="developer-profile-visual__grid"></div>
          <img class="developer-profile-visual__image" src="${profile.imageSrc}" alt="${profile.name}" />
          <div class="developer-profile-visual__caption">
            <span>${profile.visualLabel}</span>
            <strong>${profile.visualCaption}</strong>
          </div>
        </div>
      </div>
      <div class="developer-profile-metrics">
        ${createMetricCards(content.labels, profile)}
      </div>
    </section>
  `;
}

function createDeveloperOverview(content, profile) {
  return `
    <section class="section-shell" id="developer-overview">
      ${createSectionHeading(content.sections.overview)}
      <div class="developer-profile-overview">
        <div class="developer-profile-overview__copy">
          <p>${profile.overview}</p>
          <p>${profile.positioning}</p>
        </div>
        <div class="developer-profile-facts">
          ${createFactCards(content.labels, profile)}
        </div>
      </div>
    </section>
  `;
}

function createServices(content, profile) {
  const services = profile.services
    .map(
      (service) => `
        <article class="detail-list-card developer-service-card">
          <h3>${service.title}</h3>
          <p>${service.description}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell">
      ${createSectionHeading(content.sections.services)}
      <div class="detail-list-grid">${services}</div>
    </section>
  `;
}

function createProjects(content, profile) {
  const projects = profile.projects
    .map(
      (project) => `
        <article class="developer-project-card panel">
          <div class="developer-project-card__media">
            <img src="${project.imageSrc}" alt="${project.name}" />
          </div>
          <div class="developer-project-card__body">
            <div class="developer-project-card__top">
              <span class="project-badge">${project.type}</span>
              <span class="marketplace-card__location">${project.location}</span>
            </div>
            <h3>${project.name}</h3>
            <p>${project.summary}</p>
          </div>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="developer-projects">
      ${createSectionHeading(content.sections.projects)}
      <div class="developer-project-grid">${projects}</div>
    </section>
  `;
}

function createInquiry(content, profile) {
  const fields = content.sections.inquiry.fields;
  const budgetOptions = content.sections.inquiry.budgetOptions
    .map((option) => `<option value="${option}">${option}</option>`)
    .join("");
  const scopeOptions = content.sections.inquiry.scopeOptions
    .map((option) => `<option value="${option}">${option}</option>`)
    .join("");

  return `
    <section class="section-shell" id="developer-inquiry">
      ${createSectionHeading(content.sections.inquiry)}
      <div class="project-inquiry-layout">
        <article class="panel project-inquiry-summary developer-inquiry-summary">
          <span class="project-inquiry-summary__eyebrow">${content.sections.inquiry.summaryTitle}</span>
          <h3>${profile.name}</h3>
          <div class="project-inquiry-summary__grid">
            <div>
              <span>${content.labels.specialty}</span>
              <strong>${profile.specialty}</strong>
            </div>
            <div>
              <span>${content.labels.location}</span>
              <strong>${profile.location}</strong>
            </div>
            <div>
              <span>${content.labels.startingPrice}</span>
              <strong>${profile.startingPrice}</strong>
            </div>
            <div>
              <span>${content.labels.deliveryRange}</span>
              <strong>${profile.deliveryRange}</strong>
            </div>
          </div>
        </article>

        <div class="panel application-panel project-inquiry-panel">
          <div class="project-inquiry-panel__intro">
            <h3>${content.sections.inquiry.formTitle}</h3>
            <p>${content.sections.inquiry.formIntro}</p>
          </div>
          <form class="application-form project-inquiry-form" data-developer-inquiry-form novalidate>
            <input type="hidden" name="developerName" value="${profile.name}" data-developer-name-field />
            <label class="form-field">
              <span>${fields.fullName.label}</span>
              <input type="text" name="fullName" placeholder="${fields.fullName.placeholder}" autocomplete="name" required />
            </label>
            <label class="form-field">
              <span>${fields.email.label}</span>
              <input type="email" name="email" placeholder="${fields.email.placeholder}" autocomplete="email" required />
            </label>
            <label class="form-field">
              <span>${fields.phone.label}</span>
              <input type="tel" name="phone" placeholder="${fields.phone.placeholder}" autocomplete="tel" required />
            </label>
            <label class="form-field">
              <span>${fields.city.label}</span>
              <input type="text" name="city" placeholder="${fields.city.placeholder}" autocomplete="address-level2" required />
            </label>
            <label class="form-field">
              <span>${fields.scope.label}</span>
              <select name="scope" required>
                <option value="" selected disabled>${fields.scope.placeholder}</option>
                ${scopeOptions}
              </select>
            </label>
            <label class="form-field">
              <span>${fields.budget.label}</span>
              <select name="budget" required>
                <option value="" selected disabled>${fields.budget.placeholder}</option>
                ${budgetOptions}
              </select>
            </label>
            <label class="form-field form-field--full">
              <span>${fields.message.label}</span>
              <textarea name="message" rows="5" placeholder="${fields.message.placeholder}"></textarea>
            </label>
            <div class="form-actions form-field--full">
              <button class="button button--primary" type="submit">${content.sections.inquiry.submitLabel}</button>
            </div>
          </form>
          <div class="form-success project-inquiry-success" data-developer-inquiry-success hidden>
            <h3>${content.sections.inquiry.successTitle}</h3>
            <p>
              ${content.sections.inquiry.successText}
              <strong data-developer-success-name>${profile.name}</strong>
              ${content.sections.inquiry.successTextEnd}
            </p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function createDeveloperProfilePage(content) {
  const pageContent = content.profilePage;
  const profile = content.profile;

  return `
    ${createDeveloperHero(pageContent, profile)}
    ${createDeveloperOverview(pageContent, profile)}
    ${createServices(pageContent, profile)}
    ${createProjects(pageContent, profile)}
    ${createInquiry(pageContent, profile)}
  `;
}
