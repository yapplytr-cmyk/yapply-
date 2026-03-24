const ICON_STROKE = "currentColor";
function iconCreateListing() {
return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="8" y="8" width="30" height="40" rx="4" stroke="${ICON_STROKE}" stroke-width="1.8"/>
<path d="M14 18h18" stroke="${ICON_STROKE}" stroke-width="1.8" stroke-linecap="round"/>
<path d="M14 24h14" stroke="${ICON_STROKE}" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>
<path d="M14 30h10" stroke="${ICON_STROKE}" stroke-width="1.8" stroke-linecap="round" opacity="0.3"/>
<rect x="32" y="24" width="24" height="18" rx="3" stroke="${ICON_STROKE}" stroke-width="1.8"/>
<circle cx="44" cy="34" r="5" stroke="${ICON_STROKE}" stroke-width="1.5"/>
<circle cx="44" cy="34" r="2" stroke="${ICON_STROKE}" stroke-width="1" opacity="0.4"/>
<path d="M40 24l2-4h4l2 4" stroke="${ICON_STROKE}" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;
}
function iconReceiveBids() {
return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="6" y="10" width="24" height="30" rx="4" stroke="${ICON_STROKE}" stroke-width="1.8"/>
<path d="M12 18h12" stroke="${ICON_STROKE}" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
<path d="M12 23h8" stroke="${ICON_STROKE}" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
<rect x="34" y="14" width="24" height="30" rx="4" stroke="${ICON_STROKE}" stroke-width="1.8"/>
<path d="M40 22h12" stroke="${ICON_STROKE}" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
<path d="M40 27h8" stroke="${ICON_STROKE}" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
<path d="M30 25l4 0" stroke="${ICON_STROKE}" stroke-width="2" stroke-linecap="round"/>
<path d="M32 22l3 3-3 3" stroke="${ICON_STROKE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
<rect x="16" y="44" width="32" height="12" rx="3" stroke="${ICON_STROKE}" stroke-width="1.8"/>
<text x="32" y="53.5" text-anchor="middle" fill="${ICON_STROKE}" font-size="7" font-weight="600" font-family="system-ui">₺₺₺</text>
</svg>`;
}
function iconChooseComplete() {
return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="24" cy="20" r="10" stroke="${ICON_STROKE}" stroke-width="1.8"/>
<path d="M10 46c0-8 6-14 14-14s14 6 14 14" stroke="${ICON_STROKE}" stroke-width="1.8" stroke-linecap="round"/>
<path d="M14 38h20" stroke="${ICON_STROKE}" stroke-width="1.5" stroke-linecap="round" opacity="0.2"/>
<polygon points="48,8 50,14 56,14 51,18 53,24 48,20 43,24 45,18 40,14 46,14" stroke="${ICON_STROKE}" stroke-width="1.5" fill="none"/>
<circle cx="48" cy="46" r="10" stroke="${ICON_STROKE}" stroke-width="1.8"/>
<path d="M43 46l3 3 7-7" stroke="${ICON_STROKE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}
export function showOnboardingTutorial(locale, onComplete) {
const isTr = locale === "tr";
try {
if (localStorage.getItem("yapply-onboarding-tutorial-seen") === "1") {
onComplete?.();
return;
}
} catch (_) {}
const slides = [
{
icon: iconCreateListing(),
title: isTr ? "Projenizi Oluşturun" : "Create Your Project",
desc: isTr
? "Proje ilanı oluşturun, detayları ekleyin ve mekanınızın fotoğraflarını yükleyin."
: "Create a project listing, add details, and upload photos of your space.",
},
{
icon: iconReceiveBids(),
title: isTr ? "Teklifleri Alın" : "Receive Bids",
desc: isTr
? "Profesyoneller ilanınızı görecek ve size rekabetçi teklifler gönderecek."
: "Professionals will see your listing and send you competitive bids.",
},
{
icon: iconChooseComplete(),
title: isTr ? "En Uygun Teklifi Seçin" : "Choose the Best",
desc: isTr
? "Profilleri inceleyin, geçmiş işleri görün, yorumları okuyun ve en iyi seçeneği belirleyin."
: "Review profiles, see past work, read reviews, and choose the best option.",
},
];
const overlay = document.createElement("div");
overlay.className = "ob-tutorial";
overlay.innerHTML = `
<div class="ob-tutorial__card">
<div class="ob-tutorial__slides" data-ob-slides>
${slides
.map(
(s, i) => `
<div class="ob-tutorial__slide ${i === 0 ? "ob-tutorial__slide--active" : ""}" data-ob-slide="${i}">
<div class="ob-tutorial__icon">${s.icon}</div>
<h2 class="ob-tutorial__title">${s.title}</h2>
<p class="ob-tutorial__desc">${s.desc}</p>
</div>
`
)
.join("")}
</div>
<div class="ob-tutorial__dots" data-ob-dots>
${slides.map((_, i) => `<span class="ob-tutorial__dot ${i === 0 ? "ob-tutorial__dot--active" : ""}" data-ob-dot="${i}"></span>`).join("")}
</div>
<button class="ob-tutorial__btn" type="button" data-ob-next>
${isTr ? "Devam Et" : "Continue"}
</button>
</div>
`;
document.body.appendChild(overlay);
requestAnimationFrame(() => {
overlay.classList.add("ob-tutorial--visible");
});
let current = 0;
const totalSlides = slides.length;
const btn = overlay.querySelector("[data-ob-next]");
let _touchStartX = 0;
const slidesContainer = overlay.querySelector("[data-ob-slides]");
slidesContainer?.addEventListener("touchstart", (e) => {
_touchStartX = e.touches[0].clientX;
}, { passive: true });
slidesContainer?.addEventListener("touchend", (e) => {
const dx = e.changedTouches[0].clientX - _touchStartX;
if (Math.abs(dx) > 50) {
if (dx < 0 && current < totalSlides - 1) {
goTo(current + 1);
} else if (dx > 0 && current > 0) {
goTo(current - 1);
}
}
}, { passive: true });
function goTo(idx) {
current = idx;
overlay.querySelectorAll("[data-ob-slide]").forEach((s, i) => {
s.classList.toggle("ob-tutorial__slide--active", i === idx);
});
overlay.querySelectorAll("[data-ob-dot]").forEach((d, i) => {
d.classList.toggle("ob-tutorial__dot--active", i === idx);
});
if (current === totalSlides - 1) {
btn.textContent = isTr ? "Başla" : "Get Started";
} else {
btn.textContent = isTr ? "Devam Et" : "Continue";
}
}
btn?.addEventListener("click", () => {
if (current < totalSlides - 1) {
goTo(current + 1);
} else {
try { localStorage.setItem("yapply-onboarding-tutorial-seen", "1"); } catch (_) {}
overlay.classList.remove("ob-tutorial--visible");
setTimeout(() => {
overlay.remove();
onComplete?.();
}, 300);
}
});
}