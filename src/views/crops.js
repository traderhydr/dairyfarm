import {
  COST_CATEGORIES, YIELD_UNITS, areaAcres, cropDisplayName, cropTotals, cropsSummary, seedNeededKg
} from '../lib/crops.js';
import { todayStr } from '../lib/dates.js';
import { escapeHtml, formatCurrency, formatDisplayDate } from '../lib/format.js';
import { commit, state } from '../state.js';
import { initListSearch, matchesSearch, noMatchHtml, searchQuery } from '../ui/list-search.js';
import { openConfirmModal } from '../ui/modal.js';
import { createEditor, EDIT_BTN_CLASS, setField } from '../ui/record-editor.js';
import { closeSheets, openSheet } from '../ui/sheets.js';
import { showToast } from '../ui/toast.js';

const $ = (id) => document.getElementById(id);
let editor = null;
let openId = null;          // crop shown in the details sheet
let editingLineId = null;   // cost line being edited in the details sheet

const signed = (n) => (n < 0 ? '- ' : '') + formatCurrency(Math.abs(n));
const stateOf = (net, has) => (!has ? 'none' : net > 0 ? 'profit' : net < 0 ? 'loss' : 'even');
const landLabel = (c) => {
  const land = c.landId && state.lands.find((l) => l.id === c.landId);
  return land ? land.name : c.landName || '';
};
const defaultSeason = () => (new Date().getMonth() >= 9 || new Date().getMonth() <= 3 ? 'Rabi (Winter)' : 'Kharif (Summer)');
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// ---------------------------------------------------------------- list and summary

export function renderCrops() {
  // land choices and year filter
  const landSel = $('cropLand');
  const keep = landSel.value;
  landSel.innerHTML = '<option value="">Other / not listed</option>' + state.lands.map((l) => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`).join('');
  landSel.value = state.lands.some((l) => l.id === keep) ? keep : '';

  const years = [...new Set(state.crops.map((c) => c.year).filter(Boolean))].sort((a, b) => b - a);
  const yearSel = $('cropsYearFilter');
  const yearKeep = yearSel.value || 'all';
  yearSel.innerHTML = '<option value="all">All Years</option>' + years.map((y) => `<option value="${y}">${y}</option>`).join('');
  yearSel.value = years.map(String).includes(yearKeep) ? yearKeep : 'all';

  const inYear = state.crops.filter((c) => yearSel.value === 'all' || String(c.year) === yearSel.value);

  // summary card
  const sum = cropsSummary(inYear);
  const st = stateOf(sum.net, inYear.length > 0);
  $('cropsHero').setAttribute('data-state', st);
  $('cropsHeroLabel').textContent = st === 'loss' ? 'Loss' : st === 'profit' ? 'Profit' : 'Profit / Loss';
  $('cropsHeroNet').textContent = inYear.length ? signed(sum.net) : 'Rs. 0';
  $('cropsHeroSub').textContent = inYear.length ? `${sum.count} ${sum.count === 1 ? 'crop' : 'crops'} · ${Math.round(sum.acres * 10) / 10} acres` : 'No crops yet';
  $('cropsCost').textContent = formatCurrency(sum.cost);
  $('cropsIncome').textContent = formatCurrency(sum.income);
  $('cropsByCrop').innerHTML = sum.byCrop.length
    ? sum.byCrop.map((r) => `
      <div class="flex items-center justify-between gap-3 py-2 text-xs">
        <div class="min-w-0"><p class="font-semibold text-slate-800">${escapeHtml(r.name)}</p><p class="text-slate-500">Cost ${formatCurrency(r.cost)} &middot; Income ${formatCurrency(r.income)}</p></div>
        <p class="font-bold whitespace-nowrap ${r.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}">${signed(r.net)}</p>
      </div>`).join('')
    : '<p class="text-xs text-slate-400 italic py-2">No crops yet.</p>';

  // list
  const container = $('cropsListContainer');
  container.innerHTML = '';
  $('cropsEmptyState').classList.toggle('hidden', state.crops.length > 0);
  if (state.crops.length === 0) return;
  const query = searchQuery('cropsSearch');
  const shown = inYear.filter((c) => matchesSearch([c, landLabel(c)], query));
  if (shown.length === 0) { container.innerHTML = noMatchHtml('cropsSearch'); return; }

  shown.forEach((c) => {
    const t = cropTotals(c);
    const s = stateOf(t.net, t.cost > 0 || t.income > 0);
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(cropDisplayName(c))}</h3>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${c.status === 'Harvested' ? 'bg-sky-100 text-sky-800 border-sky-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}">${escapeHtml(c.status || 'Growing')}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(c.season || '')} ${escapeHtml(String(c.year || ''))} &bull; ${escapeHtml(String(c.area))} ${escapeHtml(c.areaUnit || '')}${landLabel(c) ? ' &bull; ' + escapeHtml(landLabel(c)) : ''}${c.ownership === 'Theeka' ? ' &bull; Theeka' : ''}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" data-open-crop="${c.id}" class="${EDIT_BTN_CLASS}">Details</button>
          <button type="button" data-edit-crop="${c.id}" class="${EDIT_BTN_CLASS}">Edit</button>
          <button type="button" data-delete-crop="${c.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">Delete</button>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80"><span class="block text-[10px] uppercase font-semibold text-slate-400">Total Cost</span><span class="text-xs font-bold text-slate-800">${formatCurrency(t.cost)}</span></div>
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80"><span class="block text-[10px] uppercase font-semibold text-slate-400">Income</span><span class="text-xs font-bold text-slate-800">${formatCurrency(t.income)}</span></div>
        <div class="crop-result p-2.5 rounded-lg border" data-state="${s}"><span class="block text-[10px] uppercase font-semibold">${s === 'loss' ? 'Loss' : s === 'profit' ? 'Profit' : 'Profit / Loss'}</span><span class="text-xs font-bold">${s === 'none' ? '—' : signed(t.net)}</span></div>
      </div>`;
    container.appendChild(card);
  });
}

// ---------------------------------------------------------------- details sheet

const row = (left, right, extra = '') => `
  <div class="flex items-start justify-between gap-3 py-2 text-xs">
    <div class="min-w-0"><p class="font-semibold text-slate-800">${left}</p>${extra ? `<p class="text-slate-500 mt-0.5">${extra}</p>` : ''}</div>
    <div class="text-right shrink-0">${right}</div>
  </div>`;
const section = (title, body, empty) => `
  <section class="space-y-1">
    <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">${title}</h3>
    <div class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-3">${body || `<p class="py-3 text-xs text-slate-400 italic">${empty}</p>`}</div>
  </section>`;
const INPUT = 'w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500';

function detailHtml(c) {
  const t = cropTotals(c);
  const s = stateOf(t.net, t.cost > 0 || t.income > 0);
  const line = editingLineId && (c.costs || []).find((l) => l.id === editingLineId);
  const facts = [
    ['Land', escapeHtml(landLabel(c) || '—') + (c.ownership === 'Theeka' ? ' (Theeka)' : ' (Own)')],
    ['Area', `${escapeHtml(String(c.area))} ${escapeHtml(c.areaUnit || '')}${c.areaUnit === 'Acre' ? '' : ' (' + Math.round(t.acres * 100) / 100 + ' acres)'}`],
    c.seedVariety ? ['Seed', escapeHtml(c.seedVariety)] : null,
    c.seedRate ? ['Seed rate', `${escapeHtml(String(c.seedRate))} kg/acre · ${seedNeededKg(c.seedRate, c.area, c.areaUnit)} kg needed`] : null,
    c.water ? ['Water', escapeHtml(c.water) + (c.irrigations ? ` · ${escapeHtml(String(c.irrigations))} irrigations` : '')] : null,
    c.sowingDate ? ['Sown', formatDisplayDate(c.sowingDate)] : null,
    t.costPerAcre !== null ? ['Cost per acre', formatCurrency(Math.round(t.costPerAcre))] : null,
    t.netPerAcre !== null && t.hasHarvest ? [t.netPerAcre >= 0 ? 'Profit per acre' : 'Loss per acre', formatCurrency(Math.abs(Math.round(t.netPerAcre)))] : null,
    Object.keys(t.yields).length ? ['Total yield', Object.entries(t.yields).map(([u, q]) => `${q} ${escapeHtml(u)}`).join(', ')] : null
  ].filter(Boolean);

  const breakdown = COST_CATEGORIES.filter((k) => t.byCategory[k]).map((k) => {
    const pct = t.cost > 0 ? Math.round((t.byCategory[k] / t.cost) * 100) : 0;
    return `
      <div class="space-y-1 py-2">
        <div class="flex justify-between text-xs"><span class="font-medium text-slate-700">${escapeHtml(k)}</span><span class="font-semibold text-slate-900">${formatCurrency(t.byCategory[k])} <span class="text-slate-400 font-normal">(${pct}%)</span></span></div>
        <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-rose-500 rounded-full" style="width: ${pct}%"></div></div>
      </div>`;
  }).join('');

  const lines = (c.costs || []).map((l) => row(
    `${escapeHtml(l.category)}${l.label ? ' · ' + escapeHtml(l.label) : ''}`,
    `<span class="font-bold text-slate-900">${formatCurrency(l.amount)}</span>
     <span class="block mt-0.5"><button type="button" data-edit-line="${l.id}" class="${EDIT_BTN_CLASS}">Edit</button><button type="button" data-del-line="${l.id}" class="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50">Remove</button></span>`,
    l.date ? formatDisplayDate(l.date) : ''
  )).join('');

  const harvests = (c.harvests || []).map((h) => row(
    `${h.qty ? escapeHtml(String(h.qty)) + ' ' + escapeHtml(h.unit || '') : 'Harvest'}${h.note ? ' · ' + escapeHtml(h.note) : ''}`,
    `<span class="font-bold text-emerald-700">+ ${formatCurrency(h.income)}</span>
     <span class="block mt-0.5"><button type="button" data-del-harvest="${h.id}" class="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50">Remove</button></span>`,
    h.date ? formatDisplayDate(h.date) : ''
  )).join('');

  const catOptions = COST_CATEGORIES.map((k) => `<option value="${escapeHtml(k)}" ${line && line.category === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('');
  const unitOptions = YIELD_UNITS.map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');

  return `
    <div class="pr-16 space-y-1.5" data-crop-id="${c.id}">
      <h2 id="cropDetailTitle" class="text-lg font-bold text-slate-900">${escapeHtml(cropDisplayName(c))}</h2>
      <p class="text-xs text-slate-500">${escapeHtml(c.season || '')} ${escapeHtml(String(c.year || ''))} &middot; ${escapeHtml(c.status || 'Growing')}</p>
    </div>
    <div class="rounded-xl border p-3 flex items-center justify-between gap-3" id="cropDetailHero" data-state="${s}">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wider">${s === 'loss' ? 'Loss' : s === 'profit' ? 'Profit' : 'Profit / Loss'}</p>
        <p class="text-2xl font-extrabold mt-0.5">${s === 'none' ? 'Rs. 0' : signed(t.net)}</p>
      </div>
      <p class="text-xs font-semibold text-right">${t.margin === null ? (t.cost > 0 ? 'No income yet' : '') : (t.margin >= 0 ? '+' : '') + t.margin + '% margin'}</p>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="ledger-stat"><p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Cost</p><p class="text-base font-extrabold text-rose-600 mt-1">${formatCurrency(t.cost)}</p></div>
      <div class="ledger-stat"><p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Income</p><p class="text-base font-extrabold text-emerald-600 mt-1">${formatCurrency(t.income)}</p></div>
    </div>
    <dl class="grid grid-cols-2 gap-2">${facts.map(([k, v]) => `
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5"><dt class="text-[10px] uppercase font-semibold text-slate-400">${k}</dt><dd class="text-xs font-bold text-slate-800 mt-0.5">${v}</dd></div>`).join('')}</dl>
    ${c.notes ? `<p class="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60"><strong>Notes:</strong> ${escapeHtml(c.notes)}</p>` : ''}

    ${breakdown ? section('Where the money went', breakdown, '') : ''}
    ${section(`Cost lines (${(c.costs || []).length})`, lines, 'No costs recorded yet.')}
    <form data-cost-form class="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
      <p class="text-xs font-semibold text-slate-700">${line ? 'Edit cost line' : 'Add a cost'}</p>
      <div class="grid grid-cols-2 gap-2">
        <select name="category" aria-label="Cost category" class="${INPUT}">${catOptions}</select>
        <input name="amount" type="number" min="0" step="any" required placeholder="Amount (Rs.)" aria-label="Amount" value="${line ? escapeHtml(String(line.amount)) : ''}" class="${INPUT}" />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <input name="label" type="text" maxlength="80" placeholder="Details (e.g. 2 bags urea)" aria-label="Details" value="${line ? escapeHtml(line.label || '') : ''}" class="${INPUT}" />
        <input name="date" type="date" aria-label="Date" value="${escapeHtml(line && line.date ? line.date : todayStr())}" class="${INPUT}" />
      </div>
      <div class="flex gap-2">
        <button type="submit" class="btn-primary text-xs flex-1">${line ? 'Save Change' : '+ Add Cost'}</button>
        ${line ? '<button type="button" data-cancel-line class="btn-secondary text-xs px-3">Cancel</button>' : ''}
      </div>
    </form>

    ${section(`Harvests / yield (${(c.harvests || []).length})`, harvests, 'No harvest recorded yet. Add each cutting or the final yield.')}
    <form data-harvest-form class="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
      <p class="text-xs font-semibold text-slate-700">Add a harvest</p>
      <div class="grid grid-cols-2 gap-2">
        <input name="qty" type="number" min="0" step="any" placeholder="Quantity" aria-label="Quantity" class="${INPUT}" />
        <select name="unit" aria-label="Unit" class="${INPUT}">${unitOptions}</select>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <input name="income" type="number" min="0" step="any" placeholder="Income (Rs.)" aria-label="Income" class="${INPUT}" />
        <input name="date" type="date" aria-label="Date" value="${todayStr()}" class="${INPUT}" />
      </div>
      <input name="note" type="text" maxlength="80" placeholder="Note (e.g. 2nd cutting, sold at mandi)" aria-label="Note" class="${INPUT}" />
      <button type="submit" class="btn-primary text-xs w-full">+ Add Harvest</button>
    </form>

    <div class="grid grid-cols-2 gap-2 pt-1">
      <button type="button" data-crop-action="status" class="btn-secondary text-xs py-2.5">${c.status === 'Harvested' ? 'Mark as Growing' : 'Mark as Harvested'}</button>
      <button type="button" data-crop-action="edit" class="btn-secondary text-xs py-2.5">Edit crop</button>
    </div>`;
}

function renderDetail() {
  const c = state.crops.find((x) => x.id === openId);
  if (!c) { closeSheets(); return; }
  const panel = $('cropDetailSheet').querySelector('.sheet-panel');
  const top = panel.scrollTop;
  $('cropDetailBody').innerHTML = detailHtml(c);
  panel.scrollTop = top;
}

export function openCrop(id) {
  openId = id;
  editingLineId = null;
  renderDetail();
  openSheet('cropDetailSheet');
}

function mutate(fn) {
  const c = state.crops.find((x) => x.id === openId);
  if (!c) return;
  fn(c);
  commit('local-keep');
  renderDetail();
}

// ---------------------------------------------------------------- add / edit form

function toggleOther() {
  $('cropOtherWrap').classList.toggle('hidden', $('cropName').value !== 'Other');
}
function updateSeedNeeded() {
  const kg = seedNeededKg($('cropSeedRate').value, $('cropArea').value, $('cropUnit').value);
  const el = $('cropSeedNeeded');
  el.classList.toggle('hidden', !(kg > 0));
  el.textContent = kg > 0 ? `Seed needed: about ${kg} kg for this area.` : '';
}
function resetDefaults() {
  $('cropYear').value = new Date().getFullYear();
  $('cropSeason').value = defaultSeason();
  toggleOther();
  updateSeedNeeded();
}

function startEdit(c) {
  editor.begin(c.id, () => {
    setField('cropName', c.crop); setField('cropOther', c.cropOther); setField('cropSeason', c.season); setField('cropYear', c.year);
    setField('cropLand', c.landId || ''); setField('cropLandName', c.landName); setField('cropArea', c.area); setField('cropUnit', c.areaUnit || 'Acre');
    setField('cropOwnership', c.ownership || 'Own'); setField('cropSowing', c.sowingDate);
    setField('cropSeedVariety', c.seedVariety); setField('cropSeedRate', c.seedRate);
    setField('cropWater', c.water); setField('cropIrrigations', c.irrigations); setField('cropNotes', c.notes);
    toggleOther();
    updateSeedNeeded();
  });
}

export function initCrops() {
  editor = createEditor({ sheetId: 'cropsSheet', formId: 'cropForm', editTitle: 'Edit Crop', addOnly: ['cropInitialBox'], onReset: resetDefaults });
  resetDefaults();
  initListSearch('cropsSearch', renderCrops);
  $('cropsYearFilter').addEventListener('change', renderCrops);
  $('cropName').addEventListener('change', toggleOther);
  ['cropSeedRate', 'cropArea'].forEach((id) => $(id).addEventListener('input', updateSeedNeeded));
  $('cropUnit').addEventListener('change', updateSeedNeeded);

  // choosing one of your lands fills in its area, unit and ownership
  $('cropLand').addEventListener('change', () => {
    const land = state.lands.find((l) => l.id === $('cropLand').value);
    if (!land) return;
    $('cropArea').value = land.area;
    $('cropUnit').value = land.unit || 'Acre';
    $('cropOwnership').value = land.ownership || 'Own';
    if (land.water) $('cropWater').value = land.water;
    if (land.ownership === 'Theeka' && land.theeka && !$('cRent').value) $('cRent').value = land.theeka;
    updateSeedNeeded();
  });

  $('cropForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const num = (id) => { const v = parseFloat($(id).value); return Number.isFinite(v) && v > 0 ? v : 0; };
    const area = parseFloat($('cropArea').value);
    const year = parseInt($('cropYear').value, 10);
    if (!(area > 0) || !year) return;
    const crop = $('cropName').value;
    const cropOther = $('cropOther').value.trim();
    if (crop === 'Other' && !cropOther) { $('cropOther').focus(); return; }
    const rec = {
      crop, cropOther: crop === 'Other' ? cropOther : '',
      season: $('cropSeason').value, year,
      landId: $('cropLand').value || undefined, landName: $('cropLand').value ? '' : $('cropLandName').value.trim(),
      area, areaUnit: $('cropUnit').value, ownership: $('cropOwnership').value, sowingDate: $('cropSowing').value,
      seedVariety: $('cropSeedVariety').value.trim(), seedRate: num('cropSeedRate'),
      water: $('cropWater').value, irrigations: num('cropIrrigations'), notes: $('cropNotes').value.trim()
    };
    if (!rec.landId) delete rec.landId;

    const existing = editor.find(state.crops);
    if (existing) {
      Object.assign(existing, rec);
      if (!rec.landId) delete existing.landId;
      commit();
      showToast('Crop updated!');
      return;
    }

    const date = rec.sowingDate || todayStr();
    const costs = [];
    const add = (category, id, label = '') => { const amount = num(id); if (amount > 0) costs.push({ id: uid('cost'), category, label, amount, date }); };
    add('Land Rent (Theeka)', 'cRent', rec.ownership === 'Theeka' ? 'Theeka' : '');
    add('Land Preparation', 'cPrep', $('cPrepNote').value.trim());
    add('Seed', 'cSeed', rec.seedVariety);
    add('Water / Irrigation', 'cWater', rec.water);
    add('Fertiliser', 'cFert', $('cFertNote').value.trim());
    add('Labour', 'cLabour');
    add('Pesticide / Spray', 'cSpray');
    add('Other', 'cOther');
    const harvests = [];
    if (num('cYieldQty') > 0 || num('cIncome') > 0) {
      harvests.push({ id: uid('harvest'), date: todayStr(), qty: num('cYieldQty'), unit: $('cYieldUnit').value, income: num('cIncome'), note: '' });
    }
    state.crops.unshift({ id: 'crop-' + Date.now(), ...rec, status: harvests.length ? 'Harvested' : 'Growing', costs, harvests });
    commit();
    ['cropOther', 'cropLandName', 'cropArea', 'cropSowing', 'cropSeedVariety', 'cropSeedRate', 'cropIrrigations', 'cropNotes',
      'cRent', 'cPrep', 'cPrepNote', 'cSeed', 'cWater', 'cFert', 'cFertNote', 'cLabour', 'cSpray', 'cOther', 'cYieldQty', 'cIncome'].forEach((id) => { $(id).value = ''; });
    updateSeedNeeded();
    showToast('Crop saved!');
  });

  // list buttons
  $('cropsListContainer').addEventListener('click', (e) => {
    const open = e.target.closest('[data-open-crop]');
    if (open) { openCrop(open.getAttribute('data-open-crop')); return; }
    const edit = e.target.closest('[data-edit-crop]');
    if (edit) {
      const c = state.crops.find((x) => x.id === edit.getAttribute('data-edit-crop'));
      if (c) startEdit(c);
      return;
    }
    const del = e.target.closest('[data-delete-crop]');
    if (!del) return;
    const id = del.getAttribute('data-delete-crop');
    const c = state.crops.find((x) => x.id === id);
    if (!c) return;
    openConfirmModal(`Delete ${cropDisplayName(c)}?`, 'Its costs and harvests are deleted with it.', () => {
      state.crops = state.crops.filter((x) => x.id !== id);
      commit();
      showToast('Crop removed.');
    });
  });

  // details sheet: cost lines, harvests, status
  const body = $('cropDetailBody');
  body.addEventListener('submit', (e) => {
    const costForm = e.target.closest('[data-cost-form]');
    const harvestForm = e.target.closest('[data-harvest-form]');
    if (!costForm && !harvestForm) return;
    e.preventDefault();
    const f = (e.target.closest('form')).elements;
    if (costForm) {
      const amount = parseFloat(f.amount.value);
      if (!(amount > 0)) return;
      const data = { category: f.category.value, label: f.label.value.trim(), amount, date: f.date.value };
      mutate((c) => {
        c.costs = c.costs || [];
        const line = editingLineId && c.costs.find((l) => l.id === editingLineId);
        if (line) Object.assign(line, data); else c.costs.push({ id: uid('cost'), ...data });
        editingLineId = null;
      });
      showToast('Cost saved.');
    } else {
      const qty = parseFloat(f.qty.value) || 0;
      const income = parseFloat(f.income.value) || 0;
      if (qty <= 0 && income <= 0) return;
      mutate((c) => {
        c.harvests = c.harvests || [];
        c.harvests.push({ id: uid('harvest'), date: f.date.value, qty, unit: f.unit.value, income, note: f.note.value.trim() });
        if (c.status !== 'Harvested') c.status = 'Harvested';
      });
      showToast('Harvest added.');
    }
  });
  body.addEventListener('click', (e) => {
    const editLine = e.target.closest('[data-edit-line]');
    if (editLine) { editingLineId = editLine.getAttribute('data-edit-line'); renderDetail(); return; }
    if (e.target.closest('[data-cancel-line]')) { editingLineId = null; renderDetail(); return; }
    const delLine = e.target.closest('[data-del-line]');
    if (delLine) {
      mutate((c) => { c.costs = (c.costs || []).filter((l) => l.id !== delLine.getAttribute('data-del-line')); });
      return;
    }
    const delHarvest = e.target.closest('[data-del-harvest]');
    if (delHarvest) {
      mutate((c) => { c.harvests = (c.harvests || []).filter((h) => h.id !== delHarvest.getAttribute('data-del-harvest')); });
      return;
    }
    const action = e.target.closest('[data-crop-action]');
    if (!action) return;
    if (action.getAttribute('data-crop-action') === 'status') {
      mutate((c) => { c.status = c.status === 'Harvested' ? 'Growing' : 'Harvested'; });
    } else {
      const c = state.crops.find((x) => x.id === openId);
      if (c) startEdit(c);
    }
  });
}
