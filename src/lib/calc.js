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
