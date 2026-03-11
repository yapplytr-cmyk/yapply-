import { createApp } from "./app.js";
import { getDefaultLocale, getLocaleContent } from "./core/i18n.js";
import {
  deleteMarketplaceListing,
  getSubmissionSuccessHref,
  saveMarketplaceSubmission,
  syncMarketplaceAdminMode,
} from "./core/marketplaceStore.js";
import { applyTheme, getLocale, getTheme, setLocale, toggleTheme } from "./core/state.js";
import { initHeroScene } from "./visuals/heroScene.js";

let cleanupRevealAnimations = () => {};
let cleanupParallax = () => {};
let cleanupHeroScene = () => {};
let cleanupCounters = () => {};
let heroSceneGeneration = 0;

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
  const marketplaceTargets = [
    ...document.querySelectorAll(
      ".marketplace-tabs, .marketplace-panel, .marketplace-grid, .marketplace-card, .marketplace-card__media"
    ),
  ];

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    allTargets.forEach((target) => target.classList.add("is-visible"));
    return () => {};
  }

  if (isSmallTouchViewport) {
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
  setupMarketplaceTabs();
  setupProjectInquiryForm();
  setupMarketplaceSubmissionForm();
  setupMarketplaceListingInquiryForm();
  setupMarketplaceDeleteActions(content.meta.locale);
  setupDeveloperInquiryForm();
  const generation = ++heroSceneGeneration;
  if (getCurrentPage() === "home") {
    initHeroScene().then((cleanup) => {
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

function renderPage(localeOverride) {
  syncMarketplaceAdminMode();
  const fallbackLocale = getDefaultLocale();
  const locale = localeOverride || getLocale(fallbackLocale);
  const content = getLocaleContent(locale);
  const appRoot = document.querySelector("#app");
  const page = getCurrentPage();
  const project = getCurrentProject();
  const submissionType = getCurrentSubmissionType();
  const developer = getCurrentDeveloper();
  const listingType = getCurrentListingType();
  const listingId = getCurrentListingId();

  document.documentElement.lang = content.meta.locale;
  applyTheme(getTheme());
  cleanupRevealAnimations();
  cleanupParallax();
  cleanupCounters();
  cleanupHeroScene();
  appRoot.innerHTML = createApp(content, locale, page, project, submissionType, developer, listingType, listingId);
  updateThemeToggleLabel(content);
  bindInteractions(content);
  window.requestAnimationFrame(() => {
    document.documentElement.classList.add("theme-ready");
  });
}

renderPage();
