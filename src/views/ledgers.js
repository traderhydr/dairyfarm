import { allLedgers, entriesOf, GENERAL_ID, ledgerIdOf, nameTaken, totalsOf } from '../lib/ledgers.js';
import { escapeHtml, formatCurrency } from '../lib/format.js';
import { commit, state } from '../state.js';
import { openConfirmModal } from '../ui/modal.js';
import { closeSheets, openSheet } from '../ui/sheets.js';
import { showToast } from '../ui/toast.js';

const $ = (id) => document.getElementById(id);

// null = the Cashbook home screen (all ledgers); otherwise the id of the open ledger
let currentId = null;
let renamingId = null;

export const getCurrentLedgerId = () => currentId;

export function getCurrentLedger() {
  return currentId === null ? null : allLedgers(state.ledgers).find((l) => l.id === currentId) || null;
}

/** Entries visible in the current view (all of them, or just the open ledger's). */
export function scopedTransactions() {
  return entriesOf(state.transactions, state.ledgers, getCurrentLedger() ? currentId : null);
}

const signed = (n) => (n < 0 ? '- ' : '') + formatCurrency(Math.abs(n));
const netClass = (n) => (n >= 0 ? 'text-emerald-700' : 'text-rose-600');

function applyView() {
  const ledger = getCurrentLedger();
  if (!ledger) currentId = null;
  document.body.classList.toggle('ledger-open', Boolean(ledger));
  $('ledgersCard').classList.toggle('hidden', Boolean(ledger));
  $('ledgerHeader').classList.toggle('hidden', !ledger);
}

export function renderLedgers() {
  applyView();
  const ledgers = allLedgers(state.ledgers);

  // ledger picker in the add/edit entry form
  const select = $('txLedger');
  const keep = select.value;
  select.innerHTML = ledgers.map((l) => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`).join('');
  select.value = ledgers.some((l) => l.id === keep) ? keep : GENERAL_ID;

  // Home screen: one card per ledger
  const counts = new Map(ledgers.map((l) => [l.id, []]));
  state.transactions.forEach((t) => counts.get(ledgerIdOf(t, state.ledgers)).push(t));
  $('ledgerListContainer').innerHTML = ledgers.map((l) => {
    const t = totalsOf(counts.get(l.id));
    return `
      <button type="button" data-open-ledger="${escapeHtml(l.id)}" class="ledger-card text-left">
        <div class="flex items-start justify-between gap-2">
          <p class="font-semibold text-slate-900 truncate">${escapeHtml(l.name)}</p>
          <span class="text-xs text-slate-400 whitespace-nowrap">${t.count} ${t.count === 1 ? 'entry' : 'entries'} &rsaquo;</span>
        </div>
        <p class="text-lg font-extrabold mt-1 ${netClass(t.net)}">${signed(t.net)}</p>
        <p class="text-xs text-slate-500 mt-0.5">In ${formatCurrency(t.income)} &middot; Out ${formatCurrency(t.expense)}</p>
      </button>`;
  }).join('');

  // Open ledger: header with its own totals
  const ledger = getCurrentLedger();
  if (!ledger) return;
  const t = totalsOf(scopedTransactions());
  $('ledgerTitle').textContent = ledger.name;
  $('ledgerIncome').textContent = formatCurrency(t.income);
  $('ledgerIncomeCount').textContent = t.incomeCount + (t.incomeCount === 1 ? ' entry' : ' entries');
  $('ledgerExpense').textContent = formatCurrency(t.expense);
  $('ledgerExpenseCount').textContent = t.expenseCount + (t.expenseCount === 1 ? ' entry' : ' entries');
  $('ledgerNet').textContent = signed(t.net);
  $('ledgerNet').className = 'text-lg font-extrabold mt-1 ' + netClass(t.net);
  $('ledgerEntryCount').textContent = String(t.count);
  $('ledgerManageBtns').classList.toggle('hidden', Boolean(ledger.builtIn));
}

/** Open a ledger (or pass null to go back to all ledgers). */
export function showLedger(id) {
  closeSheets();
  currentId = id;
  // the entry list's search/month/type filters belong to one view; start fresh
  ['txSearch'].forEach((f) => { $(f).value = ''; });
  $('txFilter').value = 'all';
  $('txMonthFilter').value = 'all';
  document.dispatchEvent(new CustomEvent('ledgerview'));
  window.scrollTo({ top: 0 });
}

export function isLedgerOpen() {
  return currentId !== null;
}

function openLedgerSheet(renaming) {
  renamingId = renaming ? currentId : null;
  $('ledgerSheetTitle').textContent = renaming ? 'Rename Ledger' : 'New Ledger';
  $('ledgerForm').querySelector('button[type="submit"]').textContent = renaming ? 'Save Name' : 'Create Ledger';
  $('ledgerName').value = renaming ? getCurrentLedger().name : '';
  $('ledgerNameError').classList.add('hidden');
  openSheet('ledgerSheet');
}

export function initLedgers() {
  document.addEventListener('ledgerview', () => commit('view'));
  document.addEventListener('sheetclose', (e) => {
    if (e.detail.id === 'ledgerSheet') renamingId = null;
  });

  $('ledgerListContainer').addEventListener('click', (e) => {
    const card = e.target.closest('[data-open-ledger]');
    if (card) showLedger(card.getAttribute('data-open-ledger'));
  });
  $('ledgerBackBtn').addEventListener('click', () => showLedger(null));
  $('newLedgerBtn').addEventListener('click', () => openLedgerSheet(false));
  $('renameLedgerBtn').addEventListener('click', () => openLedgerSheet(true));

  $('ledgerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('ledgerName').value.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (nameTaken(state.ledgers, name, renamingId)) {
      $('ledgerNameError').classList.remove('hidden');
      return;
    }
    if (renamingId) {
      const ledger = state.ledgers.find((l) => l.id === renamingId);
      if (ledger) ledger.name = name;
      commit();
      showToast('Ledger renamed.');
      return;
    }
    const ledger = { id: 'ledger-' + Date.now(), name };
    state.ledgers.push(ledger);
    currentId = ledger.id; // jump straight into the new ledger
    commit();
    showToast('Ledger created!');
  });

  $('deleteLedgerBtn').addEventListener('click', () => {
    const ledger = getCurrentLedger();
    if (!ledger || ledger.builtIn) return;
    const n = scopedTransactions().length;
    openConfirmModal(
      `Delete "${ledger.name}"?`,
      n
        ? `Its ${n} ${n === 1 ? 'entry moves' : 'entries move'} to the General ledger. No entries are deleted.`
        : 'This ledger has no entries.',
      () => {
        state.transactions.forEach((t) => { if (t.ledgerId === ledger.id) delete t.ledgerId; });
        state.ledgers = state.ledgers.filter((l) => l.id !== ledger.id);
        currentId = null;
        commit();
        showToast('Ledger deleted.');
      }
    );
  });
}
