// Farm / Crops & Land: the toggle under the header swaps the bottom bar and the sections shown.
import { getActiveTab, switchTab } from './tabs.js';

const KEY = 'dairy_farm_mode';
const CROP_TABS = ['crops', 'lands'];

export function getMode() {
  try { return localStorage.getItem(KEY) === 'crops' ? 'crops' : 'farm'; } catch (e) { return 'farm'; }
}

export function setMode(mode, { remember = true } = {}) {
  document.body.dataset.mode = mode;
  document.querySelectorAll('#modeToggle [data-mode]').forEach((b) => {
    b.setAttribute('aria-selected', String(b.getAttribute('data-mode') === mode));
  });
  if (remember) { try { localStorage.setItem(KEY, mode); } catch (e) { /* private mode */ } }
  const inCrops = CROP_TABS.includes(getActiveTab());
  if (mode === 'crops' && !inCrops) switchTab('crops');
  if (mode === 'farm' && inCrops) switchTab('finance');
}

export function initMode() {
  document.getElementById('modeToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (btn) setMode(btn.getAttribute('data-mode'));
  });
  setMode(getMode(), { remember: false });
}
