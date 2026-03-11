import { createSectionHeading } from "./primitives.js";

export function createFeatures(content) {
  const items = content.features.items
    .map(
      (feature) => `
        <article class="feature-card">
          <span class="feature-index">${feature.index}</span>
          <h3>${feature.title}</h3>
          <p>${feature.description}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="why-yapply">
      ${createSectionHeading(content.features)}
      <div class="features-grid">${items}</div>
    </section>
  `;
}
