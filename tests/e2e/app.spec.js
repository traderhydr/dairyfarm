import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const loadSample = async (page) => {
  await page.locator('#resetDemoBtn').evaluate((el) => el.click());
  await page.locator('#modalConfirmBtn').evaluate((el) => el.click());
};
const tab = (page, id) => page.locator(`#${id}`).evaluate((el) => el.click());
const fill = (page, id, value) => page.locator(`#${id}`).evaluate((el, v) => {
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, value);
const submit = (page, id) => page.locator(`#${id}`).evaluate((el) => el.requestSubmit());

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await page.goto('/');
});

test('new users start with an empty farm', async ({ page }) => {
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 0');
  await expect(page.locator('#totalCowsCountDisplay')).toHaveText('0 total AI records');
});

test('date inputs default to today, not a hardcoded date', async ({ page }) => {
  for (const id of ['txDate', 'aiDate', 'wandaPurchaseDate', 'milkSaleDate', 'healthDateGiven', 'saleDate', 'doodhiStartDate']) {
    await expect(page.locator(`#${id}`)).toHaveValue(today());
  }
});

test('cashbook entry updates totals and survives a reload', async ({ page }) => {
  await fill(page, 'txType', 'income');
  await fill(page, 'txAmount', '5000');
  await fill(page, 'txNote', 'Morning milk');
  await submit(page, 'financeForm');
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 5,000');
  await page.reload();
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 5,000');
  await expect(page.locator('#txListBody')).toContainText('Morning milk');
});

test('sample data loads and clear-all empties it', async ({ page }) => {
  await loadSample(page);
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 14,500');
  await page.locator('#clearAllBtn').evaluate((el) => el.click());
  await page.locator('#modalConfirmBtn').evaluate((el) => el.click());
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 0');
});

test('recording a calving adds the calf to Wachi and updates the milker', async ({ page }) => {
  await loadSample(page);
  await tab(page, 'tabBreedingBtn');
  await page.locator('[data-status-cow]').first().evaluate((el) => {
    el.value = 'Calved';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await fill(page, 'calfActionSelect', 'wachi');
  await submit(page, 'calvingModalForm');
  await expect(page.locator('#wachiTabBadge')).toHaveText('3');
});

test('a Wanda installment can sync to the cashbook as an expense', async ({ page }) => {
  await loadSample(page);
  await tab(page, 'tabWandaBtn');
  await page.locator('[data-installment-form]').first().evaluate((f) => {
    f.elements.instAmount.value = '10000';
    f.requestSubmit();
  });
  await expect(page.locator('#totalExpenseDisplay')).toHaveText('Rs. 41,800');
});

test('backup JSON round-trips through restore', async ({ page }) => {
  await loadSample(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#backupJsonBtn').evaluate((el) => el.click())]);
  const path = await download.path();
  await page.locator('#clearAllBtn').evaluate((el) => el.click());
  await page.locator('#modalConfirmBtn').evaluate((el) => el.click());
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 0');
  await page.locator('#restoreJsonInput').setInputFiles(path);
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 14,500');
});

test('works fully offline after the first visit', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#totalIncomeDisplay')).toBeVisible();
  const fonts = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 16px Inter'); });
  expect(fonts).toBe(true);
});

test('shows the version and a monthly income/expense chart', async ({ page }) => {
  await expect(page.locator('#drawerVersion')).toHaveText(/v\d+\.\d+\.\d+$/);
  await page.locator('details.insights > summary').click();
  await expect(page.locator('#monthlyTrendContainer')).toContainText('No income or expenses');
  await fill(page, 'txType', 'income');
  await fill(page, 'txAmount', '2500');
  await submit(page, 'financeForm');
  await expect(page.locator('#monthlyTrendContainer svg')).toBeVisible();
  await expect(page.locator('#monthlyTrendContainer table')).toContainText('Rs. 2,500');
});

test.describe('layout', () => {
  test('forms live in a sheet opened by the + button and close after saving', async ({ page }) => {
    const sheet = page.locator('#financeSheet');
    await expect(sheet).toBeHidden();
    await page.locator('.fab[data-open-sheet=\"financeSheet\"]').click();
    await expect(sheet).toBeVisible();

    // an invalid save must not close it
    await page.locator('#financeForm').evaluate((f) => f.requestSubmit());
    await expect(sheet).toBeVisible();

    await page.locator('#txAmount').fill('1200');
    await page.locator('#financeForm button[type="submit"]').click();
    await expect(sheet).toBeHidden();
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 1,200');
  });

  test('an empty list explains itself and its button opens the add form', async ({ page }) => {
    await tab(page, 'tabMilkersBtn');
    const empty = page.locator('#milkersEmptyState');
    await expect(empty).toBeVisible();
    await expect(empty.locator('.empty-title')).toHaveText('No milking cows yet');
    await empty.locator('button').click();
    await expect(page.locator('#milkersSheet')).toBeVisible();
  });

  test('the theme is remembered between visits', async ({ page }) => {
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);
    await page.locator('#themeToggleBtn').evaluate((el) => el.click());
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    await page.reload();
    await expect(page.locator('body')).toHaveClass(/dark-mode/);
    await page.locator('#themeToggleBtn').evaluate((el) => el.click());
    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/dark-mode/);
  });

  test('sheet closes with the close button, the backdrop and Escape', async ({ page }) => {
    const sheet = page.locator('#financeSheet');
    const open = () => page.locator('.fab[data-open-sheet=\"financeSheet\"]').click();
    await open();
    await sheet.locator('.sheet-close').click();
    await expect(sheet).toBeHidden();
    await open();
    await sheet.locator('.sheet-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(sheet).toBeHidden();
    await open();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });

  test('bottom navigation has short labels and More opens the menu', async ({ page }) => {
    const labels = await page.locator('nav[aria-label="Farm Modules"] .nav-item span:not(.nav-badge)').allTextContents();
    expect(labels).toEqual(['Cashbook', 'Milkers', 'Cow AI', 'Wanda', 'More']);
    await page.locator('#openMoreBtn').click();
    await expect(page.locator('#sideMenuDrawer')).not.toHaveClass(/-translate-x-full/);
    await page.locator('#tabWachiBtn').click();
    await expect(page.locator('#wachiSection')).toBeVisible();
    await expect(page.locator('#sideMenuDrawer')).toHaveClass(/-translate-x-full/);
  });

  test('overview cards and reminders only show on the Cashbook tab', async ({ page }) => {
    await expect(page.locator('#overviewSection')).toBeVisible();
    await tab(page, 'tabMilkersBtn');
    await expect(page.locator('#overviewSection')).toBeHidden();
    await tab(page, 'tabFinanceBtn');
    await expect(page.locator('#overviewSection')).toBeVisible();
  });

  test('switching tabs closes an open form', async ({ page }) => {
    await page.locator('.fab[data-open-sheet=\"financeSheet\"]').click();
    await expect(page.locator('#financeSheet')).toBeVisible();
    await tab(page, 'tabMilkersBtn');
    await expect(page.locator('#financeSheet')).toBeHidden();
  });

  test('promoting a Wachi opens the breeding form pre-filled', async ({ page }) => {
    await loadSample(page);
    await page.locator('#openMoreBtn').click();
    await page.locator('#tabWachiBtn').click();
    await page.locator('[data-promote-wachi]').first().click();
    await expect(page.locator('#breedingSheet')).toBeVisible();
    await expect(page.locator('#cowTag')).not.toHaveValue('');
  });

  test('no horizontal scrolling on a phone', async ({ page }) => {
    await loadSample(page);
    for (const id of ['tabFinanceBtn', 'tabMilkersBtn', 'tabBreedingBtn', 'tabWandaBtn']) {
      await tab(page, id);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, id).toBeLessThanOrEqual(0);
    }
  });
});

const openSavings = async (page) => {
  await page.locator('#openMoreBtn').click();
  await page.locator('#tabSavingsBtn').click();
  await expect(page.locator('#savingsSection')).toBeVisible();
};

const addGoal = async (page, { name, target, date = '', start = '0' }) => {
  await page.locator('.fab[data-open-sheet=\"savingsSheet\"]').click();
  await page.locator('#savingsName').fill(name);
  await page.locator('#savingsTarget').fill(String(target));
  if (date) await page.locator('#savingsDate').fill(date);
  await page.locator('#savingsStart').fill(start);
  await page.locator('#savingsForm button[type="submit"]').click();
};

const contribute = async (page, amount, { cashbook = false } = {}) => {
  const form = page.locator('[data-contribution-form]').first();
  await form.locator('input[name="amount"]').fill(String(amount));
  if (cashbook) await form.locator('input[name="syncCashbook"]').check();
  await form.locator('button[type="submit"]').click();
};

const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test.describe('savings goals', () => {
  test('empty at first; a new goal shows its target and 0% progress', async ({ page }) => {
    await openSavings(page);
    await expect(page.locator('#savingsEmptyState')).toBeVisible();
    await addGoal(page, { name: 'New cow', target: 100000 });
    await expect(page.locator('#savingsSheet')).toBeHidden();
    const card = page.locator('[data-goal]').first();
    await expect(card).toContainText('New cow');
    await expect(card).toContainText('of Rs. 100,000');
    await expect(card.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '0');
    await expect(page.locator('#savingsTabBadge')).toHaveText('1');
  });

  test('adding money moves the bar, the totals and persists after a reload', async ({ page }) => {
    await openSavings(page);
    await addGoal(page, { name: 'Shed roof', target: 80000 });
    await contribute(page, 20000);
    const card = page.locator('[data-goal]').first();
    await expect(card.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '25');
    await expect(card.locator('[data-goal-saved]')).toHaveText('Rs. 20,000');
    await expect(page.locator('#savingsTotalBanner')).toHaveText('Rs. 20,000');

    await page.reload();
    await openSavings(page);
    await expect(page.locator('[data-goal] [data-goal-saved]')).toHaveText('Rs. 20,000');
  });

  test('an opening balance counts, and money can be recorded in the cashbook too', async ({ page }) => {
    await openSavings(page);
    await addGoal(page, { name: 'Feed stock', target: 50000, start: '10000' });
    await expect(page.locator('[data-goal-saved]')).toHaveText('Rs. 10,000');
    await contribute(page, 5000, { cashbook: true });
    await expect(page.locator('[data-goal-saved]')).toHaveText('Rs. 15,000');
    await tab(page, 'tabFinanceBtn');
    await expect(page.locator('#totalExpenseDisplay')).toHaveText('Rs. 5,000');
    await expect(page.locator('#txListBody')).toContainText('Saved toward Feed stock');
  });

  test('reaching the target celebrates once and closes the goal', async ({ page }) => {
    await openSavings(page);
    await addGoal(page, { name: 'Calf pen', target: 10000, start: '9000' });
    await expect(page.locator('.confetti-layer')).toHaveCount(0);
    await contribute(page, 1000);
    await expect(page.locator('.confetti-layer')).toHaveCount(1);
    const card = page.locator('[data-goal]').first();
    await expect(card).toContainText('Goal reached');
    await expect(card.locator('[data-contribution-form]')).toHaveCount(0);
    await expect(page.locator('#toastMessage')).toContainText('Goal reached: Calf pen');
  });

  test('a goal that is already funded celebrates on creation', async ({ page }) => {
    await openSavings(page);
    await addGoal(page, { name: 'Small goal', target: 5000, start: '5000' });
    await expect(page.locator('.confetti-layer')).toHaveCount(1);
  });

  test('suggests a monthly amount in the form and on the card', async ({ page }) => {
    await openSavings(page);
    await page.locator('.fab[data-open-sheet=\"savingsSheet\"]').click();
    await page.locator('#savingsTarget').fill('90000');
    await page.locator('#savingsDate').fill(inDays(95));
    await expect(page.locator('#savingsPlanPreview')).toContainText('a month');
    await page.locator('#savingsName').fill('Plan test');
    await page.locator('#savingsForm button[type="submit"]').click();
    await expect(page.locator('[data-goal]').first()).toContainText('Per month');
    await expect(page.locator('[data-goal]').first()).toContainText('days left');
  });

  test('removing an entry and deleting a goal work', async ({ page }) => {
    await openSavings(page);
    await addGoal(page, { name: 'Temp', target: 1000 });
    await contribute(page, 400);
    await page.locator('[data-delete-contribution]').first().click();
    await expect(page.locator('[data-goal-saved]')).toHaveText('Rs. 0');
    await page.locator('[data-delete-goal]').first().click();
    await expect(page.locator('[data-goal]')).toHaveCount(0);
    await expect(page.locator('#savingsEmptyState')).toBeVisible();
  });

  test('a goal due soon shows up in the Cashbook reminders', async ({ page }) => {
    await openSavings(page);
    await addGoal(page, { name: 'Due soon goal', target: 40000, date: inDays(10), start: '10000' });
    await tab(page, 'tabFinanceBtn');
    await page.locator('#toggleAlertsBtn').click();
    await expect(page.locator('#alertsListContainer')).toContainText('Due soon goal');
    await expect(page.locator('#alertsListContainer')).toContainText('10 days left');
  });

  test('sample data, backup and restore include goals', async ({ page }) => {
    await loadSample(page);
    await expect(page.locator('#savingsTabBadge')).toHaveText('2');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#backupJsonBtn').evaluate((el) => el.click())]);
    const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    expect(backup.savingsGoals).toHaveLength(2);
    await page.locator('#clearAllBtn').evaluate((el) => el.click());
    await page.locator('#modalConfirmBtn').evaluate((el) => el.click());
    await expect(page.locator('#savingsTabBadge')).toHaveText('0');
    await page.locator('#restoreJsonInput').setInputFiles(await download.path());
    await expect(page.locator('#savingsTabBadge')).toHaveText('2');
  });
});

test.describe('motion', () => {
  test('opening a tab plays the enter animation, then clears it', async ({ page }) => {
    await tab(page, 'tabMilkersBtn');
    await expect(page.locator('#milkersSection')).toHaveClass(/tab-enter/);
    await expect(page.locator('#milkersSection')).not.toHaveClass(/tab-enter/, { timeout: 3000 });
  });

  test('overview numbers end on the exact value after counting up', async ({ page }) => {
    await loadSample(page);
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 14,500');
    await expect(page.locator('#totalExpenseDisplay')).toHaveText('Rs. 31,800');
    await expect(page.locator('#netBalanceDisplay')).toHaveText('- Rs. 17,300');
  });

  test('reduced motion: no confetti and no animation delays', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openSavings(page);
    await addGoal(page, { name: 'Quiet', target: 1000, start: '1000' });
    await expect(page.locator('[data-goal]').first()).toContainText('Goal reached');
    await expect(page.locator('.confetti-layer')).toHaveCount(0);
    const duration = await page.locator('#savingsSection').evaluate((el) => getComputedStyle(el.firstElementChild).animationDuration);
    expect(parseFloat(duration)).toBeLessThan(0.05);
  });
});

test.describe('editing cashbook entries', () => {
  const addEntry = async (page, { type = 'income', amount, note = '' }) => {
    await page.locator('.fab[data-open-sheet="financeSheet"]').click();
    await fill(page, 'txType', type);
    await fill(page, 'txAmount', String(amount));
    await fill(page, 'txNote', note);
    await submit(page, 'financeForm');
    await expect(page.locator('#financeSheet')).toBeHidden();
  };
  const editFirst = (page) => page.locator('#txListBody [data-edit-tx]').first().click();

  test('the edit form opens filled in with that entry', async ({ page }) => {
    await addEntry(page, { amount: 5000, note: 'Morning milk' });
    await editFirst(page);
    await expect(page.locator('#financeSheet')).toBeVisible();
    await expect(page.locator('#financeSheetTitle')).toHaveText('Edit Entry');
    await expect(page.locator('#financeForm button[type="submit"]')).toHaveText('Save Changes');
    await expect(page.locator('#txAmount')).toHaveValue('5000');
    await expect(page.locator('#txNote')).toHaveValue('Morning milk');
    await expect(page.locator('#txType')).toHaveValue('income');
  });

  test('saving changes updates the same entry, the totals and survives a reload', async ({ page }) => {
    await addEntry(page, { amount: 5000, note: 'Morning milk' });
    await editFirst(page);
    await fill(page, 'txAmount', '6500');
    await fill(page, 'txNote', 'Morning milk (corrected)');
    await submit(page, 'financeForm');
    await expect(page.locator('#financeSheet')).toBeHidden();
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 6,500');
    await expect(page.locator('#txListBody tr')).toHaveCount(1); // edited in place, not duplicated
    await expect(page.locator('#txListBody')).toContainText('Morning milk (corrected)');
    await expect(page.locator('#toastMessage')).toHaveText('Entry updated!');

    await page.reload();
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 6,500');
  });

  test('an entry can be switched from income to expense and recategorised', async ({ page }) => {
    await addEntry(page, { amount: 700, note: 'oops' });
    await editFirst(page);
    await fill(page, 'txType', 'expense');
    await fill(page, 'txCategory', 'Vet & Medicine');
    await submit(page, 'financeForm');
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 0');
    await expect(page.locator('#totalExpenseDisplay')).toHaveText('Rs. 700');
    await expect(page.locator('#txListBody')).toContainText('Vet & Medicine');
  });

  test('an invalid edit is rejected and keeps the original', async ({ page }) => {
    await addEntry(page, { amount: 900 });
    await editFirst(page);
    await fill(page, 'txAmount', '0');
    await submit(page, 'financeForm');
    await expect(page.locator('#financeSheet')).toBeVisible();
    await page.locator('#financeSheet .sheet-close').click();
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 900');
  });

  test('closing without saving leaves no edit behind: Add starts clean', async ({ page }) => {
    await addEntry(page, { amount: 1200, note: 'keep me' });
    await editFirst(page);
    await fill(page, 'txAmount', '99999');
    await page.locator('#financeSheet .sheet-close').click();
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 1,200');

    await page.locator('.fab[data-open-sheet="financeSheet"]').click();
    await expect(page.locator('#financeSheetTitle')).toHaveText('Add Income or Expense');
    await expect(page.locator('#financeForm button[type="submit"]')).toHaveText('Save Cashbook Entry');
    await expect(page.locator('#txAmount')).toHaveValue('');
    await expect(page.locator('#txNote')).toHaveValue('');
  });

  test('Escape and switching tabs also cancel an edit', async ({ page }) => {
    await addEntry(page, { amount: 300 });
    await editFirst(page);
    await page.keyboard.press('Escape');
    await page.locator('.fab[data-open-sheet="financeSheet"]').click();
    await expect(page.locator('#financeSheetTitle')).toHaveText('Add Income or Expense');
    await page.keyboard.press('Escape');

    await editFirst(page);
    await tab(page, 'tabMilkersBtn');
    await tab(page, 'tabFinanceBtn');
    await page.locator('.fab[data-open-sheet="financeSheet"]').click();
    await expect(page.locator('#financeSheetTitle')).toHaveText('Add Income or Expense');
  });

  test('adding after an edit still creates a new entry', async ({ page }) => {
    await addEntry(page, { amount: 100, note: 'first' });
    await editFirst(page);
    await fill(page, 'txNote', 'first (edited)');
    await submit(page, 'financeForm');
    await addEntry(page, { amount: 250, note: 'second' });
    await expect(page.locator('#txListBody tr')).toHaveCount(2);
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 350');
  });

  test('an entry with an unusual category can be edited, and its text is shown as text', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('dairy_farm_v1_transactions', JSON.stringify([
        { id: 'tx-x', type: 'expense', date: '2026-10-01', category: '<img src=x onerror="window.__pwned=1">', amount: 40, note: '' }
      ]));
    });
    await page.goto('/');
    await expect(page.locator('#txListBody img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    await expect(page.locator('#txListBody')).toContainText('<img src=x');
    await editFirst(page);
    await expect(page.locator('#txCategory')).toHaveValue('<img src=x onerror="window.__pwned=1">');
    await fill(page, 'txAmount', '55');
    await submit(page, 'financeForm');
    await expect(page.locator('#totalExpenseDisplay')).toHaveText('Rs. 55');
  });
});

test.describe('ledgers', () => {
  const addEntry = async (page, { type, amount, ledger }) => {
    await page.locator('.fab[data-open-sheet="financeSheet"]').click();
    if (ledger) await fill(page, 'txLedger', ledger);
    await fill(page, 'txType', type);
    await fill(page, 'txAmount', String(amount));
    await submit(page, 'financeForm');
  };
  const newLedger = async (page, name) => {
    await page.locator('#newLedgerBtn').click();
    await fill(page, 'ledgerName', name);
    await submit(page, 'ledgerForm');
  };

  test('a fresh farm has only the General ledger', async ({ page }) => {
    await expect(page.locator('[data-open-ledger]')).toHaveCount(1);
    await expect(page.locator('[data-open-ledger="general"]')).toContainText('General');
  });

  test('home totals all ledgers; opening one shows only its own numbers', async ({ page }) => {
    await addEntry(page, { type: 'income', amount: 1000 });            // General
    await newLedger(page, 'Milk business');                              // opens the new ledger
    await expect(page.locator('#ledgerTitle')).toHaveText('Milk business');
    await addEntry(page, { type: 'income', amount: 5000 });             // defaults to the open ledger
    await addEntry(page, { type: 'expense', amount: 2000 });
    await expect(page.locator('#ledgerIncome')).toHaveText('Rs. 5,000');
    await expect(page.locator('#ledgerExpense')).toHaveText('Rs. 2,000');
    await expect(page.locator('#ledgerNet')).toHaveText('Rs. 3,000');
    await expect(page.locator('#ledgerEntryCount')).toHaveText('2');
    await expect(page.locator('#txListBody tr')).toHaveCount(2);

    await page.locator('#ledgerBackBtn').click();
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 6,000');
    await expect(page.locator('#totalExpenseDisplay')).toHaveText('Rs. 2,000');
    await expect(page.locator('#netBalanceDisplay')).toHaveText('Rs. 4,000');
    await expect(page.locator('#txListBody tr')).toHaveCount(3);
    await expect(page.locator('[data-open-ledger="general"]')).toContainText('Rs. 1,000');
    await page.locator('[data-open-ledger]', { hasText: 'Milk business' }).click();
    await expect(page.locator('#overviewSection')).toBeHidden();
  });

  test('an entry can be moved to another ledger by editing it', async ({ page }) => {
    await newLedger(page, 'Household');
    await page.locator('#ledgerBackBtn').click();
    await addEntry(page, { type: 'expense', amount: 700 });
    await page.locator('[data-edit-tx]').first().click();
    await fill(page, 'txLedger', (await page.locator('#txLedger option', { hasText: 'Household' }).getAttribute('value')));
    await submit(page, 'financeForm');
    await expect(page.locator('[data-open-ledger="general"]')).toContainText('0 entries');
    await expect(page.locator('[data-open-ledger]', { hasText: 'Household' })).toContainText('1 entry');
  });

  test('ledgers persist, can be renamed, names must be unique, and deleting keeps the entries', async ({ page }) => {
    await newLedger(page, 'Feed account');
    await addEntry(page, { type: 'expense', amount: 900 });
    await page.reload();
    await page.locator('[data-open-ledger]', { hasText: 'Feed account' }).click();
    await expect(page.locator('#ledgerExpense')).toHaveText('Rs. 900');

    await page.locator('#renameLedgerBtn').click();
    await fill(page, 'ledgerName', 'General');
    await submit(page, 'ledgerForm');
    await expect(page.locator('#ledgerNameError')).toBeVisible();
    await fill(page, 'ledgerName', 'Feed & fodder');
    await submit(page, 'ledgerForm');
    await expect(page.locator('#ledgerTitle')).toHaveText('Feed & fodder');

    await page.locator('#deleteLedgerBtn').click();
    await page.locator('#modalConfirmBtn').click();
    await expect(page.locator('#ledgersCard')).toBeVisible();
    await expect(page.locator('[data-open-ledger]')).toHaveCount(1);
    await expect(page.locator('[data-open-ledger="general"]')).toContainText('Rs. 900');
    await expect(page.locator('#totalExpenseDisplay')).toHaveText('Rs. 900');
  });

  test('the General ledger cannot be renamed or deleted', async ({ page }) => {
    await page.locator('[data-open-ledger="general"]').click();
    await expect(page.locator('#ledgerManageBtns')).toBeHidden();
  });

  test('ledger names are shown as text, and ledgers are included in backups', async ({ page }) => {
    await newLedger(page, '<b>x</b>');
    await expect(page.locator('#ledgerTitle')).toHaveText('<b>x</b>');
    await page.locator('#ledgerBackBtn').click();
    await expect(page.locator('#ledgerListContainer b')).toHaveCount(0);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dairy_farm_v1_ledgers')));
    expect(stored).toHaveLength(1);
  });
});
