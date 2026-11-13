// "Mark" field of the animal forms: pick a picture and a colour. Nothing to read or type.
import { MARK_COLORS, MARK_SYMBOLS, defaultMark, markHtml } from '../lib/marks.js';

/**
 * Builds the picker inside `root` and returns { get, set }.
 * get() is the chosen mark, or null when she has not been given one (the form then saves her steady default).
 */
export function createMarkPicker(root, label = 'Mark') {
  let symbol = null;
  let color = null;
  root.classList.add('mark-picker');
  root.innerHTML = `
    <div class="mark-head"><span class="mark-preview"></span><span class="mark-title">${label}</span></div>
    <div class="mark-row mark-colors" role="group" aria-label="${label}">${MARK_COLORS.map((c) => `<button type="button" class="mark-dot" data-color="${c}" data-pick-color="${c}" aria-pressed="false" aria-label="${c}"></button>`).join('')}</div>
    <div class="mark-row mark-symbols" role="group" aria-label="${label}">${MARK_SYMBOLS.map((s) => `<button type="button" class="mark-sym" data-pick-symbol="${s}" aria-pressed="false">${s}</button>`).join('')}</div>`;

  const paint = () => {
    const shown = symbol && color ? { symbol, color } : { symbol: symbol || defaultMark('').symbol, color: color || 'blue' };
    root.querySelector('.mark-preview').innerHTML = symbol || color ? markHtml(shown, true) : '<span class="mark mark-lg mark-empty" aria-hidden="true">?</span>';
    root.querySelectorAll('[data-pick-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-pick-color') === color)));
    root.querySelectorAll('[data-pick-symbol]').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-pick-symbol') === symbol)));
  };

  root.addEventListener('click', (e) => {
    const c = e.target.closest('[data-pick-color]');
    const s = e.target.closest('[data-pick-symbol]');
    if (c) color = c.getAttribute('data-pick-color');
    if (s) symbol = s.getAttribute('data-pick-symbol');
    if (c || s) paint();
  });
  paint();

  return {
    get: () => (symbol || color
      ? { symbol: symbol || defaultMark(color).symbol, color: color || defaultMark(symbol).color }
      : null),
    set: (mark) => { symbol = mark ? mark.symbol : null; color = mark ? mark.color : null; paint(); }
  };
}
