import { createButton } from "./primitives.js";

export function createHero(content) {
  const highlights = content.hero.highlights.map((item) => `<span class="chip">${item}</span>`).join("");
  const metrics = content.hero.metrics
    .map(
      (metric) => `
        <article class="metric-card">
          <span class="metric-value">${metric.value}</span>
          <p class="metric-label">${metric.label}</p>
        </article>
      `
    )
    .join("");

  const legendItems = content.hero.stage.legendItems
    .map(
      (item) => `
        <li>
          <span>${item.label}</span>
          <span>${item.value}</span>
        </li>
      `
    )
    .join("");

  return `
    <section class="hero section-shell">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">${content.hero.eyebrow}</p>
          <h1 class="hero-title">
            <span>${content.hero.titlePrimary}</span>
            <span class="hero-title__sub">${content.hero.titleSecondary}</span>
          </h1>
          <p class="hero-lead">${content.hero.description}</p>

          <div class="hero-actions">
            ${createButton({ href: content.hero.primaryCta.href, label: content.hero.primaryCta.label, variant: "primary" })}
            ${createButton({ href: content.hero.secondaryCta.href, label: content.hero.secondaryCta.label, variant: "secondary" })}
          </div>

          <p class="hero-note">${content.hero.note}</p>
          <div class="chip-row">${highlights}</div>
          <div class="metric-grid">${metrics}</div>
        </div>

        <div class="hero-stage panel">
          <div class="hero-stage__watermark">YAPPLY.</div>

          <div class="hero-stage__status">
            <strong>${content.hero.stage.statusTitle}</strong>
            <p>${content.hero.stage.statusCopy}</p>
          </div>

          <div class="hero-visual hero-visual--video" data-hero-visual>
            <video
              class="hero-video"
              data-hero-video
              autoplay
              muted
              loop
              playsinline
              preload="metadata"
            >
              <source src="./assets/hero/flow-delpmaspu.mp4" type="video/mp4" />
            </video>
            <button
              class="hero-video-toggle"
              type="button"
              data-hero-audio-toggle
              data-muted="true"
              aria-label="Enable sound"
              aria-pressed="false"
            >
              <span class="hero-video-toggle__icon hero-video-toggle__icon--muted" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 5 7.8 8H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.8L11 19a1 1 0 0 0 1.7-.7V5.7A1 1 0 0 0 11 5Z"/>
                  <path d="m16.5 9.5 4 5"/>
                  <path d="m20.5 9.5-4 5"/>
                </svg>
              </span>
              <span class="hero-video-toggle__icon hero-video-toggle__icon--unmuted" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 5 7.8 8H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.8L11 19a1 1 0 0 0 1.7-.7V5.7A1 1 0 0 0 11 5Z"/>
                  <path d="M16.5 9.2a4.8 4.8 0 0 1 0 5.6"/>
                  <path d="M18.9 7.1a7.8 7.8 0 0 1 0 9.8"/>
                </svg>
              </span>
            </button>
          </div>

          <div class="hero-stage__detail">
            <strong>${content.hero.stage.detailTitle}</strong>
            <p>${content.hero.stage.detailCopy}</p>
          </div>

          <div class="hero-stage__legend">
            <strong>${content.hero.stage.legendTitle}</strong>
            <ul class="legend-list">${legendItems}</ul>
          </div>
        </div>
      </div>
    </section>
  `;
}
