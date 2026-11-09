import { areaAcres } from '../lib/crops.js';
import { escapeHtml, formatCurrency } from '../lib/format.js';
import { commit, state } from '../state.js';
import { initListSearch, matchesSearch, noMatchHtml, searchQuery } from '../ui/list-search.js';
import { createEditor, EDIT_BTN_CLASS, setField } from '../ui/record-editor.js';
import { showToast } from '../ui/toast.js';

const $ = (id) => document.getElementById(id);
let editor = null;

const fmtAcres = (n) => `${Math.round(n * 100) / 100} acres`;

export function renderLands() {
  const container = $('landsListContainer');
  const empty = $('landsEmptyState');
  const total = state.lands.reduce((s, l) => s + areaAcres(l.area, l.unit), 0);
  $('landsTotalBanner').textContent = fmtAcres(total);
  const own = state.lands.filter((l) => l.ownership !== 'Theeka').reduce((s, l) => s + areaAcres(l.area, l.unit), 0);
  $('landsSummary').textContent = `${fmtAcres(own)} own · ${fmtAcres(total - own)} on Theeka`;

  container.innerHTML = '';
  if (state.lands.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  const query = searchQuery('landsSearch');
  const shown = state.lands.filter((r) => matchesSearch(r, query));
  if (shown.length === 0) { container.innerHTML = noMatchHtml('landsSearch'); return; }

  shown.forEach((l) => {
    const crops = state.crops.filter((c) => c.landId === l.id);
    const theeka = l.ownership === 'Theeka';
    const tiles = [
      ['Area', `${l.area} ${l.unit}${l.unit === 'Acre' ? '' : ' (' + Math.round(areaAcres(l.area, l.unit) * 100) / 100 + ' acres)'}`],
      theeka && l.theeka ? ['Theeka / Year', formatCurrency(l.theeka)] : null,
      l.water ? ['Water', l.water] : null,
      ['Crops Recorded', String(crops.length)]
    ].filter(Boolean);
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(l.name)}</h3>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${theeka ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}">${theeka ? 'Theeka (Rented)' : 'Own land'}</span>
          </div>
          ${l.owner ? `<p class="text-xs text-slate-500 mt-0.5">${escapeHtml(l.owner)}</p>` : ''}
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" data-edit-land="${l.id}" class="${EDIT_BTN_CLASS}">Edit</button>
          <button type="button" data-delete-land="${l.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">Delete</button>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${tiles.map(([k, v]) => `
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80"><span class="block text-[10px] uppercase font-semibold text-slate-400">${k}</span><span class="text-xs font-bold text-slate-800">${escapeHtml(v)}</span></div>`).join('')}</div>
      ${l.notes ? `<p class="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200/60"><strong>Notes:</strong> ${escapeHtml(l.notes)}</p>` : ''}`;
    container.appendChild(card);
  });
}

function startEdit(l) {
  editor.begin(l.id, () => {
    setField('landName', l.name); setField('landOwnership', l.ownership || 'Own'); setField('landArea', l.area); setField('landUnit', l.unit || 'Acre');
    setField('landTheeka', l.theeka); setField('landOwner', l.owner); setField('landWater', l.water); setField('landNotes', l.notes);
  });
}

export function initLands() {
  editor = createEditor({ sheetId: 'landsSheet', formId: 'landForm', editTitle: 'Edit Land' });
  initListSearch('landsSearch', renderLands);

  $('landForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const area = parseFloat($('landArea').value);
    const rec = {
      name: $('landName').value.trim(),
      ownership: $('landOwnership').value,
      area,
      unit: $('landUnit').value,
      theeka: parseFloat($('landTheeka').value) || 0,
      owner: $('landOwner').value.trim(),
      water: $('landWater').value,
      notes: $('landNotes').value.trim()
    };
    if (!rec.name || !(area > 0)) return;
    const existing = editor.find(state.lands);
    if (existing) {
      Object.assign(existing, rec);
      commit();
      showToast('Land updated!');
      return;
    }
    state.lands.unshift({ id: 'land-' + Date.now(), ...rec });
    commit();
    ['landName', 'landArea', 'landTheeka', 'landOwner', 'landNotes'].forEach((id) => { $(id).value = ''; });
    showToast('Land added!');
  });

  $('landsListContainer').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit-land]');
    if (edit) {
      const l = state.lands.find((x) => x.id === edit.getAttribute('data-edit-land'));
      if (l) startEdit(l);
      return;
    }
    const del = e.target.closest('[data-delete-land]');
    if (!del) return;
    const id = del.getAttribute('data-delete-land');
    const gone = state.lands.find((x) => x.id === id);
    state.lands = state.lands.filter((x) => x.id !== id);
    // crops keep the field's name as plain text once the land record is gone
    state.crops.forEach((c) => { if (c.landId === id) { c.landName = c.landName || (gone ? gone.name : ''); delete c.landId; } });
    commit();
    showToast('Land removed. Its crops are kept.');
  });
}
