const S = "currentColor";
const SW = "1.6";
const VB = "0 0 48 48";
const NONE = "none";
function iconPencil() {
return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
<path d="M28 6l8 8-18 18H10v-8L28 6z" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M24 10l8 8" stroke="${S}" stroke-width="${SW}" stroke-linecap="round"/>
<path d="M10 32h28" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.35"/>
<path d="M10 38h20" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.2"/>
</svg>`;
}
function iconBook() {
return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
<path d="M24 10v30" stroke="${S}" stroke-width="${SW}" stroke-linecap="round"/>
<path d="M24 10c-4-2-9-3-14-2v28c5-1 10 0 14 2" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M24 10c4-2 9-3 14-2v28c-5-1-10 0-14 2" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 18h6" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.3"/>
<path d="M14 23h5" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.2"/>
<path d="M28 18h6" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.3"/>
<path d="M28 23h5" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.2"/>
</svg>`;
}
function iconNotepad() {
return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
<rect x="10" y="6" width="28" height="36" rx="3" stroke="${S}" stroke-width="${SW}"/>
<path d="M16 14h16" stroke="${S}" stroke-width="${SW}" stroke-linecap="round"/>
<path d="M16 20h12" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.5"/>
<path d="M16 26h14" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.35"/>
<path d="M16 32h8" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.2"/>
</svg>`;
}
function iconPhone() {
return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
<rect x="13" y="4" width="22" height="40" rx="4" stroke="${S}" stroke-width="${SW}"/>
<path d="M13 10h22" stroke="${S}" stroke-width="${SW}" opacity="0.3"/>
<path d="M13 36h22" stroke="${S}" stroke-width="${SW}" opacity="0.3"/>
<circle cx="24" cy="40" r="1.2" fill="${S}" opacity="0.3"/>
<path d="M20 7h8" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.3"/>
<path d="M19 18h10" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.25"/>
<path d="M19 22h7" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.18"/>
<path d="M19 26h8" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.18"/>
</svg>`;
}
function iconMoney() {
return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
<rect x="5" y="12" width="38" height="24" rx="3" stroke="${S}" stroke-width="${SW}" stroke-linejoin="round"/>
<rect x="9" y="16" width="30" height="16" rx="1.5" stroke="${S}" stroke-width="1" opacity="0.2"/>
<circle cx="24" cy="24" r="7" stroke="${S}" stroke-width="${SW}"/>
<text x="24" y="27.5" font-size="10" fill="${S}" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">₺</text>
<path d="M9 18v12" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.2"/>
<path d="M39 18v12" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.2"/>
</svg>`;
}
function iconHelmet() {
return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="24" cy="26" rx="16" ry="4" stroke="${S}" stroke-width="${SW}" stroke-linecap="round"/>
<path d="M10 26c0-10 6.3-16 14-16s14 6 14 16" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 10h4v8h-4" stroke="${S}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>
<path d="M14 20a14 14 0 0 1 20 0" stroke="${S}" stroke-width="1" stroke-linecap="round" opacity="0.15"/>
</svg>`;
}
function iconBlueprint() {
return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
<rect x="6" y="10" width="36" height="28" rx="2" stroke="${S}" stroke-width="${SW}"/>
<path d="M6 18h36" stroke="${S}" stroke-width="1.2" opacity="0.25"/>
<path d="M6 26h36" stroke="${S}" stroke-width="1.2" opacity="0.15"/>
<rect x="12" y="22" width="10" height="8" rx="1" stroke="${S}" stroke-width="1.2" opacity="0.35"/>
<path d="M28 22v8" stroke="${S}" stroke-width="1.2" opacity="0.2"/>
<path d="M32 22v8" stroke="${S}" stroke-width="1.2" opacity="0.2"/>
<path d="M12 14h6" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.3"/>
<path d="M30 14h6" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.2"/>
</svg>`;
}
function iconCamera() {
return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
<rect x="6" y="14" width="36" height="26" rx="4" stroke="${S}" stroke-width="${SW}"/>
<circle cx="24" cy="28" r="8" stroke="${S}" stroke-width="${SW}"/>
<circle cx="24" cy="28" r="3" stroke="${S}" stroke-width="1.2" opacity="0.35"/>
<path d="M18 14l2-4h8l2 4" stroke="${S}" stroke-width="${SW}" stroke-linejoin="round"/>
<circle cx="36" cy="20" r="1.5" fill="${S}" opacity="0.25"/>
</svg>`;
}
function iconEnvelope() {
return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
<rect x="6" y="10" width="36" height="28" rx="3" stroke="${S}" stroke-width="${SW}"/>
<path d="M6 14l18 12 18-12" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 34l12-10" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.25"/>
<path d="M42 34l-12-10" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.25"/>
</svg>`;
}
const STEP_ICONS = {
projectTitle:        iconPencil,
projectType:         iconBook,
projectBrief:        iconNotepad,
contact:             iconPhone,
budget:              iconMoney,
constructionStarted: iconHelmet,
projectSize:         iconBlueprint,
photos:              iconCamera,
summary:             iconEnvelope,
companyInfo:           iconPencil,
serviceArea:           iconBook,
specialties:           iconNotepad,
pricing:               iconMoney,
portfolio:             iconCamera,
professionalContact:   iconPhone,
professionalUploads:   iconCamera,
professionalSummary:   iconEnvelope,
};
export function getStepIcon(stepId) {
const fn = STEP_ICONS[stepId] || iconPencil;
return fn();
}
export function getSubmitIcon() {
return iconEnvelope();
}