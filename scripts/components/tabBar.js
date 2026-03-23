import { getAuthSession } from "../core/state.js";

/**
 * Detects whether the app is running inside Capacitor (iOS native shell).
 * When true, we render the bottom tab bar instead of the website navbar/footer.
 */
export function isNativeApp() {
  const { origin, hostname, port } = window.location;
  return origin === "capacitor://localhost" || (hostname === "localhost" && !port);
}

/**
 * Returns the tab bar configuration based on the user's role and locale.
 */
function getTabConfig(locale, role) {
  const isTr = locale === "tr";

  const searchTab = {
    id: "tab-search",
    label: isTr ? "Keşfet" : "Explore",
    href: "./open-marketplace.html",
    icon: searchIconSVG,
    page: "open-marketplace",
  };

  const createTab = {
    id: "tab-create",
    label: isTr ? "İlan Ver" : "Create",
    href: role === "developer" ? "./professional-listing-submission.html" : "./client-project-submission.html",
    icon: plusIconSVG,
    page: "marketplace-submission",
    isCenter: true,
  };

  // Developer: flat tabs (no popup) — Keşfet | İlan Ver | Tekliflerim | Ayarlar
  if (role === "developer") {
    const bidsTab = {
      id: "tab-bids",
      label: isTr ? "Tekliflerim" : "My Bids",
      href: "./developer-dashboard.html#developer-dashboard-bids",
      icon: birdProfileSVG(role),
      page: "developer-dashboard",
    };

    const settingsTab = {
      id: "tab-settings",
      label: isTr ? "Ayarlar" : "Settings",
      href: "./account-settings.html",
      icon: settingsTabIconSVG,
      page: "account-settings",
    };

    return [searchTab, createTab, bidsTab, settingsTab];
  }

  // Client: keep popup-based dashboard tab
  const dashboardTab = {
    id: "tab-dashboard",
    label: isTr ? "Hesabım" : "My Account",
    href: "./client-dashboard.html",
    icon: birdProfileSVG(role),
    page: "client-dashboard",
    isDashboard: true,
  };

  return [searchTab, createTab, dashboardTab];
}

const searchIconSVG = `
  <svg class="tab-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
`;

const plusIconSVG = `
  <svg class="tab-bar__icon tab-bar__icon--plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
`;

const settingsTabIconSVG = `
  <svg class="tab-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
`;

function birdProfileSVG(_role) {
  return `
    <svg class="tab-bar__icon tab-bar__icon--bird marketplace-toggle-bird" viewBox="0 0 120 120" fill="none">
      <g class="marketplace-toggle-bird__character">
        <path class="marketplace-toggle-bird__tail" d="M31 65 20 60 29 73 38 69Z"/>
        <ellipse class="marketplace-toggle-bird__body" cx="52" cy="64" rx="23" ry="18"/>
        <circle class="marketplace-toggle-bird__head" cx="74" cy="50" r="13"/>
        <ellipse class="marketplace-toggle-bird__wing" cx="49" cy="65" rx="11" ry="15" transform="rotate(-24 49 65)"/>
        <circle class="marketplace-toggle-bird__eye" cx="78" cy="47" r="2.2"/>
        <path class="marketplace-toggle-bird__beak" d="M85 50 95 46 88 55Z"/>
        <path class="marketplace-toggle-bird__leg" d="M49 81V89"/>
        <path class="marketplace-toggle-bird__leg" d="M58 81V89"/>
        <g class="marketplace-toggle-bird__helmet">
          <path class="marketplace-toggle-bird__helmet-shell" d="M60 42c0-7.4 6-13.4 13.4-13.4 7 0 12.8 5.4 13.4 12.2v2.2H60V42Z"/>
          <path class="marketplace-toggle-bird__helmet-rim" d="M58 43h31c1.8 0 3.2 1.4 3.2 3.2 0 1.1-.5 2-1.4 2.7H58.4c-.9-.7-1.4-1.6-1.4-2.7 0-1.8 1.4-3.2 3.2-3.2Z"/>
          <path class="marketplace-toggle-bird__helmet-stripe" d="M72 29h4v14h-4z"/>
        </g>
      </g>
    </svg>
  `;
}

/* Mailbox icon for İlanlarım */
function mailboxIconSVG() {
  return `<svg class="tab-popup__menu-icon" viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 11V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V11"/>
    <path d="M2 11L12 4L22 11"/>
    <rect x="8" y="12" width="8" height="4" rx="1" fill="var(--accent)" opacity="0.3"/>
    <path d="M10 12V10C10 8.89543 10.8954 8 12 8C13.1046 8 14 8.89543 14 10V12"/>
  </svg>`;
}

/* Money/dollar icon for Tekliflerim (developer bids) */
function moneyIconSVG() {
  return `<svg class="tab-popup__menu-icon" viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"/>
  </svg>`;
}

/* Settings gear icon for Hesap Ayarları */
function settingsGearIconSVG() {
  return `<svg class="tab-popup__menu-icon" viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>`;
}

/**
 * Creates the bottom tab bar HTML with popup menu for Hesabım.
 */
export function createTabBar(locale) {
  const session = getAuthSession();
  const role = session?.user?.role || "client";
  const isAuthenticated = Boolean(session?.authenticated);
  const currentPage = document.body?.dataset?.page || "open-marketplace";
  const tabs = getTabConfig(locale, role);
  const isTr = locale === "tr";

  const dashboardHref = role === "developer" ? "./developer-dashboard.html" : "./client-dashboard.html";
  const settingsHref = "./account-settings.html";

  const tabItems = tabs.map((tab) => {
    const isActive = tab.page === currentPage || (tab.isDashboard && (currentPage === "account-settings" || currentPage === "client-bids"));
    const activeClass = isActive ? " tab-bar__item--active" : "";
    const centerClass = tab.isCenter ? " tab-bar__item--center" : "";

    if (tab.isCenter) {
      const href = isAuthenticated ? tab.href : "./login.html";
      return `
        <a class="tab-bar__item${centerClass}${activeClass}" href="${href}" data-tab-page="${tab.page}" id="${tab.id}">
          <span class="tab-bar__center-ring">
            ${tab.icon}
          </span>
          <span class="tab-bar__label">${tab.label}</span>
        </a>
      `;
    }

    if (tab.isDashboard) {
      if (!isAuthenticated) {
        return `
          <a class="tab-bar__item${activeClass}" href="./login.html" data-tab-page="${tab.page}" id="${tab.id}">
            ${tab.icon}
            <span class="tab-bar__label">${tab.label}</span>
          </a>
        `;
      }
      const href = tab.href;
      const clientBidsHref = "./client-bids.html";
      const popupOptions = role === "developer"
        ? `
            <a class="tab-popup__option" href="${dashboardHref}" data-tab-popup-option>
              ${moneyIconSVG()}
              <span>${isTr ? "Tekliflerim" : "My Bids"}</span>
            </a>
          `
        : `
            <a class="tab-popup__option" href="${dashboardHref}" data-tab-popup-option>
              ${mailboxIconSVG()}
              <span>${isTr ? "İlanlarım" : "My Listings"}</span>
            </a>
            <a class="tab-popup__option" href="${clientBidsHref}" data-tab-popup-option>
              ${moneyIconSVG()}
              <span>${isTr ? "Tekliflerim" : "My Bids"}</span>
            </a>
          `;
      return `
        <div class="tab-bar__item-wrapper">
          <div class="tab-popup" data-tab-popup hidden>
            ${popupOptions}
            <a class="tab-popup__option" href="${settingsHref}" data-tab-popup-option>
              ${settingsGearIconSVG()}
              <span>${isTr ? "Hesap Ayarları" : "Account Settings"}</span>
            </a>
          </div>
          <a class="tab-bar__item${activeClass}" href="#" data-tab-dashboard-toggle data-tab-page="${tab.page}" id="${tab.id}">
            ${tab.icon}
            <span class="tab-bar__label">${tab.label}</span>
          </a>
        </div>
      `;
    }

    const needsAuth = tab.id === "tab-dashboard" || tab.id === "tab-bids" || tab.id === "tab-settings";
    const href = needsAuth && !isAuthenticated ? "./login.html" : tab.href;
    return `
      <a class="tab-bar__item${activeClass}" href="${href}" data-tab-page="${tab.page}" id="${tab.id}">
        ${tab.icon}
        <span class="tab-bar__label">${tab.label}</span>
      </a>
    `;
  }).join("");

  const devClass = role === "developer" ? " tab-bar--dev" : "";
  return `
    <nav class="tab-bar${devClass}" aria-label="App navigation">
      ${tabItems}
    </nav>
  `;
}

/**
 * Initializes tab bar interactive behaviors (popup menu, animations).
 * Call this after injecting the tab bar HTML into the DOM.
 */
export function initTabBarInteractions() {
  // ── Hesabım popup toggle ──
  const dashboardToggle = document.querySelector("[data-tab-dashboard-toggle]");
  const popup = document.querySelector("[data-tab-popup]");

  if (dashboardToggle && popup) {
    dashboardToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = !popup.hidden;
      popup.hidden = isOpen;
      popup.classList.toggle("tab-popup--visible", !isOpen);
    });

    // Close popup when tapping elsewhere
    document.addEventListener("click", (e) => {
      if (!popup.hidden && !e.target.closest("[data-tab-popup]") && !e.target.closest("[data-tab-dashboard-toggle]")) {
        popup.hidden = true;
        popup.classList.remove("tab-popup--visible");
      }
    });

    // Close popup when an option is tapped
    popup.querySelectorAll("[data-tab-popup-option]").forEach((opt) => {
      opt.addEventListener("click", () => {
        popup.hidden = true;
        popup.classList.remove("tab-popup--visible");
      });
    });
  }

  // ── İlan Ver plus spin animation ──
  const createBtn = document.querySelector("#tab-create");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      const ring = createBtn.querySelector(".tab-bar__center-ring");
      if (ring) {
        ring.classList.add("tab-bar__center-ring--spin");
        ring.addEventListener("animationend", () => {
          ring.classList.remove("tab-bar__center-ring--spin");
        }, { once: true });
      }
    });
  }
}
