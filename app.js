const THEME_KEY = "lodos-atlasi-theme";
const LANG_KEY = "lodos-atlasi-language";
const WATCHLIST_KEY = "lodos-atlasi-watchlist";

let currentLang = localStorage.getItem(LANG_KEY) || "tr";
let mapInstance;
let markerMap = new Map();
let poiMap = new Map();
let activeDistrictId = "ilica";
let activeMapSpotId = "ilica";

const COPY = {
  tr: {
    brand: { subtitle: "Çeşme gayrimenkul radarı" },
    nav: {
      home: "Anasayfa",
      listings: "İlanlar",
      methodology: "Metodoloji",
      watchlist: "İzleme Listesi",
      contact: "İletişim"
    },
    home: {
      hero: {
        eyebrow: "Sadece Çeşme, sadece yatırım odağı",
        title: "Çeşme’de bugün hangi mahalle daha mantıklı bir giriş sunuyor?",
        lead:
          "Bu ekran Çeşme’de hangi mahallede giriş daha mantıklı, hangi ilanda fiyat avantajı var ve kira tarafı nasıl görünüyor sorularını tek yerde toplar.",
        ctaPrimary: "Tüm ilanları aç",
        ctaSecondary: "Yöntemi incele"
      },
      model: {
        eyebrow: "Canlı katman",
        title: "Gerçek harita üstünde hareket eden Çeşme yatırım yüzeyi."
      },
      signal: {
        eyebrow: "Bugünün kısa notu",
        title: "Ilıca daha dengeli, Ovacık daha büyüme odaklı, Alaçatı ise daha pahalı kalıyor.",
        text:
          "Bugün ilk tarama için Ilıca ve Ovacık daha mantıklı. Son kararı ise doğru ilan seçimi veriyor."
      },
      sections: {
        listings: { eyebrow: "Bugünün seçili satış fırsatları", title: "İç galerili, detay sayfasına açılan seçilmiş ilanlar." },
        brokers: { eyebrow: "Danışman masası", title: "Çeşme ceplerini izleyen yerel broker ekibi." },
        map: { eyebrow: "Yatırım haritası", title: "Çeşme içinde bugün nereye daha yakından bakılmalı?" },
        yield: { eyebrow: "Kira verimi", title: "Yaz, kış ve 12 ay taşıma senaryoları." },
        history: { eyebrow: "25 yıllık iz", title: "Nominal büyüme ile reel değer tutma aynı grafikte." }
      },
      history: {
        noteEyebrow: "Model notu",
        noteTitle: "Bu eğri resmi Çeşme serisi değil; makro seri ile yerel ilan davranışının melez modelidir.",
        noteText: "Amaç, size sadece fiyat artışını değil enflasyon sonrası korunabilen gerçek değeri de göstermek."
      }
    },
    shop: {
      hero: {
        eyebrow: "Tüm seçili ilanlar",
        title: "Satış fırsatlarını iç görseller, iskonto ve kira senaryolarıyla karşılaştırın.",
        lead: "Her kart sizi aynı site içinde detay sayfasına götürür. Dış yönlendirme yerine görsel, veri ve kısa yorum içeride tutulur."
      }
    },
    about: {
      hero: {
        eyebrow: "Metodoloji",
        title: "Veri katmanı nasıl kuruldu, mahalle skoru nasıl üretildi?",
        lead: "Çeşme için açık ilan akışları, mahalle trend sayfaları ve TCMB omurgası birlikte okunarak sadeleştirildi."
      },
      cards: {
        scoreTitle: "Skor mantığı",
        scoreText: "Yatırım skoru dört sütuna bakar: giriş erişilebilirliği, büyüme beklentisi, kira çevikliği ve yeniden satış likiditesi.",
        yieldTitle: "Getiri mantığı",
        yieldText: "Yaz ve kış senaryoları, açık kiralama akışları ile satış fiyatının birlikte okunmasından türetilmiş brüt senaryolardır.",
        historyTitle: "25 yıl modeli",
        historyText: "2010 sonrası TCMB KFE ile, öncesi kıyı premium projeksiyonu ve saha davranışı çaprazlanarak okunmuştur."
      },
      note: {
        eyebrow: "Kaynak disiplini",
        title: "Kaynak isimleri içeride tutulur; kullanıcı akışı dışarı taşınmaz.",
        text: "Bu sürümde veri kaynağı isimleri gösterilir ama kullanıcı deneyimi dış listing sitelerine yönlendirilmez."
      },
      sources: {
        eyebrow: "Kullanılan açık veri katmanı",
        title: "Mahalle trendleri ve piyasa referansları"
      }
    },
    contact: {
      hero: {
        eyebrow: "İletişim",
        title: "Yeni mahalle, yeni listing veya özel analiz isteği bırakın.",
        lead: "Ürün içinde görmek istediğiniz ek veri başlıklarını buradan not edebilirsiniz."
      },
      info: {
        title: "İçeride tutulan akış",
        text: "Bu ürün, kullanıcıyı dış sitelere taşımadan Çeşme odaklı yatırım okuması vermek için tasarlandı."
      },
      stats: {
        focus: "Odak alanı",
        focusValue: "Çeşme / İzmir",
        cadence: "Tarama ritmi",
        cadenceValue: "Saatlik pencere",
        type: "Sayfa tipi",
        typeValue: "İç galerili listing"
      },
      form: {
        name: "Ad Soyad",
        namePlaceholder: "Adınızı yazın",
        email: "E-posta",
        emailPlaceholder: "ornek@mail.com",
        subject: "Talep başlığı",
        subjectPlaceholder: "Yeni mahalle ekleme",
        message: "Mesaj",
        messagePlaceholder: "Hangi veriyi görmek istediğinizi yazın.",
        submit: "Talebi kaydet",
        success: "{name}, talebiniz örnek olarak kaydedildi."
      }
    },
    watchlist: {
      hero: {
        eyebrow: "İzleme listesi",
        title: "Kaydettiğiniz ilanları tek yerde tekrar karşılaştırın.",
        lead: "Kart üzerindeki kaydet düğmesiyle seçtiğiniz ilanlar burada tutulur."
      },
      empty: {
        eyebrow: "Henüz kayıt yok",
        title: "İlan kartlarındaki “Kaydet” düğmesiyle burayı doldurabilirsiniz.",
        text: "İzleme listesi sadece bu tarayıcı içinde saklanır.",
        cta: "İlanlara git"
      }
    },
    product: {
      related: {
        eyebrow: "Benzer fırsatlar",
        title: "Aynı ürün içinde kıyaslayabileceğiniz diğer seçili ilanlar."
      },
      allListings: "Tüm İlanlar"
    },
    footer: {
      home: "Lodos Atlası, Çeşme özelindeki açık piyasa verilerini okunur hale getiren modern bir analiz arayüzüdür.",
      shop: "İlan detayları ve iç galeriler ürün içinde tutulur.",
      about: "Metodoloji sayfası, ürün içindeki tüm yorumların nasıl üretildiğini açıklar.",
      contact: "İletişim akışı demodur; form gönderimi tarayıcı içinde örnek olarak çalışır.",
      watchlist: "İzleme listesi tarayıcı içinde saklanır.",
      product: "Detay sayfaları kullanıcıyı ürün dışına taşımaz; görsel ve veri içeride okunur."
    },
    controls: {
      themeLight: "Açık Mod",
      themeDark: "Koyu Mod",
      lang: "EN"
    },
    assistant: {
      title: "Lodos AI",
      subtitle: "Çeşme verisiyle çalışan yerel emlak asistanı",
      placeholder: "Örn: Şu an hangi mahalle daha mantıklı?",
      ask: "Sor",
      clear: "Temizle",
      intro: "Çeşme’de mahalle, ilan, getiri ve geçmiş değer sorularını mevcut veri setiyle yanıtlarım.",
      unrelated: "Bu asistan şu anda yalnızca Çeşme emlak verisi hakkında yanıt veriyor.",
      suggestions: [
        "En iyi mahalle hangisi?",
        "En yüksek kira getirisi nerede?",
        "En ucuz giriş hangi bölgede?"
      ]
    },
    dynamic: {
      syncPrefix: "Son senkron",
      nextScan: "Bir sonraki tarama penceresi",
      selectedOpportunity: "Seçili fırsat",
      averageDiscount: "Ortalama iskonto",
      strongestSummer: "En güçlü yaz getirisi",
      lowestEntry: "En ucuz giriş",
      featuredSet: "Bugünün öne çıkan seti",
      relativeToDistrict: "Mahalle ortalamasına göre",
      seasonalGross: "Sezonluk brüt",
      growthExpectationSuffix: "büyüme beklentisinde",
      save: "Kaydet",
      saved: "Kaydedildi",
      openDetail: "Detayı Aç",
      internalPage: "İç galeri ve veri sayfası",
      salePrice: "Satış fiyatı",
      grossArea: "Brüt alan",
      sqmCost: "m² maliyeti",
      annualGross: "12 ay brüt",
      discountAdvantage: "iskonto avantajı",
      allFilter: "Tümü",
      districtView: "Mahalle görünümü",
      investmentScore: "Yatırım skoru",
      averageSqm: "Ortalama m²",
      expected12Month: "12 aylık beklenti",
      amortization: "Amortisman",
      averageMonthlyRent: "Ortalama aylık kira",
      entryBand: "Giriş bandı",
      annualScenario: "12 ay brüt",
      accessibility: "Fiyat erişilebilirliği",
      growthPotential: "Büyüme potansiyeli",
      rentAgility: "Kira çevikliği",
      resaleLiquidity: "Yeniden satış likiditesi",
      districtScenario: "Mahalle senaryosu",
      score: "Skor",
      summerPeriod: "Yaz dönemi",
      winterPeriod: "Kış dönemi",
      annualBase: "12 ay baz",
      annualRankingEyebrow: "12 ay taşıma sıralaması",
      annualRankingTitle: "Yıl boyu dengede öne çıkan mahalleler",
      nominal: "Nominal",
      real: "Reel",
      nominal25: "25 yılda nominal",
      real25: "25 yılda reel",
      growthLeader: "Büyüme lideri",
      annualLeader: "12 ay lideri",
      nominalLegend: "Mavi çizgi: nominal fiyat büyümesi",
      realLegend: "Kırmızı çizgi: enflasyon sonrası reel değer koruma",
      sourceScope: "Kaynak alanı",
      listingDataPage: "Listing veri sayfası",
      districtAdvantage: "Mahalleye göre avantaj",
      summerGross: "Yaz dönemi brüt",
      backToListings: "Diğer ilanlara dön",
      addToWatchlist: "İzleme listesine ekle",
      microLocation: "Mikro lokasyon",
      strengths: "Güçlü taraflar",
      risks: "Takip edilmesi gerekenler",
      noRecords: "Henüz kayıt yok",
      referencePhotos: "fotoğraf referansı",
      sourceBlend: "Çapraz kaynak",
      mapFallback: "Gerçek harita yüklenemedi.",
      mapAttribution: "Çeşme için stilize yatırım çizimi üzerinde gösteriliyor.",
      assignedBroker: "Sorumlu broker",
      brokerDesk: "Broker masası",
      brokerFocus: "Uzmanlık odağı",
      brokerCoverage: "Takip ettiği cep",
      brokerPhone: "Telefon",
      brokerEmail: "E-posta",
      contactBroker: "Broker ile konuş"
    }
  },
  en: {
    brand: { subtitle: "Cesme real estate radar" },
    nav: {
      home: "Home",
      listings: "Listings",
      methodology: "Methodology",
      watchlist: "Watchlist",
      contact: "Contact"
    },
    home: {
      hero: {
        eyebrow: "Only Cesme, only investment focus",
        title: "Which Cesme district offers the smartest entry point today?",
        lead:
          "This screen brings the core questions together in one place: which district is the smarter entry, which listing has pricing edge, and how strong does rental carry look?",
        ctaPrimary: "Open all listings",
        ctaSecondary: "Review methodology"
      },
      model: {
        eyebrow: "Live layer",
        title: "A moving Cesme investment surface on top of a real map."
      },
      signal: {
        eyebrow: "Today's quick note",
        title: "Ilica looks balanced, Ovacik is more growth-led, and Alacati stays more expensive.",
        text:
          "For a first scan today, Ilica and Ovacik look cleaner. The real edge still comes from choosing the right listing."
      },
      sections: {
        listings: { eyebrow: "Today's selected sale opportunities", title: "Curated listings with internal galleries and dedicated detail pages." },
        brokers: { eyebrow: "Broker desk", title: "The local broker team tracking Cesme micro-pockets." },
        map: { eyebrow: "Investment map", title: "Where inside Cesme deserves a closer look right now?" },
        yield: { eyebrow: "Rental yield", title: "Summer, winter and full-year carry scenarios." },
        history: { eyebrow: "25-year trace", title: "Nominal growth and real value retention on the same chart." }
      },
      history: {
        noteEyebrow: "Model note",
        noteTitle: "This is not an official Cesme-only series; it is a hybrid model built from macro data and local listing behavior.",
        noteText: "The goal is to show not just price growth, but how much value survives after inflation."
      }
    },
    shop: {
      hero: {
        eyebrow: "All selected listings",
        title: "Compare sale opportunities with internal visuals, discount levels, and rental scenarios.",
        lead: "Every card opens its own page inside the product. Visuals, data and short notes stay on-site."
      }
    },
    about: {
      hero: {
        eyebrow: "Methodology",
        title: "How was the data layer built and how is the district score produced?",
        lead: "Open listing flows, district trend pages and the CBRT backbone were simplified together for Cesme."
      },
      cards: {
        scoreTitle: "Scoring logic",
        scoreText: "The investment score blends entry accessibility, growth expectation, rental agility and resale liquidity.",
        yieldTitle: "Yield logic",
        yieldText: "Summer and winter scenarios are gross models derived from open rental flows cross-read against sale pricing.",
        historyTitle: "25-year model",
        historyText: "Post-2010 is anchored on the CBRT housing index; earlier years are backfilled through coastal premium projections and field behavior."
      },
      note: {
        eyebrow: "Source discipline",
        title: "Source names stay inside the product; the user flow does not get pushed outside.",
        text: "This version shows source families while keeping the experience inside the platform."
      },
      sources: {
        eyebrow: "Open data stack used",
        title: "District trends and market references"
      }
    },
    contact: {
      hero: {
        eyebrow: "Contact",
        title: "Request a new district, a new listing, or a custom analysis.",
        lead: "Use this form to note the extra data layers you want to see inside the product."
      },
      info: {
        title: "On-platform flow",
        text: "This product is designed to deliver a Cesme-focused investment reading without pushing the user to outside listing sites."
      },
      stats: {
        focus: "Focus area",
        focusValue: "Cesme / Izmir",
        cadence: "Refresh cadence",
        cadenceValue: "Hourly window",
        type: "Page type",
        typeValue: "Internal gallery listing"
      },
      form: {
        name: "Full name",
        namePlaceholder: "Type your name",
        email: "Email",
        emailPlaceholder: "name@mail.com",
        subject: "Request title",
        subjectPlaceholder: "Add a new district",
        message: "Message",
        messagePlaceholder: "Write the data layer you want to see.",
        submit: "Save request",
        success: "{name}, your request was saved as a demo."
      }
    },
    watchlist: {
      hero: {
        eyebrow: "Watchlist",
        title: "Compare the listings you saved in one place.",
        lead: "Saved cards are kept here through each card's save action."
      },
      empty: {
        eyebrow: "No saved listings yet",
        title: "Use the Save button on listing cards to fill this space.",
        text: "The watchlist is stored only inside this browser.",
        cta: "Go to listings"
      }
    },
    product: {
      related: {
        eyebrow: "Related opportunities",
        title: "Other selected listings you can compare inside the same product."
      },
      allListings: "All Listings"
    },
    footer: {
      home: "Lodos Atlasi is a modern interface that makes Cesme-specific open market data easier to read.",
      shop: "Listing detail and gallery flows are kept inside the product.",
      about: "The methodology page explains how the product's comments and scores are produced.",
      contact: "The contact flow is a demo; form submission works inside the browser.",
      watchlist: "The watchlist is stored in the browser.",
      product: "Detail pages keep visuals and data inside the product experience."
    },
    controls: {
      themeLight: "Light Mode",
      themeDark: "Dark Mode",
      lang: "TR"
    },
    assistant: {
      title: "Lodos AI",
      subtitle: "A local assistant powered by Cesme market data",
      placeholder: "Example: Which district looks strongest right now?",
      ask: "Ask",
      clear: "Clear",
      intro: "I answer questions about Cesme districts, listings, rental yield, and value history using the current local dataset.",
      unrelated: "This assistant currently answers only Cesme real estate data questions.",
      suggestions: [
        "Which district is best?",
        "Where is rental yield highest?",
        "Which area has the lowest entry?"
      ]
    },
    dynamic: {
      syncPrefix: "Last sync",
      nextScan: "Next scan window",
      selectedOpportunity: "Selected opportunities",
      averageDiscount: "Average discount",
      strongestSummer: "Best summer yield",
      lowestEntry: "Lowest entry",
      featuredSet: "Today's highlighted set",
      relativeToDistrict: "Relative to district average",
      seasonalGross: "Seasonal gross",
      growthExpectationSuffix: "growth expectation",
      save: "Save",
      saved: "Saved",
      openDetail: "Open Detail",
      internalPage: "Internal gallery and data page",
      salePrice: "Sale price",
      grossArea: "Gross area",
      sqmCost: "Price per m²",
      annualGross: "12-month gross",
      discountAdvantage: "discount advantage",
      allFilter: "All",
      districtView: "District view",
      investmentScore: "Investment score",
      averageSqm: "Average m²",
      expected12Month: "12-month expectation",
      amortization: "Payback",
      averageMonthlyRent: "Average monthly rent",
      entryBand: "Entry band",
      annualScenario: "12-month gross",
      accessibility: "Price accessibility",
      growthPotential: "Growth potential",
      rentAgility: "Rental agility",
      resaleLiquidity: "Resale liquidity",
      districtScenario: "District scenario",
      score: "Score",
      summerPeriod: "Summer period",
      winterPeriod: "Winter period",
      annualBase: "12-month base",
      annualRankingEyebrow: "12-month carry ranking",
      annualRankingTitle: "Districts leading on full-year balance",
      nominal: "Nominal",
      real: "Real",
      nominal25: "25-year nominal",
      real25: "25-year real",
      growthLeader: "Growth leader",
      annualLeader: "12-month leader",
      nominalLegend: "Blue line: nominal price growth",
      realLegend: "Red line: real value retention after inflation",
      sourceScope: "Source scope",
      listingDataPage: "Listing data page",
      districtAdvantage: "Advantage vs district",
      summerGross: "Summer gross",
      backToListings: "Back to listings",
      addToWatchlist: "Add to watchlist",
      microLocation: "Micro-location",
      strengths: "Strengths",
      risks: "Things to watch",
      noRecords: "No saved records yet",
      referencePhotos: "reference photos",
      sourceBlend: "Cross-source blend",
      mapFallback: "Real map could not be loaded.",
      mapAttribution: "Displayed on a stylized Cesme investment drawing.",
      assignedBroker: "Assigned broker",
      brokerDesk: "Broker desk",
      brokerFocus: "Focus",
      brokerCoverage: "Coverage",
      brokerPhone: "Phone",
      brokerEmail: "Email",
      contactBroker: "Contact broker"
    }
  }
};

const MARKET = {
  syncedAt: "2026-03-10T22:00:00+03:00",
  refreshHours: 1,
  districts: [
    {
      id: "ilica",
      name: "Ilıca",
      nameEn: "Ilica",
      coords: [38.321, 26.374],
      score: 91,
      priceSqm: 149547,
      expectedChange: 12,
      amortization: 34,
      averageRent: 27000,
      summerYield: 5.4,
      winterYield: 3.0,
      annualYield: 4.5,
      entryBand: "120-150 bin TL/m²",
      entryBandEn: "TRY 120k-150k / m²",
      summary:
        "Plaj, termal marka değeri ve merkez erişimi sayesinde giriş maliyeti ile kısa dönem kira potansiyelini en dengeli taşıyan küme.",
      summaryEn:
        "The most balanced cluster for entry cost and short-term rental potential thanks to beach access, thermal branding, and central connectivity.",
      note:
        "Yıldızburnu ve plaja yürüme mesafesindeki stok daha hızlı devir görüyor. Yaz getirisi yüksek, yeniden satış likiditesi güçlü.",
      noteEn:
        "Stock within walking distance of Yıldızburnu and the beach turns faster. Summer yield is strong and resale liquidity remains solid.",
      factors: { erisilebilirlik: 82, buyume: 64, kira: 89, likidite: 92 }
    },
    {
      id: "ovacik",
      name: "Ovacık",
      nameEn: "Ovacik",
      coords: [38.291, 26.333],
      score: 89,
      priceSqm: 81730,
      expectedChange: 17,
      amortization: 16,
      averageRent: 48178,
      summerYield: 5.1,
      winterYield: 3.9,
      annualYield: 4.9,
      entryBand: "80-108 bin TL/m²",
      entryBandEn: "TRY 80k-108k / m²",
      summary:
        "Alaçatı'ya yakın ama daha düşük giriş maliyetiyle çalışan büyüme odaklı kuşak. 12 aylık değer artışı beklentisi güçlü.",
      summaryEn:
        "A growth-oriented belt near Alacati but with a lower entry cost. Expected 12-month appreciation remains strong.",
      note:
        "Büyük parseller ve yeni villa stoğu nedeniyle ürün seçimi kritik. Doğru giriş fiyatında yeniden değerleme marjı yüksek.",
      noteEn:
        "Large plots and newer villa stock make selection critical. With the right entry price, repricing upside stays attractive.",
      factors: { erisilebilirlik: 93, buyume: 88, kira: 78, likidite: 70 }
    },
    {
      id: "dalyan",
      name: "Dalyan",
      nameEn: "Dalyan",
      coords: [38.332, 26.306],
      score: 86,
      priceSqm: 108030,
      expectedChange: 10,
      amortization: 21,
      averageRent: 49657,
      summerYield: 5.0,
      winterYield: 3.1,
      annualYield: 4.0,
      entryBand: "105-125 bin TL/m²",
      entryBandEn: "TRY 105k-125k / m²",
      summary:
        "Marina ve koy etkisi sayesinde yaz sezonu kuvvetli; aynı zamanda oturum ve ikinci ev talebiyle kışın da tamamen sönmeyen bir mahalle.",
      summaryEn:
        "Strong in summer due to marina and bay exposure, while owner-occupier and second-home demand keeps winter activity from collapsing.",
      note:
        "Dalyan merkez, marina ve Kocakarı Plajı çevresi farklı fiyat cepleri oluşturuyor. Mikro lokasyon farkı burada daha belirgin.",
      noteEn:
        "Dalyan center, the marina and the Kocakari beach belt create separate price pockets. Micro-location differences matter more here.",
      factors: { erisilebilirlik: 86, buyume: 58, kira: 84, likidite: 82 }
    },
    {
      id: "reisdere",
      name: "Reisdere / Şifne",
      nameEn: "Reisdere / Sifne",
      coords: [38.276, 26.355],
      score: 84,
      priceSqm: 99887,
      expectedChange: 15,
      amortization: 20,
      averageRent: 40176,
      summerYield: 5.1,
      winterYield: 3.4,
      annualYield: 4.5,
      entryBand: "100-117 bin TL/m²",
      entryBandEn: "TRY 100k-117k / m²",
      summary:
        "Termal hat, sessiz yaşam ve görece erişilebilir giriş maliyeti ile hem kullanım hem yatırım tarafında dengeli çalışan kıyı kuşağı.",
      summaryEn:
        "A coastal belt that balances use and investment through thermal appeal, quieter living and relatively accessible entry pricing.",
      note:
        "Şifne sezonluk kirada daha canlı, Reisdere ise yıllık kullanımda daha istikrarlı. İkisini birlikte okumak daha sağlıklı.",
      noteEn:
        "Sifne is livelier in seasonal rentals, while Reisdere behaves better in full-year use. Reading them together is more accurate.",
      factors: { erisilebilirlik: 88, buyume: 79, kira: 80, likidite: 73 }
    },
    {
      id: "ciftlik",
      name: "Çiftlik",
      nameEn: "Ciftlik",
      coords: [38.257, 26.314],
      score: 81,
      priceSqm: 118140,
      expectedChange: 14,
      amortization: 25,
      averageRent: 54320,
      summerYield: 4.8,
      winterYield: 2.8,
      annualYield: 3.5,
      entryBand: "95-120 bin TL/m²",
      entryBandEn: "TRY 95k-120k / m²",
      summary:
        "Pırlanta ve beach club hattı sayesinde güçlü yaz talebi alıyor; fakat 12 aylık taşıma performansı mahalle içi ürün tipine göre sert ayrışıyor.",
      summaryEn:
        "Benefits from strong summer demand thanks to the Pirlanta and beach-club line, but full-year carry varies sharply by product type.",
      note:
        "Çiftlik'te yazlık getiri seçici biçimde çok iyi olabilir. Ancak yıllık kullanım için merkeze ve hizmet aksına mesafe önemli.",
      noteEn:
        "Summer returns can be excellent in selective products, but distance to the center and services matters for year-round use.",
      factors: { erisilebilirlik: 74, buyume: 72, kira: 77, likidite: 68 }
    },
    {
      id: "alacati",
      name: "Alaçatı",
      nameEn: "Alacati",
      coords: [38.286, 26.375],
      score: 78,
      priceSqm: 171655,
      expectedChange: 22,
      amortization: 36,
      averageRent: 39722,
      summerYield: 4.3,
      winterYield: 2.9,
      annualYield: 3.6,
      entryBand: "145-172 bin TL/m²",
      entryBandEn: "TRY 145k-172k / m²",
      summary:
        "Prestij, uluslararası görünürlük ve yüksek likidite sağlıyor; ancak giriş fiyatı zaten pahalı olduğu için hata payı daha dar.",
      summaryEn:
        "Delivers prestige, international visibility and high liquidity, but the already expensive entry price leaves less room for error.",
      note:
        "Alaçatı bugün daha çok sermaye koruma ve prestijli likidite oyunu. Fırsat ancak mahalle ortalamasının altında açılan seçili ilanlarda oluşuyor.",
      noteEn:
        "Alacati now works more as a capital-preservation and prestige-liquidity play. Value appears mainly in carefully selected below-average listings.",
      factors: { erisilebilirlik: 42, buyume: 94, kira: 69, likidite: 95 }
    }
  ],
  listings: [
    {
      id: "alacati-class-site",
      district: "alacati",
      broker: "selin-kaya",
      title: "Class'tan Ilıcaya Yakın Havuzlu Site İçinde Satılık Şık 3+1 Dubleks Villa",
      price: 18000000,
      size: 150,
      rooms: "3+1",
      photoCount: 59,
      seasonRent: 750000,
      annualRent: 720000,
      teaser: "Alaçatı ortalamasının ciddi altında m² maliyetiyle giriş için seçili fırsat.",
      teaserEn: "A curated entry opportunity with a serious discount to the Alacati district average.",
      microLocation: "Alaçatı - Ilıca geçiş bandı",
      microLocationEn: "Alacati - Ilica transition belt",
      strategy: "Prestijli lokasyonda iskontolu giriş ve orta vadeli yeniden satış opsiyonu.",
      strategyEn: "Discounted entry in a prestige location with mid-term resale optionality.",
      strengths: [
        "Mahalle ortalamasının altında m² maliyeti",
        "Site içi düzenli ürün tipi",
        "Yaz sezonunda hızlı kiralanabilir stok"
      ],
      strengthsEn: [
        "Price per m² below district average",
        "Consistent site-format product",
        "Fast-leasing stock in summer"
      ],
      risks: [
        "Alaçatı premiumu nedeniyle alıcı kitlesi daha seçici",
        "Kış kullanımı ürün tipine göre zayıflayabilir",
        "Çevre stok arttığında iskontolu alımlar öne çıkar"
      ],
      risksEn: [
        "Buyer pool is more selective because of the Alacati premium",
        "Winter use can weaken depending on product type",
        "Discounted entries matter more if surrounding stock grows"
      ],
      summary:
        "Alaçatı markasını tamamen fiyatlamak istemeyen yatırımcı için, Ilıca geçiş bandında daha kontrollü bir giriş imkanı sunuyor.",
      summaryEn:
        "For investors who do not want to fully pay the Alacati premium, this offers a more controlled entry on the Ilica transition belt.",
      sourceBlend: ["Hepsiemlak", "Sahibinden", "Emlakjet"],
      images: [
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80"
      ]
    },
    {
      id: "alacati-camlik-firsat",
      district: "alacati",
      broker: "selin-kaya",
      title: "Alaçatı Çamlık Yol'da Fırsat 3+1 Bahçeli Müstakil Satılık Villa",
      price: 20500000,
      size: 150,
      rooms: "3+1",
      photoCount: 42,
      seasonRent: 850000,
      annualRent: 720000,
      teaser: "Çamlık Yol bandında yeniden satış kabiliyeti yüksek, giriş fiyatı köy içi premiumun altında.",
      teaserEn: "High-resale potential on the Camlik Road belt with an entry level below the inner-village premium.",
      microLocation: "Alaçatı - Çamlık Yol hattı",
      microLocationEn: "Alacati - Camlik Road line",
      strategy: "Likiditesi yüksek bir cepte daha sakin fiyat bandından pozisyon alma.",
      strategyEn: "Taking a position from a calmer price band inside a high-liquidity pocket.",
      strengths: [
        "Bahçeli müstakil ürün tipi",
        "Yeniden satışta güçlü algı",
        "Yaz sezonunda yüksek ödeme gücü segmenti"
      ],
      strengthsEn: [
        "Detached garden product",
        "Strong resale perception",
        "High spending-power summer audience"
      ],
      risks: [
        "Bakım maliyeti site içi ürünlere göre daha yüksek olabilir",
        "Piyasada yeni benzer stoklar çıkarsa süre uzayabilir",
        "Yüksek giriş fiyatı hata payını azaltır"
      ],
      risksEn: [
        "Maintenance cost can be higher than site-format stock",
        "Selling time may extend if similar new stock appears",
        "High entry pricing leaves less room for error"
      ],
      summary:
        "Alaçatı köy içine göre daha dengeli fiyatlanmış, yüksek görünürlükte bir müstakil giriş alternatifi sunuyor.",
      summaryEn:
        "Offers a more balanced detached-entry option than deep inner-village Alacati, while keeping high visibility.",
      sourceBlend: ["Hepsiemlak", "Sahibinden"],
      images: [
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1600607687126-8a1f0f90fef9?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=900&q=80"
      ]
    },
    {
      id: "ilica-bluestate",
      district: "ilica",
      broker: "selin-kaya",
      title: "Bluestate'ten Ilıca'da Denize Yakın Satılık 3+1 Villa",
      price: 25500000,
      size: 250,
      rooms: "3+1",
      photoCount: 26,
      seasonRent: 800000,
      annualRent: 660000,
      teaser: "Denize yakınlık ve Ilıca markasıyla yeniden satış likiditesi güçlü, m² fiyatı mahalle ortalamasının altında.",
      teaserEn: "Strong resale liquidity from beach proximity and the Ilica label, while price per m² still sits below district average.",
      microLocation: "Ilıca - denize yürüme mesafesi",
      microLocationEn: "Ilica - walking distance to the sea",
      strategy: "Likidite, plaj erişimi ve düzenli ürün tipiyle dengeli taşıma oyunu.",
      strategyEn: "A balanced hold play driven by liquidity, beach access and a standardized product type.",
      strengths: [
        "Güçlü yeniden satış likiditesi",
        "Mahalle ortalamasının altında m² seviyesi",
        "Yaz kirasında marka algısı güçlü"
      ],
      strengthsEn: [
        "Strong resale liquidity",
        "Price per m² below district average",
        "Strong branding in summer rent demand"
      ],
      risks: [
        "Giriş fiyatı nominal olarak yüksek",
        "Sezon dışı getiri yaz kadar kuvvetli değil",
        "Denize yakın stoklar piyasada hızlı fiyatlanır"
      ],
      risksEn: [
        "Nominal entry price is still high",
        "Off-season yield is not as strong as summer",
        "Sea-adjacent stock prices quickly"
      ],
      summary:
        "Ilıca markası içinde kontrollü bir m² girişi arayan yatırımcı için dengeli, hızlı okunur bir ürün.",
      summaryEn:
        "A balanced, quickly readable product for investors seeking controlled price-per-m² entry inside the Ilica label.",
      sourceBlend: ["Hepsiemlak", "Sahibinden", "Endeksa"],
      images: [
        "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1600607687645-c7171b42498f?auto=format&fit=crop&w=900&q=80"
      ]
    },
    {
      id: "ilica-kumru-sahil",
      district: "ilica",
      broker: "arda-demir",
      title: "Ilıca Kumru koyu hattında bahçeli site içi satılık 3+1 villa",
      price: 16850000,
      size: 145,
      rooms: "3+1",
      photoCount: 34,
      seasonRent: 720000,
      annualRent: 630000,
      teaser: "Ilıca sahil erişimini korurken mahalle ortalamasının altında kalan dengeli bir giriş.",
      teaserEn: "A balanced entry that keeps Ilica beach access while staying below the district average.",
      microLocation: "Ilıca - Kumru Koyu / plaj hattı",
      microLocationEn: "Ilica - Kumru Bay / beach line",
      strategy: "Plaj etkisi ve kontrollü bütçe ile yıl boyu taşınabilir bir sahil ürünü almak.",
      strategyEn: "Secure a beach-led asset with manageable pricing and better full-year carry.",
      strengths: [
        "Ilıca ortalamasının altında m² maliyeti",
        "Plaj bandına yakın ama aşırı premium değil",
        "12 ay kullanım için daha dengeli profil"
      ],
      strengthsEn: [
        "Price per m² below the Ilica average",
        "Close to the beach belt without extreme premium",
        "A more balanced profile for year-round use"
      ],
      risks: [
        "Sahil ürünlerinde fiyatlar hızlı sıkışabilir",
        "Yüksek sezonda rekabet eden stok çoğalabilir",
        "Site aidatı net getiriyi etkileyebilir"
      ],
      risksEn: [
        "Beach-led assets can reprice quickly",
        "Competing stock may increase in high season",
        "Site fees can dilute net carry"
      ],
      summary:
        "Ilıca sahil hattına yakın kalmak isteyen ama tam prime fiyat ödemek istemeyen alıcı için daha dengeli bir seçenek.",
      summaryEn:
        "A more balanced option for buyers who want to stay near the Ilica shoreline without paying full prime pricing.",
      sourceBlend: ["Sahibinden", "Hepsiemlak", "Emlakjet"],
      images: [
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1600607687645-c7171b42498f?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1600573472591-ee6981cf35b6?auto=format&fit=crop&w=900&q=80"
      ]
    },
    {
      id: "dalyan-kocakari",
      district: "dalyan",
      broker: "naz-ergin",
      title: "Çeşme Dalyan'da Kocakarı Plajı ve marina hattında 3+1 villa",
      price: 12649000,
      size: 120,
      rooms: "3+1",
      photoCount: 48,
      seasonRent: 650000,
      annualRent: 600000,
      teaser: "Marina yürüyüş halkasında görece düşük giriş maliyeti; kısa dönem kirada verimli.",
      teaserEn: "Relatively low entry cost within the marina walking loop; efficient in short-term rental play.",
      microLocation: "Dalyan - marina / Kocakarı Plajı hattı",
      microLocationEn: "Dalyan - marina / Kocakari beach line",
      strategy: "Marina ve koy etkisiyle sezonluk getiriyi, yıllık kullanım esnekliğiyle dengelemek.",
      strategyEn: "Balance seasonal yield from marina and bay exposure with some full-year use flexibility.",
      strengths: [
        "Dalyan için erişilebilir giriş seviyesi",
        "Marina ve plaj yakınlığı",
        "Kısa dönem kirada güçlü talep"
      ],
      strengthsEn: [
        "Accessible entry level for Dalyan",
        "Proximity to marina and beach",
        "Strong short-term rental demand"
      ],
      risks: [
        "Mikro lokasyon farkları fiyatı hızlı değiştirir",
        "Yüksek sezon bağımlılığı artabilir",
        "Ürün yaşı ve yenileme ihtiyacı takip edilmeli"
      ],
      risksEn: [
        "Micro-location differences can reprice quickly",
        "Seasonality dependence can increase",
        "Product age and refurbishment needs must be tracked"
      ],
      summary:
        "Dalyan içinde marina etkisini alıp fiyatı fazla şişmemiş ürün arayan yatırımcı için mantıklı bir cep.",
      summaryEn:
        "A sensible pocket for investors who want marina exposure in Dalyan without fully inflated pricing.",
      sourceBlend: ["Hepsiemlak", "Sahibinden", "Emlakjet"],
      images: [
        "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"
      ]
    },
    {
      id: "ciftlik-gunes",
      district: "ciftlik",
      broker: "naz-ergin",
      title: "Güneş Emlaktan Satılık Havuzlu Lüks Villa Çeşme Çiftlikköyde",
      price: 17950000,
      size: 248,
      rooms: "3+1",
      photoCount: 25,
      seasonRent: 900000,
      annualRent: 780000,
      teaser: "Çiftlik ortalamasının belirgin altında m² maliyetiyle yaz getirisine oynayan fırsat.",
      teaserEn: "A summer-yield play with price per m² clearly below the Ciftlik average.",
      microLocation: "Çiftlik - beach aksı",
      microLocationEn: "Ciftlik - beach axis",
      strategy: "Yaz sezonunda kuvvetli kira akışı, doğru girişte güçlü değerlenme marjı.",
      strategyEn: "Strong seasonal rental flow with upside if the entry price is right.",
      strengths: [
        "Çiftlik ortalamasına göre düşük m² maliyeti",
        "Havuzlu ürün tipine yüksek yaz talebi",
        "Büyük metrekare ile aile segmenti"
      ],
      strengthsEn: [
        "Low price per m² relative to Ciftlik average",
        "Strong summer demand for pool-format product",
        "Family-sized layout"
      ],
      risks: [
        "Yıllık taşıma verimi yaz kadar güçlü değil",
        "Merkeze uzaklık kullanım kararını etkiler",
        "Sezon dışı pazarlık payı artabilir"
      ],
      risksEn: [
        "Full-year carry is weaker than summer",
        "Distance to the center affects user demand",
        "Negotiation room can widen off-season"
      ],
      summary:
        "Çiftlik'te yaz performansına oynayan ama m² bazında kontrollü kalmak isteyenler için öne çıkıyor.",
      summaryEn:
        "Stands out for investors targeting summer performance while staying disciplined on price per m².",
      sourceBlend: ["Hepsiemlak", "Sahibinden"],
      images: [
        "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80"
      ]
    },
    {
      id: "ovacik-tas-bahce",
      district: "ovacik",
      broker: "arda-demir",
      title: "Ovacık köy üst bandında taş dokulu bahçeli satılık 4+1 villa",
      price: 14350000,
      size: 210,
      rooms: "4+1",
      photoCount: 28,
      seasonRent: 690000,
      annualRent: 612000,
      teaser: "Ovacık büyüme hikayesini düşük m² girişiyle alan, geniş aile tipine uygun fırsat.",
      teaserEn: "A family-sized opportunity capturing the Ovacik growth story with low price per m² entry.",
      microLocation: "Ovacık - köy üst bandı",
      microLocationEn: "Ovacik - upper village belt",
      strategy: "Gelişen cepte büyük metrekareyi erken almak ve orta vadeli değerlenmeye oynamak.",
      strategyEn: "Buy larger square meter exposure early in a developing pocket and hold for mid-term appreciation.",
      strengths: [
        "Ovacık ortalamasına göre düşük m² maliyeti",
        "Büyük aile kullanımı ve villa hissi",
        "Büyüme beklentisi güçlü bölgede konum"
      ],
      strengthsEn: [
        "Price per m² below the Ovacik average",
        "Strong family-use and villa feel",
        "Positioned in a district with strong growth expectations"
      ],
      risks: [
        "Likidite Ilıca kadar hızlı değil",
        "Mikro lokasyon farkı fiyatı etkiler",
        "Yaz geliri deniz bandı kadar kuvvetli olmayabilir"
      ],
      risksEn: [
        "Liquidity is slower than Ilica",
        "Micro-location differences matter",
        "Summer rent may not match direct beach pockets"
      ],
      summary:
        "Ovacık tarafında büyüme ve metrekare avantajını aynı anda isteyen yatırımcı için güçlü bir ekleme.",
      summaryEn:
        "A strong addition for investors who want both square-meter value and growth exposure in Ovacik.",
      sourceBlend: ["Sahibinden", "Hepsiemlak", "Endeksa"],
      images: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80"
      ]
    },
    {
      id: "reisdere-firsat-villa",
      district: "reisdere",
      broker: "naz-ergin",
      title: "İzmir Çeşme'de fırsat satılık 240 m² villa",
      price: 12800000,
      size: 270,
      rooms: "3+1",
      photoCount: 18,
      seasonRent: 650000,
      annualRent: 540000,
      teaser: "Reisdere/Şifne bandında çok düşük m² maliyetiyle uzun vadeli değerlenme oyunu.",
      teaserEn: "A longer-term appreciation play in the Reisdere/Sifne belt with very low price per m².",
      microLocation: "Reisdere - Şifne termal geçiş hattı",
      microLocationEn: "Reisdere - Sifne thermal transition belt",
      strategy: "Düşük giriş maliyetinden güç alıp termal ve sakin yaşam etkisiyle orta vadeli taşımak.",
      strategyEn: "Lean on low entry pricing and the thermal / quiet-living story for a mid-term hold.",
      strengths: [
        "Çok erişilebilir m² seviyesi",
        "Termal ve sessiz yaşam etkisi",
        "Yıllık kullanım için dengeli profil"
      ],
      strengthsEn: [
        "Very accessible price per m²",
        "Thermal and quiet-living appeal",
        "Balanced profile for full-year use"
      ],
      risks: [
        "Likidite Alaçatı ve Ilıca kadar hızlı değil",
        "Ürün seçimi mahallede daha kritik",
        "Kısa dönem kira talebi mikro lokasyona bağlı"
      ],
      risksEn: [
        "Liquidity is slower than Alacati and Ilica",
        "Product selection matters more in this district",
        "Short-term rental demand depends heavily on micro-location"
      ],
      summary:
        "Reisdere / Şifne hattında düşük m² girişiyle değerlenme alanı arayan yatırımcı için güçlü bir izleme adayı.",
      summaryEn:
        "A strong watch candidate for investors looking for appreciation room through low price-per-m² entry in the Reisdere / Sifne line.",
      sourceBlend: ["Emlakjet", "Sahibinden", "Endeksa"],
      images: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"
      ]
    }
  ],
  brokers: [
    {
      id: "selin-kaya",
      name: "Selin Kaya",
      role: "Kıdemli Portföy Brokerı",
      roleEn: "Senior Portfolio Broker",
      focus: "Alaçatı, Ilıca ve denize yakın prime villalar",
      focusEn: "Alacati, Ilica and sea-adjacent prime villas",
      coverage: "Alaçatı, Ilıca ve Şifne sahil cepleri",
      coverageEn: "Alacati, Ilica and Sifne shoreline pockets",
      quote: "Prime bölgede farkı çoğu zaman mahalle değil, doğru cep ve doğru giriş fiyatı yaratır.",
      quoteEn: "In prime zones, the edge usually comes from the exact pocket and the entry price, not just the district name.",
      phone: "+90 232 700 10 21",
      email: "selin@lodosatlasi.com",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "arda-demir",
      name: "Arda Demir",
      role: "Yatırım Analisti Broker",
      roleEn: "Investment Analyst Broker",
      focus: "Ovacık, Ilıca giriş cepleri ve büyüme odaklı villalar",
      focusEn: "Ovacik, Ilica entry pockets and growth-led villas",
      coverage: "Ovacık, Ilıca geçiş bandı ve kuzey aksı",
      coverageEn: "Ovacik, Ilica transition belt and the north axis",
      quote: "Erken büyüme hikayesinde önemli olan sadece ucuz almak değil, çıkış likiditesini de doğru okumak.",
      quoteEn: "In early growth stories, it is not enough to buy cheap. You also need to read exit liquidity correctly.",
      phone: "+90 232 700 10 34",
      email: "arda@lodosatlasi.com",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "naz-ergin",
      name: "Naz Ergin",
      role: "Kıyı Hatları Danışmanı",
      roleEn: "Coastal Lines Broker",
      focus: "Dalyan, Çiftlik ve marina odaklı yaz getirisi stokları",
      focusEn: "Dalyan, Ciftlik and marina-led seasonal yield stock",
      coverage: "Dalyan koyları, marina bandı ve Çiftlik plaj aksı",
      coverageEn: "Dalyan bays, the marina belt and the Ciftlik beach axis",
      quote: "Yaz getirisi yüksek bölgelerde farkı çoğu zaman kullanım esnekliği ve plaj erişimi belirler.",
      quoteEn: "In high summer-yield areas, flexibility of use and beach access usually create the real difference.",
      phone: "+90 232 700 10 48",
      email: "naz@lodosatlasi.com",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=900&q=80"
    }
  ],
  history: [
    { year: 2001, nominal: 1.0, real: 1.0 },
    { year: 2005, nominal: 1.5, real: 1.2 },
    { year: 2010, nominal: 2.3, real: 1.4 },
    { year: 2015, nominal: 4.3, real: 1.8 },
    { year: 2020, nominal: 7.9, real: 2.1 },
    { year: 2022, nominal: 17.1, real: 3.3 },
    { year: 2024, nominal: 31.9, real: 3.1 },
    { year: 2025, nominal: 39.2, real: 3.1 },
    { year: 2026, nominal: 42.9, real: 3.2 }
  ],
  sources: [
    {
      label: "TCMB Konut Fiyat Endeksi",
      labelEn: "CBRT House Price Index",
      note: "Makro fiyat rejimi ve 2010 sonrası omurga serisi.",
      noteEn: "Macro housing regime and the post-2010 backbone series.",
      domain: "tcmb.gov.tr"
    },
    {
      label: "Emlakjet mahalle trend sayfaları",
      labelEn: "Emlakjet district trend pages",
      note: "Alaçatı, Ilıca, Dalyan, Ovacık, Reisdere ve Çiftlik için ortalama m², kira ve amortisman girdileri.",
      noteEn: "Average m², rent and payback inputs for Alacati, Ilica, Dalyan, Ovacik, Reisdere and Ciftlik.",
      domain: "emlakjet.com"
    },
    {
      label: "Hepsiemlak satış ve kiralama akışları",
      labelEn: "Hepsiemlak sale and rental flows",
      note: "Yaz-kış kira bandı ve villa tipolojisi için yoğun saha referansı.",
      noteEn: "Field-heavy reference layer for summer-winter rent bands and villa typologies.",
      domain: "hepsiemlak.com"
    },
    {
      label: "Sahibinden Çeşme satılık villa akışları",
      labelEn: "Sahibinden Cesme villa sale flows",
      note: "Pazarlık payı, ilan yoğunluğu ve alternatif fiyat cepleri için ikinci tarama yüzeyi.",
      noteEn: "Second scan surface for pricing pockets, listing density and negotiation room.",
      domain: "sahibinden.com"
    },
    {
      label: "Endeksa değerleme ve mahalle görünümü",
      labelEn: "Endeksa valuation and district view",
      note: "Fiyat seviyesi ve beklenen hareket için tamamlayıcı çapraz kontrol katmanı.",
      noteEn: "Complementary cross-check layer for pricing level and expected movement.",
      domain: "endeksa.com"
    },
    {
      label: "OpenStreetMap taban haritası",
      labelEn: "OpenStreetMap basemap",
      note: "Gerçek Çeşme harita zemini ve lokasyon işaretleri için kullanılan taban katman.",
      noteEn: "The real Cesme basemap used for geographic grounding and markers.",
      domain: "openstreetmap.org"
    }
  ]
};

const MAP_SPOTS = {
  ilica: { emoji: "🌊", panX: "-5%", panY: "1%", zoom: 1.08, x: 76, y: 34, label: "Ilıca", labelEn: "Ilica" },
  alacati: { emoji: "🌬️", panX: "1%", panY: "-2%", zoom: 1.1, x: 66, y: 46, label: "Alaçatı", labelEn: "Alacati" },
  ovacik: { emoji: "🌿", panX: "4%", panY: "-2%", zoom: 1.08, x: 52, y: 57, label: "Ovacık", labelEn: "Ovacik" },
  dalyan: { emoji: "⚓", panX: "-10%", panY: "-2%", zoom: 1.09, x: 26, y: 27, label: "Dalyan", labelEn: "Dalyan" },
  reisdere: { emoji: "♨️", panX: "5%", panY: "-5%", zoom: 1.08, x: 82, y: 52, label: "Reisdere / Şifne", labelEn: "Reisdere / Sifne" },
  ciftlik: { emoji: "🏖️", panX: "0%", panY: "-9%", zoom: 1.1, x: 36, y: 72, label: "Çiftlik", labelEn: "Ciftlik" },
  "alacati-port": { emoji: "🏄", panX: "1%", panY: "0%", zoom: 1.14, x: 60, y: 56, label: "Alaçatı Port", labelEn: "Alacati Port" },
  "cesme-marina": { emoji: "🛥️", panX: "-11%", panY: "2%", zoom: 1.12, x: 15, y: 39, label: "Çeşme Marina", labelEn: "Cesme Marina" }
};

function t(path, replacements = {}) {
  const parts = path.split(".");
  let value = COPY[currentLang];
  parts.forEach((part) => {
    value = value?.[part];
  });
  if (typeof value !== "string") return path;
  return Object.entries(replacements).reduce((result, [key, replacement]) => result.replace(`{${key}}`, replacement), value);
}

function getDistrictLabel(district) {
  return currentLang === "en" ? district.nameEn || district.name : district.name;
}

function getDistrictSummary(district) {
  return currentLang === "en" ? district.summaryEn || district.summary : district.summary;
}

function getDistrictNote(district) {
  return currentLang === "en" ? district.noteEn || district.note : district.note;
}

function getDistrictEntryBand(district) {
  return currentLang === "en" ? district.entryBandEn || district.entryBand : district.entryBand;
}

function listingText(listing, key) {
  const enKey = `${key}En`;
  return currentLang === "en" ? listing[enKey] || listing[key] : listing[key];
}

function brokerText(broker, key) {
  const enKey = `${key}En`;
  return currentLang === "en" ? broker[enKey] || broker[key] : broker[key];
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

function formatCompactMoney(value) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2).replace(".", ",")} Mn TL`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)} Bin TL`;
  return `${value} TL`;
}

function formatPercent(value) {
  return `%${value.toFixed(1).replace(".", ",")}`;
}

function formatInteger(value) {
  return new Intl.NumberFormat(currentLang === "en" ? "en-US" : "tr-TR").format(value);
}

function getDistrict(id) {
  return MARKET.districts.find((district) => district.id === id);
}

function getMapSpot(id) {
  return MAP_SPOTS[id] || MAP_SPOTS[activeDistrictId];
}

function getMapSpotLabel(id) {
  const spot = getMapSpot(id);
  return currentLang === "en" ? spot.labelEn || spot.label : spot.label;
}

function focusMapOn(id = activeMapSpotId) {
  const map = document.querySelector(".illustrated-map");
  if (!map) return;
  const spot = getMapSpot(id);
  map.style.setProperty("--map-pan-x", spot.panX);
  map.style.setProperty("--map-pan-y", spot.panY);
  map.style.setProperty("--map-zoom", `${spot.zoom}`);
  const caption = map.querySelector("[data-map-caption]");
  if (caption) caption.textContent = `${spot.emoji} ${getMapSpotLabel(id)}`;
}

function getListing(id) {
  return MARKET.listings.find((listing) => listing.id === id);
}

function getBroker(id) {
  return MARKET.brokers.find((broker) => broker.id === id);
}

function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWatchlist(ids) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids));
}

function isSaved(id) {
  return getWatchlist().includes(id);
}

function toggleWatchlist(id) {
  const ids = getWatchlist();
  saveWatchlist(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  renderCurrentView();
}

function getListingStats(listing) {
  const district = getDistrict(listing.district);
  const priceSqm = listing.price / listing.size;
  const discount = ((district.priceSqm - priceSqm) / district.priceSqm) * 100;
  const summerYield = (listing.seasonRent / listing.price) * 100;
  const annualYield = (listing.annualRent / listing.price) * 100;
  return { district, priceSqm, discount, summerYield, annualYield };
}

function answerMarketQuestion(question) {
  const q = normalize(question);
  const bestDistrict = [...MARKET.districts].sort((a, b) => b.score - a.score)[0];
  const bestAnnual = [...MARKET.districts].sort((a, b) => b.annualYield - a.annualYield)[0];
  const cheapestDistrict = [...MARKET.districts].sort((a, b) => a.priceSqm - b.priceSqm)[0];
  const growthDistrict = [...MARKET.districts].sort((a, b) => b.expectedChange - a.expectedChange)[0];
  const bestListing = [...MARKET.listings].sort((a, b) => getListingStats(b).discount - getListingStats(a).discount)[0];

  const districtMatch = MARKET.districts.find((district) => q.includes(normalize(district.name)) || q.includes(normalize(district.nameEn || district.name)));
  if (districtMatch) {
    return currentLang === "en"
      ? `${getDistrictLabel(districtMatch)} scores ${districtMatch.score}/100. Average price is ${formatInteger(districtMatch.priceSqm)} TL/m², 12-month expectation is %${districtMatch.expectedChange}, and annual gross yield is ${formatPercent(districtMatch.annualYield)}. ${getDistrictSummary(districtMatch)}`
      : `${getDistrictLabel(districtMatch)} skoru ${districtMatch.score}/100. Ortalama fiyat ${formatInteger(districtMatch.priceSqm)} TL/m², 12 aylık beklenti %${districtMatch.expectedChange}, 12 ay brüt getiri ${formatPercent(districtMatch.annualYield)}. ${getDistrictSummary(districtMatch)}`;
  }

  if (q.includes("best") || q.includes("hangi mahalle") || q.includes("where invest") || q.includes("yatirim")) {
    return currentLang === "en"
      ? `Right now ${getDistrictLabel(bestDistrict)} is the most balanced district. It leads with a score of ${bestDistrict.score}/100. If you want faster growth, ${getDistrictLabel(growthDistrict)} is the more aggressive second option.`
      : `Şu an en dengeli mahalle ${getDistrictLabel(bestDistrict)}. Skoru ${bestDistrict.score}/100. Daha agresif büyüme arıyorsanız ikinci seçenek ${getDistrictLabel(growthDistrict)}.`;
  }

  if (q.includes("yield") || q.includes("rent") || q.includes("getiri") || q.includes("kira")) {
    return currentLang === "en"
      ? `${getDistrictLabel(bestAnnual)} currently leads full-year rental carry at ${formatPercent(bestAnnual.annualYield)}. Summer peak is strongest in ${getDistrictLabel([...MARKET.districts].sort((a, b) => b.summerYield - a.summerYield)[0])}.`
      : `${getDistrictLabel(bestAnnual)} şu an 12 ay kira taşımasında lider. Brüt senaryo ${formatPercent(bestAnnual.annualYield)}. Yaz zirvesi ise ${getDistrictLabel([...MARKET.districts].sort((a, b) => b.summerYield - a.summerYield)[0])} tarafında.`;
  }

  if (q.includes("cheap") || q.includes("ucuz") || q.includes("entry")) {
    return currentLang === "en"
      ? `${getDistrictLabel(cheapestDistrict)} has the lowest district entry level at ${formatInteger(cheapestDistrict.priceSqm)} TL/m². The strongest listing-level discount in the current set is "${bestListing.title}".`
      : `${getDistrictLabel(cheapestDistrict)} en düşük giriş seviyesine sahip. Ortalama ${formatInteger(cheapestDistrict.priceSqm)} TL/m². Mevcut sette en güçlü ilan iskontosu "${bestListing.title}" tarafında.`;
  }

  if (q.includes("history") || q.includes("25") || q.includes("deger") || q.includes("retention")) {
    const last = MARKET.history[MARKET.history.length - 1];
    return currentLang === "en"
      ? `Over 25 years, the model shows roughly ${last.nominal.toFixed(1)}x nominal growth and ${last.real.toFixed(1)}x real value retention. The point is that Cesme grew strongly, but real protection was much lower than headline prices suggest.`
      : `25 yıllık model yaklaşık ${last.nominal.toFixed(1)}x nominal büyüme ve ${last.real.toFixed(1)}x reel değer koruması gösteriyor. Yani Çeşme güçlü büyüdü ama gerçek koruma manşet fiyat kadar yüksek değil.`;
  }

  if (q.includes("listing") || q.includes("ilan") || q.includes("villa")) {
    const listing = MARKET.listings.find((item) => q.includes(normalize(item.title).slice(0, 18))) || bestListing;
    const stats = getListingStats(listing);
    return currentLang === "en"
      ? `"${listing.title}" is a strong current listing. It sits about ${formatPercent(stats.discount)} below its district average and models ${formatPercent(stats.annualYield)} annual gross carry.`
      : `"${listing.title}" şu an güçlü bir ilan. Mahalle ortalamasına göre yaklaşık ${formatPercent(stats.discount)} daha avantajlı ve 12 ay brüt senaryosu ${formatPercent(stats.annualYield)}.`;
  }

  if (!/(cesme|alacati|ilica|ovacik|dalyan|reisdere|sifne|ciftlik|yatirim|emlak|villa|listing|district|rent|yield|getiri|kira|house|property|real estate)/.test(q)) {
    return t("assistant.unrelated");
  }

  return currentLang === "en"
    ? `Ask me about the best district, rental yield, entry pricing, a district name, or the 25-year history. For example: "Which district is best right now?"`
    : `Bana en iyi mahalle, kira getirisi, giriş fiyatı, bir mahalle adı veya 25 yıllık geçmiş hakkında soru sorabilirsiniz. Örnek: "Şu an en iyi mahalle hangisi?"`;
}

function handleAssistantQuestion(question) {
  const input = document.querySelector("[data-ai-input]");
  const response = document.querySelector("[data-ai-response]");
  if (!response) return;
  const clean = question.trim();
  if (!clean) {
    response.textContent = t("assistant.intro");
    return;
  }
  if (input) input.value = clean;
  response.textContent = answerMarketQuestion(clean);
}

function createControlButtons() {
  const themeButton = document.createElement("button");
  themeButton.className = "theme-toggle";
  themeButton.type = "button";
  themeButton.dataset.themeToggle = "true";
  themeButton.addEventListener("click", () => {
    applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
  });

  const languageButton = document.createElement("button");
  languageButton.className = "language-toggle";
  languageButton.type = "button";
  languageButton.dataset.languageToggle = "true";
  languageButton.addEventListener("click", () => {
    applyLanguage(currentLang === "tr" ? "en" : "tr");
  });

  document.body.append(languageButton, themeButton);
  updateControlButtons();
}

function createAssistantShell() {
  const toggle = document.createElement("button");
  toggle.className = "ai-toggle";
  toggle.type = "button";
  toggle.textContent = "AI";

  const panel = document.createElement("section");
  panel.className = "ai-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="ai-head">
      <div>
        <strong data-ai-title></strong>
        <span data-ai-subtitle></span>
      </div>
      <button class="ai-clear" type="button" data-ai-close>×</button>
    </div>
    <div class="ai-response" data-ai-response></div>
    <form class="ai-form" data-ai-form>
      <textarea data-ai-input></textarea>
      <div class="ai-actions">
        <button class="ai-clear" type="button" data-ai-reset></button>
        <button class="ai-submit" type="submit" data-ai-submit></button>
      </div>
    </form>
    <div class="ai-suggestions" data-ai-suggestions></div>
  `;

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });
  panel.querySelector("[data-ai-close]").addEventListener("click", () => {
    panel.hidden = true;
  });
  panel.querySelector("[data-ai-reset]").addEventListener("click", () => {
    panel.querySelector("[data-ai-input]").value = "";
    panel.querySelector("[data-ai-response]").textContent = t("assistant.intro");
  });
  panel.querySelector("[data-ai-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    handleAssistantQuestion(panel.querySelector("[data-ai-input]").value);
  });

  document.body.append(toggle, panel);
}

function updateControlButtons() {
  const themeButton = document.querySelector("[data-theme-toggle]");
  const languageButton = document.querySelector("[data-language-toggle]");
  if (themeButton) {
    themeButton.textContent = document.body.dataset.theme === "dark" ? t("controls.themeLight") : t("controls.themeDark");
  }
  if (languageButton) {
    languageButton.textContent = t("controls.lang");
  }
}

function renderAssistantTexts() {
  const panel = document.querySelector(".ai-panel");
  if (!panel) return;
  panel.querySelector("[data-ai-title]").textContent = t("assistant.title");
  panel.querySelector("[data-ai-subtitle]").textContent = t("assistant.subtitle");
  panel.querySelector("[data-ai-input]").setAttribute("placeholder", t("assistant.placeholder"));
  panel.querySelector("[data-ai-submit]").textContent = t("assistant.ask");
  panel.querySelector("[data-ai-reset]").textContent = t("assistant.clear");
  const response = panel.querySelector("[data-ai-response]");
  if (!response.textContent.trim()) {
    response.textContent = t("assistant.intro");
  }
  panel.querySelector("[data-ai-suggestions]").innerHTML = COPY[currentLang].assistant.suggestions
    .map((item) => `<button type="button" data-ai-suggestion="${item}">${item}</button>`)
    .join("");
  panel.querySelectorAll("[data-ai-suggestion]").forEach((button) => {
    button.addEventListener("click", () => handleAssistantQuestion(button.dataset.aiSuggestion));
  });
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  updateControlButtons();
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  applyStaticTranslations();
  updateControlButtons();
  renderCurrentView();
}

function initPreferences() {
  document.body.dataset.theme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.lang = currentLang;
  createControlButtons();
  createAssistantShell();
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll("[data-placeholder-key]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.placeholderKey));
  });
}

function markActiveNav() {
  const page = document.body.dataset.page;
  const pageMap = {
    home: "index.html",
    shop: "shop.html",
    about: "about.html",
    watchlist: "cart.html",
    contact: "contact.html",
    product: "shop.html"
  };
  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === pageMap[page]);
  });
}

function listingCardMarkup(listing) {
  const stats = getListingStats(listing);
  const districtLabel = getDistrictLabel(stats.district);
  return `
    <article class="listing-card">
      <div class="listing-media">
        <img src="${listing.images[0]}" alt="${listing.title}" loading="lazy" />
        <div class="listing-overlay">
          <span class="listing-badge">${districtLabel} · ${listing.rooms}</span>
          <button class="listing-save ${isSaved(listing.id) ? "is-saved" : ""}" type="button" data-save-id="${listing.id}">
            ${isSaved(listing.id) ? t("dynamic.saved") : t("dynamic.save")}
          </button>
        </div>
      </div>
      <div class="listing-copy">
        <div>
          <p class="eyebrow">${t("dynamic.internalPage")}</p>
          <h3>${listing.title}</h3>
          <p>${listingText(listing, "teaser")}</p>
        </div>
        <div class="stats-row">
          <div class="stat-box"><span>${t("dynamic.salePrice")}</span><strong>${formatCompactMoney(listing.price)}</strong></div>
          <div class="stat-box"><span>${t("dynamic.grossArea")}</span><strong>${formatInteger(listing.size)} m²</strong></div>
          <div class="stat-box"><span>${t("dynamic.sqmCost")}</span><strong>${formatInteger(Math.round(stats.priceSqm))} TL</strong></div>
          <div class="stat-box"><span>${t("dynamic.annualGross")}</span><strong>${formatPercent(stats.annualYield)}</strong></div>
        </div>
        <div class="card-actions">
          <span class="text-link">${formatPercent(stats.discount)} ${t("dynamic.discountAdvantage")}</span>
          <a class="button button-secondary" href="product.html?id=${listing.id}">${t("dynamic.openDetail")}</a>
        </div>
      </div>
    </article>
  `;
}

function brokerCardMarkup(broker) {
  return `
    <article class="broker-card panel">
      <div class="broker-media">
        <img src="${broker.image}" alt="${broker.name}" loading="lazy" />
      </div>
      <div class="broker-copy">
        <div>
          <p class="eyebrow">${t("dynamic.brokerDesk")}</p>
          <h3>${broker.name}</h3>
          <p class="broker-role">${brokerText(broker, "role")}</p>
        </div>
        <div class="broker-stats">
          <div class="stat-box"><span>${t("dynamic.brokerFocus")}</span><strong>${brokerText(broker, "focus")}</strong></div>
          <div class="stat-box"><span>${t("dynamic.brokerCoverage")}</span><strong>${brokerText(broker, "coverage")}</strong></div>
        </div>
        <blockquote class="broker-quote">${currentLang === "en" ? broker.quoteEn || broker.quote : broker.quote}</blockquote>
        <div class="broker-meta">
          <a href="mailto:${broker.email}">${broker.email}</a>
          <span>${broker.phone}</span>
        </div>
      </div>
    </article>
  `;
}

function bindSaveButtons() {
  document.querySelectorAll("[data-save-id]").forEach((button) => {
    button.addEventListener("click", () => toggleWatchlist(button.dataset.saveId));
  });
}

function renderOverview() {
  const container = document.querySelector("[data-overview-metrics]");
  if (!container) return;
  const averageDiscount = MARKET.listings.reduce((sum, listing) => sum + getListingStats(listing).discount, 0) / MARKET.listings.length;
  const topSummer = [...MARKET.districts].sort((a, b) => b.summerYield - a.summerYield)[0];
  const topGrowth = [...MARKET.districts].sort((a, b) => b.expectedChange - a.expectedChange)[0];
  const lowestEntry = [...MARKET.districts].sort((a, b) => a.priceSqm - b.priceSqm)[0];
  const cards = [
    { label: t("dynamic.selectedOpportunity"), value: `${MARKET.listings.length}`, note: t("dynamic.featuredSet") },
    { label: t("dynamic.averageDiscount"), value: formatPercent(averageDiscount), note: t("dynamic.relativeToDistrict") },
    { label: t("dynamic.strongestSummer"), value: `${getDistrictLabel(topSummer)} ${formatPercent(topSummer.summerYield)}`, note: t("dynamic.seasonalGross") },
    {
      label: t("dynamic.lowestEntry"),
      value: `${getDistrictLabel(lowestEntry)} ${formatInteger(lowestEntry.priceSqm)} TL/m²`,
      note: `${getDistrictLabel(topGrowth)} %${topGrowth.expectedChange} ${t("dynamic.growthExpectationSuffix")}`
    }
  ];
  container.innerHTML = cards
    .map((card) => `<article class="metric-card"><span>${card.label}</span><strong>${card.value}</strong><span>${card.note}</span></article>`)
    .join("");
}

function renderHomeListings() {
  const container = document.querySelector("[data-home-listings]");
  if (!container) return;
  container.innerHTML = MARKET.listings.slice(0, 3).map(listingCardMarkup).join("");
}

function renderHomeBrokers() {
  const container = document.querySelector("[data-home-brokers]");
  if (!container) return;
  container.innerHTML = MARKET.brokers.map(brokerCardMarkup).join("");
}

function renderAllListings(filter = document.querySelector(".filter-chip.is-active")?.dataset.filterId || "all") {
  const container = document.querySelector("[data-all-listings]");
  if (!container) return;
  const listings = filter === "all" ? MARKET.listings : MARKET.listings.filter((listing) => listing.district === filter);
  container.innerHTML = listings.map(listingCardMarkup).join("");
}

function renderFilterBar() {
  const container = document.querySelector("[data-filter-bar]");
  if (!container) return;
  const filters = [{ id: "all", label: t("dynamic.allFilter") }, ...MARKET.districts.map((district) => ({ id: district.id, label: getDistrictLabel(district) }))];
  container.innerHTML = filters
    .map((filter, index) => `<button class="filter-chip ${index === 0 ? "is-active" : ""}" type="button" data-filter-id="${filter.id}">${filter.label}</button>`)
    .join("");
  container.querySelectorAll("[data-filter-id]").forEach((button) => {
    button.addEventListener("click", () => {
      container.querySelectorAll("[data-filter-id]").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      renderAllListings(button.dataset.filterId);
      bindSaveButtons();
    });
  });
}

function renderDistrict(id) {
  const panel = document.querySelector("[data-district-panel]");
  if (!panel) return;
  const district = getDistrict(id) || MARKET.districts[0];
  activeDistrictId = district.id;
  if (!poiMap.has(activeMapSpotId)) activeMapSpotId = district.id;
  const factorLabels = {
    erisilebilirlik: t("dynamic.accessibility"),
    buyume: t("dynamic.growthPotential"),
    kira: t("dynamic.rentAgility"),
    likidite: t("dynamic.resaleLiquidity")
  };
  panel.innerHTML = `
    <div class="district-score">${t("dynamic.investmentScore")} ${district.score}/100</div>
    <div>
      <p class="eyebrow">${t("dynamic.districtView")}</p>
      <h3>${getDistrictLabel(district)}</h3>
      <p>${getDistrictSummary(district)}</p>
      <p class="map-attribution">${t("dynamic.mapAttribution")}</p>
    </div>
    <div class="district-stats">
      <div class="district-stat"><span>${t("dynamic.averageSqm")}</span><strong>${formatInteger(district.priceSqm)} TL</strong></div>
      <div class="district-stat"><span>${t("dynamic.expected12Month")}</span><strong>%${district.expectedChange}</strong></div>
      <div class="district-stat"><span>${t("dynamic.amortization")}</span><strong>${district.amortization} yıl</strong></div>
      <div class="district-stat"><span>${t("dynamic.averageMonthlyRent")}</span><strong>${formatCompactMoney(district.averageRent)}</strong></div>
      <div class="district-stat"><span>${t("dynamic.entryBand")}</span><strong>${getDistrictEntryBand(district)}</strong></div>
      <div class="district-stat"><span>${t("dynamic.annualScenario")}</span><strong>${formatPercent(district.annualYield)}</strong></div>
    </div>
    <div class="bars">
      ${Object.entries(district.factors)
        .map(
          ([key, value]) => `
            <div class="bar-row">
              <header><span>${factorLabels[key]}</span><strong>${value}</strong></header>
              <div class="bar-track"><span style="width:${value}%;"></span></div>
            </div>
          `
        )
        .join("")}
    </div>
    <p>${getDistrictNote(district)}</p>
  `;
  updateMapMarkers();
  focusMapOn(activeMapSpotId);
}

function renderYields() {
  const grid = document.querySelector("[data-yield-scenarios]");
  const compare = document.querySelector("[data-yield-compare]");
  if (!grid || !compare) return;
  grid.innerHTML = MARKET.districts
    .map(
      (district) => `
        <article class="panel yield-card">
          <header>
            <div>
              <p class="eyebrow">${t("dynamic.districtScenario")}</p>
              <h3>${getDistrictLabel(district)}</h3>
            </div>
            <span class="yield-tag">${t("dynamic.score")} ${district.score}</span>
          </header>
          <div class="yield-lines">
            <div class="yield-line">
              <header><span>${t("dynamic.summerPeriod")}</span><strong>${formatPercent(district.summerYield)}</strong></header>
              <div class="yield-bar"><span style="width:${district.summerYield * 15}%;"></span></div>
            </div>
            <div class="yield-line">
              <header><span>${t("dynamic.winterPeriod")}</span><strong>${formatPercent(district.winterYield)}</strong></header>
              <div class="yield-bar"><span style="width:${district.winterYield * 15}%;"></span></div>
            </div>
            <div class="yield-line">
              <header><span>${t("dynamic.annualBase")}</span><strong>${formatPercent(district.annualYield)}</strong></header>
              <div class="yield-bar"><span style="width:${district.annualYield * 15}%;"></span></div>
            </div>
          </div>
          <p class="yield-note">${getDistrictNote(district)}</p>
        </article>
      `
    )
    .join("");

  const ranked = [...MARKET.districts].sort((a, b) => b.annualYield - a.annualYield);
  compare.innerHTML = `
    <p class="eyebrow">${t("dynamic.annualRankingEyebrow")}</p>
    <h3>${t("dynamic.annualRankingTitle")}</h3>
    <div class="ranking-list">
      ${ranked
        .map(
          (district, index) => `
            <div class="ranking-item">
              <span class="ranking-index">${index + 1}</span>
              <div class="ranking-meta">
                <strong>${getDistrictLabel(district)}</strong>
                <small>${getDistrictEntryBand(district)} · ${t("dynamic.amortization")} ${district.amortization} yıl</small>
              </div>
              <span class="ranking-score">${formatPercent(district.annualYield)}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHistory() {
  const svg = document.querySelector("[data-history-chart]");
  const metrics = document.querySelector("[data-history-metrics]");
  if (!svg || !metrics) return;
  const card = svg.closest(".chart-card");
  let legend = card?.querySelector(".chart-legend");
  if (!legend && card) {
    legend = document.createElement("div");
    legend.className = "chart-legend";
    card.prepend(legend);
  }
  if (legend) {
    legend.innerHTML = `
      <span class="legend-item"><i class="legend-swatch legend-swatch-blue"></i>${t("dynamic.nominalLegend")}</span>
      <span class="legend-item"><i class="legend-swatch legend-swatch-red"></i>${t("dynamic.realLegend")}</span>
    `;
  }
  const width = 760;
  const height = 360;
  const padding = { top: 30, right: 26, bottom: 44, left: 54 };
  const xMin = MARKET.history[0].year;
  const xMax = MARKET.history[MARKET.history.length - 1].year;
  const yMax = 45;
  const xScale = (year) => padding.left + ((year - xMin) / (xMax - xMin)) * (width - padding.left - padding.right);
  const yScale = (value) => height - padding.bottom - (value / yMax) * (height - padding.top - padding.bottom);
  const path = (key) => MARKET.history.map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(point.year)} ${yScale(point[key])}`).join(" ");

  svg.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" rx="26" fill="rgba(255,255,255,0.08)"></rect>
    ${[0, 10, 20, 30, 40]
      .map(
        (tick) => `
          <line x1="${padding.left}" y1="${yScale(tick)}" x2="${width - padding.right}" y2="${yScale(tick)}" stroke="rgba(148,168,185,0.18)" stroke-dasharray="4 8"></line>
          <text x="${padding.left - 12}" y="${yScale(tick) + 5}" text-anchor="end" font-size="12" fill="currentColor">${tick}x</text>
        `
      )
      .join("")}
    ${MARKET.history.map((point) => `<text x="${xScale(point.year)}" y="${height - 16}" text-anchor="middle" font-size="12" fill="currentColor">${point.year}</text>`).join("")}
    <path d="${path("nominal")}" fill="none" stroke="#1f6f7b" stroke-width="4" stroke-linecap="round"></path>
    <path d="${path("real")}" fill="none" stroke="#c86a57" stroke-width="4" stroke-linecap="round"></path>
    ${MARKET.history.map((point) => `<circle cx="${xScale(point.year)}" cy="${yScale(point.nominal)}" r="5" fill="#1f6f7b"></circle><circle cx="${xScale(point.year)}" cy="${yScale(point.real)}" r="5" fill="#c86a57"></circle>`).join("")}
    ${MARKET.history
      .map((point, index) => {
        const currentX = xScale(point.year);
        const previousX = index === 0 ? padding.left : xScale(MARKET.history[index - 1].year);
        const nextX = index === MARKET.history.length - 1 ? width - padding.right : xScale(MARKET.history[index + 1].year);
        const rectX = (currentX + previousX) / 2;
        const rectWidth = (nextX - previousX) / 2;
        return `<rect data-history-year="${point.year}" x="${rectX}" y="${padding.top}" width="${rectWidth}" height="${height - padding.top - padding.bottom}" fill="transparent"></rect>`;
      })
      .join("")}
  `;

  const nominal = MARKET.history[MARKET.history.length - 1].nominal;
  const real = MARKET.history[MARKET.history.length - 1].real;
  const growth = [...MARKET.districts].sort((a, b) => b.expectedChange - a.expectedChange)[0];
  const carry = [...MARKET.districts].sort((a, b) => b.annualYield - a.annualYield)[0];
  metrics.innerHTML = `
    <div class="history-metric"><span>${t("dynamic.nominal25")}</span><strong>${nominal.toFixed(1).replace(".", ",")}x</strong></div>
    <div class="history-metric"><span>${t("dynamic.real25")}</span><strong>${real.toFixed(1).replace(".", ",")}x</strong></div>
    <div class="history-metric"><span>${t("dynamic.growthLeader")}</span><strong>${getDistrictLabel(growth)} · %${growth.expectedChange}</strong></div>
    <div class="history-metric"><span>${t("dynamic.annualLeader")}</span><strong>${getDistrictLabel(carry)} · ${formatPercent(carry.annualYield)}</strong></div>
  `;

  let tooltip = card?.querySelector(".chart-tooltip");
  if (!tooltip && card) {
    tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    tooltip.hidden = true;
    card.append(tooltip);
  }

  svg.querySelectorAll("[data-history-year]").forEach((node) => {
    node.addEventListener("mousemove", (event) => {
      if (!tooltip || !card) return;
      const point = MARKET.history.find((item) => `${item.year}` === node.dataset.historyYear);
      if (!point) return;
      tooltip.hidden = false;
      tooltip.innerHTML = `
        <strong>${point.year}</strong>
        <div>${t("dynamic.nominal")}: ${point.nominal.toFixed(1).replace(".", ",")}x</div>
        <div>${t("dynamic.real")}: ${point.real.toFixed(1).replace(".", ",")}x</div>
      `;
      const bounds = card.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - bounds.left + 14}px`;
      tooltip.style.top = `${event.clientY - bounds.top - 18}px`;
    });
    node.addEventListener("mouseleave", () => {
      if (tooltip) tooltip.hidden = true;
    });
  });
}

function renderSources() {
  const container = document.querySelector("[data-sources]");
  if (!container) return;
  container.innerHTML = MARKET.sources
    .map(
      (source) => `
        <article class="source-card">
          <h3>${currentLang === "en" ? source.labelEn || source.label : source.label}</h3>
          <p>${currentLang === "en" ? source.noteEn || source.note : source.note}</p>
          <span>${t("dynamic.sourceScope")}: ${source.domain}</span>
        </article>
      `
    )
    .join("");
}

function updateSyncClock() {
  const label = document.querySelector("[data-sync-label]");
  const countdown = document.querySelector("[data-sync-countdown]");
  if (!label || !countdown) return;
  const syncedAt = new Date(MARKET.syncedAt);
  const now = new Date();
  let nextSync = new Date(syncedAt.getTime() + MARKET.refreshHours * 3600000);
  while (nextSync <= now) nextSync = new Date(nextSync.getTime() + MARKET.refreshHours * 3600000);
  const diff = nextSync - now;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  label.textContent = `${t("dynamic.syncPrefix")} ${syncedAt.toLocaleString(currentLang === "en" ? "en-US" : "tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })}`;
  countdown.textContent = `${t("dynamic.nextScan")} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderListingDetail() {
  const container = document.querySelector("[data-listing-detail]");
  if (!container) return;
  const params = new URLSearchParams(window.location.search);
  const listing = getListing(params.get("id")) || MARKET.listings[0];
  const broker = getBroker(listing.broker);
  const stats = getListingStats(listing);
  document.title = `${listing.title} | Lodos Atlası`;
  container.innerHTML = `
    <div class="detail-top">
      <section class="gallery-panel">
        <div class="gallery-main"><img src="${listing.images[0]}" alt="${listing.title}" /></div>
        <div class="gallery-strip">${listing.images.map((image) => `<img src="${image}" alt="${listing.title}" loading="lazy" />`).join("")}</div>
      </section>
      <section class="detail-copy">
        <div class="detail-pill">${getDistrictLabel(stats.district)} · ${listing.rooms} · ${listing.photoCount} ${t("dynamic.referencePhotos")}</div>
        <div>
          <p class="eyebrow">${t("dynamic.listingDataPage")}</p>
          <h1>${listing.title}</h1>
          <p>${listingText(listing, "summary")}</p>
        </div>
        <div class="detail-stats">
          <div class="stat-box"><span>${t("dynamic.salePrice")}</span><strong>${formatCompactMoney(listing.price)}</strong></div>
          <div class="stat-box"><span>${t("dynamic.grossArea")}</span><strong>${formatInteger(listing.size)} m²</strong></div>
          <div class="stat-box"><span>${t("dynamic.sqmCost")}</span><strong>${formatInteger(Math.round(stats.priceSqm))} TL</strong></div>
          <div class="stat-box"><span>${t("dynamic.districtAdvantage")}</span><strong>${formatPercent(stats.discount)}</strong></div>
          <div class="stat-box"><span>${t("dynamic.summerGross")}</span><strong>${formatPercent(stats.summerYield)}</strong></div>
          <div class="stat-box"><span>${t("dynamic.annualGross")}</span><strong>${formatPercent(stats.annualYield)}</strong></div>
          <div class="stat-box"><span>${t("dynamic.sourceBlend")}</span><strong>${listing.sourceBlend.join(" + ")}</strong></div>
        </div>
        <div class="detail-actions">
          <a class="button button-primary" href="shop.html">${t("dynamic.backToListings")}</a>
          <button class="listing-save ${isSaved(listing.id) ? "is-saved" : ""}" type="button" data-save-id="${listing.id}">${isSaved(listing.id) ? t("dynamic.saved") : t("dynamic.addToWatchlist")}</button>
        </div>
      </section>
    </div>
    <div class="detail-bottom">
      <article class="detail-side">
        <p class="eyebrow">${t("dynamic.microLocation")}</p>
        <h3>${listingText(listing, "microLocation")}</h3>
        <p>${listingText(listing, "strategy")}</p>
      </article>
      <article class="detail-side">
        <p class="eyebrow">${t("dynamic.strengths")}</p>
        <ul class="bullet-list">${(currentLang === "en" ? listing.strengthsEn || listing.strengths : listing.strengths).map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
      <article class="detail-side">
        <p class="eyebrow">${t("dynamic.risks")}</p>
        <ul class="bullet-list">${(currentLang === "en" ? listing.risksEn || listing.risks : listing.risks).map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
      ${
        broker
          ? `
      <article class="detail-side broker-detail-card">
        <p class="eyebrow">${t("dynamic.assignedBroker")}</p>
        <div class="broker-inline">
          <img src="${broker.image}" alt="${broker.name}" loading="lazy" />
          <div>
            <h3>${broker.name}</h3>
            <p class="broker-role">${brokerText(broker, "role")}</p>
          </div>
        </div>
        <p>${brokerText(broker, "focus")}</p>
        <div class="broker-meta">
          <a href="mailto:${broker.email}">${broker.email}</a>
          <span>${broker.phone}</span>
        </div>
      </article>`
          : ""
      }
    </div>
  `;
  const relatedContainer = document.querySelector("[data-related-listings]");
  if (relatedContainer) {
    relatedContainer.innerHTML = MARKET.listings.filter((item) => item.id !== listing.id).slice(0, 3).map(listingCardMarkup).join("");
  }
}

function renderWatchlistPage() {
  const container = document.querySelector("[data-watchlist]");
  if (!container) return;
  const listings = MARKET.listings.filter((listing) => getWatchlist().includes(listing.id));
  if (!listings.length) {
    container.innerHTML = `
      <article class="panel empty-state">
        <p class="eyebrow">${t("watchlist.empty.eyebrow")}</p>
        <h3>${t("watchlist.empty.title")}</h3>
        <p class="lead">${t("watchlist.empty.text")}</p>
        <a class="button button-primary" href="shop.html">${t("watchlist.empty.cta")}</a>
      </article>
    `;
    return;
  }
  container.innerHTML = listings.map(listingCardMarkup).join("");
}

function bindContactForm() {
  const form = document.querySelector("[data-contact-form]");
  const message = document.querySelector("[data-contact-message]");
  if (!form || !message || form.dataset.bound === "true") return;
  form.dataset.bound = "true";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    message.textContent = t("contact.form.success", { name: data.get("name") });
    form.reset();
  });
}

function initRealMap() {
  const mapNode = document.getElementById("cesme-real-map");
  if (!mapNode || mapInstance) return;

  mapNode.innerHTML = `
    <div class="illustrated-map" aria-hidden="true">
      <div class="map-panzoom">
        <span class="sea-glow sea-glow-a"></span>
        <span class="sea-glow sea-glow-b"></span>
        <span class="terrain-blob terrain-blob-a"></span>
        <span class="terrain-blob terrain-blob-b"></span>
        <span class="terrain-blob terrain-blob-c"></span>
        <svg class="map-illustration" viewBox="0 0 900 700" role="img" aria-label="Stylized Cesme map">
          <path class="water-shape" d="M28 150C78 74 168 37 278 28c121-10 248 8 344 38 98 31 186 84 235 165 46 77 55 182 19 276-38 97-124 170-233 210-118 43-257 58-388 40-120-16-212-62-270-137C-18 551-2 442 14 352c11-61-4-136 14-202Z"></path>
          <path class="wave-line" d="M68 138c64-21 131-22 195-7 63 15 119 46 181 53 69 8 137-16 206-15 58 1 114 20 170 51"></path>
          <path class="wave-line wave-line-soft" d="M56 242c62-11 124-1 182 24 62 26 118 58 184 64 74 6 147-19 221-15 55 3 108 21 160 54"></path>
          <path class="wave-line" d="M78 545c63-2 121-21 173-54 48-30 92-73 150-89 69-19 144-4 214-18 67-13 128-44 183-91"></path>
          <path class="shore-shape" d="M91 365c5-74 33-135 82-184 62-62 153-100 257-110 98-9 198 10 284 47 84 37 151 98 183 182-33 24-72 39-113 45-57 9-116 3-173 16-61 14-114 48-174 68-74 24-159 28-232 10-41-10-77-28-108-54-15-12-30-27-46-28-11 0-20 8-31 7-16-2-27-15-28-30-1-11 4-22 8-32-5 12-9 25-8 39Z"></path>
          <path class="land-shape" d="M82 371c-1-76 26-144 77-199 62-67 155-110 263-122 106-12 218 6 310 44 93 39 168 103 208 191 39 87 33 194-15 279-52 92-146 157-264 197-117 40-256 52-387 33-119-17-215-63-279-136-57-65-85-150-74-236 4-31 12-60 25-88 14 13 30 24 49 24 10 0 18-6 25-8 9-2 17 6 29 17 28 27 65 45 106 55 69 17 150 13 219-10 62-20 115-56 178-69 60-13 122-7 182-16 46-7 89-25 124-54-29-63-81-110-145-143-79-41-174-59-267-54-100 6-189 38-249 91-48 42-77 96-84 164Z"></path>
          <path class="hill-shade hill-shade-a" d="M344 176c58-16 128-3 174 33 43 34 62 87 49 138-15 59-69 104-136 114-66 10-133-18-168-68-34-48-33-116 4-160 19-24 46-44 77-57Z"></path>
          <path class="hill-shade hill-shade-b" d="M527 362c57-14 123-3 164 31 42 35 56 90 35 142-24 58-85 100-156 107-68 8-136-23-165-77-29-54-17-123 30-162 24-20 56-34 92-41Z"></path>
          <path class="coast-line" d="M96 362c4-69 31-128 77-178 59-64 147-103 247-114 98-10 201 7 288 43 83 35 151 91 191 169 37 71 36 159 1 237-39 86-116 151-222 191-112 42-247 56-374 38-112-16-203-58-264-123-57-60-87-139-80-220 2-15 5-29 9-43"></path>
          <path class="ridge-line" d="M330 207c43-12 91-3 124 22 31 24 44 61 35 96-10 40-45 71-88 78-42 7-85-11-108-44-24-34-23-80 3-111 9-12 20-23 34-31"></path>
          <path class="ridge-line ridge-line-soft" d="M519 392c39-10 84-3 113 20 29 22 39 57 28 90-13 37-50 64-93 70-41 5-82-14-101-47-20-34-12-77 18-104 10-10 22-20 35-29"></path>
          <path class="road-line" d="M211 338c75-8 146-4 214 13 67 17 132 49 211 102"></path>
          <path class="road-line" d="M257 529c85-26 167-55 258-70 79-14 157-16 243-2"></path>
          <path class="road-line" d="M418 145c-8 78-24 153-54 223-22 51-51 105-95 157"></path>
        </svg>
      </div>
      ${MARKET.districts
        .map(
          (district) => `
            <button class="hotspot hotspot-${district.id} ${district.id === activeDistrictId ? "is-active" : ""}" type="button" data-district-id="${district.id}" style="left:${getMapSpot(district.id).x}%; top:${getMapSpot(district.id).y}%;">
              <span>${getMapSpot(district.id).emoji} ${getDistrictLabel(district)}</span>
            </button>
          `
        )
        .join("")}
      <button class="hotspot hotspot-poi hotspot-alacati-port" type="button" data-poi-id="alacati-port" style="left:${getMapSpot("alacati-port").x}%; top:${getMapSpot("alacati-port").y}%;">
        <span>${getMapSpot("alacati-port").emoji} ${getMapSpotLabel("alacati-port")}</span>
      </button>
      <button class="hotspot hotspot-poi hotspot-cesme-marina" type="button" data-poi-id="cesme-marina" style="left:${getMapSpot("cesme-marina").x}%; top:${getMapSpot("cesme-marina").y}%;">
        <span>${getMapSpot("cesme-marina").emoji} ${getMapSpotLabel("cesme-marina")}</span>
      </button>
      <div class="map-caption" data-map-caption></div>
    </div>
  `;

  mapNode.querySelectorAll("[data-district-id]").forEach((button) => {
    button.addEventListener("mouseenter", () => focusMapOn(button.dataset.districtId));
    button.addEventListener("mouseleave", () => focusMapOn(activeMapSpotId));
    button.addEventListener("click", () => {
      activeMapSpotId = button.dataset.districtId;
      renderDistrict(button.dataset.districtId);
      focusMapOn(activeMapSpotId);
    });
    markerMap.set(button.dataset.districtId, button);
  });
  mapNode.querySelectorAll("[data-poi-id]").forEach((button) => {
    button.addEventListener("mouseenter", () => focusMapOn(button.dataset.poiId));
    button.addEventListener("mouseleave", () => focusMapOn(activeMapSpotId));
    button.addEventListener("click", () => {
      activeMapSpotId = button.dataset.poiId;
      focusMapOn(activeMapSpotId);
      updateMapMarkers();
    });
    poiMap.set(button.dataset.poiId, button);
  });
  mapInstance = { type: "illustrated" };
  focusMapOn(activeMapSpotId);
}

function updateMapMarkers() {
  if (!markerMap.size && !poiMap.size) return;
  MARKET.districts.forEach((district) => {
    const marker = markerMap.get(district.id);
    if (!marker) return;
    marker.classList.toggle("is-active", district.id === activeDistrictId);
    const label = marker.querySelector("span");
    if (label) label.textContent = `${getMapSpot(district.id).emoji} ${getDistrictLabel(district)}`;
  });
  poiMap.forEach((marker, id) => {
    marker.classList.toggle("is-active", id === activeMapSpotId);
    const label = marker.querySelector("span");
    if (label) label.textContent = `${getMapSpot(id).emoji} ${getMapSpotLabel(id)}`;
  });
  focusMapOn(activeMapSpotId);
}

function setupReveal() {
  const nodes = document.querySelectorAll(".reveal");
  if (!nodes.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.12 }
  );
  nodes.forEach((node) => observer.observe(node));
}

function renderCurrentView() {
  applyStaticTranslations();
  markActiveNav();
  renderAssistantTexts();
  renderOverview();
  renderHomeListings();
  renderHomeBrokers();
  renderFilterBar();
  renderAllListings();
  renderDistrict(activeDistrictId);
  renderYields();
  renderHistory();
  renderSources();
  renderListingDetail();
  renderWatchlistPage();
  bindContactForm();
  bindSaveButtons();
  updateSyncClock();
  updateMapMarkers();
}

function boot() {
  initPreferences();
  applyStaticTranslations();
  initRealMap();
  renderCurrentView();
  setupReveal();
  window.setInterval(updateSyncClock, 1000);
}

boot();
