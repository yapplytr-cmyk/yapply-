export function createNavbar(content, currentLocale) {
  const currentPage = document.body?.dataset?.page || "home";
  const menuCopy =
    currentLocale === "tr"
      ? {
          open: "Menüyü Aç",
          close: "Menüyü Kapat",
          login: "Giriş Yap",
          createAccount: "Hesap Oluştur",
        }
      : {
          open: "Open menu",
          close: "Close menu",
          login: "Login",
          createAccount: "Create Account",
        };
  const navLinks = content.nav.links
    .map((link) => {
      const isMarketplaceLink = link.href === "./open-marketplace.html";
      const isProfessionalsLink = link.href === "./professionals.html";
      const featuredClass = isMarketplaceLink ? " nav-link--marketplace" : isProfessionalsLink ? " nav-link--professionals" : "";

      return `<a class="${featuredClass.trim()}" href="${link.href}">${link.label}</a>`;
    })
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
  const authLinks =
    currentPage === "login"
      ? [
          {
            href: "./create-account.html",
            label: menuCopy.createAccount,
            variant: "secondary",
          },
        ]
      : currentPage === "create-account"
        ? [
            {
              href: "./login.html",
              label: menuCopy.login,
              variant: "text",
            },
          ]
        : [
            {
              href: "./login.html",
              label: menuCopy.login,
              variant: "text",
            },
            {
              href: "./create-account.html",
              label: menuCopy.createAccount,
              variant: "secondary",
            },
          ];
  const desktopAuthMarkup = authLinks
    .map((link) =>
      link.variant === "secondary"
        ? `<a class="button button--secondary nav-auth-button" href="${link.href}">${link.label}</a>`
        : `<a class="nav-auth-link" href="${link.href}">${link.label}</a>`
    )
    .join("");
  const mobileAuthMarkup = authLinks
    .map((link) =>
      link.variant === "secondary"
        ? `<a class="button button--secondary nav-mobile-auth__button" href="${link.href}">${link.label}</a>`
        : `<a class="nav-mobile-auth__link" href="${link.href}">${link.label}</a>`
    )
    .join("");

  return `
    <header class="site-header" id="top">
      <div class="nav-shell">
        <div class="nav-bar">
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
            <div class="nav-auth-links">
              ${desktopAuthMarkup}
            </div>
            <div class="nav-utility__stack">
              <div class="locale-toggle locale-toggle--utility" role="group" aria-label="${content.controls.languageToggleLabel}">
                ${localeButtons}
              </div>
              <button class="control-button control-button--utility" id="theme-toggle" type="button" aria-label="${content.controls.themeToggleLabel}">
                ${content.controls.themeToggleLight}
              </button>
            </div>
          </div>

          <div class="nav-mobile-actions">
            <button
              class="control-button nav-toggle"
              type="button"
              aria-expanded="false"
              aria-controls="nav-mobile-panel"
              aria-label="${menuCopy.open}"
              data-nav-toggle
              data-nav-open-label="${menuCopy.open}"
              data-nav-close-label="${menuCopy.close}"
            >
              <span class="nav-toggle__lines" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </div>
        </div>

        <div class="nav-mobile-panel" id="nav-mobile-panel" data-nav-panel hidden>
          <nav class="nav-mobile-links" aria-label="${content.nav.ariaLabel}">
            ${navLinks}
          </nav>
          <div class="nav-mobile-auth">
            ${mobileAuthMarkup}
          </div>
          <div class="nav-mobile-controls">
            <div class="locale-toggle locale-toggle--utility" role="group" aria-label="${content.controls.languageToggleLabel}">
              ${localeButtons}
            </div>
            <button class="control-button control-button--utility" id="theme-toggle-mobile" type="button" aria-label="${content.controls.themeToggleLabel}">
              ${content.controls.themeToggleLight}
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}
