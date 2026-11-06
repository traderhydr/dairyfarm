// Ledgers split the cashbook into separate books. Entries without a ledger (older data, entries
// created by Wanda or Savings) belong to the built-in "General" ledger, which cannot be removed.
export const GENERAL_ID = 'general';
export const GENERAL_NAME = 'General';

/** Id of the ledger an entry belongs to; unknown or missing ledgers fall back to General. */
export function ledgerIdOf(tx, ledgers) {
  const id = tx && tx.ledgerId;
  return id && (ledgers || []).some((l) => l.id === id) ? id : GENERAL_ID;
}

/** The built-in General ledger followed by the user's own, in creation order. */
export function allLedgers(ledgers) {
  return [{ id: GENERAL_ID, name: GENERAL_NAME, builtIn: true }, ...(ledgers || [])];
}

/** Entries of one ledger, or all entries when `ledgerId` is null. */
export function entriesOf(transactions, ledgers, ledgerId) {
  if (ledgerId === null || ledgerId === undefined) return transactions || [];
  return (transactions || []).filter((t) => ledgerIdOf(t, ledgers) === ledgerId);
}

/** Income, expenses, balance and entry counts for a list of entries. */
export function totalsOf(transactions) {
  const out = { income: 0, expense: 0, net: 0, incomeCount: 0, expenseCount: 0, count: 0 };
  for (const t of transactions || []) {
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') { out.income += amount; out.incomeCount++; } else { out.expense += amount; out.expenseCount++; }
    out.count++;
  }
  out.net = out.income - out.expense;
  return out;
}

/** True when another ledger (or General) already uses this name (case-insensitive). */
export function nameTaken(ledgers, name, exceptId = null) {
  const wanted = String(name).trim().toLowerCase();
  return allLedgers(ledgers).some((l) => l.id !== exceptId && l.name.trim().toLowerCase() === wanted);
}
