/**
 * Shared reload button for dashboard pages (İlanlarım, Tekliflerim, Developer Dashboard).
 * Replaces pull-to-refresh with a small animated button in the top-right corner.
 */

const RELOAD_BUTTON_STYLES = `
  .dashboard-reload-btn {
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--surface-100, #f3f4f6);
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: background 180ms ease, transform 100ms ease;
    margin-top: 6px;
  }
  .dashboard-reload-btn:active {
    transform: scale(0.92);
    background: var(--surface-200, #e5e7eb);
  }
  .dashboard-reload-btn svg {
    width: 18px; height: 18px;
    stroke: var(--text-secondary, #9ca3af);
    transition: stroke 200ms ease;
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

/**
 * Returns the HTML for a small reload button.
 * Call `bindDashboardReloadButton()` after injecting into DOM.
 */
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

/**
 * Bind click handler to the reload button. Call this from main.js bindInteractions.
 */
export function bindDashboardReloadButton(renderPageFn) {
  injectReloadStyles();
  const btn = document.querySelector("[data-dashboard-reload]");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (btn.classList.contains("dashboard-reload-btn--spinning")) return;
    btn.classList.add("dashboard-reload-btn--spinning");

    try {
      // Invalidate marketplace cache before re-render
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

    // Keep spin visible for at least 500ms so user sees the feedback
    setTimeout(() => {
      const el = document.querySelector("[data-dashboard-reload]");
      if (el) el.classList.remove("dashboard-reload-btn--spinning");
    }, 500);
  });
}
