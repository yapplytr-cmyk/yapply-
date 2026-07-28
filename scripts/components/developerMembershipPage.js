/**
 * Developer Membership / Upgrade Page
 * Shows current plan, remaining bids, next reset date, and upgrade options.
 */

import { createButton, createSectionHeading } from "./primitives.js";

/* ── Yapply token coin — a DRAWN coin (line art with shading), like the app's
      other icons. Inherits currentColor. Same graphic everywhere. ── */
function yapplyCoin(sizeEm = 1.2) {
  return `<span class="yapply-coin" style="width:${sizeEm}em;height:${sizeEm}em" aria-hidden="true">${_yapplyCoinSvg()}</span>`;
}
function _yapplyCoinSvg() {
  return `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="14.5" stroke-width="2.1"/><circle cx="20" cy="20" r="9.3" stroke-width="1.6" opacity="0.8"/><path d="M30.5 30.5 A14.5 14.5 0 0 1 9.5 30.5" stroke-width="3.6"/><path d="M11.6 15.2 A14.5 14.5 0 0 1 16 10.8" stroke-width="1.3" opacity="0.5"/></svg>`;
}

function _ensureCoinCss() {
  if (document.getElementById("yapply-coin-css")) return;
  const style = document.createElement("style");
  style.id = "yapply-coin-css";
  style.textContent = `
    .yapply-coin { display:inline-block; vertical-align:-0.2em; margin-right:3px; }
    .yapply-coin svg { display:block; width:100%; height:100%; animation: yapplyCoinBob 3s ease-in-out infinite; will-change:transform; }
    @keyframes yapplyCoinBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1.5px)} }
    @media (prefers-reduced-motion: reduce) { .yapply-coin svg { animation:none; } }
  `;
  document.head.appendChild(style);
}

function getMembershipLocale(content) {
  return content.meta?.locale === "tr" ? "tr" : "en";
}

function getMembershipCopy(locale) {
  if (locale === "tr") {
    return {
      heading: {
        eyebrow: "Üyelik",
        title: "Geliştirici Planınız",
        description: "Mevcut planınızı görüntüleyin ve daha fazla teklif hakkı için yükseltin.",
      },
      currentPlan: "Mevcut Plan",
      bidsRemaining: "Kalan Teklif",
      totalBids: "Toplam Teklif",
      resetDate: "Yenileme Tarihi",
      upgradeCta: "Bu Plana Geç",
      currentLabel: "Mevcut Planınız",
      free: {
        name: "Ücretsiz",
        bids: "15 teklif / 30 gün",
        price: "Ücretsiz",
        features: ["15 teklif her 30 günde bir", "Temel profil", "Pazar yeri erişimi"],
      },
      pro40: {
        name: "Profesyonel",
        bids: "40 teklif / 30 gün",
        price: "349 TL",
        features: ["40 teklif her 30 günde bir", "Öncelikli profil", "Gelişmiş istatistikler"],
      },
      unlimited: {
        name: "Sınırsız",
        bids: "Sınırsız teklif / 30 gün",
        price: "749 TL",
        features: ["Sınırsız teklif", "VIP profil rozeti", "Öncelikli destek", "Gelişmiş analitik"],
      },
      perMonth: "/ ay",
      popular: "En Popüler",
      contactSales: "Ödemeler Yapply içinde güvenli şekilde Stripe ile alınır.",
    };
  }
  return {
    heading: {
      eyebrow: "Membership",
      title: "Your Developer Plan",
      description: "View your current plan and upgrade for more bidding power.",
    },
    currentPlan: "Current Plan",
    bidsRemaining: "Bids Remaining",
    totalBids: "Total Bids",
    resetDate: "Next Reset",
    upgradeCta: "Select Plan",
    currentLabel: "Your Current Plan",
    free: {
      name: "Free",
      bids: "15 bids / 30 days",
      price: "Free",
      features: ["15 bids every 30 days", "Basic profile", "Marketplace access"],
    },
    pro40: {
      name: "Professional",
      bids: "40 bids / 30 days",
      price: "349 TL",
      features: ["40 bids every 30 days", "Priority profile", "Advanced statistics"],
    },
    unlimited: {
      name: "Unlimited",
      bids: "Unlimited bids / 30 days",
      price: "749 TL",
      features: ["Unlimited bids", "VIP profile badge", "Priority support", "Advanced analytics"],
    },
    perMonth: "/ month",
    popular: "Most Popular",
    contactSales: "Payments are taken securely with Stripe, right inside Yapply.",
  };
}

export function createDeveloperMembershipPage(content, session) {
  const locale = getMembershipLocale(content);
  const copy = getMembershipCopy(locale);
  const user = session?.user || {};

  const currentPlan = user.currentPlan || "free";
  const bidLimit = user.bidLimit ?? 15;
  const bidsUsed = user.bidsUsed ?? 0;
  const bidsRemaining = Math.max(bidLimit - bidsUsed, 0);
  const cycleStart = user.bidCycleStart ? new Date(user.bidCycleStart) : new Date();
  const cycleEnd = new Date(cycleStart.getTime() + 30 * 24 * 60 * 60 * 1000);
  const resetDateStr = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(cycleEnd);

  const isUnlimited = currentPlan === "unlimited";

  function planCard(planKey, isPopular) {
    const plan = copy[planKey];
    const isCurrent = currentPlan === planKey;
    const popularBadge = isPopular
      ? `<span style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--accent,#c9a84c);color:#111;font-size:0.72rem;font-weight:700;padding:4px 14px;border-radius:999px;white-space:nowrap">${copy.popular}</span>`
      : "";

    return `
      <article class="panel" style="position:relative;padding:1.75rem;display:grid;gap:1rem;${isPopular ? "overflow:visible;border-color:var(--accent,#c9a84c);box-shadow:0 0 30px rgba(201,168,76,0.15)" : ""}${isCurrent ? ";outline:2px solid var(--accent,#c9a84c);outline-offset:2px" : ""}">
        ${popularBadge}
        <div>
          <h3 style="font-size:1.15rem;margin:0 0 4px">${plan.name}</h3>
          <p style="font-size:0.82rem;color:var(--text-muted)">${plan.bids}</p>
        </div>
        <div style="display:flex;align-items:baseline;gap:4px">
          <span style="font-size:2.2rem;font-weight:800;color:var(--text)">${plan.price}</span>
          ${planKey !== "free" ? `<span style="font-size:0.85rem;color:var(--text-dim)">${copy.perMonth}</span>` : ""}
        </div>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
          ${plan.features.map((f) => `<li style="font-size:0.85rem;color:var(--text-muted);display:flex;align-items:center;gap:8px"><span style="color:var(--accent);font-size:1rem">&#10003;</span> ${f}</li>`).join("")}
        </ul>
        ${isCurrent
          ? `<span class="button button--secondary" style="text-align:center;pointer-events:none;opacity:0.7">${copy.currentLabel}</span>`
          : `<button class="button button--primary" data-membership-select="${planKey}" style="text-align:center">${copy.upgradeCta}</button>`
        }
      </article>
    `;
  }

  return `
    <section class="section-shell" style="padding-top:3rem">
      ${createSectionHeading(copy.heading)}

      <!-- Current status card -->
      <div class="panel" style="padding:1.5rem;margin-bottom:2rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem">
        <div>
          <span style="font-size:0.78rem;color:var(--text-dim);display:block;margin-bottom:4px">${copy.currentPlan}</span>
          <strong style="font-size:1.1rem;color:var(--accent)">${copy[currentPlan]?.name || "Free"}</strong>
        </div>
        <div>
          <span style="font-size:0.78rem;color:var(--text-dim);display:block;margin-bottom:4px">${copy.bidsRemaining}</span>
          <strong style="font-size:1.1rem">${isUnlimited ? "∞" : bidsRemaining} / ${isUnlimited ? "∞" : bidLimit}</strong>
        </div>
        <div>
          <span style="font-size:0.78rem;color:var(--text-dim);display:block;margin-bottom:4px">${copy.resetDate}</span>
          <strong style="font-size:1.1rem">${resetDateStr}</strong>
        </div>
      </div>

      <!-- Plan cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.25rem;margin-bottom:2rem;padding-top:14px">
        ${planCard("free", false)}
        ${planCard("pro40", true)}
        ${planCard("unlimited", false)}
      </div>

      <div style="text-align:center;margin-top:2.5rem">
        ${createButton({ href: "./developer-dashboard.html", label: locale === "tr" ? "Dashboard'a Dön" : "Back to Dashboard", variant: "secondary" })}
      </div>
    </section>
  `;
}

/* ═══════════════════════════════════════════════════════════════
   Token system integration (2026-07)
   - Shows real token balance from Supabase (token_accounts)
   - Renders live plans from membership_plans table
   - Binds plan buttons → Stripe Checkout (web) / App Store notice (app)
   Falls back silently to the legacy bid-cycle display if token
   RPCs are not deployed.
   ═══════════════════════════════════════════════════════════════ */

export async function initDeveloperMembershipPage(content) {
  const locale = getMembershipLocale(content);
  const isTr = locale === "tr";
  _ensureCoinCss();

  let session = null;
  try {
    const { getAuthSession } = await import("../core/state.js");
    session = getAuthSession();
  } catch (_) {}
  const user = session?.user;
  if (!user?.id) return;

  const tokenStore = await import("../core/tokenStore.js?v=20260727");
  const [status, plans, membership, packs] = await Promise.all([
    tokenStore.getTokenStatus(user.id),
    tokenStore.fetchMembershipPlans(),
    tokenStore.fetchMyMembership(user.id),
    tokenStore.fetchTokenPacks(),
  ]);

  // ── 1. Token balance card (replaces the bids counters when tokens active) ──
  const statusPanel = document.querySelector(".section-shell .panel");
  if (status && statusPanel) {
    const planName = membership?.plan_id
      ? (plans.find((p) => p.id === membership.plan_id)?.name || membership.plan_id)
      : (isTr ? "Ücretsiz" : "Free");
    const nextGrant = status.lastFreeGrantAt
      ? new Date(new Date(status.lastFreeGrantAt).getTime() + 30 * 24 * 3600 * 1000)
      : new Date();
    const nextGrantStr = new Intl.DateTimeFormat(isTr ? "tr-TR" : "en-US", {
      day: "numeric", month: "long", year: "numeric",
    }).format(nextGrant);

    statusPanel.innerHTML = `
      <div>
        <span style="font-size:0.78rem;color:var(--text-dim);display:block;margin-bottom:4px">${isTr ? "Mevcut Plan" : "Current Plan"}</span>
        <strong style="font-size:1.1rem;color:var(--accent)">${planName}</strong>
      </div>
      <div>
        <span style="font-size:0.78rem;color:var(--text-dim);display:block;margin-bottom:4px">${isTr ? "Jeton Bakiyesi" : "Token Balance"}</span>
        <strong style="font-size:1.4rem">${yapplyCoin(1.3)} ${status.balance}</strong>
      </div>
      <div>
        <span style="font-size:0.78rem;color:var(--text-dim);display:block;margin-bottom:4px">${isTr ? "Aylık Ücretsiz Jeton" : "Free Tokens / Month"}</span>
        <strong style="font-size:1.1rem">${status.freeGrantTokens}</strong>
      </div>
      <div>
        <span style="font-size:0.78rem;color:var(--text-dim);display:block;margin-bottom:4px">${isTr ? "Sonraki Ücretsiz Yükleme" : "Next Free Grant"}</span>
        <strong style="font-size:1.1rem">${nextGrantStr}</strong>
      </div>
    `;
  }

  // ── 2. Live plan cards from the membership_plans table ──
  const planGrid = document.querySelectorAll(".section-shell > div")[1];
  const grids = document.querySelectorAll('.section-shell [data-membership-select]');
  const planContainer = grids.length
    ? grids[0].closest("div[style*='grid-template-columns']")
    : null;

  if (planContainer && Array.isArray(plans) && plans.length > 0) {
    const currentPlanId = membership?.plan_id || null;
    planContainer.innerHTML = plans.map((plan, idx) => {
      const isCurrent = currentPlanId === plan.id;
      const isPopular = idx === 1;
      return `
        <article class="panel" style="position:relative;padding:1.75rem;display:grid;gap:1rem;${isPopular ? "overflow:visible;border-color:var(--accent,#c9a84c);box-shadow:0 0 30px rgba(201,168,76,0.15)" : ""}${isCurrent ? ";outline:2px solid var(--accent,#c9a84c);outline-offset:2px" : ""}">
          ${isPopular ? `<span style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--accent,#c9a84c);color:#111;font-size:0.72rem;font-weight:700;padding:4px 14px;border-radius:999px;white-space:nowrap">${isTr ? "En Popüler" : "Most Popular"}</span>` : ""}
          <div>
            <h3 style="font-size:1.15rem;margin:0 0 4px">${plan.name}</h3>
            <p style="font-size:0.82rem;color:var(--text-muted)">${yapplyCoin()} ${plan.tokens_per_month} ${isTr ? "jeton / ay" : "tokens / month"}</p>
          </div>
          <div style="display:flex;align-items:baseline;gap:4px">
            <span style="font-size:2.2rem;font-weight:800;color:var(--text)">${Number(plan.price_try).toLocaleString(isTr ? "tr-TR" : "en-US")} TL</span>
            <span style="font-size:0.85rem;color:var(--text-dim)">${isTr ? "/ ay" : "/ month"}</span>
          </div>
          <ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
            <li style="font-size:0.85rem;color:var(--text-muted);display:flex;align-items:center;gap:8px"><span style="color:var(--accent)">&#10003;</span> ${plan.tokens_per_month} ${isTr ? "jeton her ay hesabınıza eklenir" : "tokens added every month"}</li>
            <li style="font-size:0.85rem;color:var(--text-muted);display:flex;align-items:center;gap:8px"><span style="color:var(--accent)">&#10003;</span> ${isTr ? "Jetonlar teklif vermek için kullanılır" : "Tokens are spent when placing bids"}</li>
            <li style="font-size:0.85rem;color:var(--text-muted);display:flex;align-items:center;gap:8px"><span style="color:var(--accent)">&#10003;</span> ${isTr ? "İstediğiniz zaman iptal edin" : "Cancel anytime"}</li>
          </ul>
          ${isCurrent
            ? `<span class="button button--secondary" style="text-align:center;pointer-events:none;opacity:0.7">${isTr ? "Mevcut Planınız" : "Your Current Plan"}</span>`
            : `<button class="button button--primary" data-token-plan-select="${plan.id}" style="text-align:center">${isTr ? "Bu Plana Geç" : "Select Plan"}</button>`}
        </article>
      `;
    }).join("");
  }

  // ── 2b. One-time token packs ("Buy Tokens") section ──
  if (planContainer && Array.isArray(packs) && packs.length > 0 && !document.querySelector("[data-token-packs]")) {
    const packsSection = document.createElement("div");
    packsSection.setAttribute("data-token-packs", "");
    packsSection.innerHTML = `
      <h3 style="text-align:center;font-size:1.05rem;margin:2.2rem 0 0.4rem">${isTr ? "Jeton Satın Al" : "Buy Tokens"}</h3>
      <p style="text-align:center;font-size:0.82rem;color:var(--text-dim);margin-bottom:1.1rem">${isTr ? "Üyelik olmadan tek seferlik jeton paketleri" : "One-time token packs — no membership needed"}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem">
        ${packs.map((pack) => `
          <article class="panel" style="padding:1.4rem;display:grid;gap:0.7rem;text-align:center">
            <strong style="font-size:1rem">${pack.name}</strong>
            <span style="font-size:1.8rem;font-weight:800">${yapplyCoin(1.5)} ${pack.tokens}</span>
            <span style="font-size:1.05rem;color:var(--text-muted)">${Number(pack.price_try).toLocaleString(isTr ? "tr-TR" : "en-US")} TL</span>
            <button class="button button--primary" data-token-pack-select="${pack.id}">${isTr ? "Satın Al" : "Buy"}</button>
          </article>
        `).join("")}
      </div>
    `;
    planContainer.parentElement.insertBefore(packsSection, planContainer.nextSibling);
  }

  // ── 3. Bind buy buttons → in-app embedded Stripe checkout ──
  const showNote = (btn, msg) => {
    let note = document.querySelector("[data-membership-note]");
    if (!note) {
      note = document.createElement("p");
      note.setAttribute("data-membership-note", "");
      note.style.cssText = "text-align:center;font-size:0.85rem;color:var(--accent,#c9a84c);margin:1rem 0";
      (btn?.closest("article") || document.querySelector(".section-shell"))?.appendChild(note);
    }
    note.textContent = msg;
  };

  const bindButtons = () => {
    document.querySelectorAll("[data-token-plan-select], [data-membership-select], [data-token-pack-select]").forEach((btn) => {
      if (btn.dataset.checkoutWired) return;
      btn.dataset.checkoutWired = "1";
      btn.addEventListener("click", async () => {
        const packId = btn.getAttribute("data-token-pack-select") || "";
        const planId = btn.getAttribute("data-token-plan-select") || btn.getAttribute("data-membership-select") || "";
        if (!packId && (!planId || planId === "free")) return;
        btn.disabled = true;
        const prevLabel = btn.textContent;
        btn.textContent = isTr ? "Yükleniyor…" : "Loading…";

        // Build the order summary from the selected plan / pack.
        const nf = (n) => Number(n).toLocaleString(isTr ? "tr-TR" : "en-US");
        let details;
        if (packId) {
          const p = (Array.isArray(packs) ? packs : []).find((x) => x.id === packId) || {};
          details = {
            title: p.name || (isTr ? "Jeton Paketi" : "Token Pack"),
            priceLabel: `${nf(p.price_try || 0)} TL`,
            recurring: false,
            lines: [`${yapplyCoin()} ${p.tokens || 0} ${isTr ? "jeton" : "tokens"}`, isTr ? "Tek seferlik ödeme" : "One-time payment"],
          };
        } else {
          const p = (Array.isArray(plans) ? plans : []).find((x) => x.id === planId) || {};
          details = {
            title: `${p.name || (isTr ? "Üyelik" : "Membership")} ${isTr ? "Üyeliği" : "Membership"}`,
            priceLabel: `${nf(p.price_try || 0)} TL${isTr ? " / ay" : " / mo"}`,
            recurring: true,
            lines: [
              `${yapplyCoin()} ${p.tokens_per_month || 0} ${isTr ? "jeton / ay" : "tokens / month"}`,
              isTr ? "Doğrulanmış rozet" : "Verified badge",
              isTr ? "Profesyonel ilan yayınlama" : "Publish professional listings",
              isTr ? "İstediğiniz zaman iptal" : "Cancel anytime",
            ],
          };
        }

        const result = await tokenStore.createPaymentIntent(planId, user.id, user.email || "", packId);
        btn.disabled = false;
        btn.textContent = prevLabel;

        if (!result.ok) {
          const msg = result.code === "NATIVE_USE_IAP"
            ? (isTr ? "Uygulamada üyelikler App Store üzerinden satın alınır. Şimdilik web sitemizden satın alabilirsiniz: yapplytr.com" : "In the app, memberships are purchased via the App Store. For now you can purchase on our website: yapplytr.com")
            : result.code === "STRIPE_NOT_CONFIGURED"
              ? (isTr ? "Ödeme sistemi henüz yapılandırılmadı." : "Payments are not configured yet.")
              : (result.message || (isTr ? "Ödeme başlatılamadı." : "Payment could not be started."));
          showNote(btn, msg);
          return;
        }

        const mounted = await renderCheckoutView(result, details, isTr);
        if (!mounted.ok) {
          showNote(btn, mounted.message || (isTr ? "Ödeme ekranı yüklenemedi." : "Could not load the payment form."));
        }
      });
    });
  };
  bindButtons();

  // ── 4. Checkout return states ──
  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") === "return") {
    const sessionId = params.get("session_id") || "";
    const st = sessionId ? await tokenStore.confirmCheckoutStatus(sessionId) : { paid: false };
    const note = document.createElement("div");
    note.className = "panel";
    if (st.paid) {
      note.style.cssText = "padding:1rem;margin:0 0 1.5rem;border-color:#3fbf7f;color:var(--text)";
      note.textContent = isTr
        ? "Ödemeniz alındı! Üyeliğiniz ve jetonlarınız birkaç saniye içinde aktif olur."
        : "Payment received! Your membership and tokens activate within a few seconds.";
    } else {
      note.style.cssText = "padding:1rem;margin:0 0 1.5rem;border-color:var(--accent,#c9a84c);color:var(--text)";
      note.textContent = isTr
        ? "Ödeme tamamlanmadı. İstediğiniz zaman tekrar deneyebilirsiniz."
        : "Payment was not completed. You can try again anytime.";
    }
    document.querySelector(".section-shell")?.prepend(note);
    // Clean the URL so a refresh doesn't re-trigger.
    try { window.history.replaceState({}, "", window.location.pathname); } catch (_) {}
  } else if (params.get("checkout") === "success") {
    const note = document.createElement("div");
    note.className = "panel";
    note.style.cssText = "padding:1rem;margin:0 0 1.5rem;border-color:#3fbf7f;color:var(--text)";
    note.textContent = isTr
      ? "Ödemeniz alındı! Jetonlarınız birkaç saniye içinde hesabınıza eklenir."
      : "Payment received! Your tokens will appear in your account within a few seconds.";
    document.querySelector(".section-shell")?.prepend(note);
  }
}

/** Lazy-load Stripe.js once. */
let _stripeJsPromise = null;
function loadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (_stripeJsPromise) return _stripeJsPromise;
  _stripeJsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => resolve(window.Stripe);
    s.onerror = () => reject(new Error("Stripe.js failed to load"));
    document.head.appendChild(s);
  });
  return _stripeJsPromise;
}

/**
 * Render a full Yapply-themed checkout PAGE (not a popup): swaps the membership
 * content for an order summary + inline Stripe Payment Element + Pay button.
 * Card fields are Stripe's (PCI), styled to match Yapply. Back returns to plans.
 */
async function renderCheckoutView(intent, details, isTr) {
  try {
    const pk = intent.publishableKey;
    if (!pk) {
      return { ok: false, message: isTr ? "Ödeme anahtarı eksik (STRIPE_PUBLISHABLE_KEY)." : "Missing publishable key (STRIPE_PUBLISHABLE_KEY)." };
    }
    const Stripe = await loadStripeJs();
    if (!Stripe) return { ok: false, message: "Stripe.js unavailable" };

    const shell = document.querySelector(".section-shell");
    if (!shell) return { ok: false, message: "Page container not found" };

    const featureLines = (details.lines || [])
      .map((l) => `<li style="display:flex;align-items:center;gap:8px;font-size:0.9rem;color:var(--text-muted,#b3ada0);margin:0"><span style="color:var(--accent,#c9a84c)">✓</span> ${l}</li>`)
      .join("");

    shell.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding-top:1rem">
        <button data-checkout-back class="button button--secondary" style="font-size:0.85rem;padding:0.45rem 0.9rem;margin-bottom:1.25rem">← ${isTr ? "Geri" : "Back"}</button>
        <h1 style="font-size:1.6rem;margin:0 0 0.35rem">${isTr ? "Ödeme" : "Checkout"}</h1>
        <p style="margin:0 0 1.75rem;color:var(--text-dim,#8b8677);font-size:0.9rem">${isTr ? "Siparişinizi tamamlayın." : "Complete your order."}</p>
        <div style="display:grid;grid-template-columns:1fr;gap:1.25rem" data-checkout-grid>
          <article class="panel" style="padding:1.5rem;display:grid;gap:0.9rem;align-content:start">
            <span style="font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-dim,#8b8677)">${isTr ? "Sipariş Özeti" : "Order Summary"}</span>
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
              <strong style="font-size:1.15rem">${details.title}</strong>
              <strong style="font-size:1.35rem;color:var(--accent,#c9a84c);white-space:nowrap">${details.priceLabel}</strong>
            </div>
            <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">${featureLines}</ul>
          </article>
          <article class="panel" style="padding:1.5rem;display:grid;gap:0.9rem;align-content:start">
            <span style="font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-dim,#8b8677)">${isTr ? "Ödeme Bilgileri" : "Payment Details"}</span>
            <div data-payment-element style="min-height:44px"></div>
            <div data-pay-error style="display:none;color:#ff6b6b;font-size:0.82rem"></div>
            <button data-pay-submit class="button button--primary" style="width:100%;margin-top:6px">${isTr ? `Öde — ${details.priceLabel}` : `Pay ${details.priceLabel}`}</button>
            <p style="margin:0;text-align:center;font-size:0.78rem;color:var(--text-dim,#8b8677)">🔒 ${isTr ? "Güvenli ödeme" : "Secure payment"}</p>
          </article>
        </div>
      </div>`;

    // Two columns on wider screens.
    const grid = shell.querySelector("[data-checkout-grid]");
    if (grid && window.matchMedia("(min-width: 720px)").matches) {
      grid.style.gridTemplateColumns = "1fr 1fr";
    }

    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) {}

    const errEl = shell.querySelector("[data-pay-error]");
    const payBtn = shell.querySelector("[data-pay-submit]");
    const showErr = (m) => { if (errEl) { errEl.textContent = m; errEl.style.display = "block"; } };

    shell.querySelector("[data-checkout-back]")?.addEventListener("click", () => {
      try { window.location.reload(); } catch (_) {}
    });

    const stripe = Stripe(pk);
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const elements = stripe.elements({
      clientSecret: intent.clientSecret,
      appearance: {
        theme: isLight ? "stripe" : "night",
        variables: { colorPrimary: "#c9a84c", borderRadius: "10px" },
      },
    });
    const paymentElement = elements.create("payment", { layout: "tabs" });
    paymentElement.mount(shell.querySelector("[data-payment-element]"));

    payBtn?.addEventListener("click", async () => {
      payBtn.disabled = true;
      const prev = payBtn.textContent;
      payBtn.textContent = isTr ? "İşleniyor…" : "Processing…";
      if (errEl) errEl.style.display = "none";
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href.split("?")[0] + "?checkout=return" },
        redirect: "if_required",
      });
      if (error) {
        showErr(error.message || (isTr ? "Ödeme başarısız." : "Payment failed."));
        payBtn.disabled = false;
        payBtn.textContent = prev;
        return;
      }
      if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
        shell.innerHTML = `
          <div style="max-width:560px;margin:3rem auto;text-align:center">
            <div style="width:72px;height:72px;border-radius:50%;background:#3fbf7f;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>
            </div>
            <h1 style="font-size:1.5rem;margin:0 0 0.5rem">${isTr ? "Ödeme Alındı!" : "Payment Received!"}</h1>
            <p style="color:var(--text-muted,#b3ada0)">${isTr ? "Üyeliğiniz ve jetonlarınız birkaç saniye içinde aktif olur." : "Your membership and tokens activate within a few seconds."}</p>
          </div>`;
        setTimeout(() => { try { window.location.href = window.location.pathname; } catch (_) {} }, 2600);
      } else {
        payBtn.textContent = isTr ? "Yönlendiriliyor…" : "Redirecting…";
      }
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, message: e?.message || "Payment error" };
  }
}
