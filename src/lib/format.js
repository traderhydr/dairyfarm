/** Dates follow the app language (Urdu month names with Western digits, or English). */
export function dateLocale() {
  return typeof document !== 'undefined' && document.documentElement.lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK';
}

export function addDays(dateStr, days) {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return '—';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d.getTime())) return '—';
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString(dateLocale(), { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('-');
  // never hand back the raw text: it ends up inside HTML, and a damaged or hostile record must not become markup
  if (parts.length !== 3) return '\u2014';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString(dateLocale(), { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCurrency(num) {
  const val = Number(num) || 0;
  return 'Rs. ' + val.toLocaleString('en-PK');
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
