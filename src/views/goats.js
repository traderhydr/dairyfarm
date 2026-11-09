import { escapeHtml, formatCurrency } from '../lib/format.js';
import { commit, state } from '../state.js';
import { initListSearch, matchesSearch, noMatchHtml, searchQuery } from '../ui/list-search.js';
import { createEditor, EDIT_BTN_CLASS, setField } from '../ui/record-editor.js';
import { showToast } from '../ui/toast.js';

const $ = (id) => document.getElementById(id);
let editor = null;

const STATUS_STYLE = {
  'In flock': 'bg-slate-100 text-slate-700 border-slate-200',
  Pregnant: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Milking: 'bg-sky-100 text-sky-800 border-sky-200',
  'For sale': 'bg-amber-100 text-amber-900 border-amber-300',
  Sold: 'bg-rose-100 text-rose-800 border-rose-200',
  Died: 'bg-slate-200 text-slate-600 border-slate-300'
};

export function renderGoats() {
  const container = $('goatsListContainer');
  const empty = $('goatsEmptyState');
  const live = state.goats.filter((g) => g.status !== 'Sold' && g.status !== 'Died');
  const count = (list, species) => list.filter((g) => g.species === species).reduce((s, g) => s + (Number(g.count) || 1), 0);
  const goatN = count(live, 'Goat');
  const sheepN = count(live, 'Sheep');
  $('goatsTotalBanner').textContent = String(goatN + sheepN);
  $('goatsSummary').textContent = `${goatN} ${goatN === 1 ? 'goat' : 'goats'} · ${sheepN} sheep in the flock`;

  container.innerHTML = '';
  if (state.goats.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  const query = searchQuery('goatsSearch');
  const shown = state.goats.filter((r) => matchesSearch(r, query));
  if (shown.length === 0) { container.innerHTML = noMatchHtml('goatsSearch'); return; }

  shown.forEach((g) => {
    const n = Number(g.count) || 1;
    const cost = Number(g.cost) || 0;
    const price = Number(g.salePrice) || 0;
    const profit = g.status === 'Sold' && cost > 0 && price > 0 ? price - cost : null;
    const tiles = [
      g.ageMonths ? ['Age', `${g.ageMonths} months`] : null,
      g.weightKg ? ['Weight', `${g.weightKg} kg`] : null,
      n > 1 ? ['Number', String(n)] : null,
      cost ? ['Cost', formatCurrency(cost)] : null,
      price ? ['Sale Price', formatCurrency(price)] : null,
      profit !== null ? [profit >= 0 ? 'Profit' : 'Loss', formatCurrency(Math.abs(profit))] : null
    ].filter(Boolean);
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(g.tag)}</h3>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[g.status] || STATUS_STYLE['In flock']}">${escapeHtml(g.status || 'In flock')}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(g.species)} &bull; ${escapeHtml(g.sex)}${g.breed ? ' &bull; ' + escapeHtml(g.breed) : ''}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" data-open-profile="${escapeHtml(g.tag)}" class="${EDIT_BTN_CLASS}">Profile</button>
          <button type="button" data-edit-goat="${g.id}" class="${EDIT_BTN_CLASS}">Edit</button>
          <button type="button" data-delete-goat="${g.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">Delete</button>
        </div>
      </div>
      ${tiles.length ? `<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${tiles.map(([k, v]) => `
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80"><span class="block text-[10px] uppercase font-semibold text-slate-400">${k}</span><span class="text-xs font-bold text-slate-800">${escapeHtml(v)}</span></div>`).join('')}</div>` : ''}
      ${g.notes ? `<p class="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200/60"><strong>Notes:</strong> ${escapeHtml(g.notes)}</p>` : ''}`;
    container.appendChild(card);
  });
}

function startEdit(g) {
  editor.begin(g.id, () => {
    setField('goatTag', g.tag); setField('goatSpecies', g.species); setField('goatSex', g.sex); setField('goatBreed', g.breed);
    setField('goatAge', g.ageMonths); setField('goatWeight', g.weightKg); setField('goatCount', g.count || 1);
    setField('goatStatus', g.status || 'In flock'); setField('goatCost', g.cost); setField('goatSalePrice', g.salePrice); setField('goatNotes', g.notes);
  });
}

export function initGoats() {
  editor = createEditor({ sheetId: 'goatsSheet', formId: 'goatForm', editTitle: 'Edit Goat / Sheep' });
  initListSearch('goatsSearch', renderGoats);
  document.addEventListener('animal-edit', (e) => {
    if (e.detail.kind !== 'goat') return;
    const g = state.goats.find((x) => x.id === e.detail.id);
    if (g) startEdit(g);
  });

  $('goatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const num = (id) => { const v = parseFloat($(id).value); return Number.isFinite(v) && v > 0 ? v : 0; };
    const rec = {
      tag: $('goatTag').value.trim(),
      species: $('goatSpecies').value,
      sex: $('goatSex').value,
      breed: $('goatBreed').value.trim(),
      ageMonths: num('goatAge'),
      weightKg: num('goatWeight'),
      count: Math.max(1, parseInt($('goatCount').value, 10) || 1),
      status: $('goatStatus').value,
      cost: num('goatCost'),
      salePrice: num('goatSalePrice'),
      notes: $('goatNotes').value.trim()
    };
    if (!rec.tag) return;
    const existing = editor.find(state.goats);
    if (existing) {
      Object.assign(existing, rec);
      commit();
      showToast('Goat / sheep updated!');
      return;
    }
    state.goats.unshift({ id: 'goat-' + Date.now(), ...rec });
    commit();
    ['goatTag', 'goatBreed', 'goatAge', 'goatWeight', 'goatCost', 'goatSalePrice', 'goatNotes'].forEach((id) => { $(id).value = ''; });
    $('goatCount').value = '1';
    showToast('Goat / sheep added!');
  });

  $('goatsListContainer').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit-goat]');
    if (edit) {
      const g = state.goats.find((x) => x.id === edit.getAttribute('data-edit-goat'));
      if (g) startEdit(g);
      return;
    }
    const del = e.target.closest('[data-delete-goat]');
    if (!del) return;
    state.goats = state.goats.filter((x) => x.id !== del.getAttribute('data-delete-goat'));
    commit();
    showToast('Goat / sheep removed.');
  });
}
