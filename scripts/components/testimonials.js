import { createSectionHeading } from "./primitives.js";

export function createTestimonials(content) {
  const items = content.testimonials.items
    .map(
      (testimonial) => `
        <article class="testimonial-card">
          <span class="quote-mark">“</span>
          <p class="testimonial-copy">${testimonial.quote}</p>
          <h3>${testimonial.name}</h3>
          <p class="testimonial-role">${testimonial.role}</p>
        </article>
      `
    )
    .join("");

  return `
    <section class="section-shell" id="testimonials">
      ${createSectionHeading({ ...content.testimonials, centered: true })}
      <div class="testimonials-grid">${items}</div>
    </section>
  `;
}
