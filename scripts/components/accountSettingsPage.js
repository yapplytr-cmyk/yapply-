import { createButton, createSectionHeading } from "./primitives.js";
import { getDefaultAvatarOptions } from "../core/accountSettingsStore.js";

function getAccountSettingsLocale(content) {
  return content.meta?.locale === "tr" ? "tr" : "en";
}

function getProfileTypeLabel(role, content) {
  if (role === "developer") {
    return content.profileTypes.developer;
  }

  if (role === "client") {
    return content.profileTypes.client;
  }

  return content.fallback;
}

function createAccessDenied(content) {
  return `
    <section class="section-shell marketplace-success">
      <div class="project-cta-panel panel marketplace-success-panel">
        <div>
          <p class="eyebrow">${content.accessDenied.eyebrow}</p>
          <h1 class="hero-title marketplace-success__title">${content.accessDenied.title}</h1>
          <p class="hero-lead">${content.accessDenied.description}</p>
        </div>
        <div class="hero-actions">
          ${createButton({ href: "./login.html", label: content.accessDenied.loginLabel, variant: "primary" })}
        </div>
      </div>
    </section>
  `;
}

function createAvatarOptions(user, content) {
  const options = getDefaultAvatarOptions(user.role);
  const selectedId = user.profilePictureType === "upload"
    ? ""
    : user.profilePictureId || options[0]?.id || "";

  return options
    .map(
      (option) => `
        <label class="account-settings-avatar-choice panel">
          <input
            type="radio"
            name="profilePictureDefault"
            value="${option.id}"
            data-account-settings-avatar-option
            data-avatar-src="${option.src}"
            ${option.id === selectedId ? "checked" : ""}
          />
          <span class="account-settings-avatar-choice__media">
            <img src="${option.src}" alt="${option.label}" loading="lazy" decoding="async" fetchpriority="low" />
          </span>
        </label>
      `
    )
    .join("");
}

export function createAccountSettingsPage(content) {
  const session = content.viewerSession || { authenticated: false, user: null };

  if (!session.authenticated || !session.user) {
    return createAccessDenied(content);
  }

  const user = session.user;
  const locale = getAccountSettingsLocale(content);
  const avatarOptions = getDefaultAvatarOptions(user.role);
  const currentAvatar = user.profilePictureSrc || avatarOptions[0]?.src || "";
  const profileTypeLabel = getProfileTypeLabel(user.role, content);
  const username = user.username || "";
  const displayName = user.companyName || user.username || user.fullName || user.email || content.fallback;
  const avatarChoiceLabel =
    locale === "tr"
      ? "Varsayılan kuş avatarlarından biri"
      : "One of the default bird avatars";
  const workDescriptionField = user.role === "developer"
    ? `
        <label class="form-field form-field--full">
          <span>${content.fields.workDescription}</span>
          <textarea name="workDescription" rows="4" placeholder="${content.workDescriptionPlaceholder || ""}">${user.workDescription || ""}</textarea>
          <small>${content.workDescriptionHint}</small>
        </label>
      `
    : "";

  return `
    <section class="section-shell account-settings-shell">
      ${createSectionHeading(content.section)}
      <div class="account-settings-layout">
        <article class="panel account-settings-summary">
          <div class="account-settings-avatar">
            <img src="${currentAvatar}" alt="${content.fields.profilePicture}" data-account-settings-preview />
          </div>
          <div class="account-settings-summary__copy">
            <p class="eyebrow">${content.summary.eyebrow}</p>
            <h3>${displayName}</h3>
            <p>${content.summary.description}</p>
          </div>
        </article>

        <div class="panel application-panel account-settings-panel">
          <form class="application-form" data-account-settings-form novalidate>
            <div class="auth-form-error form-field--full" data-account-settings-error hidden style="display: none;">
              <strong>${content.errorTitle}</strong>
              <p data-account-settings-error-text>${content.errorFallback}</p>
            </div>
            <div class="form-success form-field--full" data-account-settings-success hidden style="display: none;">
              <h3>${content.successTitle}</h3>
              <p>${content.successText}</p>
            </div>
            <label class="form-field">
              <span>${content.fields.username}</span>
              <input type="text" name="username" value="${username}" autocomplete="username" required />
            </label>
            <label class="form-field">
              <span>${content.fields.email}</span>
              <input type="email" name="email" value="${user.email || ""}" autocomplete="email" required />
            </label>
            <label class="form-field">
              <span>${content.fields.password}</span>
              <div class="account-settings-password-wrap">
                <input
                  type="password"
                  name="password"
                  value=""
                  placeholder="********"
                  autocomplete="new-password"
                  minlength="8"
                  data-account-settings-password
                  disabled
                />
                <button
                  class="account-settings-password-toggle"
                  type="button"
                  data-account-settings-password-toggle
                  aria-label="${content.passwordVisibility.show}"
                  aria-pressed="false"
                  data-show-label="${content.passwordVisibility.show}"
                  data-hide-label="${content.passwordVisibility.hide}"
                  disabled
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M2.4 12c2.2-4 5.8-6 9.6-6s7.4 2 9.6 6c-2.2 4-5.8 6-9.6 6S4.6 16 2.4 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
                    <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
                    <path d="M4 20 20 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" data-account-settings-password-slash hidden></path>
                  </svg>
                </button>
              </div>
              <button class="account-settings-password-action" type="button" data-account-settings-password-enable>
                ${content.changePasswordLabel}
              </button>
              <p class="account-settings-password-success" data-account-settings-password-success hidden style="display: none;">
                ${content.passwordUpdatedSuccess}
              </p>
              <small>${content.passwordHint}</small>
            </label>
            <label class="form-field">
              <span>${content.fields.profileType}</span>
              <input type="text" value="${profileTypeLabel}" disabled />
            </label>
            ${workDescriptionField}
            <fieldset class="form-field form-field--full account-settings-avatar-group">
              <span>${content.fields.defaultAvatars}</span>
              <small>${content.defaultAvatarHint.replace("{choice}", avatarChoiceLabel)}</small>
              <div class="account-settings-avatar-grid">
                ${createAvatarOptions(user, content)}
              </div>
            </fieldset>
            <div class="form-actions form-field--full">
              <button class="button button--primary" type="submit">${content.saveLabel}</button>
            </div>
          </form>
          <div class="account-settings-logout">
            <button class="button button--danger account-settings-logout-btn" type="button" data-account-settings-logout>
              ${locale === "tr" ? "Çıkış Yap" : "Log Out"}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}
