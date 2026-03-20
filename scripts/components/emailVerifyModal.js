/**
 * Email Verification Modal — isolated popup for OTP code entry after signup.
 *
 * Usage:
 *   import { showEmailVerifyModal } from "./emailVerifyModal.js";
 *   showEmailVerifyModal({ email, role, password, onVerified, content });
 */

/* ── Bird SVG (Yapply mascot with envelope) ────────────── */
const BIRD_SVG = `<svg viewBox="0 0 120 120" width="96" height="96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- Body -->
  <ellipse cx="60" cy="62" rx="30" ry="32" fill="#4A7EC7"/>
  <!-- Belly -->
  <ellipse cx="60" cy="72" rx="18" ry="16" fill="#89B8E8"/>
  <!-- Hard hat -->
  <ellipse cx="60" cy="34" rx="22" ry="10" fill="#E8C840"/>
  <rect x="38" y="28" width="44" height="8" rx="2" fill="#E8C840"/>
  <rect x="54" y="20" width="12" height="10" rx="2" fill="#E8C840"/>
  <!-- Hat brim -->
  <rect x="34" y="34" width="52" height="4" rx="2" fill="#D4A828"/>
  <!-- Y logo on hat -->
  <text x="60" y="33" text-anchor="middle" fill="#3A6AAF" font-size="10" font-weight="bold" font-family="system-ui">Y</text>
  <!-- Eyes -->
  <circle cx="50" cy="48" r="5" fill="white"/>
  <circle cx="70" cy="48" r="5" fill="white"/>
  <circle cx="51" cy="48" r="2.5" fill="#1A1A2E"/>
  <circle cx="71" cy="48" r="2.5" fill="#1A1A2E"/>
  <!-- Beak -->
  <polygon points="60,56 54,62 66,62" fill="#E8A020"/>
  <!-- Wing (right, holding envelope) -->
  <ellipse cx="88" cy="65" rx="12" ry="8" fill="#3A6AAF" transform="rotate(-15 88 65)"/>
  <!-- Envelope -->
  <rect x="78" y="72" width="22" height="15" rx="2" fill="white" stroke="#D4A828" stroke-width="1.5"/>
  <polyline points="78,72 89,81 100,72" fill="none" stroke="#D4A828" stroke-width="1.5" stroke-linejoin="round"/>
  <!-- Belt -->
  <rect x="42" y="84" width="36" height="4" rx="2" fill="#8B6914"/>
  <rect x="56" y="83" width="8" height="6" rx="1" fill="#D4A828"/>
  <!-- Feet -->
  <rect x="48" y="92" width="6" height="6" rx="1" fill="#E8A020"/>
  <rect x="66" y="92" width="6" height="6" rx="1" fill="#E8A020"/>
</svg>`;

/* ── Mask email for display ───────────────────────────── */
function maskEmail(email) {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.length <= 2 ? local : local[0] + "•".repeat(Math.min(local.length - 2, 4)) + local[local.length - 1];
  return `${visible}@${domain}`;
}

/* ── Create & show modal ──────────────────────────────── */
export function showEmailVerifyModal({ email, role, password, onVerified, content }) {
  // Remove any existing modal
  const existing = document.getElementById("yapply-email-verify-modal");
  if (existing) existing.remove();

  const lang = document.documentElement.lang === "tr" ? "tr" : "en";
  const labels = {
    en: {
      title: "Confirm your email",
      subtitle: "We sent a 8-digit verification code to",
      inputPlaceholder: "Enter code",
      verify: "Verify",
      resend: "Resend code",
      resent: "Code resent!",
      invalidCode: "Invalid or expired code. Please try again.",
      verifying: "Verifying…",
      resending: "Resending…",
    },
    tr: {
      title: "E-postanızı doğrulayın",
      subtitle: "8 haneli doğrulama kodu gönderildi:",
      inputPlaceholder: "Kodu girin",
      verify: "Doğrula",
      resend: "Kodu tekrar gönder",
      resent: "Kod tekrar gönderildi!",
      invalidCode: "Geçersiz veya süresi dolmuş kod. Lütfen tekrar deneyin.",
      verifying: "Doğrulanıyor…",
      resending: "Gönderiliyor…",
    },
  };
  const t = labels[lang] || labels.en;
  const masked = maskEmail(email);

  /* ── Build DOM ───────────────────────────────────────── */
  const overlay = document.createElement("div");
  overlay.id = "yapply-email-verify-modal";
  overlay.className = "yapply-verify-overlay";
  overlay.innerHTML = `
    <div class="yapply-verify-card" role="dialog" aria-modal="true" aria-label="${t.title}">
      <div class="yapply-verify-bird">${BIRD_SVG}</div>
      <h2 class="yapply-verify-title">${t.title}</h2>
      <p class="yapply-verify-subtitle">${t.subtitle}<br><strong>${masked}</strong></p>
      <div class="yapply-verify-input-wrap">
        <input
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="8"
          pattern="[0-9]*"
          class="yapply-verify-input"
          aria-label="${t.inputPlaceholder}"
        />
      </div>
      <div class="yapply-verify-error" hidden></div>
      <button class="button button--primary yapply-verify-btn" type="button">${t.verify}</button>
      <button class="yapply-verify-resend" type="button">${t.resend}</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Force reflow then animate in
  overlay.offsetHeight;
  overlay.classList.add("yapply-verify-overlay--visible");

  /* ── Refs ─────────────────────────────────────────────── */
  const input = overlay.querySelector(".yapply-verify-input");
  const verifyBtn = overlay.querySelector(".yapply-verify-btn");
  const resendBtn = overlay.querySelector(".yapply-verify-resend");
  const errorEl = overlay.querySelector(".yapply-verify-error");

  input.focus();

  /* ── State ────────────────────────────────────────────── */
  let busy = false;

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function setLoading(btn, loading, text) {
    if (loading) {
      btn.dataset.loading = "true";
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      if (text) btn.textContent = text;
    } else {
      btn.removeAttribute("data-loading");
      btn.removeAttribute("aria-busy");
      btn.disabled = false;
    }
  }

  function closeModal() {
    overlay.classList.remove("yapply-verify-overlay--visible");
    setTimeout(() => overlay.remove(), 300);
  }

  /* ── Verify handler ──────────────────────────────────── */
  async function doVerify() {
    if (busy) return;
    const code = input.value.replace(/\s/g, "").trim();
    if (!code || code.length < 6 || code.length > 8) {
      showError(t.invalidCode);
      input.focus();
      return;
    }
    busy = true;
    clearError();
    setLoading(verifyBtn, true, t.verifying);

    try {
      const authApi = await import("../core/auth.js");
      const user = await authApi.verifySignupOtp(email, code, password);
      closeModal();
      if (onVerified) onVerified(user);
    } catch (err) {
      showError(err?.message || t.invalidCode);
      setLoading(verifyBtn, false);
      verifyBtn.textContent = t.verify;
      input.value = "";
      input.focus();
    } finally {
      busy = false;
    }
  }

  verifyBtn.addEventListener("click", doVerify);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doVerify();
  });

  // Auto-format: only allow digits, auto-submit at 6
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "").slice(0, 8);
    clearError();
  });

  /* ── Resend handler ──────────────────────────────────── */
  resendBtn.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    setLoading(resendBtn, true, t.resending);

    try {
      const authApi = await import("../core/auth.js");
      await authApi.resendSignupOtp(email);
      resendBtn.textContent = t.resent;
      setTimeout(() => {
        resendBtn.textContent = t.resend;
      }, 3000);
    } catch (err) {
      showError(err?.message || "Resend failed.");
    } finally {
      setLoading(resendBtn, false);
      busy = false;
    }
  });

  return { close: closeModal };
}
