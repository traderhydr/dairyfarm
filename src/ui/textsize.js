// "Aa" button: normal -> large -> extra large text for the whole app (remembered on this phone).
const KEY = 'dairy_farm_textsize';
const ORDER = ['normal', 'large', 'xlarge'];

export function getTextSize() {
  try { const v = localStorage.getItem(KEY); return ORDER.includes(v) ? v : 'normal'; } catch (e) { return 'normal'; }
}

export function setTextSize(size) {
  const html = document.documentElement;
  if (size === 'normal') html.removeAttribute('data-textsize'); else html.setAttribute('data-textsize', size);
  try { localStorage.setItem(KEY, size); } catch (e) { /* private mode */ }
  const btn = document.getElementById('textSizeBtn');
  if (btn) btn.setAttribute('data-size', size);
}

export function initTextSize() {
  setTextSize(getTextSize());
  document.getElementById('textSizeBtn').addEventListener('click', () => {
    setTextSize(ORDER[(ORDER.indexOf(getTextSize()) + 1) % ORDER.length]);
  });
}
