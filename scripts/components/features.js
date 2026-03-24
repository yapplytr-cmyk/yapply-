import { createSectionHeading } from "./primitives.js";
const DECK_BIRDS = [
"/assets/avatars/deck-bird-verified.svg",
"/assets/avatars/deck-bird-bidding.svg",
"/assets/avatars/deck-bird-anysize.svg",
"/assets/avatars/deck-bird-pricing.svg",
];
const DECK_BIRDS_ACTION = [
"/assets/avatars/deck-bird-verified-action.svg",
"/assets/avatars/deck-bird-bidding-action.svg",
"/assets/avatars/deck-bird-anysize-action.svg",
"/assets/avatars/deck-bird-pricing-action.svg",
];
export function createFeatures(content) {
const deckItems = content.features.items
.map(
(feature, i) => `
<div class="deck-card" data-deck-index="${i}" style="--card-i:${i}">
<div class="deck-card__inner">
<div class="deck-card__front">
<img class="deck-card__bird" src="${DECK_BIRDS[i]}" alt="" loading="lazy" />
<span class="deck-card__tap-hint" aria-hidden="true">
<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
<rect x="2" y="2" width="24" height="24" rx="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
<path d="M10 14l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
<span class="deck-card__tap-text">Tap</span>
</span>
</div>
<div class="deck-card__back">
<img class="deck-card__bird deck-card__bird--small" src="${DECK_BIRDS_ACTION[i]}" alt="" loading="lazy" />
<h3>${feature.title}</h3>
<p>${feature.description}</p>
</div>
</div>
</div>
`
)
.join("");
const accordionItems = content.features.items
.map(
(feature, i) => `
<div class="deck-accordion" data-deck-accordion="${i}">
<button class="deck-accordion__header" type="button" aria-expanded="false">
<img class="deck-accordion__bird" src="${DECK_BIRDS[i]}" data-bird-static="${DECK_BIRDS[i]}" data-bird-action="${DECK_BIRDS_ACTION[i]}" alt="" loading="lazy" />
<span class="deck-accordion__title">${feature.title}</span>
<svg class="deck-accordion__chevron" width="20" height="20" viewBox="0 0 20 20" fill="none">
<path d="M5 7.5l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
</button>
<div class="deck-accordion__body">
<div class="deck-accordion__content">
<img class="deck-accordion__bird-action" src="${DECK_BIRDS_ACTION[i]}" alt="" loading="lazy" />
<p>${feature.description}</p>
</div>
</div>
</div>
`
)
.join("");
return `
<section class="section-shell" id="why-yapply">
${createSectionHeading(content.features)}
<div class="deck-stage" data-deck-stage>${deckItems}</div>
<div class="deck-mobile" data-deck-mobile>${accordionItems}</div>
</section>
`;
}
export function initDeck() {
const stage = document.querySelector("[data-deck-stage]");
const mobileWrap = document.querySelector("[data-deck-mobile]");
if (stage) {
const cards = stage.querySelectorAll(".deck-card");
if (cards.length) {
let fanned = false;
let scrollOpened = false;
const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
const fanObserver = new IntersectionObserver(
(entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting && !fanned) {
fanned = true;
stage.classList.add("deck-stage--fanned");
}
});
},
{ threshold: 0.25 }
);
fanObserver.observe(stage);
const openObserver = new IntersectionObserver(
(entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting && !scrollOpened && fanned) {
scrollOpened = true;
cards.forEach((card, i) => {
setTimeout(() => card.classList.add("deck-card--flipped"), i * 350);
});
setTimeout(() => {
cards.forEach((card) => card.classList.remove("deck-card--flipped"));
scrollOpened = false;
}, cards.length * 350 + 2400);
}
});
},
{ threshold: 0.7 }
);
openObserver.observe(stage);
cards.forEach((card) => {
const cardIndex = card.getAttribute("data-deck-index");
if (isTouchDevice) {
card.addEventListener("click", () => {
const isFlipped = card.classList.contains("deck-card--flipped");
cards.forEach((c) => c.classList.remove("deck-card--flipped", "deck-card--hover"));
stage.removeAttribute("data-deck-focus");
if (!isFlipped) {
stage.setAttribute("data-deck-focus", cardIndex);
card.classList.add("deck-card--hover");
card.classList.add("deck-card--flipped");
}
});
} else {
card.addEventListener("mouseenter", () => {
stage.setAttribute("data-deck-focus", cardIndex);
card.classList.add("deck-card--hover");
setTimeout(() => {
if (card.classList.contains("deck-card--hover")) {
card.classList.add("deck-card--flipped");
}
}, 220);
});
card.addEventListener("mouseleave", () => {
stage.removeAttribute("data-deck-focus");
card.classList.remove("deck-card--hover");
card.classList.remove("deck-card--flipped");
});
}
});
if (isTouchDevice) {
document.addEventListener("click", (e) => {
if (!e.target.closest(".deck-card")) {
cards.forEach((c) => c.classList.remove("deck-card--flipped", "deck-card--hover"));
stage.removeAttribute("data-deck-focus");
}
});
}
}
}
if (mobileWrap) {
const accordions = mobileWrap.querySelectorAll("[data-deck-accordion]");
accordions.forEach((acc) => {
const header = acc.querySelector(".deck-accordion__header");
const headerBird = acc.querySelector(".deck-accordion__bird");
const body = acc.querySelector(".deck-accordion__body");
header.addEventListener("click", () => {
const isOpen = acc.classList.contains("deck-accordion--open");
accordions.forEach((other) => {
other.classList.remove("deck-accordion--open");
const otherHeader = other.querySelector(".deck-accordion__header");
const otherBird = other.querySelector(".deck-accordion__bird");
otherHeader.setAttribute("aria-expanded", "false");
otherBird.src = otherBird.dataset.birdStatic;
});
if (!isOpen) {
acc.classList.add("deck-accordion--open");
header.setAttribute("aria-expanded", "true");
headerBird.src = headerBird.dataset.birdAction;
}
});
});
}
}