import { sumAmounts } from './lib/calc.js';
import { cropDisplayName, cropTotals } from './lib/crops.js';
import { saveTextFile } from './lib/files.js';
import { addDays } from './lib/format.js';
import { goalProgress } from './lib/savings.js';
import { allLedgers, ledgerIdOf } from './lib/ledgers.js';
import { importData, snapshot, state } from './state.js';
import { showToast } from './ui/toast.js';

export function exportFarmCsv() {
  const rows = [
    ['SECTION', 'DATE / AGE', 'TAG / CATEGORY', 'STATUS / TYPE', 'AMOUNT / MILK / WEIGHT', 'DETAILS / NOTES']
  ];

  const ledgerNames = new Map(allLedgers(state.ledgers).map((l) => [l.id, l.name]));
  state.transactions.forEach(t => {
    const ledger = ledgerNames.get(ledgerIdOf(t, state.ledgers));
    rows.push(['Cashbook', t.date, t.category, t.type.toUpperCase(), 'Rs. ' + t.amount, '[' + ledger + '] ' + (t.note || '')]);
  });

  state.breedingRecords.forEach(b => {
    rows.push(['Cow AI & Pregnancy', b.aiDate, b.cowTag, b.pregStatus, 'Calving: ' + addDays(b.aiDate, 283), (b.semenBull || '') + ' | ' + (b.notes || '')]);
  });

  state.wandaBatches.forEach(w => {
    const paid = sumAmounts(w.installments);
    const due = Math.max(0, (Number(w.totalBill) || 0) - paid);
    rows.push(['Monthly Wanda Stock', w.purchaseDate, w.monthLabel, 'Due: Rs. ' + due, 'Total: Rs. ' + w.totalBill + ' (' + w.bags + ' bags)', w.supplier]);
  });

  state.milkersList.forEach(m => {
    const total = (Number(m.morningMilk) || 0) + (Number(m.eveningMilk) || 0);
    rows.push(['Milkers Herd', 'Daily Yield', m.tag, m.status, total + ' L/day (' + m.morningMilk + ' AM + ' + m.eveningMilk + ' PM)', m.breed + ' | ' + (m.notes || '')]);
  });

  state.goats.forEach(g => {
    rows.push(['Goats & Sheep', (g.ageMonths || 0) + ' Months', g.tag, g.status, (g.count || 1) + ' x ' + g.species + ' (' + g.sex + ')', (g.breed || '') + ' | ' + (g.notes || '')]);
  });

  state.horses.forEach(h => {
    rows.push(['Horses', (h.ageYears || 0) + ' Years', h.name, h.status, 'Feed & care Rs. ' + (h.monthlyCost || 0) + '/month', (h.breed || '') + ' | ' + (h.purpose || '') + ' | ' + (h.notes || '')]);
  });

  state.lands.forEach(l => {
    rows.push(['Land Record', l.area + ' ' + l.unit, l.name, l.ownership === 'Theeka' ? 'Theeka (Rented)' : 'Own', l.theeka ? 'Theeka Rs. ' + l.theeka + '/year' : '', (l.owner || '') + ' | ' + (l.notes || '')]);
  });

  state.crops.forEach(c => {
    const t = cropTotals(c);
    rows.push(['Crops', c.season + ' ' + c.year, cropDisplayName(c), c.status || 'Growing', 'Cost: Rs. ' + t.cost + ' | Income: Rs. ' + t.income + ' | ' + (t.net >= 0 ? 'Profit' : 'Loss') + ': Rs. ' + Math.abs(t.net), c.area + ' ' + c.areaUnit + ' | ' + (c.ownership === 'Theeka' ? 'Theeka' : 'Own') + ' | ' + (c.notes || '')]);
  });

  state.wachiList.forEach(w => {
    rows.push(['Wachi (Heifers)', w.ageMonths + ' Months', w.tag, w.stage, w.weightKg + ' kg', w.breed + ' | ' + (w.notes || '')]);
  });

  state.healthRecords.forEach(h => {
    rows.push(['Vaccination & Health', h.dateGiven, h.target, h.type, 'Next Due: ' + addDays(h.dateGiven, Number(h.intervalDays) || 90), (h.medicine || '') + ' (Rs. ' + (h.cost || 0) + ')']);
  });

  state.cattleSales.forEach(sc => {
    const profit = (Number(sc.salePrice) || 0) - (Number(sc.totalCost) || 0);
    rows.push(['Sold Cows Log', sc.saleDate, sc.cowTag, 'Sold to: ' + sc.buyer, 'Cost: Rs. ' + sc.totalCost + ' | Sale: Rs. ' + sc.salePrice + ' | Profit: Rs. ' + profit, sc.notes || '']);
  });

  state.doodhiAccounts.forEach(d => {
    const recd = sumAmounts(d.payments);
    const rem = Math.max(0, (Number(d.totalBill) || 0) - recd);
    rows.push(['Doodhi Milk Khata', d.startDate, d.buyerName, 'Receivable: Rs. ' + rem, 'Total Bill: Rs. ' + d.totalBill + ' (' + d.liters + ' L @ Rs. ' + d.ratePerLiter + ')', d.monthLabel]);
  });

  state.savingsGoals.forEach(g => {
    const { saved, target, reached } = goalProgress(g);
    rows.push(['Savings Goals', g.targetDate || '', g.name, reached ? 'Reached' : 'In progress', 'Saved: Rs. ' + saved + ' of Rs. ' + target, g.notes || '']);
  });

  const csvContent = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  return saveTextFile('dairy_farm_records_backup.csv', csvContent, 'text/csv;charset=utf-8;')
    .then((how) => showToast(how === 'shared' ? 'Choose where to save your CSV' : 'Farm CSV backup downloaded!'))
    .catch(() => showToast('Could not save the CSV file.', 'error'));
}

export function exportFarmJsonBackup() {
  const payload = {
    app: 'Dairy Farm Manager',
    version: '1.7',
    exportedAt: new Date().toISOString(),
    ...snapshot()
  };
  return saveTextFile('dairy_farm_full_backup.json', JSON.stringify(payload, null, 2), 'application/json')
    .then((how) => showToast(how === 'shared' ? 'Choose where to save your backup' : 'Full JSON backup saved!'))
    .catch(() => showToast('Could not save the backup file.', 'error'));
}

export function initExport() {
  // Export CSV Backup
  document.getElementById('exportCsvBtn').addEventListener('click', exportFarmCsv);


  // Print Summary & Full JSON Backup / Restore
  document.getElementById('printReportBtn').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('backupJsonBtn').addEventListener('click', exportFarmJsonBackup);

  document.getElementById('restoreJsonInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(String(evt.target?.result || '{}'));
        importData(data);
        showToast('Farm backup restored successfully!');
      } catch (err) {
        showToast('Invalid backup file format.', 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
}
