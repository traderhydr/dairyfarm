import { formatLiters } from '../lib/calc.js';
import { formatCurrency } from '../lib/format.js';
import { animateNumber } from '../ui/motion.js';
import { state } from '../state.js';

export function renderSummary() {
  let totalIncome = 0;
  let incomeCount = 0;
  let totalExpense = 0;
  let expenseCount = 0;

  state.transactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
      incomeCount++;
    } else {
      totalExpense += amt;
      expenseCount++;
    }
  });

  const net = totalIncome - totalExpense;
  animateNumber(document.getElementById('totalIncomeDisplay'), totalIncome, formatCurrency);
  document.getElementById('incomeCountDisplay').textContent = incomeCount + (incomeCount === 1 ? ' entry' : ' entries');
  animateNumber(document.getElementById('totalExpenseDisplay'), totalExpense, formatCurrency);
  document.getElementById('expenseCountDisplay').textContent = expenseCount + (expenseCount === 1 ? ' entry' : ' entries');

  const netEl = document.getElementById('netBalanceDisplay');
  animateNumber(netEl, net, (v) => (v < 0 ? '- ' : '') + formatCurrency(Math.abs(v)));
  netEl.className = 'text-lg sm:text-xl font-extrabold mt-1.5 ' + (net >= 0 ? 'text-emerald-700' : 'text-rose-600');

  let totalWandaBill = 0;
  let totalWandaPaid = 0;
  state.wandaBatches.forEach(batch => {
    totalWandaBill += Number(batch.totalBill) || 0;
    (batch.installments || []).forEach(inst => {
      totalWandaPaid += Number(inst.amount) || 0;
    });
  });
  const wandaRemaining = Math.max(0, totalWandaBill - totalWandaPaid);
  animateNumber(document.getElementById('wandaDueDisplay'), wandaRemaining, formatCurrency);
  document.getElementById('wandaPaidSubDisplay').textContent = formatCurrency(totalWandaPaid) + ' paid so far';

  const pregnantCount = state.breedingRecords.filter(r => r.pregStatus === 'Confirmed Pregnant').length;
  document.getElementById('pregnantCountDisplay').textContent = pregnantCount + ' Pregnant';
  document.getElementById('totalCowsCountDisplay').textContent = state.breedingRecords.length + ' total AI records';

  const totalDailyMilk = state.milkersList.reduce((sum, m) => sum + (Number(m.morningMilk) || 0) + (Number(m.eveningMilk) || 0), 0);
  document.getElementById('herdMilkersDisplay').textContent = formatLiters(totalDailyMilk) + ' L/day';
  document.getElementById('herdWachiSubDisplay').textContent = `${state.milkersList.length} Milkers • ${state.wachiList.length} Wachi`;

  document.getElementById('financeTabBadge').textContent = String(state.transactions.length);
  document.getElementById('breedingTabBadge').textContent = String(state.breedingRecords.length);
  document.getElementById('wandaTabBadge').textContent = String(state.wandaBatches.length);
  document.getElementById('milkersTabBadge').textContent = String(state.milkersList.length);
  document.getElementById('wachiTabBadge').textContent = String(state.wachiList.length);
  document.getElementById('healthTabBadge').textContent = String(state.healthRecords.length);
  document.getElementById('salesTabBadge').textContent = String(state.cattleSales.length);
  document.getElementById('doodhiTabBadge').textContent = String(state.doodhiAccounts.length);
  document.getElementById('savingsTabBadge').textContent = String(state.savingsGoals.length);
}
