import {
  createManagedFeaturedProject,
  deleteManagedFeaturedProject,
  deleteManagedListing,
  getManagedFeaturedProjects,
  getManagedMarketplaceCollections,
  getManagedMarketplaceListing,
  moveManagedFeaturedProject,
  moveManagedListing,
  updateManagedFeaturedProject,
  updateManagedListing,
} from "./core/adminStore.js";
import { getDefaultAvatarOptions } from "./core/accountSettingsStore.js";
import {
  acceptClientDashboardBid,
  closeClientDashboardListing,
  deleteMarketplaceListing,
  enrichMarketplaceListingWithCreatorAvatar,
  enrichMarketplaceListingsWithCreatorAvatars,
  fetchDeveloperDashboardData,
  fetchPublicMarketplaceListing,
  fetchPublicMarketplaceListings,
  getDeveloperDashboardLocalBidEntries,
  invalidateMarketplaceRequestCache,
  getSubmissionSuccessHref,
  optimizeMarketplaceImageFile,
  saveMarketplaceSubmission,
  seedListingDetailCache,
  submitMarketplaceBid,
  syncClientDashboardListingBids,
  updateClientDashboardListing,
  updateDeveloperDashboardListing,
} from "./core/marketplaceStore.js";
import { applyTheme, clearAuthSession, getAuthSession, getLocale, getTheme, setAuthSession, setLocale, toggleTheme } from "./core/state.js";
import { preWarmSupabaseClient } from "./core/supabaseClient.js?v=20260312-supabase-runtime-fix";

/* ── Native app detection ───────────────────────── */
function _isNativeApp() {
  const { origin, hostname, port } = window.location;
  return origin === "capacitor://localhost" || (hostname === "localhost" && !port);
}
const IS_NATIVE_APP = _isNativeApp();

/* ── SPA-style soft navigation for native app (no white flash) ─── */
const _pageRouteMap = {
  "open-marketplace.html":                    { page: "open-marketplace" },
  "marketplace-client-listing.html":          { page: "marketplace-listing-detail", listingType: "client" },
  "marketplace-professional-listing.html":    { page: "marketplace-listing-detail", listingType: "professional" },
  "developer-dashboard.html":                 { page: "developer-dashboard" },
  "client-dashboard.html":                    { page: "client-dashboard" },
  "login.html":                               { page: "login" },
  "create-account.html":                      { page: "create-account" },
  "account-settings.html":                    { page: "account-settings" },
  "client-project-submission.html":           { page: "marketplace-submission", submissionType: "client" },
  "professional-listing-submission.html":     { page: "marketplace-submission", submissionType: "professional" },
  "client-project-submission-success.html":   { page: "marketplace-submission-success", submissionType: "client" },
  "professional-listing-submission-success.html": { page: "marketplace-submission-success", submissionType: "professional" },
  "admin-dashboard.html":                     { page: "admin-dashboard" },
  "index.html":                               { page: "home" },
  "cart.html":                                { page: "watchlist" },
};

let _softNavInProgress = false;

function nativeSoftNavigate(href) {
  if (!IS_NATIVE_APP || _softNavInProgress) return false;

  // Parse the href to extract filename and query params
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch (_) { return false; }

  // Only intercept local same-origin .html navigation
  if (url.origin !== window.location.origin) return false;
  const pathname = url.pathname.replace(/^\/+/, "");
  const filename = pathname.split("/").pop() || "";
  if (!filename.endsWith(".html")) return false;

  const route = _pageRouteMap[filename];
  if (!route) return false; // Unknown page — fall back to full navigation

  _softNavInProgress = true;

  // Update body dataset to match what the target HTML would set
  document.body.dataset.page = route.page;
  // Clear previous dataset attributes that the new page may not have
  delete document.body.dataset.listingType;
  delete document.body.dataset.submissionType;
  delete document.body.dataset.developer;
  delete document.body.dataset.project;
  if (route.listingType) document.body.dataset.listingType = route.listingType;
  if (route.submissionType) document.body.dataset.submissionType = route.submissionType;

  // Update URL in address bar (for Capacitor history + back button)
  const newUrl = "./" + filename + url.search;
  window.history.pushState({ softNav: true, filename, route }, "", newUrl);

  // Scroll to top for new page
  window.scrollTo(0, 0);

  // Re-render the page with the new dataset
  renderPage().finally(() => { _softNavInProgress = false; });

  return true;
}

// Intercept all <a> clicks on native app for soft navigation
if (IS_NATIVE_APP) {
  document.addEventListener("click", (e) => {
    // Don't intercept if modifier keys are held
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const anchor = e.target.closest("a[href]");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href || href === "#" || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    // Try soft navigation — if successful, prevent the default full reload
    if (nativeSoftNavigate(href)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true); // Capture phase to intercept before other handlers

  // Handle browser back/forward
  window.addEventListener("popstate", (e) => {
    if (e.state?.softNav) {
      const route = e.state.route;
      if (route) {
        document.body.dataset.page = route.page;
        delete document.body.dataset.listingType;
        delete document.body.dataset.submissionType;
        delete document.body.dataset.developer;
        delete document.body.dataset.project;
        if (route.listingType) document.body.dataset.listingType = route.listingType;
        if (route.submissionType) document.body.dataset.submissionType = route.submissionType;
        window.scrollTo(0, 0);
        renderPage();
      }
    }
  });
}

// Navigate helper: tries soft nav on native, falls back to full reload
function navigateTo(href) {
  if (IS_NATIVE_APP && nativeSoftNavigate(href)) return;
  window.location.href = href;
}

/* ── Swipe-back gesture: left edge → right with visible slide animation ─── */
if (IS_NATIVE_APP) {
  let _swipeStartX = 0;
  let _swipeStartY = 0;
  let _swiping = false;
  let _swipeOverlay = null;

  function _getSwipeOverlay() {
    if (_swipeOverlay) return _swipeOverlay;
    _swipeOverlay = document.createElement("div");
    _swipeOverlay.style.cssText = `
      position:fixed;inset:0;z-index:9998;pointer-events:none;
      background:linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 40%);
      opacity:0;transition:opacity 150ms ease;
    `;
    document.body.appendChild(_swipeOverlay);
    return _swipeOverlay;
  }

  document.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    // Only trigger from left 28px edge
    if (touch.clientX > 28) return;
    // Only allow swipe-back when not on the main marketplace page
    const page = document.body.dataset.page;
    if (page === "open-marketplace" || page === "home") return;
    _swipeStartX = touch.clientX;
    _swipeStartY = touch.clientY;
    _swiping = true;
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    if (!_swiping) return;
    const touch = e.touches[0];
    const dx = touch.clientX - _swipeStartX;
    const dy = Math.abs(touch.clientY - _swipeStartY);
    // Cancel if swiping more vertically
    if (dy > dx * 1.2 && dx < 40) { _swiping = false; return; }
    if (dx > 8) {
      const appRoot = document.getElementById("app");
      const progress = Math.min(dx / window.innerWidth, 1);
      const translateX = dx * 0.85;
      if (appRoot) {
        appRoot.style.transition = "none";
        appRoot.style.transform = `translateX(${translateX}px)`;
        appRoot.style.opacity = String(1 - progress * 0.3);
      }
      const overlay = _getSwipeOverlay();
      overlay.style.opacity = String(progress * 0.8);
    }
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    if (!_swiping) { _swiping = false; return; }
    _swiping = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - _swipeStartX;
    const dy = Math.abs(touch.clientY - _swipeStartY);
    const appRoot = document.getElementById("app");
    const screenW = window.innerWidth;
    const didSwipeEnough = dx > screenW * 0.3 && dx > dy * 1.2;

    if (didSwipeEnough) {
      // Animate off-screen then navigate
      if (appRoot) {
        appRoot.style.transition = "transform 200ms ease-out, opacity 200ms ease-out";
        appRoot.style.transform = `translateX(${screenW}px)`;
        appRoot.style.opacity = "0";
      }
      if (_swipeOverlay) _swipeOverlay.style.opacity = "0";
      setTimeout(() => {
        if (appRoot) { appRoot.style.transition = ""; appRoot.style.transform = ""; appRoot.style.opacity = ""; }
        if (window.history.state?.softNav) {
          window.history.back();
        } else {
          navigateTo("./open-marketplace.html");
        }
      }, 200);
    } else {
      // Snap back
      if (appRoot) {
        appRoot.style.transition = "transform 250ms ease, opacity 250ms ease";
        appRoot.style.transform = "";
        appRoot.style.opacity = "";
        setTimeout(() => { if (appRoot) { appRoot.style.transition = ""; } }, 260);
      }
      if (_swipeOverlay) _swipeOverlay.style.opacity = "0";
    }
  }, { passive: true });
}

/* ── Pre-warm Supabase CDN client immediately on boot ─── */
preWarmSupabaseClient();

let cleanupRevealAnimations = () => {};
let cleanupParallax = () => {};
let cleanupHeroScene = () => {};
let cleanupCounters = () => {};
let cleanupBirdScroll = () => {};
let heroSceneGeneration = 0;
let authApiPromise = null;
let appApiPromise = null;
let i18nApiPromise = null;
let heroSceneApiPromise = null;
let tabBarApiPromise = null;

function getLoadingCopy(locale = "tr") {
  if (locale === "en") {
    return {
      eyebrow: "Yapply",
      text: "Preparing...",
    };
  }

  return {
    eyebrow: "Yapply",
    text: "Hazırlanıyor...",
  };
}

function getLoadingBirdMarkup() {
  return `
    <svg class="loading-bird" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <ellipse class="loading-bird__shadow" cx="60" cy="95" rx="19" ry="5"></ellipse>
      <g class="loading-bird__bob">
        <path class="loading-bird__tail" d="M32 63 21 58 30 71 38 67Z"></path>
        <ellipse class="loading-bird__body" cx="52" cy="62" rx="23" ry="18"></ellipse>
        <circle class="loading-bird__head" cx="73" cy="49" r="13"></circle>
        <ellipse class="loading-bird__wing" cx="49" cy="63" rx="11" ry="15" transform="rotate(-24 49 63)"></ellipse>
        <circle class="loading-bird__eye" cx="77" cy="46" r="2.3"></circle>
        <path class="loading-bird__beak" d="M84 49 94 45 87 54Z"></path>
        <path class="loading-bird__leg" d="M49 79V88"></path>
        <path class="loading-bird__leg" d="M58 79V88"></path>
        <g class="loading-bird__tool">
          <rect class="loading-bird__pencil" x="66" y="71" width="30" height="5" rx="2.5" transform="rotate(-22 66 71)"></rect>
          <rect class="loading-bird__pencil-eraser" x="66" y="71" width="6" height="5" rx="1.2" transform="rotate(-22 66 71)"></rect>
          <path class="loading-bird__pencil-tip" d="M96 59 103 56 100 64Z"></path>
        </g>
      </g>
    </svg>
  `;
}

function createLoadingMarkup({ eyebrow, locale = "tr" } = {}) {
  const copy = getLoadingCopy(locale);

  return `
    <div class="page-shell">
      <main class="section-shell">
        <div class="panel application-panel application-panel--loading">
          <div class="app-loader" aria-live="polite">
            <p class="app-loader__brand">${escapeHtml(eyebrow || copy.eyebrow)}</p>
            <div class="app-loader__bird">${getLoadingBirdMarkup()}</div>
            <p class="app-loader__text">
              <span class="app-loader__text-tr">Hazırlanıyor...</span>
              <span class="app-loader__text-en">Preparing...</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  `;
}

function createBootFallbackMarkup({
  eyebrow = "Yapply Recovery",
  title = "The interface is recovering.",
  description = "A runtime or module-load error interrupted the page render. The app shell is visible again while the failing module is bypassed.",
  debug = "",
} = {}) {
  const debugMarkup = debug ? `<p class="section-description"><strong>Debug:</strong> ${debug}</p>` : "";

  return `
    <div class="page-shell">
      <main class="section-shell">
        <div class="panel application-panel">
          <p class="eyebrow">${eyebrow}</p>
          <h1 class="section-title">${title}</h1>
          <p class="section-description">${description}</p>
          ${debugMarkup}
          <div class="hero-actions">
            <a class="button button--primary" href="./index.html">Back to Home</a>
            <a class="button button--secondary" href="./open-marketplace.html">Open Marketplace</a>
          </div>
        </div>
      </main>
    </div>
  `;
}

function getBootErrorMessage(error) {
  if (!error) {
    return "Unknown boot failure";
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return String(error);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderBootFallback(appRoot, error) {
  if (!appRoot) {
    return;
  }

  appRoot.innerHTML = createBootFallbackMarkup({
    debug: getBootErrorMessage(error),
  });
}

async function loadAuthApi() {
  if (!authApiPromise) {
    authApiPromise = import("./core/auth.js?v=20260312-public-auth-backend").catch(() => null);
  }

  return authApiPromise;
}

async function loadAppApi() {
  if (!appApiPromise) {
    appApiPromise = import("./app.js");
  }

  return appApiPromise;
}

async function loadI18nApi() {
  if (!i18nApiPromise) {
    i18nApiPromise = import("./core/i18n.js");
  }

  return i18nApiPromise;
}

async function loadHeroSceneApi() {
  if (!heroSceneApiPromise) {
    heroSceneApiPromise = import("./visuals/heroScene.js").catch(() => null);
  }

  return heroSceneApiPromise;
}

async function loadTabBarApi() {
  if (!tabBarApiPromise) {
    tabBarApiPromise = import("./components/tabBar.js").catch(() => null);
  }

  return tabBarApiPromise;
}

function dismissSplashScreen() {
  const splash = document.getElementById("app-splash");
  if (!splash) return;
  // Wait for fly animation to finish (~2s) then fade out
  const elapsed = performance.now() - _splashStartTime;
  const remaining = Math.max(0, 1900 - elapsed); // let the 2s animation nearly complete
  setTimeout(() => {
    splash.classList.add("app-splash--hidden");
    // Reveal the tab bar and app content underneath
    const tabBar = document.getElementById("tab-bar-root") || document.querySelector(".tab-bar");
    const appRoot = document.getElementById("app");
    if (tabBar) { tabBar.style.transition = "opacity 350ms ease"; tabBar.style.opacity = "1"; }
    if (appRoot) { appRoot.style.transition = "opacity 350ms ease"; appRoot.style.opacity = "1"; }
    setTimeout(() => splash.remove(), 400);
  }, remaining);
}
const _splashStartTime = performance.now();

// Hide app content and tab bar while splash is showing (no flicker)
if (IS_NATIVE_APP && document.getElementById("app-splash")) {
  const _appRoot = document.getElementById("app");
  if (_appRoot) _appRoot.style.opacity = "0";
}

function hideSplashIfNotNative() {
  if (!IS_NATIVE_APP) {
    const splash = document.getElementById("app-splash");
    if (splash) splash.remove();
  }
}

function setDocumentAuthState(session) {
  document.body.dataset.authenticated = session?.authenticated ? "true" : "false";
  document.body.dataset.userRole = session?.user?.role || "";
}

function getCurrentPage() {
  const page = document.body.dataset.page;
  // In native app, "home" redirects to marketplace (there's no website homepage)
  if (IS_NATIVE_APP && (!page || page === "home")) {
    return "open-marketplace";
  }
  return page || "home";
}

function getCurrentProject() {
  return document.body.dataset.project || "";
}

function getCurrentSubmissionType() {
  return document.body.dataset.submissionType || "";
}

function getCurrentDeveloper() {
  return document.body.dataset.developer || "";
}

function getCurrentListingType() {
  return document.body.dataset.listingType || "";
}

function getCurrentListingId() {
  const url = new URL(window.location.href);
  return url.searchParams.get("id") || "";
}

function getCurrentMarketplaceFilters() {
  const url = new URL(window.location.href);

  return {
    category: url.searchParams.get("category") || "",
    status: url.searchParams.get("status") || "open-for-bids",
  };
}

function updateThemeToggleLabel(content) {
  const toggleButtons = document.querySelectorAll("#theme-toggle, #theme-toggle-mobile");

  if (toggleButtons.length === 0) {
    return;
  }

  const nextLabel = getTheme() === "dark" ? content.controls.themeToggleLight : content.controls.themeToggleDark;
  toggleButtons.forEach((toggleButton) => {
    toggleButton.textContent = nextLabel;
  });

  const fab = document.getElementById("theme-fab");
  if (fab) {
    const isDark = getTheme() === "dark";
    fab.innerHTML = isDark ? themeFabSunSVG : themeFabMoonSVG;
    fab.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  }
}

const themeFabSunSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const themeFabMoonSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function mountThemeFab(content) {
  if (document.getElementById("theme-fab")) return;
  const btn = document.createElement("button");
  btn.id = "theme-fab";
  btn.className = "theme-fab";
  btn.type = "button";
  const isDark = getTheme() === "dark";
  btn.innerHTML = isDark ? themeFabSunSVG : themeFabMoonSVG;
  btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  btn.addEventListener("click", () => {
    btn.classList.add("theme-fab--spin");
    toggleTheme();
    updateThemeToggleLabel(content);
    setTimeout(() => btn.classList.remove("theme-fab--spin"), 400);
  });
  document.body.appendChild(btn);
}

function setupNavMenu() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const panel = document.querySelector("[data-nav-panel]");
  const shell = toggle?.closest(".nav-shell");

  if (!toggle || !panel) {
    return;
  }

  const syncState = (isOpen) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? toggle.dataset.navCloseLabel || "Close menu" : toggle.dataset.navOpenLabel || "Open menu");
    panel.hidden = !isOpen;
    panel.classList.toggle("is-open", isOpen);
    shell?.classList.toggle("nav-shell--expanded", isOpen);
    document.documentElement.classList.toggle("nav-menu-open", isOpen);
  };

  syncState(false);

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    syncState(!isOpen);
  });

  panel.querySelectorAll("a, button[data-locale-switch], #theme-toggle-mobile").forEach((node) => {
    node.addEventListener("click", () => {
      syncState(false);
    });
  });
}

function setupAuthNavigation() {
  const logoutButtons = [...document.querySelectorAll("[data-auth-logout]")];

  if (logoutButtons.length === 0) {
    return;
  }

  logoutButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled || button.dataset.loading === "true") {
        return;
      }

      setButtonLoading(button, true);
      button.disabled = true;

      try {
        const authApi = await loadAuthApi();
        await authApi?.logoutAccount?.();
      } catch (error) {
        console.error("Yapply logout failed", error);
      } finally {
        clearAuthSession();
        setDocumentAuthState({ authenticated: false, user: null });
        navigateTo("./index.html");
      }
    });
  });
}

function setButtonLoading(button, isLoading) {
  if (!button) {
    return;
  }

  if (isLoading) {
    button.dataset.loading = "true";
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    return;
  }

  button.removeAttribute("data-loading");
  button.removeAttribute("aria-busy");
  button.disabled = false;
}

function areSessionsEquivalent(left, right) {
  return Boolean(left?.authenticated) === Boolean(right?.authenticated)
    && String(left?.user?.id || "") === String(right?.user?.id || "")
    && String(left?.user?.role || "") === String(right?.user?.role || "")
    && String(left?.user?.profilePictureSrc || "") === String(right?.user?.profilePictureSrc || "")
    && String(left?.user?.email || "") === String(right?.user?.email || "");
}

function scheduleDeferredWork(callback, timeout = 400) {
  if (typeof callback !== "function") {
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => callback(), { timeout });
    return;
  }

  window.setTimeout(callback, 32);
}

function hydrateMarketplaceDeferredCards(kind = "client") {
  const grid = document.querySelector(`[data-marketplace-${kind}-grid]`);
  const template = document.querySelector(`[data-marketplace-deferred-cards="${kind}"]`);

  if (!grid || !template || template.dataset.hydrated === "true") {
    return;
  }

  const appendCards = () => {
    if (!template.isConnected || template.dataset.hydrated === "true") {
      return;
    }

    const fragment = template.content?.cloneNode(true);
    if (fragment) {
      grid.append(fragment);
    }

    template.dataset.hydrated = "true";
    template.remove();
    document.dispatchEvent(new CustomEvent("marketplace:cards-updated", { detail: { kind } }));
  };

  scheduleDeferredWork(appendCards);
}

function setupAdminSectionNavigation() {
  if (document.body.dataset.page !== "admin-dashboard") {
    return;
  }

  const adminAnchors = [...document.querySelectorAll('a[href*="#admin-"]')];

  adminAnchors.forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href") || "";
      const hashIndex = href.indexOf("#");

      if (hashIndex < 0) {
        return;
      }

      const targetId = href.slice(hashIndex);
      const target = document.querySelector(targetId);

      if (!target) {
        return;
      }

      event.preventDefault();
      history.replaceState(null, "", `./admin-dashboard.html${targetId}`);
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}

function markMotionTargets() {
  const sections = [...document.querySelectorAll(".section-shell")];
  const itemSelector =
    ".metric-card, .step-card, .feature-card, .project-card, .testimonial-card, .footer-card, .audience-card, .process-card, .stats-card, .application-panel, .faq-item, .professionals-stage, .project-spec, .project-hero-visual, .project-detail-card, .project-budget-card, .detail-list-card, .timeline-card, .ideal-card, .project-note, .project-cta-panel, .project-inquiry-summary, .marketplace-stage, .marketplace-card, .submission-stage, .submission-summary, .developer-profile-visual, .developer-profile-fact, .developer-project-card";

  sections.forEach((section, sectionIndex) => {
    section.classList.add("reveal-section");

    const items = [...section.querySelectorAll(itemSelector)];
    items.forEach((item, itemIndex) => {
      item.classList.add("reveal-item");
      item.style.setProperty("--reveal-delay", `${Math.min(itemIndex * 70 + sectionIndex * 20, 320)}ms`);
    });
  });
}

function setupRevealAnimations() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sections = [...document.querySelectorAll(".reveal-section")];
  const items = [...document.querySelectorAll(".reveal-item")];
  const allTargets = [...sections, ...items];
  const isSmallTouchViewport =
    window.matchMedia("(max-width: 820px)").matches &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const marketplaceSection = document.querySelector("#marketplace-listings");
  const marketplaceTargets = [
    ...document.querySelectorAll(
      "#marketplace-listings .section-heading, .marketplace-tabs, .marketplace-panel, .marketplace-grid, .marketplace-card, .marketplace-card__media"
    ),
  ];
  const adminDashboardTargets = [
    ...document.querySelectorAll(
      'body[data-page="admin-dashboard"] .section-shell, body[data-page="admin-dashboard"] .section-heading, body[data-page="admin-dashboard"] .admin-dashboard-grid, body[data-page="admin-dashboard"] .admin-section-panel, body[data-page="admin-dashboard"] .admin-record, body[data-page="admin-dashboard"] .admin-inline-form'
    ),
  ];

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    allTargets.forEach((target) => target.classList.add("is-visible"));
    return () => {};
  }

  if (document.body.dataset.page === "admin-dashboard") {
    adminDashboardTargets.forEach((target) => target.classList.add("is-visible"));
  }

  if (document.body.dataset.page === "open-marketplace") {
    marketplaceSection?.classList.add("is-visible");
    marketplaceTargets.forEach((target) => target.classList.add("is-visible"));
  }

  if (isSmallTouchViewport) {
    marketplaceSection?.classList.add("is-visible");
    marketplaceTargets.forEach((target) => target.classList.add("is-visible"));
  }

  // On native app: skip reveal animations for detail + dashboard pages
  // so all content (including below-the-fold sections) is visible immediately
  const instantRevealPages = new Set(["marketplace-listing-detail", "developer-dashboard", "client-dashboard"]);
  if (IS_NATIVE_APP && instantRevealPages.has(document.body.dataset.page)) {
    allTargets.forEach((target) => target.classList.add("is-visible"));
    return () => {};
  }

  allTargets.forEach((target) => {
    if (target.closest(".hero, .professionals-hero, .project-detail-hero, .marketplace-hero, .submission-hero, .developer-profile-hero")) {
      target.classList.add("is-visible");
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  allTargets.forEach((target) => {
    if (!target.classList.contains("is-visible")) {
      observer.observe(target);
    }
  });

  return () => observer.disconnect();
}

function setupParallax() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const hero = document.querySelector(".hero, .project-detail-hero, .marketplace-hero, .submission-hero, .developer-profile-hero");

  if (prefersReducedMotion || !hero) {
    root.style.setProperty("--ambient-shift-x", "0px");
    root.style.setProperty("--ambient-shift-y", "0px");
    root.style.setProperty("--hero-parallax", "0px");
    root.style.setProperty("--hero-tilt", "0deg");
    return () => {};
  }

  let frameId = 0;

  const update = () => {
    frameId = 0;

    const scrollY = window.scrollY;
    const ambientShiftY = Math.min(scrollY * 0.08, 34);
    const ambientShiftX = Math.min(scrollY * 0.03, 18);
    const rect = hero.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 1;
    const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
    const clamped = Math.max(0, Math.min(1, progress));

    root.style.setProperty("--ambient-shift-x", `${ambientShiftX}px`);
    root.style.setProperty("--ambient-shift-y", `${ambientShiftY}px`);
    root.style.setProperty("--hero-parallax", `${clamped * 28}px`);
    root.style.setProperty("--hero-tilt", `${(clamped - 0.5) * 2.4}deg`);
  };

  const requestTick = () => {
    if (frameId) {
      return;
    }

    frameId = window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);

  return () => {
    window.removeEventListener("scroll", requestTick);
    window.removeEventListener("resize", requestTick);

    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }
  };
}

function setupStatsCounters(locale) {
  const counters = [...document.querySelectorAll("[data-counter-target]")];
  const formatter = new Intl.NumberFormat(locale);
  const frameIds = new Set();

  if (counters.length === 0) {
    return () => {};
  }

  const renderValue = (node, value) => {
    const suffix = node.dataset.counterSuffix || "";
    node.textContent = `${formatter.format(value)}${suffix}`;
  };

  const animateCounter = (node) => {
    const target = Number(node.dataset.counterTarget || "0");
    const duration = 1400;
    const start = performance.now();

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);

      renderValue(node, current);

      if (progress < 1) {
        const frameId = window.requestAnimationFrame(tick);
        frameIds.add(frameId);
        return;
      }

      renderValue(node, target);
    };

    const frameId = window.requestAnimationFrame(tick);
    frameIds.add(frameId);
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    counters.forEach((node) => renderValue(node, Number(node.dataset.counterTarget || "0")));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );

  counters.forEach((node) => observer.observe(node));

  return () => {
    observer.disconnect();
    frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    frameIds.clear();
  };
}

function setupFaqAccordions() {
  const items = [...document.querySelectorAll("[data-faq-item]")];

  if (items.length === 0) {
    return;
  }

  items.forEach((item) => {
    const trigger = item.querySelector("[data-faq-trigger]");
    const panel = item.querySelector("[data-faq-panel]");

    if (!trigger || !panel) {
      return;
    }

    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";

      items.forEach((entry) => {
        const entryTrigger = entry.querySelector("[data-faq-trigger]");
        const entryPanel = entry.querySelector("[data-faq-panel]");

        if (!entryTrigger || !entryPanel) {
          return;
        }

        entryTrigger.setAttribute("aria-expanded", "false");
        entryPanel.hidden = true;
      });

      if (!isOpen) {
        trigger.setAttribute("aria-expanded", "true");
        panel.hidden = false;
      }
    });
  });
}

function setupBidAccordions() {
  const items = [...document.querySelectorAll("[data-bid-item]")];
  if (items.length === 0) return;

  items.forEach((item) => {
    const trigger = item.querySelector("[data-bid-trigger]");
    const panel = item.querySelector("[data-bid-panel]");
    if (!trigger || !panel) return;

    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      // close all
      items.forEach((entry) => {
        const t = entry.querySelector("[data-bid-trigger]");
        const p = entry.querySelector("[data-bid-panel]");
        if (t && p) {
          t.setAttribute("aria-expanded", "false");
          p.hidden = true;
        }
      });
      // open clicked if was closed
      if (!isOpen) {
        trigger.setAttribute("aria-expanded", "true");
        panel.hidden = false;
      }
    });
  });
}

function setupApplicationForm() {
  const form = document.querySelector("[data-application-form]");
  const success = document.querySelector("[data-form-success]");

  if (!form || !success) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    form.hidden = true;
    success.hidden = false;
  });
}

function setupAuthRoleSelection() {
  const roleButtons = [...document.querySelectorAll("[data-auth-role-select]")];
  const roleCards = [...document.querySelectorAll("[data-auth-role-card]")];
  const roleDetails = [...document.querySelectorAll("[data-auth-role-detail]")];
  const roleGroups = [...document.querySelectorAll("[data-auth-role-group]")];
  const roleInput = document.querySelector("[data-auth-role-input]");
  const authForm = document.querySelector(".auth-signup-form");
  const formSection = document.querySelector("#create-account-form");
  const shouldScrollToForm = document.body.dataset.page === "create-account" && Boolean(formSection);

  if (roleButtons.length === 0 || !roleInput) {
    return;
  }

  const setActiveRole = (role) => {
    roleInput.value = role;

    roleButtons.forEach((button) => {
      const isActive = button.getAttribute("data-auth-role-select") === role;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    roleCards.forEach((card) => {
      card.classList.toggle("is-active", card.getAttribute("data-auth-role-card") === role);
    });

    roleDetails.forEach((detail) => {
      detail.classList.toggle("is-active", detail.getAttribute("data-auth-role-detail") === role);
    });

    roleGroups.forEach((group) => {
      const isActive = group.getAttribute("data-auth-role-group") === role;
      group.classList.toggle("is-active", isActive);
      group.hidden = !isActive;

      group.querySelectorAll("input, select, textarea").forEach((field) => {
        field.disabled = !isActive;

        if (field.hasAttribute("data-auth-required")) {
          field.required = isActive;
        }

        if (!isActive) {
          field.classList.remove("is-invalid");
          field.closest(".form-field")?.classList.remove("is-invalid");
        }
      });
    });

    authForm?.querySelector("[data-auth-entry-error]")?.setAttribute("hidden", "");

    // Toggle login bird mascot mode (native app only)
    const loginBird = document.querySelector("[data-auth-login-bird]");
    if (loginBird) {
      const newMode = role === "developer" ? "developer" : "client";
      if (loginBird.getAttribute("data-mode") !== newMode) {
        loginBird.classList.add("is-switching");
        loginBird.setAttribute("data-mode", newMode);
        setTimeout(() => loginBird.classList.remove("is-switching"), 400);
      }
    }
  };

  setActiveRole(roleInput.value || roleButtons[0]?.getAttribute("data-auth-role-select") || "developer");

  roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const role = button.getAttribute("data-auth-role-select");

      if (!role) {
        return;
      }

      setActiveRole(role);

      if (shouldScrollToForm) {
        window.requestAnimationFrame(() => {
          formSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    });
  });

  // Also let the entire role card (article) trigger the same action + scroll
  roleCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      // Skip if click originated from the inner button (already handled above)
      if (e.target.closest("[data-auth-role-select]")) return;

      const role = card.getAttribute("data-auth-role-card");
      if (!role) return;

      setActiveRole(role);

      if (shouldScrollToForm) {
        window.requestAnimationFrame(() => {
          formSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    });
    // Make cards feel clickable
    card.style.cursor = "pointer";
  });
}

function setupAuthEntryForms(content) {
  const forms = [...document.querySelectorAll("[data-auth-entry-form]")];

  if (forms.length === 0) {
    return;
  }

  forms.forEach((form) => {
    const success = form.parentElement?.querySelector("[data-auth-entry-success]") || form.closest(".panel")?.querySelector("[data-auth-entry-success]");
    const errorBox = form.querySelector("[data-auth-entry-error]");
    const errorText = form.querySelector("[data-auth-entry-error-text]");
    const password = form.querySelector('input[name="password"]');
    const confirmPassword = form.querySelector('input[name="confirmPassword"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const currentPage = getCurrentPage();
    let isSubmitting = false;

    if (!success) {
      return;
    }

    const successTitle = success.querySelector("h3");
    const successBody = success.querySelector("p");

    const setStatus = (status, message = "") => {
      const isSuccess = status === "success";
      const isError = status === "error";

      success.hidden = !isSuccess;
      success.style.display = isSuccess ? "" : "none";

      if (errorBox) {
        errorBox.hidden = !isError;
        errorBox.style.display = isError ? "" : "none";
      }

      if (isError && errorText && message) {
        errorText.textContent = message;
      } else if (!isError && errorText?.dataset.defaultMessage) {
        errorText.textContent = errorText.dataset.defaultMessage;
      }
    };

    const resetErrors = () => {
      setStatus(null);
      form.querySelectorAll(".form-field.is-invalid").forEach((field) => field.classList.remove("is-invalid"));
      form.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));
    };

    if (errorText && !errorText.dataset.defaultMessage) {
      errorText.dataset.defaultMessage = errorText.textContent;
    }

    setStatus(null);

    const syncPasswordValidity = () => {
      if (!password || !confirmPassword) {
        return;
      }

      const mismatchText = document.documentElement.lang === "tr" ? "Şifreler eşleşmiyor." : "Passwords do not match.";
      const isMatch = password.value === confirmPassword.value || confirmPassword.value === "";
      confirmPassword.setCustomValidity(isMatch ? "" : mismatchText);
    };

    password?.addEventListener("input", syncPasswordValidity);
    confirmPassword?.addEventListener("input", syncPasswordValidity);

    form.querySelectorAll("input, select, textarea").forEach((field) => {
      field.addEventListener("input", () => {
        field.classList.remove("is-invalid");
        field.closest(".form-field")?.classList.remove("is-invalid");
        if (errorBox && !errorBox.hidden) {
          setStatus(null);
        }
      });

      field.addEventListener("change", () => {
        field.classList.remove("is-invalid");
        field.closest(".form-field")?.classList.remove("is-invalid");
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }

      isSubmitting = true;
      setButtonLoading(submitButton, true);
      resetErrors();
      form.hidden = false;

      if (password && confirmPassword) {
        const isMatch = password.value === confirmPassword.value;
        confirmPassword.setCustomValidity(isMatch ? "" : document.documentElement.lang === "tr" ? "Şifreler eşleşmiyor." : "Passwords do not match.");
      }

      if (!form.checkValidity()) {
        const invalidFields = [...form.querySelectorAll("input, select, textarea")]
          .filter((field) => !field.disabled && !field.checkValidity())
          .map((field) => {
            field.classList.add("is-invalid");
            field.closest(".form-field")?.classList.add("is-invalid");
            return field.closest(".form-field")?.querySelector("span")?.textContent?.trim() || "";
          })
          .filter(Boolean);

        if (errorBox && errorText) {
          const fieldList = invalidFields.slice(0, 3).join(", ");
          const joiner = document.documentElement.lang === "tr" ? "Lütfen şu alanları kontrol edin: " : "Please review these fields: ";
          errorText.textContent = invalidFields.length > 0 ? `${joiner}${fieldList}` : errorText.textContent;
          setStatus("error", errorText.textContent);
        }

        form.reportValidity();
        isSubmitting = false;
        setButtonLoading(submitButton, false);
        return;
      }

      if (confirmPassword) {
        confirmPassword.setCustomValidity("");
      }

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const audience = form.classList.contains("auth-admin-form") ? "admin" : "public";

      const handleSuccess = (user) => {
        setAuthSession({ authenticated: true, user });
        setDocumentAuthState({ authenticated: true, user });

        if (successTitle && successBody) {
          if (currentPage === "create-account") {
            successTitle.textContent =
              content.authFeedback.success.accountCreated[user.role] || content.authFeedback.success.accountCreated.defaultTitle;
            successBody.textContent =
              content.authFeedback.success.accountCreated.detail[user.role] || content.authFeedback.success.accountCreated.defaultText;
          } else if (audience === "admin") {
            successTitle.textContent = content.authFeedback.success.adminLogin.title;
            successBody.textContent = `${content.authFeedback.success.adminLogin.text} ${user.username || user.email}`;
          } else {
            successTitle.textContent = content.authFeedback.success.login.title;
            successBody.textContent = `${content.authFeedback.success.login.text} ${user.email}`;
          }
        }

        form.hidden = true;
        setStatus("success");

        if (currentPage === "create-account") {
          const redirectTarget = user.role === "developer" ? "./open-marketplace.html?tab=developer" : "./open-marketplace.html?tab=client";
          window.setTimeout(() => {
            navigateTo(redirectTarget);
          }, 220);
        } else if (audience === "admin") {
          window.setTimeout(() => {
            navigateTo("./admin-dashboard.html");
          }, 180);
        } else if (currentPage === "login") {
          const redirectTarget = user.role === "client" ? "./client-dashboard.html" : "./index.html";
          window.setTimeout(() => {
            navigateTo(redirectTarget);
          }, 180);
        }
      };

      const handleError = (error) => {
        const errorCode = error?.code || "UNKNOWN_ERROR";
        const message = content.authFeedback.errors[errorCode] || error?.message || content.authFeedback.errors.UNKNOWN_ERROR;
        form.hidden = false;
        console.error("Yapply auth entry error", {
          page: currentPage,
          audience,
          requestedRole: payload.accountRole || "",
          code: error?.code || "",
          message: error?.message || "",
          error,
        });
        setStatus("error", message);
      };

      const submitPromise = loadAuthApi().then(async (authApi) => {
        if (!authApi) {
          throw Object.assign(new Error("Auth backend is unavailable."), {
            code: "AUTH_UNAVAILABLE",
          });
        }

        const user = await (currentPage === "create-account"
          ? authApi.signupAccount(payload)
          : authApi.loginAccount(
              {
                identifier: payload.email || payload.adminIdentifier || payload.adminEmail,
                password: payload.password || payload.adminPassword,
                role: payload.accountRole || undefined,
              },
              audience
            ));

        if (currentPage === "create-account") {
          const session = await authApi.fetchAuthSession();
          const role = session?.user?.role;

          if (!session?.authenticated || !session?.user || !role || role !== user?.role) {
            throw Object.assign(new Error("Account session could not be confirmed."), {
              code: "ACCOUNT_SESSION_INVALID",
            });
          }
        }

        if (audience === "admin") {
          const session = await authApi.fetchAuthSession();
          const role = session?.user?.role;

          if (!session?.authenticated || (role !== "admin" && role !== "moderator")) {
            throw Object.assign(new Error("Admin session could not be confirmed."), {
              code: "ADMIN_SESSION_INVALID",
            });
          }
        }

        return user;
      });

      submitPromise
        .catch((error) => {
          // Intercept pending email verification to show OTP modal.
          if (error?.code === "PENDING_EMAIL_VERIFICATION" && currentPage === "create-account") {
            isSubmitting = false;
            setButtonLoading(submitButton, false);
            form.hidden = true;
            import("./components/emailVerifyModal.js").then(({ showEmailVerifyModal }) => {
              showEmailVerifyModal({
                email: error.email,
                role: error.role,
                password: error.password,
                content,
                onVerified: (user) => {
                  handleSuccess(user);
                },
              });
            });
            return null;
          }
          handleError(error);
          return null;
        })
        .then((user) => {
          if (user) {
            handleSuccess(user);
          }
        })
        .finally(() => {
          isSubmitting = false;
          setButtonLoading(submitButton, false);
        });
    });
  });
}

function setupAdminDashboard(content) {
  const dashboard = document.querySelector("[data-admin-dashboard]");

  if (!dashboard || !getAuthSession().authenticated) {
    return;
  }

  const clientSeedItems = content.openMarketplacePage.tabs.client.items;
  const professionalSeedItems = content.openMarketplacePage.tabs.developer.items;
  const featuredSeedItems = content.projects.items;
  const accountsRoot = dashboard.querySelector("[data-admin-account-directory]");
  const accountStoreRoot = dashboard.querySelector("[data-admin-account-store-status]");
  const currentUserId = getAuthSession().user?.id || "";
  const confirmDeleteLabel =
    content.meta.locale === "tr"
      ? "Bu ogeyi silmek istediginize emin misiniz?"
      : "Are you sure you want to delete this item?";
  const accountCopy = content.adminDashboardPage.accounts;
  const accountStoreCopy = content.adminDashboardPage.accounts.storeStatus;
  let adminListingCollectionsPromise = null;

  const mergeAdminListingSeeds = (primaryItems = [], secondaryItems = []) => {
    const merged = [...primaryItems, ...secondaryItems];

    return merged.filter((item, index, items) => {
      const itemKey = item?.adminKey || item?.id || item?.slug || `${item?.title || item?.name || ""}-${item?.createdAt || ""}`;
      return items.findIndex((candidate) => {
        const candidateKey =
          candidate?.adminKey || candidate?.id || candidate?.slug || `${candidate?.title || candidate?.name || ""}-${candidate?.createdAt || ""}`;
        return candidateKey === itemKey;
      }) === index;
    });
  };

  const loadAdminListingCollections = async () => {
    if (!adminListingCollectionsPromise) {
      adminListingCollectionsPromise = (async () => {
        const [clientListingsResult, professionalListingsResult] = await Promise.allSettled([
          fetchPublicMarketplaceListings({
            type: "client",
            status: "all",
            limit: 60,
          }),
          fetchPublicMarketplaceListings({
            type: "professional",
            status: "all",
            limit: 60,
          }),
        ]);

        const remoteClientListings = clientListingsResult.status === "fulfilled" ? clientListingsResult.value : [];
        const remoteProfessionalListings = professionalListingsResult.status === "fulfilled" ? professionalListingsResult.value : [];
        const mergedClientSeedItems = mergeAdminListingSeeds(remoteClientListings, clientSeedItems);
        const mergedProfessionalSeedItems = mergeAdminListingSeeds(remoteProfessionalListings, professionalSeedItems);
        const collections = getManagedMarketplaceCollections(mergedClientSeedItems, mergedProfessionalSeedItems);

        return {
          client: collections.client,
          professional: collections.professional,
          mergedClientSeedItems,
          mergedProfessionalSeedItems,
        };
      })();
    }

    return adminListingCollectionsPromise;
  };

  const invalidateAdminListingCollections = () => {
    adminListingCollectionsPromise = null;
  };

  const resolveAdminListing = async (type, listingKey) => {
    const collections = await loadAdminListingCollections();
    const items = type === "professional" ? collections.professional : collections.client;
    return items.find((item) =>
      item?.adminKey === listingKey
      || item?.id === listingKey
      || item?.slug === listingKey
      || item?.profileSlug === listingKey
    ) || null;
  };

  const renderAccountStoreStatus = (status = null, state = "loading") => {
    if (!accountStoreRoot) {
      return;
    }

    if (state === "loading") {
      accountStoreRoot.innerHTML = `<p class="admin-empty">${accountStoreCopy.loading}</p>`;
      return;
    }

    if (state === "error" || !status) {
      accountStoreRoot.innerHTML = `<p class="admin-empty">${accountStoreCopy.error}</p>`;
      return;
    }

    accountStoreRoot.innerHTML = `
      <div class="admin-section-panel__header">
        <h3>${accountStoreCopy.title}</h3>
        <p>${accountStoreCopy.description}</p>
      </div>
      <div class="admin-record__facts">
        <div><span>${accountStoreCopy.mode}</span><strong>${escapeHtml(status.mode || "unknown")}</strong></div>
        <div><span>${accountStoreCopy.remoteConfigured}</span><strong>${status.remoteConfigured ? accountStoreCopy.yes : accountStoreCopy.no}</strong></div>
        <div><span>${accountStoreCopy.remoteReachable}</span><strong>${status.remoteReachable ? accountStoreCopy.yes : accountStoreCopy.no}</strong></div>
        <div><span>${accountStoreCopy.sourceOfTruth}</span><strong>${escapeHtml(status.sourceOfTruth || "unknown")}</strong></div>
      </div>
      ${status.reason ? `<p class="admin-account-store-status__reason"><strong>${accountStoreCopy.reason}:</strong> ${escapeHtml(status.reason)}</p>` : ""}
    `;
  };

  const renderAccountDirectory = (accounts = [], state = "ready", notice = null) => {
    if (!accountsRoot) {
      return;
    }

    if (state === "loading") {
      accountsRoot.innerHTML = `<p class="admin-empty">${accountCopy.loading}</p>`;
      return;
    }

    if (state === "error") {
      accountsRoot.innerHTML = `<p class="admin-empty">${accountCopy.error}</p>`;
      return;
    }

    if (accounts.length === 0) {
      accountsRoot.innerHTML = `
        ${notice ? `<div class="admin-account-notice admin-account-notice--${notice.tone || "info"}">${escapeHtml(notice.message)}</div>` : ""}
        <p class="admin-empty">${accountCopy.empty}</p>
      `;
      return;
    }

    const formatter = new Intl.DateTimeFormat(content.meta.locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const fallback = accountCopy.fallback;
    const statusMap =
      content.meta.locale === "tr"
        ? { active: "aktif", inactive: "pasif", admin: "yonetici", moderator: "moderatör", developer: "geliştirici", client: "musteri" }
        : { active: "active", inactive: "inactive", admin: "admin", moderator: "moderator", developer: "developer", client: "client" };

    accountsRoot.innerHTML = `
      ${notice ? `<div class="admin-account-notice admin-account-notice--${notice.tone || "info"}">${escapeHtml(notice.message)}</div>` : ""}
      <div class="admin-account-list">
        ${accounts
          .map((account) => {
            const region = account.preferredRegion || account.serviceArea || fallback;
            const company = account.companyName || fallback;
            const phone = account.phoneNumber || fallback;
            const createdAtDate = account.createdAt ? new Date(account.createdAt) : null;
            const createdAt =
              createdAtDate && !Number.isNaN(createdAtDate.getTime()) ? formatter.format(createdAtDate) : fallback;
            const specialties = account.specialties || fallback;
            const experience =
              account.yearsExperience !== null && account.yearsExperience !== undefined
                ? `${account.yearsExperience}`
                : fallback;
            const roleLabel = statusMap[account.role] || account.role || fallback;
            const statusLabel = statusMap[account.status] || account.status || fallback;
            const isSelf = account.id === currentUserId;
            const canDisable = account.status === "active";
            const canEnable = account.status !== "active";

            return `
              <details class="panel admin-account-card">
                <summary class="admin-account-card__summary">
                  <div class="admin-account-card__title">
                    <h3>${escapeHtml(account.fullName || fallback)}</h3>
                    <span class="admin-record__status">${escapeHtml(roleLabel)}</span>
                  </div>
                  <div class="admin-account-card__facts">
                    <div><span>${accountCopy.summary.email}</span><strong>${escapeHtml(account.email || fallback)}</strong></div>
                    <div><span>${accountCopy.summary.phone}</span><strong>${escapeHtml(phone)}</strong></div>
                    <div><span>${accountCopy.summary.region}</span><strong>${escapeHtml(region)}</strong></div>
                    <div><span>${accountCopy.summary.company}</span><strong>${escapeHtml(company)}</strong></div>
                    <div><span>${accountCopy.summary.created}</span><strong>${escapeHtml(createdAt)}</strong></div>
                    <div><span>${accountCopy.summary.status}</span><strong>${escapeHtml(statusLabel)}</strong></div>
                  </div>
                </summary>
                <div class="admin-account-card__details">
                  <div class="admin-record__facts admin-record__facts--account">
                    <div><span>${accountCopy.summary.role}</span><strong>${escapeHtml(roleLabel)}</strong></div>
                    <div><span>${accountCopy.summary.email}</span><strong>${escapeHtml(account.email || fallback)}</strong></div>
                    <div><span>${accountCopy.summary.phone}</span><strong>${escapeHtml(phone)}</strong></div>
                    <div><span>${accountCopy.summary.region}</span><strong>${escapeHtml(region)}</strong></div>
                    <div><span>${accountCopy.summary.company}</span><strong>${escapeHtml(company)}</strong></div>
                    <div><span>${accountCopy.summary.created}</span><strong>${escapeHtml(createdAt)}</strong></div>
                  </div>
                  <div class="admin-account-card__meta">
                    <p><strong>${content.meta.locale === "tr" ? "Uzmanliklar" : "Specialties"}:</strong> ${escapeHtml(specialties)}</p>
                    <p><strong>${content.meta.locale === "tr" ? "Deneyim" : "Years of experience"}:</strong> ${escapeHtml(experience)}</p>
                    <p><strong>${content.meta.locale === "tr" ? "Meslek / Tip" : "Profession / Type"}:</strong> ${escapeHtml(account.professionType || fallback)}</p>
                    <p><strong>${content.meta.locale === "tr" ? "Website / Portfolyo" : "Website / Portfolio"}:</strong> ${escapeHtml(account.website || fallback)}</p>
                    <p><strong>${content.meta.locale === "tr" ? "Sifre" : "Password"}:</strong> ${accountCopy.hiddenPassword}</p>
                  </div>
                  <div class="admin-record__actions">
                    <button
                      class="button button--secondary"
                      type="button"
                      data-admin-account-action="${canDisable ? "disable" : "enable"}"
                      data-admin-account-id="${account.id}"
                      ${isSelf && canDisable ? "disabled" : ""}
                    >
                      ${canDisable ? accountCopy.actions.disable : accountCopy.actions.enable}
                    </button>
                    <button
                      class="button button--secondary"
                      type="button"
                      data-admin-account-action="delete"
                      data-admin-account-id="${account.id}"
                      ${isSelf ? "disabled" : ""}
                    >
                      ${accountCopy.actions.delete}
                    </button>
                  </div>
                </div>
              </details>
            `;
          })
          .join("")}
      </div>
    `;
  };

  let lastAccountNotice = null;

  const refreshAccountDirectory = async () => {
    renderAccountDirectory([], "loading", lastAccountNotice);
    renderAccountStoreStatus(null, "loading");

    try {
      const authApi = await loadAuthApi();
      const accounts = await authApi?.fetchAdminAccounts?.();
      const storeStatus = await authApi?.fetchAdminAccountStoreStatus?.();

      if (accounts) {
        renderAccountDirectory(accounts, "ready", lastAccountNotice);
      } else {
        renderAccountDirectory([], "error", lastAccountNotice);
      }

      if (storeStatus) {
        renderAccountStoreStatus(storeStatus, "ready");
      } else {
        renderAccountStoreStatus(null, "error");
      }
    } catch (error) {
      renderAccountDirectory([], "error", lastAccountNotice);
      renderAccountStoreStatus(null, "error");
    }
  };

  accountsRoot?.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-admin-account-action]");

    if (!trigger) {
      return;
    }

    const userId = trigger.getAttribute("data-admin-account-id");
    const action = trigger.getAttribute("data-admin-account-action");

    if (!userId || !action) {
      return;
    }

    const confirmMessage =
      action === "delete" ? accountCopy.confirmDelete : action === "disable" ? accountCopy.confirmDisable : accountCopy.confirmEnable;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    trigger.setAttribute("disabled", "");

    try {
      const authApi = await loadAuthApi();

      if (!authApi) {
        throw Object.assign(new Error("Auth backend is unavailable."), { code: "AUTH_UNAVAILABLE" });
      }

      if (action === "delete") {
        await authApi.deleteAdminAccount(userId);
        lastAccountNotice = { tone: "success", message: accountCopy.successDeleted };
      } else {
        await authApi.updateAdminAccountStatus(userId, action);
        lastAccountNotice = { tone: "success", message: action === "disable" ? accountCopy.successDisabled : accountCopy.successEnabled };
      }
    } catch (error) {
      lastAccountNotice = {
        tone: "error",
        message: content.authFeedback.errors[error?.code] || error?.message || content.authFeedback.errors.UNKNOWN_ERROR,
      };
    }

    await refreshAccountDirectory();
  });

  refreshAccountDirectory();

  const toggleForm = (trigger, isOpen) => {
    const record = trigger.closest("[data-admin-record]");
    const form = record?.querySelector(".admin-inline-form");

    if (!form) {
      return;
    }

    form.hidden = typeof isOpen === "boolean" ? !isOpen : !form.hidden;
  };

  dashboard.querySelectorAll("[data-admin-edit-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleForm(button));
  });

  dashboard.querySelectorAll("[data-admin-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = button.closest(".admin-inline-form");
      if (form) {
        form.hidden = true;
      }
    });
  });

  dashboard.querySelectorAll("[data-admin-listing-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const type = String(formData.get("listingType") || "");
      const listingKey = String(formData.get("listingKey") || "");
      const existingListing = await resolveAdminListing(type, listingKey);

      if (!type || !listingKey || !existingListing) {
        return;
      }

      await updateManagedListing(type, listingKey, formData, existingListing);
      invalidateAdminListingCollections();
      await renderPage(content.meta.locale);
    });
  });

  dashboard.querySelectorAll("[data-admin-featured-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const projectKey = String(formData.get("projectKey") || "");
      const existingProject = getManagedFeaturedProjects(featuredSeedItems).find((item) => item.adminKey === projectKey);

      if (!projectKey || !existingProject) {
        return;
      }

      await updateManagedFeaturedProject(projectKey, formData, existingProject);
      await renderPage(content.meta.locale);
    });
  });

  const createFeaturedForm = dashboard.querySelector("[data-admin-featured-create-form]");
  createFeaturedForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(createFeaturedForm);
    await createManagedFeaturedProject(formData);
    await renderPage(content.meta.locale);
  });

  dashboard.querySelectorAll("[data-admin-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.getAttribute("data-admin-delete");
      const kind = button.getAttribute("data-admin-kind");

      if (!key || !kind || !window.confirm(confirmDeleteLabel)) {
        return;
      }

      if (kind === "listing") {
        const type = button.getAttribute("data-admin-listing-type") || "client";
        const listing = await resolveAdminListing(type, key);

        if (!listing) {
          return;
        }

        await deleteManagedListing(type, listing);
        invalidateAdminListingCollections();
      } else {
        const project = getManagedFeaturedProjects(featuredSeedItems).find((item) => item.adminKey === key);

        if (!project) {
          return;
        }

        deleteManagedFeaturedProject(project);
      }

      await renderPage(content.meta.locale);
    });
  });

  dashboard.querySelectorAll("[data-admin-move-up], [data-admin-move-down]").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.getAttribute("data-admin-move-up") || button.getAttribute("data-admin-move-down");
      const direction = button.hasAttribute("data-admin-move-up") ? "up" : "down";
      const kind = button.getAttribute("data-admin-kind");

      if (!key || !kind) {
        return;
      }

      if (kind === "listing") {
        const type = button.getAttribute("data-admin-listing-type") || "client";
        const collections = await loadAdminListingCollections();
        const listing = (type === "professional" ? collections.professional : collections.client).find((item) =>
          item?.adminKey === key
          || item?.id === key
          || item?.slug === key
          || item?.profileSlug === key
        ) || null;

        if (!listing) {
          return;
        }

        moveManagedListing(
          type,
          listing,
          direction,
          collections.mergedClientSeedItems,
          collections.mergedProfessionalSeedItems
        );
        invalidateAdminListingCollections();
      } else {
        const project = getManagedFeaturedProjects(featuredSeedItems).find((item) => item.adminKey === key);

        if (!project) {
          return;
        }

        moveManagedFeaturedProject(project, direction, featuredSeedItems);
      }

      await renderPage(content.meta.locale);
    });
  });
}

function setupMarketplaceTabs() {
  const tabs = [...document.querySelectorAll("[data-marketplace-tab]")];
  const panels = [...document.querySelectorAll("[data-marketplace-panel]")];
  const mascot = document.querySelector("[data-marketplace-toggle-mascot]");
  const requestedTab = new URL(window.location.href).searchParams.get("tab");

  if (tabs.length === 0 || panels.length === 0) {
    return;
  }

  const setActiveTab = (target) => {
    tabs.forEach((entry) => {
      const isActive = entry.getAttribute("data-marketplace-tab") === target;
      entry.classList.toggle("is-active", isActive);
      entry.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.getAttribute("data-marketplace-panel") === target;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (mascot) {
      mascot.dataset.mode = target === "developer" ? "developer" : "client";
      mascot.classList.remove("is-switching");
      void mascot.offsetWidth;
      mascot.classList.add("is-switching");
    }

    hydrateMarketplaceDeferredCards(target);
  };

  if (requestedTab && tabs.some((tab) => tab.getAttribute("data-marketplace-tab") === requestedTab)) {
    setActiveTab(requestedTab);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-marketplace-tab");

      if (!target) {
        return;
      }

      setActiveTab(target);
    });
  });
}

function setupMarketplaceDeferredCards() {
  if (getCurrentPage() !== "open-marketplace") {
    return;
  }

  hydrateMarketplaceDeferredCards("client");
}

function setupMarketplacePublicFilters(locale) {
  const form = document.querySelector("[data-marketplace-client-filters]");
  if (!form) {
    return;
  }

  const categoryField = form.querySelector('[name="category"]');
  const statusField = form.querySelector('[name="status"]');
  const grid = document.querySelector("[data-marketplace-client-grid]");
  const emptyState = document.querySelector("[data-marketplace-client-empty]");

  const applyFilters = () => {
    const cards = Array.from(document.querySelectorAll("[data-marketplace-client-card]"));
    const category = categoryField?.value || "";
    const status = statusField?.value || "open-for-bids";
    const nextUrl = new URL(window.location.href);
    let visibleCount = 0;

    cards.forEach((card) => {
      const cardCategory = card.getAttribute("data-marketplace-category") || "";
      const cardStatus = card.getAttribute("data-marketplace-status") || "";
      const matchesCategory = !category || cardCategory === category;
      const matchesStatus = status === "all" || !status || cardStatus === status;
      const visible = matchesCategory && matchesStatus;

      card.hidden = !visible;
      if (visible) {
        visibleCount += 1;
      }
    });

    nextUrl.searchParams.set("tab", "client");

    if (category) {
      nextUrl.searchParams.set("category", category);
    } else {
      nextUrl.searchParams.delete("category");
    }

    if (status && status !== "open-for-bids") {
      nextUrl.searchParams.set("status", status);
    } else {
      nextUrl.searchParams.delete("status");
    }

    if (grid) {
      grid.hidden = visibleCount === 0;
    }

    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }

    window.history.replaceState({}, "", nextUrl.toString());
  };

  applyFilters();
  categoryField?.addEventListener("change", applyFilters);
  statusField?.addEventListener("change", applyFilters);
  document.addEventListener("marketplace:cards-updated", (event) => {
    if (event?.detail?.kind && event.detail.kind !== "client") {
      return;
    }

    applyFilters();
  });
}

function setupProjectInquiryForm() {
  const form = document.querySelector("[data-project-inquiry-form]");
  const success = document.querySelector("[data-project-inquiry-success]");
  const successName = document.querySelector("[data-project-success-name]");
  const projectField = document.querySelector("[data-project-name-field]");

  if (!form || !success || !projectField) {
    return;
  }

  if (successName) {
    successName.textContent = projectField.value;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    form.hidden = true;
    success.hidden = false;
  });
}

function setupMarketplaceSubmissionForm() {
  const form = document.querySelector("[data-marketplace-submission-form]");
  const submissionType = getCurrentSubmissionType();
  const errorBox = document.querySelector("[data-marketplace-submission-error]");
  const errorTitle = document.querySelector("[data-marketplace-submission-error-title]");
  const errorText = document.querySelector("[data-marketplace-submission-error-text]");
  const successBox = document.querySelector("[data-marketplace-submission-success]");
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!form || !submissionType) {
    return;
  }

  const isTurkish = document.documentElement.lang === "tr";
  const copy = {
    title: isTurkish ? "Gönderim kaydedilemedi" : "Submission could not be saved",
    fallback: isTurkish
      ? "Gönderiminiz şu anda kaydedilemedi. Lütfen tekrar deneyin."
      : "Your submission could not be saved right now. Please try again.",
  };
  let isSubmitting = false;

  const uploadInput = submissionType === "client" ? form.querySelector('input[name="referenceUpload"]') : null;
  const uploadPreview = form.querySelector("[data-submission-upload-preview]");
  const uploadMessage = form.querySelector("[data-submission-upload-message]");
  const maxImageCount = 3;
  const maxUploadBytes = 2 * 1024 * 1024;
  const canMutateUploadFiles = typeof DataTransfer === "function";
  const uploadCopy = {
    imagesOnly: isTurkish
      ? "Yalnızca görsel dosyalar önizlenebilir."
      : "Only image files can be previewed here.",
    tooMany: isTurkish
      ? "En fazla 3 görsel yükleyebilirsiniz. İlk 3 görsel saklandı."
      : "You can upload up to 3 images. The first 3 were kept.",
    tooLarge(names) {
      if (isTurkish) {
        return `${names.join(", ")} görseli sıkıştırıldıktan sonra bile 2MB sınırını aştığı için kullanılamadı.`;
      }

      return `${names.join(", ")} could not be used because the image still exceeded the 2MB limit after compression.`;
    },
    remove: isTurkish ? "Görseli kaldır" : "Remove image",
  };
  let selectedUploadFiles = [];
  let previewObjectUrls = [];

  const clearPreviewObjectUrls = () => {
    previewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    previewObjectUrls = [];
  };

  const setUploadMessage = (message = "") => {
    if (!uploadMessage) {
      return;
    }

    const hasMessage = Boolean(message);
    uploadMessage.hidden = !hasMessage;
    uploadMessage.style.display = hasMessage ? "" : "none";
    uploadMessage.textContent = message;
  };

  const syncUploadInputFiles = () => {
    if (!uploadInput || !canMutateUploadFiles) {
      return;
    }

    const transfer = new DataTransfer();
    selectedUploadFiles.forEach((file) => transfer.items.add(file));
    uploadInput.files = transfer.files;
  };

  const renderUploadPreviews = () => {
    if (!uploadPreview) {
      return;
    }

    clearPreviewObjectUrls();

    if (selectedUploadFiles.length === 0) {
      uploadPreview.hidden = true;
      uploadPreview.style.display = "none";
      uploadPreview.innerHTML = "";
      return;
    }

    uploadPreview.hidden = false;
    uploadPreview.style.display = "";
    uploadPreview.innerHTML = selectedUploadFiles
      .map((file, index) => {
        const objectUrl = URL.createObjectURL(file);
        previewObjectUrls.push(objectUrl);

        return `
          <figure class="submission-upload__thumb">
            <img src="${objectUrl}" alt="${file.name}" />
            ${canMutateUploadFiles
              ? `
                <button
                  class="submission-upload__remove"
                  type="button"
                  data-submission-upload-remove="${index}"
                  aria-label="${uploadCopy.remove}: ${file.name}"
                >
                  ×
                </button>
              `
              : ""}
            <figcaption>${file.name}</figcaption>
          </figure>
        `;
      })
      .join("");
  };

  const prepareUploadFiles = async (incomingFiles, existingFiles = []) => {
    const imageFiles = incomingFiles.filter((file) => file instanceof File && file.type.startsWith("image/"));
    const acceptedFiles = [...existingFiles];
    const rejectedNames = [];
    const knownKeys = new Set(existingFiles.map((file) => `${file.name}:${file.lastModified}`));

    for (const file of imageFiles) {
      const fileKey = `${file.name}:${file.lastModified}`;
      if (knownKeys.has(fileKey)) {
        continue;
      }

      knownKeys.add(fileKey);
      const optimizedFile = await optimizeMarketplaceImageFile(file, { maxBytes: maxUploadBytes });

      if (!(optimizedFile instanceof File) || optimizedFile.size > maxUploadBytes) {
        rejectedNames.push(file.name || "image");
        continue;
      }

      acceptedFiles.push(optimizedFile);
    }

    return {
      files: acceptedFiles.slice(0, maxImageCount),
      rejectedNames,
      exceededCount: acceptedFiles.length > maxImageCount,
    };
  };

  const setSubmissionStatus = (status) => {
    const isError = status === "error";
    const isSuccess = status === "success";

    if (errorBox) {
      errorBox.hidden = !isError;
      errorBox.style.display = isError ? "" : "none";
    }

    if (successBox) {
      successBox.hidden = !isSuccess;
      successBox.style.display = isSuccess ? "" : "none";
    }
  };

  setSubmissionStatus(null);

  if (uploadInput && uploadPreview) {
    selectedUploadFiles = Array.from(uploadInput.files || [])
      .filter((file) => file instanceof File && file.type.startsWith("image/"))
      .slice(0, maxImageCount);
    syncUploadInputFiles();
    renderUploadPreviews();
    setUploadMessage("");

    uploadInput.addEventListener("change", async () => {
      const incomingFiles = Array.from(uploadInput.files || []);
      const containsNonImage = incomingFiles.some((file) => file instanceof File && !file.type.startsWith("image/"));
      const { files, rejectedNames, exceededCount } = await prepareUploadFiles(incomingFiles, selectedUploadFiles);

      selectedUploadFiles = files;
      syncUploadInputFiles();
      renderUploadPreviews();

      if (rejectedNames.length > 0) {
        setUploadMessage(uploadCopy.tooLarge(rejectedNames));
        return;
      }

      if (exceededCount) {
        setUploadMessage(uploadCopy.tooMany);
        return;
      }

      if (containsNonImage) {
        setUploadMessage(uploadCopy.imagesOnly);
        return;
      }

      setUploadMessage("");
    });

    uploadPreview.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-submission-upload-remove]");

      if (!removeButton) {
        return;
      }

      const removeIndex = Number(removeButton.getAttribute("data-submission-upload-remove"));
      if (Number.isNaN(removeIndex)) {
        return;
      }

      selectedUploadFiles = selectedUploadFiles.filter((_, index) => index !== removeIndex);
      syncUploadInputFiles();
      renderUploadPreviews();
      setUploadMessage("");
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmissionStatus(null);

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    isSubmitting = true;
    setButtonLoading(submitButton, true);

    try {
      const formData = new FormData(form);
      const listing = await saveMarketplaceSubmission(submissionType, formData);
      navigateTo(getSubmissionSuccessHref(submissionType, listing.id));
    } catch (error) {
      if (errorTitle) {
        errorTitle.textContent = copy.title;
      }

      if (errorText) {
        errorText.textContent = error?.message || copy.fallback;
      }

      setSubmissionStatus("error");
    } finally {
      isSubmitting = false;
      setButtonLoading(submitButton, false);
    }
  });

  window.addEventListener("beforeunload", clearPreviewObjectUrls, { once: true });
}

function setupSubmissionWizard() {
  const wizardRoot = document.querySelector("[data-wizard-root]");
  if (!wizardRoot) return;

  const submissionType = getCurrentSubmissionType();
  if (!submissionType) return;

  import("./components/marketplaceSubmissionPage.js").then(({ initSubmissionWizard }) => {
    if (!initSubmissionWizard) return;

    const container = wizardRoot.closest("main") || wizardRoot.parentElement;
    const isProfessional = submissionType === "professional";

    initSubmissionWizard(container, {
      saveMarketplaceSubmission,
      onSuccess(listing) {
        if (IS_NATIVE_APP) {
          document.body.dataset.page = isProfessional ? "developer-dashboard" : "client-dashboard";
          renderPage();
        } else {
          navigateTo(getSubmissionSuccessHref(isProfessional ? "professional" : "client", listing.id));
        }
      },
      onError(error) {
        console.error("[wizard] Submission error:", error);
      },
    });
  });
}

function setupMarketplaceListingInquiryForm() {
  const form = document.querySelector("[data-marketplace-listing-inquiry-form]");
  const success = document.querySelector("[data-marketplace-listing-inquiry-success]");
  const successName = document.querySelector("[data-marketplace-listing-success-name]");
  const listingName = document.querySelector("[data-marketplace-listing-name-field]");

  if (!form || !success || !listingName) {
    return;
  }

  if (successName) {
    successName.textContent = listingName.value;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    form.hidden = true;
    success.hidden = false;
  });
}

function setupListingImageGallery() {
  const container = document.querySelector("[data-gallery-container]");
  if (!container) return;

  const slides = [...container.querySelectorAll("[data-gallery-slide]")];
  if (slides.length <= 1) return;

  const parent = container.closest(".marketplace-detail-visual");
  const prevBtn = parent?.querySelector("[data-gallery-prev]");
  const nextBtn = parent?.querySelector("[data-gallery-next]");
  const dots = [...(parent?.querySelectorAll("[data-gallery-dot]") || [])];
  let current = 0;

  function goTo(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    slides[current].classList.remove("marketplace-detail-visual-slide--active");
    dots[current]?.classList.remove("gallery-dot--active");
    current = index;
    slides[current].classList.add("marketplace-detail-visual-slide--active");
    dots[current]?.classList.add("gallery-dot--active");
  }

  prevBtn?.addEventListener("click", () => goTo(current - 1));
  nextBtn?.addEventListener("click", () => goTo(current + 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));

  let touchStartX = 0;
  container.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  container.addEventListener("touchend", (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
  }, { passive: true });
}

function setupMarketplaceBidForm(content) {
  const form = document.querySelector("[data-marketplace-bid-form]");
  const success = document.querySelector("[data-marketplace-bid-success]");
  const errorBox = document.querySelector("[data-marketplace-bid-error]");
  const errorTitle = document.querySelector("[data-marketplace-bid-error-title]");
  const errorText = document.querySelector("[data-marketplace-bid-error-text]");

  if (!form) {
    return;
  }

  const isTurkish = document.documentElement.lang === "tr";
  const copy = {
    errorTitle: isTurkish ? "Teklif gönderilemedi" : "Bid could not be submitted",
    fallback: isTurkish
      ? "Teklifiniz şu anda kaydedilemedi. Lütfen tekrar deneyin."
      : "Your bid could not be saved right now. Please try again.",
  };

  const setBidStatus = (status) => {
    const isSuccess = status === "success";
    const isError = status === "error";

    if (success) {
      success.hidden = !isSuccess;
      success.style.display = isSuccess ? "" : "none";
    }

    if (errorBox) {
      errorBox.hidden = !isError;
      errorBox.style.display = isError ? "" : "none";
    }
  };

  setBidStatus(null);

  // ── Bid amount: numeric-only with Turkish dot formatting ──
  const amountInput = form.querySelector("[data-bid-amount-input]");
  if (amountInput) {
    const formatWithDots = (num) => {
      const str = String(num);
      const parts = [];
      for (let i = str.length; i > 0; i -= 3) {
        parts.unshift(str.slice(Math.max(0, i - 3), i));
      }
      return parts.join(".");
    };

    amountInput.addEventListener("input", () => {
      const cursorEnd = amountInput.selectionStart;
      const raw = amountInput.value.replace(/\D/g, "");
      if (!raw) {
        amountInput.value = "";
        return;
      }
      const formatted = formatWithDots(raw);
      amountInput.value = formatted;
      // Try to keep cursor in a sensible position
      const diff = formatted.length - raw.length;
      const rawBefore = amountInput.value.slice(0, cursorEnd).replace(/\D/g, "").length;
      let pos = 0;
      let count = 0;
      for (let i = 0; i < formatted.length && count < rawBefore; i++) {
        pos = i + 1;
        if (formatted[i] !== ".") count++;
      }
      amountInput.setSelectionRange(pos, pos);
    });

    // Prevent non-numeric key entry
    amountInput.addEventListener("keydown", (e) => {
      if (
        e.key === "Backspace" || e.key === "Delete" || e.key === "Tab" ||
        e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End" ||
        e.ctrlKey || e.metaKey
      ) return;
      if (!/^\d$/.test(e.key)) e.preventDefault();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"], [data-marketplace-bid-submit]') || form.querySelector("button");

    if (submitButton?.dataset.loading === "true") {
      return;
    }

    setBidStatus(null);

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setButtonLoading(submitButton, true);

    try {
      const formData = new FormData(form);
      const result = await submitMarketplaceBid(formData);
      form.setAttribute("hidden", "");
      setBidStatus("success");

      try {
        const listingOwner = result?.listing?.ownerUserId;
        const listingTitle = result?.listing?.title || result?.listing?.name || "";
        const listingId = result?.listing?.id || formData.get("listingId") || "";
        if (listingOwner) {
          const { addNotification } = await import("./core/notifications.js");
          addNotification(listingOwner, {
            type: "new-bid",
            message: `A developer placed a bid on "${listingTitle}"`,
            href: "./client-dashboard.html#client-dashboard-active",
            listingId,
          });
        }
      } catch (_) {}

      window.setTimeout(async () => {
        await renderPage(content.meta.locale);
        document.querySelector("#listing-bids")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 650);
    } catch (error) {
      setButtonLoading(submitButton, false);

      if (errorTitle) {
        errorTitle.textContent = copy.errorTitle;
      }

      if (errorText) {
        errorText.textContent = error?.message || copy.fallback;
      }

      setBidStatus("error");
    }
  });
}

function setupMarketplaceDeleteActions(locale) {
  document.querySelectorAll("[data-delete-listing]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-delete-listing");
      const type = button.getAttribute("data-delete-listing-type");
      const redirect = button.getAttribute("data-delete-redirect");

      if (!id || !type) {
        return;
      }

      const confirmLabel =
        locale === "tr"
          ? "Bu demo ilanını silmek istediğinize emin misiniz?"
          : "Are you sure you want to delete this demo listing?";

      if (!window.confirm(confirmLabel)) {
        return;
      }

      const deleted = deleteMarketplaceListing(type, id);

      if (!deleted) {
        return;
      }

      if (redirect) {
        navigateTo(redirect);
        return;
      }

      if (getCurrentPage() === "open-marketplace") {
        renderPage(locale);
        return;
      }

      navigateTo(`./open-marketplace.html?tab=${type === "professional" ? "developer" : "client"}`);
    });
  });
}

function setupDeveloperInquiryForm() {
  const form = document.querySelector("[data-developer-inquiry-form]");
  const success = document.querySelector("[data-developer-inquiry-success]");
  const successName = document.querySelector("[data-developer-success-name]");
  const developerField = document.querySelector("[data-developer-name-field]");

  if (!form || !success || !developerField) {
    return;
  }

  if (successName) {
    successName.textContent = developerField.value;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    form.hidden = true;
    success.hidden = false;
  });
}

function setupClientDashboard(content) {
  if (getCurrentPage() !== "client-dashboard") {
    return;
  }

  const session = getAuthSession();
  if (!session?.authenticated || session.user?.role !== "client") {
    return;
  }

  const togglePanel = async (listingId, panelType) => {
    if (!listingId || !panelType) {
      return;
    }

    if (panelType === "bids") {
      try {
        const publicListing = await fetchPublicMarketplaceListing(listingId);

        if (publicListing?.id === listingId) {
          syncClientDashboardListingBids(listingId, session.user.id, publicListing);
          await renderPage(content.meta.locale);
        }
      } catch (error) {
        console.error("Yapply dashboard bids sync failed", error);
      }
    }

    const card = document.querySelector(`[data-client-dashboard-panel][data-listing-id="${listingId}"]`)?.closest(".client-dashboard-card");
    if (!card) {
      return;
    }

    const targetPanel = card.querySelector(`[data-client-dashboard-panel="${panelType}"][data-listing-id="${listingId}"]`);
    if (!targetPanel) {
      return;
    }

    const shouldOpen = targetPanel.hasAttribute("hidden");

    card.querySelectorAll("[data-client-dashboard-panel]").forEach((panel) => {
      panel.setAttribute("hidden", "");
    });

    if (shouldOpen) {
      targetPanel.removeAttribute("hidden");
      targetPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  document.querySelectorAll("[data-client-dashboard-toggle]").forEach((button) => {
    button.addEventListener("click", async () => {
      setButtonLoading(button, true);
      try {
        await togglePanel(button.getAttribute("data-listing-id"), button.getAttribute("data-client-dashboard-toggle"));
      } finally {
        setButtonLoading(button, false);
      }
    });
  });

  document.querySelectorAll("[data-client-dashboard-accept-bid]").forEach((button) => {
    button.addEventListener("click", async () => {
      const listingId = button.getAttribute("data-listing-id") || "";
      const bidId = button.getAttribute("data-client-dashboard-accept-bid") || "";

      if (!listingId || !bidId) {
        return;
      }

      setButtonLoading(button, true);

      try {
        const updatedListing = await acceptClientDashboardBid(listingId, bidId, session.user.id);

        try {
          const acceptedBid = updatedListing?.marketplaceMeta?.acceptedBid;
          const developerId = acceptedBid?.developerProfileReference?.userId || acceptedBid?.bidder?.id || "";
          const listingTitle = updatedListing?.title || updatedListing?.name || "";
          if (developerId) {
            const { addNotification } = await import("./core/notifications.js");
            addNotification(developerId, {
              type: "bid-accepted",
              message: `Your bid on "${listingTitle}" was accepted!`,
              href: "./developer-dashboard.html#developer-dashboard-bids",
              listingId,
            });
          }
        } catch (_) {}

        await renderPage(content.meta.locale);
        document.querySelector("#client-dashboard-closed")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        setButtonLoading(button, false);
        window.alert(error?.message || "The bid could not be accepted.");
      }
    });
  });

  document.querySelectorAll("[data-client-dashboard-edit-form]").forEach((form) => {
    const errorBox = form.querySelector("[data-client-dashboard-error]");
    const errorTitle = form.querySelector("[data-client-dashboard-error-title]");
    const errorText = form.querySelector("[data-client-dashboard-error-text]");
    const successBox = form.querySelector("[data-client-dashboard-success]");

    const setStatus = (status, message = "") => {
      const isError = status === "error";
      const isSuccess = status === "success";

      if (errorBox) {
        errorBox.hidden = !isError;
        errorBox.style.display = isError ? "" : "none";
      }

      if (successBox) {
        successBox.hidden = !isSuccess;
        successBox.style.display = isSuccess ? "" : "none";
      }

      if (isError && errorText && message) {
        errorText.textContent = message;
      }
    };

    setStatus(null);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(null);

      const listingId = form.querySelector('[name="listingId"]')?.value || "";
      const action = event.submitter?.value || "save";

      try {
        if (action === "close") {
          await closeClientDashboardListing(listingId, session.user.id);
          await renderPage(content.meta.locale);
          document.querySelector("#client-dashboard-closed")?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        await updateClientDashboardListing(listingId, session.user.id, new FormData(form));
        setStatus("success");
        window.setTimeout(async () => {
          await renderPage(content.meta.locale);
          document.querySelector("#client-dashboard-active")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 250);
      } catch (error) {
        if (errorTitle) {
          errorTitle.textContent = document.documentElement.lang === "tr" ? "İlan güncellenemedi" : "Listing could not be updated";
        }
        setStatus("error", error?.message || (document.documentElement.lang === "tr"
          ? "Panel şu anda ilan değişikliklerini kaydedemedi. Lütfen tekrar deneyin."
          : "The dashboard could not save your listing changes right now. Please try again."));
      }
    });
  });
}

function setupDeveloperDashboard(content) {
  if (getCurrentPage() !== "developer-dashboard") {
    return;
  }

  const session = getAuthSession();
  if (!session?.authenticated || session.user?.role !== "developer") {
    return;
  }

  const togglePanel = async (listingId, panelType) => {
    if (!listingId || !panelType) {
      return;
    }

    const card = document.querySelector(`[data-developer-dashboard-panel][data-listing-id="${listingId}"]`)?.closest(".client-dashboard-card");
    if (!card) {
      return;
    }

    const targetPanel = card.querySelector(`[data-developer-dashboard-panel="${panelType}"][data-listing-id="${listingId}"]`);
    if (!targetPanel) {
      return;
    }

    const shouldOpen = targetPanel.hasAttribute("hidden");

    card.querySelectorAll("[data-developer-dashboard-panel]").forEach((panel) => {
      panel.setAttribute("hidden", "");
    });

    if (shouldOpen) {
      targetPanel.removeAttribute("hidden");
      targetPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  document.querySelectorAll("[data-developer-dashboard-toggle]").forEach((button) => {
    button.addEventListener("click", async () => {
      await togglePanel(button.getAttribute("data-listing-id"), button.getAttribute("data-developer-dashboard-toggle"));
    });
  });

  document.querySelectorAll("[data-developer-dashboard-edit-form]").forEach((form) => {
    const errorBox = form.querySelector("[data-developer-dashboard-error]");
    const errorTitle = form.querySelector("[data-developer-dashboard-error-title]");
    const errorText = form.querySelector("[data-developer-dashboard-error-text]");
    const successBox = form.querySelector("[data-developer-dashboard-success]");

    const setStatus = (status, message = "") => {
      const isError = status === "error";
      const isSuccess = status === "success";

      if (errorBox) {
        errorBox.hidden = !isError;
        errorBox.style.display = isError ? "" : "none";
      }

      if (successBox) {
        successBox.hidden = !isSuccess;
        successBox.style.display = isSuccess ? "" : "none";
      }

      if (isError && errorText && message) {
        errorText.textContent = message;
      }
    };

    setStatus(null);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(null);

      const listingId = form.querySelector('[name="listingId"]')?.value || "";

      try {
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        await updateDeveloperDashboardListing(listingId, session.user.id, new FormData(form));
        setStatus("success");
        window.setTimeout(async () => {
          await renderPage(content.meta.locale);
          document.querySelector("#developer-dashboard-listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 250);
      } catch (error) {
        if (errorTitle) {
          errorTitle.textContent = document.documentElement.lang === "tr"
            ? "İlan güncellenemedi"
            : "Listing could not be updated";
        }
        setStatus("error", error?.message || (document.documentElement.lang === "tr"
          ? "Geliştirici ilanı şu anda kaydedilemedi. Lütfen tekrar deneyin."
          : "The developer listing could not be saved right now. Please try again."));
      }
    });
  });
}

function setupHeroVideo() {
  const video = document.querySelector("[data-hero-video]");
  const toggle = document.querySelector("[data-hero-audio-toggle]");

  if (!video || !toggle) {
    return;
  }

  const syncToggleState = () => {
    const isMuted = video.muted;
    toggle.setAttribute("data-muted", String(isMuted));
    toggle.setAttribute("aria-pressed", String(!isMuted));
    toggle.setAttribute("aria-label", isMuted ? "Enable sound" : "Mute sound");
  };

  video.defaultMuted = false;
  video.muted = false;
  video.loop = true;
  video.playsInline = true;
  syncToggleState();

  video.play().catch(() => {
    video.defaultMuted = true;
    video.muted = true;
    syncToggleState();
    video.play().catch(() => {});
  });

  toggle.addEventListener("click", async () => {
    const nextMuted = !video.muted;
    video.muted = nextMuted;

    if (!nextMuted) {
      try {
        await video.play();
      } catch (error) {
        video.muted = true;
      }
    }

    syncToggleState();
  });

  video.addEventListener("volumechange", syncToggleState);
}

function mergeLocalDeveloperBidEntries(primary = [], secondary = []) {
  const merged = [...primary, ...secondary];

  return merged.filter((item, index, items) => {
    const itemKey = item?.id || `${item?.listingId || ""}-${item?.createdAt || ""}-${item?.proposalMessage || item?.proposal || ""}`;
    return items.findIndex((candidate) => {
      const candidateKey = candidate?.id || `${candidate?.listingId || ""}-${candidate?.createdAt || ""}-${candidate?.proposalMessage || candidate?.proposal || ""}`;
      return candidateKey === itemKey;
    }) === index;
  });
}

/* ─── Bird Loader (Minecraft-style) ─── */
function injectBirdLoader() {
  if (document.querySelector(".yapply-loader")) return;
  const loader = document.createElement("div");
  loader.className = "yapply-loader";
  loader.innerHTML = `
    <div class="yapply-loader__scene">
      <div class="yapply-loader__bird-wrap">
        <svg class="yapply-loader__bird" viewBox="0 0 120 120" fill="none">
          <path d="M31 65 20 60 29 73 38 69Z" fill="var(--text-muted)" opacity="0.5"/>
          <ellipse cx="52" cy="64" rx="23" ry="18" fill="var(--text-muted)" opacity="0.35"/>
          <circle cx="74" cy="50" r="13" fill="var(--text-muted)" opacity="0.4"/>
          <circle cx="78" cy="47" r="2.2" fill="currentColor"/>
          <path d="M85 50 95 46 88 55Z" fill="var(--accent)"/>
          <path d="M49 81V89" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M58 81V89" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <svg class="yapply-loader__pickaxe" viewBox="0 0 64 64" fill="none" style="position:absolute;right:-10px;top:14px;">
          <line x1="18" y1="46" x2="46" y2="18" stroke="var(--text-muted)" stroke-width="4" stroke-linecap="round"/>
          <path d="M40 12 52 14 50 26 44 22 42 16Z" fill="var(--accent)" opacity="0.9"/>
        </svg>
      </div>
      <div class="yapply-loader__blocks">
        <div class="yapply-loader__block"></div>
        <div class="yapply-loader__block"></div>
        <div class="yapply-loader__block"></div>
      </div>
      <div class="yapply-loader__text">Yapılıyor…</div>
    </div>
  `;
  document.body.appendChild(loader);
}

function showBirdLoader() {
  injectBirdLoader();
  const el = document.querySelector(".yapply-loader");
  if (el) {
    el.classList.add("yapply-loader--visible");
  }
}

function hideBirdLoader() {
  const el = document.querySelector(".yapply-loader");
  if (el) {
    el.classList.remove("yapply-loader--visible");
  }
}

/* ─── Card tap animation (JS-based for iOS) ─── */
function setupCardTapAnimations() {
  if (!IS_NATIVE_APP) return;

  // Marketplace cards on Keşfet page — navigate instantly, no artificial delay
  document.querySelectorAll(".marketplace-card").forEach((card) => {
    card.addEventListener("click", function handleCardTap(e) {
      const link = card.querySelector("a[href]");
      const href = link?.getAttribute("href");
      if (!href || href === "#") return;

      e.preventDefault();
      e.stopPropagation();

      // Brief visual feedback then navigate immediately
      card.classList.add("marketplace-card--tapped");
      // Navigate on next frame — soft nav (no page reload flash)
      requestAnimationFrame(() => {
        navigateTo(href);
      });
    });
  });

  // Dashboard listing cards — navigate instantly
  document.querySelectorAll(".client-dashboard-card__summary").forEach((summary) => {
    summary.addEventListener("click", function handleDashTap(e) {
      const link = summary.querySelector("a[href]") || summary.closest(".client-dashboard-card")?.querySelector("a[href]");
      const href = link?.getAttribute("href");
      if (!href || href === "#") return;

      e.preventDefault();
      e.stopPropagation();

      summary.classList.add("client-dashboard-card__summary--tapped");
      requestAnimationFrame(() => {
        navigateTo(href);
      });
    });
  });
}

function bindInteractions(content) {
  cleanupRevealAnimations();
  cleanupParallax();
  cleanupHeroScene();
  cleanupCounters();
  cleanupBirdScroll();

  const page = getCurrentPage();

  /* ── Global: theme toggle + locale (always needed) ── */
  const toggleButtons = document.querySelectorAll("#theme-toggle, #theme-toggle-mobile");
  toggleButtons.forEach((toggleButton) => {
    toggleButton.addEventListener("click", () => {
      toggleTheme();
      updateThemeToggleLabel(content);
    });
  });

  // Only show theme FAB on website, not native app (theme toggle moved to account settings)
  if (!IS_NATIVE_APP) {
    mountThemeFab(content);
  }

  const localeButtons = document.querySelectorAll("[data-locale-switch]");
  localeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLocale = button.getAttribute("data-locale-switch");
      if (!nextLocale) return;
      setLocale(nextLocale);
      renderPage(nextLocale);
    });
  });

  const yearNode = document.querySelector("[data-current-year]");
  if (yearNode) yearNode.textContent = new Date().getFullYear();

  /* ── Global: reveal + parallax animations ── */
  markMotionTargets();
  cleanupRevealAnimations = setupRevealAnimations();
  cleanupParallax = setupParallax();

  /* ── Global: nav ── */
  setupNavMenu();
  setupAuthNavigation();

  /* ── Page-specific setup ── */
  if (page === "home") {
    cleanupCounters = setupStatsCounters(content.meta.locale);
    cleanupBirdScroll();
    import("./components/birdScroll.js").then((m) => { cleanupBirdScroll = m.setupBirdScroll(); }).catch(() => {});
    setupFaqAccordions();
    setupHeroVideo();
    import("./components/features.js").then((m) => { if (m.initDeck) m.initDeck(); }).catch(() => {});
    const heroCta = document.querySelector(".hero-cta");
    if (heroCta) {
      heroCta.addEventListener("click", () => { heroCta.classList.add("hero-cta--loading"); });
    }
    const generation = ++heroSceneGeneration;
    loadHeroSceneApi().then((heroSceneApi) => heroSceneApi?.initHeroScene?.()).then((cleanup) => {
      if (generation !== heroSceneGeneration) {
        if (typeof cleanup === "function") cleanup();
        return;
      }
      cleanupHeroScene = typeof cleanup === "function" ? cleanup : () => {};
    });
  } else if (page === "open-marketplace") {
    setupMarketplaceTabs();
    setupMarketplaceDeferredCards();
    setupMarketplacePublicFilters(content.meta.locale);
    setupCardTapAnimations();
  } else if (page === "marketplace-listing-detail") {
    setupBidAccordions();
    setupMarketplaceBidForm(content);
    setupListingImageGallery();
    setupMarketplaceListingInquiryForm();
    setupMarketplaceDeleteActions(content.meta.locale);
    setupDeveloperInquiryForm();
  } else if (page === "client-dashboard") {
    setupClientDashboard(content);
    setupCardTapAnimations();
  } else if (page === "developer-dashboard") {
    setupDeveloperDashboard(content);
    setupBidAccordions();
    setupCardTapAnimations();
  } else if (page === "account-settings") {
    setupAccountSettings(content);
  } else if (page === "admin-dashboard") {
    setupAdminSectionNavigation();
    setupAdminDashboard(content);
  } else if (page === "marketplace-submission") {
    setupApplicationForm();
    setupProjectInquiryForm();
    setupMarketplaceSubmissionForm();
    setupSubmissionWizard();
  } else if (page === "login" || page === "signup" || page === "create-account") {
    setupAuthRoleSelection();
    setupAuthEntryForms(content);
  }
}

async function syncAuthState() {
  const authApi = await loadAuthApi();

  if (!authApi?.fetchAuthSession) {
    const fallbackSession = { authenticated: false, user: null };
    setDocumentAuthState(fallbackSession);
    return fallbackSession;
  }

  try {
    const session = await authApi.fetchAuthSession();
    setAuthSession(session);
    setDocumentAuthState(session);
    return session;
  } catch (error) {
    const fallbackSession = { authenticated: false, user: null };
    setDocumentAuthState(fallbackSession);
    return fallbackSession;
  }
}

function setupAccountSettings(content) {
  if (getCurrentPage() !== "account-settings") {
    return;
  }

  const session = getAuthSession();
  if (!session?.authenticated || !session.user?.id) {
    return;
  }

  const form = document.querySelector("[data-account-settings-form]");
  const preview = document.querySelector("[data-account-settings-preview]");
  const avatarOptions = Array.from(document.querySelectorAll("[data-account-settings-avatar-option]"));
  const successBox = document.querySelector("[data-account-settings-success]");
  const errorBox = document.querySelector("[data-account-settings-error]");
  const errorText = document.querySelector("[data-account-settings-error-text]");
  const passwordInput = document.querySelector("[data-account-settings-password]");
  const passwordToggle = document.querySelector("[data-account-settings-password-toggle]");
  const passwordSlash = document.querySelector("[data-account-settings-password-slash]");
  const passwordEnable = document.querySelector("[data-account-settings-password-enable]");
  const passwordSuccess = document.querySelector("[data-account-settings-password-success]");
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!form || !preview) {
    return;
  }

  const defaultOptions = getDefaultAvatarOptions(session.user.role);
  let isSubmitting = false;

  const getSelectedAvatar = () => {
    const selected = avatarOptions.find((option) => option.checked);
    const fallback = defaultOptions[0];

    return {
      id: selected?.value || fallback?.id || "",
      src: selected?.dataset.avatarSrc || fallback?.src || "",
    };
  };

  const setStatus = (status, message = "") => {
    const isSuccess = status === "success";
    const isError = status === "error";

    if (successBox) {
      successBox.hidden = !isSuccess;
      successBox.style.display = isSuccess ? "" : "none";
    }

    if (errorBox) {
      errorBox.hidden = !isError;
      errorBox.style.display = isError ? "" : "none";
    }

    if (isError && errorText && message) {
      errorText.textContent = message;
    }
  };

  const setPasswordSuccess = (visible) => {
    if (!passwordSuccess) {
      return;
    }

    passwordSuccess.hidden = !visible;
    passwordSuccess.style.display = visible ? "" : "none";
  };

  const syncPreview = () => {
    const hasSelectedAvatar = avatarOptions.some((option) => option.checked);
    const nextSrc = hasSelectedAvatar ? getSelectedAvatar().src : session.user.profilePictureSrc || defaultOptions[0]?.src || "";
    if (preview && nextSrc) {
      preview.src = nextSrc;
    }
  };

  setStatus(null);
  setPasswordSuccess(false);
  syncPreview();

  let isPasswordVisible = false;

  const syncPasswordField = () => {
    if (!passwordInput) {
      return;
    }

    const isEditing = !passwordInput.disabled;
    passwordInput.type = isPasswordVisible ? "text" : "password";
    passwordInput.placeholder = isEditing ? content.passwordPlaceholder : "********";

    if (passwordToggle) {
      const showLabel = passwordToggle.dataset.showLabel || "Show password";
      const hideLabel = passwordToggle.dataset.hideLabel || "Hide password";
      passwordToggle.disabled = !isEditing;
      passwordToggle.setAttribute("aria-pressed", isPasswordVisible ? "true" : "false");
      passwordToggle.setAttribute("aria-label", isPasswordVisible ? hideLabel : showLabel);
    }

    if (passwordSlash) {
      passwordSlash.hidden = !isPasswordVisible;
    }
  };

  syncPasswordField();

  if (passwordEnable && passwordInput) {
    passwordEnable.addEventListener("click", (event) => {
      event.preventDefault();
      passwordInput.disabled = false;
      passwordInput.value = "";
      setPasswordSuccess(false);
      passwordInput.focus();
      syncPasswordField();
    });
  }

  if (passwordInput && passwordToggle) {
    passwordToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (passwordInput.disabled) {
        return;
      }

      isPasswordVisible = !isPasswordVisible;
      syncPasswordField();
    });

    passwordInput.addEventListener("input", () => {
      setPasswordSuccess(false);
    });
  }

  avatarOptions.forEach((option) => {
    option.addEventListener("change", () => {
      syncPreview();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    isSubmitting = true;
    setButtonLoading(submitButton, true);
    setStatus(null);

    if (!form.checkValidity()) {
      form.reportValidity();
      isSubmitting = false;
      setButtonLoading(submitButton, false);
      return;
    }

    try {
      const authApi = await loadAuthApi();
      if (!authApi?.saveOwnAccountSettings) {
        throw new Error(document.documentElement.lang === "tr"
          ? "Hesap ayarlari su anda kaydedilemiyor. Lutfen tekrar deneyin."
          : "Account settings cannot be saved right now. Please try again.");
      }
      const formData = new FormData(form);
      const selectedAvatar = getSelectedAvatar();
      const profilePictureId = selectedAvatar.id || session.user.profilePictureId || defaultOptions[0]?.id || "";

      const updatedSession = await authApi.saveOwnAccountSettings({
        username: String(formData.get("username") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        password: passwordInput && !passwordInput.disabled ? String(formData.get("password") || "") : "",
        workDescription: String(formData.get("workDescription") || "").trim(),
        profilePictureType: "default",
        profilePictureId,
      });

      if (updatedSession?.passwordUpdated) {
        setAuthSession(updatedSession);
        setDocumentAuthState(updatedSession);
        setStatus(null);
        setPasswordSuccess(true);
        if (passwordInput) {
          passwordInput.value = "";
          passwordInput.disabled = true;
        }
        isPasswordVisible = false;
        syncPasswordField();
        return;
      }

      setAuthSession(updatedSession);
      setDocumentAuthState(updatedSession);
      setStatus("success");
      window.setTimeout(() => {
        renderPage(content.meta.locale);
      }, 220);
    } catch (error) {
      console.error("Yapply account settings error", {
        code: error?.code || "",
        message: error?.message || "",
        error,
      });
      setStatus("error", error?.message || (document.documentElement.lang === "tr"
        ? "Hesap ayarlari kaydedilemedi. Lutfen tekrar deneyin."
        : "Account settings could not be saved. Please try again."));
    } finally {
      isSubmitting = false;
      setButtonLoading(submitButton, false);
    }
  });

  // Theme toggle in account settings
  const themeBtns = document.querySelectorAll("[data-account-theme]");
  if (themeBtns.length > 0) {
    const markActive = () => {
      const current = getTheme();
      themeBtns.forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-account-theme") === current);
      });
    };
    markActive();
    themeBtns.forEach((b) => {
      b.addEventListener("click", () => {
        const chosen = b.getAttribute("data-account-theme");
        if (chosen !== getTheme()) {
          toggleTheme();
          updateThemeToggleLabel(content);
          markActive();
        }
      });
    });
  }

  // Logout button handler
  const logoutBtn = document.querySelector("[data-account-settings-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        const { getSupabaseClient } = await import("./core/supabaseClient.js?v=20260312-supabase-runtime-fix");
        const supabase = await getSupabaseClient();
        await supabase.auth.signOut();
      } catch (_) {}
      // Clear local auth state
      try { localStorage.removeItem("yapply-auth-session"); } catch(_) {}
      try { sessionStorage.clear(); } catch(_) {}
      // Redirect to marketplace
      navigateTo("./open-marketplace.html");
    });
  }
}

/* ─── Stale-While-Revalidate Cache ─── */
const SWR_CACHE_KEY = "yapply-swr-marketplace";
const SWR_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const _swrMemory = new Map(); // In-memory layer — avoids repeated JSON.parse

// On cold boot (app fully quit & reopened), clear stale SWR cache.
// This prevents ghost listings that were deleted from the backend.
if (IS_NATIVE_APP && document.getElementById("app-splash")) {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SWR_CACHE_KEY + ":")) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          // Clear anything older than 1 minute on cold boot
          if (!entry || (Date.now() - (entry.ts || 0)) > 60000) {
            keysToRemove.push(key);
          }
        } catch (_) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}

function swrRead(cacheId) {
  // Check in-memory cache first (zero-cost)
  const mem = _swrMemory.get(cacheId);
  if (mem) return mem;

  try {
    const raw = localStorage.getItem(SWR_CACHE_KEY + ":" + cacheId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    _swrMemory.set(cacheId, parsed); // Warm in-memory layer
    return parsed;
  } catch (_) { return null; }
}

function swrWrite(cacheId, data) {
  const entry = { ts: Date.now(), data };
  _swrMemory.set(cacheId, entry); // Always update in-memory first
  try {
    localStorage.setItem(SWR_CACHE_KEY + ":" + cacheId, JSON.stringify(entry));
  } catch (_) {}
}

function swrIsStale(cached) {
  return !cached || (Date.now() - (cached.ts || 0)) > SWR_MAX_AGE_MS;
}

/* ─── Persist listing feed data into detail SWR cache ─── */
function seedDetailSwrCache(listings) {
  if (!Array.isArray(listings)) return;
  listings.forEach((l) => {
    if (!l?.id) return;
    seedListingDetailCache(l); // In-memory cache (same session)
    swrWrite(`detail-${l.id}`, l); // localStorage cache (survives page navigation)
  });
}

/* ─── Background avatar DOM patching ─── */
function patchAvatarsInDOM(listings) {
  if (!Array.isArray(listings)) return;
  listings.forEach((listing) => {
    if (!listing?.id || !listing?.creatorAvatarSrc) return;
    // Find all avatar images for this listing and update src
    document.querySelectorAll(`[data-listing-id="${listing.id}"] .marketplace-card__avatar img, [data-listing-id="${listing.id}"] .marketplace-detail-avatar img`).forEach((img) => {
      if (img.src !== listing.creatorAvatarSrc) {
        img.src = listing.creatorAvatarSrc;
      }
    });
    // Also patch by href-based cards (marketplace cards link to listing detail)
    document.querySelectorAll(`.marketplace-card a[href*="id=${listing.id}"]`).forEach((link) => {
      const card = link.closest(".marketplace-card");
      if (!card) return;
      const img = card.querySelector(".marketplace-card__avatar img");
      if (img && img.src !== listing.creatorAvatarSrc) {
        img.src = listing.creatorAvatarSrc;
      }
    });
  });
}

/* ─── Background developer listing prefetch ─── */
async function loadMarketplaceRuntimeData(page, listingType, listingId) {
  if (page === "open-marketplace") {
    // Don't invalidate on every load — the 3-min TTL cache handles freshness.
    // Only invalidate on explicit user actions (pull-to-refresh, new listing created).

    const filters = getCurrentMarketplaceFilters();
    const cacheId = `client-${filters.status || "open-for-bids"}-${filters.category || "all"}`;
    const proCacheId = `professional-open-for-bids-all`;

    // Try to return cached data instantly
    const cached = swrRead(cacheId);
    const proCached = swrRead(proCacheId);
    const hasFreshCache = cached && !swrIsStale(cached);

    // Start the network fetch (will run regardless for revalidation)
    const fetchPromise = (async () => {
      try {
        let professionalFetchFailed = false;
        const [publicClientListings, publicProfessionalListings] = await Promise.all([
          fetchPublicMarketplaceListings({
            type: "client",
            status: filters.status || "open-for-bids",
            category: filters.category || "",
            limit: 24,
          }),
          fetchPublicMarketplaceListings({
            type: "professional",
            status: "open-for-bids",
            limit: 24,
          }).catch((err) => {
            professionalFetchFailed = true;
            console.error("Yapply professional listings fetch failed", err?.message || err);
            return proCached?.data || [];
          }),
        ]);

        swrWrite(cacheId, publicClientListings);
        if (!professionalFetchFailed) {
          swrWrite(proCacheId, publicProfessionalListings);
        }

        // Pre-seed detail cache from feed data so detail pages open instantly
        seedDetailSwrCache([...publicClientListings, ...publicProfessionalListings]);

        // Background avatar enrichment — don't block render
        enrichMarketplaceListingsWithCreatorAvatars(publicClientListings)
          .then((decorated) => {
            swrWrite(cacheId, decorated);
            patchAvatarsInDOM(decorated);
          })
          .catch((error) => {
            console.error("Yapply marketplace creator avatar enrichment failed", {
              code: error?.code || "",
              message: error?.message || "",
              error,
            });
          });

        return {
          publicClientListings,
          // When professional fetch failed, use the results from the .catch
          // (which may contain cached data) instead of returning empty.
          publicProfessionalListings,
          publicListingFilters: filters,
          publicListingError: false,
          // Only flag as error if fetch failed AND no cached data was available
          publicProfessionalListingError: professionalFetchFailed && publicProfessionalListings.length === 0,
        };
      } catch (error) {
        return {
          publicClientListings: cached?.data || [],
          publicProfessionalListings: proCached?.data || [],
          publicListingFilters: filters,
          publicListingError: !cached,
          publicProfessionalListingError: !proCached,
        };
      }
    })();

    // If we have fresh cache, return it immediately (network refreshes in background)
    if (hasFreshCache) {
      // Fire background revalidation — if data changed, re-render
      fetchPromise.then((freshData) => {
        const oldClientIds = JSON.stringify(cached.data?.map(l => l.id));
        const newClientIds = JSON.stringify(freshData.publicClientListings?.map(l => l.id));
        const oldProIds = JSON.stringify(proCached?.data?.map(l => l.id));
        const newProIds = JSON.stringify(freshData.publicProfessionalListings?.map(l => l.id));
        if (oldClientIds !== newClientIds || oldProIds !== newProIds) {
          console.log("[swr] Marketplace data changed — re-rendering");
          renderPage();
        }
      }).catch(() => {});

      // Pre-seed detail cache from SWR cached feed data
      seedDetailSwrCache([...(cached.data || []), ...(proCached?.data || [])]);

      return {
        publicClientListings: cached.data || [],
        publicProfessionalListings: proCached?.data || [],
        publicListingFilters: filters,
        publicListingError: false,
        publicProfessionalListingError: false,
      };
    }

    // No cache or stale — wait for network
    return await fetchPromise;
  }

  if (page === "marketplace-listing-detail" && (listingType === "client" || listingType === "professional") && listingId) {
    const detailCacheId = `detail-${listingId}`;
    const cached = swrRead(detailCacheId);
    const hasFreshCache = cached && !swrIsStale(cached) && cached.data;

    const fetchPromise = (async () => {
      try {
        const publicListing = await fetchPublicMarketplaceListing(listingId);
        swrWrite(detailCacheId, publicListing);

        // Background avatar enrichment — don't block detail page render
        enrichMarketplaceListingWithCreatorAvatar(publicListing)
          .then((decorated) => {
            if (decorated?.creatorAvatarSrc) {
              patchAvatarsInDOM([decorated]);
            }
          })
          .catch(() => {});

        return { publicListing };
      } catch (error) {
        return { publicListing: cached?.data || null };
      }
    })();

    if (hasFreshCache) {
      // Return cached detail instantly, revalidate in background
      fetchPromise.then((fresh) => {
        if (fresh.publicListing && JSON.stringify(fresh.publicListing?.id) !== JSON.stringify(cached.data?.id)) {
          renderPage();
        }
      }).catch(() => {});
      return { publicListing: cached.data };
    }

    return await fetchPromise;
  }

  if (page === "developer-dashboard") {
    const session = getAuthSession();
    const ownerUserId = session?.authenticated ? session.user?.id || "" : "";
    const devCacheId = "dev-dashboard";
    const cached = swrRead(devCacheId);
    const hasFreshCache = cached && !swrIsStale(cached) && cached.data;

    // Start network fetch for revalidation regardless
    const fetchPromise = (async () => {
      try {
        const dashboardData = await fetchDeveloperDashboardData();
        const result = {
          developerOwnedListings: dashboardData.listings || [],
          developerBidEntries: dashboardData.bids || [],
          developerLocalBidEntries: mergeLocalDeveloperBidEntries(
            dashboardData.localBids || [],
            getDeveloperDashboardLocalBidEntries(ownerUserId)
          ),
        };
        swrWrite(devCacheId, result);
        return result;
      } catch (error) {
        return {
          developerOwnedListings: [],
          developerBidEntries: [],
          developerLocalBidEntries: getDeveloperDashboardLocalBidEntries(ownerUserId),
        };
      }
    })();

    if (hasFreshCache) {
      // Return cached data instantly, revalidate in background
      fetchPromise.catch(() => {});
      return cached.data;
    }

    // No cache or stale — wait for network
    return await fetchPromise;
  }

  if (page === "admin-dashboard") {
    const [clientListingsResult, professionalListingsResult] = await Promise.allSettled([
      fetchPublicMarketplaceListings({
        type: "client",
        status: "all",
        limit: 60,
      }),
      fetchPublicMarketplaceListings({
        type: "professional",
        status: "all",
        limit: 60,
      }),
    ]);

    return {
      adminClientListings: clientListingsResult.status === "fulfilled" ? clientListingsResult.value : [],
      adminProfessionalListings: professionalListingsResult.status === "fulfilled" ? professionalListingsResult.value : [],
    };
  }

  return {};
}

/* ─── Pull-to-Refresh for native app ─── */
let pullToRefreshCleanup = null;

function setupPullToRefresh() {
  if (pullToRefreshCleanup) { pullToRefreshCleanup(); pullToRefreshCleanup = null; }
  if (!IS_NATIVE_APP) return;

  const PULL_THRESHOLD = 90;
  let startY = 0;
  let pulling = false;
  let indicator = null;
  let _ptrStyleInjected = false;

  function injectPtrStyles() {
    if (_ptrStyleInjected) return;
    _ptrStyleInjected = true;
    const s = document.createElement("style");
    s.textContent = `
      .ptr-bird-indicator {
        overflow: hidden; height: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        transition: height 220ms cubic-bezier(.25,.46,.45,.94), opacity 180ms ease;
        opacity: 0; will-change: height, opacity;
      }
      .ptr-bird-indicator--visible { opacity: 1; }
      .ptr-bird-indicator--refreshing .ptr-bird-scene { animation: ptr-bird-bob 700ms ease-in-out infinite; }

      .ptr-bird-scene { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0 6px; }

      /* Bird SVG */
      .ptr-bird-svg { width: 44px; height: 44px; }
      .ptr-bird-body-fill { fill: var(--accent, #c9a84c); opacity: 0; transition: opacity 300ms ease; }
      .ptr-bird-wing { fill: var(--accent, #c9a84c); opacity: 0; transition: opacity 300ms ease 50ms; }
      .ptr-bird-tail { fill: var(--accent, #c9a84c); opacity: 0; transition: opacity 200ms ease; }
      .ptr-bird-eye { fill: var(--bg, #060709); opacity: 0; transition: opacity 200ms ease 200ms; }
      .ptr-bird-eye-shine { fill: #fff; opacity: 0; transition: opacity 200ms ease 250ms; }
      .ptr-bird-beak { fill: var(--text, #fff); opacity: 0; transition: opacity 200ms ease 250ms; }
      .ptr-bird-legs { stroke: var(--accent, #c9a84c); stroke-width: 1.5; fill: none;
        stroke-linecap: round; opacity: 0; transition: opacity 200ms ease 200ms; }

      /* Blocks under bird */
      .ptr-blocks { display: flex; gap: 2px; height: 6px; }
      .ptr-block { width: 8px; height: 6px; border-radius: 1.5px;
        background: var(--accent, #c9a84c); transform: scaleY(0);
        transform-origin: bottom; transition: transform 200ms ease; }

      /* States based on pull progress — bird fades in piece by piece */
      .ptr-bird-indicator[data-progress="1"] .ptr-bird-body-fill { opacity: 0.5; }
      .ptr-bird-indicator[data-progress="1"] .ptr-block:nth-child(1) { transform: scaleY(1); }

      .ptr-bird-indicator[data-progress="2"] .ptr-bird-body-fill { opacity: 0.8; }
      .ptr-bird-indicator[data-progress="2"] .ptr-bird-wing { opacity: 0.6; }
      .ptr-bird-indicator[data-progress="2"] .ptr-bird-tail { opacity: 0.6; }
      .ptr-bird-indicator[data-progress="2"] .ptr-block:nth-child(1),
      .ptr-bird-indicator[data-progress="2"] .ptr-block:nth-child(2) { transform: scaleY(1); }

      .ptr-bird-indicator[data-progress="3"] .ptr-bird-body-fill { opacity: 1; }
      .ptr-bird-indicator[data-progress="3"] .ptr-bird-wing { opacity: 0.8; }
      .ptr-bird-indicator[data-progress="3"] .ptr-bird-tail { opacity: 0.8; }
      .ptr-bird-indicator[data-progress="3"] .ptr-bird-eye { opacity: 1; }
      .ptr-bird-indicator[data-progress="3"] .ptr-bird-eye-shine { opacity: 1; }
      .ptr-bird-indicator[data-progress="3"] .ptr-block:nth-child(1),
      .ptr-bird-indicator[data-progress="3"] .ptr-block:nth-child(2),
      .ptr-bird-indicator[data-progress="3"] .ptr-block:nth-child(3) { transform: scaleY(1); }

      .ptr-bird-indicator[data-progress="4"] .ptr-bird-body-fill { opacity: 1; }
      .ptr-bird-indicator[data-progress="4"] .ptr-bird-wing { opacity: 1; }
      .ptr-bird-indicator[data-progress="4"] .ptr-bird-tail { opacity: 1; }
      .ptr-bird-indicator[data-progress="4"] .ptr-bird-eye { opacity: 1; }
      .ptr-bird-indicator[data-progress="4"] .ptr-bird-eye-shine { opacity: 1; }
      .ptr-bird-indicator[data-progress="4"] .ptr-bird-beak { opacity: 1; }
      .ptr-bird-indicator[data-progress="4"] .ptr-bird-legs { opacity: 1; }
      .ptr-bird-indicator[data-progress="4"] .ptr-block { transform: scaleY(1); }

      /* Refreshing state — full bird, bobbing */
      .ptr-bird-indicator--refreshing .ptr-bird-body-fill { opacity: 1 !important; }
      .ptr-bird-indicator--refreshing .ptr-bird-wing { opacity: 1 !important; }
      .ptr-bird-indicator--refreshing .ptr-bird-tail { opacity: 1 !important; }
      .ptr-bird-indicator--refreshing .ptr-bird-eye { opacity: 1 !important; }
      .ptr-bird-indicator--refreshing .ptr-bird-eye-shine { opacity: 1 !important; }
      .ptr-bird-indicator--refreshing .ptr-bird-beak { opacity: 1 !important; }
      .ptr-bird-indicator--refreshing .ptr-bird-legs { opacity: 1 !important; }
      .ptr-bird-indicator--refreshing .ptr-block { transform: scaleY(1) !important; animation: ptr-block-pulse 600ms ease-in-out infinite; }
      .ptr-bird-indicator--refreshing .ptr-block:nth-child(2) { animation-delay: 150ms; }
      .ptr-bird-indicator--refreshing .ptr-block:nth-child(3) { animation-delay: 300ms; }
      .ptr-bird-indicator--refreshing .ptr-block:nth-child(4) { animation-delay: 450ms; }

      @keyframes ptr-bird-bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      @keyframes ptr-block-pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(s);
  }

  function getOrCreateIndicator() {
    let el = document.getElementById("yapply-ptr-indicator");
    if (el) return el;

    injectPtrStyles();
    el = document.createElement("div");
    el.id = "yapply-ptr-indicator";
    el.className = "ptr-bird-indicator";
    el.dataset.progress = "0";
    el.innerHTML = `
      <div class="ptr-bird-scene">
        <svg class="ptr-bird-svg" viewBox="0 0 60 55" fill="none">
          <!-- Tail -->
          <path class="ptr-bird-tail" d="M14 32 L8 28 L13 36 L18 34Z"/>
          <!-- Body -->
          <ellipse class="ptr-bird-body-fill" cx="28" cy="32" rx="14" ry="10"/>
          <!-- Head -->
          <circle class="ptr-bird-body-fill" cx="40" cy="24" r="8"/>
          <!-- Wing -->
          <ellipse class="ptr-bird-wing" cx="26" cy="33" rx="7" ry="9" transform="rotate(-20 26 33)"/>
          <!-- Eye -->
          <circle class="ptr-bird-eye" cx="43" cy="22" r="2"/>
          <circle class="ptr-bird-eye-shine" cx="44" cy="21.2" r="0.7"/>
          <!-- Beak -->
          <path class="ptr-bird-beak" d="M47 24 L54 21 L50 28Z"/>
          <!-- Legs -->
          <g class="ptr-bird-legs">
            <line x1="24" y1="41" x2="22" y2="49"/>
            <line x1="31" y1="41" x2="33" y2="49"/>
          </g>
        </svg>
        <div class="ptr-blocks">
          <div class="ptr-block"></div>
          <div class="ptr-block"></div>
          <div class="ptr-block"></div>
          <div class="ptr-block"></div>
        </div>
      </div>
    `;

    // Insert below the marketplace tabs or at the top of the content area
    const tabsRow = document.querySelector(".marketplace-toggle-row");
    if (tabsRow && tabsRow.parentElement) {
      tabsRow.parentElement.insertBefore(el, tabsRow.nextSibling);
    } else {
      // Fallback: insert at the top of #app content
      const appRoot = document.querySelector("#app");
      if (appRoot && appRoot.firstChild) {
        appRoot.insertBefore(el, appRoot.firstChild.nextSibling || null);
      } else {
        document.body.appendChild(el);
      }
    }
    return el;
  }

  function setProgress(el, pullRatio) {
    // pullRatio: 0 to 1+ (how far they've pulled relative to threshold)
    const stage = pullRatio < 0.25 ? 0 : pullRatio < 0.5 ? 1 : pullRatio < 0.75 ? 2 : pullRatio < 1.0 ? 3 : 4;
    el.dataset.progress = String(stage);
  }

  function onTouchStart(e) {
    const scrollTop = document.scrollingElement?.scrollTop || document.documentElement.scrollTop || 0;
    if (scrollTop > 5) return;
    startY = e.touches[0].clientY;
    pulling = true;
  }

  function onTouchMove(e) {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy < 0) { pulling = false; return; }
    if (dy > 10) {
      indicator = getOrCreateIndicator();
      const ratio = dy / (PULL_THRESHOLD * 2);
      const h = Math.min(dy * 0.45, 80);
      indicator.style.height = h + "px";
      indicator.classList.add("ptr-bird-indicator--visible");
      setProgress(indicator, ratio);
    }
  }

  function onTouchEnd() {
    if (!pulling || !indicator) { pulling = false; return; }
    const h = parseFloat(indicator.style.height);
    if (h >= PULL_THRESHOLD * 0.5) {
      // Trigger refresh
      invalidateMarketplaceRequestCache();
      indicator.style.height = "64px";
      indicator.dataset.progress = "4";
      indicator.classList.add("ptr-bird-indicator--refreshing");
      renderPage().finally(() => {
        // indicator may have been removed during renderPage
        const el = document.getElementById("yapply-ptr-indicator");
        if (el) {
          el.classList.remove("ptr-bird-indicator--refreshing", "ptr-bird-indicator--visible");
          el.style.height = "0";
          setTimeout(() => { el.remove(); }, 250);
        }
        indicator = null;
      });
    } else {
      indicator.classList.remove("ptr-bird-indicator--visible");
      indicator.style.height = "0";
      setTimeout(() => { if (indicator) { indicator.remove(); indicator = null; } }, 250);
    }
    pulling = false;
  }

  document.body.addEventListener("touchstart", onTouchStart, { passive: true });
  document.body.addEventListener("touchmove", onTouchMove, { passive: true });
  document.body.addEventListener("touchend", onTouchEnd, { passive: true });

  pullToRefreshCleanup = () => {
    document.body.removeEventListener("touchstart", onTouchStart);
    document.body.removeEventListener("touchmove", onTouchMove);
    document.body.removeEventListener("touchend", onTouchEnd);
    const el = document.getElementById("yapply-ptr-indicator");
    if (el) el.remove();
  };
}

async function renderPage(localeOverride) {
  const appRoot = document.querySelector("#app");
  if (!appRoot) {
    return;
  }

  // Remove splash immediately on web (it's only for native)
  hideSplashIfNotNative();

  if (!appRoot.children.length && !IS_NATIVE_APP) {
    appRoot.innerHTML = createLoadingMarkup({ locale: getLocale("tr") });
  }

  cleanupRevealAnimations();
  cleanupParallax();
  cleanupCounters();
  cleanupBirdScroll();
  cleanupHeroScene();

  // Show bird loader only if the page takes >300ms to load (skip on fast transitions)
  let _birdLoaderTimeout = null;
  if (IS_NATIVE_APP) {
    _birdLoaderTimeout = setTimeout(() => { showBirdLoader(); }, 300);
  }

  try {
    const [{ createApp }, { getDefaultLocale, getLocaleContent }] = await Promise.all([loadAppApi(), loadI18nApi()]);
    const fallbackLocale = getDefaultLocale();
    const locale = localeOverride || getLocale(fallbackLocale);
    const content = getLocaleContent(locale);
    const page = getCurrentPage();
    const project = getCurrentProject();
    const submissionType = getCurrentSubmissionType();
    const developer = getCurrentDeveloper();
    const listingType = getCurrentListingType();
    const listingId = getCurrentListingId();

    document.documentElement.lang = content.meta.locale;
    applyTheme(getTheme());

    // Fast-path pages: auth runs in background, render from cache instantly
    const fastPathPages = new Set(["open-marketplace", "developer-dashboard", "client-dashboard", "marketplace-listing-detail"]);

    if (fastPathPages.has(page)) {
      // Show skeleton placeholders immediately while loading (native app only)
      if (IS_NATIVE_APP && (page === "developer-dashboard" || page === "client-dashboard")) {
        try {
          const skeletonMod = page === "developer-dashboard"
            ? await import("./components/developerDashboardPage.js")
            : await import("./components/clientDashboardPage.js");
          const skeletonFn = page === "developer-dashboard"
            ? skeletonMod.createDeveloperDashboardSkeleton
            : skeletonMod.createClientDashboardSkeleton;
          if (skeletonFn && appRoot) {
            appRoot.innerHTML = skeletonFn();
          }
        } catch (_) {}
      }

      // Start auth in background — don't block render on auth
      const authSyncPromise = syncAuthState();
      // Load data in parallel with auth (SWR cache returns instantly if fresh)
      const runtimeData = await loadMarketplaceRuntimeData(page, listingType, listingId);
      const initialSession = getAuthSession();

      appRoot.innerHTML = await createApp(
        content,
        locale,
        page,
        project,
        submissionType,
        developer,
        listingType,
        listingId,
        runtimeData
      );
      updateThemeToggleLabel(content);
      bindInteractions(content);

      // Schedule background thumbnail generation for marketplace card images
      if (page === "open-marketplace" && runtimeData?.publicClientListings) {
        import("./components/openMarketplacePage.js").then((mod) => {
          if (mod.scheduleBackgroundThumbnails) {
            mod.scheduleBackgroundThumbnails(runtimeData.publicClientListings);
          }
        }).catch(() => {});
      }

      // Once auth resolves, re-render if session changed (e.g. user logged in/out)
      authSyncPromise
        .then((session) => {
          if (!areSessionsEquivalent(initialSession, session)) {
            renderPage(content.meta.locale);
          }
        })
        .catch(() => {});
    } else {
      // Other pages that depend on auth state for data loading must await auth first
      const authDependentPages = new Set(["hesabim"]);
      let session, runtimeData;
      if (authDependentPages.has(page)) {
        session = await syncAuthState();
        runtimeData = await loadMarketplaceRuntimeData(page, listingType, listingId);
      } else {
        [session, runtimeData] = await Promise.all([
          syncAuthState(),
          loadMarketplaceRuntimeData(page, listingType, listingId),
        ]);
      }

      if (page === "login" && session?.authenticated) {
        navigateTo("./index.html");
        return;
      }

      appRoot.innerHTML = await createApp(
        content,
        locale,
        page,
        project,
        submissionType,
        developer,
        listingType,
        listingId,
        runtimeData
      );
      updateThemeToggleLabel(content);
      bindInteractions(content);

      // Compress detail page images in background
      if (page === "marketplace-listing-detail") {
        import("./components/marketplaceListingDetailPage.js").then((mod) => {
          if (mod.compressDetailImages) mod.compressDetailImages();
        }).catch(() => {});
      }

      // Native onboarding wizard for create-account page
      if (IS_NATIVE_APP && page === "create-account") {
        try {
          const { createOnboardingWizard, initOnboardingWizard } = await import("./components/onboardingWizard.js");
          const currentLocale = localeOverride || getLocale("tr");
          appRoot.innerHTML = createOnboardingWizard(content, currentLocale);
          initOnboardingWizard(loadAuthApi, setAuthSession, setDocumentAuthState);
        } catch (wizardError) {
          console.error("Yapply onboarding wizard error", wizardError);
        }
      }
    }
  } catch (error) {
    console.error("Yapply render error", error);
    renderBootFallback(appRoot, error);
  }

  // Inject native tab bar if running in Capacitor
  if (IS_NATIVE_APP) {
    try {
      const tabBarApi = await loadTabBarApi();
      if (tabBarApi) {
        const locale = localeOverride || getLocale("tr");
        // Remove any existing tab bar before re-rendering
        document.querySelector("#tab-bar-root")?.remove();
        document.querySelector(".tab-bar")?.remove();
        const tabBarContainer = document.createElement("div");
        tabBarContainer.id = "tab-bar-root";
        tabBarContainer.innerHTML = tabBarApi.createTabBar(locale);
        document.body.appendChild(tabBarContainer);
        document.documentElement.classList.add("has-tab-bar");
        if (tabBarApi.initTabBarInteractions) {
          tabBarApi.initTabBarInteractions();
        }
      }
    } catch (tabBarError) {
      console.error("Yapply tab bar error", tabBarError);
    }
    // Dismiss splash screen now that content is ready
    dismissSplashScreen();
  }

  // Hide bird loader once content is ready (and cancel pending show if page loaded fast)
  if (IS_NATIVE_APP) {
    if (_birdLoaderTimeout) { clearTimeout(_birdLoaderTimeout); _birdLoaderTimeout = null; }
    hideBirdLoader();
    setupPullToRefresh();
  }

  window.requestAnimationFrame(() => {
    document.documentElement.classList.add("theme-ready");
  });
}

window.addEventListener("error", (event) => {
  const appRoot = document.querySelector("#app");
  renderBootFallback(appRoot, event.error || new Error(event.message || "Unhandled runtime error"));
});

window.addEventListener("unhandledrejection", (event) => {
  const appRoot = document.querySelector("#app");
  renderBootFallback(appRoot, event.reason || new Error("Unhandled promise rejection"));
});

void renderPage();
