import { createSectionHeading } from "./primitives.js";

function createRoleCards(content) {
  return content.roles
    .map(
      (role, index) => `
        <article class="feature-card auth-role-card${index === 0 ? " is-active" : ""}" data-auth-role-card="${role.value}">
          <span class="feature-index">${role.index}</span>
          <h3>${role.title}</h3>
          <p>${role.description}</p>
          <ul class="project-highlights auth-role-points">
            ${role.points.map((point) => `<li>${point}</li>`).join("")}
          </ul>
          <button class="button button--secondary auth-role-card__button" type="button" data-auth-role-select="${role.value}">
            ${role.cta}
          </button>
        </article>
      `
    )
    .join("");
}

function createRoleDetails(content) {
  return content.roles
    .map(
      (role) => `
        <div class="auth-role-detail${role.value === content.roles[0].value ? " is-active" : ""}" data-auth-role-detail="${role.value}">
          <span class="submission-summary__eyebrow">${content.selectedRoleEyebrow}</span>
          <h3>${role.formTitle}</h3>
          <p>${role.formDescription}</p>
        </div>
      `
    )
    .join("");
}

function createFormField(field, { active = true, role = "" } = {}) {
  const type = field.type || "text";
  const fullClass = field.full ? " form-field--full" : "";
  const requiredAttr = field.required ? ' data-auth-required="true"' : "";
  const requiredStateAttr = field.required && active ? " required" : "";
  const disabledAttr = active ? "" : " disabled";
  const roleAttr = role ? ` data-auth-role-field="${role}"` : "";
  const commonAttrs = `${requiredAttr}${requiredStateAttr}${roleAttr}`;
  const autocomplete = field.autocomplete ? ` autocomplete="${field.autocomplete}"` : "";
  const inputMode = field.inputmode ? ` inputmode="${field.inputmode}"` : "";
  const minAttr = field.min !== undefined ? ` min="${field.min}"` : "";
  const stepAttr = field.step !== undefined ? ` step="${field.step}"` : "";
  const fieldHint = field.hint ? `<small class="auth-field-hint">${field.hint}</small>` : "";
  const fieldMeta = field.optionalLabel ? `<small class="auth-field-meta">${field.optionalLabel}</small>` : "";

  if (type === "select") {
    return `
      <label class="form-field${fullClass}">
        <span>${field.label}</span>
        ${fieldMeta}
        <select name="${field.name}"${commonAttrs}${disabledAttr}>
          <option value="" selected disabled>${field.placeholder}</option>
          ${field.options.map((option) => `<option value="${option}">${option}</option>`).join("")}
        </select>
        ${fieldHint}
      </label>
    `;
  }

  if (type === "textarea") {
    return `
      <label class="form-field${fullClass}">
        <span>${field.label}</span>
        ${fieldMeta}
        <textarea name="${field.name}" placeholder="${field.placeholder}" rows="${field.rows || 4}"${commonAttrs}${disabledAttr}></textarea>
        ${fieldHint}
      </label>
    `;
  }

  return `
    <label class="form-field${fullClass}">
      <span>${field.label}</span>
      ${fieldMeta}
      <input
        type="${type}"
        name="${field.name}"
        placeholder="${field.placeholder}"
        ${autocomplete}
        ${inputMode}
        ${minAttr}
        ${stepAttr}
        ${commonAttrs}
        ${disabledAttr}
      />
      ${fieldHint}
    </label>
  `;
}

function createSignupRoleGroups(content) {
  return content.roles
    .map(
      (role, index) => `
        <section
          class="auth-signup-group${index === 0 ? " is-active" : ""}"
          data-auth-role-group="${role.value}"
          ${index === 0 ? "" : "hidden"}
        >
          <header class="auth-signup-group__header">
            <span class="submission-summary__eyebrow">${role.groupEyebrow}</span>
            <h3>${role.groupTitle}</h3>
            <p>${role.groupDescription}</p>
          </header>
          <div class="auth-signup-group__fields">
            ${role.fields.map((field) => createFormField(field, { active: index === 0, role: role.value })).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function createRoleSwitch(content, inputName = "accountRole", buttonClass = "auth-role-switch__button") {
  return `
    <div class="auth-role-switch" role="tablist" aria-label="${content.title}">
      <input type="hidden" name="${inputName}" value="${content.roles[0].value}" data-auth-role-input />
      ${content.roles
        .map(
          (role, index) => `
            <button
              class="${buttonClass}${index === 0 ? " is-active" : ""}"
              type="button"
              data-auth-role-select="${role.value}"
              aria-pressed="${index === 0}"
            >
              ${role.title}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

export function createCreateAccountPage(content) {
  return `
    <section class="section-shell auth-create-shell" id="account-role-choice">
      ${createSectionHeading(content.roleChoice)}
      <div class="auth-role-entry-link">
        <span>${content.roleChoice.loginPrompt}</span>
        <a class="auth-inline-link" href="./login.html">${content.roleChoice.loginLinkLabel}</a>
      </div>
      <div class="features-grid auth-role-grid">
        ${createRoleCards(content.roleChoice)}
      </div>
    </section>

    <section class="section-shell" id="create-account-form">
      ${createSectionHeading(content.form)}
      <div class="auth-entry-layout">
        <article class="panel submission-summary auth-entry-summary">
          ${createRoleDetails(content.form)}
        </article>
        <div class="panel application-panel auth-entry-panel">
          <form class="application-form auth-entry-form auth-signup-form" data-auth-entry-form novalidate>
            <input type="hidden" name="accountRole" value="${content.roleChoice.roles[0].value}" data-auth-role-input />
            <div class="auth-form-error form-field--full" data-auth-entry-error hidden>
              <strong>${content.form.errorTitle}</strong>
              <p data-auth-entry-error-text>${content.form.errorText}</p>
            </div>
            ${content.form.sharedFields.map((field) => createFormField(field, { active: true })).join("")}
            <div class="form-field--full auth-signup-groups">
              ${createSignupRoleGroups(content.form)}
            </div>
            <div class="form-actions form-field--full">
              <button class="button button--primary" type="submit">${content.form.submitLabel}</button>
            </div>
          </form>
          <div class="form-success" data-auth-entry-success hidden>
            <h3>${content.form.successTitle}</h3>
            <p>${content.form.successText}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function createLoginPage(content) {
  return `
    <section class="section-shell auth-login-shell" id="login-form">
      ${createSectionHeading(content.form)}
      <div class="auth-entry-layout">
        <article class="panel submission-summary auth-entry-summary">
          ${createRoleDetails(content.roleChoice)}
        </article>
        <div class="panel application-panel auth-entry-panel">
          <div class="auth-login-intro">
            <span class="submission-summary__eyebrow">${content.roleChoice.eyebrow}</span>
            <h3>${content.roleChoice.title}</h3>
            <p>${content.roleChoice.description}</p>
          </div>
          <form class="application-form auth-entry-form" data-auth-entry-form novalidate>
            ${createRoleSwitch(content.roleChoice)}
            <div class="auth-form-error form-field--full" data-auth-entry-error hidden>
              <strong>${content.form.errorTitle}</strong>
              <p data-auth-entry-error-text>${content.form.errorText}</p>
            </div>
            <label class="form-field">
              <span>${content.form.fields.email.label}</span>
              <input type="email" name="email" placeholder="${content.form.fields.email.placeholder}" autocomplete="email" required />
            </label>
            <label class="form-field">
              <span>${content.form.fields.password.label}</span>
              <input type="password" name="password" placeholder="${content.form.fields.password.placeholder}" autocomplete="current-password" required />
            </label>
            <div class="form-actions form-field--full">
              <button class="button button--primary" type="submit">${content.form.submitLabel}</button>
            </div>
            <a class="auth-inline-link" href="./create-account.html">${content.form.createAccountLink}</a>
          </form>
          <div class="form-success" data-auth-entry-success hidden>
            <h3>${content.form.successTitle}</h3>
            <p>${content.form.successText}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function createModeratorLoginPage(content) {
  return `
    <section class="section-shell auth-admin-shell">
      ${createSectionHeading(content.form)}
      <div class="panel auth-admin-panel">
        <div class="auth-admin-panel__intro">
          <span class="auth-admin-panel__eyebrow">${content.summary.eyebrow}</span>
          <h3>${content.summary.title}</h3>
          <p>${content.summary.description}</p>
        </div>
        <form class="application-form auth-admin-form" data-auth-entry-form novalidate>
          <div class="auth-form-error form-field--full" data-auth-entry-error hidden>
            <strong>${content.form.errorTitle}</strong>
            <p data-auth-entry-error-text>${content.form.errorText}</p>
          </div>
          <label class="form-field">
            <span>${content.form.fields.email.label}</span>
            <input type="text" name="adminIdentifier" placeholder="${content.form.fields.email.placeholder}" autocomplete="username" required />
          </label>
          <label class="form-field">
            <span>${content.form.fields.password.label}</span>
            <input type="password" name="adminPassword" placeholder="${content.form.fields.password.placeholder}" autocomplete="current-password" required />
          </label>
          <div class="form-actions form-field--full">
            <button class="button button--secondary" type="submit">${content.form.submitLabel}</button>
          </div>
          <a class="auth-inline-link" href="./login.html">${content.form.backToPublicLogin}</a>
        </form>
        <div class="form-success" data-auth-entry-success hidden>
          <h3>${content.form.successTitle}</h3>
          <p>${content.form.successText}</p>
        </div>
      </div>
    </section>
  `;
}
