// A mark is a picture and a colour chosen for one animal, so a farmer who cannot read her tag can still say
// "the cow with the red star". Every animal has one: the farmer's choice, or a steady default made from her tag.
import { sameAnimal } from './animals.js';

export const MARK_SYMBOLS = ['⭐', '❤️', '🌙', '☀️', '🔥', '⚡', '🌸', '🍀', '🦋', '🔔', '👑', '🌈', '💎', '🎈', '🍎', '🌴'];
export const MARK_COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black'];

/** The record's own mark if it is one of the allowed pictures and colours (anything else is ignored), else null. */
export function validMark(mark) {
  return mark && MARK_SYMBOLS.includes(mark.symbol) && MARK_COLORS.includes(mark.color)
    ? { symbol: mark.symbol, color: mark.color } : null;
}

const hash = (text) => {
  let h = 5381;
  for (const ch of String(text || '')) h = ((h << 5) + h + ch.codePointAt(0)) | 0;
  return Math.abs(h);
};

/** A steady mark for a tag: the same tag always gets the same picture and colour. */
export function defaultMark(seed) {
  const h = hash(seed);
  return { symbol: MARK_SYMBOLS[h % MARK_SYMBOLS.length], color: MARK_COLORS[Math.floor(h / MARK_SYMBOLS.length) % MARK_COLORS.length] };
}

export const markOf = (record) => validMark(record && record.mark) || defaultMark(record && (record.tag || record.name || record.id));

/** HTML for the round badge (picture inside a coloured ring). `big` for the profile header. */
export function markHtml(mark, big = false) {
  const m = validMark(mark) || defaultMark('');
  return `<span class="mark${big ? ' mark-lg' : ''}" data-color="${m.color}" aria-hidden="true">${m.symbol}</span>`;
}

/** The mark of the herd animal a tag belongs to (milkers, Wachi, goats, horses), or null when she is not in the herd. */
export function markOfTag(state, tag) {
  const rec = (state.milkersList || []).find((m) => sameAnimal(m.tag, tag))
    || (state.wachiList || []).find((w) => sameAnimal(w.tag, tag))
    || (state.goats || []).find((g) => sameAnimal(g.tag, tag))
    || (state.horses || []).find((h) => sameAnimal(h.name, tag));
  return rec ? markOf(rec) : null;
}
