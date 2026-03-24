/**
 * notificationBell.js
 * Renders a floating notification bell icon with unread badge
 * and a slide-down notifications inbox panel.
 *
 * On native (has-tab-bar): floating bell at top-right
 * On web: integrated into the navbar area
 */

import { getAuthSession } from "../core/state.js";

const bellIconSVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
</svg>`;

let _bellRoot = null;
let _panelOpen = false;
let _unreadCount = 0;

/**
 * Create and inject the notification bell into the DOM.
 * Call this once after auth is confirmed.
 */
export function createNotificationBell() {
  const session = getAuthSession();
  if (!session?.authenticated || !session?.user?.id) return;

  // Remove existing bell if re-rendering
  _bellRoot?.remove();

  const container = document.createElement("div");
  container.id = "yapply-notification-bell";
  container.className = "notification-bell-container";
  container.innerHTML = `
    <button class="notification-bell__button" type="button" aria-label="Notifications" data-notification-bell-toggle>
      ${bellIconSVG}
      <span class="notification-bell__badge" data-notification-badge style="display:none">0</span>
    </button>
    <div class="notification-panel" data-notification-panel style="display:none">
      <div class="notification-panel__header">
        <span class="notification-panel__title" data-notification-panel-title>Notifications</span>
        <button class="notification-panel__mark-read" type="button" data-notification-mark-all-read>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="notification-panel__close" type="button" data-notification-panel-close>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="notification-panel__list" data-notification-list>
        <div class="notification-panel__empty" data-notification-empty>No notifications yet</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  _bellRoot = container;

  // Toggle panel
  container.querySelector("[data-notification-bell-toggle]").addEventListener("click", (e) => {
    e.stopPropagation();
    togglePanel();
  });

  // Close panel
  container.querySelector("[data-notification-panel-close]").addEventListener("click", (e) => {
    e.stopPropagation();
    closePanel();
  });

  // Mark all read
  container.querySelector("[data-notification-mark-all-read]").addEventListener("click", async (e) => {
    e.stopPropagation();
    const userId = getAuthSession()?.user?.id;
    if (!userId) return;
    try {
      const { markAllRead } = await import("../core/notifications.js");
      await markAllRead(userId);
      updateBadge(0);
      // Re-render list items as read
      container.querySelectorAll(".notification-item--unread").forEach((el) => {
        el.classList.remove("notification-item--unread");
      });
    } catch (_) {}
  });

  // Close panel when clicking outside
  document.addEventListener("click", (e) => {
    if (_panelOpen && !container.contains(e.target)) {
      closePanel();
    }
  });

  // Set locale
  const isTR = document.documentElement.lang === "tr";
  const titleEl = container.querySelector("[data-notification-panel-title]");
  if (titleEl) titleEl.textContent = isTR ? "Bildirimler" : "Notifications";
  const emptyEl = container.querySelector("[data-notification-empty]");
  if (emptyEl) emptyEl.textContent = isTR ? "Henüz bildirim yok" : "No notifications yet";

  return container;
}

/**
 * Toggle the notification panel open/closed.
 */
export function togglePanel() {
  if (_panelOpen) {
    closePanel();
  } else {
    openPanel();
  }
}

/**
 * Open the notification panel and load notifications.
 */
export async function openPanel() {
  if (!_bellRoot) return;
  const panel = _bellRoot.querySelector("[data-notification-panel]");
  if (!panel) return;

  _panelOpen = true;
  panel.style.display = "flex";

  // Load notifications
  const userId = getAuthSession()?.user?.id;
  if (!userId) return;

  try {
    const { getNotifications } = await import("../core/notifications.js");
    const notifications = await getNotifications(userId);
    renderNotificationList(notifications);
  } catch (err) {
    console.warn("[yapply-bell] Failed to load notifications:", err?.message);
  }
}

/**
 * Close the notification panel.
 */
export function closePanel() {
  if (!_bellRoot) return;
  const panel = _bellRoot.querySelector("[data-notification-panel]");
  if (!panel) return;

  _panelOpen = false;
  panel.style.display = "none";
}

/**
 * Update the badge count on the bell icon.
 */
export function updateBadge(count) {
  _unreadCount = count || 0;
  if (!_bellRoot) return;

  const badge = _bellRoot.querySelector("[data-notification-badge]");
  if (!badge) return;

  if (_unreadCount > 0) {
    badge.textContent = _unreadCount > 99 ? "99+" : String(_unreadCount);
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

/**
 * Render notification items in the panel list.
 */
function renderNotificationList(notifications) {
  if (!_bellRoot) return;
  const listEl = _bellRoot.querySelector("[data-notification-list]");
  if (!listEl) return;

  const emptyEl = _bellRoot.querySelector("[data-notification-empty]");
  const isTR = document.documentElement.lang === "tr";

  if (!notifications || notifications.length === 0) {
    listEl.innerHTML = "";
    if (emptyEl) {
      emptyEl.style.display = "block";
      emptyEl.textContent = isTR ? "Henüz bildirim yok" : "No notifications yet";
      listEl.appendChild(emptyEl);
    }
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  const items = notifications.map((n) => {
    const timeAgo = getTimeAgo(n.created_at, isTR);
    const icon = getNotificationIcon(n.type);
    const unreadClass = n.read ? "" : " notification-item--unread";

    return `<div class="notification-item${unreadClass}" data-notification-id="${n.id}" ${n.href ? `data-notification-href="${n.href}"` : ""}>
      <div class="notification-item__icon">${icon}</div>
      <div class="notification-item__content">
        <div class="notification-item__message">${escapeHtml(n.message || n.title || "")}</div>
        <div class="notification-item__time">${timeAgo}</div>
      </div>
    </div>`;
  }).join("");

  listEl.innerHTML = items;

  // Add click handlers for each notification
  listEl.querySelectorAll("[data-notification-id]").forEach((el) => {
    el.addEventListener("click", async () => {
      const notifId = el.getAttribute("data-notification-id");
      const href = el.getAttribute("data-notification-href");
      const userId = getAuthSession()?.user?.id;

      // Mark as read
      if (notifId && userId) {
        try {
          const { markRead } = await import("../core/notifications.js");
          await markRead(notifId, userId);
          el.classList.remove("notification-item--unread");
          _unreadCount = Math.max(0, _unreadCount - 1);
          updateBadge(_unreadCount);
        } catch (_) {}
      }

      // Navigate if href present
      if (href) {
        closePanel();
        window.location.href = href;
      }
    });
  });
}

/**
 * Initialize the notification system: create bell, load count, subscribe to realtime.
 */
export async function initNotificationBell(userId) {
  if (!userId) return;

  createNotificationBell();

  // Load initial unread count
  try {
    const { getUnreadCount, subscribeToNotifications, onNotificationChange } = await import("../core/notifications.js");
    const count = await getUnreadCount(userId);
    updateBadge(count);

    // Subscribe to realtime updates
    await subscribeToNotifications(userId, async () => {
      const newCount = await getUnreadCount(userId);
      updateBadge(newCount);
    });
  } catch (err) {
    console.warn("[yapply-bell] Init error:", err?.message);
  }
}

/**
 * Clean up bell on logout.
 */
export async function destroyNotificationBell() {
  _bellRoot?.remove();
  _bellRoot = null;
  _panelOpen = false;
  _unreadCount = 0;

  try {
    const { unsubscribeFromNotifications } = await import("../core/notifications.js");
    await unsubscribeFromNotifications();
  } catch (_) {}
}

// ── Helpers ──

function getTimeAgo(dateStr, isTR) {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return isTR ? "az önce" : "just now";
  if (diffMin < 60) return isTR ? `${diffMin} dk önce` : `${diffMin}m ago`;
  if (diffHr < 24) return isTR ? `${diffHr} sa önce` : `${diffHr}h ago`;
  if (diffDay < 7) return isTR ? `${diffDay} gün önce` : `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getNotificationIcon(type) {
  switch (type) {
    case "new-bid":
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="12" cy="12" r="4"/></svg>`;
    case "bid-accepted":
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    case "new-review":
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF9800" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    case "listing-closed":
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    default:
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
