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
  const annotations = content.hero.stage.annotations
    .map(
      (label, index) => `
        <div class="hero-visual__annotation hero-visual__annotation--${String.fromCharCode(97 + index)}">${label}</div>
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

        <div class="hero-stage panel" aria-hidden="true">
          <div class="hero-stage__watermark">YAPPLY.</div>

          <div class="hero-stage__status">
            <strong>${content.hero.stage.statusTitle}</strong>
            <p>${content.hero.stage.statusCopy}</p>
          </div>

          <div class="hero-visual" data-hero-visual>
            <div class="hero-visual__halo"></div>
            <div class="hero-visual__grid"></div>
            ${annotations}
            <canvas class="hero-canvas" data-hero-canvas></canvas>

            <div class="hero-fallback">
              <div class="hero-fallback__platform"></div>
              <div class="hero-fallback__villa">
                <span class="hero-fallback__slab hero-fallback__slab--base"></span>
                <span class="hero-fallback__slab hero-fallback__slab--upper"></span>
                <span class="hero-fallback__volume hero-fallback__volume--main"></span>
                <span class="hero-fallback__volume hero-fallback__volume--wing"></span>
                <span class="hero-fallback__roof hero-fallback__roof--main"></span>
                <span class="hero-fallback__roof hero-fallback__roof--wing"></span>
                <span class="hero-fallback__glass hero-fallback__glass--main"></span>
                <span class="hero-fallback__glass hero-fallback__glass--side"></span>
                <span class="hero-fallback__glass hero-fallback__glass--corner"></span>
                <span class="hero-fallback__frame hero-fallback__frame--a"></span>
                <span class="hero-fallback__frame hero-fallback__frame--b"></span>
              </div>
              <div class="hero-fallback__wire hero-fallback__wire--a"></div>
              <div class="hero-fallback__wire hero-fallback__wire--b"></div>
              <div class="hero-fallback__wire hero-fallback__wire--c"></div>
            </div>
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
