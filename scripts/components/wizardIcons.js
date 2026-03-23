/* ─────────────────────────────────────────────────
   Wizard Step Icons — Minimal line-art SVG system
   One clean icon per step. Consistent stroke weight,
   accent-coloured, dark-mode friendly.
   ───────────────────────────────────────────────── */

// All icons share a single viewBox and consistent 1.6px stroke.
// Colour comes from CSS custom properties so dark/light mode works.
// Fallback: accent gold in light, lighter gold in dark.
const S = "currentColor";          // stroke inherits from CSS color
const SW = "1.6";                  // uniform stroke weight
const VB = "0 0 48 48";           // unified viewBox
const NONE = "none";

// ── Individual step icons ──

function iconPencil() {
  // Pencil writing — Project Title
  return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 6l8 8-18 18H10v-8L28 6z" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M24 10l8 8" stroke="${S}" stroke-width="${SW}" stroke-linecap="round"/>
    <path d="M10 32h28" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.35"/>
    <path d="M10 38h20" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.2"/>
  </svg>`;
}

function iconBook() {
  // Open book — Category
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
  // Notepad with lines — Description
  return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="6" width="28" height="36" rx="3" stroke="${S}" stroke-width="${SW}"/>
    <path d="M16 14h16" stroke="${S}" stroke-width="${SW}" stroke-linecap="round"/>
    <path d="M16 20h12" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.5"/>
    <path d="M16 26h14" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.35"/>
    <path d="M16 32h8" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.2"/>
  </svg>`;
}

function iconPhone() {
  // Smartphone — Contact
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
  // Currency / coins — Budget
  return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="24" r="13" stroke="${S}" stroke-width="${SW}"/>
    <path d="M20 16v16" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.3"/>
    <path d="M16 20c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 3-4 3-4 1.8-4 4 1.8 4 4 4 4-1.8 4-4" stroke="${S}" stroke-width="${SW}" stroke-linecap="round"/>
    <circle cx="32" cy="18" r="8" stroke="${S}" stroke-width="1.2" opacity="0.25"/>
    <circle cx="34" cy="32" r="6" stroke="${S}" stroke-width="1.2" opacity="0.15"/>
  </svg>`;
}

function iconHelmet() {
  // Construction helmet — Construction Status
  return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 30h28" stroke="${S}" stroke-width="${SW}" stroke-linecap="round"/>
    <path d="M12 30c0-10 5.4-18 12-18s12 8 12 18" stroke="${S}" stroke-width="${SW}" stroke-linecap="round"/>
    <path d="M8 30v4c0 1.1.9 2 2 2h28c1.1 0 2-.9 2-2v-4" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M24 12v6" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" opacity="0.35"/>
    <path d="M17 18l2 4" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.2"/>
    <path d="M31 18l-2 4" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.2"/>
  </svg>`;
}

function iconBlueprint() {
  // Blueprint / ruler — Project Size
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
  // Camera — Photos
  return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="14" width="36" height="26" rx="4" stroke="${S}" stroke-width="${SW}"/>
    <circle cx="24" cy="28" r="8" stroke="${S}" stroke-width="${SW}"/>
    <circle cx="24" cy="28" r="3" stroke="${S}" stroke-width="1.2" opacity="0.35"/>
    <path d="M18 14l2-4h8l2 4" stroke="${S}" stroke-width="${SW}" stroke-linejoin="round"/>
    <circle cx="36" cy="20" r="1.5" fill="${S}" opacity="0.25"/>
  </svg>`;
}

function iconEnvelope() {
  // Envelope / mail — Summary & Submit
  return `<svg viewBox="${VB}" fill="${NONE}" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="10" width="36" height="28" rx="3" stroke="${S}" stroke-width="${SW}"/>
    <path d="M6 14l18 12 18-12" stroke="${S}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6 34l12-10" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.25"/>
    <path d="M42 34l-12-10" stroke="${S}" stroke-width="1.2" stroke-linecap="round" opacity="0.25"/>
  </svg>`;
}

// ── Step → icon map ──
const STEP_ICONS = {
  // Client steps
  projectTitle:        iconPencil,
  projectType:         iconBook,
  projectBrief:        iconNotepad,
  contact:             iconPhone,
  budget:              iconMoney,
  constructionStarted: iconHelmet,
  projectSize:         iconBlueprint,
  photos:              iconCamera,
  summary:             iconEnvelope,
  // Professional steps
  companyInfo:           iconPencil,
  serviceArea:           iconBook,
  specialties:           iconNotepad,
  pricing:               iconMoney,
  portfolio:             iconCamera,
  professionalContact:   iconPhone,
  professionalUploads:   iconCamera,
  professionalSummary:   iconEnvelope,
};

/**
 * Get the step icon SVG string.
 * @param {string} stepId
 * @returns {string} SVG HTML
 */
export function getStepIcon(stepId) {
  const fn = STEP_ICONS[stepId] || iconPencil;
  return fn();
}

/**
 * Get the submit / send-off icon (envelope).
 * Same as summary icon — the CSS handles the fly-off animation.
 * @returns {string} SVG HTML
 */
export function getSubmitIcon() {
  return iconEnvelope();
}
