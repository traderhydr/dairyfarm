// Breeding protocols on screen: the start sheet, the confirm sheet (final AI, early heat, PD result),
// the task card in the Treatment list and the "Breeding / Reproduction" block in an animal's profile.
import { listAnimals } from '../lib/animals.js';
import { escapeHtml } from '../lib/format.js';
import {
  activeProtocolOf, cancelProtocol, completeTask, earlyHeat, enrollProtocol, protocolView, protocolsOf, skipTask
} from '../lib/protocol-actions.js';
import {
  FTAI_STEP, PD_STEP, TEMPLATES, buildSchedule, clockText, dateTimeText, describeDue, formatLocal, parseLocal, templateList
} from '../lib/protocols.js';
import { commit, state } from '../state.js';
import { openConfirmModal } from '../ui/modal.js';
import { closeSheets, openSheet } from '../ui/sheets.js';
import { showToast } from '../ui/toast.js';

const $ = (id) => document.getElementById(id);
const INPUT = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const DUE_COLOR = { overdue: 'text-rose-600', now: 'text-amber-700', soon: 'text-amber-700', later: 'text-slate-700' };

let pending = null; // what the confirm sheet is about: { action, taskId, protocolId, tag, fromProfile }

const nowLocal = () => formatLocal(new Date());
const windowText = (t) => (t.windowStart && t.windowEnd && parseLocal(t.windowStart) && parseLocal(t.windowEnd)
  ? `AI window ${clockText(parseLocal(t.windowStart))} to ${clockText(parseLocal(t.windowEnd))}` : '');

function refresh() {
  commit('local-keep');
  document.dispatchEvent(new CustomEvent('profile-refresh'));
}

// ---------------------------------------------------------------- the task card in the Treatment list
export function protocolTaskCard(rec) {
  const protocol = state.protocols.find((p) => p.id === rec.protocolId);
  const open = rec.status === 'Scheduled';
  const due = open ? describeDue(rec.dueAt) : null;
  const statusClass = rec.status === 'Done' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : rec.status === 'Cancelled' ? 'bg-slate-100 text-slate-500 border-slate-200'
      : due.state === 'overdue' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-900 border-amber-300';
  const win = windowText(rec);
  const stepOf = protocol && rec.stepKey !== PD_STEP ? ` &bull; ${escapeHtml(protocol.templateName)} &middot; Step ${Number(rec.stepIndex) + 1} of ${Number(protocol.steps) || ''}` : protocol ? ` &bull; ${escapeHtml(protocol.templateName)}` : '';
  const card = document.createElement('div');
  card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3';
  card.setAttribute('data-protocol-task-card', rec.id);
  card.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(rec.type)}</h3>
          <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300">Breeding Protocol</span>
          <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusClass}">${escapeHtml(rec.status === 'Scheduled' ? 'Scheduled' : rec.status)}</span>
        </div>
        <p class="text-xs text-slate-600 mt-0.5">Animal: <button type="button" data-open-profile="${escapeHtml(rec.target)}" class="font-semibold text-slate-800 underline decoration-slate-300">${escapeHtml(rec.target)}</button>${stepOf}</p>
      </div>
      <button type="button" data-delete-health="${rec.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">Delete</button>
    </div>
    <div class="rounded-lg border border-slate-200/80 bg-white p-2.5 space-y-0.5">
      ${open
        ? `<p class="text-sm font-bold ${DUE_COLOR[due.state]}">${escapeHtml(due.text)}</p>
           <p class="text-xs text-slate-600">${escapeHtml(dateTimeText(rec.dueAt))}</p>`
        : rec.status === 'Done'
          ? `<p class="text-sm font-bold text-emerald-700">Done ${escapeHtml(dateTimeText(rec.doneAt))}</p>`
          : `<p class="text-sm font-semibold text-slate-500">${escapeHtml(rec.cancelReason || 'Cancelled')}</p>`}
      ${win && open ? `<p class="text-xs font-semibold text-amber-700">${escapeHtml(win)}</p>` : ''}
    </div>
    ${open ? `
    <div class="flex flex-wrap gap-2">
      <button type="button" data-protocol-done="${rec.id}" class="btn-primary text-xs px-3">Mark done</button>
      ${protocol && protocol.status === 'Active' && rec.stepKey !== PD_STEP ? `<button type="button" data-protocol-early="${protocol.id}" class="btn-secondary text-xs px-3">Early heat / Breed now</button>` : ''}
      <button type="button" data-protocol-skip="${rec.id}" class="btn-secondary text-xs px-3">Skip step</button>
    </div>` : ''}`;
  return card;
}

// ---------------------------------------------------------------- the block in the animal profile
const stepRow = (t) => {
  const mark = t.status === 'Done' ? '<span class="text-emerald-600 font-bold">&#10003;</span>'
    : t.status === 'Cancelled' ? '<span class="text-slate-400">&times;</span>' : '<span class="text-slate-400">&#9675;</span>';
  const when = t.status === 'Done' ? `Done ${dateTimeText(t.doneAt)}` : t.status === 'Cancelled' ? (t.cancelReason || 'Cancelled') : dateTimeText(t.dueAt);
  const win = t.status === 'Scheduled' ? windowText(t) : '';
  return `
    <div class="flex items-start justify-between gap-3 py-1.5 text-xs">
      <div class="flex items-start gap-2 min-w-0">${mark}<span class="font-semibold ${t.status === 'Cancelled' ? 'text-slate-400 line-through' : 'text-slate-800'}">${escapeHtml(t.type)}</span></div>
      <div class="text-right shrink-0 text-slate-600">${escapeHtml(when)}${win ? `<span class="block text-amber-700 font-semibold">${escapeHtml(win)}</span>` : ''}</div>
    </div>`;
};

function activeCard(view) {
  const { protocol, steps, done, total, next } = view;
  const due = next ? describeDue(next.dueAt) : null;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return `
    <div class="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2.5" data-active-protocol="${escapeHtml(protocol.id)}">
      <div class="flex items-center justify-between gap-2">
        <p class="font-bold text-sm text-slate-900">${escapeHtml(protocol.templateName)}</p>
        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300">Active</span>
      </div>
      <p class="text-xs text-slate-600">Day 0: ${escapeHtml(dateTimeText(protocol.day0))}</p>
      ${next ? `<p class="text-sm font-bold ${DUE_COLOR[due.state]}">Step ${Number(next.stepIndex) + 1} of ${Number(total)}: ${escapeHtml(next.type)} &mdash; ${escapeHtml(due.text)}</p>`
        : `<p class="text-sm font-bold text-emerald-700">All steps done</p>`}
      <div class="w-full h-1.5 bg-white rounded-full overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="Protocol progress"><div class="h-full goal-fill rounded-full" style="width: ${percent}%"></div></div>
      <div class="divide-y divide-amber-100">${steps.map(stepRow).join('')}</div>
      <div class="flex flex-wrap gap-2 pt-1">
        ${next ? `<button type="button" data-protocol-done="${escapeHtml(next.id)}" class="btn-primary text-xs px-3">${next.stepKey === FTAI_STEP ? 'Mark FTAI done' : 'Mark step done'}</button>` : ''}
        <button type="button" data-protocol-early="${escapeHtml(protocol.id)}" class="btn-secondary text-xs px-3">Early heat / Breed now</button>
        <button type="button" data-protocol-cancel="${escapeHtml(protocol.id)}" class="btn-secondary text-xs px-3">Cancel protocol</button>
      </div>
    </div>`;
}

const pdText = (view) => {
  const r = view.record;
  if (view.protocol.pdResult) return `PD: ${view.protocol.pdResult}`;
  if (r && r.pregStatus === 'Confirmed Pregnant') return 'PD: Pregnant';
  if (r && r.pregStatus === 'Repeat / Not Pregnant') return 'PD: Not pregnant';
  return view.protocol.status === 'Bred' ? 'PD: Awaiting' : '';
};

function historyRow(view) {
  const p = view.protocol;
  const outcome = p.status === 'Bred' ? (p.bredVia === 'Early heat' ? 'Bred (early heat)' : 'Bred (FTAI)')
    : p.status === 'Cancelled' ? `Cancelled${p.cancelReason && p.cancelReason !== 'Cancelled' ? ': ' + p.cancelReason : ''}` : p.status;
  const bits = [p.aiAt ? `AI ${dateTimeText(p.aiAt)}` : '', p.sire ? `Semen: ${p.sire}` : '', pdText(view)].filter(Boolean).join(' · ');
  return `
    <div class="py-2 text-xs">
      <div class="flex items-start justify-between gap-3">
        <p class="font-semibold text-slate-800">${escapeHtml(p.templateName)} &middot; ${escapeHtml(dateTimeText(p.day0))}</p>
        <p class="text-slate-600 shrink-0">${escapeHtml(outcome)}</p>
      </div>
      ${bits ? `<p class="text-slate-500 mt-0.5">${escapeHtml(bits)}</p>` : ''}
    </div>`;
}

/** The "Breeding / Reproduction" section of a profile (cattle only). */
export function breedingSectionHtml(profile) {
  if (!['milker', 'wachi', 'other'].includes(profile.kind)) return '';
  const all = protocolsOf(state, profile.tag).sort((a, b) => String(b.day0).localeCompare(String(a.day0)));
  const active = all.find((p) => p.status === 'Active');
  const history = all.filter((p) => p !== active);
  const views = history.map((p) => protocolView(state, p));
  const pdOpen = all.map((p) => protocolView(state, p).pd).find((t) => t && t.status === 'Scheduled');
  const startBtn = !active && !profile.sold
    ? `<button type="button" data-protocol-start="${escapeHtml(profile.tag)}" class="btn-primary text-xs w-full py-2.5">Start Breeding Protocol</button>` : '';
  const pd = pdOpen ? `
    <div class="rounded-xl border border-slate-200 bg-white p-3 text-xs flex items-center justify-between gap-3">
      <div><p class="font-semibold text-slate-800">Pregnancy Check (PD)</p><p class="${DUE_COLOR[describeDue(pdOpen.dueAt).state]} font-semibold">${escapeHtml(describeDue(pdOpen.dueAt).text)}</p><p class="text-slate-500">${escapeHtml(dateTimeText(pdOpen.dueAt))}</p></div>
      <button type="button" data-protocol-done="${escapeHtml(pdOpen.id)}" class="btn-secondary text-xs px-3 shrink-0">Record PD result</button>
    </div>` : '';
  return `
    <section class="space-y-2" data-breeding-section>
      <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Breeding / Reproduction</h3>
      ${active ? activeCard(protocolView(state, active)) : ''}
      ${pd}
      ${startBtn}
      ${views.length ? `<div class="rounded-xl border border-slate-200 bg-white px-3 divide-y divide-slate-100"><p class="py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Past protocols (${views.length})</p>${views.map(historyRow).join('')}</div>`
        : !active && !pd ? '<p class="text-xs text-slate-400 italic">No breeding protocols yet.</p>' : ''}
    </section>`;
}

// ---------------------------------------------------------------- start sheet
function renderStartPreview() {
  const template = $('protocolTemplate').value;
  const day0 = $('protocolDay0').value;
  $('protocolTemplateSummary').textContent = (TEMPLATES[template] || {}).summary || '';
  const steps = buildSchedule(template, day0);
  $('protocolPreview').innerHTML = steps.length
    ? steps.map((s) => `
      <div class="flex items-start justify-between gap-3 py-1.5 text-xs">
        <span class="font-semibold text-slate-800">${Number(s.index) + 1}. ${escapeHtml(s.label)}</span>
        <span class="text-right shrink-0 text-slate-600">${escapeHtml(dateTimeText(s.dueAt))}${s.windowStart ? `<span class="block text-amber-700 font-semibold">${escapeHtml(windowText(s))}</span>` : ''}</span>
      </div>`).join('')
    : '<p class="text-xs text-slate-400 italic py-2">Pick Day 0 to see the schedule.</p>';
}

function openStart(tags = []) {
  const select = $('protocolTemplate');
  select.innerHTML = templateList().map((t) => `<option value="${escapeHtml(t.key)}">${escapeHtml(t.name)}</option>`).join('');
  const base = new Date();
  base.setMinutes(0, 0, 0);
  base.setHours(base.getHours() + 1);
  $('protocolDay0').value = formatLocal(base);
  const cattle = listAnimals(state).filter((p) => ['milker', 'wachi', 'other'].includes(p.kind) && !p.sold);
  const chosen = new Set(tags);
  $('protocolAnimals').innerHTML = cattle.length
    ? cattle.map((p) => {
      const busy = Boolean(activeProtocolOf(state, p.tag));
      return `<label class="flex items-center gap-2 text-sm py-1 ${busy ? 'opacity-50' : ''}">
        <input type="checkbox" name="protocolAnimal" value="${escapeHtml(p.tag)}" ${chosen.has(p.tag) && !busy ? 'checked' : ''} ${busy ? 'disabled' : ''} class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
        <span>${escapeHtml(p.tag)}${busy ? ' <span class="text-xs text-slate-500">(already in a protocol)</span>' : ''}</span></label>`;
    }).join('')
    : '<p class="text-xs text-slate-400 italic">Add a cow in Milkers or a heifer in Wachi first.</p>';
  $('protocolStartError').classList.add('hidden');
  renderStartPreview();
  openSheet('protocolStartSheet');
}

// ---------------------------------------------------------------- confirm sheet
function sireOptions() {
  return [...new Set(state.breedingRecords.map((r) => r.semenBull).filter(Boolean))]
    .map((s) => `<option value="${escapeHtml(s)}"></option>`).join('');
}

function openAction(action, ctx) {
  pending = { action, ...ctx };
  const titles = { ftai: 'Final AI (FTAI)', early: 'Early Heat / Breed Now', pd: 'Pregnancy Check (PD) Result' };
  const intros = {
    ftai: 'Record the AI. A pregnancy check is scheduled for 30 to 35 days later.',
    early: 'Log the AI now. The remaining injections are cancelled.',
    pd: 'What did the vet find?'
  };
  $('protocolActionTitle').textContent = titles[action];
  $('protocolActionIntro').textContent = intros[action];
  const task = ctx.taskId ? state.healthRecords.find((h) => h.id === ctx.taskId) : null;
  const when = action === 'pd' && task ? nowLocal() : nowLocal();
  $('protocolActionFields').innerHTML = `
    <datalist id="sireOptions">${sireOptions()}</datalist>
    ${action === 'pd' ? `
      <div class="grid grid-cols-2 gap-3">
        <label class="flex items-center gap-2 text-sm rounded-xl border border-slate-200 px-3 py-2.5"><input type="radio" name="pdResult" value="pregnant" checked /> <span>Pregnant</span></label>
        <label class="flex items-center gap-2 text-sm rounded-xl border border-slate-200 px-3 py-2.5"><input type="radio" name="pdResult" value="open" /> <span>Not pregnant</span></label>
      </div>` : `
      <div>
        <label for="protocolActionSire" class="block text-xs font-semibold text-slate-700 mb-1">Bull / Semen Straw Used</label>
        <input id="protocolActionSire" list="sireOptions" autocomplete="off" type="text" maxlength="80" placeholder="e.g. Holstein Friesian #402" class="${INPUT}" />
      </div>`}
    <div>
      <label for="protocolActionWhen" class="block text-xs font-semibold text-slate-700 mb-1">${action === 'pd' ? 'Checked on' : 'AI date and time'}</label>
      <input id="protocolActionWhen" type="datetime-local" value="${escapeHtml(when)}" required class="${INPUT}" />
    </div>`;
  $('protocolActionSubmit').textContent = action === 'pd' ? 'Save PD Result' : action === 'early' ? 'Log AI and Cancel Injections' : 'Save AI';
  openSheet('protocolActionSheet');
}

function reopenProfile(tag) {
  if (pending && pending.fromProfile) document.dispatchEvent(new CustomEvent('open-profile', { detail: { tag } }));
}

export function initProtocols() {
  $('protocolTemplate').addEventListener('change', renderStartPreview);
  $('protocolDay0').addEventListener('input', renderStartPreview);
  $('protocolSelectAll').addEventListener('click', () => {
    document.querySelectorAll('#protocolAnimals input[name="protocolAnimal"]:not(:disabled)').forEach((c) => { c.checked = true; });
  });

  $('protocolStartForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const tags = [...document.querySelectorAll('#protocolAnimals input[name="protocolAnimal"]:checked')].map((c) => c.value);
    const day0 = $('protocolDay0').value;
    if (!tags.length || !parseLocal(day0)) {
      $('protocolStartError').textContent = !tags.length ? 'Pick at least one animal.' : 'Pick the date and time for Day 0.';
      $('protocolStartError').classList.remove('hidden');
      return;
    }
    const { started, skipped } = enrollProtocol(state, { tags, template: $('protocolTemplate').value, day0 });
    commit();
    showToast(started.length === 1 ? 'Protocol started!' : `Protocol started for ${started.length} animals!`);
    if (skipped.length) showToast('Some animals were already in a protocol and were skipped.', 'info');
    if (started.length === 1 && pending && pending.fromProfile) reopenProfile(started[0].animalTag);
    pending = null;
  });

  $('protocolActionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pending) return;
    const when = $('protocolActionWhen').value;
    const sire = $('protocolActionSire') ? $('protocolActionSire').value.trim() : '';
    const tag = pending.tag;
    if (pending.action === 'ftai') completeTask(state, pending.taskId, { when, sire });
    else if (pending.action === 'early') earlyHeat(state, pending.protocolId, { when, sire });
    else if (pending.action === 'pd') {
      const result = document.querySelector('input[name="pdResult"]:checked');
      completeTask(state, pending.taskId, { when, pdResult: result ? result.value : '' });
    }
    commit();
    showToast(pending.action === 'pd' ? 'PD result saved!' : 'Insemination recorded!');
    reopenProfile(tag);
    pending = null;
  });
  document.addEventListener('sheetclose', (e) => { if (e.detail.id === 'protocolActionSheet' || e.detail.id === 'protocolStartSheet') setTimeout(() => { if (!document.querySelector('.sheet:not(.hidden)')) pending = null; }, 0); });

  // buttons anywhere in the app (profile, Treatment list)
  document.addEventListener('click', (e) => {
    const start = e.target.closest('[data-protocol-start]');
    if (start) {
      const tag = start.getAttribute('data-protocol-start');
      const fromProfile = Boolean(start.closest('#profileSheet'));
      closeSheets();
      pending = { fromProfile };
      openStart(tag ? [tag] : []);
      return;
    }
    const done = e.target.closest('[data-protocol-done]');
    if (done) {
      const task = state.healthRecords.find((h) => h.id === done.getAttribute('data-protocol-done'));
      if (!task) return;
      const fromProfile = Boolean(done.closest('#profileSheet'));
      if (task.stepKey === FTAI_STEP || task.stepKey === PD_STEP) {
        closeSheets();
        openAction(task.stepKey === FTAI_STEP ? 'ftai' : 'pd', { taskId: task.id, tag: task.target, fromProfile });
      } else {
        completeTask(state, task.id, { when: nowLocal() });
        refresh();
        showToast('Step done!');
      }
      return;
    }
    const early = e.target.closest('[data-protocol-early]');
    if (early) {
      const protocol = state.protocols.find((p) => p.id === early.getAttribute('data-protocol-early'));
      if (!protocol) return;
      const fromProfile = Boolean(early.closest('#profileSheet'));
      closeSheets();
      openAction('early', { protocolId: protocol.id, tag: protocol.animalTag, fromProfile });
      return;
    }
    const skip = e.target.closest('[data-protocol-skip]');
    if (skip) {
      const task = state.healthRecords.find((h) => h.id === skip.getAttribute('data-protocol-skip'));
      if (task && skipTask(state, task.id)) { refresh(); showToast('Step skipped.'); }
      return;
    }
    const cancel = e.target.closest('[data-protocol-cancel]');
    if (cancel) {
      const protocol = state.protocols.find((p) => p.id === cancel.getAttribute('data-protocol-cancel'));
      if (!protocol) return;
      openConfirmModal(`Cancel the ${protocol.templateName} protocol?`, 'Its remaining steps are cancelled. Steps already done are kept.', () => {
        cancelProtocol(state, protocol.id, 'Cancelled');
        refresh();
        showToast('Protocol cancelled.');
      });
    }
  });
}

export { openStart };
