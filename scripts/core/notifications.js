const STORAGE_KEY = "yapply-notifications-v1";

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (_) {}
}

export function addNotification(targetUserId, { type, message, href, listingId }) {
  if (!targetUserId) return;
  const store = readStore();
  const list = Array.isArray(store[targetUserId]) ? store[targetUserId] : [];
  list.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    href: href || "",
    listingId: listingId || "",
    createdAt: new Date().toISOString(),
    read: false,
  });
  store[targetUserId] = list.slice(0, 20);
  writeStore(store);
}

export function getNotifications(userId) {
  if (!userId) return [];
  const store = readStore();
  return Array.isArray(store[userId]) ? store[userId] : [];
}

export function getUnreadNotifications(userId) {
  return getNotifications(userId).filter((n) => !n.read);
}

export function markAllRead(userId) {
  if (!userId) return;
  const store = readStore();
  const list = Array.isArray(store[userId]) ? store[userId] : [];
  list.forEach((n) => { n.read = true; });
  store[userId] = list;
  writeStore(store);
}
