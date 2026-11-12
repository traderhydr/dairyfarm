// Nobody should lose a record to a slipped finger: every Delete / Remove button asks "Delete this?" first.
// Runs before the buttons' own handlers (capture phase); on "Confirm" the same click is replayed.
import { openConfirmModal } from './modal.js';

const OWN_CONFIRM = new Set(['data-delete-crop']); // asks by itself, with the crop's name

export function initConfirmDelete() {
  let replaying = null;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn === replaying) return;
    const isDelete = btn.getAttributeNames().some((n) => (n.startsWith('data-delete-') || n.startsWith('data-del-')) && !OWN_CONFIRM.has(n));
    if (!isDelete) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    openConfirmModal('Delete this?', 'This cannot be undone.', () => {
      replaying = btn;
      btn.click();
      replaying = null;
    });
  }, true);
}
