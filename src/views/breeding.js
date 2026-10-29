import { addDays, escapeHtml, formatDisplayDate } from '../lib/format.js';
import { commit, state } from '../state.js';
import { switchTab } from '../ui/tabs.js';
import { showToast } from '../ui/toast.js';

export function renderBreeding() {
  const container = document.getElementById('breedingListContainer');
  const emptyState = document.getElementById('breedingEmptyState');

  container.innerHTML = '';
  if (state.breedingRecords.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  state.breedingRecords.forEach(record => {
    const heatDate = addDays(record.aiDate, 21);
    const pdDate = addDays(record.aiDate, 60);
    const calvingDate = addDays(record.aiDate, 283);

    let badgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';
    if (record.pregStatus === 'Confirmed Pregnant') {
      badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    } else if (record.pregStatus === 'Repeat / Not Pregnant') {
      badgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';
    } else if (record.pregStatus === 'Calved') {
      badgeStyle = 'bg-sky-100 text-sky-800 border-sky-200';
    }

    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3';
    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(record.cowTag)}</h3>
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeStyle}">${escapeHtml(record.pregStatus)}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Bull / Semen: <span class="font-medium text-slate-700">${escapeHtml(record.semenBull || 'Not specified')}</span></p>
        </div>
        <div class="flex items-center gap-2">
          <select data-status-cow="${record.id}" aria-label="Update pregnancy status" class="text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700">
            <option value="Awaiting PD Check" ${record.pregStatus === 'Awaiting PD Check' ? 'selected' : ''}>Awaiting PD Check</option>
            <option value="Confirmed Pregnant" ${record.pregStatus === 'Confirmed Pregnant' ? 'selected' : ''}>Confirmed Pregnant</option>
            <option value="Repeat / Not Pregnant" ${record.pregStatus === 'Repeat / Not Pregnant' ? 'selected' : ''}>Repeat / Not Pregnant</option>
            <option value="Calved" ${record.pregStatus === 'Calved' ? 'selected' : ''}>Calved</option>
          </select>
          <button type="button" data-calve-cow="${record.id}" class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold px-2.5 py-1 rounded-lg transition">
            + Record Calving
          </button>
          <button type="button" data-delete-cow="${record.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">
            Delete
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">AI Date</span>
          <span class="text-xs font-bold text-slate-800">${formatDisplayDate(record.aiDate)}</span>
        </div>
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">21-Day Heat Check</span>
          <span class="text-xs font-semibold text-slate-700">${heatDate}</span>
        </div>
        <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
          <span class="block text-[10px] uppercase font-semibold text-slate-400">60-Day PD Check</span>
          <span class="text-xs font-semibold text-slate-700">${pdDate}</span>
        </div>
        <div class="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
          <span class="block text-[10px] uppercase font-semibold text-emerald-700">Expected Calving</span>
          <span class="text-xs font-bold text-emerald-900">${calvingDate}</span>
        </div>
      </div>

      ${record.notes ? `<p class="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200/60"><strong>Notes:</strong> ${escapeHtml(record.notes)}</p>` : ''}
    `;
    container.appendChild(card);
  });
}

export function updateBreedingPreview() {
  const dateVal = document.getElementById('aiDate').value;
  document.getElementById('previewHeatDate').textContent = addDays(dateVal, 21);
  document.getElementById('previewPdDate').textContent = addDays(dateVal, 60);
  document.getElementById('previewCalvingDate').textContent = addDays(dateVal, 283);
}

function openCalvingModal(cowRecord) {
  if (!cowRecord) return;
  document.getElementById('calvingRecordId').value = cowRecord.id;
  document.getElementById('calvingMotherSubtitle').textContent = `Mother: ${cowRecord.cowTag} • Bull/Semen: ${cowRecord.semenBull || 'Standard'}`;
  const nextWachiNum = state.wachiList.length + 1;
  const numStr = nextWachiNum < 10 ? '0' + nextWachiNum : String(nextWachiNum);
  document.getElementById('calfTagInput').value = `Wachi #${numStr} (${cowRecord.cowTag} Calf)`;
  document.getElementById('calfActionSelect').value = 'wachi';
  document.getElementById('calfDetailsFields').classList.remove('hidden');
  document.getElementById('calvingModal').classList.remove('hidden');
}

function closeCalvingModal() {
  document.getElementById('calvingModal').classList.add('hidden');
}

export function initBreeding() {
  // Live AI Date Preview
  document.getElementById('aiDate').addEventListener('input', updateBreedingPreview);

  // Add Cow AI Record
  document.getElementById('breedingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const cowTag = document.getElementById('cowTag').value.trim();
    const aiDate = document.getElementById('aiDate').value;
    const semenBull = document.getElementById('semenBull').value.trim();
    const pregStatus = document.getElementById('pregStatus').value;
    const notes = document.getElementById('cowNotes').value.trim();

    if (!cowTag || !aiDate) return;

    state.breedingRecords.unshift({
      id: 'cow-' + Date.now(),
      cowTag,
      aiDate,
      semenBull,
      pregStatus,
      notes
    });

    commit();
    document.getElementById('cowTag').value = '';
    document.getElementById('semenBull').value = '';
    document.getElementById('cowNotes').value = '';
    showToast('Cow AI record saved!');
  });

  // Update, Calve, or Delete Cow Record (Event Delegation)
  document.getElementById('breedingListContainer').addEventListener('change', (e) => {
    const select = e.target.closest('[data-status-cow]');
    if (!select) return;
    const id = select.getAttribute('data-status-cow');
    const rec = state.breedingRecords.find(r => r.id === id);
    if (rec) {
      if (select.value === 'Calved') {
        openCalvingModal(rec);
      } else {
        rec.pregStatus = select.value;
        commit();
        showToast('Pregnancy status updated!');
      }
    }
  });

  document.getElementById('breedingListContainer').addEventListener('click', (e) => {
    const calveBtn = e.target.closest('[data-calve-cow]');
    if (calveBtn) {
      const id = calveBtn.getAttribute('data-calve-cow');
      const rec = state.breedingRecords.find(r => r.id === id);
      if (rec) openCalvingModal(rec);
      return;
    }

    const btn = e.target.closest('[data-delete-cow]');
    if (!btn) return;
    const id = btn.getAttribute('data-delete-cow');
    state.breedingRecords = state.breedingRecords.filter(r => r.id !== id);
    commit();
    showToast('Cow record removed.');
  });

  // Calving Modal Listeners
  document.getElementById('calvingCloseBtn').addEventListener('click', closeCalvingModal);
  document.getElementById('calvingCancelBtn').addEventListener('click', closeCalvingModal);

  document.getElementById('calfActionSelect').addEventListener('change', (e) => {
    const fields = document.getElementById('calfDetailsFields');
    const tagInput = document.getElementById('calfTagInput');
    if (e.target.value === 'none') {
      fields.classList.add('hidden');
      tagInput.removeAttribute('required');
    } else {
      fields.classList.remove('hidden');
      tagInput.setAttribute('required', 'required');
    }
  });

  document.getElementById('calvingModalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const recId = document.getElementById('calvingRecordId').value;
    const rec = state.breedingRecords.find(r => r.id === recId);
    if (!rec) {
      closeCalvingModal();
      return;
    }

    const calvingDate = document.getElementById('calvingDateInput').value;
    const action = document.getElementById('calfActionSelect').value;
    const calfTag = document.getElementById('calfTagInput').value.trim();
    const calfWeight = parseFloat(document.getElementById('calfBirthWeightInput').value) || 30;
    const updateMilker = document.getElementById('calvingUpdateMilkerCheck').checked;
    const freshAM = parseFloat(document.getElementById('freshMorningInput').value) || 0;
    const freshPM = parseFloat(document.getElementById('freshEveningInput').value) || 0;

    // 1. Mark Cow AI Record as Calved
    rec.pregStatus = 'Calved';
    const calfNote = action !== 'none' && calfTag ? `Calved on ${formatDisplayDate(calvingDate)} (${calfTag}, ${calfWeight} kg)` : `Calved on ${formatDisplayDate(calvingDate)}`;
    rec.notes = rec.notes ? `${rec.notes} | ${calfNote}` : calfNote;

    // 2. Update or Add Mother in Tab 4: Milkers
    if (updateMilker) {
      const existingMilker = state.milkersList.find(m => m.tag.toLowerCase() === rec.cowTag.toLowerCase());
      if (existingMilker) {
        existingMilker.morningMilk = freshAM;
        existingMilker.eveningMilk = freshPM;
        existingMilker.status = 'Peak / High Yield';
        existingMilker.notes = `Freshly calved on ${formatDisplayDate(calvingDate)}`;
      } else {
        state.milkersList.unshift({
          id: 'milker-' + Date.now(),
          tag: rec.cowTag,
          breed: `${rec.semenBull || 'Dairy Cow'} (Fresh Lactation)`,
          morningMilk: freshAM,
          eveningMilk: freshPM,
          status: 'Peak / High Yield',
          notes: `Freshly calved on ${formatDisplayDate(calvingDate)}`
        });
      }
    }

    // 3. Route Newborn Calf
    if (action === 'wachi' && calfTag) {
      state.wachiList.unshift({
        id: 'wachi-' + Date.now(),
        tag: calfTag,
        breed: `${rec.semenBull || 'Dairy Cross'} (Dam: ${rec.cowTag})`,
        ageMonths: 1,
        weightKg: calfWeight,
        stage: 'Young Calf (< 6 Months)',
        notes: `Born on ${formatDisplayDate(calvingDate)}; colostrum & calf starter diet`
      });
    }

    commit();
    closeCalvingModal();

    if (action === 'male_sale' && calfTag) {
      switchTab('sales');
      document.getElementById('saleCowTag').value = `${calfTag} — Male Calf of ${rec.cowTag}`;
      document.getElementById('saleDate').value = calvingDate;
      document.getElementById('saleNotes').value = `Newborn male calf (${calfWeight} kg) born on ${formatDisplayDate(calvingDate)}`;
      showToast('Cow marked Calved & Male Calf pre-filled in Sold Cows Log!');
    } else if (action === 'wachi') {
      showToast('Calving saved! Newborn added to Wachi & Mother updated in Milkers.');
    } else {
      showToast('Calving saved & Milkers list updated!');
    }
  });

}
