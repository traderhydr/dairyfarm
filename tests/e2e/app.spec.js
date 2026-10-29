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
