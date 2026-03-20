import { createButton, createSectionHeading } from "./primitives.js";

export function createProfessionalsHero(content) {
  const pillars = content.hero.pillars.map((item) => `<span class="chip">${item}</span>`).join("");
  const notes = content.hero.sideNotes
    .map(
      (item) => `
        <article class="metric-card professionals-note">
          <span class="metric-value">${item.value}</span>
          <p class="metric-label">${item.label}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="professionals-hero section-shell">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">${content.hero.eyebrow}</p>
          <h1 class="hero-title">
            <span>${content.hero.title}</span>
          </h1>
          <p class="hero-lead">${content.hero.description}</p>

          <div class="hero-actions">
            ${createButton({ href: content.hero.primaryCta.href, label: content.hero.primaryCta.label, variant: "primary" })}
            ${createButton({ href: content.hero.secondaryCta.href, label: content.hero.secondaryCta.label, variant: "secondary" })}
          </div>

          <div class="chip-row">${pillars}</div>
        </div>

        <div class="professionals-stage panel">
          <div class="professionals-stage__grid"></div>
          <div class="professionals-stage__frame professionals-stage__frame--a"></div>
          <div class="professionals-stage__frame professionals-stage__frame--b"></div>
          <div class="professionals-stage__beam professionals-stage__beam--a"></div>
          <div class="professionals-stage__beam professionals-stage__beam--b"></div>
          <div class="professionals-stage__card">
            <p class="eyebrow">${content.hero.spotlight.title}</p>
            <p>${content.hero.spotlight.text}</p>
          </div>
          <div class="professionals-stage__notes">${notes}</div>
        </div>
      </div>
    </section>
  `;
}

export function createProfessionalsBenefits(content) {
  const items = content.benefits.items
    .map(
      (item) => `
        <article class="feature-card">
          <span class="feature-index">${item.index}</span>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="join-benefits">
      ${createSectionHeading(content.benefits)}
      <div class="features-grid">${items}</div>
    </section>
  `;
}

export function createProfessionalsWhoCanApply(content) {
  const items = content.audiences.items
    .map(
      (item) => `
        <article class="audience-card">
          <h3>${item.title}</h3>
          <p class="audience-card__subtitle">${item.subtitle}</p>
          <ul class="project-highlights">
            ${item.points.map((point) => `<li>${point}</li>`).join("")}
          </ul>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="who-can-apply">
      ${createSectionHeading(content.audiences)}
      <div class="audience-grid">${items}</div>
    </section>
  `;
}

export function createProfessionalsProcess(content) {
  const steps = content.process.steps
    .map(
      (step, index) => `
        <article class="process-card">
          <span class="step-number">${String(index + 1).padStart(2, "0")}</span>
          <h3>${step.title}</h3>
          <p>${step.description}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="join-process">
      ${createSectionHeading(content.process)}
      <div class="process-grid">${steps}</div>
    </section>
  `;
}

export function createProfessionalsStats(content) {
  const items = content.stats.items
    .map(
      (item) => `
        <article class="metric-card stats-card">
          <span
            class="metric-value"
            data-counter-target="${item.value}"
            data-counter-suffix="${item.suffix}"
          >0${item.suffix}</span>
          <h3>${item.label}</h3>
          <p class="metric-label">${item.detail}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="join-stats">
      ${createSectionHeading({ ...content.stats, centered: true })}
      <div class="stats-grid">${items}</div>
    </section>
  `;
}

export function createProfessionalsForm(content) {
  const options = content.form.professionOptions
    .map((option) => `<option value="${option}">${option}</option>`)
    .join("");
  const fields = content.form.fields;

  return `
    <section class="section-shell" id="application-form">
      ${createSectionHeading(content.form)}
      <div class="application-layout">
        <div class="panel application-panel">
          <form class="application-form" data-application-form>
            <label class="form-field">
              <span>${fields.name.label}</span>
              <input type="text" name="name" placeholder="${fields.name.placeholder}" required />
            </label>
            <label class="form-field">
              <span>${fields.companyName.label}</span>
              <input type="text" name="companyName" placeholder="${fields.companyName.placeholder}" required />
            </label>
            <label class="form-field">
              <span>${fields.professionType.label}</span>
              <select name="professionType" required>
                <option value="" selected disabled>${fields.professionType.placeholder}</option>
                ${options}
              </select>
            </label>
            <label class="form-field">
              <span>${fields.city.label}</span>
              <input type="text" name="city" placeholder="${fields.city.placeholder}" required />
            </label>
            <label class="form-field">
              <span>${fields.website.label}</span>
              <input type="url" name="website" placeholder="${fields.website.placeholder}" />
            </label>
            <label class="form-field">
              <span>${fields.experience.label}</span>
              <input type="number" min="0" name="experience" placeholder="${fields.experience.placeholder}" />
            </label>
            <label class="form-field form-field--full">
              <span>${fields.description.label}</span>
              <textarea name="description" rows="5" placeholder="${fields.description.placeholder}"></textarea>
            </label>
            <label class="form-field form-field--full form-field--upload">
              <span>${fields.upload.label}</span>
              <input type="file" name="upload" />
              <small>${fields.upload.hint}</small>
            </label>
            <div class="form-actions form-field--full">
              <button class="button button--primary" type="submit">${content.form.submitLabel}</button>
            </div>
          </form>
          <div class="form-success" data-form-success hidden>
            <h3>${content.form.successTitle}</h3>
            <p>${content.form.successText}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function createProfessionalsFaq(content) {
  const items = content.faq.items
    .map(
      (item, index) => `
        <article class="faq-item" data-faq-item>
          <button class="faq-trigger" type="button" data-faq-trigger aria-expanded="${index === 0}">
            <span>${item.question}</span>
            <span class="faq-trigger__icon">+</span>
          </button>
          <div class="faq-panel" data-faq-panel ${index === 0 ? "" : "hidden"}>
            <p>${item.answer}</p>
          </div>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="join-faq">
      ${createSectionHeading({ ...content.faq, centered: true })}
      <div class="faq-list">${items}</div>
    </section>
  `;
}
