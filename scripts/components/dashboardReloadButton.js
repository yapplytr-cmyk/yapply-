const RELOAD_BUTTON_STYLES = `
.dashboard-reload-btn {
flex-shrink: 0;
display: flex; align-items: center; justify-content: center;
width: 38px; height: 38px; border-radius: 10px;
background: transparent;
border: none;
cursor: pointer; -webkit-tap-highlight-color: transparent;
transition: opacity 180ms ease, transform 100ms ease;
margin-top: 6px;
}
.dashboard-reload-btn:active {
transform: scale(0.92);
opacity: 0.6;
}
.dashboard-reload-btn svg {
width: 20px; height: 20px;
stroke: var(--text-primary, #111);
transition: stroke 200ms ease;
}
[data-theme="dark"] .dashboard-reload-btn svg,
.dark .dashboard-reload-btn svg {
stroke: #fff;
}
[data-theme="light"] .dashboard-reload-btn svg,
.light .dashboard-reload-btn svg {
stroke: #111;
}
.dashboard-reload-btn--spinning svg {
animation: dashboard-reload-spin 700ms cubic-bezier(0.4, 0, 0.2, 1);
stroke: var(--accent, #c9a84c);
}
@keyframes dashboard-reload-spin {
0% { transform: rotate(0deg); }
100% { transform: rotate(360deg); }
}
`;
let _reloadStylesInjected = false;
function injectReloadStyles() {
if (_reloadStylesInjected) return;
_reloadStylesInjected = true;
const s = document.createElement("style");
s.textContent = RELOAD_BUTTON_STYLES;
document.head.appendChild(s);
}
export function createDashboardReloadButton() {
return `
<button class="dashboard-reload-btn" type="button" data-dashboard-reload aria-label="Reload">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<polyline points="23 4 23 10 17 10"/>
<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
</svg>
</button>
`;
}
export function bindDashboardReloadButton(renderPageFn) {
injectReloadStyles();
const btn = document.querySelector("[data-dashboard-reload]");
if (!btn) return;
btn.addEventListener("click", async () => {
if (btn.classList.contains("dashboard-reload-btn--spinning")) return;
btn.classList.add("dashboard-reload-btn--spinning");
try {
try {
const { invalidateMarketplaceRequestCache } = await import("../core/marketplaceStore.js");
invalidateMarketplaceRequestCache();
} catch (_) {}
if (typeof renderPageFn === "function") {
await renderPageFn();
} else if (window.__yapplyRenderPage) {
await window.__yapplyRenderPage();
}
} catch (_) {}
setTimeout(() => {
const el = document.querySelector("[data-dashboard-reload]");
if (el) el.classList.remove("dashboard-reload-btn--spinning");
}, 500);
});
}