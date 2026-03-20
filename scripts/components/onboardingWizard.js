/**
 * Onboarding Wizard — Step-by-step account creation flow for native app.
 * Steps: 1) Theme pick  2) Role pick  3) Form fields  4) Success redirect
 */

/* ── Inline SVG: bird with cool sunglasses (used in "Harika seçim" feedback) ── */
const BIRD_SUNGLASSES_SVG = `<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" style="vertical-align:-0.15em;display:inline-block"><circle cx="12" cy="12" r="11" fill="#e8823a"/><circle cx="12" cy="10" r="6" fill="#f0a040"/><rect x="5" y="8" width="14" height="5" rx="2.5" fill="#222" opacity="0.85"/><circle cx="8.5" cy="10.5" r="2.8" fill="#111" stroke="#333" stroke-width="0.5"/><circle cx="15.5" cy="10.5" r="2.8" fill="#111" stroke="#333" stroke-width="0.5"/><rect x="11.2" y="9.8" width="1.6" height="1.4" rx="0.5" fill="#333"/><circle cx="9" cy="10.5" r="1" fill="rgba(255,255,255,0.15)"/><circle cx="16" cy="10.5" r="1" fill="rgba(255,255,255,0.15)"/><path d="M5.5 9.5l-2-1" stroke="#333" stroke-width="0.6" stroke-linecap="round"/><path d="M18.5 9.5l2-1" stroke="#333" stroke-width="0.6" stroke-linecap="round"/><path d="M15 15l3-1.5-2.5 2.5z" fill="#f0a030"/><circle cx="14" cy="8" r="0.8" fill="#222"/></svg>`;

const BIRD_BUSINESS_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg"><circle cx="100" cy="100" r="96" fill="#f0ebe0" stroke="#333" stroke-width="3"/><ellipse cx="100" cy="120" rx="45" ry="35" fill="#e8823a"/><circle cx="100" cy="80" r="30" fill="#e8823a"/><circle cx="112" cy="72" r="4" fill="#222"/><circle cx="112" cy="72" r="1.5" fill="#fff"/><path d="M126 80l16-6-10 14z" fill="#f0a030"/><rect x="70" y="105" width="60" height="50" rx="6" fill="#6b6e76"/><rect x="85" y="105" width="30" height="50" rx="3" fill="#e8e4dc"/><path d="M85 108h30" stroke="#c9a84c" stroke-width="2"/><path d="M100 108v10" stroke="#c9a84c" stroke-width="2"/></svg>`;

const BIRD_SPORT_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg"><circle cx="100" cy="100" r="96" fill="#e0e8d8" stroke="#333" stroke-width="3"/><ellipse cx="100" cy="120" rx="45" ry="35" fill="#8e4878"/><circle cx="100" cy="80" r="30" fill="#9e5888"/><circle cx="112" cy="72" r="4" fill="#222"/><circle cx="112" cy="72" r="1.5" fill="#fff"/><path d="M126 80l16-6-10 14z" fill="#f0a030"/><rect x="68" y="100" width="64" height="55" rx="6" fill="#2a3560"/><path d="M68 118h64" stroke="#c9a84c" stroke-width="3"/><path d="M68 126h64" stroke="#c9a84c" stroke-width="1.5"/><path d="M88 100v55M112 100v55" stroke="#3a4570" stroke-width="1"/></svg>`;

const BIRD_ARCHITECT_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg"><circle cx="100" cy="100" r="96" fill="#f0e8d0" stroke="#333" stroke-width="3"/><ellipse cx="100" cy="120" rx="45" ry="35" fill="#a0b848"/><circle cx="100" cy="80" r="30" fill="#b0c858"/><circle cx="108" cy="72" r="7" fill="none" stroke="#555" stroke-width="2.5"/><circle cx="120" cy="72" r="7" fill="none" stroke="#555" stroke-width="2.5"/><path d="M96 72h4M117 72h6" stroke="#555" stroke-width="2"/><path d="M126 82l16-6-10 14z" fill="#f0a030"/><rect x="75" y="108" width="50" height="8" rx="3" fill="#8a7a50"/><path d="M80 116l-8 20M120 116l8 20" stroke="#8a7a50" stroke-width="3" stroke-linecap="round"/><rect x="140" y="70" width="12" height="50" rx="3" fill="#6090c0" opacity="0.7"/></svg>`;

const BIRD_HELMET_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg"><circle cx="100" cy="100" r="96" fill="#e0e8f0" stroke="#333" stroke-width="3"/><ellipse cx="100" cy="120" rx="45" ry="35" fill="#e8823a"/><circle cx="100" cy="80" r="30" fill="#e8823a"/><circle cx="112" cy="72" r="4" fill="#222"/><circle cx="112" cy="72" r="1.5" fill="#fff"/><path d="M126 80l16-6-10 14z" fill="#f0a030"/><path d="M72 78c0-16 12-30 28-30s28 14 28 30" fill="#c9a84c" stroke="#a08030" stroke-width="2"/><rect x="68" y="76" width="64" height="8" rx="3" fill="#d4b050"/><rect x="70" y="105" width="60" height="45" rx="5" fill="#4a7a40"/><path d="M90 105v45M110 105v45" stroke="#3a6a30" stroke-width="1"/></svg>`;

/* ── Animated success SVG: Developer bird (hardhat, wrench, sparkles) ── */
const BIRD_DEV_SUCCESS_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg onboarding-success-svg">
  <style>
    @keyframes ob-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes ob-sparkle{0%,100%{opacity:0;transform:scale(0)}50%{opacity:1;transform:scale(1)}}
    @keyframes ob-wrench{0%,100%{transform:rotate(0deg)}25%{transform:rotate(15deg)}75%{transform:rotate(-15deg)}}
    .ob-float{animation:ob-float 2s ease-in-out infinite}
    .ob-sp1{animation:ob-sparkle 1.5s ease-in-out infinite}
    .ob-sp2{animation:ob-sparkle 1.5s ease-in-out 0.3s infinite}
    .ob-sp3{animation:ob-sparkle 1.5s ease-in-out 0.6s infinite}
    .ob-wrench{animation:ob-wrench 1s ease-in-out infinite;transform-origin:150px 130px}
  </style>
  <circle cx="100" cy="100" r="96" fill="#e0e8f0" stroke="#333" stroke-width="3"/>
  <g class="ob-float">
    <ellipse cx="100" cy="125" rx="42" ry="32" fill="#e8823a"/>
    <circle cx="100" cy="82" r="28" fill="#e8823a"/>
    <circle cx="112" cy="74" r="4" fill="#222"/><circle cx="112" cy="74" r="1.5" fill="#fff"/>
    <path d="M126 82l14-5-9 12z" fill="#f0a030"/>
    <path d="M73 80c0-15 12-28 27-28s27 13 27 28" fill="#c9a84c" stroke="#a08030" stroke-width="2"/>
    <rect x="69" y="78" width="62" height="7" rx="3" fill="#d4b050"/>
    <rect x="72" y="108" width="56" height="42" rx="5" fill="#4a7a40"/>
    <path d="M90 108v42M110 108v42" stroke="#3a6a30" stroke-width="1"/>
  </g>
  <g class="ob-wrench" opacity="0.8">
    <rect x="142" y="118" width="6" height="24" rx="2" fill="#888"/>
    <circle cx="145" cy="118" r="7" fill="none" stroke="#888" stroke-width="3"/>
  </g>
  <circle class="ob-sp1" cx="40" cy="35" r="5" fill="#c9a84c"/>
  <circle class="ob-sp2" cx="160" cy="30" r="4" fill="#e8823a"/>
  <circle class="ob-sp3" cx="155" cy="170" r="5" fill="#c9a84c"/>
  <path class="ob-sp1" d="M30 160l4-8 4 8-8-4 8 0z" fill="#e8823a" opacity="0.7"/>
  <path class="ob-sp3" d="M50 55l3-6 3 6-6-3 6 0z" fill="#4a7a40" opacity="0.7"/>
</svg>`;

/* ── Animated success SVG: Client bird (briefcase, confetti) ── */
const BIRD_CLIENT_SUCCESS_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg onboarding-success-svg">
  <style>
    @keyframes ob-float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes ob-confetti1{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(30px) rotate(180deg);opacity:0}}
    @keyframes ob-confetti2{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(25px) rotate(-120deg);opacity:0}}
    @keyframes ob-pop{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
    .ob-float2{animation:ob-float2 2s ease-in-out infinite}
    .ob-c1{animation:ob-confetti1 2s ease-in infinite}
    .ob-c2{animation:ob-confetti2 2s ease-in 0.4s infinite}
    .ob-c3{animation:ob-confetti1 2s ease-in 0.8s infinite}
    .ob-c4{animation:ob-confetti2 2s ease-in 1.2s infinite}
    .ob-pop{animation:ob-pop 0.5s ease-out both}
  </style>
  <circle cx="100" cy="100" r="96" fill="#f0ebe0" stroke="#333" stroke-width="3"/>
  <g class="ob-float2">
    <ellipse cx="100" cy="120" rx="42" ry="32" fill="#e8823a"/>
    <circle cx="100" cy="80" r="28" fill="#e8823a"/>
    <circle cx="112" cy="72" r="4" fill="#222"/><circle cx="112" cy="72" r="1.5" fill="#fff"/>
    <path d="M126 80l14-5-9 12z" fill="#f0a030"/>
    <rect x="72" y="106" width="56" height="42" rx="5" fill="#6b6e76"/>
    <rect x="86" y="106" width="28" height="42" rx="3" fill="#e8e4dc"/>
    <path d="M86 110h28" stroke="#c9a84c" stroke-width="2"/>
    <path d="M100 110v9" stroke="#c9a84c" stroke-width="2"/>
  </g>
  <rect class="ob-c1" x="35" y="25" width="6" height="3" rx="1" fill="#c9a84c"/>
  <rect class="ob-c2" x="155" y="20" width="5" height="3" rx="1" fill="#e8823a"/>
  <rect class="ob-c3" x="45" y="165" width="6" height="3" rx="1" fill="#4a7a40"/>
  <rect class="ob-c4" x="150" y="160" width="5" height="3" rx="1" fill="#c9a84c"/>
  <circle class="ob-c1" cx="170" cy="50" r="3" fill="#e8823a" opacity="0.8"/>
  <circle class="ob-c3" cx="30" cy="140" r="3" fill="#6b6e76" opacity="0.6"/>
</svg>`;

export function createOnboardingWizard(content, locale) {
  const isTr = locale === "tr";

  return `
    <div class="onboarding-wizard" data-onboarding-wizard>
      <!-- Step 1: Theme Selection -->
      <div class="onboarding-step onboarding-step--active" data-onboarding-step="1">
        <div class="onboarding-step__content">
          <div class="onboarding-theme-preview" data-onboarding-theme-preview>
            <svg viewBox="0 0 80 80" class="onboarding-theme-icon">
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
              <path d="M40 4A36 36 0 0 1 40 76z" fill="var(--accent)" opacity="0.2"/>
              <circle cx="40" cy="40" r="14" fill="var(--accent)"/>
            </svg>
          </div>
          <h2 class="onboarding-step__title">${isTr ? "Temayı Seçin" : "Choose Your Theme"}</h2>
          <p class="onboarding-step__desc">${isTr ? "Uygulamayı açık veya koyu modda kullanmak ister misiniz?" : "Would you like to use the app in Light or Dark mode?"}</p>
          <div class="onboarding-theme-buttons">
            <button class="onboarding-theme-btn" type="button" data-onboarding-theme="light">
              <span style="font-size:1.3rem;line-height:1">&#9728;&#65039;</span>
              <span>${isTr ? "Açık Mod" : "Light Mode"}</span>
            </button>
            <button class="onboarding-theme-btn onboarding-theme-btn--active" type="button" data-onboarding-theme="dark">
              <span style="font-size:1.3rem;line-height:1">&#127769;</span>
              <span>${isTr ? "Koyu Mod" : "Dark Mode"}</span>
            </button>
          </div>
          <p class="onboarding-feedback" data-onboarding-feedback hidden></p>
          <button class="button button--primary onboarding-next-btn" type="button" data-onboarding-next="2">
            ${isTr ? "Devam Et" : "Continue"}
          </button>
        </div>
      </div>

      <!-- Step 2: Role Selection -->
      <div class="onboarding-step" data-onboarding-step="2" hidden>
        <div class="onboarding-step__content">
          <h2 class="onboarding-step__title">${isTr ? "Siz Kimsiniz?" : "Who Are You?"}</h2>
          <p class="onboarding-step__desc">${isTr ? "Müşteri misiniz yoksa Geliştirici mi?" : "Are you a Client or a Builder?"}</p>
          <div class="onboarding-role-cards">
            <button class="onboarding-role-card" type="button" data-onboarding-role="client">
              <div class="onboarding-role-card__bird" data-onboarding-bird="client">
                ${BIRD_BUSINESS_SVG}
              </div>
              <span class="onboarding-role-card__label">${isTr ? "Müşteri" : "Client"}</span>
              <span class="onboarding-role-card__desc">${isTr ? "Projeniz için teklif alın" : "Get bids for your project"}</span>
            </button>
            <button class="onboarding-role-card" type="button" data-onboarding-role="developer">
              <div class="onboarding-role-card__bird" data-onboarding-bird="developer">
                ${BIRD_HELMET_SVG}
              </div>
              <span class="onboarding-role-card__label">${isTr ? "Geliştirici" : "Builder"}</span>
              <span class="onboarding-role-card__desc">${isTr ? "İş bulun ve teklifler verin" : "Find work and place bids"}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: Account Form -->
      <div class="onboarding-step" data-onboarding-step="3" hidden>
        <div class="onboarding-step__content">
          <h2 class="onboarding-step__title">${isTr ? "Hesap Bilgileri" : "Account Details"}</h2>
          <p class="onboarding-step__desc" data-onboarding-form-desc></p>

          <form class="onboarding-form" data-onboarding-form novalidate>
            <input type="hidden" name="accountRole" value="client" data-onboarding-role-input />

            <div class="onboarding-form-error" data-onboarding-error hidden>
              <p data-onboarding-error-text></p>
            </div>

            <!-- Shared fields -->
            <label class="onboarding-field">
              <span>${isTr ? "Kullanıcı Adı" : "Username"}</span>
              <input type="text" name="username" placeholder="${isTr ? "kullanıcı adınız" : "your username"}" autocomplete="username" required />
            </label>
            <label class="onboarding-field">
              <span>${isTr ? "Ad Soyad" : "Full Name"}</span>
              <input type="text" name="fullName" placeholder="${isTr ? "Adınız Soyadınız" : "Your full name"}" autocomplete="name" required />
            </label>
            <label class="onboarding-field">
              <span>${isTr ? "E-posta" : "Email"}</span>
              <input type="email" name="email" placeholder="${isTr ? "ornek@mail.com" : "you@email.com"}" autocomplete="email" required />
            </label>
            <label class="onboarding-field">
              <span>${isTr ? "Şifre" : "Password"}</span>
              <input type="password" name="password" placeholder="••••••••" autocomplete="new-password" minlength="8" required />
            </label>
            <label class="onboarding-field">
              <span>${isTr ? "Şifre Tekrar" : "Confirm Password"}</span>
              <input type="password" name="confirmPassword" placeholder="••••••••" autocomplete="new-password" minlength="8" required />
            </label>
            <label class="onboarding-field">
              <span>${isTr ? "Telefon" : "Phone"}</span>
              <input type="tel" name="phoneNumber" placeholder="${isTr ? "+90 5XX XXX XX XX" : "+1 (555) 000-0000"}" autocomplete="tel" />
            </label>

            <!-- Client-specific fields -->
            <div class="onboarding-role-fields" data-onboarding-role-fields="client">
              <label class="onboarding-field">
                <span>${isTr ? "Şehir" : "City"}</span>
                <input type="text" name="preferredRegion" placeholder="${isTr ? "İstanbul, Bodrum..." : "Istanbul, Bodrum..."}" />
              </label>
            </div>

            <!-- Developer-specific fields -->
            <div class="onboarding-role-fields" data-onboarding-role-fields="developer" hidden>
              <label class="onboarding-field">
                <span>${isTr ? "Şirket Adı" : "Company Name"}</span>
                <input type="text" name="companyName" placeholder="${isTr ? "Firma adınız" : "Your company"}" />
              </label>
              <label class="onboarding-field">
                <span>${isTr ? "Hizmet Bölgesi" : "Service Area"}</span>
                <input type="text" name="serviceArea" placeholder="${isTr ? "İstanbul, Bodrum..." : "Istanbul, Bodrum..."}" />
              </label>
              <label class="onboarding-field">
                <span>${isTr ? "Deneyim (Yıl)" : "Years of Experience"}</span>
                <input type="number" name="yearsExperience" min="0" step="1" placeholder="5" />
              </label>
              <label class="onboarding-field">
                <span>${isTr ? "Uzmanlık Alanı" : "Specialty"}</span>
                <input type="text" name="specialties" placeholder="${isTr ? "Villa yapımı, renovasyon..." : "Villa construction, renovation..."}" />
              </label>
            </div>

            <button class="button button--primary onboarding-submit-btn" type="submit">
              ${isTr ? "Hesap Oluştur" : "Create Account"}
            </button>
          </form>
        </div>
      </div>

      <!-- Step 4: Success -->
      <div class="onboarding-step" data-onboarding-step="4" hidden>
        <div class="onboarding-step__content onboarding-success">
          <div class="onboarding-success__bird" data-onboarding-success-bird></div>
          <h2 class="onboarding-step__title" data-onboarding-success-title></h2>
          <p class="onboarding-step__desc" data-onboarding-success-desc></p>
          <button class="button button--primary onboarding-next-btn" type="button" data-onboarding-go>
            ${isTr ? "Başlayalım" : "Let's Go"}
          </button>
        </div>
      </div>

      <!-- Progress dots -->
      <div class="onboarding-dots">
        <span class="onboarding-dot onboarding-dot--active" data-onboarding-dot="1"></span>
        <span class="onboarding-dot" data-onboarding-dot="2"></span>
        <span class="onboarding-dot" data-onboarding-dot="3"></span>
        <span class="onboarding-dot" data-onboarding-dot="4"></span>
      </div>
    </div>
  `;
}

export function initOnboardingWizard(loadAuthApi, setAuthSession, setDocumentAuthState) {
  const wizard = document.querySelector("[data-onboarding-wizard]");
  if (!wizard) return;

  const isTr = document.documentElement.lang === "tr" || localStorage.getItem("yapply-locale") === "tr";
  let currentStep = 1;
  let selectedRole = "client";

  function goToStep(step) {
    // Hide all steps
    wizard.querySelectorAll("[data-onboarding-step]").forEach((el) => {
      el.hidden = true;
      el.classList.remove("onboarding-step--active");
    });
    // Show target step with animation
    const target = wizard.querySelector(`[data-onboarding-step="${step}"]`);
    if (target) {
      target.hidden = false;
      requestAnimationFrame(() => {
        target.classList.add("onboarding-step--active");
      });
    }
    // Update dots
    wizard.querySelectorAll("[data-onboarding-dot]").forEach((dot) => {
      const dotStep = parseInt(dot.dataset.onboardingDot, 10);
      dot.classList.toggle("onboarding-dot--active", dotStep === step);
      dot.classList.toggle("onboarding-dot--done", dotStep < step);
    });
    currentStep = step;
  }

  // Step 1: Theme selection
  wizard.querySelectorAll("[data-onboarding-theme]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.onboardingTheme;
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem("yapply-theme", theme); } catch (_) {}
      wizard.querySelectorAll("[data-onboarding-theme]").forEach((b) => {
        b.classList.toggle("onboarding-theme-btn--active", b === btn);
      });
      // Spin the theme preview circle
      const preview = wizard.querySelector("[data-onboarding-theme-preview]");
      if (preview) {
        preview.classList.remove("onboarding-theme-spin");
        void preview.offsetWidth; // force reflow to restart animation
        preview.classList.add("onboarding-theme-spin");
      }
    });
  });

  // Step 1 → 2 continue button
  const nextTo2 = wizard.querySelector('[data-onboarding-next="2"]');
  if (nextTo2) {
    nextTo2.addEventListener("click", () => {
      // Show feedback
      const feedback = wizard.querySelector("[data-onboarding-feedback]");
      if (feedback) {
        feedback.textContent = isTr ? "Harika seçim 😎" : "Good choice 😎";
        feedback.hidden = false;
        feedback.classList.add("onboarding-feedback--show");
      }
      setTimeout(() => goToStep(2), 800);
    });
  }

  // Step 2: Role selection
  wizard.querySelectorAll("[data-onboarding-role]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedRole = card.dataset.onboardingRole;

      // Highlight selected
      wizard.querySelectorAll("[data-onboarding-role]").forEach((c) => {
        c.classList.toggle("onboarding-role-card--selected", c === card);
      });

      // Bounce animation on bird
      const bird = card.querySelector("[data-onboarding-bird]");
      if (bird) {
        bird.classList.add("onboarding-bird--bounce");
        bird.addEventListener("animationend", () => {
          bird.classList.remove("onboarding-bird--bounce");
        }, { once: true });
      }

      // Set role in form
      const roleInput = wizard.querySelector("[data-onboarding-role-input]");
      if (roleInput) roleInput.value = selectedRole;

      // Show/hide role-specific fields
      wizard.querySelectorAll("[data-onboarding-role-fields]").forEach((group) => {
        const isMatch = group.dataset.onboardingRoleFields === selectedRole;
        group.hidden = !isMatch;
        group.querySelectorAll("input, select, textarea").forEach((f) => {
          f.disabled = !isMatch;
        });
      });

      // Update form description
      const desc = wizard.querySelector("[data-onboarding-form-desc]");
      if (desc) {
        desc.textContent = selectedRole === "developer"
          ? (isTr ? "İşletme bilgilerinizi girin" : "Enter your business details")
          : (isTr ? "Kişisel bilgilerinizi girin" : "Enter your personal details");
      }

      // Go to step 3 after brief delay
      setTimeout(() => goToStep(3), 500);
    });
  });

  // Step 3: Form submission
  const form = wizard.querySelector("[data-onboarding-form]");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const errorEl = wizard.querySelector("[data-onboarding-error]");
      const errorText = wizard.querySelector("[data-onboarding-error-text]");
      if (errorEl) errorEl.hidden = true;

      // Validate passwords match
      const pw = form.querySelector('[name="password"]');
      const cpw = form.querySelector('[name="confirmPassword"]');
      if (pw && cpw && pw.value !== cpw.value) {
        if (errorEl && errorText) {
          errorText.textContent = isTr ? "Şifreler eşleşmiyor" : "Passwords do not match";
          errorEl.hidden = false;
        }
        return;
      }

      const submitBtn = form.querySelector(".onboarding-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isTr ? "Oluşturuluyor..." : "Creating...";
      }

      try {
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        const authApi = await loadAuthApi();
        if (!authApi) throw new Error("Auth unavailable");

        const user = await authApi.signupAccount(payload);
        const session = await authApi.fetchAuthSession();

        if (session?.authenticated && session?.user) {
          setAuthSession(session);
          setDocumentAuthState(session);
        }

        // Show success step
        const successBird = wizard.querySelector("[data-onboarding-success-bird]");
        const successTitle = wizard.querySelector("[data-onboarding-success-title]");
        const successDesc = wizard.querySelector("[data-onboarding-success-desc]");
        const goBtn = wizard.querySelector("[data-onboarding-go]");

        if (successBird) {
          successBird.innerHTML = selectedRole === "developer" ? BIRD_DEV_SUCCESS_SVG : BIRD_CLIENT_SUCCESS_SVG;
        }

        if (selectedRole === "developer") {
          if (successTitle) successTitle.textContent = isTr ? "Hoş geldiniz!" : "Welcome!";
          if (successDesc) successDesc.textContent = isTr
            ? "İlk ilanınıza göz atın ve teklif verin"
            : "Browse and bid on your first listing";
        } else {
          if (successTitle) successTitle.textContent = isTr ? "Hoş geldiniz!" : "Welcome!";
          if (successDesc) successDesc.textContent = isTr
            ? "İlk proje ilanınızı oluşturun"
            : "Create your first project listing";
        }

        if (goBtn) {
          goBtn.addEventListener("click", () => {
            const target = selectedRole === "developer"
              ? "./open-marketplace.html"
              : "./client-project-submission.html";
            if (typeof window.navigateTo === "function") {
              window.navigateTo(target);
            } else {
              window.location.href = target;
            }
          });
        }

        goToStep(4);
      } catch (err) {
        if (errorEl && errorText) {
          errorText.textContent = err?.message || (isTr ? "Bir hata oluştu" : "An error occurred");
          errorEl.hidden = false;
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = isTr ? "Hesap Oluştur" : "Create Account";
        }
      }
    });
  }
}
