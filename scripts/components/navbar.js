import { getAuthSession } from "../core/state.js";

function getFirstName(user) {
  const username = String(user?.username || "").trim();

  if (username) {
    return username;
  }

  const fullName = String(user?.fullName || "").trim();

  if (fullName) {
    return fullName.split(/\s+/)[0];
  }

  const email = String(user?.email || "").trim();

  if (email.includes("@")) {
    return email.split("@")[0];
  }

  return "";
}

function createAccountMascot(role) {
  if (role !== "client" && role !== "developer") {
    return "";
  }

  const mode = role === "developer" ? "developer" : "client";

  return `
    <span class="nav-account-mascot" data-mode="${mode}" aria-hidden="true">
      <svg class="marketplace-toggle-bird" viewBox="0 0 120 120" fill="none">
        <ellipse class="marketplace-toggle-bird__shadow" cx="60" cy="97" rx="18" ry="5"></ellipse>
        <g class="marketplace-toggle-bird__character">
          <path class="marketplace-toggle-bird__tail" d="M31 65 20 60 29 73 38 69Z"></path>
          <ellipse class="marketplace-toggle-bird__body" cx="52" cy="64" rx="23" ry="18"></ellipse>
          <circle class="marketplace-toggle-bird__head" cx="74" cy="50" r="13"></circle>
          <ellipse class="marketplace-toggle-bird__wing" cx="49" cy="65" rx="11" ry="15" transform="rotate(-24 49 65)"></ellipse>
          <circle class="marketplace-toggle-bird__eye" cx="78" cy="47" r="2.2"></circle>
          <path class="marketplace-toggle-bird__beak" d="M85 50 95 46 88 55Z"></path>
          <path class="marketplace-toggle-bird__leg" d="M49 81V89"></path>
          <path class="marketplace-toggle-bird__leg" d="M58 81V89"></path>
          <g class="marketplace-toggle-bird__pen">
            <rect class="marketplace-toggle-bird__pen-body" x="67" y="73" width="30" height="5" rx="2.5" transform="rotate(-22 67 73)"></rect>
            <rect class="marketplace-toggle-bird__pen-cap" x="67" y="73" width="6" height="5" rx="1.2" transform="rotate(-22 67 73)"></rect>
            <path class="marketplace-toggle-bird__pen-tip" d="M97 61 104 58 101 66Z"></path>
          </g>
          <g class="marketplace-toggle-bird__helmet">
            <path class="marketplace-toggle-bird__helmet-shell" d="M60 42c0-7.4 6-13.4 13.4-13.4 7 0 12.8 5.4 13.4 12.2v2.2H60V42Z"></path>
            <path class="marketplace-toggle-bird__helmet-rim" d="M58 43h31c1.8 0 3.2 1.4 3.2 3.2 0 1.1-.5 2-1.4 2.7H58.4c-.9-.7-1.4-1.6-1.4-2.7 0-1.8 1.4-3.2 3.2-3.2Z"></path>
            <path class="marketplace-toggle-bird__helmet-stripe" d="M72 29h4v14h-4z"></path>
          </g>
        </g>
      </svg>
    </span>
  `;
}

export function createNavbar(content, currentLocale) {
  const currentPage = document.body?.dataset?.page || "home";
  const authSession = getAuthSession();
  const isAuthenticated = Boolean(authSession.authenticated && authSession.user);
  const role = authSession.user?.role || "";
  const firstName = isAuthenticated ? getFirstName(authSession.user) : "";
  const menuCopy =
    currentLocale === "tr"
      ? {
          open: "Menüyü Aç",
          close: "Menüyü Kapat",
          login: "Giriş Yap",
          createAccount: "Hesap Oluştur",
          welcome: "Hos geldin",
          logout: "Cikis Yap",
        }
      : {
          open: "Open menu",
          close: "Close menu",
          login: "Login",
          createAccount: "Create Account",
          welcome: "Welcome",
          logout: "Logout",
        };
  const navLinksSource = [...content.nav.links];

  if (isAuthenticated && role === "client" && currentPage !== "client-dashboard" && currentPage !== "account-settings") {
    const createListingLink = {
      href: "./client-project-submission.html",
      label: currentLocale === "tr" ? "Talep İlanı Oluştur" : "Create Request Listing",
    };
    const existingIndex = navLinksSource.findIndex((entry) => entry.href === createListingLink.href);

    if (existingIndex >= 0) {
      navLinksSource[existingIndex] = createListingLink;
    } else {
      navLinksSource.unshift(createListingLink);
    }

    // "Tekliflerim" (My Bids) link — web navbar only (not native tab bar)
    const bidsLink = {
      href: "./client-bids.html",
      label: currentLocale === "tr" ? "Tekliflerim" : "My Bids",
    };
    if (!navLinksSource.some((l) => l.href === bidsLink.href)) {
      navLinksSource.push(bidsLink);
    }
  }

  const navLinks = navLinksSource
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
  const authLinks = isAuthenticated
    ? []
    : currentPage === "login"
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
  const dashboardLabel = currentLocale === "tr" ? "Panel" : "Dashboard";
  const mascotMarkup = createAccountMascot(role);
  const dashboardHref = role === "developer" ? "./developer-dashboard.html" : "./client-dashboard.html";
  const dashboardMarkup =
    role === "client" || role === "developer"
      ? `<a class="nav-auth-dashboard" href="${dashboardHref}">${dashboardLabel}</a>`
      : "";
  const desktopAuthMarkup = isAuthenticated
    ? `
      <div class="nav-auth-user">
        ${mascotMarkup}
        <div class="nav-auth-user__stack">
          <span class="nav-auth-user__pill">${menuCopy.welcome}, ${firstName}</span>
          ${dashboardMarkup}
        </div>
        <button class="nav-auth-logout" type="button" data-auth-logout>${menuCopy.logout}</button>
      </div>
    `
    : authLinks
        .map((link) =>
          link.variant === "secondary"
            ? `<a class="button button--secondary nav-auth-button" href="${link.href}">${link.label}</a>`
            : `<a class="nav-auth-link" href="${link.href}">${link.label}</a>`
        )
        .join("");
  const mobileAuthMarkup = isAuthenticated
    ? `
      <div class="nav-mobile-auth nav-mobile-auth--session">
        <div class="nav-auth-user nav-auth-user--mobile">
          ${mascotMarkup}
          <div class="nav-auth-user__stack nav-auth-user__stack--mobile">
            <span class="nav-auth-user__pill nav-auth-user__pill--mobile">${menuCopy.welcome}, ${firstName}</span>
            ${role === "client" || role === "developer" ? `<a class="button button--primary nav-mobile-auth__button nav-mobile-dashboard" href="${dashboardHref}">${dashboardLabel}</a>` : ""}
          </div>
        </div>
        <button class="button button--secondary nav-mobile-auth__button" type="button" data-auth-logout>${menuCopy.logout}</button>
      </div>
    `
    : authLinks
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
            <span class="brand-mark" aria-hidden="true">
              <svg class="brand-bird" viewBox="0 0 120 120" fill="none">
                <path d="M28 62 18 56 24 68 32 65Z" fill="var(--accent)"/>
                <ellipse cx="55" cy="65" rx="25" ry="20" fill="var(--accent)"/>
                <circle cx="76" cy="50" r="14" fill="var(--accent)"/>
                <ellipse cx="50" cy="65" rx="13" ry="13" fill="var(--accent)" opacity="0.55"/>
                <circle cx="80" cy="47" r="3" fill="var(--bg)"/>
                <path d="M89 49 100 50 91 55Z" fill="var(--text)"/>
                <path d="M48 83V93" stroke="var(--accent)" stroke-width="2.8" stroke-linecap="round"/>
                <path d="M44 93H52" stroke="var(--accent)" stroke-width="2.8" stroke-linecap="round"/>
                <path d="M60 83V93" stroke="var(--accent)" stroke-width="2.8" stroke-linecap="round"/>
                <path d="M56 93H64" stroke="var(--accent)" stroke-width="2.8" stroke-linecap="round"/>
              </svg>
            </span>
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
          </div>
        </div>
      </div>
    </header>
  `;
}
