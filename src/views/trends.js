import { monthlyTotals } from '../lib/calc.js';
import { formatCurrency } from '../lib/format.js';
import { state } from '../state.js';

const W = 300;
const H = 120;
const PAD = { top: 8, bottom: 18, left: 4, right: 4 };

export function renderTrends() {
  const container = document.getElementById('monthlyTrendContainer');
  if (!container) return;

  const data = monthlyTotals(state.transactions);
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]));
  if (max <= 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 italic">No income or expenses in the last 6 months.</p>';
    return;
  }

  const plotH = H - PAD.top - PAD.bottom;
  const slot = (W - PAD.left - PAD.right) / data.length;
  const barW = Math.min(16, slot / 2 - 3);
  const y = (v) => PAD.top + plotH - (v / max) * plotH;

  const bars = data.map((d, i) => {
    const cx = PAD.left + slot * i + slot / 2;
    const label = d.month.toLocaleDateString('en-PK', { month: 'short' });
    const incomeH = (d.income / max) * plotH;
    const expenseH = (d.expense / max) * plotH;
    return `
      <rect x="${(cx - barW - 1).toFixed(1)}" y="${y(d.income).toFixed(1)}" width="${barW}" height="${incomeH.toFixed(1)}" rx="2" fill="#10b981"/>
      <rect x="${(cx + 1).toFixed(1)}" y="${y(d.expense).toFixed(1)}" width="${barW}" height="${expenseH.toFixed(1)}" rx="2" fill="#f43f5e"/>
      <text x="${cx.toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="currentColor" class="text-slate-500">${label}</text>`;
  }).join('');

  const summary = data.map((d) => `${d.key}: income ${d.income}, expenses ${d.expense}`).join('; ');
  const rows = data.slice().reverse().map((d) => {
    const net = d.income - d.expense;
    const label = d.month.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
    return `
      <tr>
        <td class="py-1 pr-2 text-slate-600">${label}</td>
        <td class="py-1 px-2 text-right text-emerald-700">${formatCurrency(d.income)}</td>
        <td class="py-1 px-2 text-right text-rose-600">${formatCurrency(d.expense)}</td>
        <td class="py-1 pl-2 text-right font-semibold ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}">${net < 0 ? '- ' : ''}${formatCurrency(Math.abs(net))}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" role="img" aria-label="Monthly income and expenses for the last 6 months. ${summary}">
      <line x1="${PAD.left}" x2="${W - PAD.right}" y1="${H - PAD.bottom}" y2="${H - PAD.bottom}" stroke="#cbd5e1" stroke-width="1"/>
      ${bars}
    </svg>
    <table class="w-full text-[11px] mt-2">
      <thead><tr class="text-slate-400 uppercase text-[10px]">
        <th class="text-left font-semibold py-1 pr-2">Month</th><th class="text-right font-semibold py-1 px-2">Income</th>
        <th class="text-right font-semibold py-1 px-2">Expenses</th><th class="text-right font-semibold py-1 pl-2">Net</th>
      </tr></thead>
      <tbody class="divide-y divide-slate-100">${rows}</tbody>
    </table>`;
}
