import { createSectionHeading } from "./primitives.js";

export function createProjects(content) {
  const items = content.projects.items
    .map(
      (project) => `
        <a class="project-card project-card--interactive" href="${project.href}" aria-label="${content.projects.viewLabel}: ${project.title}">
          <div class="project-visual project-visual--${project.visual}">
            <div class="project-visual__frame">
              <span class="project-visual__blueprint project-visual__blueprint--plan"></span>
              <span class="project-visual__blueprint project-visual__blueprint--elevation"></span>
              <span class="project-visual__blueprint project-visual__blueprint--detail"></span>
              <span class="project-visual__marker project-visual__marker--a"></span>
              <span class="project-visual__marker project-visual__marker--b"></span>
              <span class="project-visual__line"></span>
            </div>
          </div>
          <div class="project-card__body">
            <div class="project-card__header">
              <div>
                <span class="project-badge">${project.badge}</span>
              </div>
              <span class="project-card__meta">${project.location}</span>
            </div>
            <div>
              <h3>${project.title}</h3>
              <div class="project-card__summary">
                <span class="project-summary-pill">${project.style}</span>
                <span class="project-summary-pill">${project.price}</span>
                <span class="project-summary-pill">${project.buildTime}</span>
              </div>
              <p class="project-summary">${project.summary}</p>
            </div>
            <ul class="project-highlights">
              ${project.highlights.map((highlight) => `<li>${highlight}</li>`).join("")}
            </ul>
            <div class="project-card__cta">
              <span>${content.projects.viewLabel}</span>
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
