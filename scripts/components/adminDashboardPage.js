import { createButton, createSectionHeading } from "./primitives.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createSummaryRows(listing, labels, type, fallback, activeStatus) {
  const ownerType = type === "professional" ? labels.developerOwner : labels.clientOwner;
  const listingType = type === "professional" ? listing.specialty : listing.projectType;

  return `
    <div class="admin-record__facts">
      <div><span>${labels.type}</span><strong>${escapeHtml(listingType || fallback)}</strong></div>
      <div><span>${labels.owner}</span><strong>${escapeHtml(ownerType)}</strong></div>
      <div><span>${labels.location}</span><strong>${escapeHtml(listing.location || fallback)}</strong></div>
      <div><span>${labels.position}</span><strong>#${listing.marketPosition}</strong></div>
      <div><span>${labels.status}</span><strong>${escapeHtml(listing.status || activeStatus)}</strong></div>
    </div>
  `;
}

function createListingEditForm(content, listing, type) {
  const labels = content.listings;
  const isProfessional = type === "professional";
  const description = isProfessional ? listing.summary : listing.brief;
  const pricing = isProfessional ? listing.startingPrice : listing.budget;
  const timeline = isProfessional ? listing.deliveryRange || listing.timeline : listing.timeline;
  const category = isProfessional ? listing.specialty : listing.projectType;
  const plotStatusField = isProfessional
    ? ""
    : `
      <label class="form-field">
        <span>${labels.form.plotStatus}</span>
        <input type="text" name="plotStatus" value="${escapeHtml(listing.plotStatus || "")}" />
      </label>
    `;
  const servicesField = isProfessional
    ? `
      <label class="form-field form-field--full">
        <span>${labels.form.services}</span>
        <textarea name="services" rows="3">${escapeHtml((listing.services || []).join(", "))}</textarea>
      </label>
    `
    : "";

  return `
    <form class="application-form admin-inline-form" data-admin-listing-form hidden>
      <input type="hidden" name="listingType" value="${type}" />
      <input type="hidden" name="listingKey" value="${listing.adminKey}" />
      <label class="form-field">
        <span>${labels.form.title}</span>
        <input type="text" name="title" value="${escapeHtml(listing.name || listing.title || "")}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.category}</span>
        <input type="text" name="category" value="${escapeHtml(category || "")}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.location}</span>
        <input type="text" name="location" value="${escapeHtml(listing.location || "")}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.pricing}</span>
        <input type="text" name="pricing" value="${escapeHtml(pricing || "")}" />
      </label>
      <label class="form-field">
        <span>${labels.form.timeline}</span>
        <input type="text" name="timeline" value="${escapeHtml(timeline || "")}" />
      </label>
      ${plotStatusField}
      <label class="form-field form-field--full">
        <span>${labels.form.description}</span>
        <textarea name="description" rows="4" required>${escapeHtml(description || "")}</textarea>
      </label>
      ${servicesField}
      <label class="form-field">
        <span>${labels.form.status}</span>
        <select name="status">
          ${content.statusOptions
            .map(
              (option) =>
                `<option value="${option.value}"${(listing.status || "active") === option.value ? " selected" : ""}>${option.label}</option>`
            )
            .join("")}
        </select>
      </label>
      <label class="form-field form-field--full">
        <span>${labels.form.attachments}</span>
        <input type="file" name="attachments" multiple accept="image/*,.pdf,.doc,.docx,.txt" />
      </label>
      <div class="form-actions form-field--full admin-inline-form__actions">
        <button class="button button--primary" type="submit">${labels.actions.save}</button>
        <button class="button button--secondary" type="button" data-admin-cancel>${labels.actions.cancel}</button>
      </div>
    </form>
  `;
}

function createListingCard(content, listing, type) {
  const labels = content.listings;
  const title = type === "professional" ? listing.name : listing.title;
  const description = type === "professional" ? listing.summary : listing.brief;

  return `
    <article class="panel admin-record" data-admin-record="${listing.adminKey}">
      <div class="admin-record__top">
        <div>
          <span class="project-badge">${type === "professional" ? labels.professionalLabel : labels.clientLabel}</span>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <span class="admin-record__status">${escapeHtml(listing.source || labels.seededLabel)}</span>
      </div>
      ${createSummaryRows(listing, labels.summary, type, labels.fallback, labels.summary.activeStatus)}
      <p class="admin-record__copy">${escapeHtml(description || labels.fallback)}</p>
      <div class="admin-record__actions">
        <button class="button button--secondary" type="button" data-admin-move-up="${listing.adminKey}" data-admin-kind="listing" data-admin-listing-type="${type}">
          ${labels.actions.moveUp}
        </button>
        <button class="button button--secondary" type="button" data-admin-move-down="${listing.adminKey}" data-admin-kind="listing" data-admin-listing-type="${type}">
          ${labels.actions.moveDown}
        </button>
        <button class="button button--secondary" type="button" data-admin-edit-toggle>
          ${labels.actions.edit}
        </button>
        <button class="button button--secondary" type="button" data-admin-delete="${listing.adminKey}" data-admin-kind="listing" data-admin-listing-type="${type}">
          ${labels.actions.delete}
        </button>
      </div>
      ${createListingEditForm(content, listing, type)}
    </article>
  `;
}

function createFeaturedEditForm(content, project) {
  const labels = content.featuredProjects;

  return `
    <form class="application-form admin-inline-form" data-admin-featured-form hidden>
      <input type="hidden" name="projectKey" value="${project.adminKey}" />
      <label class="form-field">
        <span>${labels.form.badge}</span>
        <input type="text" name="badge" value="${escapeHtml(project.badge || "")}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.title}</span>
        <input type="text" name="title" value="${escapeHtml(project.title || "")}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.location}</span>
        <input type="text" name="location" value="${escapeHtml(project.location || "")}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.style}</span>
        <input type="text" name="style" value="${escapeHtml(project.style || "")}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.price}</span>
        <input type="text" name="price" value="${escapeHtml(project.price || "")}" />
      </label>
      <label class="form-field">
        <span>${labels.form.buildTime}</span>
        <input type="text" name="buildTime" value="${escapeHtml(project.buildTime || "")}" />
      </label>
      <label class="form-field form-field--full">
        <span>${labels.form.summary}</span>
        <textarea name="summary" rows="4">${escapeHtml(project.summary || "")}</textarea>
      </label>
      <label class="form-field form-field--full">
        <span>${labels.form.highlights}</span>
        <textarea name="highlights" rows="3">${escapeHtml((project.highlights || []).join(", "))}</textarea>
      </label>
      <label class="form-field">
        <span>${labels.form.ctaLabel}</span>
        <input type="text" name="ctaLabel" value="${escapeHtml(project.ctaLabel || "")}" />
      </label>
      <label class="form-field">
        <span>${labels.form.ctaHint}</span>
        <input type="text" name="ctaHint" value="${escapeHtml(project.ctaHint || "")}" />
      </label>
      <label class="form-field form-field--full">
        <span>${labels.form.href}</span>
        <input type="text" name="href" value="${escapeHtml(project.href || "")}" />
      </label>
      <label class="form-field form-field--full">
        <span>${labels.form.image}</span>
        <input type="file" name="image" accept="image/*" />
      </label>
      <div class="form-actions form-field--full admin-inline-form__actions">
        <button class="button button--primary" type="submit">${labels.actions.save}</button>
        <button class="button button--secondary" type="button" data-admin-cancel>${labels.actions.cancel}</button>
      </div>
    </form>
  `;
}

function createFeaturedCard(content, project) {
  const labels = content.featuredProjects;

  return `
    <article class="panel admin-record admin-record--featured" data-admin-record="${project.adminKey}">
      <div class="admin-record__top">
        <div>
          <span class="project-badge">${escapeHtml(project.badge || labels.projectLabel)}</span>
          <h3>${escapeHtml(project.title)}</h3>
        </div>
        <span class="admin-record__status">#${project.marketPosition}</span>
      </div>
      <div class="admin-record__facts">
        <div><span>${labels.summary.location}</span><strong>${escapeHtml(project.location || labels.fallback)}</strong></div>
        <div><span>${labels.summary.style}</span><strong>${escapeHtml(project.style || labels.fallback)}</strong></div>
        <div><span>${labels.summary.price}</span><strong>${escapeHtml(project.price || labels.fallback)}</strong></div>
        <div><span>${labels.summary.buildTime}</span><strong>${escapeHtml(project.buildTime || labels.fallback)}</strong></div>
      </div>
      <p class="admin-record__copy">${escapeHtml(project.summary || labels.fallback)}</p>
      <div class="admin-record__actions">
        <button class="button button--secondary" type="button" data-admin-move-up="${project.adminKey}" data-admin-kind="featured">
          ${labels.actions.moveUp}
        </button>
        <button class="button button--secondary" type="button" data-admin-move-down="${project.adminKey}" data-admin-kind="featured">
          ${labels.actions.moveDown}
        </button>
        <button class="button button--secondary" type="button" data-admin-edit-toggle>
          ${labels.actions.edit}
        </button>
        <button class="button button--secondary" type="button" data-admin-delete="${project.adminKey}" data-admin-kind="featured">
          ${labels.actions.delete}
        </button>
      </div>
      ${createFeaturedEditForm(content, project)}
    </article>
  `;
}

function createFeaturedCreateForm(content) {
  const labels = content.featuredProjects;

  return `
    <form class="application-form admin-inline-form admin-inline-form--create" data-admin-featured-create-form>
      <label class="form-field">
        <span>${labels.form.badge}</span>
        <input type="text" name="badge" placeholder="${escapeHtml(labels.placeholders.badge)}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.title}</span>
        <input type="text" name="title" placeholder="${escapeHtml(labels.placeholders.title)}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.location}</span>
        <input type="text" name="location" placeholder="${escapeHtml(labels.placeholders.location)}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.style}</span>
        <input type="text" name="style" placeholder="${escapeHtml(labels.placeholders.style)}" required />
      </label>
      <label class="form-field">
        <span>${labels.form.price}</span>
        <input type="text" name="price" placeholder="${escapeHtml(labels.placeholders.price)}" />
      </label>
      <label class="form-field">
        <span>${labels.form.buildTime}</span>
        <input type="text" name="buildTime" placeholder="${escapeHtml(labels.placeholders.buildTime)}" />
      </label>
      <label class="form-field form-field--full">
        <span>${labels.form.summary}</span>
        <textarea name="summary" rows="4" placeholder="${escapeHtml(labels.placeholders.summary)}"></textarea>
      </label>
      <label class="form-field form-field--full">
        <span>${labels.form.highlights}</span>
        <textarea name="highlights" rows="3" placeholder="${escapeHtml(labels.placeholders.highlights)}"></textarea>
      </label>
      <label class="form-field">
        <span>${labels.form.ctaLabel}</span>
        <input type="text" name="ctaLabel" placeholder="${escapeHtml(labels.placeholders.ctaLabel)}" />
      </label>
      <label class="form-field">
        <span>${labels.form.ctaHint}</span>
        <input type="text" name="ctaHint" placeholder="${escapeHtml(labels.placeholders.ctaHint)}" />
      </label>
      <label class="form-field form-field--full">
        <span>${labels.form.href}</span>
        <input type="text" name="href" placeholder="${escapeHtml(labels.placeholders.href)}" />
      </label>
      <label class="form-field form-field--full">
        <span>${labels.form.image}</span>
        <input type="file" name="image" accept="image/*" />
      </label>
      <div class="form-actions form-field--full admin-inline-form__actions">
        <button class="button button--primary" type="submit">${labels.actions.add}</button>
      </div>
    </form>
  `;
}

export function createAdminDashboardPage(content) {
  const clientItems = content.listings.clientItems.map((listing) => createListingCard(content, listing, "client")).join("");
  const professionalItems = content.listings.professionalItems
    .map((listing) => createListingCard(content, listing, "professional"))
    .join("");
  const featuredItems = content.featuredProjects.items.map((project) => createFeaturedCard(content, project)).join("");

  return `
    <div data-admin-dashboard>
      <section class="section-shell admin-dashboard-hero">
        <div class="project-cta-panel panel admin-dashboard-hero__panel">
          <div>
            <p class="eyebrow">${content.hero.eyebrow}</p>
            <h1 class="hero-title admin-dashboard-hero__title">${content.hero.title}</h1>
            <p class="hero-lead">${content.hero.description}</p>
          </div>
          <div class="hero-actions">
            ${createButton({ href: "#admin-marketplace", label: content.hero.primaryCta, variant: "primary" })}
            ${createButton({ href: "#admin-featured-projects", label: content.hero.secondaryCta, variant: "secondary" })}
          </div>
        </div>
      </section>

      <section class="section-shell" id="admin-marketplace">
        ${createSectionHeading(content.listings.heading)}
        <div class="admin-dashboard-grid">
          <article class="panel admin-section-panel">
            <div class="admin-section-panel__header">
              <h3>${content.listings.clientTitle}</h3>
              <p>${content.listings.clientDescription}</p>
            </div>
            <div class="admin-record-list">${clientItems || `<p class="admin-empty">${content.listings.empty}</p>`}</div>
          </article>

          <article class="panel admin-section-panel">
            <div class="admin-section-panel__header">
              <h3>${content.listings.professionalTitle}</h3>
              <p>${content.listings.professionalDescription}</p>
            </div>
            <div class="admin-record-list">${professionalItems || `<p class="admin-empty">${content.listings.empty}</p>`}</div>
          </article>
        </div>
      </section>

      <section class="section-shell" id="admin-featured-projects">
        ${createSectionHeading(content.featuredProjects.heading)}
        <div class="admin-dashboard-grid admin-dashboard-grid--featured">
          <article class="panel admin-section-panel">
            <div class="admin-section-panel__header">
              <h3>${content.featuredProjects.createTitle}</h3>
              <p>${content.featuredProjects.createDescription}</p>
            </div>
            ${createFeaturedCreateForm(content)}
          </article>

          <article class="panel admin-section-panel">
            <div class="admin-section-panel__header">
              <h3>${content.featuredProjects.manageTitle}</h3>
              <p>${content.featuredProjects.manageDescription}</p>
            </div>
            <div class="admin-record-list">${featuredItems || `<p class="admin-empty">${content.featuredProjects.empty}</p>`}</div>
          </article>
        </div>
      </section>
    </div>
  `;
}

export function createAdminAccessDeniedPage(content) {
  return `
    <section class="section-shell admin-dashboard-hero">
      <div class="project-cta-panel panel admin-dashboard-hero__panel">
        <div>
          <p class="eyebrow">${content.accessDenied.eyebrow}</p>
          <h1 class="hero-title admin-dashboard-hero__title">${content.accessDenied.title}</h1>
          <p class="hero-lead">${content.accessDenied.description}</p>
        </div>
        <div class="hero-actions">
          ${createButton({ href: "./moderator-login.html", label: content.accessDenied.primaryCta, variant: "primary" })}
          ${createButton({ href: "./index.html", label: content.accessDenied.secondaryCta, variant: "secondary" })}
        </div>
      </div>
    </section>
  `;
}
