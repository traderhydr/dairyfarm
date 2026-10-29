import { escapeHtml, formatCurrency, formatDisplayDate } from '../lib/format.js';
import { commit, state } from '../state.js';
import { showToast } from '../ui/toast.js';

function updateMonthDropdown() {
  const monthSelect = document.getElementById('txMonthFilter');
  if (!monthSelect) return;
  const currentVal = monthSelect.value || 'all';
  const months = Array.from(new Set(
    state.transactions
      .map(t => (t.date || '').slice(0, 7))
      .filter(m => m.length === 7)
  )).sort().reverse();

  monthSelect.innerHTML = '<option value="all">All Months</option>' + months.map(m => {
    const [y, mo] = m.split('-');
    const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-PK', { year: 'numeric', month: 'short' });
    return `<option value="${m}" ${m === currentVal ? 'selected' : ''}>${label}</option>`;
  }).join('');
}

export function renderTransactions() {
  updateMonthDropdown();
  const filterVal = document.getElementById('txFilter').value;
  const monthEl = document.getElementById('txMonthFilter');
  const monthVal = monthEl ? monthEl.value : 'all';
  const searchEl = document.getElementById('txSearch');
  const searchVal = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const tbody = document.getElementById('txListBody');
  const emptyState = document.getElementById('txEmptyState');
  const table = document.getElementById('txTable');

  const filtered = state.transactions.filter(t => {
    const matchesType = filterVal === 'all' ? true : t.type === filterVal;
    const matchesMonth = monthVal === 'all' ? true : (t.date || '').startsWith(monthVal);
    const matchesSearch = !searchVal
      || (t.category && t.category.toLowerCase().includes(searchVal))
      || (t.note && t.note.toLowerCase().includes(searchVal))
      || (t.date && t.date.includes(searchVal));
    return matchesType && matchesMonth && matchesSearch;
  });

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    table.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  table.classList.remove('hidden');

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition';

    const isIncome = item.type === 'income';
    const badgeClass = isIncome
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-rose-100 text-rose-800';
    const amountClass = isIncome ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold';
    const sign = isIncome ? '+ ' : '- ';

    tr.innerHTML = `
      <td class="py-3 pr-3 whitespace-nowrap text-xs text-slate-600">${formatDisplayDate(item.date)}</td>
      <td class="py-3 px-2">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}">${item.category}</span>
        </div>
        ${item.note ? `<p class="text-xs text-slate-500 mt-1">${escapeHtml(item.note)}</p>` : ''}
      </td>
      <td class="py-3 px-2 text-right whitespace-nowrap ${amountClass}">${sign}${formatCurrency(item.amount)}</td>
      <td class="py-3 pl-2 text-right whitespace-nowrap">
        <button type="button" data-delete-tx="${item.id}" class="text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition">
          Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

export function renderExpenseBreakdown() {
  const container = document.getElementById('expenseBreakdownContainer');
  const marginBadge = document.getElementById('profitMarginBadge');
  if (!container || !marginBadge) return;

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};

  state.transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
      const cat = t.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    }
  });

  if (totalIncome > 0) {
    const marginPct = Math.round(((totalIncome - totalExpense) / totalIncome) * 100);
    marginBadge.textContent = (marginPct >= 0 ? `+${marginPct}% Profit Margin` : `${marginPct}% Net Deficit`);
    marginBadge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-full border ' + (
      marginPct >= 0
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-rose-50 text-rose-700 border-rose-200'
    );
  } else {
    marginBadge.textContent = 'No Income Yet';
    marginBadge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200';
  }

  container.innerHTML = '';
  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 italic">No expenses recorded yet.</p>';
    return;
  }

  entries.forEach(([cat, amt]) => {
    const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'space-y-1';
    row.innerHTML = `
      <div class="flex justify-between text-xs">
        <span class="font-medium text-slate-700">${escapeHtml(cat)}</span>
        <span class="font-semibold text-slate-900">${formatCurrency(amt)} <span class="text-slate-400 font-normal">(${pct}%)</span></span>
      </div>
      <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full bg-rose-500 rounded-full transition-all" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

export function initFinance() {
  // Add Transaction
  document.getElementById('financeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('txType').value;
    const date = document.getElementById('txDate').value;
    const category = document.getElementById('txCategory').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const note = document.getElementById('txNote').value.trim();

    if (!date || isNaN(amount) || amount <= 0) return;

    state.transactions.unshift({
      id: 'tx-' + Date.now(),
      type,
      date,
      category,
      amount,
      note
    });

    commit();
    document.getElementById('txAmount').value = '';
    document.getElementById('txNote').value = '';
    showToast('Cashbook entry saved!');
  });

  // Filter & Search Transactions
  document.getElementById('txFilter').addEventListener('change', () => {
    renderTransactions();
  });
  document.getElementById('txSearch').addEventListener('input', () => {
    renderTransactions();
  });
  document.getElementById('txMonthFilter').addEventListener('change', () => {
    renderTransactions();
  });


  // Delete Transaction (Event Delegation)
  document.getElementById('txListBody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-tx]');
    if (!btn) return;
    const id = btn.getAttribute('data-delete-tx');
    state.transactions = state.transactions.filter(t => t.id !== id);
    commit();
    showToast('Entry removed.');
  });

}
