import { todayStr } from '../lib/dates.js';
import { escapeHtml, formatCurrency, formatDisplayDate } from '../lib/format.js';
import { daysLeft, goalProgress, justReached, suggestedMonthly } from '../lib/savings.js';
import { commit, state } from '../state.js';
import { animateBar, animateNumber, burstConfetti } from '../ui/motion.js';
import { showToast } from '../ui/toast.js';

const INPUT = 'rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500';
const MAX_ROWS = 5;

// what each goal looked like on the previous render, so changes can animate
const previous = new Map();

function celebrate(goal) {
  burstConfetti();
  showToast(`Goal reached: ${goal.name}!`);
}

function timeText(goal, progress) {
  if (progress.reached) return 'Completed';
  const days = daysLeft(goal);
  if (days === null) return 'No target date';
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}

function tile(label, value, tone = '') {
  const toneClasses = {
    '': 'bg-white border-slate-200/80',
    good: 'bg-emerald-50/70 border-emerald-200'
  }[tone];
  const labelColor = tone === 'good' ? 'text-emerald-700' : 'text-slate-400';
  const valueColor = tone === 'good' ? 'text-emerald-900' : 'text-slate-800';
  return `
    <div class="${toneClasses} p-2.5 rounded-lg border">
      <span class="block text-[10px] uppercase font-semibold ${labelColor}">${label}</span>
      <span class="text-xs sm:text-sm font-bold ${valueColor}">${value}</span>
    </div>`;
}

function contributionRows(goal) {
  const all = goal.contributions || [];
  if (all.length === 0) return '<p class="text-xs text-slate-400 italic py-1">Nothing saved yet. Add your first amount below.</p>';
  const recent = all.slice().reverse().slice(0, MAX_ROWS);
  const rows = recent.map((c) => `
    <div class="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200/70">
      <div>
        <span class="font-semibold text-slate-800">${formatDisplayDate(c.date)}</span>
        <span class="text-slate-500 ml-1.5">${escapeHtml(c.note || 'Saved')}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-emerald-700">+ ${formatCurrency(c.amount)}</span>
        <button type="button" data-delete-contribution="${c.id}" data-goal-id="${goal.id}" class="text-[11px] text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 transition">Remove</button>
      </div>
    </div>`).join('');
  const more = all.length - recent.length;
  return rows + (more > 0 ? `<p class="text-[11px] text-slate-400 px-1">+ ${more} earlier entr${more === 1 ? 'y' : 'ies'}</p>` : '');
}

function contributionForm(goal) {
  return `
    <form data-contribution-form="${goal.id}" class="bg-white p-3 rounded-xl border border-slate-200/90 space-y-2.5">
      <p class="text-xs font-semibold text-slate-800">Add money to this goal</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input type="date" name="date" value="${todayStr()}" required aria-label="Date" class="${INPUT}" />
        <input type="number" name="amount" min="1" step="any" inputmode="decimal" placeholder="Amount (Rs.)" required aria-label="Amount" class="${INPUT}" />
        <input type="text" name="note" placeholder="Note (optional)" aria-label="Note" class="${INPUT}" />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <label class="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
          <input type="checkbox" name="syncCashbook" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          <span>Also record in Cashbook (as a Savings expense)</span>
        </label>
        <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">+ Add to Goal</button>
      </div>
    </form>`;
}

function goalCard(goal) {
  const progress = goalProgress(goal);
  const perMonth = suggestedMonthly(goal);
  const badge = progress.reached
    ? '<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Goal reached</span>'
    : `<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">${progress.percent}% saved</span>`;
  const subtitle = goal.notes
    ? escapeHtml(goal.notes)
    : goal.targetDate ? `Target date ${formatDisplayDate(goal.targetDate)}` : 'Set aside a little at a time';

  const card = document.createElement('div');
  card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5' + (progress.reached ? ' goal-reached' : '');
  card.setAttribute('data-goal', goal.id);
  card.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-bold text-slate-900 text-sm">${escapeHtml(goal.name)}</h3>
          ${badge}
        </div>
        <p class="text-xs text-slate-500 mt-0.5">${subtitle}</p>
      </div>
      <button type="button" data-delete-goal="${goal.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">Delete</button>
    </div>

    <div>
      <div class="flex items-end justify-between gap-2">
        <p class="text-lg font-extrabold text-emerald-700"><span data-goal-saved="${goal.id}">${formatCurrency(progress.saved)}</span>
          <span class="text-xs font-medium text-slate-500">of ${formatCurrency(progress.target)}</span></p>
        <span class="text-xs font-semibold text-slate-600">${progress.percent}%</span>
      </div>
      <div class="w-full h-3 bg-slate-200 rounded-full overflow-hidden mt-1.5" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}" aria-label="${escapeHtml(goal.name)} progress">
        <div data-goal-fill="${goal.id}" class="goal-fill h-full rounded-full" style="width: ${progress.percent}%"></div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      ${tile('Still to save', formatCurrency(progress.remaining), progress.reached ? 'good' : '')}
      ${tile('Time', timeText(goal, progress))}
      ${tile('Per month', perMonth === null ? '—' : formatCurrency(perMonth))}
    </div>

    <div class="space-y-1.5">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Savings history</p>
      ${contributionRows(goal)}
    </div>

    ${progress.reached
      ? '<div class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-800 font-medium">You reached this goal. Well done!</div>'
      : contributionForm(goal)}
  `;
  return card;
}

export function renderSavings() {
  const container = document.getElementById('savingsListContainer');
  const emptyState = document.getElementById('savingsEmptyState');
  const totalBanner = document.getElementById('savingsTotalBanner');
  if (!container || !emptyState) return;

  const totalSaved = state.savingsGoals.reduce((sum, g) => sum + goalProgress(g).saved, 0);
  animateNumber(totalBanner, totalSaved, formatCurrency);

  container.innerHTML = '';
  emptyState.classList.toggle('hidden', state.savingsGoals.length > 0);

  const now = new Map();
  state.savingsGoals.forEach((goal) => {
    container.appendChild(goalCard(goal));
    const { saved, percent } = goalProgress(goal);
    now.set(goal.id, { saved, percent });

    const before = previous.get(goal.id);
    const savedEl = container.querySelector(`[data-goal-saved="${goal.id}"]`);
    if (before && before.saved !== saved) animateNumber(savedEl, saved, formatCurrency, before.saved);
    if (before && before.percent !== percent) animateBar(container.querySelector(`[data-goal-fill="${goal.id}"]`), before.percent, percent);
  });
  previous.clear();
  now.forEach((v, k) => previous.set(k, v));
}

function updatePlanPreview() {
  const target = parseFloat(document.getElementById('savingsTarget').value) || 0;
  const start = parseFloat(document.getElementById('savingsStart').value) || 0;
  const targetDate = document.getElementById('savingsDate').value;
  const el = document.getElementById('savingsPlanPreview');
  if (!target) {
    el.textContent = 'Enter a target to see your plan.';
    return;
  }
  const draft = { target, targetDate, contributions: [{ amount: start }] };
  const progress = goalProgress(draft);
  if (progress.reached) {
    el.textContent = 'You already have enough saved for this goal.';
  } else if (!targetDate) {
    el.textContent = `${formatCurrency(progress.remaining)} still to save. Add a target date to see how much to save each month.`;
  } else {
    const perMonth = suggestedMonthly(draft);
    el.textContent = perMonth === null
      ? 'That date has already passed. Pick a date in the future.'
      : `Save about ${formatCurrency(perMonth)} a month to reach ${formatCurrency(target)} by ${formatDisplayDate(targetDate)}.`;
  }
}

export function initSavings() {
  ['savingsTarget', 'savingsStart', 'savingsDate'].forEach((id) => {
    document.getElementById(id).addEventListener('input', updatePlanPreview);
  });
  updatePlanPreview();

  document.getElementById('savingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('savingsName').value.trim();
    const target = parseFloat(document.getElementById('savingsTarget').value);
    const targetDate = document.getElementById('savingsDate').value;
    const start = parseFloat(document.getElementById('savingsStart').value) || 0;
    const notes = document.getElementById('savingsNotes').value.trim();
    if (!name || isNaN(target) || target <= 0) return;

    const contributions = start > 0 ? [{ id: 'gc-' + Date.now(), date: todayStr(), amount: start, note: 'Starting balance' }] : [];
    const goal = { id: 'goal-' + Date.now(), name, target, targetDate, notes, createdDate: todayStr(), contributions };
    state.savingsGoals.unshift(goal);
    commit();

    ['savingsName', 'savingsTarget', 'savingsDate', 'savingsNotes'].forEach((id) => { document.getElementById(id).value = ''; });
    document.getElementById('savingsStart').value = '0';
    updatePlanPreview();
    if (goalProgress(goal).reached) celebrate(goal);
    else showToast('Savings goal added!');
  });

  const list = document.getElementById('savingsListContainer');

  list.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-contribution-form]');
    if (!form) return;
    e.preventDefault();

    const goal = state.savingsGoals.find((g) => g.id === form.getAttribute('data-contribution-form'));
    if (!goal) return;
    const date = form.elements.date.value;
    const amount = parseFloat(form.elements.amount.value);
    const note = form.elements.note.value.trim();
    if (!date || isNaN(amount) || amount <= 0) return;

    const before = goalProgress(goal).saved;
    goal.contributions = goal.contributions || [];
    goal.contributions.push({ id: 'gc-' + Date.now(), date, amount, note });

    if (form.elements.syncCashbook.checked) {
      state.transactions.unshift({
        id: 'tx-' + Date.now(),
        type: 'expense',
        date,
        category: 'Savings',
        amount,
        note: `Saved toward ${goal.name}${note ? ` (${note})` : ''}`
      });
    }
    commit();

    const after = goalProgress(goal).saved;
    if (justReached(before, after, Number(goal.target))) celebrate(goal);
    else showToast('Added to your savings goal!');
  });

  list.addEventListener('click', (e) => {
    const removeContribution = e.target.closest('[data-delete-contribution]');
    if (removeContribution) {
      const goal = state.savingsGoals.find((g) => g.id === removeContribution.getAttribute('data-goal-id'));
      if (goal) {
        goal.contributions = (goal.contributions || []).filter((c) => c.id !== removeContribution.getAttribute('data-delete-contribution'));
        commit();
        showToast('Entry removed.');
      }
      return;
    }

    const removeGoal = e.target.closest('[data-delete-goal]');
    if (removeGoal) {
      const id = removeGoal.getAttribute('data-delete-goal');
      state.savingsGoals = state.savingsGoals.filter((g) => g.id !== id);
      commit();
      showToast('Savings goal deleted.');
    }
  });
}
