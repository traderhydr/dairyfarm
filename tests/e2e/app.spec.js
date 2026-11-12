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
  // skip the first-run language screen (it has its own tests); only on the first page load of a test
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__lang_init')) {
        sessionStorage.setItem('__lang_init', '1');
        if (!localStorage.getItem('dairy_farm_lang')) localStorage.setItem('dairy_farm_lang', 'en');
      }
    } catch (e) { /* ignore */ }
  });
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
    expect(labels).toEqual(['Cashbook', 'Animals', 'Cow AI', 'Wanda', 'More']);
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
    for (const id of ['tabFinanceBtn', 'tabAnimalsBtn', 'tabBreedingBtn', 'tabWandaBtn']) {
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

test.describe('editing records in every section', () => {
  const stored = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  // [tab button, edit button selector, sheet id, form id, field to change, new value, storage key, record field]
  const SECTIONS = [
    ['tabBreedingBtn', '[data-edit-cow]', 'breedingSheet', 'breedingForm', 'semenBull', 'Edited Bull', 'dairy_farm_v1_breeding', 'semenBull'],
    ['tabMilkersBtn', '[data-edit-milker-form]', 'milkersSheet', 'milkerForm', 'milkerBreed', 'Edited Breed', 'dairy_farm_v1_milkers', 'breed'],
    ['tabWachiBtn', '[data-edit-wachi]', 'wachiSheet', 'wachiForm', 'wachiBreed', 'Edited Breed', 'dairy_farm_v1_wachi', 'breed'],
    ['tabWandaBtn', '[data-edit-wanda]', 'wandaSheet', 'wandaForm', 'wandaSupplier', 'Edited Supplier', 'dairy_farm_v1_wanda', 'supplier'],
    ['tabHealthBtn', '[data-edit-health]', 'healthSheet', 'healthForm', 'healthMedicine', 'Edited Medicine', 'dairy_farm_v1_health', 'medicine'],
    ['tabSalesBtn', '[data-edit-sale]', 'salesSheet', 'salesForm', 'saleBuyer', 'Edited Buyer', 'dairy_farm_v1_sales', 'buyer'],
    ['tabDoodhiBtn', '[data-edit-doodhi]', 'doodhiSheet', 'doodhiForm', 'doodhiName', 'Edited Buyer', 'dairy_farm_v1_doodhi', 'buyerName'],
    ['tabSavingsBtn', '[data-edit-goal]', 'savingsSheet', 'savingsForm', 'savingsName', 'Edited Goal', 'dairy_farm_v1_savings', 'name']
  ];

  for (const [tabId, editSel, sheetId, formId, field, value, key, prop] of SECTIONS) {
    test(`${sheetId}: edit changes the record in place, cancel leaves the add form clean`, async ({ page }) => {
      await loadSample(page);
      await tab(page, tabId);
      const before = await stored(page, key);
      await page.locator(editSel).first().click();
      await expect(page.locator(`#${sheetId}`)).toBeVisible();
      await expect(page.locator(`#${sheetId}Title`)).toContainText('Edit');
      await expect(page.locator(`#${formId} button[type="submit"]`)).toHaveText('Save Changes');
      await fill(page, field, value);
      await submit(page, formId);
      const after = await stored(page, key);
      expect(after).toHaveLength(before.length);
      expect(after.map((r) => r[prop])).toContain(value);
      expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));

      // opening Edit then closing leaves the next "add" clean
      await page.locator(editSel).first().click();
      await page.keyboard.press('Escape');
      await expect(page.locator(`#${sheetId}Title`)).not.toContainText('Edit');
      await expect(page.locator(`#${formId} button[type="submit"]`)).not.toHaveText('Save Changes');
      await expect(page.locator(`#${field}`)).toHaveValue('');
    });
  }

  test('editing Wanda keeps its payments and recalculates the bill', async ({ page }) => {
    await loadSample(page);
    await tab(page, 'tabWandaBtn');
    const before = (await stored(page, 'dairy_farm_v1_wanda'))[0];
    await page.locator('[data-edit-wanda]').first().click();
    await expect(page.locator('#wandaInitialPaid')).toBeHidden();
    await fill(page, 'wandaBags', '10');
    await fill(page, 'wandaRatePerBag', '1000');
    await submit(page, 'wandaForm');
    const after = (await stored(page, 'dairy_farm_v1_wanda'))[0];
    expect(after.totalBill).toBe(10000);
    expect(after.installments).toEqual(before.installments);
    expect((await stored(page, 'dairy_farm_v1_transactions')).length).toBe(3);
  });

  test('editing a ledger changes its name and note; tapping a cashbook row opens it for editing', async ({ page }) => {
    await page.locator('#newLedgerBtn').click();
    await fill(page, 'ledgerName', 'Milk');
    await submit(page, 'ledgerForm');
    await page.locator('#renameLedgerBtn').click();
    await expect(page.locator('#ledgerSheetTitle')).toHaveText('Edit Ledger');
    await fill(page, 'ledgerName', 'Milk sales');
    await fill(page, 'ledgerNoteInput', 'All milk money');
    await submit(page, 'ledgerForm');
    await expect(page.locator('#ledgerTitle')).toHaveText('Milk sales');
    await expect(page.locator('#ledgerNote')).toHaveText('All milk money');

    await page.locator('.fab[data-open-sheet="financeSheet"]').click();
    await fill(page, 'txAmount', '800');
    await submit(page, 'financeForm');
    await page.locator('#txListBody tr').first().locator('td').first().click();
    await expect(page.locator('#financeSheetTitle')).toHaveText('Edit Entry');
    await expect(page.locator('#txAmount')).toHaveValue('800');
  });
});

test.describe('pregnancy days in the AI section', () => {
  const addCow = async (page, date, status) => {
    await page.locator('#tabBreedingBtn').evaluate((el) => el.click());
    await page.locator('.fab[data-open-sheet="breedingSheet"]').click();
    await fill(page, 'cowTag', 'Cow #1');
    await fill(page, 'aiDate', date);
    await fill(page, 'pregStatus', status);
    await submit(page, 'breedingForm');
  };
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  test('the form previews the pregnancy day for the chosen AI date', async ({ page }) => {
    await page.locator('#tabBreedingBtn').evaluate((el) => el.click());
    await page.locator('.fab[data-open-sheet="breedingSheet"]').click();
    await fill(page, 'aiDate', daysAgo(100));
    await expect(page.locator('#previewPregDays')).toHaveText('Day 100 of 283 (183 left)');
  });

  test('a confirmed pregnancy shows its day, days to calving and a progress bar', async ({ page }) => {
    await addCow(page, daysAgo(100), 'Confirmed Pregnant');
    const box = page.locator('[data-pregnancy-days]');
    await expect(box).toContainText('Pregnant: day 100 of 283');
    await expect(box).toContainText('183 days to calving');
    await expect(box.locator('.goal-fill')).toHaveCSS('width', /.+/);
  });

  test('an unconfirmed AI counts days since AI; overdue is flagged', async ({ page }) => {
    await addCow(page, daysAgo(10), 'Awaiting PD Check');
    await expect(page.locator('[data-pregnancy-days]')).toContainText('Since AI: day 10 of 283');
    await expect(page.locator('[data-pregnancy-days]')).toContainText('Not confirmed pregnant yet');
    await addCow(page, daysAgo(290), 'Confirmed Pregnant');
    await expect(page.locator('[data-pregnancy-days]').first()).toContainText('7 days overdue');
  });

  test('no pregnancy days for repeat or calved cows', async ({ page }) => {
    await addCow(page, daysAgo(40), 'Repeat / Not Pregnant');
    await expect(page.locator('[data-pregnancy-days]')).toHaveCount(0);
  });
});

test.describe('search boxes on the record lists', () => {
  // [tab button, search input, list container, storage key, field to search for]
  const LISTS = [
    ['tabBreedingBtn', 'breedingSearch', 'breedingListContainer', 'dairy_farm_v1_breeding', 'cowTag'],
    ['tabMilkersBtn', 'milkersSearch', 'milkersListContainer', 'dairy_farm_v1_milkers', 'tag'],
    ['tabWandaBtn', 'wandaSearch', 'wandaListContainer', 'dairy_farm_v1_wanda', 'supplier'],
    ['tabWachiBtn', 'wachiSearch', 'wachiListContainer', 'dairy_farm_v1_wachi', 'tag'],
    ['tabHealthBtn', 'healthSearch', 'healthListContainer', 'dairy_farm_v1_health', 'target'],
    ['tabSalesBtn', 'salesSearch', 'salesListContainer', 'dairy_farm_v1_sales', 'buyer'],
    ['tabDoodhiBtn', 'doodhiSearch', 'doodhiListContainer', 'dairy_farm_v1_doodhi', 'buyerName'],
    ['tabSavingsBtn', 'savingsSearch', 'savingsListContainer', 'dairy_farm_v1_savings', 'name']
  ];

  for (const [tabId, searchId, listId, key, field] of LISTS) {
    test(`${searchId}: finds a record, says when nothing matches, and clears`, async ({ page }) => {
      await loadSample(page);
      await tab(page, tabId);
      const records = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
      const total = records.length;
      const word = String(records[0][field]).split(/\s+/)[0];
      const cards = page.locator(`#${listId} > *`);
      await expect(cards).toHaveCount(total);

      await fill(page, searchId, word.toUpperCase());          // not case sensitive
      const expected = records.filter((r) => JSON.stringify(Object.values(r)).toLowerCase().includes(word.toLowerCase())).length;
      await expect(cards).toHaveCount(expected);
      await expect(page.locator(`#${listId}`)).toContainText(word);

      await fill(page, searchId, 'zzzqqq');
      await expect(page.locator(`#${listId}`)).toContainText('No matches');
      await fill(page, searchId, '');
      await expect(cards).toHaveCount(total);
    });
  }

  test('search does not hide the section totals and ignores HTML in what is typed', async ({ page }) => {
    await loadSample(page);
    await tab(page, 'tabSalesBtn');
    const before = await page.locator('#salesTotalRevBanner').textContent();
    await fill(page, 'salesSearch', '<img src=x onerror=alert(1)>');
    await expect(page.locator('#salesListContainer')).toContainText('No matches');
    await expect(page.locator('#salesListContainer img')).toHaveCount(0);
    await expect(page.locator('#salesTotalRevBanner')).toHaveText(before);
  });
});

test.describe('animal profiles', () => {
  const read = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const openAnimals = async (page) => { await loadSample(page); await tab(page, 'tabAnimalsBtn'); };
  const profile = (page, tag) => page.locator(`#animalsListContainer [data-open-profile="${tag}"]`).click();

  test('the Animals tab lists every animal once, with a status', async ({ page }) => {
    await openAnimals(page);
    const cards = page.locator('#animalsListContainer [data-open-profile]');
    const tags = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-open-profile')));
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags).toContain('Cow #07 (Chandi)');
    expect(tags).toContain('Wachi #01 (Noori)');
    await expect(page.locator('#animalsTabBadge')).toHaveText(String(tags.length));
    await expect(page.locator('#animalsListContainer [data-open-profile="Cow #07 (Chandi)"]')).toContainText('Pregnant');
  });

  test('a profile shows AI history, treatments and calves for that animal only', async ({ page }) => {
    await openAnimals(page);
    await profile(page, 'Cow #07 (Chandi)');
    const body = page.locator('#profileBody');
    await expect(body.locator('#profileTitle')).toHaveText('Cow #07 (Chandi)');
    await expect(body).toContainText('AI & pregnancy history');
    await expect(body).toContainText('Mastitis (rear left quarter)');
    await expect(body).toContainText('Wachi #01 (Noori)');          // calf found from "Dam: Cow #07 Chandi"
    await expect(body).not.toContainText('Cow #14');
    // the calf's own profile names its mother
    await body.locator('[data-open-profile="Wachi #01 (Noori)"]').first().click();
    await expect(page.locator('#profileBody #profileTitle')).toHaveText('Wachi #01 (Noori)');
    await expect(page.locator('#profileBody')).toContainText('Mother');
  });

  test('search and filters narrow the Animals list', async ({ page }) => {
    await openAnimals(page);
    await fill(page, 'animalsSearch', 'noori');
    await expect(page.locator('#animalsListContainer [data-open-profile]')).toHaveCount(1);
    await fill(page, 'animalsSearch', '');
    await fill(page, 'animalsFilter', 'sold');
    await expect(page.locator('#animalsListContainer [data-open-profile]')).toHaveCount(1);   // the sample's sold cow
    await expect(page.locator('#animalsListContainer')).toContainText('Lali');
    await fill(page, 'animalsSearch', 'noori');
    await expect(page.locator('#animalsListContainer')).toContainText('No matches');
  });

  test('a calving is recorded as a baby record and links the calf to its mother', async ({ page }) => {
    await loadSample(page);
    await tab(page, 'tabBreedingBtn');
    await page.locator('[data-calve-cow]').first().click();
    await fill(page, 'calfTagInput', 'Wachi #20 (Kali)');
    await submit(page, 'calvingModalForm');
    const ai = (await read(page, 'dairy_farm_v1_breeding')).find((r) => (r.calves || []).length);
    expect(ai.calves[0].tag).toBe('Wachi #20 (Kali)');
    const calf = (await read(page, 'dairy_farm_v1_wachi')).find((w) => w.tag === 'Wachi #20 (Kali)');
    expect(calf.damTag).toBe(ai.cowTag);
    await tab(page, 'tabAnimalsBtn');
    await profile(page, ai.cowTag);
    await expect(page.locator('#profileBody')).toContainText('Wachi #20 (Kali)');
  });

  test('add a treatment from the profile; it appears in her history', async ({ page }) => {
    await openAnimals(page);
    await profile(page, 'Cow #14 (Rani)');
    await page.locator('[data-profile-action="treat"]').click();
    await expect(page.locator('#healthSheet')).toBeVisible();
    await expect(page.locator('#healthTarget')).toHaveValue('Cow #14 (Rani)');
    await fill(page, 'healthType', 'Illness Treatment');
    await fill(page, 'healthDisease', 'Foot rot');
    await submit(page, 'healthForm');
    await tab(page, 'tabAnimalsBtn');
    await profile(page, 'Cow #14 (Rani)');
    await expect(page.locator('#profileBody')).toContainText('Foot rot');
    await expect(page.locator('#profileBody')).toContainText('Illness Treatment');
  });

  const calveRani = async (page) => {
    await tab(page, 'tabBreedingBtn');
    await page.locator('[data-calve-cow]').nth(1).click();   // Cow #14 (Rani) is the second card
    await fill(page, 'calfTagInput', 'Wachi #21 (Moti)');
    await submit(page, 'calvingModalForm');
  };
  const startSale = async (page) => {
    await tab(page, 'tabAnimalsBtn');
    await profile(page, 'Cow #14 (Rani)');
    await page.locator('[data-profile-action="sell"]').click();
    await expect(page.locator('#salesSheet')).toBeVisible();
    await expect(page.locator('#saleCowTag')).toHaveValue(/Cow #14 \(Rani\)/);
    await fill(page, 'saleBuyer', 'Haji Akram');
    await fill(page, 'saleTotalCost', '200000');
    await fill(page, 'salePrice', '320000');
  };

  test('mark sold WITHOUT the calf: she leaves the herd, the calf stays', async ({ page }) => {
    await loadSample(page);
    await calveRani(page);
    await startSale(page);
    await expect(page.locator('#saleCalvesBox')).toBeVisible();
    await submit(page, 'salesForm');
    const sale = (await read(page, 'dairy_farm_v1_sales'))[0];
    expect(sale.withCalves).toBeUndefined();
    expect((await read(page, 'dairy_farm_v1_milkers')).some((m) => m.tag.includes('Rani'))).toBe(false);
    expect((await read(page, 'dairy_farm_v1_wachi')).some((w) => w.tag === 'Wachi #21 (Moti)')).toBe(true);
    await tab(page, 'tabAnimalsBtn');
    await profile(page, 'Cow #14 (Rani)');
    await expect(page.locator('#profileBody')).toContainText('Sold on');
    await expect(page.locator('#profileBody')).toContainText('without calf');
    await expect(page.locator('#profileBody')).toContainText('Wachi #21 (Moti)');   // her history is kept
    await expect(page.locator('[data-profile-action="sell"]')).toHaveCount(0);
  });

  test('mark sold WITH the calf: both leave the herd and both profiles say sold', async ({ page }) => {
    await loadSample(page);
    await calveRani(page);
    await startSale(page);
    await page.locator('#saleCalvesList input[data-calf-tag="Wachi #21 (Moti)"]').check();
    await submit(page, 'salesForm');
    const sale = (await read(page, 'dairy_farm_v1_sales'))[0];
    expect(sale.withCalves.map((c) => c.tag)).toEqual(['Wachi #21 (Moti)']);
    expect((await read(page, 'dairy_farm_v1_wachi')).some((w) => w.tag === 'Wachi #21 (Moti)')).toBe(false);
    const income = (await read(page, 'dairy_farm_v1_transactions'))[0];
    expect(income.note).toContain('with calf Wachi #21 (Moti)');
    await tab(page, 'tabSalesBtn');
    await expect(page.locator('#salesListContainer')).toContainText('Sold with calf: Wachi #21 (Moti)');

    await tab(page, 'tabAnimalsBtn');
    await profile(page, 'Cow #14 (Rani)');
    await expect(page.locator('#profileBody')).toContainText('with calf');
    await page.locator('#profileBody [data-open-profile="Wachi #21 (Moti)"]').first().click();
    await expect(page.locator('#profileBody')).toContainText('Sold with mother');
    await expect(page.locator('#profileBody')).toContainText('Haji Akram');
  });

  test('the Profile button on a Milkers card opens that cow', async ({ page }) => {
    await loadSample(page);
    await tab(page, 'tabMilkersBtn');
    await page.locator('#milkersListContainer [data-open-profile]').first().click();
    await expect(page.locator('#profileSheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#profileSheet')).toBeHidden();
  });
});

test('Animals is on the bottom bar and Milkers moved into the More menu', async ({ page }) => {
  await loadSample(page);
  await expect(page.locator('nav[aria-label="Farm Modules"] #tabAnimalsBtn')).toBeVisible();
  await expect(page.locator('nav[aria-label="Farm Modules"] #tabMilkersBtn')).toHaveCount(0);
  await page.locator('nav[aria-label="Farm Modules"] #tabAnimalsBtn').click();
  await expect(page.locator('#animalsSection')).toBeVisible();
  await expect(page.locator('#animalsListContainer [data-open-profile]').first()).toBeVisible();
  await page.locator('#openMoreBtn').click();
  await page.locator('#sideMenuDrawer #tabMilkersBtn').click();
  await expect(page.locator('#milkersSection')).toBeVisible();
  await expect(page.locator('#sideModuleBannerName')).toHaveText('Milkers');
});

test.describe('profit and loss', () => {
  const add = async (page, type, amount, date) => {
    await page.locator('.fab[data-open-sheet="financeSheet"]').click();
    await fill(page, 'txType', type);
    await fill(page, 'txAmount', String(amount));
    if (date) await fill(page, 'txDate', date);
    await submit(page, 'financeForm');
  };
  const daysAgo = (n) => {
    const d = new Date(); d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  test("today's profit, loss and margin", async ({ page }) => {
    await expect(page.locator('#profitNet')).toHaveText('Rs. 0');
    await add(page, 'income', 1000);
    await add(page, 'expense', 400);
    await expect(page.locator('#profitLabel')).toHaveText('Profit');
    await expect(page.locator('#profitNet')).toHaveText('Rs. 600');
    await expect(page.locator('#profitMargin')).toContainText('60% margin');
    await expect(page.locator('#profitIncome')).toHaveText('Rs. 1,000');
    await expect(page.locator('#profitExpense')).toHaveText('Rs. 400');
    await add(page, 'expense', 900);
    await expect(page.locator('#profitLabel')).toHaveText('Loss');
    await expect(page.locator('#profitNet')).toHaveText('- Rs. 300');
    await expect(page.locator('#profitHero')).toHaveAttribute('data-state', 'loss');
  });

  test('periods include older days only where they belong', async ({ page }) => {
    await add(page, 'income', 1000, daysAgo(3));
    await add(page, 'expense', 200, daysAgo(0));
    await expect(page.locator('#profitNet')).toHaveText('- Rs. 200');                    // today only
    await page.locator('#profitPeriods [data-period="week"]').click();
    await expect(page.locator('#profitNet')).toHaveText('Rs. 800');
    await page.locator('#profitPeriods [data-period="year"]').click();
    await expect(page.locator('#profitDaysTitle')).toHaveText('Month by month');
  });

  test('day by day lists each day with its own profit or loss', async ({ page }) => {
    await add(page, 'income', 500, daysAgo(1));
    await add(page, 'expense', 800, daysAgo(1));
    await add(page, 'income', 300, daysAgo(0));
    await page.locator('#profitPeriods [data-period="week"]').click();
    await page.locator('#profitCard .profit-days summary').click();
    const rows = page.locator('#profitDaysList > div');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Rs. 300');
    await expect(rows.nth(1)).toContainText('- Rs. 300');
  });

  test('follows the open ledger', async ({ page }) => {
    await add(page, 'income', 1000);
    await page.locator('#newLedgerBtn').click();
    await fill(page, 'ledgerName', 'Household');
    await submit(page, 'ledgerForm');
    await add(page, 'expense', 250);
    await expect(page.locator('#profitNet')).toHaveText('- Rs. 250');
    await page.locator('#ledgerBackBtn').click();
    await expect(page.locator('#profitNet')).toHaveText('Rs. 750');
  });
});

test.describe('goats, sheep and horses', () => {
  const read = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const fabFor = (page, sheet) => page.locator(`.fab[data-open-sheet="${sheet}"]`).click();

  test('add, edit, search and delete a goat', async ({ page }) => {
    await tab(page, 'tabGoatsBtn');
    await expect(page.locator('#goatsEmptyState')).toBeVisible();
    await fabFor(page, 'goatsSheet');
    await fill(page, 'goatTag', 'Goat #07 (Moti)');
    await fill(page, 'goatSpecies', 'Goat');
    await fill(page, 'goatBreed', 'Beetal');
    await fill(page, 'goatCount', '3');
    await submit(page, 'goatForm');
    await expect(page.locator('#goatsListContainer')).toContainText('Goat #07 (Moti)');
    await expect(page.locator('#goatsTotalBanner')).toHaveText('3');
    expect((await read(page, 'dairy_farm_v1_goats'))[0]).toMatchObject({ tag: 'Goat #07 (Moti)', count: 3, species: 'Goat' });

    await page.locator('[data-edit-goat]').first().click();
    await expect(page.locator('#goatsSheetTitle')).toHaveText('Edit Goat / Sheep');
    await fill(page, 'goatStatus', 'Pregnant');
    await fill(page, 'goatCount', '2');
    await submit(page, 'goatForm');
    expect((await read(page, 'dairy_farm_v1_goats'))[0]).toMatchObject({ status: 'Pregnant', count: 2 });
    await expect(page.locator('#goatsTotalBanner')).toHaveText('2');

    await fill(page, 'goatsSearch', 'zzz');
    await expect(page.locator('#goatsListContainer')).toContainText('No matches');
    await fill(page, 'goatsSearch', '');
    await page.locator('[data-delete-goat]').first().click();
    await expect(page.locator('#goatsEmptyState')).toBeVisible();
  });

  test('a goat that was sold shows its profit', async ({ page }) => {
    await tab(page, 'tabGoatsBtn');
    await fabFor(page, 'goatsSheet');
    await fill(page, 'goatTag', 'Goat #08');
    await fill(page, 'goatCost', '30000');
    await fill(page, 'goatStatus', 'Sold');
    await fill(page, 'goatSalePrice', '42000');
    await submit(page, 'goatForm');
    await expect(page.locator('#goatsListContainer')).toContainText('Profit');
    await expect(page.locator('#goatsListContainer')).toContainText('Rs. 12,000');
    await expect(page.locator('#goatsTotalBanner')).toHaveText('0');
  });

  test('add, edit and delete a horse; the monthly cost is totalled', async ({ page }) => {
    await tab(page, 'tabHorsesBtn');
    await fabFor(page, 'horsesSheet');
    await fill(page, 'horseName', 'Raja');
    await fill(page, 'horseMonthlyCost', '18000');
    await submit(page, 'horseForm');
    await expect(page.locator('#horsesCostBanner')).toHaveText('Rs. 18,000');
    await page.locator('[data-edit-horse]').first().click();
    await fill(page, 'horseName', 'Raja Jr');
    await submit(page, 'horseForm');
    expect((await read(page, 'dairy_farm_v1_horses'))[0].name).toBe('Raja Jr');
    await page.locator('[data-delete-horse]').first().click();
    await expect(page.locator('#horsesEmptyState')).toBeVisible();
  });

  test('sample data, backup and CSV include them; they appear in Animal Profiles', async ({ page }) => {
    await loadSample(page);
    expect(await read(page, 'dairy_farm_v1_goats')).toHaveLength(2);
    expect(await read(page, 'dairy_farm_v1_horses')).toHaveLength(1);
    await tab(page, 'tabAnimalsBtn');
    await expect(page.locator('#animalsListContainer')).toContainText('Raja');
    await expect(page.locator('#animalsListContainer')).toContainText('Goat #01 (Bholi)');
    await page.locator('#animalsListContainer [data-open-profile="Raja"]').click();
    await expect(page.locator('#profileBody')).toContainText('Nukra');
    await expect(page.locator('#profileBody')).not.toContainText('AI & pregnancy history');
    await expect(page.locator('[data-profile-action="ai"]')).toHaveCount(0);
  });

  test('sell a single goat from its profile: it is marked Sold with the sale price', async ({ page }) => {
    await loadSample(page);
    await tab(page, 'tabAnimalsBtn');
    await page.locator('#animalsListContainer [data-open-profile="Goat #01 (Bholi)"]').click();
    await page.locator('[data-profile-action="sell"]').click();
    await expect(page.locator('#saleCowTag')).toHaveValue('Goat #01 (Bholi)');
    await fill(page, 'saleBuyer', 'Haji Akram');
    await fill(page, 'saleTotalCost', '38000');
    await fill(page, 'salePrice', '52000');
    await submit(page, 'salesForm');
    const goat = (await read(page, 'dairy_farm_v1_goats')).find((g) => g.id === 'goat-1');
    expect(goat).toMatchObject({ status: 'Sold', salePrice: 52000 });
    await tab(page, 'tabAnimalsBtn');
    await page.locator('#animalsListContainer [data-open-profile="Goat #01 (Bholi)"]').click();
    await expect(page.locator('#profileBody')).toContainText('Sold on');
  });
});

test.describe('add and edit animals from Animal Profiles', () => {
  test('the Add animal button offers every kind and opens the right form', async ({ page }) => {
    await tab(page, 'tabAnimalsBtn');
    for (const [kind, sheet, input] of [['milker', 'milkersSheet', 'milkerTag'], ['wachi', 'wachiSheet', 'wachiTag'], ['goat', 'goatsSheet', 'goatTag'], ['horse', 'horsesSheet', 'horseName']]) {
      await page.locator('.fab[data-open-sheet="animalTypeSheet"]').click();
      await page.locator(`[data-add-animal="${kind}"]`).click();
      await expect(page.locator(`#${sheet}`)).toBeVisible();
      await expect(page.locator(`#${input}`)).toBeVisible();
      await page.keyboard.press('Escape');
      await tab(page, 'tabAnimalsBtn');
    }
  });

  test('add a milker through Add animal and see her in the profiles list', async ({ page }) => {
    await tab(page, 'tabAnimalsBtn');
    await page.locator('.fab[data-open-sheet="animalTypeSheet"]').click();
    await page.locator('[data-add-animal="milker"]').click();
    await fill(page, 'milkerTag', 'Cow #30 (Gulabo)');
    await fill(page, 'milkerBreed', 'Sahiwal');
    await fill(page, 'milkerMorning', '6');
    await fill(page, 'milkerEvening', '5');
    await submit(page, 'milkerForm');
    await tab(page, 'tabAnimalsBtn');
    await expect(page.locator('#animalsListContainer')).toContainText('Cow #30 (Gulabo)');
  });

  test('Edit inside a profile opens that animal for editing (cow, wachi, goat, horse)', async ({ page }) => {
    await loadSample(page);
    const cases = [
      ['Cow #07 (Chandi)', 'milkersSheet', 'milkerBreed', 'dairy_farm_v1_milkers', 'breed'],
      ['Wachi #01 (Noori)', 'wachiSheet', 'wachiBreed', 'dairy_farm_v1_wachi', 'breed'],
      ['Goat #01 (Bholi)', 'goatsSheet', 'goatBreed', 'dairy_farm_v1_goats', 'breed'],
      ['Raja', 'horsesSheet', 'horseBreed', 'dairy_farm_v1_horses', 'breed']
    ];
    for (const [tag, sheet, field, key, prop] of cases) {
      await tab(page, 'tabAnimalsBtn');
      await page.locator(`#animalsListContainer [data-open-profile="${tag}"]`).click();
      await page.locator('[data-profile-action="edit"]').click();
      await expect(page.locator(`#${sheet}`)).toBeVisible();
      await expect(page.locator(`#${sheet}Title`)).toContainText('Edit');
      await fill(page, field, 'Edited breed');
      await submit(page, sheet.replace('Sheet', 'Form').replace('milkersForm', 'milkerForm').replace('goatsForm', 'goatForm').replace('horsesForm', 'horseForm'));
      const list = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
      expect(list.some((r) => r[prop] === 'Edited breed')).toBe(true);
    }
  });

  test('an animal known only from AI records can be added to the herd from her profile', async ({ page }) => {
    await tab(page, 'tabBreedingBtn');
    await page.locator('.fab[data-open-sheet="breedingSheet"]').click();
    await fill(page, 'cowTag', 'Cow #77 (Zeenat)');
    await submit(page, 'breedingForm');
    await tab(page, 'tabAnimalsBtn');
    await page.locator('#animalsListContainer [data-open-profile="Cow #77 (Zeenat)"]').click();
    await expect(page.locator('#profileBody')).toContainText('not in your herd list');
    await page.locator('[data-profile-add="milker"]').click();
    await expect(page.locator('#milkerTag')).toHaveValue('Cow #77 (Zeenat)');
  });
});

test.describe('crops and land record', () => {
  const read = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const crops = (page) => page.locator('#modeToggle [data-mode="crops"]').click();

  test('the Farm / Crops toggle swaps the bottom bar and sections, and is remembered', async ({ page }) => {
    await expect(page.locator('#farmNav')).toBeVisible();
    await expect(page.locator('#cropNav')).toBeHidden();
    await crops(page);
    await expect(page.locator('#cropNav')).toBeVisible();
    await expect(page.locator('#farmNav')).toBeHidden();
    await expect(page.locator('#cropsSection')).toBeVisible();
    await expect(page.locator('#financeSection')).toBeHidden();
    await expect(page.locator('#overviewSection')).toBeHidden();
    await page.reload();
    await expect(page.locator('#cropsSection')).toBeVisible();
    await page.locator('#modeToggle [data-mode="farm"]').click();
    await expect(page.locator('#financeSection')).toBeVisible();
    await expect(page.locator('#farmNav')).toBeVisible();
    await page.reload();
    await expect(page.locator('#financeSection')).toBeVisible();
  });

  test('add own and Theeka land; the totals split them', async ({ page }) => {
    await crops(page);
    await page.locator('#cropNav #tabLandsBtn').click();
    await expect(page.locator('#landsEmptyState')).toBeVisible();
    await page.locator('.fab[data-open-sheet="landsSheet"]').click();
    await fill(page, 'landName', 'Canal field');
    await fill(page, 'landArea', '8');
    await submit(page, 'landForm');
    await page.locator('.fab[data-open-sheet="landsSheet"]').click();
    await fill(page, 'landName', 'Aslam Theeka');
    await fill(page, 'landOwnership', 'Theeka');
    await fill(page, 'landArea', '16');
    await fill(page, 'landUnit', 'Kanal');         // 2 acres
    await fill(page, 'landTheeka', '90000');
    await submit(page, 'landForm');
    await expect(page.locator('#landsTotalBanner')).toHaveText('10 acres');
    await expect(page.locator('#landsSummary')).toContainText('8 acres own');
    await expect(page.locator('#landsSummary')).toContainText('2 acres on Theeka');
    await expect(page.locator('#landsListContainer')).toContainText('Rs. 90,000');
    await page.locator('[data-edit-land]').first().click();
    await expect(page.locator('#landsSheetTitle')).toHaveText('Edit Land');
    await page.keyboard.press('Escape');
  });

  test('add a wheat crop with its costs and yield: totals, profit and per-acre figures', async ({ page }) => {
    await crops(page);
    await page.locator('.fab[data-open-sheet="cropsSheet"]').click();
    await fill(page, 'cropName', 'Wheat');
    await fill(page, 'cropArea', '4');
    await fill(page, 'cropSeedVariety', 'Akbar-19');
    await fill(page, 'cropSeedRate', '50');
    await expect(page.locator('#cropSeedNeeded')).toContainText('200 kg');
    await fill(page, 'cropWater', 'Tubewell - Solar');
    await fill(page, 'cPrep', '12000');
    await fill(page, 'cSeed', '20000');
    await fill(page, 'cFert', '30000');
    await fill(page, 'cLabour', '10000');
    await fill(page, 'cYieldQty', '160');
    await fill(page, 'cIncome', '288000');
    await submit(page, 'cropForm');

    await expect(page.locator('#cropsHeroNet')).toHaveText('Rs. 216,000');
    await expect(page.locator('#cropsHero')).toHaveAttribute('data-state', 'profit');
    await expect(page.locator('#cropsCost')).toHaveText('Rs. 72,000');
    await expect(page.locator('#cropsIncome')).toHaveText('Rs. 288,000');
    const crop = (await read(page, 'dairy_farm_v1_crops'))[0];
    expect(crop.costs).toHaveLength(4);
    expect(crop.harvests[0]).toMatchObject({ qty: 160, income: 288000 });

    await page.locator('[data-open-crop]').first().click();
    const body = page.locator('#cropDetailBody');
    await expect(body).toContainText('Profit');
    await expect(body).toContainText('Rs. 18,000');           // cost per acre
    await expect(body).toContainText('Rs. 54,000');           // profit per acre
    await expect(body).toContainText('Fertiliser');
    await expect(body).toContainText('160 Maund (40 kg)');
  });

  test('a crop that costs more than it earns shows a loss', async ({ page }) => {
    await crops(page);
    await page.locator('.fab[data-open-sheet="cropsSheet"]').click();
    await fill(page, 'cropName', 'Maize (Corn)');
    await fill(page, 'cropArea', '1');
    await fill(page, 'cLabour', '50000');
    await fill(page, 'cIncome', '20000');
    await submit(page, 'cropForm');
    await expect(page.locator('#cropsHero')).toHaveAttribute('data-state', 'loss');
    await expect(page.locator('#cropsHeroNet')).toHaveText('- Rs. 30,000');
  });

  test('"Other" needs a crop name', async ({ page }) => {
    await crops(page);
    await page.locator('.fab[data-open-sheet="cropsSheet"]').click();
    await fill(page, 'cropName', 'Other');
    await expect(page.locator('#cropOtherWrap')).toBeVisible();
    await fill(page, 'cropArea', '1');
    await submit(page, 'cropForm');
    expect(await read(page, 'dairy_farm_v1_crops')).toBeNull();
    await fill(page, 'cropOther', 'Tobacco');
    await submit(page, 'cropForm');
    await expect(page.locator('#cropsListContainer')).toContainText('Tobacco');
  });

  test('details: add, edit and remove cost lines and harvests, and the totals follow', async ({ page }) => {
    await crops(page);
    await page.locator('.fab[data-open-sheet="cropsSheet"]').click();
    await fill(page, 'cropName', 'Barseem (Egyptian Clover)');
    await fill(page, 'cropArea', '2');
    await submit(page, 'cropForm');
    await page.locator('[data-open-crop]').first().click();
    const body = page.locator('#cropDetailBody');

    const cost = body.locator('form[data-cost-form]');
    await cost.locator('select[name="category"]').selectOption('Fertiliser');
    await cost.locator('input[name="amount"]').fill('5000');
    await cost.locator('input[name="label"]').fill('2 bags urea');
    await cost.locator('button[type="submit"]').click();
    await expect(page.locator('#cropDetailSheet')).toBeVisible();          // stays open after saving
    await expect(body).toContainText('2 bags urea');
    await expect(body).toContainText('Rs. 5,000');

    await body.locator('[data-edit-line]').first().click();
    await expect(body).toContainText('Edit cost line');
    await body.locator('form[data-cost-form] input[name="amount"]').fill('6000');
    await body.locator('form[data-cost-form] button[type="submit"]').click();
    await expect(body.locator('#cropDetailHero')).toContainText('- Rs. 6,000');

    const harvest = body.locator('form[data-harvest-form]');
    await harvest.locator('input[name="qty"]').fill('12');
    await harvest.locator('select[name="unit"]').selectOption('Trolley');
    await harvest.locator('input[name="income"]').fill('15000');
    await harvest.locator('input[name="note"]').fill('1st cutting');
    await harvest.locator('button[type="submit"]').click();
    await expect(body.locator('#cropDetailHero')).toContainText('Rs. 9,000');
    await expect(body).toContainText('1st cutting');
    expect((await read(page, 'dairy_farm_v1_crops'))[0].status).toBe('Harvested');

    await body.locator('[data-del-harvest]').first().click();
    await body.locator('[data-del-line]').first().click();
    await expect(body.locator('#cropDetailHero')).toContainText('Rs. 0');
    await body.locator('[data-crop-action="status"]').click();
    expect((await read(page, 'dairy_farm_v1_crops'))[0].status).toBe('Growing');
  });

  test('choosing a Theeka land fills the area and the rent; editing keeps the costs', async ({ page }) => {
    await loadSample(page);
    await crops(page);
    await page.locator('.fab[data-open-sheet="cropsSheet"]').click();
    await fill(page, 'cropLand', 'land-2');
    await expect(page.locator('#cropArea')).toHaveValue('4');
    await expect(page.locator('#cropOwnership')).toHaveValue('Theeka');
    await expect(page.locator('#cRent')).toHaveValue('160000');
    await page.keyboard.press('Escape');

    const before = (await read(page, 'dairy_farm_v1_crops')).find((c) => c.id === 'crop-1');
    await page.locator('[data-edit-crop="crop-1"]').click();
    await expect(page.locator('#cropsSheetTitle')).toHaveText('Edit Crop');
    await expect(page.locator('#cropInitialBox')).toBeHidden();
    await fill(page, 'cropSeedVariety', 'Edited seed');
    await submit(page, 'cropForm');
    const after = (await read(page, 'dairy_farm_v1_crops')).find((c) => c.id === 'crop-1');
    expect(after.seedVariety).toBe('Edited seed');
    expect(after.costs).toEqual(before.costs);
    expect(after.harvests).toEqual(before.harvests);
  });

  test('sample data: overall profit, profit by crop, year filter, search, delete', async ({ page }) => {
    await loadSample(page);
    await crops(page);
    await expect(page.locator('#cropsHeroNet')).toHaveText('Rs. 169,400');     // 336,000 - 109,500 - 57,100
    await page.locator('#cropsSummaryCard summary').click();
    await expect(page.locator('#cropsByCrop')).toContainText('Wheat');
    await expect(page.locator('#cropsByCrop')).toContainText('Barseem');
    await fill(page, 'cropsSearch', 'barseem');
    await expect(page.locator('#cropsListContainer > div')).toHaveCount(1);
    await fill(page, 'cropsSearch', 'zzz');
    await expect(page.locator('#cropsListContainer')).toContainText('No matches');
    await fill(page, 'cropsSearch', '');
    await page.locator('[data-delete-crop="crop-2"]').click();
    await page.locator('#modalConfirmBtn').click();
    await expect(page.locator('#cropsHeroNet')).toHaveText('Rs. 226,500');
  });

  test('deleting a land keeps its crops; backups include crops and land', async ({ page }) => {
    await loadSample(page);
    await crops(page);
    await page.locator('#cropNav #tabLandsBtn').click();
    await page.locator('[data-delete-land="land-1"]').click();
    const wheat = (await read(page, 'dairy_farm_v1_crops')).find((c) => c.id === 'crop-1');
    expect(wheat.landId).toBeUndefined();
    expect(wheat.landName).toBe('Canal-side field');
    expect(await read(page, 'dairy_farm_v1_lands')).toHaveLength(1);
  });

  test('crops mode has no horizontal scrolling on a phone and the More menu shows only the app settings', async ({ page }) => {
    await loadSample(page);
    await crops(page);
    for (const id of ['tabCropsBtn', 'tabLandsBtn']) {
      await tab(page, id);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), id).toBeLessThanOrEqual(0);
    }
    await page.locator('#cropNav #openMoreBtn2').click();
    await expect(page.locator('#sideMenuDrawer')).not.toHaveClass(/-translate-x-full/);
    await expect(page.locator('#sideMenuDrawer #tabMilkersBtn')).toBeHidden();
  });
});

test.describe('Urdu and English', () => {
  const resetLang = async (page) => { await page.evaluate(() => localStorage.removeItem('dairy_farm_lang')); await page.reload(); };
  const toUrdu = async (page) => { await page.locator('#langToggleBtn').click(); await expect(page.locator('html')).toHaveAttribute('lang', 'ur'); };

  test('first run shows the language screen; choosing Urdu translates the app and is remembered', async ({ page }) => {
    await resetLang(page);
    await expect(page.locator('#languageGate')).toBeVisible();
    await page.locator('[data-choose-lang="ur"]').click();
    await expect(page.locator('#languageGate')).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
    await expect(page.locator('#tabFinanceBtn span').first()).toHaveText('کیش بک');
    await expect(page.locator('#langToggleBtn')).toHaveText('English');
    await page.reload();
    await expect(page.locator('#languageGate')).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('#tabFinanceBtn span').first()).toHaveText('کیش بک');
  });

  test('choosing English keeps the app in English and the screen does not come back', async ({ page }) => {
    await resetLang(page);
    await page.locator('[data-choose-lang="en"]').click();
    await expect(page.locator('#languageGate')).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('#tabFinanceBtn span').first()).toHaveText('Cashbook');
    await page.reload();
    await expect(page.locator('#languageGate')).toBeHidden();
  });

  test('the toggle switches language both ways without touching saved data', async ({ page }) => {
    await fill(page, 'txAmount', '5000');
    await fill(page, 'txCategory', 'Milk Sale');
    await submit(page, 'financeForm');
    await toUrdu(page);
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 5,000');          // digits and Rs. stay
    await expect(page.locator('#txListBody')).toContainText('دودھ کی فروخت');            // category shown in Urdu
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dairy_farm_v1_transactions'))[0].category);
    expect(stored).toBe('Milk Sale');                                                    // stored in English
    await page.locator('#langToggleBtn').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('#txListBody')).toContainText('Milk Sale');
    await expect(page.locator('#tabFinanceBtn span').first()).toHaveText('Cashbook');
  });

  test('everything keeps working in Urdu: add an entry, a toast in Urdu, new rows are translated', async ({ page }) => {
    await toUrdu(page);
    await page.locator('.fab[data-open-sheet="financeSheet"]').click();
    await expect(page.locator('#financeSheetTitle')).toHaveText('آمدنی یا خرچ شامل کریں');
    await fill(page, 'txAmount', '1200');
    await submit(page, 'financeForm');
    await expect(page.locator('#toastMessage')).toHaveText('کیش بک اندراج محفوظ!');
    await expect(page.locator('#netBalanceDisplay')).toHaveText('Rs. 1,200');
    await expect(page.locator('#profitLabel')).toHaveText('منافع');
  });

  test('Urdu dates, placeholders and aria labels are translated, user text is left alone', async ({ page }) => {
    await loadSample(page);
    await toUrdu(page);
    await tab(page, 'tabBreedingBtn');
    await expect(page.locator('#breedingListContainer')).toContainText('مئی');             // expected calving month in Urdu
    await expect(page.locator('#breedingListContainer')).toContainText('Cow #07 (Chandi)'); // the cow's name is untouched
    await expect(page.locator('#breedingSearch')).toHaveAttribute('placeholder', 'گائے، سانڈ، نوٹس تلاش کریں...');
    await expect(page.locator('#txSearch')).toHaveAttribute('aria-label', 'کیش بک اندراجات تلاش کریں');
  });

  test('Urdu is laid out right to left: the floating button moves left, no horizontal scrolling', async ({ page }) => {
    await loadSample(page);
    await toUrdu(page);
    const box = await page.locator('.fab[data-open-sheet="financeSheet"]').boundingBox();
    expect(box.x).toBeLessThan(100);
    for (const id of ['tabFinanceBtn', 'tabAnimalsBtn', 'tabBreedingBtn', 'tabWandaBtn', 'tabMilkersBtn', 'tabCropsBtn']) {
      await tab(page, id);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), id).toBeLessThanOrEqual(0);
    }
  });

  test('crops mode and the animal profile are translated too', async ({ page }) => {
    await loadSample(page);
    await toUrdu(page);
    await page.locator('#modeToggle [data-mode="crops"]').click();
    await expect(page.locator('#cropsHeroLabel')).toHaveText('منافع');
    await page.locator('[data-open-crop="crop-1"]').click();
    await expect(page.locator('#cropDetailBody')).toContainText('کھاد');
    await page.keyboard.press('Escape');
    await page.locator('#modeToggle [data-mode="farm"]').click();
    await tab(page, 'tabAnimalsBtn');
    await page.locator('#animalsListContainer [data-open-profile="Cow #07 (Chandi)"]').click();
    await expect(page.locator('#profileBody')).toContainText('اے آئی اور حمل کی تاریخ');
  });

  test('the side menu opens from the right in Urdu', async ({ page }) => {
    await toUrdu(page);
    await page.locator('#openSideMenuBtn').click();
    await expect(page.locator('#sideMenuDrawer')).not.toHaveClass(/-translate-x-full/);
    const box = await page.locator('#sideMenuDrawer').boundingBox();
    expect(box.x + box.width).toBeGreaterThan(300);
  });
});

test.describe('Wanda totals', () => {
  test('total cost, total paid and balance due follow the stock and its payments', async ({ page }) => {
    await tab(page, 'tabWandaBtn');
    await expect(page.locator('#wandaTotalCost')).toHaveText('Rs. 0');
    await loadSample(page);
    await tab(page, 'tabWandaBtn');
    await expect(page.locator('#wandaTotalCost')).toHaveText('Rs. 120,000');
    await expect(page.locator('#wandaTotalPaid')).toHaveText('Rs. 90,000');
    await expect(page.locator('#wandaTotalDue')).toHaveText('Rs. 30,000');
    await expect(page.locator('#wandaSummaryBags')).toContainText('30 Bags');
    await expect(page.locator('#wandaSummaryBags')).toContainText('75% Paid');

    // a second purchase adds to the totals
    await page.locator('.fab[data-open-sheet="wandaSheet"]').click();
    await fill(page, 'wandaMonth', 'November 2026 Stock');
    await fill(page, 'wandaSupplier', 'Dealer');
    await fill(page, 'wandaBags', '10');
    await fill(page, 'wandaRatePerBag', '4000');
    await fill(page, 'wandaInitialPaid', '15000');
    await submit(page, 'wandaForm');
    await expect(page.locator('#wandaTotalCost')).toHaveText('Rs. 160,000');
    await expect(page.locator('#wandaTotalPaid')).toHaveText('Rs. 105,000');
    await expect(page.locator('#wandaTotalDue')).toHaveText('Rs. 55,000');

    // paying an installment lowers the balance
    const form = page.locator('[data-installment-form]').first();
    await form.locator('input[name="instAmount"]').evaluate((el) => { el.value = '5000'; });
    await form.evaluate((f) => f.requestSubmit());
    await expect(page.locator('#wandaTotalPaid')).toHaveText('Rs. 110,000');
    await expect(page.locator('#wandaTotalDue')).toHaveText('Rs. 50,000');
  });

  test('the Wanda totals show in Urdu', async ({ page }) => {
    await loadSample(page);
    await page.locator('#langToggleBtn').click();
    await tab(page, 'tabWandaBtn');
    await expect(page.locator('#wandaSummary')).toContainText('ونڈا کا کل خرچ');
    await expect(page.locator('#wandaSummary')).toContainText('کل ادا شدہ');
    await expect(page.locator('#wandaSummaryBags')).toContainText('30 بوریاں');
  });
});

test.describe('hostile data (a restored backup or the cloud could contain anything)', () => {
  test('no field of any record can run script or inject markup, anywhere in the app', async ({ page }) => {
    const PAYLOAD = '<img src=x onerror="window.__pwned=1"><b>pwn</b>';
    await loadSample(page);
    await page.evaluate(() => {
      const h = JSON.parse(localStorage.getItem('dairy_farm_v1_health'));
      h.unshift({ id: 'ptask-x', category: 'Breeding Protocol', protocolId: 'proto-x', stepIndex: 0, stepKey: 'gnrh1', target: 'Cow #14 (Rani)', type: 'GnRH', dueAt: '2026-11-12T08:00', windowStart: '2026-11-12T08:00', windowEnd: '2026-11-12T10:00', status: 'Scheduled' });
      localStorage.setItem('dairy_farm_v1_health', JSON.stringify(h));
      localStorage.setItem('dairy_farm_v1_protocols', JSON.stringify([{ id: 'proto-x', animalTag: 'Cow #14 (Rani)', template: 'ovsynch', templateName: 'Ovsynch', day0: '2026-11-12T08:00', status: 'Active', steps: 4 },
        { id: 'proto-y', animalTag: 'Cow #14 (Rani)', template: 'ovsynch', templateName: 'Ovsynch', day0: '2026-10-01T08:00', status: 'Bred', bredVia: 'FTAI', aiAt: '2026-10-11T10:00', sire: 'x', pdResult: 'Pregnant', steps: 4 }]));
    });
    // replace every text and number in every collection with the payload (record ids stay, so the app can still find them)
    await page.evaluate((payload) => {
      const poison = (v, key) => {
        if (Array.isArray(v)) return v.map((x) => poison(x, key));
        if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'id' || k.endsWith('Id') ? x : poison(x, k)]));
        if (typeof v === 'string' || typeof v === 'number') return payload;
        return v;
      };
      for (const k of Object.keys(localStorage)) {
        if (!k.startsWith('dairy_farm_v1_')) continue;
        localStorage.setItem(k, JSON.stringify(poison(JSON.parse(localStorage.getItem(k)), k)));
      }
    }, PAYLOAD);
    await page.reload();
    await page.waitForTimeout(500);

    const ids = ['tabFinanceBtn', 'tabAnimalsBtn', 'tabBreedingBtn', 'tabWandaBtn', 'tabMilkersBtn', 'tabWachiBtn', 'tabGoatsBtn', 'tabHorsesBtn', 'tabHealthBtn', 'tabSalesBtn', 'tabDoodhiBtn', 'tabSavingsBtn'];
    for (const id of ids) await tab(page, id);
    await page.locator('#toggleAlertsBtn').evaluate((el) => el.click());
    // profiles of every animal, crop details, edit forms
    await tab(page, 'tabAnimalsBtn');
    const profiles = await page.locator('#animalsListContainer [data-open-profile]').count();
    for (let i = 0; i < profiles; i++) {
      await page.locator('#animalsListContainer [data-open-profile]').nth(i).evaluate((el) => el.click());
      await page.keyboard.press('Escape');
    }
    await page.locator('#modeToggle [data-mode="crops"]').click();
    for (const id of ['tabCropsBtn', 'tabLandsBtn']) await tab(page, id);
    await tab(page, 'tabCropsBtn');
    for (const el of await page.locator('[data-open-crop]').all()) { await el.evaluate((e) => e.click()); await page.keyboard.press('Escape'); }
    // Urdu mode runs the translator over the same content
    await page.locator('#langToggleBtn').click();
    for (const id of ['tabCropsBtn', 'tabLandsBtn']) await tab(page, id);
    await page.locator('#modeToggle [data-mode="farm"]').click();
    for (const id of ids) await tab(page, id);
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => window.__pwned), 'script ran').toBeUndefined();
    // the payload is shown as text, never as an element
    expect(await page.locator('main img[src="x"], .sheet img[src="x"]').count()).toBe(0);
    expect(await page.locator('main b, .sheet-panel b').evaluateAll((els) => els.filter((e) => e.textContent === 'pwn').length)).toBe(0);
  });
});

test.describe('confirmation tick', () => {
  test('a saved entry shows a small tick in the upper right corner instead of a text bar', async ({ page }) => {
    await fill(page, 'txAmount', '700');
    await submit(page, 'financeForm');
    const banner = page.locator('#toastBanner');
    await expect(banner).toHaveClass(/toast-tick/);
    await expect(banner).toBeVisible();
    const box = await banner.boundingBox();
    const vp = page.viewportSize();
    expect(box.width).toBeLessThan(50);
    expect(box.y).toBeLessThan(30);
    expect(box.x + box.width).toBeGreaterThan(vp.width - 40);
    await expect(page.locator('#toastMessage')).toHaveText('Cashbook entry saved!');   // kept for screen readers
    await expect(page.locator('#toastMessage')).not.toBeVisible();                      // but not drawn
    await expect(banner).toBeHidden({ timeout: 4000 });
  });

  test('a longer message that carries information still uses the text bar', async ({ page }) => {
    await loadSample(page);
    await tab(page, 'tabSalesBtn');
    await page.locator('[data-edit-sale]').first().click();
    await fill(page, 'saleBuyer', 'Someone else');
    await submit(page, 'salesForm');
    const banner = page.locator('#toastBanner');
    await expect(banner).not.toHaveClass(/toast-tick/);
    await expect(page.locator('#toastMessage')).toBeVisible();
    await expect(page.locator('#toastMessage')).toContainText('Cashbook entries already made are unchanged');
  });

  test('the tick is in the same corner in Urdu', async ({ page }) => {
    await page.locator('#langToggleBtn').click();
    await fill(page, 'txAmount', '300');
    await submit(page, 'financeForm');
    const box = await page.locator('#toastBanner').boundingBox();
    expect(box.x + box.width).toBeGreaterThan(page.viewportSize().width - 40);
  });
});

test.describe('farm profile on the home screen', () => {
  const setProfile = async (page, owner, farm, extra = {}) => {
    await page.locator('#editFarmBtn').click();
    await fill(page, 'farmOwnerInput', owner);
    await fill(page, 'farmNameInput', farm);
    if (extra.location) await fill(page, 'farmLocationInput', extra.location);
    if (extra.phone) await fill(page, 'farmPhoneInput', extra.phone);
    await submit(page, 'farmForm');
  };

  test('a new user sees an invitation, then "Hi, name" and the farm name', async ({ page }) => {
    await expect(page.locator('#farmGreeting')).toHaveText('Set up your farm');
    await expect(page.locator('#farmAvatar')).toHaveText('+');
    await page.locator('#farmCard').click();                                   // the whole card opens the form
    await expect(page.locator('#farmSheet')).toBeVisible();
    await fill(page, 'farmOwnerInput', 'Muneer');
    await fill(page, 'farmNameInput', 'Rana Cattle Farm');
    await fill(page, 'farmLocationInput', 'Chak 12, Okara');
    await fill(page, 'farmPhoneInput', '0300-1234567');
    await submit(page, 'farmForm');
    await expect(page.locator('#farmGreeting')).toHaveText('Hi, Muneer');
    await expect(page.locator('#farmName')).toHaveText('Rana Cattle Farm');
    await expect(page.locator('#farmMeta')).toHaveText('Chak 12, Okara · 0300-1234567');
    await expect(page.locator('#farmAvatar')).toHaveText('RC');
    await page.reload();
    await expect(page.locator('#farmGreeting')).toHaveText('Hi, Muneer');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dairy_farm_v1_farm')));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: 'farm', ownerName: 'Muneer', farmName: 'Rana Cattle Farm' });
  });

  test('edit the profile; with only a farm name it shows the farm name as the heading', async ({ page }) => {
    await setProfile(page, 'Muneer', 'Rana Cattle Farm');
    await page.locator('#editFarmBtn').click();
    await expect(page.locator('#farmOwnerInput')).toHaveValue('Muneer');          // opens filled in
    await fill(page, 'farmOwnerInput', '');
    await submit(page, 'farmForm');
    await expect(page.locator('#farmGreeting')).toHaveText('Rana Cattle Farm');
    await expect(page.locator('#farmName')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dairy_farm_v1_farm')).length)).toBe(1);   // edited, not duplicated
  });

  test('only on the Cashbook home screen, not in other tabs or an open ledger', async ({ page }) => {
    await expect(page.locator('#farmCard')).toBeVisible();
    await tab(page, 'tabAnimalsBtn');
    await expect(page.locator('#farmCard')).toBeHidden();
    await tab(page, 'tabFinanceBtn');
    await page.locator('[data-open-ledger="general"]').click();
    await expect(page.locator('#farmCard')).toBeHidden();
  });

  test('loading sample data or clearing records keeps who you are', async ({ page }) => {
    await setProfile(page, 'Muneer', 'Rana Cattle Farm');
    await loadSample(page);
    await expect(page.locator('#farmGreeting')).toHaveText('Hi, Muneer');
    await page.locator('#clearAllBtn').evaluate((el) => el.click());
    await page.locator('#modalConfirmBtn').evaluate((el) => el.click());
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 0');
    await expect(page.locator('#farmGreeting')).toHaveText('Hi, Muneer');
  });

  test('the greeting is translated in Urdu and the names stay as typed', async ({ page }) => {
    await setProfile(page, 'Muneer', 'Rana Cattle Farm');
    await page.locator('#langToggleBtn').click();
    await expect(page.locator('#farmGreeting')).toHaveText('السلام علیکم، Muneer');
    await expect(page.locator('#farmName')).toHaveText('Rana Cattle Farm');
  });

  test('names are shown as text, never as markup', async ({ page }) => {
    await setProfile(page, '<img src=x onerror=window.__p=1>', '<b>Farm</b>');
    await expect(page.locator('#farmCard img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__p)).toBeUndefined();
    await expect(page.locator('#farmName')).toHaveText('<b>Farm</b>');
  });
});

test.describe('breeding protocols', () => {
  const read = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const openProfile = async (page, tag) => {
    await tab(page, 'tabAnimalsBtn');
    await page.locator(`#animalsListContainer [data-open-profile="${tag}"]`).click();
  };
  const startFromProfile = async (page, tag, { template = 'ovsynch', day0 = '2026-11-12T08:00' } = {}) => {
    await openProfile(page, tag);
    await page.locator('#profileSheet [data-protocol-start]').click();
    await fill(page, 'protocolTemplate', template);
    await fill(page, 'protocolDay0', day0);
    await submit(page, 'protocolStartForm');
  };

  test('start Ovsynch from the profile: timed tasks appear in the Treatment list, progress shows in the profile', async ({ page }) => {
    await loadSample(page);
    await openProfile(page, 'Cow #14 (Rani)');
    await expect(page.locator('[data-breeding-section]')).toContainText('No breeding protocols yet');
    await page.locator('#profileSheet [data-protocol-start]').click();
    await expect(page.locator('#protocolStartSheet')).toBeVisible();
    await expect(page.locator('#protocolAnimals input:checked')).toHaveValue('Cow #14 (Rani)');   // preselected
    await fill(page, 'protocolDay0', '2026-11-12T08:00');
    await expect(page.locator('#protocolPreview')).toContainText('GnRH (1st injection)');
    await expect(page.locator('#protocolPreview')).toContainText('12 Nov, 8:00 AM');
    await expect(page.locator('#protocolPreview')).toContainText('19 Nov, 8:00 AM');           // +168 h
    await expect(page.locator('#protocolPreview')).toContainText('21 Nov, 4:00 PM');           // +224 h
    await expect(page.locator('#protocolPreview')).toContainText('22 Nov, 10:00 AM');          // +242 h
    await expect(page.locator('#protocolPreview')).toContainText('AI window 8:00 AM to 12:00 PM');
    await submit(page, 'protocolStartForm');

    await expect(page.locator('#profileSheet')).toBeVisible();                                   // back to her profile
    const card = page.locator('[data-active-protocol]');
    await expect(card).toContainText('Ovsynch');
    await expect(card).toContainText('Step 1 of 4: GnRH (1st injection)');
    await expect(card).toContainText('overdue');                                                 // Day 0 was in the past
    await expect(page.locator('#profileBody')).toContainText('In breeding protocol');

    const tasks = (await read(page, 'dairy_farm_v1_health')).filter((h) => h.category === 'Breeding Protocol');
    expect(tasks.map((t) => [t.type, t.dueAt]).sort((a, b) => a[1].localeCompare(b[1]))).toEqual([
      ['GnRH (1st injection)', '2026-11-12T08:00'], ['PGF2α', '2026-11-19T08:00'], ['GnRH (2nd injection)', '2026-11-21T16:00'], ['FTAI (timed AI)', '2026-11-22T10:00']
    ]);
    await page.keyboard.press('Escape');
    await tab(page, 'tabHealthBtn');
    await page.locator('#healthFilter [data-hfilter="protocol"]').click();
    await expect(page.locator('[data-protocol-task-card]')).toHaveCount(4);
    await expect(page.locator('[data-protocol-task-card]').first()).toContainText('GnRH (1st injection)');
    await expect(page.locator('[data-protocol-task-card]').first()).toContainText('Breeding Protocol');
    await page.locator('#healthFilter [data-hfilter="vaccine"]').click();
    await expect(page.locator('[data-protocol-task-card]')).toHaveCount(0);
  });

  test('start a batch from the Treatment section; a cow already in a protocol is not offered again', async ({ page }) => {
    await loadSample(page);
    await tab(page, 'tabHealthBtn');
    await page.locator('#healthSection [data-protocol-start]').click();
    await fill(page, 'protocolTemplate', 'cidr-synch');
    await fill(page, 'protocolDay0', '2026-11-12T08:00');
    await page.locator('#protocolAnimals input[value="Cow #07 (Chandi)"]').check();
    await page.locator('#protocolAnimals input[value="Cow #14 (Rani)"]').check();
    await submit(page, 'protocolStartForm');
    const stored = await read(page, 'dairy_farm_v1_protocols');
    expect(stored).toHaveLength(2);
    expect((await read(page, 'dairy_farm_v1_health')).filter((h) => h.category === 'Breeding Protocol')).toHaveLength(10);   // 5 steps each

    await page.locator('#healthSection [data-protocol-start]').click();
    await expect(page.locator('#protocolAnimals input[value="Cow #07 (Chandi)"]')).toBeDisabled();
    await expect(page.locator('#protocolAnimals')).toContainText('already in a protocol');
  });

  test('mark steps done, then the final AI: status, countdown and the PD reminder follow', async ({ page }) => {
    await loadSample(page);
    await startFromProfile(page, 'Wachi #01 (Noori)');
    for (let i = 0; i < 3; i++) await page.locator('[data-active-protocol] [data-protocol-done]').first().click();
    await expect(page.locator('[data-active-protocol]')).toContainText('Step 4 of 4: FTAI (timed AI)');
    await expect(page.locator('[data-active-protocol] [role="progressbar"]')).toHaveAttribute('aria-valuenow', '75');
    await page.locator('[data-active-protocol] [data-protocol-done]').click();                  // "Mark FTAI done"
    await expect(page.locator('#protocolActionSheet')).toBeVisible();
    await fill(page, 'protocolActionSire', 'Holstein Friesian #402');
    await fill(page, 'protocolActionWhen', '2026-11-22T10:15');
    await submit(page, 'protocolActionForm');

    await expect(page.locator('#profileSheet')).toBeVisible();
    await expect(page.locator('#profileBody')).toContainText('Inseminated');
    await expect(page.locator('#profileBody')).toContainText('Bred (FTAI)');
    await expect(page.locator('#profileBody')).toContainText('Holstein Friesian #402');
    await expect(page.locator('#profileBody')).toContainText('Pregnancy Check (PD)');
    const ai = (await read(page, 'dairy_farm_v1_breeding')).find((r) => r.protocolId);
    expect(ai).toMatchObject({ cowTag: 'Wachi #01 (Noori)', aiDate: '2026-11-22', semenBull: 'Holstein Friesian #402', pregStatus: 'Awaiting PD Check' });
    expect((await read(page, 'dairy_farm_v1_wachi')).find((w) => w.id === 'wachi-1').stage).toBe('Inseminated (1st AI Done)');
    const pd = (await read(page, 'dairy_farm_v1_health')).find((h) => h.stepKey === 'pd');
    expect(pd.dueAt).toBe('2026-12-24T08:00');
    // she now has an expected calving date (283 days) like any AI record
    await page.keyboard.press('Escape');
    await tab(page, 'tabBreedingBtn');
    await expect(page.locator('#breedingListContainer')).toContainText('FTAI after Ovsynch');
  });

  test('Early heat / Breed now logs the AI at once and cancels the remaining injections', async ({ page }) => {
    await loadSample(page);
    await startFromProfile(page, 'Cow #14 (Rani)', { template: 'double-ovsynch' });
    await page.locator('[data-active-protocol] [data-protocol-done]').first().click();          // first injection done
    await page.locator('[data-active-protocol] [data-protocol-early]').click();
    await expect(page.locator('#protocolActionTitle')).toHaveText('Early Heat / Breed Now');
    await fill(page, 'protocolActionSire', 'Sahiwal #9');
    await fill(page, 'protocolActionWhen', '2026-11-17T07:30');
    await submit(page, 'protocolActionForm');
    const tasks = (await read(page, 'dairy_farm_v1_health')).filter((h) => h.category === 'Breeding Protocol');
    expect(tasks.filter((t) => t.status === 'Cancelled' && t.cancelReason === 'Early heat')).toHaveLength(6);
    expect(tasks.filter((t) => t.status === 'Done')).toHaveLength(1);
    expect(tasks.find((t) => t.stepKey === 'pd').dueAt).toBe('2026-12-19T08:00');
    const protocol = (await read(page, 'dairy_farm_v1_protocols'))[0];
    expect(protocol).toMatchObject({ status: 'Bred', bredVia: 'Early heat', sire: 'Sahiwal #9' });
    await expect(page.locator('#profileBody')).toContainText('Bred (early heat)');
    await expect(page.locator('[data-active-protocol]')).toHaveCount(0);
  });

  test('record the PD result from the profile', async ({ page }) => {
    await loadSample(page);
    await startFromProfile(page, 'Wachi #01 (Noori)');
    await page.locator('[data-active-protocol] [data-protocol-early]').click();
    await submit(page, 'protocolActionForm');
    await page.locator('[data-breeding-section] [data-protocol-done]').click();                  // Record PD result
    await expect(page.locator('#protocolActionTitle')).toHaveText('Pregnancy Check (PD) Result');
    await submit(page, 'protocolActionForm');                                                    // "Pregnant" is preselected
    expect((await read(page, 'dairy_farm_v1_breeding')).find((r) => r.protocolId).pregStatus).toBe('Confirmed Pregnant');
    await expect(page.locator('#profileBody')).toContainText('PD: Pregnant');
  });

  test('cancel a protocol: open steps are cancelled and it moves to the history', async ({ page }) => {
    await loadSample(page);
    await startFromProfile(page, 'Cow #14 (Rani)');
    await page.locator('[data-active-protocol] [data-protocol-cancel]').click();
    await page.locator('#modalConfirmBtn').click();
    const tasks = (await read(page, 'dairy_farm_v1_health')).filter((h) => h.category === 'Breeding Protocol');
    expect(tasks.every((t) => t.status === 'Cancelled')).toBe(true);
    await openProfile(page, 'Cow #14 (Rani)').catch(() => {});
    await expect(page.locator('[data-breeding-section]')).toContainText('Cancelled');
    await expect(page.locator('[data-active-protocol]')).toHaveCount(0);
    await expect(page.locator('#profileSheet [data-protocol-start]')).toBeVisible();                           // she can start a new one
  });

  test('steps due soon show on the home screen with the exact time', async ({ page }) => {
    await loadSample(page);
    const soon = await page.evaluate(() => {
      const d = new Date(Date.now() + 45 * 60000); const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    });
    await startFromProfile(page, 'Cow #14 (Rani)', { day0: soon });
    await page.keyboard.press('Escape');
    await tab(page, 'tabFinanceBtn');
    await page.locator('#toggleAlertsBtn').click();
    const alert = page.locator('#alertsListContainer', { hasText: 'Breeding Protocol' });
    await expect(alert).toContainText('GnRH (1st injection)');
    await expect(alert).toContainText('due in');
  });

  test('Skip step keeps the protocol going', async ({ page }) => {
    await loadSample(page);
    await startFromProfile(page, 'Cow #14 (Rani)');
    await page.keyboard.press('Escape');
    await tab(page, 'tabHealthBtn');
    await page.locator('#healthFilter [data-hfilter="protocol"]').click();
    await page.locator('[data-protocol-skip]').first().click();
    const tasks = (await read(page, 'dairy_farm_v1_health')).filter((h) => h.category === 'Breeding Protocol');
    expect(tasks.filter((t) => t.status === 'Cancelled')).toHaveLength(1);
    expect((await read(page, 'dairy_farm_v1_protocols'))[0].status).toBe('Active');
  });

  test('goats, horses and sold animals do not get the breeding section', async ({ page }) => {
    await loadSample(page);
    await openProfile(page, 'Raja');
    await expect(page.locator('[data-breeding-section]')).toHaveCount(0);
  });
});


test.describe('breeding protocols in Urdu', () => {
  test('the protocol card, the schedule and the Treatment task are translated', async ({ page }) => {
    await loadSample(page);
    await page.locator('#langToggleBtn').click();
    await tab(page, 'tabAnimalsBtn');
    await page.locator('#animalsListContainer [data-open-profile="Cow #14 (Rani)"]').click();
    await page.locator('#profileSheet [data-protocol-start]').click();
    await expect(page.locator('#protocolStartTitle')).toHaveText('بریڈنگ پروٹوکول شروع کریں');
    await fill(page, 'protocolDay0', '2099-01-10T08:00');
    await expect(page.locator('#protocolPreview')).toContainText('GnRH (پہلا ٹیکہ)');
    await expect(page.locator('#protocolPreview')).toContainText('اے آئی کا وقت');
    await submit(page, 'protocolStartForm');
    const card = page.locator('[data-active-protocol]');
    await expect(card).toContainText('مرحلہ 1 از 4');
    await expect(card).toContainText('مرحلہ مکمل نشان زد کریں');
    await expect(card).toContainText('جلدی ہیٹ / ابھی بریڈ کریں');
    await page.keyboard.press('Escape');
    await tab(page, 'tabHealthBtn');
    await page.locator('#healthFilter [data-hfilter="protocol"]').click();
    await expect(page.locator('[data-protocol-task-card]').first()).toContainText('بریڈنگ پروٹوکول');
  });
});
