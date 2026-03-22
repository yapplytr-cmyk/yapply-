import { createButton } from "./primitives.js";

/* ─────────────────────────────────────────────────
   Marketplace Listing Submission — Step-by-Step Wizard
   Supports both client and professional (developer) flows
   ───────────────────────────────────────────────── */

const CLIENT_WIZARD_STEPS = [
  {
    id: "projectTitle",
    title: "Proje Başlığı",
    subtitle: "Projenize kısa ve açık bir başlık verin.",
  },
  {
    id: "projectType",
    title: "Proje Kategorisi",
    subtitle: "Projenize en uygun kategoriyi seçin.",
  },
  {
    id: "projectBrief",
    title: "Proje Açıklaması",
    subtitle: "Projenizi detaylı bir şekilde tanımlayın.",
  },
  {
    id: "contact",
    title: "İletişim ve Konum",
    subtitle: "Telefon numaranızı ve proje konumunu girin.",
  },
  {
    id: "budget",
    title: "Bütçe Aralığı",
    subtitle: "Projeniz için tahmini bütçenizi belirleyin.",
  },
  {
    id: "constructionStarted",
    title: "İnşaat Durumu",
    subtitle: "İnşaat başladı mı?",
  },
  {
    id: "projectSize",
    title: "Proje Büyüklüğü",
    subtitle: "Projenizin yaklaşık büyüklüğünü girin.",
  },
  {
    id: "photos",
    title: "Fotoğraflar",
    subtitle: "Proje alanı veya referans fotoğraflarını yükleyin.",
  },
  {
    id: "summary",
    title: "Özet",
    subtitle: "Bilgilerinizi kontrol edin ve ilanınızı yayınlayın.",
  },
];

const PROFESSIONAL_WIZARD_STEPS = [
  {
    id: "companyInfo",
    title: "Şirket Bilgileri",
    subtitle: "Şirket adınızı ve meslek türünüzü girin.",
  },
  {
    id: "serviceArea",
    title: "Hizmet Alanı ve Deneyim",
    subtitle: "Hizmet verdiğiniz bölgeyi ve deneyim sürenizi belirtin.",
  },
  {
    id: "specialties",
    title: "Uzmanlık Alanları",
    subtitle: "Sunduğunuz hizmetleri ve uzmanlıklarınızı tanımlayın.",
  },
  {
    id: "pricing",
    title: "Fiyatlama",
    subtitle: "Başlangıç fiyatınızı veya fiyatlama modelinizi belirtin.",
  },
  {
    id: "portfolio",
    title: "Portfolyo ve Şirket Profili",
    subtitle: "Geçmiş projelerinizi ve şirketinizi tanıtın.",
  },
  {
    id: "professionalContact",
    title: "İletişim Bilgileri",
    subtitle: "E-posta, telefon ve website bilgilerinizi girin.",
  },
  {
    id: "professionalUploads",
    title: "Görseller",
    subtitle: "Logo, proje görselleri veya portfolyo materyali yükleyin.",
  },
  {
    id: "professionalSummary",
    title: "Özet",
    subtitle: "Bilgilerinizi kontrol edin ve ilanınızı gönderin.",
  },
];

const PROFESSION_TYPE_OPTIONS_TR = [
  "Mimarlık Ofisi",
  "Profesyonel",
  "İnşaat Şirketi",
  "Anahtar Teslim Yüklenici",
  "Cephe / Fit-Out Uzmanı",
];

const CATEGORY_OPTIONS_TR = [
  "Havuz Yapımı",
  "Havuz Renovasyonu",
  "Sauna Yapımı",
  "Jakuzi Kurulumu",
  "Komple Villa Yapımı",
  "İç Mekan Renovasyonu",
  "Mutfak Renovasyonu",
  "Banyo Renovasyonu",
  "Dış Cephe Renovasyonu",
  "Çatı",
  "Zemin Kaplama",
  "Boya",
  "Seramik / Fayans",
  "Duvar Yapımı",
  "Sıhhi Tesisat",
  "Elektrik",
  "Aydınlatma Tasarımı",
  "Cephe Uygulaması",
  "Peyzaj",
  "Bahçe Tasarımı",
  "Pergola / Dış Mekan Yapıları",
  "Teras Düzenlemesi",
  "Çit / Korkuluk Yapımı",
  "Garaj Yapımı / Renovasyonu",
  "Ev Ofis Yapımı",
  "Spor Salonu / Fitness Alanı",
  "Akıllı Ev Sistemleri",
  "Güvenlik Sistemleri",
  "Güneş Paneli Kurulumu",
  "Şarap Mahzeni",
  "Isıtma / Soğutma Sistemleri",
  "Yalıtım",
  "Kapı / Pencere Montajı",
  "Merdiven / Korkuluk",
  "Asansör Kurulumu",
  "Depolama / Dolap Sistemleri",
  "Yıkım / Saha Hazırlığı",
  "Genel İnşaat",
  "Mimarlık / Tasarım",
  "Özel Proje",
];

const BUDGET_OPTIONS_TR = [
  { label: "1.000 - 10.000 TL", value: "1000-10000" },
  { label: "10.000 - 50.000 TL", value: "10000-50000" },
  { label: "50.000 - 150.000 TL", value: "50000-150000" },
  { label: "150.000 - 500.000 TL", value: "150000-500000" },
  { label: "500.000 - 1.500.000 TL", value: "500000-1500000" },
  { label: "1.500.000 TL+", value: "1500000+" },
];

const CONSTRUCTION_STARTED_OPTIONS_TR = [
  { label: "Hayır, inşaat henüz başlamadı", value: "no" },
  { label: "Evet, inşaat başladı", value: "yes" },
];

/* ── Progress Dots ─────────────────────────────── */

function createProgressDots(totalSteps, currentStep) {
  const dots = Array.from({ length: totalSteps }, (_, i) => {
    const isActive = i === currentStep;
    const isCompleted = i < currentStep;
    let cls = "wizard-dot";
    if (isActive) cls += " wizard-dot--active";
    if (isCompleted) cls += " wizard-dot--completed";
    return `<span class="${cls}" data-step-index="${i}"></span>`;
  }).join("");

  return `
    <div class="wizard-progress">
      <div class="wizard-dots">${dots}</div>
      <span class="wizard-step-counter">${currentStep + 1} / ${totalSteps}</span>
    </div>
  `;
}

/* ── Individual Step Renderers ─────────────────── */

function renderStepProjectTitle(data) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-project-title">Proje Başlığı</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-project-title"
        name="projectTitle"
        placeholder="Özel sahil villası, havuz restorasyonu, mutfak renovasyonu..."
        value="${escapeAttr(data.projectTitle || "")}"
        required
      />
    </div>
  `;
}

function renderStepProjectType(data) {
  const options = CATEGORY_OPTIONS_TR.map((cat) => {
    const selected = data.projectType === cat ? "selected" : "";
    return `<option value="${escapeAttr(cat)}" ${selected}>${cat}</option>`;
  }).join("");

  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-project-type">Kategori</label>
      <div class="wizard-select-wrapper">
        <select class="wizard-select" id="wiz-project-type" name="projectType" required>
          <option value="" disabled ${!data.projectType ? "selected" : ""}>Bir kategori seçin</option>
          ${options}
        </select>
        <svg class="wizard-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}

function renderStepProjectBrief(data) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-project-brief">Proje Açıklaması</label>
      <textarea
        class="wizard-textarea"
        id="wiz-project-brief"
        name="projectBrief"
        rows="6"
        placeholder="Ne inşa ettirmek, yeniletmek veya tamamlatmak istediğinizi açıklayın."
        required
      >${escapeHtml(data.projectBrief || "")}</textarea>
      <small class="wizard-hint">İletişim bilgilerini proje açıklamasına yazmayınız.</small>
    </div>
  `;
}

function renderStepContact(data) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-phone">Telefon Numarası</label>
      <input
        class="wizard-input"
        type="tel"
        id="wiz-phone"
        name="phone"
        placeholder="+90 5XX XXX XX XX"
        autocomplete="tel"
        value="${escapeAttr(data.phone || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-location">Proje Konumu</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-location"
        name="preferredLocation"
        placeholder="İstanbul, İzmir, Bodrum..."
        value="${escapeAttr(data.preferredLocation || "")}"
        required
      />
    </div>
  `;
}

function renderStepBudget(data) {
  const options = BUDGET_OPTIONS_TR.map((opt) => {
    const selected = data.estimatedBudget === opt.value ? "selected" : "";
    return `<option value="${escapeAttr(opt.value)}" ${selected}>${opt.label}</option>`;
  }).join("");

  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-budget">Tahmini Bütçe</label>
      <div class="wizard-select-wrapper">
        <select class="wizard-select" id="wiz-budget" name="estimatedBudget" required>
          <option value="" disabled ${!data.estimatedBudget ? "selected" : ""}>Bütçe aralığı seçin</option>
          ${options}
        </select>
        <svg class="wizard-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}

function renderStepConstructionStarted(data) {
  const options = CONSTRUCTION_STARTED_OPTIONS_TR.map((opt) => {
    const selected = data.constructionStarted === opt.value ? "selected" : "";
    return `<option value="${escapeAttr(opt.value)}" ${selected}>${opt.label}</option>`;
  }).join("");

  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-construction">İnşaat başladı mı?</label>
      <div class="wizard-select-wrapper">
        <select class="wizard-select" id="wiz-construction" name="constructionStarted" required>
          <option value="" disabled ${!data.constructionStarted ? "selected" : ""}>Seçin</option>
          ${options}
        </select>
        <svg class="wizard-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}

function renderStepProjectSize(data) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-project-size">Proje Büyüklüğü</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-project-size"
        name="projectSize"
        placeholder="Yaklaşık 280 m² iç mekan / 900 m² arsa"
        value="${escapeAttr(data.projectSize || "")}"
      />
    </div>
  `;
}

function renderStepPhotos() {
  return `
    <div class="wizard-field">
      <label class="wizard-label">Fotoğraf Yükleme</label>
      <div class="wizard-upload-area" data-wizard-upload-area>
        <div class="wizard-upload-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <p class="wizard-upload-text">Fotoğraf yüklemek için dokunun</p>
        <small class="wizard-upload-hint">En fazla 3 görsel, max 2MB</small>
        <input
          type="file"
          name="referenceUpload"
          accept="image/*"
          multiple
          class="wizard-upload-input"
          data-wizard-upload-input
        />
      </div>
      <div class="wizard-upload-preview" data-wizard-upload-preview hidden></div>
      <p class="wizard-upload-message" data-wizard-upload-message hidden></p>
    </div>
  `;
}

function renderStepSummary(data) {
  const rows = [
    { label: "Proje Başlığı", value: data.projectTitle },
    { label: "Kategori", value: data.projectType },
    { label: "Açıklama", value: data.projectBrief ? truncateText(data.projectBrief, 120) : "" },
    { label: "Telefon", value: data.phone },
    { label: "Konum", value: data.preferredLocation },
    { label: "Bütçe", value: getBudgetLabel(data.estimatedBudget) },
    { label: "İnşaat Durumu", value: getConstructionLabel(data.constructionStarted) },
    { label: "Proje Büyüklüğü", value: data.projectSize },
    { label: "Fotoğraflar", value: data._photoCount ? `${data._photoCount} fotoğraf` : "Yüklenmedi" },
  ];

  const rowsHtml = rows
    .filter((r) => r.value)
    .map(
      (r) => `
        <div class="wizard-summary-row">
          <span class="wizard-summary-label">${r.label}</span>
          <span class="wizard-summary-value">${escapeHtml(r.value)}</span>
        </div>
      `
    )
    .join("");

  return `
    <div class="wizard-summary">
      ${rowsHtml}
    </div>
  `;
}

/* ── Helpers ───────────────────────────────────── */

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncateText(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + "...";
}

function getBudgetLabel(value) {
  if (!value) return "";
  const opt = BUDGET_OPTIONS_TR.find((o) => o.value === value);
  return opt ? opt.label : value;
}

function getConstructionLabel(value) {
  if (!value) return "";
  const opt = CONSTRUCTION_STARTED_OPTIONS_TR.find((o) => o.value === value);
  return opt ? opt.label : value;
}

const CLIENT_STEP_RENDERERS = [
  renderStepProjectTitle,
  renderStepProjectType,
  renderStepProjectBrief,
  renderStepContact,
  renderStepBudget,
  renderStepConstructionStarted,
  renderStepProjectSize,
  renderStepPhotos,
  renderStepSummary,
];

/* ── Professional (Developer) Step Renderers ───── */

function renderStepCompanyInfo(data) {
  const options = PROFESSION_TYPE_OPTIONS_TR.map((opt) => {
    const selected = data.professionType === opt ? "selected" : "";
    return `<option value="${escapeAttr(opt)}" ${selected}>${opt}</option>`;
  }).join("");

  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-company-name">Şirket Adı</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-company-name"
        name="companyName"
        placeholder="Stüdyo veya firma adı"
        value="${escapeAttr(data.companyName || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-profession-type">Meslek Türü</label>
      <div class="wizard-select-wrapper">
        <select class="wizard-select" id="wiz-profession-type" name="professionType" required>
          <option value="" disabled ${!data.professionType ? "selected" : ""}>Meslek türünüzü seçin</option>
          ${options}
        </select>
        <svg class="wizard-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}

function renderStepServiceArea(data) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-service-area">Şehir / Hizmet Alanı</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-service-area"
        name="serviceArea"
        placeholder="İstanbul, İzmir, Bodrum, Ankara..."
        value="${escapeAttr(data.serviceArea || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-experience">Deneyim Yılı</label>
      <input
        class="wizard-input"
        type="number"
        id="wiz-experience"
        name="experience"
        placeholder="10"
        min="0"
        value="${escapeAttr(data.experience || "")}"
        required
      />
    </div>
  `;
}

function renderStepSpecialties(data) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-specialties">Uzmanlıklar / Sunulan Hizmetler</label>
      <textarea
        class="wizard-textarea"
        id="wiz-specialties"
        name="specialties"
        rows="4"
        placeholder="Villa projeleri, anahtar teslim işler, renovasyon teslimi, fizibilite..."
        required
      >${escapeHtml(data.specialties || "")}</textarea>
    </div>
  `;
}

function renderStepPricing(data) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-pricing">Başlangıç Fiyatı veya Fiyatlama Modeli</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-pricing"
        name="pricingModel"
        placeholder="Konsept paketleri EUR 45K'dan / Anahtar teslim EUR 780K'dan"
        value="${escapeAttr(data.pricingModel || "")}"
        required
      />
    </div>
  `;
}

function renderStepPortfolio(data) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-portfolio">Geçmiş Projeler / Portfolyo Özeti</label>
      <textarea
        class="wizard-textarea"
        id="wiz-portfolio"
        name="portfolioSummary"
        rows="5"
        placeholder="İlgili geçmiş işlerinizi, hizmet verdiğiniz sektörleri ve teslim gücünüzü özetleyin."
        required
      >${escapeHtml(data.portfolioSummary || "")}</textarea>
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-company-desc">Kısa Şirket Tanımı</label>
      <textarea
        class="wizard-textarea"
        id="wiz-company-desc"
        name="companyDescription"
        rows="4"
        placeholder="Konumlanmanızı, ekip gücünüzü ve pazardaki uygunluğunuzu kısa ve premium bir tonda anlatın."
        required
      >${escapeHtml(data.companyDescription || "")}</textarea>
    </div>
  `;
}

function renderStepProfessionalContact(data) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-contact-email">İletişim E-postası</label>
      <input
        class="wizard-input"
        type="email"
        id="wiz-contact-email"
        name="contactEmail"
        placeholder="ekip@sirket.com"
        autocomplete="email"
        value="${escapeAttr(data.contactEmail || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-phone">Telefon Numarası</label>
      <input
        class="wizard-input"
        type="tel"
        id="wiz-phone"
        name="phone"
        placeholder="+90 5XX XXX XX XX"
        autocomplete="tel"
        value="${escapeAttr(data.phone || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-website">Website / Portfolyo URL</label>
      <input
        class="wizard-input"
        type="url"
        id="wiz-website"
        name="website"
        placeholder="https://studionuz.com"
        value="${escapeAttr(data.website || "")}"
      />
      <small class="wizard-hint">İsteğe bağlı</small>
    </div>
  `;
}

function renderStepProfessionalUploads() {
  return `
    <div class="wizard-field">
      <label class="wizard-label">Logo / Proje Görselleri</label>
      <div class="wizard-upload-area" data-wizard-upload-area>
        <div class="wizard-upload-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <p class="wizard-upload-text">Görsel yüklemek için dokunun</p>
        <small class="wizard-upload-hint">En fazla 3 görsel, max 2MB</small>
        <input
          type="file"
          name="uploads"
          accept="image/*"
          multiple
          class="wizard-upload-input"
          data-wizard-upload-input
        />
      </div>
      <div class="wizard-upload-preview" data-wizard-upload-preview hidden></div>
      <p class="wizard-upload-message" data-wizard-upload-message hidden></p>
      <small class="wizard-hint">İsteğe bağlı — görseller ilanınızı güçlendirir.</small>
    </div>
  `;
}

function renderStepProfessionalSummary(data) {
  const rows = [
    { label: "Şirket Adı", value: data.companyName },
    { label: "Meslek Türü", value: data.professionType },
    { label: "Hizmet Alanı", value: data.serviceArea },
    { label: "Deneyim", value: data.experience ? `${data.experience} yıl` : "" },
    { label: "Uzmanlıklar", value: data.specialties ? truncateText(data.specialties, 100) : "" },
    { label: "Fiyatlama", value: data.pricingModel },
    { label: "Portfolyo", value: data.portfolioSummary ? truncateText(data.portfolioSummary, 80) : "" },
    { label: "E-posta", value: data.contactEmail },
    { label: "Telefon", value: data.phone },
    { label: "Website", value: data.website },
    { label: "Görseller", value: data._photoCount ? `${data._photoCount} görsel` : "Yüklenmedi" },
  ];

  const rowsHtml = rows
    .filter((r) => r.value)
    .map(
      (r) => `
        <div class="wizard-summary-row">
          <span class="wizard-summary-label">${r.label}</span>
          <span class="wizard-summary-value">${escapeHtml(r.value)}</span>
        </div>
      `
    )
    .join("");

  return `
    <div class="wizard-summary">
      ${rowsHtml}
    </div>
  `;
}

const PROFESSIONAL_STEP_RENDERERS = [
  renderStepCompanyInfo,
  renderStepServiceArea,
  renderStepSpecialties,
  renderStepPricing,
  renderStepPortfolio,
  renderStepProfessionalContact,
  renderStepProfessionalUploads,
  renderStepProfessionalSummary,
];

/* ── Main Wizard HTML ──────────────────────────── */

export function createMarketplaceSubmissionPage(pageContent, submissionType) {
  const isProfessional = submissionType === "professional";
  const steps = isProfessional ? PROFESSIONAL_WIZARD_STEPS : CLIENT_WIZARD_STEPS;
  const renderers = isProfessional ? PROFESSIONAL_STEP_RENDERERS : CLIENT_STEP_RENDERERS;
  const step = steps[0];
  return `
    <section class="wizard-container section-shell" data-wizard-root data-wizard-type="${isProfessional ? "professional" : "client"}">
      ${createProgressDots(steps.length, 0)}
      <div class="wizard-card" data-wizard-card>
        <h2 class="wizard-card__title" data-wizard-title>${step.title}</h2>
        <p class="wizard-card__subtitle" data-wizard-subtitle>${step.subtitle}</p>
        <div class="wizard-card__body" data-wizard-body>
          ${renderers[0]({})}
        </div>
        <div class="wizard-card__error" data-wizard-error hidden style="display:none;">
          <p data-wizard-error-text></p>
        </div>
      </div>
      <div class="wizard-actions" data-wizard-actions>
        <button class="wizard-btn wizard-btn--back" data-wizard-back type="button" hidden>Geri</button>
        <button class="wizard-btn wizard-btn--next" data-wizard-next type="button">Devam Et</button>
      </div>
    </section>
  `;
}

/* ── Wizard Controller (called from main.js) ───── */

export function initSubmissionWizard(container, { saveMarketplaceSubmission, onSuccess, onError }) {
  const root = container.querySelector("[data-wizard-root]");
  if (!root) return;

  const wizardType = root.dataset.wizardType || "client";
  const isProfessional = wizardType === "professional";
  const WIZARD_STEPS = isProfessional ? PROFESSIONAL_WIZARD_STEPS : CLIENT_WIZARD_STEPS;
  const STEP_RENDERERS = isProfessional ? PROFESSIONAL_STEP_RENDERERS : CLIENT_STEP_RENDERERS;

  let currentStep = 0;
  const data = {};
  let uploadFiles = [];
  let previewUrls = [];

  const titleEl = root.querySelector("[data-wizard-title]");
  const subtitleEl = root.querySelector("[data-wizard-subtitle]");
  const bodyEl = root.querySelector("[data-wizard-body]");
  const errorBox = root.querySelector("[data-wizard-error]");
  const errorText = root.querySelector("[data-wizard-error-text]");
  const nextBtn = root.querySelector("[data-wizard-next]");
  const backBtn = root.querySelector("[data-wizard-back]");

  /* ── Button press animation ──────────────────── */
  function animateButton(btn) {
    btn.classList.add("wizard-btn--pressed");
    btn.addEventListener("animationend", () => {
      btn.classList.remove("wizard-btn--pressed");
    }, { once: true });
  }

  function collectStepData() {
    const step = WIZARD_STEPS[currentStep];

    switch (step.id) {
      /* ── Client steps ── */
      case "projectTitle": {
        const input = bodyEl.querySelector('input[name="projectTitle"]');
        if (input) data.projectTitle = input.value.replace(/[0-9]/g, "").trim();
        break;
      }
      case "projectType": {
        const select = bodyEl.querySelector('select[name="projectType"]');
        if (select) data.projectType = select.value;
        break;
      }
      case "projectBrief": {
        const ta = bodyEl.querySelector('textarea[name="projectBrief"]');
        if (ta) data.projectBrief = ta.value.replace(/[0-9]/g, "").trim();
        break;
      }
      case "contact": {
        const phone = bodyEl.querySelector('input[name="phone"]');
        const loc = bodyEl.querySelector('input[name="preferredLocation"]');
        if (phone) data.phone = phone.value.trim();
        if (loc) data.preferredLocation = loc.value.trim();
        break;
      }
      case "budget": {
        const select = bodyEl.querySelector('select[name="estimatedBudget"]');
        if (select) data.estimatedBudget = select.value;
        break;
      }
      case "constructionStarted": {
        const select = bodyEl.querySelector('select[name="constructionStarted"]');
        if (select) data.constructionStarted = select.value;
        break;
      }
      case "projectSize": {
        const input = bodyEl.querySelector('input[name="projectSize"]');
        if (input) data.projectSize = input.value.trim();
        break;
      }
      case "photos": {
        // Files are tracked in uploadFiles array via change listener
        break;
      }
      /* ── Professional steps ── */
      case "companyInfo": {
        const name = bodyEl.querySelector('input[name="companyName"]');
        const type = bodyEl.querySelector('select[name="professionType"]');
        if (name) data.companyName = name.value.trim();
        if (type) data.professionType = type.value;
        break;
      }
      case "serviceArea": {
        const area = bodyEl.querySelector('input[name="serviceArea"]');
        const exp = bodyEl.querySelector('input[name="experience"]');
        if (area) data.serviceArea = area.value.trim();
        if (exp) data.experience = exp.value.trim();
        break;
      }
      case "specialties": {
        const ta = bodyEl.querySelector('textarea[name="specialties"]');
        if (ta) data.specialties = ta.value.trim();
        break;
      }
      case "pricing": {
        const input = bodyEl.querySelector('input[name="pricingModel"]');
        if (input) data.pricingModel = input.value.trim();
        break;
      }
      case "portfolio": {
        const summary = bodyEl.querySelector('textarea[name="portfolioSummary"]');
        const desc = bodyEl.querySelector('textarea[name="companyDescription"]');
        if (summary) data.portfolioSummary = summary.value.trim();
        if (desc) data.companyDescription = desc.value.trim();
        break;
      }
      case "professionalContact": {
        const email = bodyEl.querySelector('input[name="contactEmail"]');
        const phone = bodyEl.querySelector('input[name="phone"]');
        const web = bodyEl.querySelector('input[name="website"]');
        if (email) data.contactEmail = email.value.trim();
        if (phone) data.phone = phone.value.trim();
        if (web) data.website = web.value.trim();
        break;
      }
      case "professionalUploads": {
        // Files are tracked in uploadFiles array via change listener
        break;
      }
    }
  }

  function validateStep() {
    const step = WIZARD_STEPS[currentStep];

    switch (step.id) {
      /* ── Client validations ── */
      case "projectTitle":
        if (!data.projectTitle) return "Lütfen bir proje başlığı girin.";
        break;
      case "projectType":
        if (!data.projectType) return "Lütfen bir kategori seçin.";
        break;
      case "projectBrief":
        if (!data.projectBrief) return "Lütfen proje açıklaması girin.";
        break;
      case "contact":
        if (!data.phone) return "Lütfen telefon numaranızı girin.";
        if (!data.preferredLocation) return "Lütfen proje konumunu girin.";
        break;
      case "budget":
        if (!data.estimatedBudget) return "Lütfen bir bütçe aralığı seçin.";
        break;
      case "constructionStarted":
        if (!data.constructionStarted) return "Lütfen inşaat durumunu seçin.";
        break;
      case "photos":
        if (uploadFiles.length === 0) return "Lütfen en az bir fotoğraf yükleyin.";
        // Check all images have loaded
        const imgs = bodyEl.querySelectorAll("[data-wizard-upload-preview] img");
        for (const img of imgs) {
          if (!img.complete || img.naturalWidth === 0) return "Fotoğraflar yükleniyor, lütfen bekleyin.";
        }
        break;
      /* ── Professional validations ── */
      case "companyInfo":
        if (!data.companyName) return "Lütfen şirket adınızı girin.";
        if (!data.professionType) return "Lütfen meslek türünüzü seçin.";
        break;
      case "serviceArea":
        if (!data.serviceArea) return "Lütfen hizmet alanınızı girin.";
        if (!data.experience) return "Lütfen deneyim sürenizi girin.";
        break;
      case "specialties":
        if (!data.specialties) return "Lütfen uzmanlık alanlarınızı girin.";
        break;
      case "pricing":
        if (!data.pricingModel) return "Lütfen fiyatlama bilginizi girin.";
        break;
      case "portfolio":
        if (!data.portfolioSummary) return "Lütfen portfolyo özetinizi girin.";
        if (!data.companyDescription) return "Lütfen şirket tanımınızı girin.";
        break;
      case "professionalContact":
        if (!data.contactEmail) return "Lütfen e-posta adresinizi girin.";
        if (!data.phone) return "Lütfen telefon numaranızı girin.";
        break;
      case "professionalUploads":
        // Uploads are optional for professionals
        break;
    }

    return null;
  }

  function showError(msg) {
    if (msg) {
      errorBox.hidden = false;
      errorBox.style.display = "";
      errorText.textContent = msg;
    } else {
      errorBox.hidden = true;
      errorBox.style.display = "none";
      errorText.textContent = "";
    }
  }

  function renderStep() {
    const step = WIZARD_STEPS[currentStep];
    const isLast = currentStep === WIZARD_STEPS.length - 1;

    titleEl.textContent = step.title;
    subtitleEl.textContent = step.subtitle;

    // Update summary photo count
    data._photoCount = uploadFiles.length;

    // Animate card transition
    const card = root.querySelector("[data-wizard-card]");
    if (card) {
      card.style.animation = "none";
      card.offsetHeight; // force reflow
      card.style.animation = "";
    }

    bodyEl.innerHTML = STEP_RENDERERS[currentStep](data);

    // Update progress dots
    const dotsContainer = root.querySelector(".wizard-progress");
    if (dotsContainer) {
      dotsContainer.outerHTML = createProgressDots(WIZARD_STEPS.length, currentStep);
    }

    // Button states
    backBtn.hidden = currentStep === 0;
    const publishLabel = isProfessional ? "Profesyonel İlanı Gönder" : "Proje İlanımı Yayınla";
    nextBtn.textContent = isLast ? publishLabel : "Devam Et";
    nextBtn.classList.toggle("wizard-btn--publish", isLast);
    nextBtn.disabled = false;

    showError(null);

    // Re-attach photo upload handler if on photos or professionalUploads step
    if (step.id === "photos" || step.id === "professionalUploads") {
      setupPhotoUploadHandlers();
      renderUploadPreviews();
    }

    // Block numeric input in project title field
    if (step.id === "projectTitle") {
      const titleInput = bodyEl.querySelector('input[name="projectTitle"]');
      if (titleInput) {
        titleInput.addEventListener("input", () => {
          const cleaned = titleInput.value.replace(/[0-9]/g, "");
          if (cleaned !== titleInput.value) {
            const pos = titleInput.selectionStart - (titleInput.value.length - cleaned.length);
            titleInput.value = cleaned;
            titleInput.setSelectionRange(pos, pos);
          }
        });
        titleInput.addEventListener("paste", (e) => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData("text") || "";
          const cleaned = text.replace(/[0-9]/g, "");
          document.execCommand("insertText", false, cleaned);
        });
      }
    }

    // Block numeric input in project description field
    if (step.id === "projectBrief") {
      const briefTa = bodyEl.querySelector('textarea[name="projectBrief"]');
      if (briefTa) {
        briefTa.addEventListener("input", () => {
          const cleaned = briefTa.value.replace(/[0-9]/g, "");
          if (cleaned !== briefTa.value) {
            const pos = briefTa.selectionStart - (briefTa.value.length - cleaned.length);
            briefTa.value = cleaned;
            briefTa.setSelectionRange(pos, pos);
          }
        });
        briefTa.addEventListener("paste", (e) => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData("text") || "";
          const cleaned = text.replace(/[0-9]/g, "");
          document.execCommand("insertText", false, cleaned);
        });
      }
    }

    // Scroll to top of wizard
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setupPhotoUploadHandlers() {
    const uploadInput = bodyEl.querySelector("[data-wizard-upload-input]");
    if (!uploadInput) return;

    uploadInput.addEventListener("change", () => {
      const incoming = Array.from(uploadInput.files || []).filter(
        (f) => f instanceof File && f.type.startsWith("image/")
      );

      const msgEl = bodyEl.querySelector("[data-wizard-upload-message]");
      const nonImages = Array.from(uploadInput.files || []).filter(
        (f) => f instanceof File && !f.type.startsWith("image/")
      );

      // Merge with existing, max 3
      const existingKeys = new Set(uploadFiles.map((f) => `${f.name}:${f.lastModified}`));
      for (const file of incoming) {
        const key = `${file.name}:${file.lastModified}`;
        if (!existingKeys.has(key) && uploadFiles.length < 3) {
          uploadFiles.push(file);
          existingKeys.add(key);
        }
      }

      if (nonImages.length > 0 && msgEl) {
        msgEl.hidden = false;
        msgEl.textContent = "Yalnızca görsel dosyaları yükleyebilirsiniz.";
      } else if (uploadFiles.length >= 3 && incoming.length > 0 && msgEl) {
        msgEl.hidden = false;
        msgEl.textContent = "En fazla 3 görsel yükleyebilirsiniz.";
      } else if (msgEl) {
        msgEl.hidden = true;
        msgEl.textContent = "";
      }

      renderUploadPreviews();
      showError(null);
    });
  }

  function clearPreviewUrls() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = [];
  }

  function renderUploadPreviews() {
    const previewContainer = bodyEl.querySelector("[data-wizard-upload-preview]");
    if (!previewContainer) return;

    clearPreviewUrls();

    if (uploadFiles.length === 0) {
      previewContainer.hidden = true;
      previewContainer.innerHTML = "";
      return;
    }

    previewContainer.hidden = false;
    previewContainer.innerHTML = uploadFiles
      .map((file, i) => {
        const url = URL.createObjectURL(file);
        previewUrls.push(url);
        return `
          <figure class="wizard-upload-thumb">
            <img src="${url}" alt="${escapeAttr(file.name)}" />
            <button type="button" class="wizard-upload-remove" data-remove-index="${i}" aria-label="Kaldır">×</button>
          </figure>
        `;
      })
      .join("");

    previewContainer.querySelectorAll("[data-remove-index]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute("data-remove-index"));
        uploadFiles = uploadFiles.filter((_, i) => i !== idx);
        renderUploadPreviews();
      });
    });
  }

  async function handleSubmit() {
    nextBtn.disabled = true;
    nextBtn.textContent = "Gönderiliyor...";

    try {
      const formData = new FormData();

      if (isProfessional) {
        formData.set("companyName", data.companyName || "");
        formData.set("professionType", data.professionType || "");
        formData.set("serviceArea", data.serviceArea || "");
        formData.set("experience", data.experience || "");
        formData.set("specialties", data.specialties || "");
        formData.set("pricingModel", data.pricingModel || "");
        formData.set("portfolioSummary", data.portfolioSummary || "");
        formData.set("companyDescription", data.companyDescription || "");
        formData.set("contactEmail", data.contactEmail || "");
        formData.set("phone", data.phone || "");
        formData.set("website", data.website || "");
        formData.set("fullName", "");

        uploadFiles.forEach((file) => {
          formData.append("uploads", file);
        });
      } else {
        formData.set("projectTitle", data.projectTitle || "");
        formData.set("projectType", data.projectType || "");
        formData.set("projectBrief", data.projectBrief || "");
        formData.set("phone", data.phone || "");
        formData.set("preferredLocation", data.preferredLocation || "");
        formData.set("estimatedBudget", getBudgetLabel(data.estimatedBudget));
        formData.set("constructionStarted", getConstructionLabel(data.constructionStarted));
        formData.set("projectSize", data.projectSize || "");

        // Provide defaults for fields the wizard omits but the backend requires
        formData.set("plotStatus", "Not Started");
        formData.set("fullName", "");
        formData.set("email", "");

        uploadFiles.forEach((file) => {
          formData.append("referenceUpload", file);
        });
      }

      const role = isProfessional ? "professional" : "client";
      const listing = await saveMarketplaceSubmission(role, formData);
      onSuccess(listing);
    } catch (error) {
      showError(error?.message || "Gönderiminiz kaydedilemedi. Lütfen tekrar deneyin.");
      nextBtn.disabled = false;
      nextBtn.textContent = isProfessional ? "Profesyonel İlanı Gönder" : "Proje İlanımı Yayınla";
      if (onError) onError(error);
    }
  }

  // Event listeners
  nextBtn.addEventListener("click", async () => {
    animateButton(nextBtn);
    collectStepData();
    const err = validateStep();
    if (err) {
      showError(err);
      return;
    }

    const isLast = currentStep === WIZARD_STEPS.length - 1;
    if (isLast) {
      await handleSubmit();
    } else {
      currentStep++;
      renderStep();
    }
  });

  backBtn.addEventListener("click", () => {
    animateButton(backBtn);
    if (currentStep > 0) {
      collectStepData();
      currentStep--;
      renderStep();
    }
  });

  // Cleanup on unload
  window.addEventListener("beforeunload", clearPreviewUrls, { once: true });

  // Render initial step
  renderStep();
}
