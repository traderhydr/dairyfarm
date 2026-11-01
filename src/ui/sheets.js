// Slide-up forms: each tab's "add" form lives in a sheet opened by the floating + button.
import { onChange } from '../state.js';

const $ = (id) => document.getElementById(id);

export function hasOpenSheet() {
  return Boolean(document.querySelector('.sheet:not(.hidden)'));
}

export function closeSheets() {
  document.querySelectorAll('.sheet:not(.hidden)').forEach((sheet) => sheet.classList.add('hidden'));
  document.body.classList.remove('sheet-open');
}

export function openSheet(id) {
  const sheet = $(id);
  if (!sheet) return;
  closeSheets();
  sheet.classList.remove('hidden');
  document.body.classList.add('sheet-open');
  const panel = sheet.querySelector('.sheet-panel');
  if (panel) panel.scrollTop = 0;
}

export function initSheets() {
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-sheet]');
    if (opener) {
      openSheet(opener.getAttribute('data-open-sheet'));
      return;
    }
    if (e.target.closest('[data-close-sheet]')) closeSheets();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hasOpenSheet()) closeSheets();
  });

  // A saved record commits the state; that is the signal to close the form.
  onChange((source) => {
    if (source === 'local') closeSheets();
  });
}
