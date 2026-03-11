import { createSectionHeading } from "./primitives.js";

function getProjectPreviewImage(project) {
  const imageMap = {
    coast: "./assets/project-previews/aegean-courtyard-villa.svg",
    urban: "./assets/project-previews/urban-ridge-villa.svg",
    retreat: "./assets/project-previews/hillside-retreat-villa.svg",
  };

  return imageMap[project.visual] || imageMap.coast;
}

export function createProjects(content) {
  const items = content.projects.items
    .map(
      (project) => `
        <a class="project-card project-card--interactive" href="${project.href}" aria-label="${content.projects.viewLabel}: ${project.title}">
          <div class="project-visual project-visual--${project.visual}">
            <div class="project-visual__label">${content.projects.blueprintLabel}</div>
            <div class="project-visual__frame">
              <span class="project-visual__blueprint project-visual__blueprint--plan"></span>
              <span class="project-visual__blueprint project-visual__blueprint--elevation"></span>
              <span class="project-visual__blueprint project-visual__blueprint--detail"></span>
              <span class="project-visual__marker project-visual__marker--a"></span>
              <span class="project-visual__marker project-visual__marker--b"></span>
              <span class="project-visual__line"></span>
              <img
                class="project-visual__image"
                src="${getProjectPreviewImage(project)}"
                alt="${project.title}"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <div class="project-card__body">
            <div class="project-card__header">
              <div>
                <span class="project-badge">${project.badge}</span>
                <h3>${project.title}</h3>
              </div>
              <span class="project-card__meta">${project.location}</span>
            </div>
            <div class="project-card__facts">
              <div class="project-fact">
                <span class="project-fact__label">${content.projects.factLabels.style}</span>
                <strong>${project.style}</strong>
              </div>
              <div class="project-fact">
                <span class="project-fact__label">${content.projects.factLabels.price}</span>
                <strong>${project.price}</strong>
              </div>
              <div class="project-fact">
                <span class="project-fact__label">${content.projects.factLabels.buildTime}</span>
                <strong>${project.buildTime}</strong>
              </div>
            </div>
            <div>
              <p class="project-summary">${project.summary}</p>
            </div>
            <ul class="project-highlights">
              ${project.highlights.map((highlight) => `<li>${highlight}</li>`).join("")}
            </ul>
            <div class="project-card__cta">
              <div class="project-card__cta-copy">
                <span>${project.ctaLabel || content.projects.viewLabel}</span>
                <small>${project.ctaHint || content.projects.ctaHint}</small>
              </div>
              <span class="project-card__arrow" aria-hidden="true">↗</span>
            </div>
          </div>
        </a>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="featured-projects">
      ${createSectionHeading(content.projects)}
      <div class="projects-grid">${items}</div>
    </section>
  `;
}
