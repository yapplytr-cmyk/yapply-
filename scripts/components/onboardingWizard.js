/**
 * Onboarding Wizard — Step-by-step account creation flow for native app.
 * Steps: 1) Theme pick  2) Role pick  3) Form fields  4) Email verification  5) Success redirect
 */

/* ── Inline SVG: bird with cool sunglasses (used in "Harika seçim" feedback) ── */
const BIRD_SUNGLASSES_SVG = `<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" style="vertical-align:-0.15em;display:inline-block"><circle cx="12" cy="12" r="11" fill="#e8823a"/><circle cx="12" cy="10" r="6" fill="#f0a040"/><rect x="5" y="8" width="14" height="5" rx="2.5" fill="#222" opacity="0.85"/><circle cx="8.5" cy="10.5" r="2.8" fill="#111" stroke="#333" stroke-width="0.5"/><circle cx="15.5" cy="10.5" r="2.8" fill="#111" stroke="#333" stroke-width="0.5"/><rect x="11.2" y="9.8" width="1.6" height="1.4" rx="0.5" fill="#333"/><circle cx="9" cy="10.5" r="1" fill="rgba(255,255,255,0.15)"/><circle cx="16" cy="10.5" r="1" fill="rgba(255,255,255,0.15)"/><path d="M5.5 9.5l-2-1" stroke="#333" stroke-width="0.6" stroke-linecap="round"/><path d="M18.5 9.5l2-1" stroke="#333" stroke-width="0.6" stroke-linecap="round"/><path d="M15 15l3-1.5-2.5 2.5z" fill="#f0a030"/><circle cx="14" cy="8" r="0.8" fill="#222"/></svg>`;

const BIRD_BUSINESS_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg"><circle cx="100" cy="100" r="96" fill="#f0ebe0" stroke="#333" stroke-width="3"/><ellipse cx="100" cy="120" rx="45" ry="35" fill="#e8823a"/><circle cx="100" cy="80" r="30" fill="#e8823a"/><circle cx="112" cy="72" r="4" fill="#222"/><circle cx="112" cy="72" r="1.5" fill="#fff"/><path d="M126 80l16-6-10 14z" fill="#f0a030"/><rect x="70" y="105" width="60" height="50" rx="6" fill="#6b6e76"/><rect x="85" y="105" width="30" height="50" rx="3" fill="#e8e4dc"/><path d="M85 108h30" stroke="#c9a84c" stroke-width="2"/><path d="M100 108v10" stroke="#c9a84c" stroke-width="2"/></svg>`;

const BIRD_SPORT_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg"><circle cx="100" cy="100" r="96" fill="#e0e8d8" stroke="#333" stroke-width="3"/><ellipse cx="100" cy="120" rx="45" ry="35" fill="#8e4878"/><circle cx="100" cy="80" r="30" fill="#9e5888"/><circle cx="112" cy="72" r="4" fill="#222"/><circle cx="112" cy="72" r="1.5" fill="#fff"/><path d="M126 80l16-6-10 14z" fill="#f0a030"/><rect x="68" y="100" width="64" height="55" rx="6" fill="#2a3560"/><path d="M68 118h64" stroke="#c9a84c" stroke-width="3"/><path d="M68 126h64" stroke="#c9a84c" stroke-width="1.5"/><path d="M88 100v55M112 100v55" stroke="#3a4570" stroke-width="1"/></svg>`;

const BRIEFCASE_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg"><circle cx="100" cy="100" r="96" fill="#f0e8d0" stroke="#333" stroke-width="3"/><rect x="50" y="85" width="100" height="70" rx="10" fill="#c9a84c" stroke="#a08030" stroke-width="2.5"/><path d="M78 85V72a22 22 0 0144 0v13" fill="none" stroke="#a08030" stroke-width="3" stroke-linecap="round"/><rect x="50" y="108" width="100" height="6" rx="2" fill="#d4b050"/><rect x="88" y="102" width="24" height="16" rx="4" fill="#f5e6a3" stroke="#a08030" stroke-width="1.5"/><circle cx="100" cy="110" r="3" fill="#a08030"/></svg>`;

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

/* ── Bird with envelope (email verification step) ── */
const BIRD_EMAIL_SVG = `<svg viewBox="0 0 200 200" class="onboarding-bird-svg">
  <style>
    @keyframes ob-envelope-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}
    .ob-envelope-bob{animation:ob-envelope-bob 2s ease-in-out infinite}
  </style>
  <circle cx="100" cy="100" r="96" fill="#e8f0e0" stroke="#333" stroke-width="3"/>
  <g class="ob-envelope-bob">
    <ellipse cx="100" cy="120" rx="42" ry="32" fill="#e8823a"/>
    <circle cx="100" cy="80" r="28" fill="#e8823a"/>
    <circle cx="112" cy="72" r="4" fill="#222"/><circle cx="112" cy="72" r="1.5" fill="#fff"/>
    <path d="M126 80l14-5-9 12z" fill="#f0a030"/>
  </g>
  <!-- Envelope in bird's wing area -->
  <g transform="translate(60, 115)">
    <rect x="0" y="0" width="80" height="52" rx="6" fill="#f5f0e0" stroke="#c9a84c" stroke-width="2"/>
    <path d="M0 0l40 28 40-28" fill="none" stroke="#c9a84c" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M0 52l28-20M80 52l-28-20" fill="none" stroke="#c9a84c" stroke-width="1.5" stroke-linecap="round"/>
    <!-- @ symbol on envelope -->
    <text x="40" y="38" text-anchor="middle" fill="#c9a84c" font-size="18" font-weight="bold" font-family="system-ui">@</text>
  </g>
</svg>`;

export function createOnboardingWizard(content, locale) {
  const isTr = locale === "tr";

  return `
    <div class="onboarding-wizard" data-onboarding-wizard>
      <!-- Step 1: Language Selection -->
      <div class="onboarding-step onboarding-step--active" data-onboarding-step="1">
        <div class="onboarding-step__content">
          <div style="font-size:3rem;margin-bottom:0.5rem;text-align:center">&#127760;</div>
          <h2 class="onboarding-step__title">Dil Seçin / Choose Language</h2>
          <p class="onboarding-step__desc">Uygulamayı hangi dilde kullanmak istersiniz?</p>
          <div class="onboarding-theme-buttons">
            <button class="onboarding-theme-btn onboarding-theme-btn--active" type="button" data-onboarding-lang="tr">
              <span style="font-size:1.3rem;line-height:1">&#127481;&#127479;</span>
              <span>Türkçe</span>
            </button>
            <button class="onboarding-theme-btn" type="button" data-onboarding-lang="en">
              <span style="font-size:1.3rem;line-height:1">&#127468;&#127463;</span>
              <span>English</span>
            </button>
          </div>
          <button class="button button--primary onboarding-next-btn" type="button" data-onboarding-next="2">
            Devam Et / Continue
          </button>
        </div>
      </div>

      <!-- Step 2: Theme Selection -->
      <div class="onboarding-step" data-onboarding-step="2" hidden>
        <div class="onboarding-step__content">
          <div class="onboarding-theme-preview" data-onboarding-theme-preview>
            <svg viewBox="0 0 80 80" class="onboarding-theme-icon">
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
              <path d="M40 4A36 36 0 0 1 40 76z" fill="var(--accent)" opacity="0.2"/>
              <circle cx="40" cy="40" r="14" fill="var(--accent)"/>
            </svg>
          </div>
          <h2 class="onboarding-step__title" data-onboarding-theme-title>${isTr ? "Temayı Seçin" : "Choose Your Theme"}</h2>
          <p class="onboarding-step__desc" data-onboarding-theme-desc>${isTr ? "Uygulamayı açık veya koyu modda kullanmak ister misiniz?" : "Would you like to use the app in Light or Dark mode?"}</p>
          <div class="onboarding-theme-buttons">
            <button class="onboarding-theme-btn" type="button" data-onboarding-theme="light">
              <span style="font-size:1.3rem;line-height:1">&#9728;&#65039;</span>
              <span data-onboarding-theme-light-label>${isTr ? "Açık Mod" : "Light Mode"}</span>
            </button>
            <button class="onboarding-theme-btn onboarding-theme-btn--active" type="button" data-onboarding-theme="dark">
              <span style="font-size:1.3rem;line-height:1">&#127769;</span>
              <span data-onboarding-theme-dark-label>${isTr ? "Koyu Mod" : "Dark Mode"}</span>
            </button>
          </div>
          <p class="onboarding-feedback" data-onboarding-feedback hidden></p>
          <button class="button button--primary onboarding-next-btn" type="button" data-onboarding-next="3" data-onboarding-theme-continue>
            ${isTr ? "Devam Et" : "Continue"}
          </button>
        </div>
      </div>

      <!-- Step 3: Role Selection -->
      <div class="onboarding-step" data-onboarding-step="3" hidden>
        <div class="onboarding-step__content">
          <h2 class="onboarding-step__title">${isTr ? "Siz Kimsiniz?" : "Who Are You?"}</h2>
          <p class="onboarding-step__desc">${isTr ? "Müşteri misiniz yoksa Profesyonel mi?" : "Are you a Client or a Builder?"}</p>
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
              <span class="onboarding-role-card__label">${isTr ? "Profesyonel" : "Professional"}</span>
              <span class="onboarding-role-card__desc">${isTr ? "İş bulun ve teklifler verin" : "Find work and place bids"}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Step 4: Developer Type (Bireysel / İşletme) — only shown for developers -->
      <div class="onboarding-step" data-onboarding-step="4" hidden>
        <div class="onboarding-step__content">
          <h2 class="onboarding-step__title" data-onboarding-devtype-title>${isTr ? "Hesap Türü" : "Account Type"}</h2>
          <p class="onboarding-step__desc" data-onboarding-devtype-desc>${isTr ? "Bireysel mi yoksa işletme olarak mı kayıt oluyorsunuz?" : "Are you registering as an individual or a business?"}</p>
          <div class="onboarding-role-cards">
            <button class="onboarding-role-card" type="button" data-onboarding-devtype="individual">
              <div class="onboarding-role-card__bird">
                ${BIRD_SPORT_SVG}
              </div>
              <span class="onboarding-role-card__label">${isTr ? "Bireysel" : "Individual"}</span>
              <span class="onboarding-role-card__desc">${isTr ? "Kendi adınıza iş yapın" : "Work under your own name"}</span>
            </button>
            <button class="onboarding-role-card" type="button" data-onboarding-devtype="business">
              <div class="onboarding-role-card__bird">
                ${BRIEFCASE_SVG}
              </div>
              <span class="onboarding-role-card__label">${isTr ? "İşletme" : "Business"}</span>
              <span class="onboarding-role-card__desc">${isTr ? "Şirketiniz adına kayıt olun" : "Register as a company"}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Step 5: Account Form -->
      <div class="onboarding-step" data-onboarding-step="5" hidden>
        <div class="onboarding-step__content">
          <h2 class="onboarding-step__title">${isTr ? "Hesap Bilgileri" : "Account Details"}</h2>
          <p class="onboarding-step__desc" data-onboarding-form-desc></p>

          <form class="onboarding-form" data-onboarding-form novalidate>
            <input type="hidden" name="accountRole" value="client" data-onboarding-role-input />
            <input type="hidden" name="developerType" value="" data-onboarding-devtype-input />

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
              <input type="tel" name="phoneNumber" placeholder="+90 5XX XXX XX XX" autocomplete="tel" />
            </label>

            <!-- Client-specific fields -->
            <div class="onboarding-role-fields" data-onboarding-role-fields="client">
              <label class="onboarding-field">
                <span>${isTr ? "Şehir" : "City"}</span>
                <input type="text" name="preferredRegion" placeholder="${isTr ? "İstanbul, Bodrum..." : "Istanbul, Bodrum..."}" />
              </label>
            </div>

            <!-- Developer shared fields -->
            <div class="onboarding-role-fields" data-onboarding-role-fields="developer" hidden>
              <label class="onboarding-field">
                <span>${isTr ? "Şirket / Profesyonel Adı" : "Company / Professional Name"}</span>
                <input type="text" name="companyName" placeholder="${isTr ? "Firma veya profesyonel adınız" : "Your company or professional name"}" />
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

              <!-- Business-specific extra fields -->
              <div data-onboarding-business-fields hidden>
                <label class="onboarding-field">
                  <span>${isTr ? "İşletme Adı" : "Business Name"}</span>
                  <input type="text" name="businessName" placeholder="${isTr ? "Şirket adınız" : "Your business name"}" />
                </label>
                <label class="onboarding-field">
                  <span>${isTr ? "İşletme Web Sitesi" : "Business Website"}</span>
                  <input type="url" name="businessWebsite" placeholder="https://example.com" />
                </label>
                <label class="onboarding-field">
                  <span>${isTr ? "İşletme Konumu" : "Business Location(s)"}</span>
                  <input type="text" name="businessLocations" placeholder="${isTr ? "İstanbul, Bodrum..." : "Istanbul, Bodrum..."}" />
                </label>
                <label class="onboarding-field">
                  <span>${isTr ? "İşletme Açıklaması" : "Business Description"}</span>
                  <textarea name="businessDescription" rows="3" placeholder="${isTr ? "Şirketiniz hakkında kısa bilgi..." : "Brief description of your business..."}"></textarea>
                </label>
                <label class="onboarding-field">
                  <span>${isTr ? "Portföy Linki (İsteğe Bağlı)" : "Portfolio Link (Optional)"}</span>
                  <input type="url" name="portfolioLink" placeholder="https://portfolio.com" />
                </label>
                <div class="onboarding-field">
                  <span>${isTr ? "İşletme Fotoğrafları (En fazla 3)" : "Business Photos (Up to 3)"}</span>
                  <input type="file" name="businessPhotos" accept="image/*" multiple data-onboarding-business-photos style="margin-top:6px" />
                  <div data-onboarding-business-photos-preview style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"></div>
                </div>
              </div>

              <!-- Individual-specific extra fields -->
              <div data-onboarding-individual-fields hidden>
                <label class="onboarding-field">
                  <span>${isTr ? "Portföy Linki (İsteğe Bağlı)" : "Portfolio Link (Optional)"}</span>
                  <input type="url" name="individualPortfolioLink" placeholder="https://portfolio.com" />
                </label>
                <div class="onboarding-field" data-onboarding-selfie-section>
                  <span>${isTr ? "Selfie (Zorunlu)" : "Selfie (Required)"}</span>
                  <!-- Native app: camera UI -->
                  <div data-onboarding-selfie-camera-ui>
                    <p style="font-size:0.8rem;color:var(--text-muted);margin:4px 0 8px">${isTr ? "Ön kamerayla bir selfie çekin" : "Take a selfie with the front camera"}</p>
                    <video data-onboarding-selfie-video autoplay playsinline muted style="width:100%;max-width:280px;border-radius:var(--radius-sm);display:none"></video>
                    <canvas data-onboarding-selfie-canvas style="display:none"></canvas>
                    <div style="display:flex;gap:8px;margin-top:10px">
                      <button type="button" class="button button--secondary" data-onboarding-selfie-start style="font-size:0.85rem;padding:8px 16px">
                        ${isTr ? "Kamerayı Aç" : "Open Camera"}
                      </button>
                      <button type="button" class="button button--primary" data-onboarding-selfie-capture style="font-size:0.85rem;padding:8px 16px;display:none">
                        ${isTr ? "Fotoğraf Çek" : "Take Photo"}
                      </button>
                      <button type="button" class="button button--secondary" data-onboarding-selfie-retake style="font-size:0.85rem;padding:8px 16px;display:none">
                        ${isTr ? "Tekrar Çek" : "Retake"}
                      </button>
                    </div>
                  </div>
                  <!-- Website: file upload UI -->
                  <div data-onboarding-selfie-upload-ui style="display:none">
                    <p style="font-size:0.8rem;color:var(--text-muted);margin:4px 0 8px">${isTr ? "Bir selfie fotoğrafı yükleyin" : "Upload a selfie photo"}</p>
                    <input type="file" accept="image/*" data-onboarding-selfie-file style="margin-top:6px" />
                  </div>
                  <img data-onboarding-selfie-preview style="display:none;width:100%;max-width:280px;border-radius:var(--radius-sm);margin-top:8px" />
                  <input type="hidden" name="selfieData" data-onboarding-selfie-data />
                </div>
              </div>
            </div>

            <button class="button button--primary onboarding-submit-btn" type="submit">
              ${isTr ? "Hesap Oluştur" : "Create Account"}
            </button>
          </form>
        </div>
      </div>

      <!-- Step 6: Email Verification -->
      <div class="onboarding-step" data-onboarding-step="6" hidden>
        <div class="onboarding-step__content" style="text-align:center">
          <div class="onboarding-email-bird" style="width:140px;height:140px;margin:0 auto 16px">
            ${BIRD_EMAIL_SVG}
          </div>
          <h2 class="onboarding-step__title">${isTr ? "E-postanızı Doğrulayın" : "Verify Your Email"}</h2>
          <p class="onboarding-step__desc" data-onboarding-verify-desc>
            ${isTr ? "Doğrulama kodunu e-postanıza gönderdik." : "We sent a verification code to your email."}
          </p>
          <p class="onboarding-verify-email-display" data-onboarding-verify-email style="font-weight:600;color:var(--accent,#c9a84c);margin:4px 0 18px;font-size:0.95rem"></p>

          <div class="onboarding-form-error" data-onboarding-otp-error hidden style="margin-bottom:12px">
            <p data-onboarding-otp-error-text></p>
          </div>

          <div class="onboarding-otp-inputs" data-onboarding-otp-container style="display:flex;justify-content:center;gap:6px;margin-bottom:20px;flex-wrap:wrap">
            ${Array.from({length:8}, (_,i) => `<input type="text" inputmode="numeric" maxlength="1" class="onboarding-otp-digit" data-otp-digit="${i}"${i===0?' autocomplete="one-time-code"':''} style="width:38px;height:48px;text-align:center;font-size:1.3rem;font-weight:700;border-radius:10px;border:2px solid var(--surface-300,#d1d5db);background:#fff;color:#111;outline:none;transition:border-color 200ms;-webkit-text-fill-color:#111" />`).join('\n            ')}
          </div>

          <button class="button button--primary onboarding-verify-btn" type="button" data-onboarding-verify-btn disabled style="width:100%;margin-bottom:12px">
            ${isTr ? "Doğrula" : "Verify"}
          </button>

          <p style="font-size:0.85rem;color:var(--text-muted,#9ca3af);margin-top:8px">
            ${isTr ? "Kod gelmedi mi?" : "Didn't receive the code?"}
            <button type="button" data-onboarding-resend-btn style="background:none;border:none;color:var(--accent,#c9a84c);font-weight:600;cursor:pointer;font-size:0.85rem;text-decoration:underline;padding:0 4px">
              ${isTr ? "Tekrar Gönder" : "Resend"}
            </button>
          </p>
        </div>
      </div>

      <!-- Step 7: Success -->
      <div class="onboarding-step" data-onboarding-step="7" hidden>
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
        <span class="onboarding-dot" data-onboarding-dot="5"></span>
        <span class="onboarding-dot" data-onboarding-dot="6"></span>
        <span class="onboarding-dot" data-onboarding-dot="7"></span>
      </div>
    </div>
  `;
}

export function initOnboardingWizard(loadAuthApi, setAuthSession, setDocumentAuthState) {
  const wizard = document.querySelector("[data-onboarding-wizard]");
  if (!wizard) return;

  // Always reset the tutorial-seen flag so every new account sees the onboarding popup
  try { localStorage.removeItem("yapply-onboarding-tutorial-seen"); } catch (_) {}

  let isTr = document.documentElement.lang === "tr" || localStorage.getItem("yapply-locale") !== "en";
  let currentStep = 1;
  let selectedRole = "client";
  let selectedDevType = ""; // "individual" or "business"
  let selfieStream = null; // MediaStream for selfie camera
  let selfieDataUrl = ""; // base64 selfie capture
  let businessPhotoFiles = []; // File objects for business photos

  // Detect native app vs website
  const _origin = window.location.origin;
  const _hostname = window.location.hostname;
  const _port = window.location.port;
  const isNativeApp = _origin === "capacitor://localhost" || (_hostname === "localhost" && !_port);

  // Toggle selfie UI: camera for native, file upload for website
  const selfieCameraUI = wizard.querySelector("[data-onboarding-selfie-camera-ui]");
  const selfieUploadUI = wizard.querySelector("[data-onboarding-selfie-upload-ui]");
  if (!isNativeApp) {
    if (selfieCameraUI) selfieCameraUI.style.display = "none";
    if (selfieUploadUI) selfieUploadUI.style.display = "";
  }

  // Pending verification state (set when signup returns PENDING_EMAIL_VERIFICATION)
  let pendingEmail = "";
  let pendingPassword = "";
  let pendingRole = "";

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

  // ─── Shared: show success step (step 7) ───
  function showSuccessStep() {
    // Fire-and-forget admin notification for developer signups
    if (selectedRole === "developer") {
      try {
        import("../core/emailNotifier.js").then(({ notifyDeveloperSignup }) => {
          const form = wizard.querySelector("[data-onboarding-form]");
          const formData = form ? new FormData(form) : new FormData();
          notifyDeveloperSignup({
            email: formData.get("email") || "",
            fullName: formData.get("fullName") || "",
            role: "developer",
            developerType: selectedDevType,
            companyName: formData.get("companyName") || "",
            businessName: formData.get("businessName") || "",
            businessWebsite: formData.get("businessWebsite") || "",
            businessLocations: formData.get("businessLocations") || "",
            businessDescription: formData.get("businessDescription") || "",
            businessPhotos: businessPhotoFiles.map((f) => f.name || ""),
            portfolioLinks: [formData.get("portfolioLink") || formData.get("individualPortfolioLink") || ""].filter(Boolean),
            selfieUrl: selfieDataUrl ? "(selfie captured)" : "",
            serviceArea: formData.get("serviceArea") || "",
            specialties: formData.get("specialties") || "",
            yearsExperience: formData.get("yearsExperience") || "",
            phoneNumber: formData.get("phoneNumber") || "",
          });
        }).catch(() => {});
      } catch (_) {}
    }

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
      goBtn.addEventListener("click", async () => {
        const target = selectedRole === "developer"
          ? "./open-marketplace.html"
          : "./client-project-submission.html";
        const nav = () => {
          if (typeof window.navigateTo === "function") {
            window.navigateTo(target);
          } else {
            window.location.href = target;
          }
        };
        // Show post-signup onboarding tutorial (3 slides) before navigating
        try {
          const { showOnboardingTutorial } = await import("./onboardingTutorial.js");
          const lang = isTr ? "tr" : "en";
          showOnboardingTutorial(lang, nav);
        } catch (_tutorialErr) {
          console.warn("[yapply] Tutorial load error", _tutorialErr);
          nav(); // fallback: navigate directly
        }
      });
    }

    goToStep(7);
  }

  // Step 1: Language selection
  wizard.querySelectorAll("[data-onboarding-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.onboardingLang;
      isTr = lang === "tr";
      try { localStorage.setItem("yapply-locale", lang); } catch (_) {}
      document.documentElement.lang = lang;
      wizard.querySelectorAll("[data-onboarding-lang]").forEach((b) => {
        b.classList.toggle("onboarding-theme-btn--active", b === btn);
      });
      // Update ALL wizard labels to match chosen language
      const t = (tr, en) => isTr ? tr : en;
      // Step 2: Theme
      const themeTitle = wizard.querySelector("[data-onboarding-theme-title]");
      const themeDesc = wizard.querySelector("[data-onboarding-theme-desc]");
      const themeLightLabel = wizard.querySelector("[data-onboarding-theme-light-label]");
      const themeDarkLabel = wizard.querySelector("[data-onboarding-theme-dark-label]");
      const themeContinue = wizard.querySelector("[data-onboarding-theme-continue]");
      if (themeTitle) themeTitle.textContent = t("Temayı Seçin", "Choose Your Theme");
      if (themeDesc) themeDesc.textContent = t("Uygulamayı açık veya koyu modda kullanmak ister misiniz?", "Would you like to use the app in Light or Dark mode?");
      if (themeLightLabel) themeLightLabel.textContent = t("Açık Mod", "Light Mode");
      if (themeDarkLabel) themeDarkLabel.textContent = t("Koyu Mod", "Dark Mode");
      if (themeContinue) themeContinue.textContent = t("Devam Et", "Continue");
      // Step 3: Role
      const step3 = wizard.querySelector('[data-onboarding-step="3"]');
      if (step3) {
        const s3title = step3.querySelector(".onboarding-step__title");
        const s3desc = step3.querySelector(".onboarding-step__desc");
        if (s3title) s3title.textContent = t("Siz Kimsiniz?", "Who Are You?");
        if (s3desc) s3desc.textContent = t("Müşteri misiniz yoksa Profesyonel mi?", "Are you a Client or a Builder?");
        const clientCard = step3.querySelector('[data-onboarding-role="client"]');
        const devCard = step3.querySelector('[data-onboarding-role="developer"]');
        if (clientCard) {
          clientCard.querySelector(".onboarding-role-card__label").textContent = t("Müşteri", "Client");
          clientCard.querySelector(".onboarding-role-card__desc").textContent = t("Projeniz için teklif alın", "Get bids for your project");
        }
        if (devCard) {
          devCard.querySelector(".onboarding-role-card__label").textContent = t("Profesyonel", "Professional");
          devCard.querySelector(".onboarding-role-card__desc").textContent = t("İş bulun ve teklifler verin", "Find work and place bids");
        }
      }
      // Step 4: Dev type
      const devtypeTitle = wizard.querySelector("[data-onboarding-devtype-title]");
      const devtypeDesc = wizard.querySelector("[data-onboarding-devtype-desc]");
      if (devtypeTitle) devtypeTitle.textContent = t("Hesap Türü", "Account Type");
      if (devtypeDesc) devtypeDesc.textContent = t("Bireysel mi yoksa işletme olarak mı kayıt oluyorsunuz?", "Are you registering as an individual or a business?");
      const step4 = wizard.querySelector('[data-onboarding-step="4"]');
      if (step4) {
        const indivCard = step4.querySelector('[data-onboarding-devtype="individual"]');
        const bizCard = step4.querySelector('[data-onboarding-devtype="business"]');
        if (indivCard) {
          indivCard.querySelector(".onboarding-role-card__label").textContent = t("Bireysel", "Individual");
          indivCard.querySelector(".onboarding-role-card__desc").textContent = t("Kendi adınıza iş yapın", "Work under your own name");
        }
        if (bizCard) {
          bizCard.querySelector(".onboarding-role-card__label").textContent = t("İşletme", "Business");
          bizCard.querySelector(".onboarding-role-card__desc").textContent = t("Şirketiniz adına kayıt olun", "Register as a company");
        }
      }
      // Step 5: Form
      const step5 = wizard.querySelector('[data-onboarding-step="5"]');
      if (step5) {
        const s5title = step5.querySelector(".onboarding-step__title");
        if (s5title) s5title.textContent = t("Hesap Bilgileri", "Account Details");
        // Update form labels and placeholders
        const labelMap = {
          username: [t("Kullanıcı Adı", "Username"), t("kullanıcı adınız", "your username")],
          fullName: [t("Ad Soyad", "Full Name"), t("Adınız Soyadınız", "Your full name")],
          email: [t("E-posta", "Email"), t("ornek@mail.com", "you@email.com")],
          password: [t("Şifre", "Password"), "••••••••"],
          confirmPassword: [t("Şifre Tekrar", "Confirm Password"), "••••••••"],
          phoneNumber: [t("Telefon", "Phone"), "+90 5XX XXX XX XX"],
          preferredRegion: [t("Şehir", "City"), t("İstanbul, Bodrum...", "Istanbul, Bodrum...")],
          companyName: [t("Şirket / Profesyonel Adı", "Company / Professional Name"), t("Firma veya profesyonel adınız", "Your company or professional name")],
          serviceArea: [t("Hizmet Bölgesi", "Service Area"), t("İstanbul, Bodrum...", "Istanbul, Bodrum...")],
          yearsExperience: [t("Deneyim (Yıl)", "Years of Experience"), "5"],
          specialties: [t("Uzmanlık Alanı", "Specialty"), t("Villa yapımı, renovasyon...", "Villa construction, renovation...")],
          businessName: [t("İşletme Adı", "Business Name"), t("Şirket adınız", "Your business name")],
          businessWebsite: [t("İşletme Web Sitesi", "Business Website"), "https://example.com"],
          businessLocations: [t("İşletme Konumu", "Business Location(s)"), t("İstanbul, Bodrum...", "Istanbul, Bodrum...")],
          businessDescription: [t("İşletme Açıklaması", "Business Description"), t("Şirketiniz hakkında kısa bilgi...", "Brief description of your business...")],
          portfolioLink: [t("Portföy Linki (İsteğe Bağlı)", "Portfolio Link (Optional)"), "https://portfolio.com"],
          individualPortfolioLink: [t("Portföy Linki (İsteğe Bağlı)", "Portfolio Link (Optional)"), "https://portfolio.com"],
        };
        Object.entries(labelMap).forEach(([name, [label, placeholder]]) => {
          const field = step5.querySelector(`[name="${name}"]`);
          if (field) {
            const labelEl = field.closest(".onboarding-field")?.querySelector("span");
            if (labelEl) labelEl.textContent = label;
            if (placeholder) field.placeholder = placeholder;
          }
        });
        // Submit button
        const submitBtn = step5.querySelector(".onboarding-submit-btn");
        if (submitBtn && !submitBtn.dataset.loading) submitBtn.textContent = t("Hesap Oluştur", "Create Account");
        // Selfie / photo labels
        const selfieSection = step5.querySelector("[data-onboarding-selfie-section]");
        if (selfieSection) {
          const selfieLabel = selfieSection.querySelector(":scope > span");
          if (selfieLabel) selfieLabel.textContent = t("Selfie (Zorunlu)", "Selfie (Required)");
          const camP = step5.querySelector("[data-onboarding-selfie-camera-ui] p");
          if (camP) camP.textContent = t("Ön kamerayla bir selfie çekin", "Take a selfie with the front camera");
          const startBtn = step5.querySelector("[data-onboarding-selfie-start]");
          if (startBtn) startBtn.textContent = t("Kamerayı Aç", "Open Camera");
          const captureBtn = step5.querySelector("[data-onboarding-selfie-capture]");
          if (captureBtn) captureBtn.textContent = t("Fotoğraf Çek", "Take Photo");
          const retakeBtn = step5.querySelector("[data-onboarding-selfie-retake]");
          if (retakeBtn) retakeBtn.textContent = t("Tekrar Çek", "Retake");
        }
        const bizPhotosLabel = step5.querySelector("[data-onboarding-business-photos]")?.closest(".onboarding-field")?.querySelector("span");
        if (bizPhotosLabel) bizPhotosLabel.textContent = t("İşletme Fotoğrafları (En fazla 3)", "Business Photos (Up to 3)");
      }
      // Step 6: Email verify
      const step6 = wizard.querySelector('[data-onboarding-step="6"]');
      if (step6) {
        const s6title = step6.querySelector(".onboarding-step__title");
        if (s6title) s6title.textContent = t("E-postanızı Doğrulayın", "Verify Your Email");
      }
    });
  });

  // Step 1 → 2 continue button (language → theme)
  const nextToTheme = wizard.querySelector('[data-onboarding-next="2"]');
  if (nextToTheme) {
    nextToTheme.addEventListener("click", () => {
      goToStep(2);
    });
  }

  // Step 2: Theme selection
  wizard.querySelectorAll("[data-onboarding-theme]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.onboardingTheme;
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem("yapply-theme", theme); } catch (_) {}
      // Update background color for website and native
      const bgColor = theme === "light" ? "#f3efe6" : "#060709";
      document.documentElement.style.backgroundColor = bgColor;
      document.body.style.backgroundColor = bgColor;
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.content = bgColor;
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

  // Step 2 → 3 continue button (theme → role)
  const nextTo3 = wizard.querySelector('[data-onboarding-next="3"]');
  if (nextTo3) {
    nextTo3.addEventListener("click", () => {
      // Show feedback
      const feedback = wizard.querySelector("[data-onboarding-feedback]");
      if (feedback) {
        feedback.textContent = isTr ? "Harika seçim 😎" : "Good choice 😎";
        feedback.hidden = false;
        feedback.classList.add("onboarding-feedback--show");
      }
      setTimeout(() => goToStep(3), 800);
    });
  }

  // Step 3: Role selection
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

      // Developers go to step 4 (dev type), clients skip to step 5 (form)
      setTimeout(() => goToStep(selectedRole === "developer" ? 4 : 5), 500);
    });
  });

  // Step 4: Developer type selection (Bireysel / İşletme)
  wizard.querySelectorAll("[data-onboarding-devtype]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedDevType = card.dataset.onboardingDevtype;

      // Highlight selected
      wizard.querySelectorAll("[data-onboarding-devtype]").forEach((c) => {
        c.classList.toggle("onboarding-role-card--selected", c === card);
      });

      // Set developer type in form
      const devTypeInput = wizard.querySelector("[data-onboarding-devtype-input]");
      if (devTypeInput) devTypeInput.value = selectedDevType;

      // Show/hide business vs individual extra fields
      const businessFields = wizard.querySelector("[data-onboarding-business-fields]");
      const individualFields = wizard.querySelector("[data-onboarding-individual-fields]");
      if (businessFields) {
        businessFields.hidden = selectedDevType !== "business";
        businessFields.querySelectorAll("input, textarea").forEach((f) => { f.disabled = selectedDevType !== "business"; });
      }
      if (individualFields) {
        individualFields.hidden = selectedDevType !== "individual";
        individualFields.querySelectorAll("input, textarea").forEach((f) => { f.disabled = selectedDevType !== "individual"; });
      }

      // Update form description based on dev type
      const desc = wizard.querySelector("[data-onboarding-form-desc]");
      if (desc) {
        if (selectedDevType === "business") {
          desc.textContent = isTr ? "İşletme bilgilerinizi girin" : "Enter your business details";
        } else {
          desc.textContent = isTr ? "Kişisel bilgilerinizi girin" : "Enter your personal details";
        }
      }

      // Go to step 5 (form) after brief delay
      setTimeout(() => goToStep(5), 500);
    });
  });

  // Step 4: Form submission
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
      const _submitOrigLabel = submitBtn?.textContent || "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.loading = "true";
        submitBtn.setAttribute("aria-busy", "true");
        submitBtn.textContent = "";
      }

      try {
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        // Enrich payload with developer expansion data
        if (selectedRole === "developer") {
          payload.developerType = selectedDevType;

          if (selectedDevType === "business") {
            // Collect portfolio link
            const portfolioLink = payload.portfolioLink;
            if (portfolioLink) payload.portfolioLinks = [portfolioLink];
            // Business photos are stored as base64 data URLs
            if (businessPhotoFiles.length > 0) {
              payload.businessPhotos = businessPhotoFiles.map((f) => f.dataUrl || "");
            }
          } else if (selectedDevType === "individual") {
            // Collect portfolio link
            const indivPortfolio = payload.individualPortfolioLink;
            if (indivPortfolio) payload.portfolioLinks = [indivPortfolio];
            // Selfie data
            if (selfieDataUrl) payload.selfieUrl = selfieDataUrl;
          }
        }

        const authApi = await loadAuthApi();
        if (!authApi) throw new Error("Auth unavailable");

        const user = await authApi.signupAccount(payload);
        const session = await authApi.fetchAuthSession();

        if (session?.authenticated && session?.user) {
          setAuthSession(session);
          setDocumentAuthState(session);
        }

        // No email verification needed — go straight to success
        showSuccessStep();
      } catch (err) {
        // Handle email verification flow
        if (err?.code === "PENDING_EMAIL_VERIFICATION") {
          pendingEmail = err.email || form.querySelector('[name="email"]')?.value || "";
          pendingPassword = err.password || form.querySelector('[name="password"]')?.value || "";
          pendingRole = err.role || selectedRole;

          // Show the email on the verify step
          const emailDisplay = wizard.querySelector("[data-onboarding-verify-email]");
          if (emailDisplay) emailDisplay.textContent = pendingEmail;

          // Focus first OTP input when transitioning
          goToStep(6);
          setTimeout(() => {
            const firstOtp = wizard.querySelector('[data-otp-digit="0"]');
            if (firstOtp) firstOtp.focus();
          }, 400);
          return;
        }

        if (errorEl && errorText) {
          errorText.textContent = err?.message || (isTr ? "Bir hata oluştu" : "An error occurred");
          errorEl.hidden = false;
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("data-loading");
          submitBtn.removeAttribute("aria-busy");
          submitBtn.textContent = _submitOrigLabel || (isTr ? "Hesap Oluştur" : "Create Account");
        }
      }
    });
  }

  // ─── Step 5: OTP digit inputs ───
  const otpContainer = wizard.querySelector("[data-onboarding-otp-container]");
  const verifyBtn = wizard.querySelector("[data-onboarding-verify-btn]");
  const otpDigits = wizard.querySelectorAll(".onboarding-otp-digit");

  function getOtpValue() {
    return Array.from(otpDigits).map((d) => d.value).join("");
  }

  function updateVerifyBtnState() {
    const code = getOtpValue();
    if (verifyBtn) verifyBtn.disabled = code.length < 8;
  }

  // Wire up OTP digit auto-advance, backspace, and paste
  otpDigits.forEach((digit, idx) => {
    digit.addEventListener("input", (e) => {
      const val = e.target.value.replace(/[^0-9]/g, "");
      e.target.value = val.slice(0, 1);
      if (val && idx < otpDigits.length - 1) {
        otpDigits[idx + 1].focus();
      }
      updateVerifyBtnState();

      // Highlight border when filled
      e.target.style.borderColor = val ? "var(--accent,#c9a84c)" : "var(--surface-300,#d1d5db)";
    });

    digit.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && idx > 0) {
        otpDigits[idx - 1].focus();
        otpDigits[idx - 1].value = "";
        otpDigits[idx - 1].style.borderColor = "var(--surface-300,#d1d5db)";
        updateVerifyBtnState();
      }
      // Allow Enter to submit when all 6 digits filled
      if (e.key === "Enter") {
        const code = getOtpValue();
        if (code.length === 8 && verifyBtn) verifyBtn.click();
      }
    });

    // Handle paste: fill all 6 digits from clipboard
    digit.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData("text") || "").replace(/[^0-9]/g, "").slice(0, 8);
      pasted.split("").forEach((ch, i) => {
        if (otpDigits[i]) {
          otpDigits[i].value = ch;
          otpDigits[i].style.borderColor = ch ? "var(--accent,#c9a84c)" : "var(--surface-300,#d1d5db)";
        }
      });
      if (pasted.length > 0 && otpDigits[Math.min(pasted.length, 5)]) {
        otpDigits[Math.min(pasted.length, 5)].focus();
      }
      updateVerifyBtnState();
    });
  });

  // Verify button click
  if (verifyBtn) {
    verifyBtn.addEventListener("click", async () => {
      const code = getOtpValue();
      if (code.length < 8) return;

      const otpError = wizard.querySelector("[data-onboarding-otp-error]");
      const otpErrorText = wizard.querySelector("[data-onboarding-otp-error-text]");
      if (otpError) otpError.hidden = true;

      verifyBtn.disabled = true;
      verifyBtn.dataset.loading = "true";
      verifyBtn.setAttribute("aria-busy", "true");
      verifyBtn.textContent = "";

      try {
        const authApi = await loadAuthApi();
        if (!authApi) throw new Error("Auth unavailable");

        const user = await authApi.verifySignupOtp(pendingEmail, code, pendingPassword);
        const session = await authApi.fetchAuthSession();

        if (session?.authenticated && session?.user) {
          setAuthSession(session);
          setDocumentAuthState(session);
        }

        // Verified — go to success
        showSuccessStep();
      } catch (err) {
        if (otpError && otpErrorText) {
          otpErrorText.textContent = err?.message || (isTr ? "Geçersiz veya süresi dolmuş kod" : "Invalid or expired code");
          otpError.hidden = false;
        }
        verifyBtn.disabled = false;
        verifyBtn.removeAttribute("data-loading");
        verifyBtn.removeAttribute("aria-busy");
        verifyBtn.textContent = isTr ? "Doğrula" : "Verify";

        // Clear OTP inputs on error so user can retry
        otpDigits.forEach((d) => {
          d.value = "";
          d.style.borderColor = "var(--surface-300,#d1d5db)";
        });
        otpDigits[0]?.focus();
      }
    });
  }

  // ─── Selfie camera logic (individual developers) ───
  const selfieStartBtn = wizard.querySelector("[data-onboarding-selfie-start]");
  const selfieCaptureBtn = wizard.querySelector("[data-onboarding-selfie-capture]");
  const selfieRetakeBtn = wizard.querySelector("[data-onboarding-selfie-retake]");
  const selfieVideo = wizard.querySelector("[data-onboarding-selfie-video]");
  const selfieCanvas = wizard.querySelector("[data-onboarding-selfie-canvas]");
  const selfiePreview = wizard.querySelector("[data-onboarding-selfie-preview]");
  const selfieDataInput = wizard.querySelector("[data-onboarding-selfie-data]");

  function stopSelfieStream() {
    if (selfieStream) {
      selfieStream.getTracks().forEach((t) => t.stop());
      selfieStream = null;
    }
  }

  if (selfieStartBtn) {
    selfieStartBtn.addEventListener("click", async () => {
      try {
        stopSelfieStream();
        selfieStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (selfieVideo) {
          selfieVideo.srcObject = selfieStream;
          selfieVideo.style.display = "block";
        }
        selfieStartBtn.style.display = "none";
        if (selfieCaptureBtn) selfieCaptureBtn.style.display = "";
        if (selfiePreview) selfiePreview.style.display = "none";
        if (selfieRetakeBtn) selfieRetakeBtn.style.display = "none";
      } catch (err) {
        console.warn("[yapply] Camera error:", err);
        const errorEl = wizard.querySelector("[data-onboarding-error]");
        const errorText = wizard.querySelector("[data-onboarding-error-text]");
        if (errorEl && errorText) {
          errorText.textContent = isTr ? "Kamera erişimi reddedildi" : "Camera access denied";
          errorEl.hidden = false;
        }
      }
    });
  }

  if (selfieCaptureBtn) {
    selfieCaptureBtn.addEventListener("click", () => {
      if (!selfieVideo || !selfieCanvas) return;
      selfieCanvas.width = selfieVideo.videoWidth;
      selfieCanvas.height = selfieVideo.videoHeight;
      const ctx = selfieCanvas.getContext("2d");
      ctx.drawImage(selfieVideo, 0, 0);
      selfieDataUrl = selfieCanvas.toDataURL("image/jpeg", 0.8);
      if (selfieDataInput) selfieDataInput.value = selfieDataUrl;
      if (selfiePreview) {
        selfiePreview.src = selfieDataUrl;
        selfiePreview.style.display = "block";
      }
      if (selfieVideo) selfieVideo.style.display = "none";
      stopSelfieStream();
      selfieCaptureBtn.style.display = "none";
      if (selfieRetakeBtn) selfieRetakeBtn.style.display = "";
    });
  }

  if (selfieRetakeBtn) {
    selfieRetakeBtn.addEventListener("click", () => {
      selfieDataUrl = "";
      if (selfieDataInput) selfieDataInput.value = "";
      if (selfiePreview) selfiePreview.style.display = "none";
      selfieRetakeBtn.style.display = "none";
      if (selfieStartBtn) selfieStartBtn.style.display = "";
      selfieStartBtn?.click();
    });
  }

  // ─── Selfie file upload for website ───
  const selfieFileInput = wizard.querySelector("[data-onboarding-selfie-file]");
  if (selfieFileInput) {
    selfieFileInput.addEventListener("change", () => {
      const file = selfieFileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        selfieDataUrl = e.target.result;
        if (selfieDataInput) selfieDataInput.value = selfieDataUrl;
        if (selfiePreview) {
          selfiePreview.src = selfieDataUrl;
          selfiePreview.style.display = "block";
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // ─── Business photo upload preview ───
  const businessPhotosInput = wizard.querySelector("[data-onboarding-business-photos]");
  const businessPhotosPreview = wizard.querySelector("[data-onboarding-business-photos-preview]");

  if (businessPhotosInput) {
    businessPhotosInput.addEventListener("change", () => {
      businessPhotoFiles = [];
      if (businessPhotosPreview) businessPhotosPreview.innerHTML = "";

      const files = Array.from(businessPhotosInput.files || []).slice(0, 3);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          businessPhotoFiles.push({ name: file.name, dataUrl });
          if (businessPhotosPreview) {
            const img = document.createElement("img");
            img.src = dataUrl;
            img.style.cssText = "width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid var(--line)";
            businessPhotosPreview.appendChild(img);
          }
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // Resend button
  const resendBtn = wizard.querySelector("[data-onboarding-resend-btn]");
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (!pendingEmail) return;

      resendBtn.disabled = true;
      resendBtn.dataset.loading = "true";
      resendBtn.setAttribute("aria-busy", "true");
      resendBtn.textContent = "";

      try {
        const authApi = await loadAuthApi();
        if (authApi?.resendSignupOtp) {
          await authApi.resendSignupOtp(pendingEmail);
        }
        resendBtn.removeAttribute("data-loading");
        resendBtn.removeAttribute("aria-busy");
        resendBtn.textContent = isTr ? "Gönderildi!" : "Sent!";
        setTimeout(() => {
          resendBtn.textContent = isTr ? "Tekrar Gönder" : "Resend";
          resendBtn.disabled = false;
        }, 3000);
      } catch (err) {
        resendBtn.removeAttribute("data-loading");
        resendBtn.removeAttribute("aria-busy");
        resendBtn.textContent = isTr ? "Tekrar Gönder" : "Resend";
        resendBtn.disabled = false;
        const otpError = wizard.querySelector("[data-onboarding-otp-error]");
        const otpErrorText = wizard.querySelector("[data-onboarding-otp-error-text]");
        if (otpError && otpErrorText) {
          otpErrorText.textContent = err?.message || (isTr ? "Kod gönderilemedi" : "Could not resend code");
          otpError.hidden = false;
        }
      }
    });
  }
}
