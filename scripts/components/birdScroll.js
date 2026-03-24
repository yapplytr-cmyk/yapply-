const VIDEO_SRC = "./assets/bird-scroll.mp4";
const KEY_THRESHOLD = 10;
const KEY_SOFT = 6;
const SAT_THRESHOLD = 8;
const SAT_SOFT = 4;
const CROP_BOTTOM_RATIO = 0.12;
function isMobile() {
return window.innerWidth <= 820;
}
function getSectionBounds() {
const hero = document.querySelector(".hero");
const howItWorks = document.getElementById("how-it-works");
const features = document.getElementById("why-yapply");
const projects = document.getElementById("featured-projects");
const testimonials = document.getElementById("testimonials");
const footer = document.getElementById("footer");
if (!hero) return null;
const scrollY = window.scrollY;
const rect = (el) => {
if (!el) return null;
const r = el.getBoundingClientRect();
return { top: r.top + scrollY, bottom: r.bottom + scrollY };
};
const heroR = rect(hero);
const howR = rect(howItWorks);
const lastSection = footer || testimonials || projects || features || howItWorks;
const lastR = rect(lastSection);
const mobile = isMobile();
if (mobile) {
const midSection = features || howItWorks;
const midR = rect(midSection);
const heroMid = heroR.top + (heroR.bottom - heroR.top) * 0.45;
return {
enterY: heroMid,
peakY: midR ? midR.top : heroR.bottom + 200,
exitY: lastR ? lastR.bottom : heroR.bottom + 1400,
};
}
return {
enterY: heroR.bottom - 700,
peakY: howR ? howR.top : heroR.bottom + 400,
exitY: lastR ? lastR.bottom : heroR.bottom + 1800,
};
}
export function setupBirdScroll() {
const page = document.body.dataset.page || "home";
if (page !== "home") return () => {};
const mobile = isMobile();
const MAX_CACHED_FRAMES = mobile ? 40 : 60;
const video = document.createElement("video");
video.src = VIDEO_SRC;
video.muted = true;
video.playsInline = true;
video.preload = "auto";
video.setAttribute("playsinline", "");
video.setAttribute("webkit-playsinline", "");
Object.assign(video.style, {
position: "absolute",
width: "1px",
height: "1px",
opacity: "0",
pointerEvents: "none",
zIndex: "-1",
});
document.body.appendChild(video);
const srcCanvas = document.createElement("canvas");
const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
const wrap = document.createElement("div");
wrap.className = "bird-scroll-overlay";
if (mobile) {
Object.assign(wrap.style, {
position: "fixed",
right: "0px",
top: "45%",
transform: "translateY(-50%)",
zIndex: "50",
pointerEvents: "none",
opacity: "0",
transition: "opacity 0.5s ease",
width: "180px",
willChange: "opacity",
});
} else {
Object.assign(wrap.style, {
position: "fixed",
right: "-10px",
top: "25%",
transform: "translateY(-50%)",
zIndex: "50",
pointerEvents: "none",
opacity: "0",
transition: "opacity 0.4s ease",
width: "clamp(160px, 18vw, 300px)",
willChange: "opacity",
});
}
const displayCanvas = document.createElement("canvas");
Object.assign(displayCanvas.style, {
display: "block",
width: "100%",
height: "auto",
});
wrap.appendChild(displayCanvas);
document.body.appendChild(wrap);
const displayCtx = displayCanvas.getContext("2d");
const frameCache = new Map();
let vw = 0;
let vh = 0;
let cropH = 0;
let renderW = 0;
let renderH = 0;
let duration = 0;
let ready = false;
let lastRenderedProgress = -1;
function initDimensions() {
vw = video.videoWidth;
vh = video.videoHeight;
if (!vw || !vh) return false;
cropH = Math.round(vh * (1 - CROP_BOTTOM_RATIO));
const scale = mobile ? 0.5 : 1;
renderW = Math.round(vw * scale);
renderH = Math.round(cropH * scale);
srcCanvas.width = renderW;
srcCanvas.height = renderH;
displayCanvas.width = renderW;
displayCanvas.height = renderH;
return true;
}
function isLightMode() {
return document.documentElement.getAttribute("data-theme") === "light";
}
function chromaKeyFrame() {
srcCtx.drawImage(video, 0, 0, vw, cropH, 0, 0, renderW, renderH);
const imageData = srcCtx.getImageData(0, 0, renderW, renderH);
const d = imageData.data;
for (let i = 0; i < d.length; i += 4) {
const r = d[i];
const g = d[i + 1];
const b = d[i + 2];
const lum = r * 0.299 + g * 0.587 + b * 0.114;
const cMax = Math.max(r, g, b);
const cMin = Math.min(r, g, b);
const spread = cMax - cMin;
const isDarkEnough = lum < KEY_THRESHOLD + KEY_SOFT;
const isFlatBlack = spread < SAT_THRESHOLD;
if (!isDarkEnough) continue;
if (!isFlatBlack) continue;
let lumAlpha = 1;
if (lum < KEY_THRESHOLD) {
lumAlpha = 0;
} else {
lumAlpha = (lum - KEY_THRESHOLD) / KEY_SOFT;
}
let satAlpha = 1;
if (spread < SAT_THRESHOLD - SAT_SOFT) {
satAlpha = 0;
} else if (spread < SAT_THRESHOLD) {
satAlpha = (spread - (SAT_THRESHOLD - SAT_SOFT)) / SAT_SOFT;
}
const keepFactor = Math.max(lumAlpha, satAlpha);
d[i + 3] = Math.round(keepFactor * 255);
}
return imageData;
}
function applyThemeVisibility() {
if (isLightMode()) {
wrap.style.opacity = "0";
wrap.style.pointerEvents = "none";
wrap.dataset.hiddenByTheme = "1";
} else {
delete wrap.dataset.hiddenByTheme;
wrap.style.filter = "none";
}
}
applyThemeVisibility();
const themeObserver = new MutationObserver(() => applyThemeVisibility());
themeObserver.observe(document.documentElement, {
attributes: true,
attributeFilter: ["data-theme"],
});
function renderFrame(progress) {
const precision = mobile ? 500 : 1000;
const key = Math.round(progress * precision);
if (key === lastRenderedProgress) return;
lastRenderedProgress = key;
const cached = frameCache.get(key);
if (cached) {
displayCtx.putImageData(cached, 0, 0);
return;
}
const imageData = chromaKeyFrame();
displayCtx.putImageData(imageData, 0, 0);
if (frameCache.size >= MAX_CACHED_FRAMES) {
const oldest = frameCache.keys().next().value;
frameCache.delete(oldest);
}
frameCache.set(key, imageData);
}
let pendingProgress = null;
let seeking = false;
function seekAndRender(progress) {
if (!ready || !duration) return;
const targetTime = progress * duration;
if (Math.abs(video.currentTime - targetTime) < 0.03) {
renderFrame(progress);
return;
}
if (seeking) {
pendingProgress = progress;
return;
}
seeking = true;
video.currentTime = targetTime;
function onSeeked() {
video.removeEventListener("seeked", onSeeked);
seeking = false;
renderFrame(progress);
if (pendingProgress !== null) {
const next = pendingProgress;
pendingProgress = null;
seekAndRender(next);
}
}
video.addEventListener("seeked", onSeeked);
}
let ticking = false;
let smoothY = window.scrollY;
const SMOOTH_FACTOR = mobile ? 0.25 : 1;
function onScroll() {
if (ticking) return;
ticking = true;
requestAnimationFrame(() => {
ticking = false;
if (mobile) {
smoothY += (window.scrollY - smoothY) * SMOOTH_FACTOR;
if (Math.abs(window.scrollY - smoothY) > 1) {
ticking = true;
requestAnimationFrame(() => {
ticking = false;
onScroll();
});
}
} else {
smoothY = window.scrollY;
}
update();
});
}
function update() {
if (wrap.dataset.hiddenByTheme) return;
const bounds = getSectionBounds();
if (!bounds || !ready) {
wrap.style.opacity = "0";
return;
}
const y = mobile ? smoothY : window.scrollY;
const { enterY, peakY, exitY } = bounds;
if (y < enterY || y > exitY) {
wrap.style.opacity = "0";
return;
}
const fadeInZone = mobile ? 150 : 250;
const fadeOutZone = mobile ? 250 : 350;
let opacity = 1;
if (y < enterY + fadeInZone) {
opacity = (y - enterY) / fadeInZone;
} else if (y > exitY - fadeOutZone) {
opacity = (exitY - y) / fadeOutZone;
}
wrap.style.opacity = String(Math.max(0, Math.min(1, opacity)));
let progress;
if (y <= peakY) {
progress = (y - enterY) / (peakY - enterY);
} else {
progress = 1 - (y - peakY) / (exitY - peakY);
}
progress = Math.max(0, Math.min(1, progress));
seekAndRender(progress);
}
let primed = false;
function primeVideo() {
if (primed) return;
primed = true;
const playPromise = video.play();
if (playPromise && typeof playPromise.then === "function") {
playPromise
.then(() => {
video.pause();
video.currentTime = 0;
update();
})
.catch(() => {
function onInteraction() {
document.removeEventListener("touchstart", onInteraction);
document.removeEventListener("scroll", onInteraction);
primed = false;
primeVideo();
}
document.addEventListener("touchstart", onInteraction, { once: true, passive: true });
document.addEventListener("scroll", onInteraction, { once: true, passive: true });
});
}
}
video.addEventListener("loadedmetadata", () => {
duration = video.duration || 0;
if (initDimensions()) {
ready = true;
if (mobile) {
primeVideo();
} else {
video.currentTime = 0;
}
}
});
video.addEventListener("loadeddata", () => {
if (!ready && duration && initDimensions()) {
ready = true;
}
if (mobile && !primed) {
primeVideo();
}
update();
});
window.addEventListener("scroll", onScroll, { passive: true });
return function cleanup() {
window.removeEventListener("scroll", onScroll);
themeObserver.disconnect();
wrap.remove();
video.remove();
frameCache.clear();
};
}