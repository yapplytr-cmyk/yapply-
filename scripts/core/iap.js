/**
 * scripts/core/iap.js
 * Apple In-App Purchases via RevenueCat — iOS app only.
 *
 * The app loads ES modules directly in the WKWebView (no bundler), so we DO NOT
 * `import` the RevenueCat npm package. Instead we call the native Capacitor
 * plugin through window.Capacitor.Plugins.Purchases — the exact same pattern
 * pushNotifications.js uses. The npm package is still listed in package.json so
 * that `npx cap sync` + `pod install` link the native iOS pod at build time.
 *
 * Product id convention — MUST match App Store Connect and the RevenueCat
 * webhook in api/billing.py:
 *   com.yapply.app.membership.<planId>   auto-renewable subscription (starter/pro/elite)
 *   com.yapply.app.tokens.<size>         consumable token pack (small/medium/large)
 */

// RevenueCat iOS public SDK key — starts with "appl_". This is a PUBLISHABLE key
// and is safe to ship inside the app. Get it from:
//   RevenueCat dashboard → Project settings → API keys → Apple App Store (public key).
// You can also set window.__YAPPLY_RC_KEY at runtime to override this.
const REVENUECAT_IOS_API_KEY = "appl_REPLACE_WITH_YOUR_REVENUECAT_KEY";

const MEMBERSHIP_PREFIX = "com.yapply.app.membership.";
const TOKENS_PREFIX = "com.yapply.app.tokens.";
const PACK_SIZE = { "pack-small": "small", "pack-medium": "medium", "pack-large": "large" };

/** Apple product id for a membership plan (starter/pro/elite). */
export function membershipProductId(planId) {
  return MEMBERSHIP_PREFIX + String(planId || "").trim();
}

/** Apple product id for a token pack (pack-small → …tokens.small). */
export function tokenPackProductId(packId) {
  const id = String(packId || "").trim();
  const size = PACK_SIZE[id] || id.replace(/^pack-/, "");
  return TOKENS_PREFIX + size;
}

function isNativeApp() {
  if (typeof window === "undefined") return false;
  try {
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function") {
      return window.Capacitor.isNativePlatform();
    }
  } catch (_) {}
  return (
    window.location.origin === "capacitor://localhost" ||
    (window.location.hostname === "localhost" && !window.location.port)
  );
}

function rcPlugin() {
  try {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases) || null;
  } catch (_) {
    return null;
  }
}

function apiKey() {
  return (typeof window !== "undefined" && window.__YAPPLY_RC_KEY) || REVENUECAT_IOS_API_KEY;
}

/** True only inside the native iOS app with the RevenueCat plugin present + a real key. */
export function iapAvailable() {
  const key = apiKey();
  return Boolean(isNativeApp() && rcPlugin() && key && !key.includes("REPLACE_WITH"));
}

let _configuredFor = null;

/** Configure RevenueCat once, tying purchases to the Supabase user id. */
async function ensureConfigured(userId) {
  const P = rcPlugin();
  if (!P) throw new Error("RevenueCat plugin unavailable");
  const uid = String(userId || "").trim();

  if (_configuredFor === uid) return P;

  if (_configuredFor === null) {
    try { await P.setLogLevel({ level: "WARN" }); } catch (_) {}
    await P.configure({ apiKey: apiKey(), appUserID: uid || undefined });
    _configuredFor = uid || "anon";
  } else if (uid && _configuredFor !== uid) {
    // A different user signed in on the same device — re-identify.
    try {
      await P.logIn({ appUserID: uid });
      _configuredFor = uid;
    } catch (_) {}
  }
  return P;
}

/**
 * Fetch Apple's localized price strings for display.
 * @param {Array<{productId:string,type:"subs"|"inapp"}>} items
 * @returns {Promise<Object<string,string>>} map of productId → priceString (e.g. "₺599,00")
 */
export async function fetchPrices(items, userId) {
  const out = {};
  if (!iapAvailable() || !Array.isArray(items) || !items.length) return out;
  try {
    const P = await ensureConfigured(userId);
    const subs = items.filter((i) => i.type !== "inapp").map((i) => i.productId);
    const inapp = items.filter((i) => i.type === "inapp").map((i) => i.productId);
    const groups = [];
    if (subs.length) groups.push({ ids: subs, type: "subs" });
    if (inapp.length) groups.push({ ids: inapp, type: "inapp" });
    for (const g of groups) {
      const res = await P.getProducts({ productIdentifiers: g.ids, type: g.type });
      const products = (res && res.products) || [];
      for (const p of products) {
        if (p && p.identifier) out[p.identifier] = p.priceString || "";
      }
    }
  } catch (_) {}
  return out;
}

async function purchaseByProductId(productId, type, userId) {
  const P = await ensureConfigured(userId);
  const res = await P.getProducts({ productIdentifiers: [productId], type });
  const product = ((res && res.products) || [])[0];
  if (!product) {
    return { ok: false, code: "PRODUCT_NOT_FOUND", message: "This product isn't available from the App Store yet." };
  }
  try {
    const purchase = await P.purchaseStoreProduct({ product });
    return { ok: true, customerInfo: purchase && purchase.customerInfo, productIdentifier: productId };
  } catch (err) {
    const cancelled =
      err && (err.userCancelled === true || err.code === "PURCHASE_CANCELLED" ||
        /cancel/i.test(String(err.message || "")));
    if (cancelled) return { ok: false, cancelled: true, code: "CANCELLED" };
    return { ok: false, code: err && err.code ? String(err.code) : "PURCHASE_FAILED", message: err && err.message ? String(err.message) : "Purchase failed." };
  }
}

/** Buy a membership subscription (starter/pro/elite). */
export async function purchaseMembership(planId, userId) {
  if (!iapAvailable()) return { ok: false, code: "IAP_UNAVAILABLE", message: "In-app purchases are only available in the iOS app." };
  return purchaseByProductId(membershipProductId(planId), "subs", userId);
}

/** Buy a one-time token pack (pack-small/medium/large). */
export async function purchaseTokenPack(packId, userId) {
  if (!iapAvailable()) return { ok: false, code: "IAP_UNAVAILABLE", message: "In-app purchases are only available in the iOS app." };
  return purchaseByProductId(tokenPackProductId(packId), "inapp", userId);
}

/** Restore previous purchases (required by App Review). */
export async function restorePurchases(userId) {
  if (!iapAvailable()) return { ok: false, code: "IAP_UNAVAILABLE" };
  try {
    const P = await ensureConfigured(userId);
    const res = await P.restorePurchases();
    const info = res && res.customerInfo;
    const active = info && info.entitlements && info.entitlements.active ? Object.keys(info.entitlements.active) : [];
    return { ok: true, activeEntitlements: active, customerInfo: info };
  } catch (err) {
    return { ok: false, code: err && err.code ? String(err.code) : "RESTORE_FAILED", message: err && err.message ? String(err.message) : "Could not restore purchases." };
  }
}

/** Read current entitlement/customer state (used to reflect membership after purchase). */
export async function getCustomerInfo(userId) {
  if (!iapAvailable()) return null;
  try {
    const P = await ensureConfigured(userId);
    const res = await P.getCustomerInfo();
    return (res && res.customerInfo) || null;
  } catch (_) {
    return null;
  }
}
