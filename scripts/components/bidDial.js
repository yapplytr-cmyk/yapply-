/**
 * bidDial.js — Yapply rotary dial (ported from the NAUTICO spending dial).
 * Drag-to-wind ring with graduation ticks, typeable center value and
 * haptic feedback on native. Writes its value into a hidden form input,
 * so the existing bid submission flow is completely untouched.
 */

function _isNative() {
  return window.location.origin === "capacitor://localhost" ||
    (window.location.hostname === "localhost" && !window.location.port);
}

function haptic(kind) {
  try {
    if (_isNative() && window.Capacitor?.Plugins?.Haptics) {
      if (kind === "success") window.Capacitor.Plugins.Haptics.notification({ type: "SUCCESS" });
      else window.Capacitor.Plugins.Haptics.impact({ style: kind === "medium" ? "MEDIUM" : "LIGHT" });
    } else if (navigator.vibrate) {
      // Web fallback so the wheel still "kicks" on Android / supported browsers.
      navigator.vibrate(kind === "medium" ? 12 : 5);
    }
  } catch (_) {}
}

// Short WebAudio "tick" — the scroll-wheel click, no audio asset required.
let _ac = null;
function tickSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    _ac = _ac || new AC();
    if (_ac.state === "suspended") _ac.resume();
    const t = _ac.currentTime;
    const o = _ac.createOscillator();
    const g = _ac.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(1500, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    o.connect(g);
    g.connect(_ac.destination);
    o.start(t);
    o.stop(t + 0.032);
  } catch (_) {}
}

// One "detent" of feedback: haptic tick + audible click together.
function detent() {
  haptic("light");
  tickSound();
}

/**
 * Mounts a dial into mountEl.
 * opts: { perTurn, prefix, suffix, suffixFn, steps, start, min, max, sub, format, parse }
 * onChange(value) — called with the numeric value on every change.
 */
export function mountDial(mountEl, opts = {}, onChange) {
  const PER_TURN = opts.perTurn || 100;
  const PREFIX = opts.prefix || "";
  const STEPS = opts.steps || [-10, -1, 1, 10];
  const MIN = opts.min ?? 0;
  const MAX = opts.max ?? Infinity;
  const SUB = opts.sub || "";
  const NTICKS = 60;
  const R = 96;

  let value = Math.min(MAX, Math.max(MIN, opts.start ?? MIN));

  const suffixOf = (v) => (typeof opts.suffixFn === "function" ? opts.suffixFn(v) : (opts.suffix || ""));
  const fmt = (v) => String(Math.round(v));

  let ticksSvg = "";
  for (let i = 0; i < NTICKS; i++) {
    const a = (i / NTICKS) * 2 * Math.PI - Math.PI / 2;
    const major = i % 5 === 0;
    const rIn = major ? 110 : 113;
    const x1 = 120 + rIn * Math.cos(a), y1 = 120 + rIn * Math.sin(a);
    const x2 = 120 + 120 * Math.cos(a), y2 = 120 + 120 * Math.sin(a);
    ticksSvg += `<line class="y-dial-tick${major ? " major" : ""}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"></line>`;
  }

  mountEl.innerHTML = `
    <div class="y-dial-wrap">
      <div class="y-dial">
        <svg viewBox="0 0 240 240" class="y-dial-svg">
          <g class="y-dial-ticks" transform="rotate(90 120 120)">${ticksSvg}</g>
          <circle cx="120" cy="120" r="${R}" class="y-dial-track"></circle>
          <circle cx="120" cy="120" r="${R}" class="y-dial-prog"></circle>
        </svg>
        <div class="y-dial-rot"><span class="y-dial-dot"></span></div>
        <div class="y-dial-center">
          <div class="y-dial-amount">${PREFIX ? `<span class="y-dial-cur">${PREFIX}</span>` : ""}<input class="y-dial-input" inputmode="numeric" value="${fmt(value)}" /><span class="y-dial-suf">${suffixOf(value)}</span></div>
          <div class="y-dial-laps"></div>
          ${SUB ? `<div class="y-dial-sub">${SUB}</div>` : ""}
        </div>
      </div>
      <div class="y-dial-row">
        ${STEPS.map((d) => `<button type="button" class="y-dial-step" data-d="${d}">${d > 0 ? "+" : "−"}${Math.abs(d) >= 1000 ? `${Math.abs(d) / 1000}k` : Math.abs(d)}</button>`).join("")}
      </div>
    </div>`;

  const dial = mountEl.querySelector(".y-dial");
  const rot = mountEl.querySelector(".y-dial-rot");
  const prog = mountEl.querySelector(".y-dial-prog");
  const input = mountEl.querySelector(".y-dial-input");
  const suf = mountEl.querySelector(".y-dial-suf");
  const lapsEl = mountEl.querySelector(".y-dial-laps");
  const ticks = Array.from(mountEl.querySelectorAll(".y-dial-tick"));
  const CIRC = 2 * Math.PI * R;
  prog.style.strokeDasharray = CIRC;

  function fitAmount(str) {
    const len = String(str).length;
    input.style.width = Math.max(2, len + 0.5) + "ch";
    input.style.fontSize = len <= 4 ? "1.85rem" : len <= 6 ? "1.5rem" : len <= 8 ? "1.2rem" : "1rem";
  }

  let lastLit = -1;

  function render() {
    const frac = ((value - MIN) % PER_TURN) / PER_TURN;
    const laps = Math.floor((value - MIN) / PER_TURN);
    prog.style.strokeDashoffset = CIRC * (1 - frac);
    rot.style.transform = `rotate(${frac * 360}deg)`;
    const lit = Math.round(frac * NTICKS);
    ticks.forEach((t, i) => t.classList.toggle("lit", i < lit));
    lapsEl.textContent = laps >= 1 ? `×${laps}` : "";
    if (suf) suf.textContent = suffixOf(value);
    if (document.activeElement !== input) {
      input.value = fmt(value);
      fitAmount(input.value);
    }
  }

  function notify() {
    if (typeof onChange === "function") {
      try { onChange(Math.round(value)); } catch (_) {}
    }
  }

  function setValue(v, withHaptic) {
    value = Math.min(MAX, Math.max(MIN, v));
    render();
    // Fire one detent (haptic + click) each time the wheel crosses a graduation
    // tick — this is what makes it feel like the NAUTICO scroll wheel.
    if (withHaptic) {
      const frac = ((value - MIN) % PER_TURN) / PER_TURN;
      const lit = Math.round(frac * NTICKS);
      if (lit !== lastLit) {
        detent();
        lastLit = lit;
      }
    }
    notify();
  }

  render();
  notify();

  // Type in the center
  input.addEventListener("input", () => {
    const n = parseFloat(String(input.value).replace(/[^\d.]/g, ""));
    value = isNaN(n) ? MIN : Math.min(MAX, Math.max(MIN, n));
    fitAmount(input.value || "0");
    render();
    notify();
  });
  input.addEventListener("blur", () => render());

  // Stepper buttons
  mountEl.querySelectorAll(".y-dial-step").forEach((b) => {
    b.addEventListener("click", () => setValue(value + parseFloat(b.dataset.d), true));
  });

  // Drag-to-wind
  let dragging = false;
  let lastAngle = 0;
  function angleAt(e) {
    const r = dial.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const px = e.touches ? e.touches[0].clientX : e.clientX;
    const py = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(py - cy, px - cx);
  }
  function onDown(e) {
    if (e.target === input) return;
    dragging = true;
    lastAngle = angleAt(e);
    dial.classList.add("dragging");
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    const a = angleAt(e);
    let delta = a - lastAngle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    lastAngle = a;
    setValue(value + (delta / (2 * Math.PI)) * PER_TURN, true);
    e.preventDefault();
  }
  function onUp() {
    if (dragging) haptic("medium");
    dragging = false;
    dial.classList.remove("dragging");
  }
  dial.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  dial.addEventListener("touchstart", onDown, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onUp);

  return { getValue: () => Math.round(value), setValue: (v) => setValue(v, false) };
}

/**
 * Mounts the bid dials on the listing detail page:
 *  - bid amount dial (TL) → writes to the bidAmount input
 *  - completion timeframe dial (weeks/months) → writes the localized label
 *    ("2 hafta" / "3 ay") into the estimatedCompletionTimeframe input
 * No-op if the bid form isn't on the page.
 */
export function mountBidDials(locale) {
  const isTr = locale === "tr";
  const form = document.querySelector("[data-marketplace-bid-form]") || document.querySelector('form input[name="bidAmount"]')?.closest("form");
  if (!form) return;

  // ── Amount dial ──
  const amountInput = form.querySelector('input[name="bidAmount"]');
  const amountWrap = form.querySelector(".bid-amount-wrap");
  if (amountInput && amountWrap && !form.querySelector("[data-bid-dial-amount]")) {
    amountInput.type = "hidden";
    const currency = amountWrap.querySelector(".bid-amount-currency");
    if (currency) currency.style.display = "none";
    const mount = document.createElement("div");
    mount.setAttribute("data-bid-dial-amount", "");
    amountWrap.appendChild(mount);
    mountDial(mount, {
      perTurn: 100000,
      prefix: "",
      suffix: " TL",
      steps: [-50000, -10000, 10000, 50000],
      start: 0,
      min: 0,
      max: 500000000,
      sub: isTr ? "çevirin · yazmak için dokunun" : "drag · tap to type",
    }, (v) => {
      amountInput.value = v > 0 ? String(v) : "";
    });
  }

  // ── Timeframe dial (weeks 1-3 → "hafta", 4+ → months "ay") ──
  const tfSelect = form.querySelector('select[name="estimatedCompletionTimeframe"]');
  if (tfSelect && !form.querySelector("[data-bid-dial-timeframe]")) {
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "estimatedCompletionTimeframe";
    const label = (weeks) => {
      if (weeks <= 3) return isTr ? `${weeks} hafta` : `${weeks} week${weeks === 1 ? "" : "s"}`;
      const months = Math.max(1, Math.round(weeks / 4));
      return isTr ? `${months} ay` : `${months} month${months === 1 ? "" : "s"}`;
    };
    const holder = tfSelect.parentElement;
    tfSelect.remove();
    holder.appendChild(hidden);
    const mount = document.createElement("div");
    mount.setAttribute("data-bid-dial-timeframe", "");
    holder.appendChild(mount);
    hidden.value = label(4); // sensible default: 1 month
    mountDial(mount, {
      perTurn: 12,
      prefix: "",
      suffixFn: (v) => {
        const w = Math.max(1, Math.round(v));
        if (w <= 3) return isTr ? " hafta" : ` week${w === 1 ? "" : "s"}`;
        const m = Math.max(1, Math.round(w / 4));
        return isTr ? ` ay (${m})` : ` wk (~${m} mo)`;
      },
      steps: [-4, -1, 1, 4],
      start: 4,
      min: 1,
      max: 52,
      sub: isTr ? "tamamlanma süresi (hafta)" : "completion time (weeks)",
    }, (v) => {
      hidden.value = label(Math.max(1, Math.round(v)));
    });
  }
}
