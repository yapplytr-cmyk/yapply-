import { createSectionHeading } from "./primitives.js";

export function createHowItWorks(content) {
  const steps = content.howItWorks.steps
    .map(
      (step) => `
        <article class="step-card">
          <span class="step-number">${step.number}</span>
          <h3>${step.title}</h3>
          <p>${step.description}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="how-it-works">
      ${createSectionHeading(content.howItWorks)}
      <div class="steps-grid">${steps}</div>
    </section>
  `;
}
