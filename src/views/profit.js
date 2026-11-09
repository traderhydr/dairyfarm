import { dailyTotals, monthlyTotals, periodRange, rangeTotals } from '../lib/calc.js';
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
  list.innerHTML = days.length ? days.map((d) => dayRow(formatDisplayDate(d.date), d.income, d.expense, d.net)).join('')
    : '<p class="text-xs text-slate-400 italic py-2">No entries in this period.</p>';
}

function dayRow(label, income, expense, net) {
  return `
    <div class="flex items-center justify-between gap-3 py-2 text-xs">
      <div class="min-w-0">
        <p class="font-semibold text-slate-800">${escapeHtml(label)}</p>
        <p class="text-slate-500">In ${formatCurrency(income)} &middot; Out ${formatCurrency(expense)}</p>
      </div>
      <p class="font-bold whitespace-nowrap ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}">${signed(net)}</p>
    </div>`;
}

export function initProfit() {
  $('profitPeriods').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-period]');
    if (!btn) return;
    period = btn.getAttribute('data-period');
    renderProfit();
  });
}
