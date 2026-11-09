import { escapeHtml, formatCurrency, formatDisplayDate } from '../lib/format.js';
import { buildProfile } from '../lib/animals.js';
import { commit, state } from '../state.js';
import { createEditor, EDIT_BTN_CLASS, setField } from '../ui/record-editor.js';
import { todayStr } from '../lib/dates.js';
import { initListSearch, matchesSearch, noMatchHtml, searchQuery } from '../ui/list-search.js';
import { showToast } from '../ui/toast.js';

function updateSaleProfitPreview() {
  const cost = parseFloat(document.getElementById('saleTotalCost')?.value) || 0;
  const price = parseFloat(document.getElementById('salePrice')?.value) || 0;
  const diff = price - cost;
  const previewEl = document.getElementById('saleProfitPreview');
  if (!previewEl) return;

  if (cost === 0 && price === 0) {
    previewEl.textContent = 'Rs. 0';
    previewEl.className = 'text-sm font-bold text-slate-700';
  } else if (diff >= 0) {
    previewEl.textContent = '+ ' + formatCurrency(diff) + ' Profit';
    previewEl.className = 'text-sm font-bold text-emerald-700';
  } else {
    previewEl.textContent = '- ' + formatCurrency(Math.abs(diff)) + ' Loss';
    previewEl.className = 'text-sm font-bold text-rose-600';
  }
}

let salesEditor = null;

/** "Sold with her calf?" box: lists the calves of the animal named in the form that are still in the herd. */
function refreshSaleCalves() {
  const box = document.getElementById('saleCalvesBox');
  const list = document.getElementById('saleCalvesList');
  if (!box || !list) return;
  const tag = document.getElementById('saleCowTag').value.trim();
  const calves = salesEditor && salesEditor.isEditing() || !tag
    ? []
    : buildProfile(tag, state).calves.filter((c) => c.inHerd && c.id);
  box.classList.toggle('hidden', calves.length === 0);
  list.innerHTML = calves.map((c) => `
    <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
      <input type="checkbox" data-calf-id="${escapeHtml(c.id)}" data-calf-tag="${escapeHtml(c.tag)}" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
      <span>Sell together with <strong>${escapeHtml(c.tag)}</strong>${c.stage ? ` <span class="text-slate-400">(${escapeHtml(c.stage)})</span>` : ''}</span>
    </label>`).join('');
}

function updateSaleQuickPickDropdown() {
  const select = document.getElementById('saleQuickPick');
  if (!select) return;
  const options = ['<option value="">-- Type manually below or select from herd --</option>'];
  state.milkersList.forEach(m => {
    options.push(`<option value="milker:${m.id}">${escapeHtml(m.tag)} — Milker (${escapeHtml(m.breed)})</option>`);
  });
  state.wachiList.forEach(w => {
    options.push(`<option value="wachi:${w.id}">${escapeHtml(w.tag)} — Wachi (${escapeHtml(w.breed)})</option>`);
  });
  state.goats.filter(g => g.status !== 'Sold' && g.status !== 'Died').forEach(g => {
    options.push(`<option value="goat:${g.id}">${escapeHtml(g.tag)} — ${escapeHtml(g.species)}${(g.count || 1) > 1 ? ' (' + g.count + ' animals)' : ''}</option>`);
  });
  state.horses.filter(h => h.status !== 'Sold' && h.status !== 'Died').forEach(h => {
    options.push(`<option value="horse:${h.id}">${escapeHtml(h.name)} — Horse${h.breed ? ' (' + escapeHtml(h.breed) + ')' : ''}</option>`);
  });
  select.innerHTML = options.join('');
}

export function renderSales() {
  updateSaleQuickPickDropdown();
  const container = document.getElementById('salesListContainer');
  const emptyState = document.getElementById('salesEmptyState');
  const costBanner = document.getElementById('salesTotalCostBanner');
  const revBanner = document.getElementById('salesTotalRevBanner');
  const profitBanner = document.getElementById('salesNetProfitBanner');
  if (!container || !emptyState) return;

  let totalCost = 0;
  let totalRev = 0;
  state.cattleSales.forEach(sc => {
    totalCost += Number(sc.totalCost) || 0;
    totalRev += Number(sc.salePrice) || 0;
  });
  const netProfit = totalRev - totalCost;

  if (costBanner) costBanner.textContent = formatCurrency(totalCost);
  if (revBanner) revBanner.textContent = formatCurrency(totalRev);
  if (profitBanner) {
    profitBanner.textContent = (netProfit >= 0 ? '+ ' : '- ') + formatCurrency(Math.abs(netProfit));
    profitBanner.className = 'text-xs sm:text-sm font-bold ' + (netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600');
  }

  container.innerHTML = '';
  if (state.cattleSales.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const query = searchQuery('salesSearch');
  const shown = state.cattleSales.filter((r) => matchesSearch(r, query));
  if (shown.length === 0) {
    container.innerHTML = noMatchHtml('salesSearch');
    return;
  }

  shown.forEach(sale => {
    const cost = Number(sale.totalCost) || 0;
    const price = Number(sale.salePrice) || 0;
    const profit = price - cost;
    const isProfit = profit >= 0;

    const profitBadge = isProfit
      ? `<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">+ ${formatCurrency(profit)} Profit</span>`
      : `<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">- ${formatCurrency(Math.abs(profit))} Loss</span>`;

    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(sale.cowTag)}</h3>
            ${profitBadge}
          </div>
          <p class="text-xs text-slate-600 mt-0.5">
            Sold To: <span class="font-semibold text-slate-900">${escapeHtml(sale.buyer)}</span> &bull; <span class="text-slate-500">${formatDisplayDate(sale.saleDate)}</span>
          </p>
          <p class="text-xs mt-0.5 ${sale.withCalves && sale.withCalves.length ? 'text-emerald-700 font-medium' : 'text-slate-400'}">${sale.withCalves && sale.withCalves.length ? 'Sold with calf: ' + sale.withCalves.map((c) => escapeHtml(c.tag)).join(', ') : 'Sold without calf'}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" data-open-profile="${escapeHtml(sale.cowTag)}" class="${EDIT_BTN_CLASS}">Profile</button>
          <button type="button" data-edit-sale="${sale.id}" class="${EDIT_BTN_CLASS}">Edit</button>
          <button type="button" data-delete-sale="${sale.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">Delete</button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">Total Cost Spent</span>
          <span class="text-xs sm:text-sm font-bold text-slate-700">${formatCurrency(cost)}</span>
        </div>
        <div class="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
          <span class="block text-[10px] uppercase font-semibold text-emerald-700">Sale Price</span>
          <span class="text-xs sm:text-sm font-bold text-emerald-900">${formatCurrency(price)}</span>
        </div>
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">Net Outcome</span>
          <span class="text-xs sm:text-sm font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-600'}">${isProfit ? '+ ' : '- '}${formatCurrency(Math.abs(profit))}</span>
        </div>
      </div>

      ${sale.notes ? `<p class="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200/60"><strong>Notes:</strong> ${escapeHtml(sale.notes)}</p>` : ''}
    `;
    container.appendChild(card);
  });
}

export function initSales() {
  initListSearch('salesSearch', renderSales);
  const editor = createEditor({
    sheetId: 'salesSheet', formId: 'salesForm', editTitle: 'Edit Sold Cow',
    addOnly: ['saleQuickPick', 'saleSyncCashbook', 'saleRemoveFromHerd'],
    onReset: () => { document.getElementById('saleDate').value = todayStr(); updateSaleProfitPreview(); refreshSaleCalves(); }
  });
  salesEditor = editor;
  document.getElementById('saleCowTag').addEventListener('input', refreshSaleCalves);
  // Sold Cows Form Listeners
  ['saleTotalCost', 'salePrice'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateSaleProfitPreview);
  });

  document.getElementById('saleQuickPick').addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    const [kind, id] = val.split(':');
    if (kind === 'milker') {
      const m = state.milkersList.find(item => item.id === id);
      if (m) {
        document.getElementById('saleCowTag').value = `${m.tag} (${m.breed})`;
      }
    } else if (kind === 'wachi') {
      const w = state.wachiList.find(item => item.id === id);
      if (w) {
        document.getElementById('saleCowTag').value = `${w.tag} (${w.breed}, ${w.ageMonths} mo)`;
      }
    } else if (kind === 'goat') {
      const g = state.goats.find(item => item.id === id);
      if (g) document.getElementById('saleCowTag').value = g.tag;
    } else if (kind === 'horse') {
      const hs = state.horses.find(item => item.id === id);
      if (hs) document.getElementById('saleCowTag').value = hs.name;
    }
    refreshSaleCalves();
  });

  document.getElementById('salesForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const quickPickVal = document.getElementById('saleQuickPick').value;
    const cowTag = document.getElementById('saleCowTag').value.trim();
    const saleDate = document.getElementById('saleDate').value;
    const buyer = document.getElementById('saleBuyer').value.trim();
    const totalCost = parseFloat(document.getElementById('saleTotalCost').value) || 0;
    const salePrice = parseFloat(document.getElementById('salePrice').value) || 0;
    const notes = document.getElementById('saleNotes').value.trim();
    const syncCashbook = document.getElementById('saleSyncCashbook').checked;
    const removeFromHerd = document.getElementById('saleRemoveFromHerd').checked;

    if (!cowTag || !saleDate || !buyer || salePrice <= 0) return;

    const existing = editor.find(state.cattleSales);
    if (existing) {
      Object.assign(existing, { cowTag, saleDate, buyer, totalCost, salePrice, notes });
      commit();
      showToast('Sale updated. Cashbook entries already made are unchanged.');
      return;
    }

    const withCalves = [...document.querySelectorAll('#saleCalvesList input[data-calf-id]:checked')]
      .map((i) => ({ id: i.getAttribute('data-calf-id'), tag: i.getAttribute('data-calf-tag') }));

    // Keep a snapshot of her herd details: her herd record is removed below, but her profile still needs them
    const herdRecord = quickPickVal ? (() => {
      const [kind, id] = quickPickVal.split(':');
      const list = { milker: state.milkersList, wachi: state.wachiList, goat: state.goats, horse: state.horses }[kind] || [];
      const r = list.find((x) => x.id === id);
      return r ? { kind, breed: r.breed, ageMonths: r.ageMonths ?? (r.ageYears ? r.ageYears * 12 : undefined), weightKg: r.weightKg, morningMilk: r.morningMilk, eveningMilk: r.eveningMilk, damTag: r.damTag } : null;
    })() : null;

    state.cattleSales.unshift({
      id: 'sale-' + Date.now(),
      cowTag,
      saleDate,
      buyer,
      totalCost,
      salePrice,
      notes,
      ...(withCalves.length ? { withCalves } : {}),
      ...(herdRecord ? { animal: herdRecord } : {})
    });

    if (syncCashbook) {
      const netProfit = salePrice - totalCost;
      const profitLabel = netProfit >= 0 ? `Profit: Rs. ${netProfit.toLocaleString('en-PK')}` : `Loss: Rs. ${Math.abs(netProfit).toLocaleString('en-PK')}`;
      state.transactions.unshift({
        id: 'tx-' + Date.now(),
        type: 'income',
        date: saleDate,
        category: 'Calf / Cattle Sale',
        amount: salePrice,
        note: `Sold ${cowTag}${withCalves.length ? ' with calf ' + withCalves.map((c) => c.tag).join(', ') : ''} to ${buyer} (Cost: Rs. ${totalCost.toLocaleString('en-PK')}, ${profitLabel})`
      });
    }

    if (removeFromHerd && withCalves.length) {
      const ids = new Set(withCalves.map((c) => c.id));
      state.wachiList = state.wachiList.filter((w) => !ids.has(w.id));
    }

    if (removeFromHerd && quickPickVal) {
      const [kind, id] = quickPickVal.split(':');
      if (kind === 'milker') {
        state.milkersList = state.milkersList.filter(m => m.id !== id);
      } else if (kind === 'wachi') {
        state.wachiList = state.wachiList.filter(w => w.id !== id);
      } else if (kind === 'goat' || kind === 'horse') {
        // a group of animals stays on the list (change its number by hand); a single animal is marked sold
        const rec = (kind === 'goat' ? state.goats : state.horses).find(x => x.id === id);
        if (rec && (rec.count || 1) <= 1) {
          rec.status = 'Sold';
          rec.salePrice = salePrice;
          if (!rec.cost && totalCost) rec.cost = totalCost;
        }
      }
    }

    commit();
    document.getElementById('saleQuickPick').value = '';
    document.getElementById('saleCowTag').value = '';
    document.getElementById('saleBuyer').value = '';
    document.getElementById('saleTotalCost').value = '';
    document.getElementById('salePrice').value = '';
    document.getElementById('saleNotes').value = '';
    updateSaleProfitPreview();
    refreshSaleCalves();
    showToast(withCalves.length ? 'Sold with calf. Record saved!' : 'Sold cow record saved!');
  });

  document.getElementById('salesListContainer').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-sale]');
    if (editBtn) {
      const sale = state.cattleSales.find(x => x.id === editBtn.getAttribute('data-edit-sale'));
      if (sale) {
        editor.begin(sale.id, () => {
          setField('saleCowTag', sale.cowTag); setField('saleDate', sale.saleDate); setField('saleBuyer', sale.buyer);
          setField('saleTotalCost', sale.totalCost); setField('salePrice', sale.salePrice); setField('saleNotes', sale.notes);
          updateSaleProfitPreview();
        });
      }
      return;
    }
    const delBtn = e.target.closest('[data-delete-sale]');
    if (!delBtn) return;
    const id = delBtn.getAttribute('data-delete-sale');
    state.cattleSales = state.cattleSales.filter(sc => sc.id !== id);
    commit();
    showToast('Sold cow record removed.');
  });

}
