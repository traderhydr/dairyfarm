/** Sum of `amount` over installment/payment lists (tolerates missing lists and bad numbers). */
export function sumAmounts(list) {
  return (list || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

/** Amount still outstanding on a bill given the payments made against it. */
export function amountDue(totalBill, payments) {
  return Math.max(0, (Number(totalBill) || 0) - sumAmounts(payments));
}

/** Percent paid (0-100); an empty bill counts as fully paid. */
export function percentPaid(totalBill, payments) {
  const total = Number(totalBill) || 0;
  return total > 0 ? Math.min(100, Math.round((sumAmounts(payments) / total) * 100)) : 100;
}

/** "12.5" / "12" - one decimal place, trailing .0 dropped. */
export function formatLiters(n) {
  return (Number(n) || 0).toFixed(1).replace(/\.0$/, '');
}

/**
 * Income/expense totals for the last `months` calendar months (oldest first, current month last).
 * @returns {{key:string, month:Date, income:number, expense:number}[]}
 */
export function monthlyTotals(transactions, now = new Date(), months = 6) {
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, month, income: 0, expense: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const t of transactions || []) {
    const bucket = byKey.get(String(t.date || '').slice(0, 7));
    if (!bucket) continue;
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') bucket.income += amount;
    else bucket.expense += amount;
  }
  return buckets;
}

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** First and last date (YYYY-MM-DD, inclusive) of a profit & loss period ending today. */
export function periodRange(period, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'today') return { from: ymd(today), to: ymd(today) };
  if (period === 'week') return { from: ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)), to: ymd(today) };
  if (period === 'year') return { from: `${today.getFullYear()}-01-01`, to: ymd(today) };
  return { from: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`, to: ymd(today) };
}

/** Income, expenses, profit/loss (net) and margin over entries dated within [from, to]. */
export function rangeTotals(transactions, from, to) {
  const out = { income: 0, expense: 0, net: 0, count: 0, margin: null };
  for (const t of transactions || []) {
    const date = String(t.date || '');
    if (date < from || date > to) continue;
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') out.income += amount; else out.expense += amount;
    out.count++;
  }
  out.net = out.income - out.expense;
  out.margin = out.income > 0 ? Math.round((out.net / out.income) * 100) : null;
  return out;
}

/** One row per day that has entries within [from, to], newest first: { date, income, expense, net }. */
export function dailyTotals(transactions, from, to) {
  const days = new Map();
  for (const t of transactions || []) {
    const date = String(t.date || '');
    if (date < from || date > to) continue;
    const row = days.get(date) || { date, income: 0, expense: 0, net: 0 };
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') row.income += amount; else row.expense += amount;
    row.net = row.income - row.expense;
    days.set(date, row);
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Total cost, total paid, balance due and bags over all Feed stock batches. */
export function wandaTotals(batches) {
  let cost = 0;
  let paid = 0;
  let bags = 0;
  for (const b of batches || []) {
    cost += Number(b.totalBill) || 0;
    paid += sumAmounts(b.installments);
    bags += Number(b.bags) || 0;
  }
  return { cost, paid, due: Math.max(0, cost - paid), bags, percent: cost > 0 ? Math.min(100, Math.round((paid / cost) * 100)) : 0, count: (batches || []).length };
}
