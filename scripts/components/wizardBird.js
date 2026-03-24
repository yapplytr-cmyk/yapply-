const C = {
body: "#d1b25e",
wingDk: "#b8932e",
eye: "#121317",
beak: "#f4b766",
beakDk: "#d99a3e",
leg: "#cfa84e",
helmetShell: "#cfa84c",
helmetRim: "#9e7420",
helmetStripe: "#fff4cb",
penBody: "#f2d17f",
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
cloud: "#e8edf0",
cloudDk: "#ced6db",
};
const VB = "0 0 100 80";
function birdBody(opts = {}) {
const {
flip = false,
headTilt = 0,
wingAngle = -24,
lookDir = 0,
} = opts;
const tx = flip ? "translate(84,0) scale(-1,1)" : "";
const headG = headTilt ? `rotate(${headTilt},50,30)` : "";
const eyeShift = lookDir * 1.2;
return `
<g transform="${tx}">
<path d="M18 50 L10 45 L17 56 L24 53Z" fill="${C.body}" />
<ellipse cx="36" cy="48" rx="19" ry="14" fill="${C.body}" />
<g transform="${headG}">
<circle cx="54" cy="32" r="11" fill="${C.body}" />
<circle cx="${57 + eyeShift}" cy="29" r="1.8" fill="${C.eye}" />
<path d="M63 32 L72 29 L66 37Z" fill="${C.beak}" />
</g>
<ellipse cx="33" cy="49" rx="9" ry="12"
fill="${C.wingDk}" transform="rotate(${wingAngle} 33 49)" />
<path d="M32 61V68" stroke="${C.leg}" stroke-width="2.5" stroke-linecap="round" fill="none" />
<path d="M40 61V68" stroke="${C.leg}" stroke-width="2.5" stroke-linecap="round" fill="none" />
</g>
`;
}
function birdWriting() {
return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="58" y="40" width="28" height="22" rx="2" fill="${C.paper}" stroke="${C.paperLn}" stroke-width="0.7" transform="rotate(-4,72,51)" />
<line x1="63" y1="47" x2="82" y2="46" stroke="${C.paperLn}" stroke-width="0.7" />
<line x1="63" y1="52" x2="79" y2="51" stroke="${C.paperLn}" stroke-width="0.7" />
<rect x="54" y="42" width="20" height="3" rx="1.5" fill="${C.penBody}" transform="rotate(-20 54 42)" />
${birdBody({ headTilt: 5, lookDir: 1 })}
</svg>`;
}
function birdThinking() {
return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">
<!-- Thought cloud -->
<circle cx="75" cy="10" r="6" fill="${C.cloud}" />
<circle cx="82" cy="8" r="5" fill="${C.cloud}" />
<circle cx="78" cy="5" r="5" fill="${C.cloud}" />
<circle cx="71" cy="6" r="4" fill="${C.cloud}" />
<circle cx="84" cy="12" r="4" fill="${C.cloud}" />
<ellipse cx="78" cy="13" rx="10" ry="4" fill="${C.cloud}" />
<!-- Thought trail -->
<circle cx="67" cy="19" r="2.5" fill="${C.cloudDk}" opacity="0.5" />
<circle cx="64" cy="24" r="1.5" fill="${C.cloudDk}" opacity="0.35" />
<!-- Question mark in cloud -->
<text x="78" y="12" font-size="9" fill="${C.wingDk}" font-weight="bold" text-anchor="middle" opacity="0.5">?</text>
${birdBody({ headTilt: -3, lookDir: 1, wingAngle: -18 })}
</svg>`;
}
function birdFocused() {
return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="56" y="40" width="30" height="22" rx="2" fill="${C.paper}" stroke="${C.paperLn}" stroke-width="0.7" />
<line x1="60" y1="47" x2="82" y2="47" stroke="${C.paperLn}" stroke-width="0.6" />
<line x1="60" y1="52" x2="80" y2="52" stroke="${C.paperLn}" stroke-width="0.6" />
<line x1="60" y1="57" x2="76" y2="57" stroke="${C.paperLn}" stroke-width="0.6" />
${birdBody({ headTilt: 6, lookDir: 1 })}
</svg>`;
}
function birdPhone() {
return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">
${birdBody({ headTilt: -2, lookDir: 1 })}
<!-- Phone held in front of bird (below beak, not blocking face) -->
<rect x="58" y="38" width="14" height="24" rx="2.5" fill="${C.phone}" />
<rect x="60" y="41" width="10" height="17" rx="1" fill="${C.phoneSc}" />
<line x1="62" y1="45" x2="68" y2="45" stroke="#fff" stroke-width="0.6" opacity="0.4" />
<line x1="62" y1="48" x2="67" y2="48" stroke="#fff" stroke-width="0.6" opacity="0.3" />
<!-- Wing holding phone -->
<ellipse cx="57" cy="46" rx="8" ry="4" fill="${C.wingDk}" transform="rotate(-5,57,46)" />
</svg>`;
}
function birdMoney() {
return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">
<!-- Big money bill (prominent, behind bird) -->
<rect x="10" y="30" width="34" height="20" rx="3" fill="${C.money}" />
<rect x="13" y="33" width="28" height="14" rx="1.5" fill="none" stroke="${C.moneyDk}" stroke-width="0.8" />
<text x="27" y="44" font-size="12" fill="${C.moneyDk}" font-weight="bold" text-anchor="middle">₺</text>
<!-- Coins stacked right -->
<ellipse cx="68" cy="52" rx="8" ry="6.5" fill="${C.beakDk}" />
<ellipse cx="68" cy="50" rx="8" ry="6.5" fill="${C.beak}" />
<text x="68" y="53" font-size="6" fill="${C.beakDk}" font-weight="bold" text-anchor="middle">₺</text>
<ellipse cx="76" cy="56" rx="7" ry="5.5" fill="${C.beakDk}" opacity="0.8" />
<ellipse cx="76" cy="54" rx="7" ry="5.5" fill="${C.beak}" opacity="0.9" />
${birdBody({ wingAngle: -28 })}
</svg>`;
}
function birdHardhat() {
return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">
${birdBody({ headTilt: -2, wingAngle: -20 })}
<!-- Hard hat -->
<path d="M42 24c0-6 5-10.5 11-10.5 5.5 0 10 4.2 10.5 9.5v1.5H42V24Z" fill="${C.helmetShell}" />
<path d="M40 25h24c1.4 0 2.5 1.1 2.5 2.5 0 .8-.4 1.5-1.1 2H40.4c-.7-.5-1.1-1.2-1.1-2 0-1.4 1.1-2.5 2.5-2.5Z" fill="${C.helmetRim}" />
<path d="M52 14h3v10h-3z" fill="${C.helmetStripe}" />
</svg>`;
}
function birdBlueprint() {
return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="54" y="36" width="36" height="28" rx="2" fill="${C.blueprint}" opacity="0.75" />
<line x1="58" y1="43" x2="86" y2="43" stroke="${C.bpLine}" stroke-width="0.5" opacity="0.4" />
<line x1="58" y1="50" x2="84" y2="50" stroke="${C.bpLine}" stroke-width="0.5" opacity="0.4" />
<rect x="62" y="53" width="10" height="7" rx="1" fill="none" stroke="${C.bpLine}" stroke-width="0.5" opacity="0.4" />
${birdBody({ headTilt: 3, lookDir: 1 })}
<!-- Hard hat -->
<path d="M42 24c0-6 5-10.5 11-10.5 5.5 0 10 4.2 10.5 9.5v1.5H42V24Z" fill="${C.helmetShell}" />
<path d="M40 25h24c1.4 0 2.5 1.1 2.5 2.5 0 .8-.4 1.5-1.1 2H40.4c-.7-.5-1.1-1.2-1.1-2 0-1.4 1.1-2.5 2.5-2.5Z" fill="${C.helmetRim}" />
</svg>`;
}
function birdCamera() {
return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">
${birdBody({ headTilt: 2, lookDir: 1 })}
<!-- Camera -->
<rect x="60" y="30" width="22" height="15" rx="3" fill="${C.camera}" />
<circle cx="71" cy="37" r="5" fill="${C.cameraDk}" />
<circle cx="71" cy="37" r="3.5" fill="${C.cameraL}" />
<circle cx="71" cy="37" r="2" fill="${C.eye}" />
<!-- Wing holding -->
<ellipse cx="59" cy="38" rx="8" ry="4" fill="${C.wingDk}" transform="rotate(3,59,38)" />
</svg>`;
}
function birdReady() {
return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">
${birdBody({ wingAngle: -42 })}
<!-- Sparkles -->
<path d="M74,14 L76,9 L78,14 L83,16 L78,18 L76,23 L74,18 L69,16 Z" fill="${C.beak}" opacity="0.35" />
<path d="M14,10 L15,7 L16,10 L19,11 L16,12 L15,15 L14,12 L11,11 Z" fill="${C.beak}" opacity="0.25" />
<path d="M70,6 L73,10 L80,2" stroke="${C.check}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.5" />
</svg>`;
}
function birdFlying() {
return `<svg viewBox="0 0 110 75" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="rotate(-10,50,35)">
<path d="M16 38 L8 33 L14 44 L22 41Z" fill="${C.body}" />
<ellipse cx="40" cy="38" rx="17" ry="13" fill="${C.body}" />
<circle cx="58" cy="26" r="10" fill="${C.body}" />
<circle cx="62" cy="23" r="1.6" fill="${C.eye}" />
<path d="M67 26 L75 23 L70 30Z" fill="${C.beak}" />
<ellipse cx="24" cy="28" rx="17" ry="6" fill="${C.wingDk}" transform="rotate(-20,24,28)" />
<ellipse cx="58" cy="28" rx="17" ry="6" fill="${C.wingDk}" transform="rotate(20,58,28)" />
<path d="M36,50 L34,54" stroke="${C.leg}" stroke-width="2" stroke-linecap="round" fill="none" />
<path d="M42,51 L42,55" stroke="${C.leg}" stroke-width="2" stroke-linecap="round" fill="none" />
</g>
<g transform="translate(32,50)">
<rect x="0" y="0" width="22" height="14" rx="2" fill="${C.envelope}" />
<path d="M0,0 L11,8 L22,0" fill="${C.envFlap}" />
<path d="M9,5 C9,3.8 11,3 11,4.5 C11,3 13,3.8 13,5 L11,7.5 Z" fill="${C.heart}" />
</g>
</svg>`;
}
const BIRD_POSES = {
projectTitle:        birdWriting,
projectType:         birdThinking,
projectBrief:        birdFocused,
contact:             birdPhone,
budget:              birdMoney,
constructionStarted: birdHardhat,
projectSize:         birdBlueprint,
photos:              birdCamera,
summary:             birdReady,
companyInfo:           birdWriting,
serviceArea:           birdThinking,
specialties:           birdFocused,
pricing:               birdMoney,
portfolio:             birdCamera,
professionalContact:   birdPhone,
professionalUploads:   birdCamera,
professionalSummary:   birdReady,
};
export function getBirdSvg(stepId) {
const fn = BIRD_POSES[stepId] || birdWriting;
return fn();
}
export function getBirdFlyingSvg() {
return birdFlying();
}