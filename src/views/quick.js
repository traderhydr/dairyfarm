// The big home-screen buttons: one tap from the home screen to the form for the daily jobs.
import { GENERAL_ID } from '../lib/ledgers.js';
import { openSheet } from '../ui/sheets.js';
import { switchTab } from '../ui/tabs.js';
import { getCurrentLedgerId } from './ledgers.js';

const $ = (id) => document.getElementById(id);

function addEntry(type) {
  switchTab('finance');
  openSheet('financeSheet');
  $('txType').value = type;
  $('txCategory').value = type === 'income' ? 'Milk Sale' : 'Other';
  $('txLedger').value = getCurrentLedgerId() || GENERAL_ID;
  $('txAmount').focus();
}

export function initQuick() {
  $('quickActions').addEventListener('click', (e) => {
    const tile = e.target.closest('[data-quick]');
    if (!tile) return;
    const kind = tile.getAttribute('data-quick');
    if (kind === 'income' || kind === 'expense') addEntry(kind);
    else if (kind === 'milk') switchTab('milkers');
    else if (kind === 'ai') { switchTab('breeding'); openSheet('breedingSheet'); }
    else if (kind === 'medicine') { switchTab('health'); openSheet('healthSheet'); }
    else if (kind === 'wanda') switchTab('wanda');
  });
}
