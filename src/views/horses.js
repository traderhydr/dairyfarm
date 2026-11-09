import { escapeHtml, formatCurrency } from '../lib/format.js';
import { commit, state } from '../state.js';
import { initListSearch, matchesSearch, noMatchHtml, searchQuery } from '../ui/list-search.js';
import { createEditor, EDIT_BTN_CLASS, setField } from '../ui/record-editor.js';
import { showToast } from '../ui/toast.js';

const $ = (id) => document.getElementById(id);
let editor = null;

const STATUS_STYLE = {
  Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Pregnant: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'For sale': 'bg-amber-100 text-amber-900 border-amber-300',
  Retired: 'bg-slate-100 text-slate-700 border-slate-200',
  Sold: 'bg-rose-100 text-rose-800 border-rose-200',
  Died: 'bg-slate-200 text-slate-600 border-slate-300'
};

export function renderHorses() {
  const container = $('horsesListContainer');
  const empty = $('horsesEmptyState');
  const live = state.horses.filter((h) => h.status !== 'Sold' && h.status !== 'Died');
  const monthly = live.reduce((s, h) => s + (Number(h.monthlyCost) || 0), 0);
  $('horsesCostBanner').textContent = formatCurrency(monthly);
  $('horsesSummary').textContent = `${live.length} ${live.length === 1 ? 'horse' : 'horses'} in the stable`;

  container.innerHTML = '';
  if (state.horses.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  const query = searchQuery('horsesSearch');
  const shown = state.horses.filter((r) => matchesSearch(r, query));
  if (shown.length === 0) { container.innerHTML = noMatchHtml('horsesSearch'); return; }

  shown.forEach((h) => {
    const cost = Number(h.cost) || 0;
    const price = Number(h.salePrice) || 0;
    const profit = h.status === 'Sold' && cost > 0 && price > 0 ? price - cost : null;
    const tiles = [
      h.ageYears ? ['Age', `${h.ageYears} years`] : null,
      h.color ? ['Colour', h.color] : null,
      h.purpose ? ['Purpose', h.purpose] : null,
      h.monthlyCost ? ['Feed & Care / mo', formatCurrency(h.monthlyCost)] : null,
      cost ? ['Purchase Cost', formatCurrency(cost)] : null,
      price ? ['Sale Price', formatCurrency(price)] : null,
      profit !== null ? [profit >= 0 ? 'Profit' : 'Loss', formatCurrency(Math.abs(profit))] : null
    ].filter(Boolean);
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(h.name)}</h3>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[h.status] || STATUS_STYLE.Active}">${escapeHtml(h.status || 'Active')}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(h.sex)}${h.breed ? ' &bull; ' + escapeHtml(h.breed) : ''}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" data-open-profile="${escapeHtml(h.name)}" class="${EDIT_BTN_CLASS}">Profile</button>
          <button type="button" data-edit-horse="${h.id}" class="${EDIT_BTN_CLASS}">Edit</button>
          <button type="button" data-delete-horse="${h.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">Delete</button>
        </div>
      </div>
      ${tiles.length ? `<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${tiles.map(([k, v]) => `
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80"><span class="block text-[10px] uppercase font-semibold text-slate-400">${k}</span><span class="text-xs font-bold text-slate-800">${escapeHtml(v)}</span></div>`).join('')}</div>` : ''}
      ${h.notes ? `<p class="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200/60"><strong>Notes:</strong> ${escapeHtml(h.notes)}</p>` : ''}`;
    container.appendChild(card);
  });
}

function startEdit(h) {
  editor.begin(h.id, () => {
    setField('horseName', h.name); setField('horseBreed', h.breed); setField('horseSex', h.sex); setField('horseAge', h.ageYears);
    setField('horseColor', h.color); setField('horsePurpose', h.purpose); setField('horseStatus', h.status || 'Active');
    setField('horseMonthlyCost', h.monthlyCost); setField('horseCost', h.cost); setField('horseSalePrice', h.salePrice); setField('horseNotes', h.notes);
  });
}

export function initHorses() {
  editor = createEditor({ sheetId: 'horsesSheet', formId: 'horseForm', editTitle: 'Edit Horse' });
  initListSearch('horsesSearch', renderHorses);
  document.addEventListener('animal-edit', (e) => {
    if (e.detail.kind !== 'horse') return;
    const h = state.horses.find((x) => x.id === e.detail.id);
    if (h) startEdit(h);
  });

  $('horseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const num = (id) => { const v = parseFloat($(id).value); return Number.isFinite(v) && v > 0 ? v : 0; };
    const rec = {
      name: $('horseName').value.trim(),
      breed: $('horseBreed').value.trim(),
      sex: $('horseSex').value,
      ageYears: num('horseAge'),
      color: $('horseColor').value.trim(),
      purpose: $('horsePurpose').value,
      status: $('horseStatus').value,
      monthlyCost: num('horseMonthlyCost'),
      cost: num('horseCost'),
      salePrice: num('horseSalePrice'),
      notes: $('horseNotes').value.trim()
    };
    if (!rec.name) return;
    const existing = editor.find(state.horses);
    if (existing) {
      Object.assign(existing, rec);
      commit();
      showToast('Horse updated!');
      return;
    }
    state.horses.unshift({ id: 'horse-' + Date.now(), ...rec });
    commit();
    ['horseName', 'horseBreed', 'horseAge', 'horseColor', 'horseMonthlyCost', 'horseCost', 'horseSalePrice', 'horseNotes'].forEach((id) => { $(id).value = ''; });
    showToast('Horse added!');
  });

  $('horsesListContainer').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit-horse]');
    if (edit) {
      const h = state.horses.find((x) => x.id === edit.getAttribute('data-edit-horse'));
      if (h) startEdit(h);
      return;
    }
    const del = e.target.closest('[data-delete-horse]');
    if (!del) return;
    state.horses = state.horses.filter((x) => x.id !== del.getAttribute('data-delete-horse'));
    commit();
    showToast('Horse removed.');
  });
}
