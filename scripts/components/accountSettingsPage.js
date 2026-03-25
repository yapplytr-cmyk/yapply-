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
          <div class="account-settings-theme-section">
            <span class="account-settings-theme-label">${locale === "tr" ? "Dil" : "Language"}</span>
            <div class="account-settings-theme-switch" data-account-lang-switch>
              <button class="account-settings-theme-option" type="button" data-account-lang="tr">
                <span>&#127481;&#127479;</span> Türkçe
              </button>
              <button class="account-settings-theme-option" type="button" data-account-lang="en">
                <span>&#127468;&#127463;</span> English
              </button>
            </div>
          </div>
          <div class="account-settings-theme-section">
            <span class="account-settings-theme-label">${locale === "tr" ? "Tema" : "Theme"}</span>
            <div class="account-settings-theme-switch" data-account-theme-switch>
              <button class="account-settings-theme-option" type="button" data-account-theme="light">
                <span>&#9728;&#65039;</span> ${locale === "tr" ? "Açık" : "Light"}
              </button>
              <button class="account-settings-theme-option" type="button" data-account-theme="dark">
                <span>&#127769;</span> ${locale === "tr" ? "Koyu" : "Dark"}
              </button>
            </div>
          </div>
          <div class="account-settings-logout">
            <button class="button button--danger account-settings-logout-btn" type="button" data-account-settings-logout>
              ${locale === "tr" ? "Çıkış Yap" : "Log Out"}
            </button>
          </div>
          <div class="account-settings-delete-account">
            <button class="account-settings-delete-btn" type="button" data-account-settings-delete>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              </svg>
              ${locale === "tr" ? "Hesabımı Sil" : "Delete My Account"}
            </button>
          </div>
          <div class="account-settings-delete-confirm panel" data-account-settings-delete-confirm hidden style="display: none;">
            <h3>${locale === "tr" ? "Hesabınızı silmek istediğinizden emin misiniz?" : "Are you sure you want to delete your account?"}</h3>
            <p>${locale === "tr" ? "Bu işlem geri alınamaz. Tüm ilanlarınız, teklifleriniz ve profil bilgileriniz kalıcı olarak silinecektir." : "This action cannot be undone. All your listings, bids, and profile information will be permanently deleted."}</p>
            <div class="account-settings-delete-actions">
              <button class="button button--danger" type="button" data-account-settings-delete-yes>
                ${locale === "tr" ? "Evet, Hesabımı Sil" : "Yes, Delete My Account"}
              </button>
              <button class="button button--secondary" type="button" data-account-settings-delete-cancel>
                ${locale === "tr" ? "İptal" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
