import { createApp } from "./app.js";
import { getDefaultLocale, getLocaleContent } from "./core/i18n.js";
import { applyTheme, getLocale, getTheme, setLocale, toggleTheme } from "./core/state.js";
import { initHeroScene } from "./visuals/heroScene.js";

let cleanupRevealAnimations = () => {};
let cleanupParallax = () => {};
let cleanupHeroScene = () => {};
let cleanupCounters = () => {};
let heroSceneGeneration = 0;

function getCurrentPage() {
  return document.body.dataset.page === "professionals" ? "professionals" : "home";
}

function updateThemeToggleLabel(content) {
  const toggleButton = document.querySelector("#theme-toggle");

  if (!toggleButton) {
    return;
  }

  toggleButton.textContent = getTheme() === "dark" ? content.controls.themeToggleLight : content.controls.themeToggleDark;
}

function markMotionTargets() {
  const sections = [...document.querySelectorAll(".section-shell")];
  const itemSelector =
    ".metric-card, .step-card, .feature-card, .project-card, .testimonial-card, .footer-card, .audience-card, .process-card, .stats-card, .application-panel, .faq-item, .professionals-stage";

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

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    allTargets.forEach((target) => target.classList.add("is-visible"));
    return () => {};
  }

  allTargets.forEach((target) => {
    if (target.closest(".hero, .professionals-hero")) {
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
  const hero = document.querySelector(".hero");

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

function bindInteractions(content) {
  cleanupRevealAnimations();
  cleanupParallax();
  cleanupHeroScene();
  cleanupCounters();

  const toggleButton = document.querySelector("#theme-toggle");

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      toggleTheme();
      updateThemeToggleLabel(content);
    });
  }

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
  setupApplicationForm();
  const generation = ++heroSceneGeneration;
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

function renderPage(localeOverride) {
  const fallbackLocale = getDefaultLocale();
  const locale = localeOverride || getLocale(fallbackLocale);
  const content = getLocaleContent(locale);
  const appRoot = document.querySelector("#app");
  const page = getCurrentPage();

  document.documentElement.lang = content.meta.locale;
  applyTheme(getTheme());
  cleanupRevealAnimations();
  cleanupParallax();
  cleanupCounters();
  cleanupHeroScene();
  appRoot.innerHTML = createApp(content, locale, page);
  updateThemeToggleLabel(content);
  bindInteractions(content);
  window.requestAnimationFrame(() => {
    document.documentElement.classList.add("theme-ready");
  });
}

renderPage();
