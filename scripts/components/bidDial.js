/**
 * bidDial.js — Yapply rotary wheel (NAUTICO-style).
 * Compact drag-to-spin wheel with a big readable value and the unit stacked
 * underneath (never clipped). Tap the number to type. Detent haptic + a full
 * click on every notch. Writes into the existing hidden form inputs, so the
 * bid submission flow is untouched. No +/- stepper buttons.
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
      navigator.vibrate(kind === "medium" ? 14 : 6);
    }
  } catch (_) {}
}

// Fuller WebAudio "tick": a bright click layered over a short low body, so it
// reads as a satisfying detent rather than a thin blip. No audio asset needed.
let _ac = null;
function tickSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    _ac = _ac || new AC();
    if (_ac.state === "suspended") _ac.resume();
    const t = _ac.currentTime;
    const out = _ac.createGain();
    out.gain.value = 0.9;
    out.connect(_ac.destination);

    // Bright click
    const o1 = _ac.createOscillator();
    const g1 = _ac.createGain();
    o1.type = "square";
    o1.frequency.setValueAtTime(1250, t);
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.exponentialRampToValueAtTime(0.09, t + 0.004);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o1.connect(g1); g1.connect(out);
    o1.start(t); o1.stop(t + 0.05);

    // Low body for fullness
    const o2 = _ac.createOscillator();
    const g2 = _ac.createGain();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(320, t);
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.07, t + 0.006);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o2.connect(g2); g2.connect(out);
    o2.start(t); o2.stop(t + 0.065);
  } catch (_) {}
}

function detent() {
  haptic("light");
  tickSound();
}

/**
 * Mounts a compact wheel into mountEl.
 * opts: { perTurn, start, min, max, unit, unitFn }
 * onChange(value) — numeric value on every change.
 */
export function mountDial(mountEl, opts = {}, onChange) {
  const PER_TURN = opts.perTurn || 100;
  const MIN = opts.min ?? 0;
  const MAX = opts.max ?? Infinity;
  const NTICKS = 48;
  const R = 92;

  let value = Math.min(MAX, Math.max(MIN, opts.start ?? MIN));
  const unitOf = (v) => (typeof opts.unitFn === "function" ? opts.unitFn(v) : (opts.unit || ""));
  const fmt = (v) => String(Math.round(v));

  let ticksSvg = "";
  for (let i = 0; i < NTICKS; i++) {
    const a = (i / NTICKS) * 2 * Math.PI - Math.PI / 2;
    const major = i % 4 === 0;
    const rIn = major ? 108 : 112;
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
          <input class="y-dial-input" inputmode="numeric" value="${fmt(value)}" />
          <div class="y-dial-unit">${unitOf(value)}</div>
        </div>
      </div>
    </div>`;

  const dial = mountEl.querySelector(".y-dial");
  const rot = mountEl.querySelector(".y-dial-rot");
  const prog = mountEl.querySelector(".y-dial-prog");
  const input = mountEl.querySelector(".y-dial-input");
  const unitEl = mountEl.querySelector(".y-dial-unit");
  const ticks = Array.from(mountEl.querySelectorAll(".y-dial-tick"));
  const CIRC = 2 * Math.PI * R;
  prog.style.strokeDasharray = CIRC;

  function fitAmount(str) {
    const len = String(str).length;
    input.style.fontSize = len <= 3 ? "1.7rem" : len <= 5 ? "1.35rem" : len <= 7 ? "1.05rem" : "0.85rem";
  }

  let lastLit = -1;

  function render() {
    const frac = ((value - MIN) % PER_TURN) / PER_TURN;
    prog.style.strokeDashoffset = CIRC * (1 - frac);
    rot.style.transform = `rotate(${frac * 360}deg)`;
    const lit = Math.round(frac * NTICKS);
    ticks.forEach((t, i) => t.classList.toggle("lit", i < lit));
    if (unitEl) unitEl.textContent = unitOf(value);
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
    if (withHaptic) {
      const frac = ((value - MIN) % PER_TURN) / PER_TURN;
      const lit = Math.round(frac * NTICKS);
      if (lit !== lastLit) { detent(); lastLit = lit; }
    }
    notify();
  }

  render();
  notify();
  fitAmount(input.value);

  // Type in the center
  input.addEventListener("input", () => {
    const n = parseFloat(String(input.value).replace(/[^\d.]/g, ""));
    value = isNaN(n) ? MIN : Math.min(MAX, Math.max(MIN, n));
    fitAmount(input.value || "0");
    render();
    notify();
  });
  input.addEventListener("blur", () => render());

  // Drag-to-spin
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
 * Mounts the bid wheels on the listing detail page, side by side:
 *  - bid amount (TL) → writes to the bidAmount input
 *  - completion timeframe (weeks→"hafta", months→"ay") → writes the label into
 *    the estimatedCompletionTimeframe hidden input.
 * No-op if the bid form isn't on the page.
 */
export function mountBidDials(locale) {
  const isTr = locale === "tr";
  const form = document.querySelector("[data-marketplace-bid-form]") || document.querySelector('form input[name="bidAmount"]')?.closest("form");
  if (!form) return;
  if (form.querySelector(".y-dial-duo")) return; // already mounted

  const amountInput = form.querySelector('input[name="bidAmount"]');
  const amountLabel = amountInput?.closest(".form-field") || amountInput?.closest("label");
  const tfSelect = form.querySelector('select[name="estimatedCompletionTimeframe"]');
  const tfLabel = tfSelect?.closest(".form-field") || tfSelect?.closest("label");
  if (!amountInput || !amountLabel) return;

  // Build a shared side-by-side row and move both fields into it.
  const duo = document.createElement("div");
  duo.className = "y-dial-duo";
  amountLabel.parentNode.insertBefore(duo, amountLabel);
  duo.appendChild(amountLabel);
  if (tfLabel) duo.appendChild(tfLabel);

  // ── Amount wheel ──
  // Hide the entire original input wrap (text input + "TL" span) — it carries
  // its own flex layout that broke the wheel's centering. Mount the wheel on
  // the label directly, exactly like the timeframe wheel. The hidden input
  // still submits even inside a display:none wrap.
  amountInput.type = "hidden";
  const amountWrap = amountLabel.querySelector(".bid-amount-wrap");
  if (amountWrap) amountWrap.style.display = "none";
  const amountMount = document.createElement("div");
  amountMount.setAttribute("data-bid-dial-amount", "");
  amountLabel.appendChild(amountMount);
  mountDial(amountMount, {
    perTurn: 100000,
    start: 0,
    min: 0,
    max: 500000000,
    unit: "TL",
  }, (v) => { amountInput.value = v > 0 ? String(v) : ""; });

  // ── Timeframe wheel (1-3 → "hafta", 4+ → months "ay") ──
  if (tfSelect && tfLabel) {
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
    const tfMount = document.createElement("div");
    tfMount.setAttribute("data-bid-dial-timeframe", "");
    holder.appendChild(tfMount);
    hidden.value = label(4);
    mountDial(tfMount, {
      perTurn: 12,
      start: 4,
      min: 1,
      max: 52,
      unitFn: (v) => {
        const w = Math.max(1, Math.round(v));
        if (w <= 3) return isTr ? "hafta" : (w === 1 ? "week" : "weeks");
        return isTr ? "ay" : "months";
      },
    }, (v) => { hidden.value = label(Math.max(1, Math.round(v))); });
  }
}
