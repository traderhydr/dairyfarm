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
