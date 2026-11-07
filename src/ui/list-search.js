// Search box above a record list: matches any text, number or date stored in a record (including its payments / history).
import { escapeHtml } from '../lib/format.js';

/** Lower-cased text of every value in a record (ids excluded). */
function haystack(value, out = []) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) value.forEach((v) => haystack(v, out));
  else if (typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) if (key !== 'id') haystack(v, out);
  } else out.push(String(value));
  return out;
}

export function searchQuery(inputId) {
  const el = document.getElementById(inputId);
  return el ? el.value.trim().toLowerCase() : '';
}

/** True when every word typed appears somewhere in the record (an empty query matches everything). */
export function matchesSearch(record, query) {
  if (!query) return true;
  const text = haystack(record).join(' ').toLowerCase();
  return query.split(/\s+/).every((word) => text.includes(word));
}

export function noMatchHtml(inputId) {
  const el = document.getElementById(inputId);
  return `<p class="text-sm text-slate-500 text-center py-6">No matches for “${escapeHtml(el ? el.value.trim() : '')}”.</p>`;
}

/** Re-render a list as the user types. */
export function initListSearch(inputId, render) {
  document.getElementById(inputId).addEventListener('input', render);
}
