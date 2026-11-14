import { dailyTotals, dayDetails, monthlyTotals, periodRange, rangeTotals } from '../lib/calc.js';
import { addDaysDate, todayStr } from '../lib/dates.js';
import { openSheet } from '../ui/sheets.js';
import { escapeHtml, formatCurrency, formatDisplayDate, dateLocale } from '../lib/format.js';
import { scopedTransactions } from './ledgers.js';

const $ = (id) => document.getElementById(id);
let period = 'today';

const signed = (n) => (n < 0 ? '- ' : '') + formatCurrency(Math.abs(n));

export function renderProfit() {
  if (!$('profitCard')) return;
  const txs = scopedTransactions();
  const { from, to } = periodRange(period);
  const t = rangeTotals(txs, from, to);

  document.querySelectorAll('#profitPeriods [data-period]').forEach((b) => {
    b.setAttribute('aria-selected', String(b.getAttribute('data-period') === period));
  });

  const state = t.count === 0 ? 'none' : t.net > 0 ? 'profit' : t.net < 0 ? 'loss' : 'even';
  $('profitHero').setAttribute('data-state', state);
  $('profitLabel').textContent = state === 'loss' ? 'Loss' : state === 'profit' ? 'Profit' : 'Profit / Loss';
  $('profitNet').textContent = t.count === 0 ? 'Rs. 0' : signed(t.net);
  $('profitMargin').textContent = t.count === 0
    ? 'No entries'
    : t.margin === null ? 'No income' : `${t.margin >= 0 ? '+' : ''}${t.margin}% margin`;
  $('profitIncome').textContent = formatCurrency(t.income);
  $('profitExpense').textContent = formatCurrency(t.expense);

  // Day by day (or month by month for the year view)
  const list = $('profitDaysList');
  if (period === 'year') {
    $('profitDaysTitle').textContent = 'Month by month';
    const months = monthlyTotals(txs, new Date(), new Date().getMonth() + 1).filter((m) => m.income || m.expense).reverse();
    list.innerHTML = months.length ? months.map((m) => dayRow(
      m.month.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' }), m.income, m.expense, m.income - m.expense
    )).join('') : '<p class="text-xs text-slate-400 italic py-2">No entries this year.</p>';
    return;
  }
  $('profitDaysTitle').textContent = 'Day by day';
  const days = dailyTotals(txs, from, to);
  list.innerHTML = days.length ? days.map((d) => dayRow(formatDisplayDate(d.date), d.income, d.expense, d.net, d.date)).join('')
    : '<p class="text-xs text-slate-400 italic py-2">No entries in this period.</p>';
}

function dayRow(label, income, expense, net, date = '') {
  const inner = `
      <div class="min-w-0 text-left">
        <p class="font-semibold text-slate-800">${escapeHtml(label)}</p>
        <p class="text-slate-500">In ${formatCurrency(income)} &middot; Out ${formatCurrency(expense)}</p>
      </div>
      <p class="font-bold whitespace-nowrap ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}">${net >= 0 ? '\u25B2' : '\u25BC'} ${signed(net)}${date ? ' <span class="day-chev" aria-hidden="true">&rsaquo;</span>' : ''}</p>`;
  return date
    ? `<button type="button" data-day="${escapeHtml(date)}" class="day-row flex items-center justify-between gap-3 py-2.5 text-xs w-full">${inner}</button>`
    : `<div class="flex items-center justify-between gap-3 py-2 text-xs">${inner}</div>`;
}

let shownDay = '';

/** The "what happened on this date" sheet: profit or loss at the top, then every entry. */
export function openDay(date) {
  if (!addDaysDate(date, 0)) return;
  shownDay = date;
  const d = dayDetails(scopedTransactions(), date);
  $('dayTitle').textContent = formatDisplayDate(date);
  const tone = d.entries.length === 0 ? 'none' : d.net > 0 ? 'profit' : d.net < 0 ? 'loss' : 'even';
  const entry = (t) => `
    <div class="flex items-start justify-between gap-3 py-2.5 text-xs">
      <div class="min-w-0">
        <p class="font-semibold text-slate-800">${escapeHtml(t.category || (t.type === 'income' ? 'Income' : 'Expense'))}</p>
        ${t.note ? `<p class="text-slate-500 mt-0.5">${escapeHtml(t.note)}</p>` : ''}
      </div>
      <p class="font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-700' : 'text-rose-600'}">${t.type === 'income' ? '+' : '\u2212'} ${formatCurrency(Number(t.amount) || 0)}</p>
    </div>`;
  const group = (title, type, ico) => {
    const rows = d.entries.filter((t) => t.type === type);
    return rows.length ? `<section class="space-y-1"><h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400"><span aria-hidden="true">${ico}</span> ${title} (${rows.length})</h3><div class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-3">${rows.map(entry).join('')}</div></section>` : '';
  };
  $('dayBody').innerHTML = `
    <div class="rounded-xl border p-3 flex items-center justify-between gap-3 day-hero" data-state="${tone}">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wider">${tone === 'loss' ? 'Loss' : tone === 'profit' ? 'Profit' : 'Profit / Loss'}</p>
        <p class="text-2xl font-extrabold mt-0.5">${d.entries.length ? signed(d.net) : 'Rs. 0'}</p>
      </div>
      <p class="text-xs font-semibold text-right">In ${formatCurrency(d.income)}<br />Out ${formatCurrency(d.expense)}</p>
    </div>
    ${d.entries.length ? group('Income', 'income', '\u{1F4B5}') + group('Expenses', 'expense', '\u{1F4B8}') : '<p class="text-sm text-slate-400 py-4 text-center">No entries</p>'}`;
  openSheet('daySheet');
}

export function initProfit() {
  $('profitPeriods').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-period]');
    if (!btn) return;
    period = btn.getAttribute('data-period');
    renderProfit();
  });
  $('profitDaysList').addEventListener('click', (e) => {
    const row = e.target.closest('[data-day]');
    if (row) openDay(row.getAttribute('data-day'));
  });
  $('profitPickDate').addEventListener('change', (e) => {
    if (e.target.value) openDay(e.target.value);
    e.target.value = '';
  });
  const step = (n) => { const d = addDaysDate(shownDay || todayStr(), n); if (d) openDay(todayStr(d)); };
  $('dayPrev').addEventListener('click', () => step(-1));
  $('dayNext').addEventListener('click', () => step(1));
}
