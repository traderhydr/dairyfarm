import { todayStr } from '../lib/dates.js';
import { sumAmounts } from '../lib/calc.js';
import { escapeHtml, formatCurrency, formatDisplayDate } from '../lib/format.js';
import { commit, state } from '../state.js';
import { showToast } from '../ui/toast.js';

function updateDoodhiFormPreview() {
  const liters = parseFloat(document.getElementById('doodhiLiters')?.value) || 0;
  const rate = parseFloat(document.getElementById('doodhiRate')?.value) || 0;
  const adv = parseFloat(document.getElementById('doodhiInitialReceived')?.value) || 0;
  const total = Math.round(liters * rate);
  const rem = Math.max(0, total - adv);
  const totalEl = document.getElementById('doodhiTotalBillPreview');
  const remEl = document.getElementById('doodhiRemainingPreview');
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (remEl) remEl.textContent = formatCurrency(rem);
}

export function renderDoodhi() {
  const container = document.getElementById('doodhiListContainer');
  const emptyState = document.getElementById('doodhiEmptyState');
  const totalBanner = document.getElementById('doodhiTotalReceivableBanner');
  if (!container || !emptyState) return;

  let grandReceivable = 0;
  state.doodhiAccounts.forEach(acc => {
    const recd = sumAmounts(acc.payments);
    grandReceivable += Math.max(0, (Number(acc.totalBill) || 0) - recd);
  });
  if (totalBanner) totalBanner.textContent = formatCurrency(grandReceivable);

  container.innerHTML = '';
  if (state.doodhiAccounts.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  state.doodhiAccounts.forEach(acc => {
    const totalBill = Number(acc.totalBill) || 0;
    const payments = acc.payments || [];
    const recdAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remAmount = Math.max(0, totalBill - recdAmount);
    const pct = totalBill > 0 ? Math.min(100, Math.round((recdAmount / totalBill) * 100)) : 100;
    const isSettled = remAmount <= 0;

    const statusBadge = isSettled
      ? '<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Account Settled</span>'
      : '<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">Balance Receivable</span>';

    const payRowsHtml = payments.length === 0
      ? '<p class="text-xs text-slate-400 italic py-1">No payments received yet.</p>'
      : payments.map(p => `
          <div class="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200/70">
            <div>
              <span class="font-semibold text-slate-800">${formatDisplayDate(p.date)}</span>
              <span class="text-slate-500 ml-1.5">${escapeHtml(p.note || 'Milk bill payment')}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-emerald-700">+ ${formatCurrency(p.amount)}</span>
              <button type="button" data-delete-doodhi-pay="${p.id}" data-doodhi-id="${acc.id}" class="text-[11px] text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 transition">
                Remove
              </button>
            </div>
          </div>
        `).join('');

    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(acc.buyerName)}</h3>
            ${statusBadge}
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            ${escapeHtml(acc.monthLabel)} &bull; <span class="font-semibold text-slate-700">${acc.liters} Liters</span> @ ${formatCurrency(acc.ratePerLiter)}/L
          </p>
        </div>
        <button type="button" data-delete-doodhi="${acc.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">
          Delete Khata
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">Total Milk Bill</span>
          <span class="text-xs sm:text-sm font-bold text-slate-800">${formatCurrency(totalBill)}</span>
        </div>
        <div class="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
          <span class="block text-[10px] uppercase font-semibold text-emerald-700">Received So Far</span>
          <span class="text-xs sm:text-sm font-bold text-emerald-800">${formatCurrency(recdAmount)}</span>
        </div>
        <div class="bg-sky-50/70 p-2.5 rounded-lg border border-sky-200">
          <span class="block text-[10px] uppercase font-semibold text-sky-700">Balance Due</span>
          <span class="text-xs sm:text-sm font-bold text-sky-950">${formatCurrency(remAmount)}</span>
        </div>
      </div>

      <div class="space-y-1">
        <div class="flex justify-between text-[11px] font-medium text-slate-600">
          <span>Settlement Progress (${payments.length} receipt${payments.length === 1 ? '' : 's'})</span>
          <span>${pct}% Received</span>
        </div>
        <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div class="h-full bg-sky-600 rounded-full transition-all" style="width: ${pct}%"></div>
        </div>
      </div>

      <div class="space-y-1.5">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Payments Received History</p>
        ${payRowsHtml}
      </div>

      ${!isSettled ? `
      <form data-doodhi-pay-form="${acc.id}" class="bg-white p-3 rounded-xl border border-slate-200/90 space-y-2.5">
        <p class="text-xs font-semibold text-slate-800">Receive Payment from Doodhi</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input type="date" name="payDate" value="${todayStr()}" required aria-label="Payment Date" class="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input type="number" name="payAmount" min="1" max="${remAmount}" step="any" value="${remAmount}" placeholder="Amount (Rs.)" required aria-label="Payment Amount" class="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input type="text" name="payNote" placeholder="Note (e.g. Final settlement)" aria-label="Payment Note" class="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <label class="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
            <input type="checkbox" name="syncCashbook" checked class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span>Also add to Daily Cashbook Income (Milk Sale)</span>
          </label>
          <button type="submit" class="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            + Record Payment Received
          </button>
        </div>
      </form>
      ` : `
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-800 font-medium">
        This monthly Doodhi milk account is 100% settled!
      </div>
      `}
    `;
    container.appendChild(card);
  });
}

export function initDoodhi() {
  // Doodhi Khata Form & List Listeners
  ['doodhiLiters', 'doodhiRate', 'doodhiInitialReceived'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateDoodhiFormPreview);
  });

  document.getElementById('doodhiForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const buyerName = document.getElementById('doodhiName').value.trim();
    const monthLabel = document.getElementById('doodhiMonth').value.trim();
    const liters = parseFloat(document.getElementById('doodhiLiters').value) || 0;
    const ratePerLiter = parseFloat(document.getElementById('doodhiRate').value) || 0;
    const startDate = document.getElementById('doodhiStartDate').value;
    const initialReceived = parseFloat(document.getElementById('doodhiInitialReceived').value) || 0;
    const syncAdvance = document.getElementById('doodhiSyncAdvance').checked;

    if (!buyerName || !monthLabel || liters <= 0 || ratePerLiter <= 0 || !startDate) return;

    const totalBill = Math.round(liters * ratePerLiter);
    const payments = [];

    if (initialReceived > 0) {
      payments.push({
        id: 'dpay-' + Date.now(),
        date: startDate,
        amount: initialReceived,
        note: 'Advance / Peshgi received'
      });

      if (syncAdvance) {
        state.transactions.unshift({
          id: 'tx-' + Date.now(),
          type: 'income',
          date: startDate,
          category: 'Milk Sale',
          amount: initialReceived,
          note: `Doodhi Peshgi from ${buyerName} (${monthLabel})`
        });
      }
    }

    state.doodhiAccounts.unshift({
      id: 'doodhi-' + Date.now(),
      buyerName,
      monthLabel,
      startDate,
      liters,
      ratePerLiter,
      totalBill,
      payments
    });

    commit();
    document.getElementById('doodhiName').value = '';
    document.getElementById('doodhiMonth').value = '';
    document.getElementById('doodhiLiters').value = '';
    document.getElementById('doodhiInitialReceived').value = '0';
    updateDoodhiFormPreview();
    showToast('Doodhi Milk Khata saved!');
  });

  document.getElementById('doodhiListContainer').addEventListener('submit', (e) => {
    const form = e.target.closest('[data-doodhi-pay-form]');
    if (!form) return;
    e.preventDefault();

    const accId = form.getAttribute('data-doodhi-pay-form');
    const acc = state.doodhiAccounts.find(a => a.id === accId);
    if (!acc) return;

    const payDate = form.elements.payDate.value;
    const payAmount = parseFloat(form.elements.payAmount.value) || 0;
    const payNote = form.elements.payNote.value.trim() || 'Doodhi milk bill installment';
    const syncCashbook = form.elements.syncCashbook.checked;

    if (!payDate || payAmount <= 0) return;

    acc.payments = acc.payments || [];
    acc.payments.push({
      id: 'dpay-' + Date.now(),
      date: payDate,
      amount: payAmount,
      note: payNote
    });

    if (syncCashbook) {
      state.transactions.unshift({
        id: 'tx-' + Date.now(),
        type: 'income',
        date: payDate,
        category: 'Milk Sale',
        amount: payAmount,
        note: `${payNote} — ${acc.buyerName} (${acc.monthLabel})`
      });
    }

    commit();
    showToast('Doodhi payment recorded!');
  });

  document.getElementById('doodhiListContainer').addEventListener('click', (e) => {
    const delPayBtn = e.target.closest('[data-delete-doodhi-pay]');
    if (delPayBtn) {
      const payId = delPayBtn.getAttribute('data-delete-doodhi-pay');
      const accId = delPayBtn.getAttribute('data-doodhi-id');
      const acc = state.doodhiAccounts.find(a => a.id === accId);
      if (acc && acc.payments) {
        acc.payments = acc.payments.filter(p => p.id !== payId);
        commit();
        showToast('Payment entry removed.');
      }
      return;
    }

    const delAccBtn = e.target.closest('[data-delete-doodhi]');
    if (delAccBtn) {
      const accId = delAccBtn.getAttribute('data-delete-doodhi');
      state.doodhiAccounts = state.doodhiAccounts.filter(a => a.id !== accId);
      commit();
      showToast('Doodhi Khata record deleted.');
    }
  });

}
