import { createButton, createSectionHeading } from "./primitives.js";

function createSelectOptions(options) {
  return options.map((option) => `<option value="${option}">${option}</option>`).join("");
}

function createField(fieldKey, field, pageContent) {
  const commonAttributes = [`name="${fieldKey}"`];

  if (field.placeholder && field.type !== "select" && field.type !== "file" && field.type !== "textarea") {
    commonAttributes.push(`placeholder="${field.placeholder}"`);
  }

  if (field.autocomplete) {
    commonAttributes.push(`autocomplete="${field.autocomplete}"`);
  }

  if (field.required) {
    commonAttributes.push("required");
  }

  if (field.type === "textarea") {
    return `
      <label class="form-field ${field.full ? "form-field--full" : ""}">
        <span>${field.label}</span>
        <textarea ${commonAttributes.join(" ")} rows="${field.rows || 5}" placeholder="${field.placeholder || ""}"></textarea>
      </label>
    `;
  }

  if (field.type === "select") {
    const options = createSelectOptions(field.options || []);
    return `
      <label class="form-field ${field.full ? "form-field--full" : ""}">
        <span>${field.label}</span>
        <select ${commonAttributes.join(" ")}>
          <option value="" selected disabled>${field.placeholder || ""}</option>
          ${options}
        </select>
      </label>
    `;
  }

  if (field.type === "file") {
    const multipleAttribute = field.multiple ? "multiple" : "";
    return `
      <label class="form-field form-field--full submission-upload-field">
        <span>${field.label}</span>
        <div class="submission-upload">
          <div class="submission-upload__copy">
            <strong>${field.placeholder || ""}</strong>
            <p>${field.hint || ""}</p>
          </div>
          <input type="file" ${commonAttributes.join(" ")} ${multipleAttribute} />
        </div>
      </label>
    `;
  }

  return `
    <label class="form-field ${field.full ? "form-field--full" : ""}">
      <span>${field.label}</span>
      <input type="${field.type || "text"}" ${commonAttributes.join(" ")} />
    </label>
  `;
}

function createSubmissionHero(pageContent) {
  const notes = (pageContent.hero.notes || [])
    .map(
      (item) => `
        <article class="metric-card submission-note">
          <span class="metric-value">${item.value}</span>
          <p class="metric-label">${item.label}</p>
        </article>
      `
    )
    .join("");
  const notesMarkup = notes ? `<div class="submission-stage__notes">${notes}</div>` : "";

  return `
    <section class="submission-hero section-shell">
      <div class="submission-hero__layout">
        <div class="submission-hero__copy">
          <p class="eyebrow">${pageContent.hero.eyebrow}</p>
          <h1 class="hero-title submission-hero__title">${pageContent.hero.title}</h1>
          <p class="hero-lead">${pageContent.hero.description}</p>
          <div class="hero-actions">
            ${createButton({ href: pageContent.hero.primaryCta.href, label: pageContent.hero.primaryCta.label, variant: "primary" })}
            ${createButton({ href: pageContent.hero.secondaryCta.href, label: pageContent.hero.secondaryCta.label, variant: "secondary" })}
          </div>
        </div>

        <div class="submission-stage panel">
          <div class="submission-stage__grid"></div>
          <div class="submission-stage__panel submission-stage__panel--a">
            <span>${pageContent.hero.boardLabels.intake}</span>
            <strong>${pageContent.hero.boardValues.intake}</strong>
          </div>
          <div class="submission-stage__panel submission-stage__panel--b">
            <span>${pageContent.hero.boardLabels.review}</span>
            <strong>${pageContent.hero.boardValues.review}</strong>
          </div>
          <div class="submission-stage__beam submission-stage__beam--h"></div>
          <div class="submission-stage__beam submission-stage__beam--v"></div>
          ${notesMarkup}
        </div>
      </div>
    </section>
  `;
}

function createSubmissionForm(pageContent) {
  const fields = Object.entries(pageContent.form.fields)
    .map(([fieldKey, field]) => createField(fieldKey, field, pageContent))
    .join("");
  const summaryItems = pageContent.form.summary.items
    .map(
      (item) => `
        <div>
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `
    )
    .join("");
  const access = pageContent.listingAccess || {};
  const isWrongRole =
    access.authenticated &&
    access.allowedSubmissionType !== pageContent.submissionType;
  const roleGateMarkup = isWrongRole
    ? `
      <div class="auth-form-error form-field--full">
        <strong>${pageContent.form.roleGate.title}</strong>
        <p>${pageContent.form.roleGate.description}</p>
      </div>
      <div class="form-actions form-field--full">
        ${createButton({
          href: pageContent.form.roleGate.actionHref,
          label: pageContent.form.roleGate.actionLabel,
          variant: "primary",
        })}
      </div>
    `
    : `
      <form class="application-form submission-form" data-marketplace-submission-form novalidate>
        <div class="auth-form-error form-field--full" data-marketplace-submission-error hidden>
          <strong data-marketplace-submission-error-title>Submission failed</strong>
          <p data-marketplace-submission-error-text>The submission could not be saved. Please try again.</p>
        </div>
        ${fields}
        <div class="form-actions form-field--full">
          <button class="button button--primary" type="submit">${pageContent.form.submitLabel}</button>
        </div>
      </form>
      <div class="form-success submission-success" data-marketplace-submission-success hidden>
        <h3>${pageContent.form.successTitle}</h3>
        <p>${pageContent.form.successText}</p>
      </div>
    `;

  return `
    <section class="section-shell" id="submission-form">
      ${createSectionHeading(pageContent.form)}
      <div class="submission-layout">
        <article class="panel submission-summary">
          <span class="submission-summary__eyebrow">${pageContent.form.summary.eyebrow}</span>
          <h3>${pageContent.form.summary.title}</h3>
          <p>${pageContent.form.summary.description}</p>
          <div class="submission-summary__grid">${summaryItems}</div>
        </article>

        <div class="panel application-panel submission-form-panel">
          ${roleGateMarkup}
        </div>
      </div>
    </section>
  `;
}

export function createMarketplaceSubmissionPage(pageContent) {
  return `
    ${createSubmissionHero(pageContent)}
    ${createSubmissionForm(pageContent)}
  `;
}
