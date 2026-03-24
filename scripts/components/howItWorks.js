import { createSectionHeading } from "./primitives.js";

const STEP_BIRDS = [
  "./assets/avatars/step-bird-create.svg",
  "./assets/avatars/step-bird-bids.svg",
  "./assets/avatars/step-bird-compare.svg",
];

export function createHowItWorks(content) {
  const steps = content.howItWorks.steps
    .map(
      (step, i) => `
        <article class="step-card" data-step="${i}">
          <div class="step-bird">
            <img class="step-bird__img" src="${STEP_BIRDS[i] || STEP_BIRDS[0]}" alt="" draggable="false" />
          </div>
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
