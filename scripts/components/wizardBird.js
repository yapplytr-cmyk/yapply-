/* ─────────────────────────────────────────────────
   Wizard Bird Mascot — Pure SVG / Code-built
   Teal bird with orange beak & feet, big eyes.
   Each step gets a unique pose with contextual prop.
   ───────────────────────────────────────────────── */

// ── Shared palette ──
const C = {
  body: "#5fb8c2",       // teal body
  bodyDk: "#4a9ea8",     // darker teal (shadow / wing)
  belly: "#8ad4db",      // lighter belly
  beak: "#f5a623",       // orange beak
  beakDk: "#d4891a",     // darker beak
  feet: "#f5a623",       // orange feet
  eye: "#2c3e50",        // dark eye
  eyeW: "#ffffff",       // eye white
  pupil: "#1a252f",      // pupil
  helmet: "#f5c542",     // construction helmet
  helmetDk: "#d4a832",   // helmet shadow
  paper: "#eef4f5",      // paper / tablet
  paperLn: "#c8d8da",    // paper lines
  phone: "#34495e",      // phone body
  phoneSc: "#5dade2",    // phone screen
  money: "#2ecc71",      // money green
  moneyDk: "#27ae60",    // money dark
  camera: "#5d6d7e",     // camera body
  cameraDk: "#4a5568",   // camera dark
  cameraL: "#85929e",    // camera lens ring
  envelope: "#f0e6d3",   // envelope
  envFlap: "#e0d0b8",    // envelope flap
  heart: "#e74c3c",      // heart on envelope
  blueprint: "#2980b9",  // blueprint blue
  bpLine: "#5dade2",     // blueprint line
};

// ── Base bird body (reusable across poses) ──
function birdBody(opts = {}) {
  const { flip = false, tiltHead = 0, wingUp = false, wingAngle = 0 } = opts;
  const tx = flip ? "scale(-1,1) translate(-100,0)" : "";
  const headTilt = tiltHead ? `rotate(${tiltHead},50,28)` : "";

  return `
    <g transform="${tx}">
      <!-- Body -->
      <ellipse cx="50" cy="58" rx="26" ry="24" fill="${C.body}" />
      <!-- Belly -->
      <ellipse cx="50" cy="63" rx="18" ry="16" fill="${C.belly}" opacity="0.5" />

      <!-- Wing (back) -->
      <ellipse cx="${wingUp ? 28 : 30}" cy="${wingUp ? 42 : 55}" rx="14" ry="8"
        fill="${C.bodyDk}" transform="rotate(${wingUp ? -40 + wingAngle : -15 + wingAngle},30,55)" />

      <!-- Head -->
      <g transform="${headTilt}">
        <circle cx="50" cy="30" r="20" fill="${C.body}" />

        <!-- Eye whites -->
        <ellipse cx="43" cy="27" rx="7" ry="7.5" fill="${C.eyeW}" />
        <ellipse cx="57" cy="27" rx="7" ry="7.5" fill="${C.eyeW}" />

        <!-- Pupils -->
        <circle cx="44" cy="27" r="4" fill="${C.eye}" />
        <circle cx="58" cy="27" r="4" fill="${C.eye}" />
        <circle cx="45" cy="26" r="1.5" fill="${C.eyeW}" />
        <circle cx="59" cy="26" r="1.5" fill="${C.eyeW}" />

        <!-- Beak -->
        <path d="M47,33 L50,40 L53,33 Z" fill="${C.beak}" />
        <path d="M47,33 L50,36 L53,33 Z" fill="${C.beakDk}" opacity="0.3" />
      </g>

      <!-- Feet -->
      <g>
        <path d="M40,80 L36,86 M40,80 L40,86 M40,80 L44,86" stroke="${C.feet}" stroke-width="2" stroke-linecap="round" fill="none" />
        <path d="M60,80 L56,86 M60,80 L60,86 M60,80 L64,86" stroke="${C.feet}" stroke-width="2" stroke-linecap="round" fill="none" />
      </g>
    </g>
  `;
}

// ── Step-specific SVG poses ──

function birdWriting() {
  // Bird leaning forward writing on a tablet/clipboard
  return `<svg viewBox="0 0 110 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Tablet -->
    <rect x="58" y="50" width="40" height="30" rx="3" fill="${C.paper}" stroke="${C.paperLn}" stroke-width="1" transform="rotate(-5,78,65)" />
    <line x1="65" y1="58" x2="90" y2="57" stroke="${C.paperLn}" stroke-width="1" />
    <line x1="65" y1="63" x2="85" y2="62" stroke="${C.paperLn}" stroke-width="1" />
    <path d="M68,69 L72,73 L80,64" stroke="${C.money}" stroke-width="2" fill="none" stroke-linecap="round" />

    <!-- Pencil in wing -->
    <line x1="64" y1="48" x2="72" y2="68" stroke="${C.beak}" stroke-width="2.5" stroke-linecap="round" />
    <polygon points="72,68 70,72 74,72" fill="${C.beakDk}" />

    ${birdBody({ tiltHead: 8 })}
  </svg>`;
}

function birdThinking() {
  // Bird with wing on chin, thought bubble
  return `<svg viewBox="0 0 110 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Thought bubbles -->
    <circle cx="80" cy="12" r="8" fill="${C.belly}" opacity="0.35" />
    <circle cx="72" cy="22" r="4" fill="${C.belly}" opacity="0.25" />
    <circle cx="67" cy="28" r="2" fill="${C.belly}" opacity="0.2" />

    <!-- Lightbulb in thought -->
    <circle cx="80" cy="12" r="5" fill="none" stroke="${C.beak}" stroke-width="1.2" opacity="0.6" />
    <line x1="80" y1="8" x2="80" y2="16" stroke="${C.beak}" stroke-width="1" opacity="0.5" />

    ${birdBody({ tiltHead: -5 })}

    <!-- Wing touching chin -->
    <ellipse cx="42" cy="38" rx="10" ry="5" fill="${C.bodyDk}" transform="rotate(30,42,38)" />
  </svg>`;
}

function birdFocused() {
  // Bird writing in a book, leaning forward
  return `<svg viewBox="0 0 110 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Open book -->
    <path d="M55,55 Q70,50 90,55 L90,80 Q70,75 55,80 Z" fill="${C.paper}" stroke="${C.paperLn}" stroke-width="0.8" />
    <path d="M55,55 Q40,50 20,55 L20,80 Q40,75 55,80 Z" fill="${C.paper}" stroke="${C.paperLn}" stroke-width="0.8" opacity="0.7" />
    <line x1="55" y1="55" x2="55" y2="80" stroke="${C.paperLn}" stroke-width="0.8" />
    <line x1="62" y1="62" x2="82" y2="60" stroke="${C.paperLn}" stroke-width="0.7" opacity="0.5" />
    <line x1="62" y1="67" x2="80" y2="65" stroke="${C.paperLn}" stroke-width="0.7" opacity="0.5" />

    <!-- Pencil -->
    <line x1="68" y1="45" x2="75" y2="62" stroke="${C.beak}" stroke-width="2" stroke-linecap="round" />

    ${birdBody({ tiltHead: 10 })}
  </svg>`;
}

function birdPhone() {
  // Bird holding a phone
  return `<svg viewBox="0 0 110 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({ tiltHead: -3 })}

    <!-- Phone -->
    <rect x="66" y="30" width="20" height="35" rx="3" fill="${C.phone}" />
    <rect x="68" y="34" width="16" height="25" rx="1" fill="${C.phoneSc}" />
    <!-- Screen lines -->
    <line x1="70" y1="39" x2="82" y2="39" stroke="${C.eyeW}" stroke-width="1" opacity="0.6" />
    <line x1="70" y1="43" x2="80" y2="43" stroke="${C.eyeW}" stroke-width="1" opacity="0.4" />
    <line x1="70" y1="47" x2="78" y2="47" stroke="${C.eyeW}" stroke-width="1" opacity="0.4" />
    <!-- Checkmark -->
    <path d="M72,51 L75,54 L81,48" stroke="${C.money}" stroke-width="1.5" fill="none" stroke-linecap="round" />

    <!-- Wing holding phone -->
    <ellipse cx="65" cy="50" rx="10" ry="6" fill="${C.bodyDk}" transform="rotate(-10,65,50)" />
  </svg>`;
}

function birdMoney() {
  // Bird holding money/coins
  return `<svg viewBox="0 0 100 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({})}

    <!-- Money bill -->
    <rect x="28" y="52" width="25" height="14" rx="2" fill="${C.money}" transform="rotate(-8,40,59)" />
    <rect x="30" y="54" width="21" height="10" rx="1" fill="none" stroke="${C.moneyDk}" stroke-width="0.7" transform="rotate(-8,40,59)" />
    <text x="39" y="62" font-size="7" fill="${C.moneyDk}" font-weight="bold" text-anchor="middle" transform="rotate(-8,39,62)">₺</text>

    <!-- Coins -->
    <ellipse cx="62" cy="55" rx="7" ry="6" fill="${C.beak}" />
    <ellipse cx="62" cy="54" rx="7" ry="6" fill="${C.helmet}" />
    <ellipse cx="68" cy="60" rx="6" ry="5" fill="${C.beak}" opacity="0.8" />
    <ellipse cx="68" cy="59" rx="6" ry="5" fill="${C.helmet}" opacity="0.9" />

    <!-- Wings holding -->
    <ellipse cx="34" cy="55" rx="10" ry="5" fill="${C.bodyDk}" transform="rotate(20,34,55)" />
    <ellipse cx="66" cy="55" rx="10" ry="5" fill="${C.bodyDk}" transform="rotate(-20,66,55)" />
  </svg>`;
}

function birdHardhat() {
  // Bird with construction helmet, saluting
  return `<svg viewBox="0 0 100 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({ tiltHead: -2 })}

    <!-- Hard hat -->
    <path d="M30,23 Q50,5 70,23 L72,28 L28,28 Z" fill="${C.helmet}" />
    <rect x="26" y="26" width="48" height="5" rx="2" fill="${C.helmetDk}" />
    <ellipse cx="50" cy="15" rx="4" ry="2" fill="${C.helmetDk}" opacity="0.3" />

    <!-- Wing saluting -->
    <ellipse cx="72" cy="30" rx="10" ry="5" fill="${C.bodyDk}" transform="rotate(-45,72,30)" />
  </svg>`;
}

function birdBlueprint() {
  // Bird looking at a blueprint
  return `<svg viewBox="0 0 120 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Blueprint paper -->
    <rect x="55" y="48" width="50" height="35" rx="2" fill="${C.blueprint}" opacity="0.8" />
    <line x1="60" y1="55" x2="100" y2="55" stroke="${C.bpLine}" stroke-width="0.7" opacity="0.5" />
    <line x1="60" y1="62" x2="95" y2="62" stroke="${C.bpLine}" stroke-width="0.7" opacity="0.5" />
    <rect x="65" y="65" width="15" height="10" rx="1" fill="none" stroke="${C.bpLine}" stroke-width="0.7" opacity="0.6" />
    <line x1="85" y1="65" x2="85" y2="78" stroke="${C.bpLine}" stroke-width="0.5" opacity="0.4" />

    <!-- Ruler -->
    <rect x="58" y="42" width="35" height="5" rx="1" fill="${C.beak}" opacity="0.8" />

    ${birdBody({ tiltHead: 5 })}

    <!-- Hard hat for blueprint step too -->
    <path d="M30,23 Q50,5 70,23 L72,28 L28,28 Z" fill="${C.helmet}" />
    <rect x="26" y="26" width="48" height="5" rx="2" fill="${C.helmetDk}" />
  </svg>`;
}

function birdCamera() {
  // Bird holding a camera
  return `<svg viewBox="0 0 110 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({ tiltHead: 3 })}

    <!-- Camera body -->
    <rect x="60" y="38" width="28" height="20" rx="4" fill="${C.camera}" />
    <rect x="63" y="34" width="10" height="6" rx="2" fill="${C.cameraDk}" />
    <!-- Lens -->
    <circle cx="74" cy="48" r="7" fill="${C.cameraDk}" />
    <circle cx="74" cy="48" r="5" fill="${C.cameraL}" />
    <circle cx="74" cy="48" r="3" fill="${C.eye}" />
    <circle cx="73" cy="47" r="1" fill="${C.eyeW}" opacity="0.5" />
    <!-- Flash -->
    <rect x="83" y="37" width="4" height="4" rx="1" fill="${C.eyeW}" opacity="0.4" />

    <!-- Wing holding camera -->
    <ellipse cx="62" cy="48" rx="10" ry="5" fill="${C.bodyDk}" transform="rotate(5,62,48)" />

    <!-- Hard hat -->
    <path d="M30,23 Q50,5 70,23 L72,28 L28,28 Z" fill="${C.helmet}" />
    <rect x="26" y="26" width="48" height="5" rx="2" fill="${C.helmetDk}" />
  </svg>`;
}

function birdReady() {
  // Bird in a proud ready pose — used for summary
  return `<svg viewBox="0 0 100 95" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${birdBody({ wingUp: true, wingAngle: -20 })}

    <!-- Thumbs-up wing -->
    <ellipse cx="26" cy="40" rx="12" ry="6" fill="${C.bodyDk}" transform="rotate(-50,26,40)" />

    <!-- Sparkles -->
    <g opacity="0.5">
      <path d="M80,20 L82,15 L84,20 L89,22 L84,24 L82,29 L80,24 L75,22 Z" fill="${C.beak}" />
      <path d="M18,15 L19,12 L20,15 L23,16 L20,17 L19,20 L18,17 L15,16 Z" fill="${C.beak}" opacity="0.4" />
    </g>
  </svg>`;
}

function birdFlying() {
  // Bird flying with envelope — for submit animation
  return `<svg viewBox="0 0 130 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Body (slightly tilted for flight) -->
    <g transform="rotate(-8,60,45)">
      <ellipse cx="60" cy="50" rx="22" ry="19" fill="${C.body}" />
      <ellipse cx="60" cy="54" rx="15" ry="13" fill="${C.belly}" opacity="0.5" />

      <!-- Head -->
      <circle cx="60" cy="28" r="17" fill="${C.body}" />

      <!-- Eyes -->
      <ellipse cx="54" cy="25" rx="6" ry="6.5" fill="${C.eyeW}" />
      <ellipse cx="66" cy="25" rx="6" ry="6.5" fill="${C.eyeW}" />
      <circle cx="55" cy="25" r="3.5" fill="${C.eye}" />
      <circle cx="67" cy="25" r="3.5" fill="${C.eye}" />
      <circle cx="56" cy="24" r="1.2" fill="${C.eyeW}" />
      <circle cx="68" cy="24" r="1.2" fill="${C.eyeW}" />

      <!-- Beak -->
      <path d="M57,31 L60,37 L63,31 Z" fill="${C.beak}" />

      <!-- Wings spread out -->
      <ellipse cx="30" cy="38" rx="22" ry="8" fill="${C.bodyDk}" transform="rotate(-25,30,38)" />
      <ellipse cx="90" cy="38" rx="22" ry="8" fill="${C.bodyDk}" transform="rotate(25,90,38)" />

      <!-- Feet tucked -->
      <path d="M52,68 L50,72 M55,69 L55,73" stroke="${C.feet}" stroke-width="1.5" stroke-linecap="round" />
      <path d="M65,68 L67,72 M68,67 L70,71" stroke="${C.feet}" stroke-width="1.5" stroke-linecap="round" />
    </g>

    <!-- Envelope held below -->
    <g transform="translate(46,62)">
      <rect x="0" y="0" width="28" height="18" rx="2" fill="${C.envelope}" />
      <path d="M0,0 L14,10 L28,0" fill="${C.envFlap}" />
      <path d="M0,0 L14,10 L28,0" fill="none" stroke="${C.paperLn}" stroke-width="0.5" />
      <!-- Heart seal -->
      <path d="M12,8 C12,6 14,5 14,7 C14,5 16,6 16,8 L14,11 Z" fill="${C.heart}" />
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
