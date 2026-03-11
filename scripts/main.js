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
import { deleteMarketplaceListing, getSubmissionSuccessHref, saveMarketplaceSubmission } from "./core/marketplaceStore.js";
import { applyTheme, getAuthSession, getLocale, getTheme, setAuthSession, setLocale, toggleTheme } from "./core/state.js";

let cleanupRevealAnimations = () => {};
let cleanupParallax = () => {};
let cleanupHeroScene = () => {};
let cleanupCounters = () => {};
let heroSceneGeneration = 0;
let authApiPromise = null;
let appApiPromise = null;
let i18nApiPromise = null;
let heroSceneApiPromise = null;

function createBootFallbackMarkup({
  eyebrow = "Yapply",
  title = "Loading the interface...",
  description = "The site is initializing.",
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

function renderBootFallback(appRoot, error) {
  if (!appRoot) {
    return;
  }

  appRoot.innerHTML = createBootFallbackMarkup({
    eyebrow: "Yapply Recovery",
    title: "The interface is recovering.",
    description: "A runtime or module-load error interrupted the page render. The app shell is visible again while the failing module is bypassed.",
    debug: getBootErrorMessage(error),
  });
}

async function loadAuthApi() {
  if (!authApiPromise) {
    authApiPromise = import("./core/auth.js").catch(() => null);
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

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    allTargets.forEach((target) => target.classList.add("is-visible"));
    return () => {};
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

        if (audience === "admin") {
          window.setTimeout(() => {
            window.location.href = "./admin-dashboard.html";
          }, 180);
        }
      };

      const handleError = (error) => {
        const errorCode = error?.code || "UNKNOWN_ERROR";
        const message = content.authFeedback.errors[errorCode] || error?.message || content.authFeedback.errors.UNKNOWN_ERROR;
        if (errorBox && errorText) {
          errorText.textContent = message;
          errorBox.hidden = false;
        }
      };

      const submitPromise = loadAuthApi().then((authApi) => {
        if (!authApi) {
          throw Object.assign(new Error("Auth backend is unavailable."), {
            code: "AUTH_UNAVAILABLE",
          });
        }

        return currentPage === "create-account"
          ? authApi.signupAccount(payload)
          : authApi.loginAccount(
              {
                identifier: payload.email || payload.adminIdentifier || payload.adminEmail,
                password: payload.password || payload.adminPassword,
                role: payload.accountRole || undefined,
              },
              audience
            );
      });

      submitPromise.catch((error) => {
        if (error?.code === "AUTH_UNAVAILABLE") {
          if (successTitle && successBody) {
            successTitle.textContent = content.form.successTitle;
            successBody.textContent = content.form.successText;
          }

          form.hidden = true;
          errorBox?.setAttribute("hidden", "");
          success.hidden = false;
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
  const confirmDeleteLabel =
    content.meta.locale === "tr"
      ? "Bu ogeyi silmek istediginize emin misiniz?"
      : "Are you sure you want to delete this item?";

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

  if (!form || !submissionType) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const listing = await saveMarketplaceSubmission(submissionType, formData);
    window.location.href = getSubmissionSuccessHref(submissionType, listing.id);
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
  setupApplicationForm();
  setupAuthRoleSelection();
  setupAuthEntryForms(content);
  setupMarketplaceTabs();
  setupProjectInquiryForm();
  setupMarketplaceSubmissionForm();
  setupMarketplaceListingInquiryForm();
  setupMarketplaceDeleteActions(content.meta.locale);
  setupDeveloperInquiryForm();
  setupAdminDashboard(content);
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

async function renderPage(localeOverride) {
  const appRoot = document.querySelector("#app");
  if (!appRoot) {
    return;
  }

  if (!appRoot.children.length) {
    appRoot.innerHTML = createBootFallbackMarkup();
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
    await syncAuthState();
    const page = getCurrentPage();
    const project = getCurrentProject();
    const submissionType = getCurrentSubmissionType();
    const developer = getCurrentDeveloper();
    const listingType = getCurrentListingType();
    const listingId = getCurrentListingId();

    document.documentElement.lang = content.meta.locale;
    applyTheme(getTheme());
    appRoot.innerHTML = createApp(content, locale, page, project, submissionType, developer, listingType, listingId);
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
