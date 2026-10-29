import { sumAmounts } from '../lib/calc.js';
import { addDays, escapeHtml, formatCurrency } from '../lib/format.js';
import { state } from '../state.js';

export function renderAlerts() {
  const container = document.getElementById('alertsListContainer');
  const badge = document.getElementById('alertsCountBadge');
  const alerts = [];

  // 1. Cow AI & Pregnancy Checks (21-day heat, 60-day PD, 223-day dry-off / 283-day calving)
  state.breedingRecords.forEach(rec => {
    if (rec.pregStatus === 'Awaiting PD Check') {
      alerts.push({
        tag: 'Heat & PD Check',
        color: 'bg-amber-100 text-amber-900 border-amber-300',
        title: rec.cowTag,
        detail: `21-Day Heat Check: ${addDays(rec.aiDate, 21)} • 60-Day PD: ${addDays(rec.aiDate, 60)}`
      });
    } else if (rec.pregStatus === 'Confirmed Pregnant') {
      alerts.push({
        tag: 'Dry-Off & Calving',
        color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        title: rec.cowTag,
        detail: `Dry-Off (7th Mo): ${addDays(rec.aiDate, 223)} • Calving: ${addDays(rec.aiDate, 283)}`
      });
    }
  });

  // 2. Wachi (Heifers) Ready for 1st AI
  state.wachiList.forEach(w => {
    if (w.stage === 'Ready for 1st AI' || (w.stage === 'Growing Wachi (6–15 Months)' && (w.ageMonths >= 15 || w.weightKg >= 250))) {
      alerts.push({
        tag: 'Wachi 1st AI Ready',
        color: 'bg-sky-100 text-sky-900 border-sky-300',
        title: w.tag,
        detail: `${w.ageMonths} mo, ${w.weightKg} kg (${w.breed}) — Ready for 1st AI breeding`
      });
    }
  });

  // 3. Monthly Wanda Pending Installments
  state.wandaBatches.forEach(b => {
    const paid = sumAmounts(b.installments);
    const due = Math.max(0, (Number(b.totalBill) || 0) - paid);
    if (due > 0) {
      alerts.push({
        tag: 'Wanda Installment Due',
        color: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        title: b.monthLabel,
        detail: `${formatCurrency(due)} remaining due to ${b.supplier}`
      });
    }
  });

  // 4. Upcoming Vaccination & Deworming Boosters
  state.healthRecords.forEach(h => {
    if (h.status !== 'Booster Completed') {
      alerts.push({
        tag: 'Health / Vaccine Due',
        color: 'bg-teal-100 text-teal-900 border-teal-300',
        title: `${h.type}`,
        detail: `${h.target} • Next Due: ${addDays(h.dateGiven, Number(h.intervalDays) || 90)}`
      });
    }
  });

  // 5. Doodhi Pending Milk Receivables
  state.doodhiAccounts.forEach(d => {
    const recd = sumAmounts(d.payments);
    const rem = Math.max(0, (Number(d.totalBill) || 0) - recd);
    if (rem > 0) {
      alerts.push({
        tag: 'Doodhi Receivable',
        color: 'bg-sky-100 text-sky-900 border-sky-300',
        title: d.buyerName,
        detail: `${formatCurrency(rem)} milk balance receivable (${d.monthLabel})`
      });
    }
  });

  badge.textContent = String(alerts.length);
  container.innerHTML = '';

  if (alerts.length === 0) {
    container.innerHTML = `<div class="col-span-full text-xs text-amber-800 py-1">No pending reminders right now — all farm checks and installments are up to date!</div>`;
    return;
  }

  alerts.forEach(a => {
    const card = document.createElement('div');
    card.className = 'bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs flex flex-col justify-between gap-1';
    card.innerHTML = `
      <div class="flex items-center justify-between gap-1.5">
        <span class="font-bold text-xs text-slate-900">${escapeHtml(a.title)}</span>
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border ${a.color}">${escapeHtml(a.tag)}</span>
      </div>
      <p class="text-xs text-slate-600 leading-snug">${escapeHtml(a.detail)}</p>
    `;
    container.appendChild(card);
  });
}

export function initAlerts() {
  // Toggle Alerts Banner
  document.getElementById('toggleAlertsBtn').addEventListener('click', () => {
    const listEl = document.getElementById('alertsListContainer');
    const btnEl = document.getElementById('toggleAlertsBtn');
    const isHidden = listEl.classList.toggle('hidden');
    btnEl.textContent = isHidden ? 'Show Alerts' : 'Hide Alerts';
  });

}
