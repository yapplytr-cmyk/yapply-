/* ─────────────────────────────────────────────────
   Wizard Bird Mascot — Pure SVG / Code-built
   Matches the Explore page toggle bird style exactly:
   warm golden body, dark wing, small dark eye,
   golden beak, simple geometric shapes.
   ───────────────────────────────────────────────── */

// ── Shared palette (mirrors Explore page bird CSS) ──
// The Explore bird uses color-mix with --accent. We resolve
// the light-mode accent (#c9a84c) inline so SVG works everywhere.
const C = {
  // Body / head / tail: color-mix(in srgb, #c9a84c 78%, #fff2c9 22%)
  body: "#d1b25e",
  // Wing: color-mix(in srgb, #e0c06d 80%, #b98d2e 20%)
  wing: "#d8b65f",
  // Darker wing for contrast
  wingDk: "#b8932e",
  // Eye
  eye: "#121317",
  // Beak & pen tip
  beak: "#f4b766",
  beakDk: "#d99a3e",
  // Legs
  leg: "#cfa84e",
  // Shadow
  shadow: "rgba(6, 8, 12, 0.16)",
  // Helmet
  helmetShell: "#cfa84c",
  helmetRim: "#9e7420",
  helmetStripe: "#fff4cb",
  // Pen
  penBody: "#f2d17f",
  penCap: "#fff0bf",
  // Props
  paper: "#eef4f5",
  paperLn: "#c8d8da",
  phone: "#34495e",
  phoneSc: "#5dade2",
  money: "#2ecc71",
  moneyDk: "#27ae60",
  camera: "#5d6d7e",
  cameraDk: "#4a5568",
  cameraL: "#85929e",
  envelope: "#f0e6d3",
  envFlap: "#e0d0b8",
  heart: "#e74c3c",
  blueprint: "#2980b9",
  bpLine: "#5dade2",
  check: "#2ecc71",
};

// ── Base bird body (matches Explore page proportions exactly) ──
// Explore bird viewBox="0 0 120 120", character centered.
// We build the same shape language: ellipse body, circle head,
// ellipse wing, path tail, circle eye, path beak, path legs.
function birdBody(opts = {}) {
  const {
    flip = false,
    headTilt = 0,
    wingAngle = -24,  // default matches Explore idle
    lookDir = 0,      // shift eye position: -1 left, 0 center, 1 right
  } = opts;
  const tx = flip ? "translate(100,0) scale(-1,1)" : "";
  const headG = headTilt ? `rotate(${headTilt},52,32)` : "";
  const eyeShift = lookDir * 1.5;

  return `
    <g transform="${tx}">
      <!-- Tail -->
      <path d="M22 52 L12 46 L20 60 L28 56Z" fill="${C.body}" />

      <!-- Body -->
      <ellipse cx="42" cy="50" rx="22" ry="17" fill="${C.body}" />

      <!-- Head -->
      <g transform="${headG}">
        <circle cx="62" cy="34" r="13" fill="${C.body}" />

        <!-- Eye (single small dark circle, Explore style) -->
        <circle cx="${66 + eyeShift}" cy="31" r="2.2" fill="${C.eye}" />

        <!-- Beak -->
        <path d="M73 34 L83 30 L76 39Z" fill="${C.beak}" />
      </g>

      <!-- Wing (animated ellipse, same as Explore) -->
      <ellipse cx="39" cy="51" rx="11" ry="14"
        fill="${C.wingDk}" transform="rotate(${wingAngle} 39 51)" />

      <!-- Legs (stroke-based, Explore style) -->
      <path d="M38 66V74" stroke="${C.leg}" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M47 66V74" stroke="${C.leg}" stroke-width="3" stroke-linecap="round" fill="none" />
    </g>
  `;
}

// ── Step-specific SVG poses ──

function birdWriting() {
  return `<svg viewBox="0 0 110 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Clipboard -->
    <rect x="60" y="38" width="36" height="28" rx="3" fill="${C.paper}" stroke="${C.paperLn}" stroke-width="0.8" transform="rotate(-5,78,52)" />
    <line x1="66" y1="46" x2="88" y2="45" stroke="${C.paperLn}" stroke-width="0.8" />
    <line x1="66" y1="51" x2="84" y2="50" stroke="${C.paperLn}" stroke-width="0.8" />
    <path d="M68,56 L71,59 L78,52" stroke="${C.check}" stroke-width="1.5" fill="none" stroke-linecap="round" />

    <!-- Pen in wing area -->
    <rect x="56" y="44" width="24" height="4" rx="2" fill="${C.penBody}" transform="rotate(-22 56 44)" />
    <path d="M79 36 L84 33 L81 40Z" fill="${C.beak}" />

    ${birdBody({ headTilt: 6, lookDir: 1 })}
  </svg>`;
}

function birdThinking() {
  return `<svg viewBox="0 0 100 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Thought bubbles -->
    <circle cx="78" cy="10" r="7" fill="${C.body}" opacity="0.25" />
    <circle cx="72" cy="20" r="3.5" fill="${C.body}" opacity="0.18" />
    <circle cx="68" cy="26" r="1.8" fill="${C.body}" opacity="0.14" />

    <!-- Lightbulb icon in thought -->
    <circle cx="78" cy="10" r="4" fill="none" stroke="${C.beak}" stroke-width="1" opacity="0.5" />
    <line x1="78" y1="7" x2="78" y2="13" stroke="${C.beak}" stroke-width="0.8" opacity="0.4" />

    ${birdBody({ headTilt: -4, lookDir: 1, wingAngle: -18 })}
  </svg>`;
}

function birdFocused() {
  return `<svg viewBox="0 0 110 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Open book -->
    <path d="M52,44 Q66,40 86,44 L86,68 Q66,64 52,68 Z" fill="${C.paper}" stroke="${C.paperLn}" stroke-width="0.7" />
    <path d="M52,44 Q38,40 18,44 L18,68 Q38,64 52,68 Z" fill="${C.paper}" stroke="${C.paperLn}" stroke-width="0.7" opacity="0.7" />
    <line x1="52" y1="44" x2="52" y2="68" stroke="${C.paperLn}" stroke-width="0.7" />
    <line x1="58" y1="51" x2="78" y2="49" stroke="${C.paperLn}" stroke-width="0.6" opacity="0.4" />
    <line x1="58" y1="56" x2="76" y2="54" stroke="${C.paperLn}" stroke-width="0.6" opacity="0.4" />

    <!-- Pen -->
    <line x1="64" y1="36" x2="70" y2="52" stroke="${C.beak}" stroke-width="2" stroke-linecap="round" />

    ${birdBody({ headTilt: 8, lookDir: 1 })}
  </svg>`;
}

function birdPhone() {
  return `<svg viewBox="0 0 100 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({ headTilt: -2, lookDir: 1 })}

    <!-- Phone -->
    <rect x="64" y="22" width="18" height="30" rx="3" fill="${C.phone}" />
    <rect x="66" y="26" width="14" height="22" rx="1" fill="${C.phoneSc}" />
    <line x1="68" y1="31" x2="78" y2="31" stroke="#fff" stroke-width="0.8" opacity="0.5" />
    <line x1="68" y1="35" x2="76" y2="35" stroke="#fff" stroke-width="0.8" opacity="0.3" />
    <path d="M70,40 L72,42 L78,36" stroke="${C.check}" stroke-width="1.2" fill="none" stroke-linecap="round" />

    <!-- Wing holding phone -->
    <ellipse cx="62" cy="40" rx="10" ry="5" fill="${C.wingDk}" transform="rotate(-8,62,40)" />
  </svg>`;
}

function birdMoney() {
  return `<svg viewBox="0 0 100 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({ wingAngle: -30 })}

    <!-- Money bill -->
    <rect x="24" y="42" width="22" height="13" rx="2" fill="${C.money}" transform="rotate(-6,35,48)" />
    <rect x="26" y="44" width="18" height="9" rx="1" fill="none" stroke="${C.moneyDk}" stroke-width="0.6" transform="rotate(-6,35,48)" />
    <text x="34" y="51" font-size="7" fill="${C.moneyDk}" font-weight="bold" text-anchor="middle" transform="rotate(-6,34,51)">₺</text>

    <!-- Coins -->
    <ellipse cx="60" cy="44" rx="6" ry="5" fill="${C.beakDk}" />
    <ellipse cx="60" cy="43" rx="6" ry="5" fill="${C.beak}" />
    <ellipse cx="65" cy="48" rx="5" ry="4" fill="${C.beakDk}" opacity="0.8" />
    <ellipse cx="65" cy="47" rx="5" ry="4" fill="${C.beak}" opacity="0.9" />

    <!-- Wings holding -->
    <ellipse cx="30" cy="46" rx="9" ry="4" fill="${C.wingDk}" transform="rotate(18,30,46)" />
    <ellipse cx="62" cy="44" rx="9" ry="4" fill="${C.wingDk}" transform="rotate(-18,62,44)" />
  </svg>`;
}

function birdHardhat() {
  return `<svg viewBox="0 0 100 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({ headTilt: -2, wingAngle: -20 })}

    <!-- Hard hat (Explore style helmet) -->
    <path d="M48 26c0-7 6-12.6 13-12.6 6.6 0 12 5 12.6 11.4v2H48V26Z" fill="${C.helmetShell}" />
    <path d="M46 27h29c1.7 0 3 1.3 3 3 0 1-.5 1.8-1.3 2.5H46.4c-.8-.7-1.4-1.5-1.4-2.5 0-1.7 1.3-3 3-3Z" fill="${C.helmetRim}" />
    <path d="M60 14h3.5v12H60z" fill="${C.helmetStripe}" />

    <!-- Wing saluting -->
    <ellipse cx="78" cy="26" rx="9" ry="4" fill="${C.wingDk}" transform="rotate(-40,78,26)" />
  </svg>`;
}

function birdBlueprint() {
  return `<svg viewBox="0 0 120 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Blueprint paper -->
    <rect x="56" y="38" width="48" height="32" rx="2" fill="${C.blueprint}" opacity="0.8" />
    <line x1="62" y1="45" x2="98" y2="45" stroke="${C.bpLine}" stroke-width="0.6" opacity="0.4" />
    <line x1="62" y1="52" x2="94" y2="52" stroke="${C.bpLine}" stroke-width="0.6" opacity="0.4" />
    <rect x="66" y="55" width="14" height="9" rx="1" fill="none" stroke="${C.bpLine}" stroke-width="0.6" opacity="0.5" />
    <line x1="84" y1="55" x2="84" y2="66" stroke="${C.bpLine}" stroke-width="0.4" opacity="0.3" />

    <!-- Ruler -->
    <rect x="58" y="33" width="32" height="4" rx="1" fill="${C.beak}" opacity="0.7" />

    ${birdBody({ headTilt: 4, lookDir: 1 })}

    <!-- Hard hat -->
    <path d="M48 26c0-7 6-12.6 13-12.6 6.6 0 12 5 12.6 11.4v2H48V26Z" fill="${C.helmetShell}" />
    <path d="M46 27h29c1.7 0 3 1.3 3 3 0 1-.5 1.8-1.3 2.5H46.4c-.8-.7-1.4-1.5-1.4-2.5 0-1.7 1.3-3 3-3Z" fill="${C.helmetRim}" />
  </svg>`;
}

function birdCamera() {
  return `<svg viewBox="0 0 110 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({ headTilt: 3, lookDir: 1 })}

    <!-- Camera body -->
    <rect x="60" y="28" width="26" height="18" rx="3.5" fill="${C.camera}" />
    <rect x="63" y="24" width="9" height="5" rx="2" fill="${C.cameraDk}" />
    <!-- Lens -->
    <circle cx="73" cy="37" r="6.5" fill="${C.cameraDk}" />
    <circle cx="73" cy="37" r="4.5" fill="${C.cameraL}" />
    <circle cx="73" cy="37" r="2.5" fill="${C.eye}" />
    <circle cx="72" cy="36" r="0.8" fill="#fff" opacity="0.4" />
    <!-- Flash -->
    <rect x="82" y="27" width="3" height="3" rx="0.8" fill="#fff" opacity="0.3" />

    <!-- Wing holding camera -->
    <ellipse cx="60" cy="38" rx="9" ry="4.5" fill="${C.wingDk}" transform="rotate(4,60,38)" />
  </svg>`;
}

function birdReady() {
  return `<svg viewBox="0 0 100 82" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({ wingAngle: -44 })}

    <!-- Wing up (raised) -->
    <ellipse cx="22" cy="30" rx="11" ry="5" fill="${C.wingDk}" transform="rotate(-48,22,30)" />

    <!-- Sparkles -->
    <g opacity="0.4">
      <path d="M78,14 L80,9 L82,14 L87,16 L82,18 L80,23 L78,18 L73,16 Z" fill="${C.beak}" />
      <path d="M16,10 L17,7 L18,10 L21,11 L18,12 L17,15 L16,12 L13,11 Z" fill="${C.beak}" opacity="0.5" />
    </g>

    <!-- Checkmark above -->
    <path d="M72,8 L76,12 L84,3" stroke="${C.check}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6" />
  </svg>`;
}

function birdFlying() {
  return `<svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Bird in flight (tilted) -->
    <g transform="rotate(-10,55,38)">
      <!-- Tail -->
      <path d="M20 42 L10 36 L18 50 L26 46Z" fill="${C.body}" />

      <!-- Body -->
      <ellipse cx="48" cy="42" rx="20" ry="15" fill="${C.body}" />

      <!-- Head -->
      <circle cx="68" cy="28" r="12" fill="${C.body}" />

      <!-- Eye -->
      <circle cx="72" cy="25" r="2" fill="${C.eye}" />

      <!-- Beak -->
      <path d="M78 28 L88 24 L82 33Z" fill="${C.beak}" />

      <!-- Wings spread -->
      <ellipse cx="28" cy="30" rx="20" ry="7" fill="${C.wingDk}" transform="rotate(-22,28,30)" />
      <ellipse cx="68" cy="30" rx="20" ry="7" fill="${C.wingDk}" transform="rotate(22,68,30)" />

      <!-- Legs tucked -->
      <path d="M42,56 L40,60" stroke="${C.leg}" stroke-width="2" stroke-linecap="round" fill="none" />
      <path d="M50,57 L50,61" stroke="${C.leg}" stroke-width="2" stroke-linecap="round" fill="none" />
    </g>

    <!-- Envelope held below -->
    <g transform="translate(38,54)">
      <rect x="0" y="0" width="26" height="16" rx="2" fill="${C.envelope}" />
      <path d="M0,0 L13,9 L26,0" fill="${C.envFlap}" />
      <path d="M0,0 L13,9 L26,0" fill="none" stroke="${C.paperLn}" stroke-width="0.4" />
      <!-- Heart seal -->
      <path d="M11,6 C11,4.5 13,3.5 13,5.5 C13,3.5 15,4.5 15,6 L13,9 Z" fill="${C.heart}" />
    </g>
  </svg>`;
}

// ── Step → SVG function map ──
const BIRD_POSES = {
  // Client steps
  projectTitle:        birdWriting,
  projectType:         birdThinking,
  projectBrief:        birdFocused,
  contact:             birdPhone,
  budget:              birdMoney,
  constructionStarted: birdHardhat,
  projectSize:         birdBlueprint,
  photos:              birdCamera,
  summary:             birdReady,
  // Professional steps (reuse matching poses)
  companyInfo:           birdWriting,
  serviceArea:           birdThinking,
  specialties:           birdFocused,
  pricing:               birdMoney,
  portfolio:             birdCamera,
  professionalContact:   birdPhone,
  professionalUploads:   birdCamera,
  professionalSummary:   birdReady,
};

/**
 * Get the SVG HTML string for a given step ID.
 * @param {string} stepId - The wizard step ID
 * @returns {string} SVG HTML
 */
export function getBirdSvg(stepId) {
  const fn = BIRD_POSES[stepId] || birdWriting;
  return fn();
}

/**
 * Get the flying bird SVG (for submit animation).
 * @returns {string} SVG HTML
 */
export function getBirdFlyingSvg() {
  return birdFlying();
}
