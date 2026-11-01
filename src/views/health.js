import { addDays, escapeHtml, formatCurrency, formatDisplayDate } from '../lib/format.js';
import { commit, state } from '../state.js';
import { showToast } from '../ui/toast.js';

function updateHealthPreview() {
  const select = document.getElementById('healthType');
  const dateGiven = document.getElementById('healthDateGiven')?.value;
  const opt = select?.options[select.selectedIndex];
  const days = parseInt(opt?.getAttribute('data-days') || '90', 10);
  const previewEl = document.getElementById('healthNextDuePreview');
  if (previewEl) {
    previewEl.textContent = `${addDays(dateGiven, days)} (+${days} days)`;
  }
}

export function renderHealth() {
  const container = document.getElementById('healthListContainer');
  const emptyState = document.getElementById('healthEmptyState');
  if (!container || !emptyState) return;

  container.innerHTML = '';
  if (state.healthRecords.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  state.healthRecords.forEach(rec => {
    const nextDue = addDays(rec.dateGiven, Number(rec.intervalDays) || 90);
    const isDone = rec.status === 'Booster Completed';
    const badgeClass = isDone
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-teal-100 text-teal-900 border-teal-300';

    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(rec.type)}</h3>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}">${escapeHtml(rec.status || 'Scheduled Booster')}</span>
          </div>
          <p class="text-xs text-slate-600 mt-0.5">Group / Animal: <span class="font-semibold text-slate-800">${escapeHtml(rec.target)}</span></p>
        </div>
        <div class="card-actions">
          <select data-status-health="${rec.id}" aria-label="Update health booster status" class="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700">
            <option value="Scheduled Booster" ${!isDone ? 'selected' : ''}>Scheduled Booster</option>
            <option value="Booster Completed" ${isDone ? 'selected' : ''}>Booster Completed</option>
          </select>
          <button type="button" data-delete-health="${rec.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">
            Delete
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">Date Given</span>
          <span class="text-xs font-bold text-slate-800">${formatDisplayDate(rec.dateGiven)}</span>
        </div>
        <div class="bg-teal-50/80 p-2.5 rounded-lg border border-teal-200">
          <span class="block text-[10px] uppercase font-semibold text-teal-700">Next Repeat Due</span>
          <span class="text-xs font-bold text-teal-900">${nextDue}</span>
        </div>
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">Medicine &amp; Cost</span>
          <span class="text-xs font-semibold text-slate-700">${escapeHtml(rec.medicine || 'Standard')} (${formatCurrency(rec.cost || 0)})</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

export function initHealth() {
  // Health Preview & Listeners
  updateHealthPreview();
  ['healthType', 'healthDateGiven'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateHealthPreview);
    document.getElementById(id).addEventListener('input', updateHealthPreview);
  });

  document.getElementById('healthForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const target = document.getElementById('healthTarget').value.trim();
    const typeSelect = document.getElementById('healthType');
    const type = typeSelect.value;
    const opt = typeSelect.options[typeSelect.selectedIndex];
    const intervalDays = parseInt(opt?.getAttribute('data-days') || '90', 10);
    const dateGiven = document.getElementById('healthDateGiven').value;
    const medicine = document.getElementById('healthMedicine').value.trim();
    const cost = parseFloat(document.getElementById('healthCost').value) || 0;
    const syncExpense = document.getElementById('healthSyncExpense').checked;

    if (!target || !dateGiven) return;

    state.healthRecords.unshift({
      id: 'health-' + Date.now(),
      target,
      type,
      dateGiven,
      intervalDays,
      medicine,
      cost,
      status: 'Scheduled Booster'
    });

    if (syncExpense && cost > 0) {
      state.transactions.unshift({
        id: 'tx-' + Date.now(),
        type: 'expense',
        date: dateGiven,
        category: 'Vet & Medicine',
        amount: cost,
        note: `${type} for ${target} (${medicine || 'Vet treatment'})`
      });
    }

    commit();
    document.getElementById('healthTarget').value = '';
    document.getElementById('healthMedicine').value = '';
    document.getElementById('healthCost').value = '0';
    updateHealthPreview();
    showToast('Vaccination / health record saved!');
  });

  document.getElementById('healthListContainer').addEventListener('change', (e) => {
    const select = e.target.closest('[data-status-health]');
    if (!select) return;
    const id = select.getAttribute('data-status-health');
    const rec = state.healthRecords.find(h => h.id === id);
    if (rec) {
      rec.status = select.value;
      commit();
      showToast('Health status updated!');
    }
  });

  document.getElementById('healthListContainer').addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-delete-health]');
    if (!delBtn) return;
    const id = delBtn.getAttribute('data-delete-health');
    state.healthRecords = state.healthRecords.filter(h => h.id !== id);
    commit();
    showToast('Health record removed.');
  });

}
