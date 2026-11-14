// Swipe left / right anywhere on the page to go to the next / previous tab of the bottom bar.
import { getActiveTab, switchTab } from './tabs.js';

const ORDER = { farm: ['finance', 'animals', 'breeding', 'wanda'], crops: ['crops', 'lands'] };
const MIN_DX = 70;        // px the finger must travel sideways
const MAX_MS = 800;       // ...quickly
const TYPING = 'input, textarea, select, [contenteditable="true"]';

/**
 * Which tab a swipe leads to, or null. dx > 0 is a swipe to the right.
 * In left-to-right text a swipe LEFT shows the next tab; in right-to-left (Urdu) it is mirrored.
 */
export function swipeTarget(order, current, dx, dy, rtl = false) {
  const i = order.indexOf(current);
  if (i < 0 || Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * 1.8) return null;
  const forward = rtl ? dx > 0 : dx < 0;
  return order[i + (forward ? 1 : -1)] || null;
}

/** True when the touch began somewhere a sideways drag has its own meaning (typing, scrolling a wide table, a sheet...). */
function blocked(el) {
  if (!el || !el.closest) return true;
  if (el.closest(TYPING) || el.closest('[data-no-swipe]')) return true;
  if (document.querySelector('.sheet:not(.hidden)') || !document.getElementById('confirmModal').classList.contains('hidden')) return true;
  if (!document.getElementById('sideMenuDrawer').classList.contains('-translate-x-full')) return true;
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const x = getComputedStyle(e).overflowX;
    if ((x === 'auto' || x === 'scroll') && e.scrollWidth > e.clientWidth + 2) return true;
  }
  return false;
}

export function initSwipe() {
  let start = null;
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || blocked(e.target)) { start = null; return; }
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, at: Date.now() };
  }, { passive: true });
  document.addEventListener('touchcancel', () => { start = null; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!start) return;
    const t = e.changedTouches[0];
    const s = start;
    start = null;
    if (Date.now() - s.at > MAX_MS) return;
    const order = ORDER[document.body.dataset.mode === 'crops' ? 'crops' : 'farm'];
    const next = swipeTarget(order, getActiveTab(), t.clientX - s.x, t.clientY - s.y, document.documentElement.dir === 'rtl');
    if (next) switchTab(next);
  }, { passive: true });
}
