import {
  createManagedFeaturedProject,
  deleteManagedFeaturedProject,
  deleteManagedListing,
  getManagedFeaturedProjects,
  getManagedMarketplaceListing,
  moveManagedFeaturedProject,
  moveManagedListing,
  updateManagedFeaturedProject,
  updateManagedListing,
} from "./core/adminStore.js";
import {
  deleteMarketplaceListing,
  fetchPublicMarketplaceListing,
  fetchPublicMarketplaceListings,
  getSubmissionSuccessHref,
  saveMarketplaceSubmission,
} from "./core/marketplaceStore.js";
import { applyTheme, clearAuthSession, getAuthSession, getLocale, getTheme, setAuthSession, setLocale, toggleTheme } from "./core/state.js";

let cleanupRevealAnimations = () => {};
let cleanupParallax = () => {};
let cleanupHeroScene = () => {};
let cleanupCounters = () => {};
let heroSceneGeneration = 0;
let authApiPromise = null;
let appApiPromise = null;
let i18nApiPromise = null;
let heroSceneApiPromise = null;

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

function setDocumentAuthState(session) {
  document.body.dataset.authenticated = session?.authenticated ? "true" : "false";
  document.body.dataset.userRole = session?.user?.role || "";
}

function getCurrentPage() {
  const page = document.body.dataset.page;
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
      button.disabled = true;

      try {
        const authApi = await loadAuthApi();
        await authApi?.logoutAccount?.();
      } catch (error) {
        console.error("Yapply logout failed", error);
      } finally {
        clearAuthSession();
        setDocumentAuthState({ authenticated: false, user: null });
        window.location.href = "./index.html";
      }
    });
  });
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

  if (isSmallTouchViewport) {
    marketplaceSection?.classList.add("is-visible");
    marketplaceTargets.forEach((target) => target.classList.add("is-visible"));
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
    const currentPage = getCurrentPage();

    if (!success) {
      return;
    }

    const successTitle = success.querySelector("h3");
    const successBody = success.querySelector("p");

    const resetErrors = () => {
      errorBox?.setAttribute("hidden", "");
      if (errorText?.dataset.defaultMessage) {
        errorText.textContent = errorText.dataset.defaultMessage;
      }
      form.querySelectorAll(".form-field.is-invalid").forEach((field) => field.classList.remove("is-invalid"));
      form.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));
    };

    if (errorText && !errorText.dataset.defaultMessage) {
      errorText.dataset.defaultMessage = errorText.textContent;
    }

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
          errorBox.hidden = true;
        }
      });

      field.addEventListener("change", () => {
        field.classList.remove("is-invalid");
        field.closest(".form-field")?.classList.remove("is-invalid");
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      resetErrors();
      form.hidden = false;
      success.hidden = true;

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
          errorBox.hidden = false;
        }

        form.reportValidity();
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
        errorBox?.setAttribute("hidden", "");
        success.hidden = false;

        if (currentPage === "create-account") {
          const redirectTarget = user.role === "developer" ? "./open-marketplace.html?tab=developer" : "./open-marketplace.html?tab=client";
          window.setTimeout(() => {
            window.location.href = redirectTarget;
          }, 220);
        } else if (audience === "admin") {
          window.setTimeout(() => {
            window.location.href = "./admin-dashboard.html";
          }, 180);
        } else if (currentPage === "login") {
          window.setTimeout(() => {
            window.location.href = "./index.html";
          }, 180);
        }
      };

      const handleError = (error) => {
        const errorCode = error?.code || "UNKNOWN_ERROR";
        const message = content.authFeedback.errors[errorCode] || error?.message || content.authFeedback.errors.UNKNOWN_ERROR;
        success.hidden = true;
        form.hidden = false;
        if (errorBox && errorText) {
          errorText.textContent = message;
          errorBox.hidden = false;
        }
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

        if (currentPage === "login" && audience !== "admin") {
          const session = await authApi.fetchAuthSession();
          const role = session?.user?.role;

          if (!session?.authenticated || !session?.user || !role || role !== user?.role) {
            throw Object.assign(new Error("Login session could not be confirmed."), {
              code: "SESSION_INVALID",
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

      submitPromise.catch((error) => {
        if (error?.code === "AUTH_UNAVAILABLE") {
          handleError(error);
          return;
        }

        handleError(error);
      }).then((user) => {
        if (user) {
          handleSuccess(user);
        }
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
      const existingListing = getManagedMarketplaceListing(type, listingKey, clientSeedItems, professionalSeedItems);

      if (!type || !listingKey || !existingListing) {
        return;
      }

      await updateManagedListing(type, listingKey, formData, existingListing);
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
        const listing = getManagedMarketplaceListing(type, key, clientSeedItems, professionalSeedItems);

        if (!listing) {
          return;
        }

        deleteManagedListing(type, listing);
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
        const listing = getManagedMarketplaceListing(type, key, clientSeedItems, professionalSeedItems);

        if (!listing) {
          return;
        }

        moveManagedListing(type, listing, direction, clientSeedItems, professionalSeedItems);
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

function setupMarketplacePublicFilters(locale) {
  const form = document.querySelector("[data-marketplace-client-filters]");
  if (!form) {
    return;
  }

  const categoryField = form.querySelector('[name="category"]');
  const statusField = form.querySelector('[name="status"]');

  const applyFilters = () => {
    const nextUrl = new URL(window.location.href);
    const category = categoryField?.value || "";
    const status = statusField?.value || "open-for-bids";

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

    window.history.replaceState({}, "", nextUrl.toString());
    void renderPage(locale);
  };

  categoryField?.addEventListener("change", applyFilters);
  statusField?.addEventListener("change", applyFilters);
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorBox?.setAttribute("hidden", "");

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    try {
      const formData = new FormData(form);
      const listing = await saveMarketplaceSubmission(submissionType, formData);
      window.location.href = getSubmissionSuccessHref(submissionType, listing.id);
    } catch (error) {
      if (errorTitle) {
        errorTitle.textContent = copy.title;
      }

      if (errorText) {
        errorText.textContent = error?.message || copy.fallback;
      }

      errorBox?.removeAttribute("hidden");
    }
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
        window.location.href = redirect;
        return;
      }

      if (getCurrentPage() === "open-marketplace") {
        renderPage(locale);
        return;
      }

      window.location.href = `./open-marketplace.html?tab=${type === "professional" ? "developer" : "client"}`;
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

function bindInteractions(content) {
  cleanupRevealAnimations();
  cleanupParallax();
  cleanupHeroScene();
  cleanupCounters();

  const toggleButtons = document.querySelectorAll("#theme-toggle, #theme-toggle-mobile");

  toggleButtons.forEach((toggleButton) => {
    toggleButton.addEventListener("click", () => {
      toggleTheme();
      updateThemeToggleLabel(content);
    });
  });

  const localeButtons = document.querySelectorAll("[data-locale-switch]");

  localeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLocale = button.getAttribute("data-locale-switch");

      if (!nextLocale) {
        return;
      }

      setLocale(nextLocale);
      renderPage(nextLocale);
    });
  });

  const yearNode = document.querySelector("[data-current-year]");

  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  markMotionTargets();
  cleanupRevealAnimations = setupRevealAnimations();
  cleanupParallax = setupParallax();
  cleanupCounters = setupStatsCounters(content.meta.locale);
  setupFaqAccordions();
  setupNavMenu();
  setupAuthNavigation();
  setupAdminSectionNavigation();
  setupApplicationForm();
  setupAuthRoleSelection();
  setupAuthEntryForms(content);
  setupMarketplaceTabs();
  setupMarketplacePublicFilters(content.meta.locale);
  setupProjectInquiryForm();
  setupMarketplaceSubmissionForm();
  setupMarketplaceListingInquiryForm();
  setupMarketplaceDeleteActions(content.meta.locale);
  setupDeveloperInquiryForm();
  setupAdminDashboard(content);
  setupHeroVideo();
  const generation = ++heroSceneGeneration;
  if (getCurrentPage() === "home") {
    loadHeroSceneApi().then((heroSceneApi) => heroSceneApi?.initHeroScene?.()).then((cleanup) => {
      if (generation !== heroSceneGeneration) {
        if (typeof cleanup === "function") {
          cleanup();
        }

        return;
      }

      cleanupHeroScene = typeof cleanup === "function" ? cleanup : () => {};
    });
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
    setDocumentAuthState(session);
    return session;
  } catch (error) {
    const fallbackSession = { authenticated: false, user: null };
    setDocumentAuthState(fallbackSession);
    return fallbackSession;
  }
}

async function loadMarketplaceRuntimeData(page, listingType, listingId) {
  if (page === "open-marketplace") {
    const filters = getCurrentMarketplaceFilters();

    try {
      const publicClientListings = await fetchPublicMarketplaceListings({
        type: "client",
        status: filters.status || "open-for-bids",
        category: filters.category || "",
        limit: 24,
      });

      return {
        publicClientListings,
        publicListingFilters: filters,
        publicListingError: false,
      };
    } catch (error) {
      return {
        publicClientListings: [],
        publicListingFilters: filters,
        publicListingError: true,
      };
    }
  }

  if (page === "marketplace-listing-detail" && listingType === "client" && listingId) {
    try {
      return {
        publicListing: await fetchPublicMarketplaceListing(listingId),
      };
    } catch (error) {
      return {
        publicListing: null,
      };
    }
  }

  return {};
}

async function renderPage(localeOverride) {
  const appRoot = document.querySelector("#app");
  if (!appRoot) {
    return;
  }

  if (!appRoot.children.length) {
    appRoot.innerHTML = createLoadingMarkup({ locale: getLocale("tr") });
  }

  cleanupRevealAnimations();
  cleanupParallax();
  cleanupCounters();
  cleanupHeroScene();

  try {
    const [{ createApp }, { getDefaultLocale, getLocaleContent }] = await Promise.all([loadAppApi(), loadI18nApi()]);
    const fallbackLocale = getDefaultLocale();
    const locale = localeOverride || getLocale(fallbackLocale);
    const content = getLocaleContent(locale);
    const session = await syncAuthState();
    const page = getCurrentPage();
    if (page === "login" && session?.authenticated) {
      window.location.replace("./index.html");
      return;
    }
    const project = getCurrentProject();
    const submissionType = getCurrentSubmissionType();
    const developer = getCurrentDeveloper();
    const listingType = getCurrentListingType();
    const listingId = getCurrentListingId();
    const runtimeData = await loadMarketplaceRuntimeData(page, listingType, listingId);

    document.documentElement.lang = content.meta.locale;
    applyTheme(getTheme());
    appRoot.innerHTML = createApp(content, locale, page, project, submissionType, developer, listingType, listingId, runtimeData);
    updateThemeToggleLabel(content);
    bindInteractions(content);
  } catch (error) {
    console.error("Yapply render error", error);
    renderBootFallback(appRoot, error);
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
