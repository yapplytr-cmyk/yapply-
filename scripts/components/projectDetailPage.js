import { createButton, createSectionHeading } from "./primitives.js";
function createProjectSpecs(content, project) {
const specs = [
{ label: content.labels.style, value: project.style },
{ label: content.labels.region, value: project.region },
{ label: content.labels.startingBudget, value: project.startingBudget },
{ label: content.labels.duration, value: project.duration },
];
return specs
.map(
(item) => `
<article class="project-spec panel">
<span class="project-spec__label">${item.label}</span>
<strong>${item.value}</strong>
</article>
`
)
.join("");
}
function createListItems(items) {
return items.map((item) => `<li>${item}</li>`).join("");
}
function createTimeline(content, project) {
return project.timeline
.map(
(item, index) => `
<article class="timeline-card">
<span class="timeline-card__index">${String(index + 1).padStart(2, "0")}</span>
<h3>${item.phase}</h3>
<p>${item.detail}</p>
</article>
`
)
.join("");
}
function createBlueprintCanvas(project, boardIndex) {
if (project.visual === "urban") {
const canvases = [
`
<svg viewBox="0 0 320 220" aria-hidden="true">
<rect x="58" y="56" width="126" height="92" rx="8"></rect>
<rect x="172" y="86" width="82" height="108" rx="8"></rect>
<rect x="42" y="124" width="52" height="44" rx="6"></rect>
<path d="M54 168H264"></path>
<path d="M112 56V34H214"></path>
<path d="M214 34V86"></path>
</svg>
`,
`
<svg viewBox="0 0 320 220" aria-hidden="true">
<path d="M78 176H244"></path>
<path d="M102 176V72H178V176"></path>
<path d="M178 176V48H230V176"></path>
<path d="M118 72H194"></path>
<path d="M192 48H248"></path>
<path d="M136 104H160V138H136Z"></path>
<path d="M198 82H220V150H198Z"></path>
</svg>
`,
`
<svg viewBox="0 0 320 220" aria-hidden="true">
<path d="M64 170L118 118H204L256 170"></path>
<path d="M98 170L146 98H220"></path>
<path d="M146 98L194 170"></path>
<path d="M118 118H204"></path>
<path d="M164 98V70"></path>
<circle cx="164" cy="70" r="8"></circle>
</svg>
`,
];
return canvases[boardIndex];
}
if (project.visual === "retreat") {
const canvases = [
`
<svg viewBox="0 0 320 220" aria-hidden="true">
<rect x="56" y="94" width="180" height="58" rx="8"></rect>
<rect x="206" y="68" width="58" height="50" rx="8"></rect>
<path d="M52 152H246"></path>
<path d="M104 94V152"></path>
<path d="M162 94V152"></path>
<path d="M236 118H278"></path>
</svg>
`,
`
<svg viewBox="0 0 320 220" aria-hidden="true">
<path d="M56 170H262"></path>
<path d="M76 150H152"></path>
<path d="M80 78H236V136H80Z"></path>
<path d="M236 94H272V138H236"></path>
<rect x="92" y="162" width="116" height="20" rx="10"></rect>
<path d="M150 78V54"></path>
</svg>
`,
`
<svg viewBox="0 0 320 220" aria-hidden="true">
<rect x="66" y="92" width="194" height="20" rx="8"></rect>
<path d="M90 112V156"></path>
<path d="M126 112V156"></path>
<path d="M162 112V156"></path>
<path d="M198 112V156"></path>
<path d="M234 112V156"></path>
<path d="M66 156H260"></path>
</svg>
`,
];
return canvases[boardIndex];
}
const canvases = [
`
<svg viewBox="0 0 320 220" aria-hidden="true">
<rect x="64" y="84" width="82" height="72" rx="8"></rect>
<rect x="134" y="68" width="108" height="88" rx="8"></rect>
<rect x="228" y="98" width="42" height="36" rx="6"></rect>
<path d="M50 156H274"></path>
<path d="M104 84V52H246"></path>
</svg>
`,
`
<svg viewBox="0 0 320 220" aria-hidden="true">
<path d="M76 166H260"></path>
<path d="M92 166V102H154V166"></path>
<path d="M154 166V82H242V166"></path>
<path d="M102 102H166"></path>
<path d="M184 104H222V148H184Z"></path>
<path d="M120 120H136V148H120Z"></path>
</svg>
`,
`
<svg viewBox="0 0 320 220" aria-hidden="true">
<path d="M72 148H252"></path>
<path d="M92 122H232"></path>
<path d="M112 94H214"></path>
<path d="M128 66H198"></path>
<path d="M162 66V44"></path>
<circle cx="162" cy="44" r="7"></circle>
</svg>
`,
];
return canvases[boardIndex];
}
function createBlueprintBoards(project) {
return project.boards
.map(
(boardLabel, boardIndex) => `
<article class="project-board project-board--${boardIndex + 1}">
<span class="project-board__label">${boardLabel}</span>
<div class="project-board__canvas project-board__canvas--${project.visual}">
${createBlueprintCanvas(project, boardIndex)}
</div>
</article>
`
)
.join("");
}
function createProjectInquiry(content, project) {
const inquiry = content.detailPage.sections.inquiry;
const fields = inquiry.fields;
const plotOptions = inquiry.plotStatusOptions.map((option) => `<option value="${option}">${option}</option>`).join("");
const budgetOptions = inquiry.budgetOptions.map((option) => `<option value="${option}">${option}</option>`).join("");
return `
<section class="section-shell" id="project-request">
${createSectionHeading(inquiry)}
<div class="project-inquiry-layout">
<article class="panel project-inquiry-summary">
<span class="project-inquiry-summary__eyebrow">${inquiry.summaryTitle}</span>
<h3>${project.name}</h3>
<div class="project-inquiry-summary__grid">
<div>
<span>${inquiry.summaryLabels.project}</span>
<strong>${project.style}</strong>
</div>
<div>
<span>${inquiry.summaryLabels.region}</span>
<strong>${project.region}</strong>
</div>
<div>
<span>${inquiry.summaryLabels.startingBudget}</span>
<strong>${project.startingBudget}</strong>
</div>
<div>
<span>${inquiry.summaryLabels.duration}</span>
<strong>${project.duration}</strong>
</div>
</div>
</article>
<div class="panel application-panel project-inquiry-panel">
<div class="project-inquiry-panel__intro">
<h3>${inquiry.formTitle}</h3>
<p>${inquiry.formIntro}</p>
</div>
<form class="application-form project-inquiry-form" data-project-inquiry-form novalidate>
<input type="hidden" name="projectName" value="${project.name}" data-project-name-field />
<label class="form-field">
<span>${fields.fullName.label}</span>
<input type="text" name="fullName" placeholder="${fields.fullName.placeholder}" autocomplete="name" required />
</label>
<label class="form-field">
<span>${fields.email.label}</span>
<input type="email" name="email" placeholder="${fields.email.placeholder}" autocomplete="email" required />
</label>
<label class="form-field">
<span>${fields.phone.label}</span>
<input type="tel" name="phone" placeholder="${fields.phone.placeholder}" autocomplete="tel" required />
</label>
<label class="form-field">
<span>${fields.city.label}</span>
<input type="text" name="preferredRegion" placeholder="${fields.city.placeholder}" autocomplete="address-level2" required />
</label>
<label class="form-field">
<span>${fields.plotStatus.label}</span>
<select name="plotStatus" required>
<option value="" selected disabled>${fields.plotStatus.placeholder}</option>
${plotOptions}
</select>
</label>
<label class="form-field">
<span>${fields.budget.label}</span>
<select name="budget" required>
<option value="" selected disabled>${fields.budget.placeholder}</option>
${budgetOptions}
</select>
</label>
<label class="form-field form-field--full">
<span>${fields.message.label}</span>
<textarea name="message" rows="5" placeholder="${fields.message.placeholder}"></textarea>
</label>
<div class="form-actions form-field--full">
<button class="button button--primary" type="submit">${inquiry.submitLabel}</button>
</div>
</form>
<div class="form-success project-inquiry-success" data-project-inquiry-success hidden>
<h3>${inquiry.successTitle}</h3>
<p>
${inquiry.successText}
<strong data-project-success-name>${project.name}</strong>
${inquiry.successTextEnd}
</p>
</div>
</div>
</div>
</section>
`;
}
export function createProjectDetailPage(content) {
const project = content.project;
const sections = content.detailPage.sections;
return `
<section class="project-detail-hero section-shell">
<div class="project-detail-hero__layout">
<div class="project-detail-hero__copy">
<p class="eyebrow">${project.style}</p>
<h1 class="hero-title project-detail-hero__title">${project.name}</h1>
<p class="hero-lead project-detail-hero__lead">${project.subtitle}</p>
<div class="project-spec-grid">
${createProjectSpecs(content.detailPage, project)}
</div>
</div>
<div class="project-hero-visual panel project-hero-visual--${project.visual}">
<div class="project-hero-visual__eyebrow">${sections.overview.eyebrow}</div>
<div class="project-hero-visual__grid"></div>
<div class="project-hero-visual__boards">
${createBlueprintBoards(project)}
</div>
<div class="project-hero-visual__measure project-hero-visual__measure--a">${content.detailPage.labels.plotSize}</div>
<div class="project-hero-visual__measure project-hero-visual__measure--b">${content.detailPage.labels.interiorSize}</div>
<div class="project-hero-visual__measure project-hero-visual__measure--c">${content.detailPage.labels.rooms}</div>
<div class="project-hero-visual__card">
<span>${content.detailPage.labels.region}</span>
<strong>${project.region}</strong>
</div>
</div>
</div>
</section>
<section class="section-shell" id="project-overview">
${createSectionHeading(sections.overview)}
<div class="project-overview-grid">
<article class="project-detail-card panel">
<p class="project-overview-copy">${project.overview}</p>
</article>
<article class="project-detail-card panel">
<div class="project-detail-card__facts">
<div>
<span>${content.detailPage.labels.plotSize}</span>
<strong>${project.plotSize}</strong>
</div>
<div>
<span>${content.detailPage.labels.interiorSize}</span>
<strong>${project.interiorSize}</strong>
</div>
<div>
<span>${content.detailPage.labels.rooms}</span>
<strong>${project.rooms}</strong>
</div>
<div>
<span>${content.detailPage.labels.turnkeyBudget}</span>
<strong>${project.turnkeyBudget}</strong>
</div>
</div>
</article>
</div>
</section>
<section class="section-shell" id="project-pricing">
${createSectionHeading(sections.pricing)}
<div class="project-pricing-grid">
<article class="project-budget-card panel">
<span class="project-budget-card__label">${content.detailPage.labels.startingBudget}</span>
<strong>${project.startingBudget}</strong>
<p>${project.style}</p>
</article>
<article class="project-budget-card panel">
<span class="project-budget-card__label">${content.detailPage.labels.turnkeyBudget}</span>
<strong>${project.turnkeyBudget}</strong>
<p>${project.region}</p>
</article>
<article class="detail-list-card panel">
<h3>${content.detailPage.labels.optionalUpgrades}</h3>
<ul class="detail-list">${createListItems(project.optionalUpgrades)}</ul>
</article>
<article class="detail-list-card panel">
<h3>${content.detailPage.labels.pricingFactors}</h3>
<ul class="detail-list">${createListItems(project.pricingFactors)}</ul>
</article>
</div>
<article class="project-note panel">
<span>${content.detailPage.labels.estimateNote}</span>
<p>${content.detailPage.labels.estimateText}</p>
</article>
</section>
<section class="section-shell" id="project-timeline">
${createSectionHeading(sections.timeline)}
<div class="project-timeline-grid">
${createTimeline(content.detailPage, project)}
</div>
</section>
<section class="section-shell" id="project-included">
${createSectionHeading(sections.included)}
<div class="project-included-grid">
<article class="detail-list-card panel">
<h3>${sections.included.title}</h3>
<ul class="detail-list">${createListItems(project.included)}</ul>
</article>
</div>
</section>
<section class="section-shell" id="project-ideal">
${createSectionHeading(sections.ideal)}
<div class="project-ideal-grid">
<article class="ideal-card panel">
<h3>${content.detailPage.labels.idealClient}</h3>
<ul class="detail-list">${createListItems(project.idealClient)}</ul>
</article>
<article class="ideal-card panel">
<h3>${content.detailPage.labels.idealUseCases}</h3>
<ul class="detail-list">${createListItems(project.idealUseCases)}</ul>
</article>
</div>
</section>
${createProjectInquiry(content, project)}
<section class="section-shell" id="project-cta">
<div class="project-cta-panel panel">
<div>
<p class="eyebrow">${project.name}</p>
<h2 class="section-title">${sections.cta.title}</h2>
<p class="section-description">${sections.cta.description}</p>
</div>
<div class="hero-actions">
${createButton({ href: sections.cta.requestHref, label: sections.cta.requestLabel, variant: "primary" })}
${createButton({ href: sections.cta.speakHref, label: sections.cta.speakLabel, variant: "secondary" })}
</div>
</div>
</section>
`;
}