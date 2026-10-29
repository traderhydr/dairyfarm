import { sumAmounts } from './lib/calc.js';
import { saveTextFile } from './lib/files.js';
import { addDays } from './lib/format.js';
import { importData, snapshot, state } from './state.js';
import { showToast } from './ui/toast.js';

export function exportFarmCsv() {
  const rows = [
    ['SECTION', 'DATE / AGE', 'TAG / CATEGORY', 'STATUS / TYPE', 'AMOUNT / MILK / WEIGHT', 'DETAILS / NOTES']
  ];

  state.transactions.forEach(t => {
    rows.push(['Cashbook', t.date, t.category, t.type.toUpperCase(), 'Rs. ' + t.amount, t.note || '']);
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

  const csvContent = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  return saveTextFile('dairy_farm_records_backup.csv', csvContent, 'text/csv;charset=utf-8;')
    .then((how) => showToast(how === 'shared' ? 'Choose where to save your CSV' : 'Farm CSV backup downloaded!'))
    .catch(() => showToast('Could not save the CSV file.'));
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
    .catch(() => showToast('Could not save the backup file.'));
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
        showToast('Invalid backup file format.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
}
