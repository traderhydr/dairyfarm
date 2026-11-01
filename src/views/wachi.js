import { escapeHtml } from '../lib/format.js';
import { commit, state } from '../state.js';
import { openSheet } from '../ui/sheets.js';
import { switchTab } from '../ui/tabs.js';
import { showToast } from '../ui/toast.js';

export function renderWachi() {
  const container = document.getElementById('wachiListContainer');
  const emptyState = document.getElementById('wachiEmptyState');
  const stageFilter = document.getElementById('wachiFilter').value;

  const filtered = state.wachiList.filter(w => stageFilter === 'all' ? true : w.stage === stageFilter);

  container.innerHTML = '';
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  filtered.forEach(wachi => {
    let badgeStyle = 'bg-slate-200 text-slate-800 border-slate-300';
    if (wachi.stage === 'Ready for 1st AI') {
      badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300';
    } else if (wachi.stage === 'Inseminated (1st AI Done)') {
      badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    } else if (wachi.stage === 'Growing Wachi (6–15 Months)') {
      badgeStyle = 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }

    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(wachi.tag)}</h3>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeStyle}">${escapeHtml(wachi.stage)}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Breed / Mother: <span class="font-medium text-slate-700">${escapeHtml(wachi.breed)}</span></p>
        </div>
        <div class="card-actions">
          <select data-stage-wachi="${wachi.id}" aria-label="Update Wachi stage" class="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700">
            <option value="Young Calf (< 6 Months)" ${wachi.stage === 'Young Calf (< 6 Months)' ? 'selected' : ''}>Young Calf (&lt; 6 Months)</option>
            <option value="Growing Wachi (6–15 Months)" ${wachi.stage === 'Growing Wachi (6–15 Months)' ? 'selected' : ''}>Growing Wachi (6–15 Months)</option>
            <option value="Ready for 1st AI" ${wachi.stage === 'Ready for 1st AI' ? 'selected' : ''}>Ready for 1st AI</option>
            <option value="Inseminated (1st AI Done)" ${wachi.stage === 'Inseminated (1st AI Done)' ? 'selected' : ''}>Inseminated (1st AI Done)</option>
          </select>
          <button type="button" data-promote-wachi="${wachi.id}" class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold px-2.5 py-1 rounded-lg transition">
            + Log 1st AI
          </button>
          <button type="button" data-delete-wachi="${wachi.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">
            Delete
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">Current Age</span>
          <span class="text-xs font-bold text-slate-800">${wachi.ageMonths} Months</span>
        </div>
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">Approx. Weight</span>
          <span class="text-xs font-bold text-slate-800">${wachi.weightKg} kg</span>
        </div>
        <div class="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 col-span-2 sm:col-span-1">
          <span class="block text-[10px] uppercase font-semibold text-emerald-700">1st AI Target Guide</span>
          <span class="text-xs font-semibold text-emerald-900">${wachi.weightKg >= 250 || wachi.ageMonths >= 15 ? 'Ready for Breeding Check' : 'Target: ~15 mo / 250+ kg'}</span>
        </div>
      </div>

      ${wachi.notes ? `<p class="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200/60"><strong>Notes:</strong> ${escapeHtml(wachi.notes)}</p>` : ''}
    `;
    container.appendChild(card);
  });
}

export function initWachi() {
  // Add New Wachi (Heifer)
  document.getElementById('wachiForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const tag = document.getElementById('wachiTag').value.trim();
    const breed = document.getElementById('wachiBreed').value.trim();
    const ageMonths = parseInt(document.getElementById('wachiAge').value, 10) || 0;
    const weightKg = parseFloat(document.getElementById('wachiWeight').value) || 0;
    const stage = document.getElementById('wachiStage').value;
    const notes = document.getElementById('wachiNotes').value.trim();

    if (!tag || !breed || ageMonths <= 0 || weightKg <= 0) return;

    state.wachiList.unshift({
      id: 'wachi-' + Date.now(),
      tag,
      breed,
      ageMonths,
      weightKg,
      stage,
      notes
    });

    commit();
    document.getElementById('wachiTag').value = '';
    document.getElementById('wachiBreed').value = '';
    document.getElementById('wachiAge').value = '';
    document.getElementById('wachiWeight').value = '';
    document.getElementById('wachiNotes').value = '';
    showToast('Wachi (Heifer) added!');
  });

  // Filter, Update Stage, or Delete Wachi
  document.getElementById('wachiFilter').addEventListener('change', () => {
    renderWachi();
  });

  document.getElementById('wachiListContainer').addEventListener('change', (e) => {
    const select = e.target.closest('[data-stage-wachi]');
    if (!select) return;
    const id = select.getAttribute('data-stage-wachi');
    const wachi = state.wachiList.find(w => w.id === id);
    if (wachi) {
      wachi.stage = select.value;
      commit();
      showToast('Wachi stage updated!');
    }
  });

  document.getElementById('wachiListContainer').addEventListener('click', (e) => {
    const promoteBtn = e.target.closest('[data-promote-wachi]');
    if (promoteBtn) {
      const id = promoteBtn.getAttribute('data-promote-wachi');
      const wachi = state.wachiList.find(w => w.id === id);
      if (wachi) {
        wachi.stage = 'Inseminated (1st AI Done)';
        commit();
        switchTab('breeding');
        openSheet('breedingSheet');
        const cowTagInput = document.getElementById('cowTag');
        const cowNotesInput = document.getElementById('cowNotes');
        if (cowTagInput) {
          cowTagInput.value = wachi.tag;
          cowTagInput.focus();
        }
        if (cowNotesInput) {
          cowNotesInput.value = `1st AI (Heifer/Wachi — ${wachi.breed}, ${wachi.ageMonths} mo, ${wachi.weightKg} kg)`;
        }
        showToast(`Pre-filled ${wachi.tag} in Cow AI Log!`);
      }
      return;
    }

    const delBtn = e.target.closest('[data-delete-wachi]');
    if (!delBtn) return;
    const id = delBtn.getAttribute('data-delete-wachi');
    state.wachiList = state.wachiList.filter(w => w.id !== id);
    commit();
    showToast('Wachi record removed.');
  });

}
