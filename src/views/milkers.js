import { formatLiters } from '../lib/calc.js';
import { escapeHtml, formatCurrency } from '../lib/format.js';
import { normalizeSpecies, speciesEmoji } from '../lib/species.js';
import { markHtml, markOf, defaultMark } from '../lib/marks.js';
import { createMarkPicker } from '../ui/mark-picker.js';
import { milkerToWachi } from '../lib/convert.js';
import { commit, state } from '../state.js';
import { createEditor, EDIT_BTN_CLASS, setField } from '../ui/record-editor.js';
import { initListSearch, matchesSearch, noMatchHtml, searchQuery } from '../ui/list-search.js';
import { switchTab } from '../ui/tabs.js';
import { showToast } from '../ui/toast.js';

function updateMilkerFormPreview() {
  const m = parseFloat(document.getElementById('milkerMorning').value) || 0;
  const e = parseFloat(document.getElementById('milkerEvening').value) || 0;
  const total = formatLiters(m + e);
  document.getElementById('milkerTotalPreview').textContent = total + ' Liters / day';
}

export function renderMilkers() {
  const container = document.getElementById('milkersListContainer');
  const emptyState = document.getElementById('milkersEmptyState');
  const totalBanner = document.getElementById('farmTotalMilkBanner');

  const totalMorning = state.milkersList.reduce((sum, m) => sum + (Number(m.morningMilk) || 0), 0);
  const totalEvening = state.milkersList.reduce((sum, m) => sum + (Number(m.eveningMilk) || 0), 0);
  const numericGrandTotal = totalMorning + totalEvening;
  const grandTotal = formatLiters(numericGrandTotal);
  totalBanner.textContent = `${grandTotal} L / day (${formatLiters(totalMorning)} AM + ${formatLiters(totalEvening)} PM)`;

  const milkSaleInput = document.getElementById('milkSaleLiters');
  if (milkSaleInput && numericGrandTotal > 0) {
    milkSaleInput.value = grandTotal;
  }
  updateQuickMilkCalculator();

  container.innerHTML = '';
  if (state.milkersList.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const query = searchQuery('milkersSearch');
  const shown = state.milkersList.filter((r) => matchesSearch(r, query));
  if (shown.length === 0) {
    container.innerHTML = noMatchHtml('milkersSearch');
    return;
  }

  shown.forEach(cow => {
    const am = Number(cow.morningMilk) || 0;
    const pm = Number(cow.eveningMilk) || 0;
    const dailyTotal = formatLiters(am + pm);

    let badgeStyle = 'bg-sky-100 text-sky-800 border-sky-200';
    if (cow.status === 'Peak / High Yield') {
      badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    } else if (cow.status === 'Late Lactation (Near Dry)') {
      badgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';
    }

    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            ${markHtml(markOf(cow))}
            <h3 class="animal-title"><span aria-hidden="true">${speciesEmoji(cow.species)}</span> ${escapeHtml(cow.tag)}</h3>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeStyle}">${escapeHtml(cow.status)}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(cow.breed)}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" data-open-profile="${escapeHtml(cow.tag)}" class="${EDIT_BTN_CLASS}">Profile</button>
          <button type="button" data-edit-milker-form="${cow.id}" class="${EDIT_BTN_CLASS}">Edit</button>
          <button type="button" data-to-wachi="${cow.id}" class="${EDIT_BTN_CLASS}">Move to Wachi</button>
          <button type="button" data-delete-milker="${cow.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">Delete</button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <label class="block text-[10px] uppercase font-semibold text-slate-400">Morning (AM)</label>
          <div class="flex items-center gap-1 mt-0.5">
            <input type="number" min="0" step="0.5" value="${am}" data-edit-milker="${cow.id}" data-field="morningMilk" aria-label="Morning Milk Liters" class="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-xs font-bold text-slate-800" />
            <span class="text-xs text-slate-500">L</span>
          </div>
        </div>
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <label class="block text-[10px] uppercase font-semibold text-slate-400">Evening (PM)</label>
          <div class="flex items-center gap-1 mt-0.5">
            <input type="number" min="0" step="0.5" value="${pm}" data-edit-milker="${cow.id}" data-field="eveningMilk" aria-label="Evening Milk Liters" class="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-xs font-bold text-slate-800" />
            <span class="text-xs text-slate-500">L</span>
          </div>
        </div>
        <div class="bg-sky-50/80 p-2.5 rounded-lg border border-sky-200">
          <span class="block text-[10px] uppercase font-semibold text-sky-700">Daily Total</span>
          <span class="text-sm font-bold text-sky-900">${dailyTotal} L/day</span>
        </div>
      </div>

      ${cow.notes ? `<p class="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200/60"><strong>Feed / Notes:</strong> ${escapeHtml(cow.notes)}</p>` : ''}
    `;
    container.appendChild(card);
  });
}

function updateQuickMilkCalculator() {
  const herdLiters = parseFloat(document.getElementById('milkSaleLiters')?.value) || 0;
  const homeUse = parseFloat(document.getElementById('milkHomeUse')?.value) || 0;
  const rate = parseFloat(document.getElementById('milkRatePerLiter')?.value) || 0;
  const netSold = Math.max(0, herdLiters - homeUse);
  const totalRev = Math.round(netSold * rate);

  const previewEl = document.getElementById('quickMilkRevenuePreview');
  const formulaEl = document.getElementById('quickMilkFormulaText');
  if (previewEl) previewEl.textContent = formatCurrency(totalRev);
  if (formulaEl) {
    const netStr = formatLiters(netSold);
    formulaEl.textContent = `Net Sold: ${netStr} L × Rs. ${rate}/L = ${formatCurrency(totalRev)}`;
  }
}

export function initMilkers() {
  const markPicker = createMarkPicker(document.getElementById('milkerMarkPicker'));
  initListSearch('milkersSearch', renderMilkers);
  const editor = createEditor({
    sheetId: 'milkersSheet', formId: 'milkerForm', editTitle: 'Edit Milking Cow',
    onReset: () => { markPicker.set(null); updateMilkerFormPreview(); }
  });
  const startEdit = (cow) => editor.begin(cow.id, () => {
    setField('milkerTag', cow.tag); setField('milkerSpecies', normalizeSpecies(cow.species)); setField('milkerBreed', cow.breed);
    setField('milkerMorning', cow.morningMilk); setField('milkerEvening', cow.eveningMilk);
    setField('milkerStatus', cow.status); setField('milkerNotes', cow.notes);
    markPicker.set(cow.mark || null);
    updateMilkerFormPreview();
  });
  document.addEventListener('animal-edit', (e) => {
    if (e.detail.kind !== 'milker') return;
    const cow = state.milkersList.find((m) => m.id === e.detail.id);
    if (cow) startEdit(cow);
  });

  // Live Milker Form Yield Preview
  ['milkerMorning', 'milkerEvening'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateMilkerFormPreview);
  });

  // Live Quick Milk Sale Calculator Preview & Submit
  ['milkSaleLiters', 'milkHomeUse', 'milkRatePerLiter'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateQuickMilkCalculator);
  });

  document.getElementById('quickMilkSaleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const saleDate = document.getElementById('milkSaleDate').value;
    const herdLiters = parseFloat(document.getElementById('milkSaleLiters').value) || 0;
    const homeUse = parseFloat(document.getElementById('milkHomeUse').value) || 0;
    const rate = parseFloat(document.getElementById('milkRatePerLiter').value) || 0;
    const netSold = Math.max(0, herdLiters - homeUse);
    const totalAmount = Math.round(netSold * rate);

    if (!saleDate || netSold <= 0 || totalAmount <= 0) return;

    const netStr = formatLiters(netSold);
    state.transactions.unshift({
      id: 'tx-' + Date.now(),
      type: 'income',
      date: saleDate,
      category: 'Milk Sale',
      amount: totalAmount,
      note: `Daily herd milk sale: ${netStr} L sold @ Rs. ${rate}/L (${homeUse} L home/calf use)`
    });

    commit();
    showToast('Daily milk sale logged to Cashbook!');
  });

  // Add New Milker (Milking Cow)
  document.getElementById('milkerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const tag = document.getElementById('milkerTag').value.trim();
    const breed = document.getElementById('milkerBreed').value.trim();
    const morningMilk = parseFloat(document.getElementById('milkerMorning').value) || 0;
    const eveningMilk = parseFloat(document.getElementById('milkerEvening').value) || 0;
    const status = document.getElementById('milkerStatus').value;
    const species = normalizeSpecies(document.getElementById('milkerSpecies').value);
    const notes = document.getElementById('milkerNotes').value.trim();

    if (!tag || !breed) return;

    const existing = editor.find(state.milkersList);
    if (existing) {
      Object.assign(existing, { tag, species, breed, morningMilk, eveningMilk, status, notes, mark: markPicker.get() || existing.mark || defaultMark(tag) });
      commit();
      showToast('Milking cow updated!');
      return;
    }

    state.milkersList.unshift({
      id: 'milker-' + Date.now(),
      tag,
      species,
      mark: markPicker.get() || defaultMark(tag),
      breed,
      morningMilk,
      eveningMilk,
      status,
      notes
    });

    commit();
    markPicker.set(null);
    document.getElementById('milkerTag').value = '';
    document.getElementById('milkerBreed').value = '';
    document.getElementById('milkerMorning').value = '';
    document.getElementById('milkerEvening').value = '';
    document.getElementById('milkerNotes').value = '';
    updateMilkerFormPreview();
    showToast('Milking cow added to herd!');
  });

  // Inline Edit or Delete Milker
  document.getElementById('milkersListContainer').addEventListener('change', (e) => {
    const input = e.target.closest('[data-edit-milker]');
    if (!input) return;
    const id = input.getAttribute('data-edit-milker');
    const field = input.getAttribute('data-field');
    const cow = state.milkersList.find(m => m.id === id);
    if (cow && (field === 'morningMilk' || field === 'eveningMilk')) {
      cow[field] = Math.max(0, parseFloat(input.value) || 0);
      commit();
      showToast('Daily milk yield updated!');
    }
  });

  document.getElementById('milkersListContainer').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-milker-form]');
    if (editBtn) {
      const cow = state.milkersList.find(m => m.id === editBtn.getAttribute('data-edit-milker-form'));
      if (cow) startEdit(cow);
      return;
    }
    const moveBtn = e.target.closest('[data-to-wachi]');
    if (moveBtn) {
      const cow = state.milkersList.find((x) => x.id === moveBtn.getAttribute('data-to-wachi'));
      if (!cow) return;
      const w = milkerToWachi(state, cow.id);
      commit();
      showToast('Moved to Wachi!');
      if (w) { switchTab('wachi'); document.dispatchEvent(new CustomEvent('animal-edit', { detail: { kind: 'wachi', id: w.id } })); }
      return;
    }

    const delBtn = e.target.closest('[data-delete-milker]');
    if (!delBtn) return;
    const id = delBtn.getAttribute('data-delete-milker');
    state.milkersList = state.milkersList.filter(m => m.id !== id);
    commit();
    showToast('Milker removed.');
  });

}
