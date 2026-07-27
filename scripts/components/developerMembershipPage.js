/**
 * Developer Membership / Upgrade Page
 * Shows current plan, remaining bids, next reset date, and upgrade options.
 */

import { createButton, createSectionHeading } from "./primitives.js";

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
      contactSales: "Ödeme entegrasyonu yakında aktif olacaktır.",
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
    contactSales: "Payment integration will be available soon.",
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

      <p style="text-align:center;font-size:0.82rem;color:var(--text-dim);margin-bottom:2rem">${copy.contactSales}</p>

      <div style="text-align:center">
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
        <strong style="font-size:1.4rem">🪙 ${status.balance}</strong>
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
            <p style="font-size:0.82rem;color:var(--text-muted)">🪙 ${plan.tokens_per_month} ${isTr ? "jeton / ay" : "tokens / month"}</p>
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
            <span style="font-size:1.8rem;font-weight:800">🪙 ${pack.tokens}</span>
            <span style="font-size:1.05rem;color:var(--text-muted)">${Number(pack.price_try).toLocaleString(isTr ? "tr-TR" : "en-US")} TL</span>
            <button class="button button--primary" data-token-pack-select="${pack.id}">${isTr ? "Satın Al" : "Buy"}</button>
          </article>
        `).join("")}
      </div>
    `;
    planContainer.parentElement.insertBefore(packsSection, planContainer.nextSibling);
  }

  // ── 3. Bind buy buttons ──
  const bindButtons = () => {
    document.querySelectorAll("[data-token-plan-select], [data-membership-select], [data-token-pack-select]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const packId = btn.getAttribute("data-token-pack-select") || "";
        const planId = btn.getAttribute("data-token-plan-select") || btn.getAttribute("data-membership-select") || "";
        if (!packId && (!planId || planId === "free")) return;
        btn.disabled = true;
        const prevLabel = btn.textContent;
        btn.textContent = isTr ? "Yönlendiriliyor…" : "Redirecting…";
        const result = await tokenStore.startStripeCheckout(planId, user.id, user.email || "", packId);
        if (!result.ok) {
          btn.disabled = false;
          btn.textContent = prevLabel;
          const msg = result.code === "NATIVE_USE_IAP"
            ? (isTr ? "Uygulamada üyelikler App Store üzerinden satın alınır. Şimdilik web sitemizden satın alabilirsiniz: yapplytr.com" : "In the app, memberships are purchased via the App Store. For now you can purchase on our website: yapplytr.com")
            : result.code === "STRIPE_NOT_CONFIGURED"
              ? (isTr ? "Ödeme sistemi çok yakında aktif olacak." : "Payments are launching very soon.")
              : (result.message || (isTr ? "Ödeme başlatılamadı." : "Checkout could not be started."));
          let note = document.querySelector("[data-membership-note]");
          if (!note) {
            note = document.createElement("p");
            note.setAttribute("data-membership-note", "");
            note.style.cssText = "text-align:center;font-size:0.85rem;color:var(--accent,#c9a84c);margin:1rem 0";
            btn.closest("article")?.appendChild(note);
          }
          note.textContent = msg;
        }
      });
    });
  };
  bindButtons();

  // ── 4. Checkout return states ──
  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") === "success") {
    const note = document.createElement("div");
    note.className = "panel";
    note.style.cssText = "padding:1rem;margin:0 0 1.5rem;border-color:#3fbf7f;color:var(--text)";
    note.textContent = isTr
      ? "Ödemeniz alındı! Jetonlarınız birkaç saniye içinde hesabınıza eklenir."
      : "Payment received! Your tokens will appear in your account within a few seconds.";
    document.querySelector(".section-shell")?.prepend(note);
  }
}
