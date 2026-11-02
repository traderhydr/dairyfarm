// Small, tasteful animations. Everything here is skipped when the phone asks for reduced motion.
export function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

const enterTimers = new WeakMap();

/** Replay the "content arrives" animation on the given elements (a tab opening). */
export function playEnter(...elements) {
  elements.filter(Boolean).forEach((el) => {
    clearTimeout(enterTimers.get(el));
    el.classList.remove('tab-enter');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('tab-enter');
    enterTimers.set(el, setTimeout(() => el.classList.remove('tab-enter'), 1100));
  });
}

/**
 * Count a number up (or down) to its new value. The final text is always exactly `format(to)`.
 * @param {number} [from] starting value; defaults to what the element last showed (or 0 the first time)
 */
export function animateNumber(el, to, format = String, from) {
  if (!el) return;
  const target = Math.round(Number(to) || 0);
  const previous = from ?? (el.dataset.value !== undefined ? Number(el.dataset.value) : 0);
  el.dataset.value = String(target);
  cancelAnimationFrame(el._countFrame);

  const final = format(target);
  if (prefersReducedMotion() || previous === target || !Number.isFinite(previous) || el.offsetParent === null) {
    el.textContent = final;
    return;
  }

  const start = performance.now();
  const duration = 550;
  const step = (now) => {
    const k = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = k < 1 ? format(Math.round(previous + (target - previous) * eased)) : final;
    if (k < 1) el._countFrame = requestAnimationFrame(step);
  };
  el._countFrame = requestAnimationFrame(step);
}

/** Grow/shrink a progress bar from its previous width to its new one. */
export function animateBar(fillEl, fromPercent, toPercent) {
  if (!fillEl || prefersReducedMotion() || fromPercent === toPercent || !fillEl.animate) return;
  fillEl.animate(
    [{ transform: `scaleX(${fromPercent / Math.max(toPercent, 1)})` }, { transform: 'scaleX(1)' }],
    { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );
}

const CONFETTI_COLORS = ['#10b981', '#34d399', '#f59e0b', '#f43f5e', '#38bdf8', '#a78bfa', '#fde047'];

/** A short burst of confetti, for reaching a savings goal. */
export function burstConfetti() {
  if (prefersReducedMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const originX = window.innerWidth / 2;
  const originY = window.innerHeight * 0.4;
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('span');
    const size = 6 + Math.random() * 7;
    piece.className = 'confetti-piece';
    piece.style.cssText = `width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px;background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};left:${originX}px;top:${originY}px;`;
    layer.appendChild(piece);

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const speed = 200 + Math.random() * 320;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const fall = window.innerHeight * 0.6 + Math.random() * 220;
    const spin = (Math.random() - 0.5) * 900;
    piece.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.7}px, ${dy * 0.7}px) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px, ${dy + fall}px) rotate(${spin}deg)`, opacity: 0 }
      ],
      { duration: 1500 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }
    );
  }
  setTimeout(() => layer.remove(), 2600);
}
