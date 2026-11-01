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
    await page.locator('[data-open-sheet="financeSheet"]').click();
    await expect(sheet).toBeVisible();

    // an invalid save must not close it
    await page.locator('#financeForm').evaluate((f) => f.requestSubmit());
    await expect(sheet).toBeVisible();

    await page.locator('#txAmount').fill('1200');
    await page.locator('#financeForm button[type="submit"]').click();
    await expect(sheet).toBeHidden();
    await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 1,200');
  });

  test('sheet closes with the close button, the backdrop and Escape', async ({ page }) => {
    const sheet = page.locator('#financeSheet');
    const open = () => page.locator('[data-open-sheet="financeSheet"]').click();
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
    await page.locator('[data-open-sheet="financeSheet"]').click();
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
