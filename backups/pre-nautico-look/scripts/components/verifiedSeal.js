/**
 * scripts/components/verifiedSeal.js
 * Premium gold "verified member" seal graphic, overlaid on the bottom-right
 * corner of a profile avatar when a professional holds a paid membership.
 *
 * Returns two helpers:
 *   verifiedSealMarkup(locale)     -> the seal <span> (absolutely positioned)
 *   wrapAvatarWithSeal(imgHtml, seal) -> wraps an <img> so the seal overlays it
 */

// 12-point scalloped seal outline (viewBox 0 0 48 48), matches the classic
// verified-badge burst. Precomputed so no runtime geometry is needed.
const SEAL_PATH =
  "M 24.00 2.00 L 28.79 6.13 L 35.00 4.95 L 37.08 10.92 L 43.05 13.00 " +
  "L 41.87 19.21 L 46.00 24.00 L 41.87 28.79 L 43.05 35.00 L 37.08 37.08 " +
  "L 35.00 43.05 L 28.79 41.87 L 24.00 46.00 L 19.21 41.87 L 13.00 43.05 " +
  "L 10.92 37.08 L 4.95 35.00 L 6.13 28.79 L 2.00 24.00 L 6.13 19.21 " +
  "L 4.95 13.00 L 10.92 10.92 L 13.00 4.95 L 19.21 6.13 L 24.00 2.00 Z";

/** The gold seal graphic. Caller wraps the avatar in a position:relative box. */
export function verifiedSealMarkup(locale) {
  const title = locale === "tr" ? "Doğrulanmış Üye" : "Verified Member";
  return `<span class="yapply-verified-seal" title="${title}" aria-label="${title}" style="position:absolute;right:-2px;bottom:-2px;width:36%;min-width:15px;max-width:40px;line-height:0;pointer-events:none;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35))"><svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ypVerifiedSeal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2d888"/><stop offset="0.55" stop-color="#cba94f"/><stop offset="1" stop-color="#a8842f"/></linearGradient></defs><path d="${SEAL_PATH}" fill="url(#ypVerifiedSeal)" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 24.4l5.4 5.4 11.8-12.6" fill="none" stroke="#ffffff" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}

/** Wrap an avatar <img> string so the seal overlays its corner. */
export function wrapAvatarWithSeal(imgHtml, sealHtml) {
  if (!sealHtml) return imgHtml;
  return `<span class="yapply-avatar-sealed" style="position:relative;display:inline-flex;line-height:0">${imgHtml}${sealHtml}</span>`;
}

/** Compact inline gold "verified" check badge — for placing next to a name or amount. */
export function verifiedCheckBadge(locale) {
  const label = locale === "tr" ? "Doğrulanmış" : "Verified";
  return `<span class="yapply-verified-chip" title="${locale === "tr" ? "Doğrulanmış Üye" : "Verified Member"}" style="display:inline-flex;align-items:center;gap:3px;background:linear-gradient(135deg,#c9a84c,#e6c76a);color:#14161b;font-size:0.6rem;font-weight:800;letter-spacing:0.02em;padding:2px 7px;border-radius:999px;vertical-align:middle;margin-left:6px;box-shadow:0 1px 5px rgba(201,168,76,0.4)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>${label}</span>`;
}
