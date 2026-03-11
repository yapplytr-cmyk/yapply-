export function createButton({ href, label, variant = "primary" }) {
  return `<a class="button button--${variant}" href="${href}">${label}</a>`;
}

export function createSectionHeading({ eyebrow, title, description, centered = false }) {
  const centeredClass = centered ? " section-heading--center" : "";

  return `
    <div class="section-heading${centeredClass}">
      <p class="eyebrow">${eyebrow}</p>
      <h2 class="section-title">${title}</h2>
      <p class="section-description">${description}</p>
    </div>
  `;
}
