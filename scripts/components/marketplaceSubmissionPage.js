import { createButton } from "./primitives.js";

/* ─────────────────────────────────────────────────
   Marketplace Listing Submission — Step-by-Step Wizard
   Supports both client and professional (developer) flows
   ───────────────────────────────────────────────── */

/* ── Bird mascot images per wizard step ───────── */
const BIRD_STEP_IMAGES = {
  // Client wizard step IDs → bird image
  projectTitle:        "./assets/wizard-birds/step-bird-title.png",
  projectType:         "./assets/wizard-birds/step-bird-category.png",
  projectBrief:        "./assets/wizard-birds/step-bird-description.png",
  contact:             "./assets/wizard-birds/step-bird-contact.png",
  budget:              "./assets/wizard-birds/step-bird-budget.png",
  constructionStarted: "./assets/wizard-birds/step-bird-construction.png",
  projectSize:         "./assets/wizard-birds/step-bird-size.png",
  photos:              "./assets/wizard-birds/step-bird-photos.png",
  summary:             "./assets/wizard-birds/step-bird-submit.png",
  // Professional wizard step IDs → reuse birds that match context
  companyInfo:           "./assets/wizard-birds/step-bird-title.png",
  serviceArea:           "./assets/wizard-birds/step-bird-category.png",
  specialties:           "./assets/wizard-birds/step-bird-description.png",
  pricing:               "./assets/wizard-birds/step-bird-budget.png",
  portfolio:             "./assets/wizard-birds/step-bird-photos.png",
  professionalContact:   "./assets/wizard-birds/step-bird-contact.png",
  professionalUploads:   "./assets/wizard-birds/step-bird-photos.png",
  professionalSummary:   "./assets/wizard-birds/step-bird-submit.png",
};

function getWizardLocale(pageContent) {
  return pageContent?.meta?.locale === "tr" ? "tr" : "en";
}

function clientWizardSteps(isTr) {
  return [
    {
      id: "projectTitle",
      title: isTr ? "Proje Başlığı" : "Project Title",
      subtitle: isTr ? "Projenize kısa ve açık bir başlık verin." : "Give your project a short, clear title.",
    },
    {
      id: "projectType",
      title: isTr ? "Proje Kategorisi" : "Project Category",
      subtitle: isTr ? "Projenize en uygun kategoriyi seçin." : "Choose the best category for your project.",
    },
    {
      id: "projectBrief",
      title: isTr ? "Proje Açıklaması" : "Project Description",
      subtitle: isTr ? "Projenizi detaylı bir şekilde tanımlayın." : "Describe your project in detail.",
    },
    {
      id: "contact",
      title: isTr ? "İletişim ve Konum" : "Contact & Location",
      subtitle: isTr ? "Telefon numaranızı ve proje konumunu girin." : "Enter your phone number and project location.",
    },
    {
      id: "budget",
      title: isTr ? "Bütçe Aralığı" : "Budget Range",
      subtitle: isTr ? "Projeniz için tahmini bütçenizi belirleyin." : "Set your estimated budget for the project.",
    },
    {
      id: "constructionStarted",
      title: isTr ? "İnşaat Durumu" : "Construction Status",
      subtitle: isTr ? "İnşaat başladı mı?" : "Has construction started?",
    },
    {
      id: "projectSize",
      title: isTr ? "Proje Büyüklüğü" : "Project Size",
      subtitle: isTr ? "Projenizin yaklaşık büyüklüğünü girin." : "Enter the approximate size of your project.",
    },
    {
      id: "photos",
      title: isTr ? "Fotoğraflar" : "Photos",
      subtitle: isTr ? "Proje alanı veya referans fotoğraflarını yükleyin." : "Upload site photos or reference images.",
    },
    {
      id: "summary",
      title: isTr ? "Özet" : "Summary",
      subtitle: isTr ? "Bilgilerinizi kontrol edin ve ilanınızı yayınlayın." : "Review your info and publish your listing.",
    },
  ];
}

function professionalWizardSteps(isTr) {
  return [
    {
      id: "companyInfo",
      title: isTr ? "Şirket Bilgileri" : "Company Info",
      subtitle: isTr ? "Şirket adınızı ve meslek türünüzü girin." : "Enter your company name and profession type.",
    },
    {
      id: "serviceArea",
      title: isTr ? "Hizmet Alanı ve Deneyim" : "Service Area & Experience",
      subtitle: isTr ? "Hizmet verdiğiniz bölgeyi ve deneyim sürenizi belirtin." : "Specify your service region and years of experience.",
    },
    {
      id: "specialties",
      title: isTr ? "Uzmanlık Alanları" : "Specialties",
      subtitle: isTr ? "Sunduğunuz hizmetleri ve uzmanlıklarınızı tanımlayın." : "Describe the services and specialties you offer.",
    },
    {
      id: "pricing",
      title: isTr ? "Fiyatlama" : "Pricing",
      subtitle: isTr ? "Başlangıç fiyatınızı veya fiyatlama modelinizi belirtin." : "State your starting price or pricing model.",
    },
    {
      id: "portfolio",
      title: isTr ? "Portfolyo ve Şirket Profili" : "Portfolio & Company Profile",
      subtitle: isTr ? "Geçmiş projelerinizi ve şirketinizi tanıtın." : "Introduce your past projects and company.",
    },
    {
      id: "professionalContact",
      title: isTr ? "İletişim Bilgileri" : "Contact Details",
      subtitle: isTr ? "E-posta, telefon ve website bilgilerinizi girin." : "Enter your email, phone, and website.",
    },
    {
      id: "professionalUploads",
      title: isTr ? "Görseller" : "Images",
      subtitle: isTr ? "Logo, proje görselleri veya portfolyo materyali yükleyin." : "Upload your logo, project images, or portfolio materials.",
    },
    {
      id: "professionalSummary",
      title: isTr ? "Özet" : "Summary",
      subtitle: isTr ? "Bilgilerinizi kontrol edin ve ilanınızı gönderin." : "Review your info and submit your listing.",
    },
  ];
}

function professionTypeOptions(isTr) {
  if (isTr) return ["Mimarlık Ofisi", "Profesyonel", "İnşaat Şirketi", "Anahtar Teslim Yüklenici", "Cephe / Fit-Out Uzmanı"];
  return ["Architecture Firm", "Professional", "Construction Company", "Turnkey Contractor", "Facade / Fit-Out Specialist"];
}

function categoryOptions(isTr) {
  if (isTr) {
    return [
      "Havuz Yapımı", "Havuz Renovasyonu", "Sauna Yapımı", "Jakuzi Kurulumu",
      "Komple Villa Yapımı", "İç Mekan Renovasyonu", "Mutfak Renovasyonu",
      "Banyo Renovasyonu", "Dış Cephe Renovasyonu", "Çatı", "Zemin Kaplama",
      "Boya", "Seramik / Fayans", "Duvar Yapımı", "Sıhhi Tesisat", "Elektrik",
      "Aydınlatma Tasarımı", "Cephe Uygulaması", "Peyzaj", "Bahçe Tasarımı",
      "Pergola / Dış Mekan Yapıları", "Teras Düzenlemesi", "Çit / Korkuluk Yapımı",
      "Garaj Yapımı / Renovasyonu", "Ev Ofis Yapımı", "Spor Salonu / Fitness Alanı",
      "Akıllı Ev Sistemleri", "Güvenlik Sistemleri", "Güneş Paneli Kurulumu",
      "Şarap Mahzeni", "Isıtma / Soğutma Sistemleri", "Yalıtım",
      "Kapı / Pencere Montajı", "Merdiven / Korkuluk", "Asansör Kurulumu",
      "Depolama / Dolap Sistemleri", "Yıkım / Saha Hazırlığı", "Genel İnşaat",
      "Mimarlık / Tasarım", "Özel Proje",
    ];
  }
  return [
    "Pool Construction", "Pool Renovation", "Sauna Construction", "Jacuzzi Installation",
    "Full Villa Construction", "Interior Renovation", "Kitchen Renovation",
    "Bathroom Renovation", "Exterior Renovation", "Roofing", "Flooring",
    "Painting", "Tile / Ceramics", "Wall Construction", "Plumbing", "Electrical",
    "Lighting Design", "Facade Application", "Landscaping", "Garden Design",
    "Pergola / Outdoor Structures", "Terrace Design", "Fence / Railing Construction",
    "Garage Construction / Renovation", "Home Office Build", "Gym / Fitness Area",
    "Smart Home Systems", "Security Systems", "Solar Panel Installation",
    "Wine Cellar", "Heating / Cooling Systems", "Insulation",
    "Door / Window Installation", "Staircase / Railing", "Elevator Installation",
    "Storage / Cabinet Systems", "Demolition / Site Preparation", "General Construction",
    "Architecture / Design", "Custom Project",
  ];
}

function budgetOptions(isTr) {
  return [
    { label: isTr ? "1.000 - 10.000 TL" : "1,000 - 10,000 TL", value: "1000-10000" },
    { label: isTr ? "10.000 - 50.000 TL" : "10,000 - 50,000 TL", value: "10000-50000" },
    { label: isTr ? "50.000 - 150.000 TL" : "50,000 - 150,000 TL", value: "50000-150000" },
    { label: isTr ? "150.000 - 500.000 TL" : "150,000 - 500,000 TL", value: "150000-500000" },
    { label: isTr ? "500.000 - 1.500.000 TL" : "500,000 - 1,500,000 TL", value: "500000-1500000" },
    { label: isTr ? "1.500.000 TL+" : "1,500,000 TL+", value: "1500000+" },
  ];
}

function constructionOptions(isTr) {
  return [
    { label: isTr ? "Hayır, inşaat henüz başlamadı" : "No, construction has not started", value: "no" },
    { label: isTr ? "Evet, inşaat başladı" : "Yes, construction has started", value: "yes" },
  ];
}

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

function renderStepProjectTitle(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-project-title">${isTr ? "Proje Başlığı" : "Project Title"}</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-project-title"
        name="projectTitle"
        placeholder="${isTr ? "Özel sahil villası, havuz restorasyonu, mutfak renovasyonu..." : "Beach villa, pool renovation, kitchen remodel..."}"
        value="${escapeAttr(data.projectTitle || "")}"
        required
      />
    </div>
  `;
}

function renderStepProjectType(data, isTr) {
  const cats = categoryOptions(isTr);
  const options = cats.map((cat) => {
    const selected = data.projectType === cat ? "selected" : "";
    return `<option value="${escapeAttr(cat)}" ${selected}>${cat}</option>`;
  }).join("");

  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-project-type">${isTr ? "Kategori" : "Category"}</label>
      <div class="wizard-select-wrapper">
        <select class="wizard-select" id="wiz-project-type" name="projectType" required>
          <option value="" disabled ${!data.projectType ? "selected" : ""}>${isTr ? "Bir kategori seçin" : "Select a category"}</option>
          ${options}
        </select>
        <svg class="wizard-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}

function renderStepProjectBrief(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-project-brief">${isTr ? "Proje Açıklaması" : "Project Description"}</label>
      <textarea
        class="wizard-textarea"
        id="wiz-project-brief"
        name="projectBrief"
        rows="6"
        placeholder="${isTr ? "Ne inşa ettirmek, yeniletmek veya tamamlatmak istediğinizi açıklayın." : "Describe what you want to build, renovate, or complete."}"
        required
      >${escapeHtml(data.projectBrief || "")}</textarea>
      <small class="wizard-hint">${isTr ? "İletişim bilgilerini proje açıklamasına yazmayınız." : "Do not include contact details in the description."}</small>
    </div>
  `;
}

function renderStepContact(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-phone">${isTr ? "Telefon Numarası" : "Phone Number"}</label>
      <input
        class="wizard-input"
        type="tel"
        id="wiz-phone"
        name="phone"
        placeholder="${isTr ? "+90 5XX XXX XX XX" : "+1 (555) 000-0000"}"
        autocomplete="tel"
        value="${escapeAttr(data.phone || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-location">${isTr ? "Proje Konumu" : "Project Location"}</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-location"
        name="preferredLocation"
        placeholder="${isTr ? "İstanbul, İzmir, Bodrum..." : "Istanbul, Izmir, Bodrum..."}"
        value="${escapeAttr(data.preferredLocation || "")}"
        required
      />
    </div>
  `;
}

function renderStepBudget(data, isTr) {
  const opts = budgetOptions(isTr);
  const options = opts.map((opt) => {
    const selected = data.estimatedBudget === opt.value ? "selected" : "";
    return `<option value="${escapeAttr(opt.value)}" ${selected}>${opt.label}</option>`;
  }).join("");

  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-budget">${isTr ? "Tahmini Bütçe" : "Estimated Budget"}</label>
      <div class="wizard-select-wrapper">
        <select class="wizard-select" id="wiz-budget" name="estimatedBudget" required>
          <option value="" disabled ${!data.estimatedBudget ? "selected" : ""}>${isTr ? "Bütçe aralığı seçin" : "Select a budget range"}</option>
          ${options}
        </select>
        <svg class="wizard-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}

function renderStepConstructionStarted(data, isTr) {
  const opts = constructionOptions(isTr);
  const options = opts.map((opt) => {
    const selected = data.constructionStarted === opt.value ? "selected" : "";
    return `<option value="${escapeAttr(opt.value)}" ${selected}>${opt.label}</option>`;
  }).join("");

  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-construction">${isTr ? "İnşaat başladı mı?" : "Has construction started?"}</label>
      <div class="wizard-select-wrapper">
        <select class="wizard-select" id="wiz-construction" name="constructionStarted" required>
          <option value="" disabled ${!data.constructionStarted ? "selected" : ""}>${isTr ? "Seçin" : "Select"}</option>
          ${options}
        </select>
        <svg class="wizard-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}

function renderStepProjectSize(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-project-size">${isTr ? "Proje Büyüklüğü" : "Project Size"}</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-project-size"
        name="projectSize"
        placeholder="${isTr ? "Yaklaşık 280 m² iç mekan / 900 m² arsa" : "Approx. 280 m² interior / 900 m² plot"}"
        value="${escapeAttr(data.projectSize || "")}"
      />
    </div>
  `;
}

function renderStepPhotos(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label">${isTr ? "Fotoğraf Yükleme" : "Upload Photos"}</label>
      <div class="wizard-upload-area" data-wizard-upload-area>
        <div class="wizard-upload-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <p class="wizard-upload-text">${isTr ? "Fotoğraf yüklemek için dokunun" : "Tap to upload photos"}</p>
        <small class="wizard-upload-hint">${isTr ? "En fazla 3 görsel, max 2MB" : "Up to 3 images, max 2MB each"}</small>
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

function renderStepSummary(data, isTr) {
  const rows = [
    { label: isTr ? "Proje Başlığı" : "Project Title", value: data.projectTitle },
    { label: isTr ? "Kategori" : "Category", value: data.projectType },
    { label: isTr ? "Açıklama" : "Description", value: data.projectBrief ? truncateText(data.projectBrief, 120) : "" },
    { label: isTr ? "Telefon" : "Phone", value: data.phone },
    { label: isTr ? "Konum" : "Location", value: data.preferredLocation },
    { label: isTr ? "Bütçe" : "Budget", value: getBudgetLabel(data.estimatedBudget, isTr) },
    { label: isTr ? "İnşaat Durumu" : "Construction Status", value: getConstructionLabel(data.constructionStarted, isTr) },
    { label: isTr ? "Proje Büyüklüğü" : "Project Size", value: data.projectSize },
    { label: isTr ? "Fotoğraflar" : "Photos", value: data._photoCount ? `${data._photoCount} ${isTr ? "fotoğraf" : "photo(s)"}` : (isTr ? "Yüklenmedi" : "None uploaded") },
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

function getBudgetLabel(value, isTr) {
  if (!value) return "";
  const opt = budgetOptions(isTr).find((o) => o.value === value);
  return opt ? opt.label : value;
}

function getConstructionLabel(value, isTr) {
  if (!value) return "";
  const opt = constructionOptions(isTr).find((o) => o.value === value);
  return opt ? opt.label : value;
}

/* ── Professional (Developer) Step Renderers ───── */

function renderStepCompanyInfo(data, isTr) {
  const opts = professionTypeOptions(isTr);
  const options = opts.map((opt) => {
    const selected = data.professionType === opt ? "selected" : "";
    return `<option value="${escapeAttr(opt)}" ${selected}>${opt}</option>`;
  }).join("");

  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-company-name">${isTr ? "Şirket Adı" : "Company Name"}</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-company-name"
        name="companyName"
        placeholder="${isTr ? "Stüdyo veya firma adı" : "Studio or company name"}"
        value="${escapeAttr(data.companyName || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-profession-type">${isTr ? "Meslek Türü" : "Profession Type"}</label>
      <div class="wizard-select-wrapper">
        <select class="wizard-select" id="wiz-profession-type" name="professionType" required>
          <option value="" disabled ${!data.professionType ? "selected" : ""}>${isTr ? "Meslek türünüzü seçin" : "Select your profession type"}</option>
          ${options}
        </select>
        <svg class="wizard-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
  `;
}

function renderStepServiceArea(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-service-area">${isTr ? "Şehir / Hizmet Alanı" : "City / Service Area"}</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-service-area"
        name="serviceArea"
        placeholder="${isTr ? "İstanbul, İzmir, Bodrum, Ankara..." : "Istanbul, Izmir, Bodrum, Ankara..."}"
        value="${escapeAttr(data.serviceArea || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-experience">${isTr ? "Deneyim Yılı" : "Years of Experience"}</label>
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

function renderStepSpecialties(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-specialties">${isTr ? "Uzmanlıklar / Sunulan Hizmetler" : "Specialties / Services Offered"}</label>
      <textarea
        class="wizard-textarea"
        id="wiz-specialties"
        name="specialties"
        rows="4"
        placeholder="${isTr ? "Villa projeleri, anahtar teslim işler, renovasyon teslimi, fizibilite..." : "Villa projects, turnkey builds, renovation delivery, feasibility..."}"
        required
      >${escapeHtml(data.specialties || "")}</textarea>
    </div>
  `;
}

function renderStepPricing(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-pricing">${isTr ? "Başlangıç Fiyatı veya Fiyatlama Modeli" : "Starting Price or Pricing Model"}</label>
      <input
        class="wizard-input"
        type="text"
        id="wiz-pricing"
        name="pricingModel"
        placeholder="${isTr ? "Konsept paketleri EUR 45K'dan / Anahtar teslim EUR 780K'dan" : "Concept packages from EUR 45K / Turnkey from EUR 780K"}"
        value="${escapeAttr(data.pricingModel || "")}"
        required
      />
    </div>
  `;
}

function renderStepPortfolio(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-portfolio">${isTr ? "Geçmiş Projeler / Portfolyo Özeti" : "Past Projects / Portfolio Summary"}</label>
      <textarea
        class="wizard-textarea"
        id="wiz-portfolio"
        name="portfolioSummary"
        rows="5"
        placeholder="${isTr ? "İlgili geçmiş işlerinizi, hizmet verdiğiniz sektörleri ve teslim gücünüzü özetleyin." : "Summarize your relevant past work, sectors served, and delivery capabilities."}"
        required
      >${escapeHtml(data.portfolioSummary || "")}</textarea>
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-company-desc">${isTr ? "Kısa Şirket Tanımı" : "Brief Company Description"}</label>
      <textarea
        class="wizard-textarea"
        id="wiz-company-desc"
        name="companyDescription"
        rows="4"
        placeholder="${isTr ? "Konumlanmanızı, ekip gücünüzü ve pazardaki uygunluğunuzu kısa ve premium bir tonda anlatın." : "Describe your positioning, team strengths, and market fit in a concise, premium tone."}"
        required
      >${escapeHtml(data.companyDescription || "")}</textarea>
    </div>
  `;
}

function renderStepProfessionalContact(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-contact-email">${isTr ? "İletişim E-postası" : "Contact Email"}</label>
      <input
        class="wizard-input"
        type="email"
        id="wiz-contact-email"
        name="contactEmail"
        placeholder="${isTr ? "ekip@sirket.com" : "team@company.com"}"
        autocomplete="email"
        value="${escapeAttr(data.contactEmail || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-phone">${isTr ? "Telefon Numarası" : "Phone Number"}</label>
      <input
        class="wizard-input"
        type="tel"
        id="wiz-phone"
        name="phone"
        placeholder="${isTr ? "+90 5XX XXX XX XX" : "+1 (555) 000-0000"}"
        autocomplete="tel"
        value="${escapeAttr(data.phone || "")}"
        required
      />
    </div>
    <div class="wizard-field">
      <label class="wizard-label" for="wiz-website">${isTr ? "Website / Portfolyo URL" : "Website / Portfolio URL"}</label>
      <input
        class="wizard-input"
        type="url"
        id="wiz-website"
        name="website"
        placeholder="${isTr ? "https://studionuz.com" : "https://yourstudio.com"}"
        value="${escapeAttr(data.website || "")}"
      />
      <small class="wizard-hint">${isTr ? "İsteğe bağlı" : "Optional"}</small>
    </div>
  `;
}

function renderStepProfessionalUploads(data, isTr) {
  return `
    <div class="wizard-field">
      <label class="wizard-label">${isTr ? "Logo / Proje Görselleri" : "Logo / Project Images"}</label>
      <div class="wizard-upload-area" data-wizard-upload-area>
        <div class="wizard-upload-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <p class="wizard-upload-text">${isTr ? "Görsel yüklemek için dokunun" : "Tap to upload images"}</p>
        <small class="wizard-upload-hint">${isTr ? "En fazla 3 görsel, max 2MB" : "Up to 3 images, max 2MB each"}</small>
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
      <small class="wizard-hint">${isTr ? "İsteğe bağlı — görseller ilanınızı güçlendirir." : "Optional — images help strengthen your listing."}</small>
    </div>
  `;
}

function renderStepProfessionalSummary(data, isTr) {
  const rows = [
    { label: isTr ? "Şirket Adı" : "Company Name", value: data.companyName },
    { label: isTr ? "Meslek Türü" : "Profession Type", value: data.professionType },
    { label: isTr ? "Hizmet Alanı" : "Service Area", value: data.serviceArea },
    { label: isTr ? "Deneyim" : "Experience", value: data.experience ? `${data.experience} ${isTr ? "yıl" : "years"}` : "" },
    { label: isTr ? "Uzmanlıklar" : "Specialties", value: data.specialties ? truncateText(data.specialties, 100) : "" },
    { label: isTr ? "Fiyatlama" : "Pricing", value: data.pricingModel },
    { label: isTr ? "Portfolyo" : "Portfolio", value: data.portfolioSummary ? truncateText(data.portfolioSummary, 80) : "" },
    { label: isTr ? "E-posta" : "Email", value: data.contactEmail },
    { label: isTr ? "Telefon" : "Phone", value: data.phone },
    { label: "Website", value: data.website },
    { label: isTr ? "Görseller" : "Images", value: data._photoCount ? `${data._photoCount} ${isTr ? "görsel" : "image(s)"}` : (isTr ? "Yüklenmedi" : "None uploaded") },
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

/* ── Main Wizard HTML ──────────────────────────── */

export function createMarketplaceSubmissionPage(pageContent, submissionType) {
  const isTr = getWizardLocale(pageContent) === "tr";
  const isProfessional = submissionType === "professional";
  const steps = isProfessional ? professionalWizardSteps(isTr) : clientWizardSteps(isTr);
  const step = steps[0];
  const firstBird = BIRD_STEP_IMAGES[step.id] || BIRD_STEP_IMAGES.projectTitle;
  return `
    <section class="wizard-container section-shell" data-wizard-root data-wizard-type="${isProfessional ? "professional" : "client"}" data-wizard-locale="${isTr ? "tr" : "en"}">
      <div class="wizard-bird" data-wizard-bird>
        <img class="wizard-bird__img" src="${firstBird}" alt="" data-wizard-bird-img />
      </div>
      ${createProgressDots(steps.length, 0)}
      <div class="wizard-card" data-wizard-card>
        <h2 class="wizard-card__title" data-wizard-title>${step.title}</h2>
        <p class="wizard-card__subtitle" data-wizard-subtitle>${step.subtitle}</p>
        <div class="wizard-card__body" data-wizard-body>
          ${isProfessional ? renderStepCompanyInfo({}, isTr) : renderStepProjectTitle({}, isTr)}
        </div>
        <div class="wizard-card__error" data-wizard-error hidden style="display:none;">
          <p data-wizard-error-text></p>
        </div>
      </div>
      <div class="wizard-actions" data-wizard-actions>
        <button class="wizard-btn wizard-btn--back" data-wizard-back type="button" hidden>${isTr ? "Geri" : "Back"}</button>
        <button class="wizard-btn wizard-btn--next" data-wizard-next type="button">${isTr ? "Devam Et" : "Continue"}</button>
      </div>
    </section>
  `;
}

/* ── Wizard Controller (called from main.js) ───── */

export function initSubmissionWizard(container, { saveMarketplaceSubmission, onSuccess, onError }) {
  const root = container.querySelector("[data-wizard-root]");
  if (!root) return;

  const wizardType = root.dataset.wizardType || "client";
  const isTr = (root.dataset.wizardLocale || "tr") === "tr";
  const isProfessional = wizardType === "professional";
  const WIZARD_STEPS = isProfessional ? professionalWizardSteps(isTr) : clientWizardSteps(isTr);

  const CLIENT_STEP_RENDERERS = [
    (d) => renderStepProjectTitle(d, isTr),
    (d) => renderStepProjectType(d, isTr),
    (d) => renderStepProjectBrief(d, isTr),
    (d) => renderStepContact(d, isTr),
    (d) => renderStepBudget(d, isTr),
    (d) => renderStepConstructionStarted(d, isTr),
    (d) => renderStepProjectSize(d, isTr),
    (d) => renderStepPhotos(d, isTr),
    (d) => renderStepSummary(d, isTr),
  ];

  const PROFESSIONAL_STEP_RENDERERS = [
    (d) => renderStepCompanyInfo(d, isTr),
    (d) => renderStepServiceArea(d, isTr),
    (d) => renderStepSpecialties(d, isTr),
    (d) => renderStepPricing(d, isTr),
    (d) => renderStepPortfolio(d, isTr),
    (d) => renderStepProfessionalContact(d, isTr),
    (d) => renderStepProfessionalUploads(d, isTr),
    (d) => renderStepProfessionalSummary(d, isTr),
  ];

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
        break;
      }
    }
  }

  function validateStep() {
    const step = WIZARD_STEPS[currentStep];

    switch (step.id) {
      case "projectTitle":
        if (!data.projectTitle) return isTr ? "Lütfen bir proje başlığı girin." : "Please enter a project title.";
        break;
      case "projectType":
        if (!data.projectType) return isTr ? "Lütfen bir kategori seçin." : "Please select a category.";
        break;
      case "projectBrief":
        if (!data.projectBrief) return isTr ? "Lütfen proje açıklaması girin." : "Please enter a project description.";
        break;
      case "contact":
        if (!data.phone) return isTr ? "Lütfen telefon numaranızı girin." : "Please enter your phone number.";
        if (!data.preferredLocation) return isTr ? "Lütfen proje konumunu girin." : "Please enter the project location.";
        break;
      case "budget":
        if (!data.estimatedBudget) return isTr ? "Lütfen bir bütçe aralığı seçin." : "Please select a budget range.";
        break;
      case "constructionStarted":
        if (!data.constructionStarted) return isTr ? "Lütfen inşaat durumunu seçin." : "Please select the construction status.";
        break;
      case "photos":
        if (uploadFiles.length === 0) return isTr ? "Lütfen en az bir fotoğraf yükleyin." : "Please upload at least one photo.";
        const imgs = bodyEl.querySelectorAll("[data-wizard-upload-preview] img");
        for (const img of imgs) {
          if (!img.complete || img.naturalWidth === 0) return isTr ? "Fotoğraflar yükleniyor, lütfen bekleyin." : "Photos are loading, please wait.";
        }
        break;
      case "companyInfo":
        if (!data.companyName) return isTr ? "Lütfen şirket adınızı girin." : "Please enter your company name.";
        if (!data.professionType) return isTr ? "Lütfen meslek türünüzü seçin." : "Please select your profession type.";
        break;
      case "serviceArea":
        if (!data.serviceArea) return isTr ? "Lütfen hizmet alanınızı girin." : "Please enter your service area.";
        if (!data.experience) return isTr ? "Lütfen deneyim sürenizi girin." : "Please enter your years of experience.";
        break;
      case "specialties":
        if (!data.specialties) return isTr ? "Lütfen uzmanlık alanlarınızı girin." : "Please enter your specialties.";
        break;
      case "pricing":
        if (!data.pricingModel) return isTr ? "Lütfen fiyatlama bilginizi girin." : "Please enter your pricing info.";
        break;
      case "portfolio":
        if (!data.portfolioSummary) return isTr ? "Lütfen portfolyo özetinizi girin." : "Please enter your portfolio summary.";
        if (!data.companyDescription) return isTr ? "Lütfen şirket tanımınızı girin." : "Please enter your company description.";
        break;
      case "professionalContact":
        if (!data.contactEmail) return isTr ? "Lütfen e-posta adresinizi girin." : "Please enter your email address.";
        if (!data.phone) return isTr ? "Lütfen telefon numaranızı girin." : "Please enter your phone number.";
        break;
      case "professionalUploads":
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

    data._photoCount = uploadFiles.length;

    const card = root.querySelector("[data-wizard-card]");
    if (card) {
      card.style.animation = "none";
      card.offsetHeight;
      card.style.animation = "";
    }

    bodyEl.innerHTML = STEP_RENDERERS[currentStep](data);

    const dotsContainer = root.querySelector(".wizard-progress");
    if (dotsContainer) {
      dotsContainer.outerHTML = createProgressDots(WIZARD_STEPS.length, currentStep);
    }

    /* ── Bird mascot transition ── */
    const birdContainer = root.querySelector("[data-wizard-bird]");
    const birdImg = root.querySelector("[data-wizard-bird-img]");
    if (birdContainer && birdImg) {
      const nextSrc = BIRD_STEP_IMAGES[step.id] || "";
      if (nextSrc && birdImg.src !== nextSrc) {
        // Horizontal position: bird walks left→right across steps
        const progress = WIZARD_STEPS.length > 1 ? currentStep / (WIZARD_STEPS.length - 1) : 0;
        birdContainer.style.setProperty("--bird-progress", progress);
        // Crossfade: fade out, swap src, fade in
        birdImg.classList.add("wizard-bird__img--exit");
        setTimeout(() => {
          birdImg.src = nextSrc;
          birdImg.classList.remove("wizard-bird__img--exit");
          birdImg.classList.add("wizard-bird__img--enter");
          setTimeout(() => {
            birdImg.classList.remove("wizard-bird__img--enter");
          }, 350);
        }, 200);
      }
      // Update position even if image didn't change
      const progress = WIZARD_STEPS.length > 1 ? currentStep / (WIZARD_STEPS.length - 1) : 0;
      birdContainer.style.setProperty("--bird-progress", progress);
    }

    backBtn.hidden = currentStep === 0;
    backBtn.textContent = isTr ? "Geri" : "Back";
    const publishLabel = isProfessional
      ? (isTr ? "Profesyonel İlanı Gönder" : "Submit Professional Listing")
      : (isTr ? "Proje İlanımı Yayınla" : "Publish My Listing");
    nextBtn.textContent = isLast ? publishLabel : (isTr ? "Devam Et" : "Continue");
    nextBtn.classList.toggle("wizard-btn--publish", isLast);
    nextBtn.disabled = false;

    showError(null);

    if (step.id === "photos" || step.id === "professionalUploads") {
      setupPhotoUploadHandlers();
      renderUploadPreviews();
    }

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
        msgEl.textContent = isTr ? "Yalnızca görsel dosyaları yükleyebilirsiniz." : "Only image files can be uploaded.";
      } else if (uploadFiles.length >= 3 && incoming.length > 0 && msgEl) {
        msgEl.hidden = false;
        msgEl.textContent = isTr ? "En fazla 3 görsel yükleyebilirsiniz." : "You can upload a maximum of 3 images.";
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
            <button type="button" class="wizard-upload-remove" data-remove-index="${i}" aria-label="${isTr ? "Kaldır" : "Remove"}">×</button>
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
    nextBtn.textContent = isTr ? "Gönderiliyor..." : "Submitting...";

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
        formData.set("estimatedBudget", getBudgetLabel(data.estimatedBudget, isTr));
        formData.set("constructionStarted", getConstructionLabel(data.constructionStarted, isTr));
        formData.set("projectSize", data.projectSize || "");

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
      showError(error?.message || (isTr ? "Gönderiminiz kaydedilemedi. Lütfen tekrar deneyin." : "Your submission could not be saved. Please try again."));
      nextBtn.disabled = false;
      const publishLabel = isProfessional
        ? (isTr ? "Profesyonel İlanı Gönder" : "Submit Professional Listing")
        : (isTr ? "Proje İlanımı Yayınla" : "Publish My Listing");
      nextBtn.textContent = publishLabel;
      if (onError) onError(error);
    }
  }

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

  window.addEventListener("beforeunload", clearPreviewUrls, { once: true });

  renderStep();
}
