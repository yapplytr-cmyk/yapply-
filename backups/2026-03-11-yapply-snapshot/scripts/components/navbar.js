import { createButton } from "./primitives.js";

export function createNavbar(content, currentLocale) {
  const navLinks = content.nav.links
    .map((link) => `<a href="${link.href}">${link.label}</a>`)
    .join("");
  const localeButtons = Object.keys(content.controls.locales)
    .map(
      (locale) => `
        <button
          class="locale-toggle__button${locale === currentLocale ? " is-active" : ""}"
          type="button"
          data-locale-switch="${locale}"
          aria-pressed="${locale === currentLocale}"
        >
          ${content.controls.locales[locale]}
        </button>
      `
    )
    .join("");

  return `
    <header class="site-header" id="top">
      <div class="nav-shell">
        <a class="brand" href="${content.nav.brandHref || "./index.html"}" aria-label="${content.brand.homeAriaLabel}">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-text">
            <span class="brand-name">${content.brand.name}</span>
            <span class="brand-tagline">${content.brand.tagline}</span>
          </span>
        </a>

        <nav class="site-nav" aria-label="${content.nav.ariaLabel}">
          ${navLinks}
        </nav>

        <div class="nav-actions">
          <div class="locale-toggle" role="group" aria-label="${content.controls.languageToggleLabel}">
            ${localeButtons}
          </div>
          <button class="control-button" id="theme-toggle" type="button" aria-label="${content.controls.themeToggleLabel}">
            ${content.controls.themeToggleLight}
          </button>
          ${createButton({ href: content.nav.ctaHref || "#top", label: content.nav.cta, variant: "primary" })}
        </div>
      </div>
    </header>
  `;
}
