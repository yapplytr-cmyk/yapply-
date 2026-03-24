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
