import { todayStr } from '../lib/dates.js';
import { escapeHtml, formatCurrency, formatDisplayDate } from '../lib/format.js';
import { commit, state } from '../state.js';
import { showToast } from '../ui/toast.js';

export function updateWandaFormPreview() {
  const bags = parseFloat(document.getElementById('wandaBags').value) || 0;
  const rate = parseFloat(document.getElementById('wandaRatePerBag').value) || 0;
  const advance = parseFloat(document.getElementById('wandaInitialPaid').value) || 0;
  const total = Math.round(bags * rate);
  const remaining = Math.max(0, total - advance);
  document.getElementById('wandaTotalBillPreview').textContent = formatCurrency(total);
  document.getElementById('wandaRemainingPreview').textContent = formatCurrency(remaining);
}

export function renderWanda() {
  const container = document.getElementById('wandaListContainer');
  const emptyState = document.getElementById('wandaEmptyState');

  container.innerHTML = '';
  if (state.wandaBatches.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  state.wandaBatches.forEach(batch => {
    const totalBill = Number(batch.totalBill) || 0;
    const installments = batch.installments || [];
    const paidAmount = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const remainingAmount = Math.max(0, totalBill - paidAmount);
    const percentPaid = totalBill > 0 ? Math.min(100, Math.round((paidAmount / totalBill) * 100)) : 100;
    const isFullyPaid = remainingAmount <= 0;

    const statusBadge = isFullyPaid
      ? '<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Fully Paid</span>'
      : '<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">Installments Active</span>';

    const instRowsHtml = installments.length === 0
      ? '<p class="text-xs text-slate-400 italic py-1">No installments paid yet.</p>'
      : installments.map(inst => `
          <div class="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200/70">
            <div>
              <span class="font-semibold text-slate-800">${formatDisplayDate(inst.date)}</span>
              <span class="text-slate-500 ml-1.5">${escapeHtml(inst.note || 'Installment payment')}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-emerald-700">${formatCurrency(inst.amount)}</span>
              <button type="button" data-delete-inst="${inst.id}" data-batch-id="${batch.id}" class="text-[11px] text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 transition">
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
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(batch.monthLabel)}</h3>
            ${statusBadge}
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            ${escapeHtml(batch.supplier)} &bull; <span class="font-semibold text-slate-700">${batch.bags} Bags</span> @ ${formatCurrency(batch.ratePerBag)}/bag (Arrived ${formatDisplayDate(batch.purchaseDate)})
          </p>
        </div>
        <button type="button" data-delete-wanda="${batch.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">
          Delete Stock
        </button>
      </div>

      <!-- Bill Breakdown Grid -->
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">Total Stock Bill</span>
          <span class="text-xs sm:text-sm font-bold text-slate-800">${formatCurrency(totalBill)}</span>
        </div>
        <div class="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
          <span class="block text-[10px] uppercase font-semibold text-emerald-700">Paid So Far</span>
          <span class="text-xs sm:text-sm font-bold text-emerald-800">${formatCurrency(paidAmount)}</span>
        </div>
        <div class="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200">
          <span class="block text-[10px] uppercase font-semibold text-indigo-700">Remaining Due</span>
          <span class="text-xs sm:text-sm font-bold text-indigo-900">${formatCurrency(remainingAmount)}</span>
        </div>
      </div>

      <!-- Repayment Progress Bar -->
      <div class="space-y-1">
        <div class="flex justify-between text-[11px] font-medium text-slate-600">
          <span>Monthly Repayment Progress (${installments.length} installment${installments.length === 1 ? '' : 's'})</span>
          <span>${percentPaid}% Paid</span>
        </div>
        <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div class="h-full bg-emerald-600 rounded-full transition-all" style="width: ${percentPaid}%"></div>
        </div>
      </div>

      <!-- Installment History List -->
      <div class="space-y-1.5">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Installment History</p>
        ${instRowsHtml}
      </div>

      <!-- Add Installment Inline Form -->
      ${!isFullyPaid ? `
      <form data-installment-form="${batch.id}" class="bg-white p-3 rounded-xl border border-slate-200/90 space-y-2.5">
        <p class="text-xs font-semibold text-slate-800">Pay Next Installment</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input type="date" name="instDate" value="${todayStr()}" required aria-label="Installment Date" class="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input type="number" name="instAmount" min="1" max="${remainingAmount}" step="any" value="${remainingAmount}" placeholder="Amount (Rs.)" required aria-label="Installment Amount" class="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input type="text" name="instNote" placeholder="Note (e.g. 3rd week payment)" aria-label="Installment Note" class="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <label class="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
            <input type="checkbox" name="syncCashbook" checked class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span>Also add to Daily Cashbook Expenses</span>
          </label>
          <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            + Record Installment
          </button>
        </div>
      </form>
      ` : `
      <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-800 font-medium">
        All installments for this monthly Wanda stock are settled!
      </div>
      `}
    `;
    container.appendChild(card);
  });
}

export function initWanda() {
  // Live Wanda Bill Preview
  ['wandaBags', 'wandaRatePerBag', 'wandaInitialPaid'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateWandaFormPreview);
  });

  // Add New Monthly Wanda Stock
  document.getElementById('wandaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const monthLabel = document.getElementById('wandaMonth').value.trim();
    const purchaseDate = document.getElementById('wandaPurchaseDate').value;
    const supplier = document.getElementById('wandaSupplier').value.trim();
    const bags = parseInt(document.getElementById('wandaBags').value, 10);
    const ratePerBag = parseFloat(document.getElementById('wandaRatePerBag').value);
    const initialPaid = parseFloat(document.getElementById('wandaInitialPaid').value) || 0;
    const syncAdvance = document.getElementById('wandaSyncAdvance').checked;

    if (!monthLabel || !purchaseDate || isNaN(bags) || bags <= 0 || isNaN(ratePerBag) || ratePerBag <= 0) return;

    const totalBill = Math.round(bags * ratePerBag);
    const installments = [];

    if (initialPaid > 0) {
      installments.push({
        id: 'inst-' + Date.now(),
        date: purchaseDate,
        amount: initialPaid,
        note: 'Advance paid on delivery'
      });

      if (syncAdvance) {
        state.transactions.unshift({
          id: 'tx-' + Date.now(),
          type: 'expense',
          date: purchaseDate,
          category: 'Concentrate / Wanda',
          amount: initialPaid,
          note: `Wanda advance (${monthLabel} - ${bags} bags)`
        });
      }
    }

    state.wandaBatches.unshift({
      id: 'wanda-' + Date.now(),
      monthLabel,
      purchaseDate,
      supplier,
      bags,
      ratePerBag,
      totalBill,
      installments
    });

    commit();
    document.getElementById('wandaMonth').value = '';
    document.getElementById('wandaSupplier').value = '';
    document.getElementById('wandaBags').value = '';
    document.getElementById('wandaRatePerBag').value = '';
    document.getElementById('wandaInitialPaid').value = '0';
    updateWandaFormPreview();
    showToast('Monthly Wanda stock added!');
  });

  // Pay Wanda Installment (Event Delegation)
  document.getElementById('wandaListContainer').addEventListener('submit', (e) => {
    const form = e.target.closest('[data-installment-form]');
    if (!form) return;
    e.preventDefault();

    const batchId = form.getAttribute('data-installment-form');
    const batch = state.wandaBatches.find(b => b.id === batchId);
    if (!batch) return;

    const instDate = form.elements.instDate.value;
    const instAmount = parseFloat(form.elements.instAmount.value);
    const instNote = form.elements.instNote.value.trim() || 'Monthly Wanda installment';
    const syncCashbook = form.elements.syncCashbook.checked;

    if (!instDate || isNaN(instAmount) || instAmount <= 0) return;

    batch.installments = batch.installments || [];
    batch.installments.push({
      id: 'inst-' + Date.now(),
      date: instDate,
      amount: instAmount,
      note: instNote
    });

    if (syncCashbook) {
      state.transactions.unshift({
        id: 'tx-' + Date.now(),
        type: 'expense',
        date: instDate,
        category: 'Concentrate / Wanda',
        amount: instAmount,
        note: `${instNote} (${batch.monthLabel})`
      });
    }

    commit();
    showToast('Wanda installment recorded!');
  });

  // Delete Wanda Installment or Entire Wanda Batch
  document.getElementById('wandaListContainer').addEventListener('click', (e) => {
    const delInstBtn = e.target.closest('[data-delete-inst]');
    if (delInstBtn) {
      const instId = delInstBtn.getAttribute('data-delete-inst');
      const batchId = delInstBtn.getAttribute('data-batch-id');
      const batch = state.wandaBatches.find(b => b.id === batchId);
      if (batch && batch.installments) {
        batch.installments = batch.installments.filter(i => i.id !== instId);
        commit();
        showToast('Installment removed.');
      }
      return;
    }

    const delWandaBtn = e.target.closest('[data-delete-wanda]');
    if (delWandaBtn) {
      const batchId = delWandaBtn.getAttribute('data-delete-wanda');
      state.wandaBatches = state.wandaBatches.filter(b => b.id !== batchId);
      commit();
      showToast('Wanda stock record deleted.');
    }
  });

}
