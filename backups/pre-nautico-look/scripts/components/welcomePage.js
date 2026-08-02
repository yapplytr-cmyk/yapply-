/**
 * Welcome Page — First screen for unauthenticated native app users.
 * Shows "Yapply'e Hoş Geldiniz" with options to create account, login, or browse as guest.
 */

const WELCOME_BIRD_SVG = `<svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="80" cy="90" rx="36" ry="28" fill="var(--accent, #c9a84c)" opacity="0.15"/>
  <ellipse cx="80" cy="88" rx="30" ry="22" fill="var(--accent, #c9a84c)" opacity="0.08"/>
  <g style="animation:welcome-bird-float 3s ease-in-out infinite">
    <ellipse cx="80" cy="82" rx="28" ry="20" fill="var(--accent, #c9a84c)"/>
    <circle cx="80" cy="60" r="16" fill="var(--accent, #c9a84c)"/>
    <path d="M60 74l-14-8 10 16z" fill="var(--accent-strong, #e0c06d)" opacity="0.7"/>
    <ellipse cx="76" cy="82" rx="10" ry="14" transform="rotate(-20 76 82)" fill="var(--accent-strong, #e0c06d)" opacity="0.5"/>
    <circle cx="87" cy="56" r="3" fill="var(--bg, #060709)"/>
    <circle cx="87" cy="55.5" r="1" fill="#fff" opacity="0.8"/>
    <path d="M94 60l12-5-8 10z" fill="var(--accent-strong, #e0c06d)"/>
    <line x1="72" y1="100" x2="68" y2="116" stroke="var(--accent, #c9a84c)" stroke-width="2" stroke-linecap="round"/>
    <line x1="88" y1="100" x2="92" y2="116" stroke="var(--accent, #c9a84c)" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>`;

export function createWelcomePage(locale) {
  const isTr = locale === "tr";

  return `
    <div class="welcome-page" data-welcome-page>
      <style>
        @keyframes welcome-bird-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes welcome-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>

      <div class="welcome-page__inner">
        <div class="welcome-page__hero" style="animation: welcome-fade-up 0.6s ease both">
          <div class="welcome-page__bird">${WELCOME_BIRD_SVG}</div>
          <h1 class="welcome-page__title">
            ${isTr ? "Yapply'e Hoş Geldiniz" : "Welcome to Yapply"}
          </h1>
          <p class="welcome-page__subtitle">
            ${isTr
              ? "Türkiye'nin premium inşaat pazaryeri"
              : "Turkey's premium construction marketplace"}
          </p>
        </div>

        <div class="welcome-page__actions" style="animation: welcome-fade-up 0.6s ease 0.15s both">
          <button class="welcome-page__btn welcome-page__btn--primary" type="button" data-welcome-action="create-account">
            ${isTr ? "Hesap Oluştur" : "Create Account"}
          </button>
          <button class="welcome-page__btn welcome-page__btn--secondary" type="button" data-welcome-action="login">
            ${isTr ? "Giriş Yap" : "Login"}
          </button>
        </div>

        <button class="welcome-page__skip" type="button" data-welcome-action="guest" style="animation: welcome-fade-up 0.6s ease 0.3s both">
          ${isTr ? "Hesap oluşturmadan devam et" : "Continue without account"}
        </button>
      </div>
    </div>
  `;
}

export function initWelcomePage(navigateTo) {
  const page = document.querySelector("[data-welcome-page]");
  if (!page) return;

  page.querySelectorAll("[data-welcome-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.welcomeAction;

      if (action === "create-account") {
        navigateTo("./create-account.html");
      } else if (action === "login") {
        navigateTo("./login.html");
      } else if (action === "guest") {
        // Mark that user chose to skip — don't show welcome again this session
        try { sessionStorage.setItem("yapply-welcome-dismissed", "1"); } catch (_) {}
        navigateTo("./open-marketplace.html");
      }
    });
  });
}
