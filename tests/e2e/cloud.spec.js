import { expect, test } from '@playwright/test';

const API = 'http://localhost:54321';
const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'farmer@example.com', aud: 'authenticated', role: 'authenticated' };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeJwt = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })}.sig`;

/** Minimal Supabase backend: password auth + the farm_data row with optimistic versioning. */
async function mockSupabase(page, db) {
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/auth/v1/token') {
      db.signIns++;
      return json(200, { access_token: fakeJwt(), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'refresh', user: USER });
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
    if (url.pathname === '/auth/v1/user') return json(200, USER);

    if (url.pathname === '/rest/v1/farm_data') {
      if (req.method() === 'GET') {
        // PostgREST answers GETs with an array; supabase-js maybeSingle() unwraps it.
        return json(200, db.row ? [{ data: db.row.data, version: db.row.version }] : []);
      }
      if (req.method() === 'POST') {
        if (db.row) return json(409, { code: '23505', message: 'duplicate key' });
        const body = req.postDataJSON();
        db.row = { data: body.data, version: body.version };
        db.writes++;
        return route.fulfill({ status: 201, body: '' });
      }
      if (req.method() === 'PATCH') {
        const expected = Number(url.searchParams.get('version').replace('eq.', ''));
        if (!db.row || db.row.version !== expected) return json(200, []);
        const body = req.postDataJSON();
        db.row = { data: body.data, version: body.version };
        db.writes++;
        return json(200, [{ version: body.version }]);
      }
    }
    return json(404, { message: 'not mocked' });
  });
  await page.routeWebSocket?.(/.*/, (ws) => ws.close());
}

const fill = (page, id, value) => page.locator(`#${id}`).fill(value);

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
});

test('sign in uploads local records, and they come back after sign out + sign in', async ({ page }) => {
  const db = { row: null, writes: 0, signIns: 0 };
  await mockSupabase(page, db);
  await page.goto('/');

  // A record created before signing in must not be lost.
  await page.locator('[data-open-sheet="financeSheet"]').click();
  await page.locator('#txAmount').fill('5000');
  await page.locator('#txNote').fill('Milk before login');
  await page.locator('#financeForm').evaluate((f) => f.requestSubmit());
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 5,000');

  await expect(page.locator('#accountBtn')).toBeVisible();
  await expect(page.locator('#accountBtnLabel')).toHaveText('Sign in to back up');
  await page.locator('#accountBtn').evaluate((el) => el.click());

  // validation
  await fill(page, 'accountEmail', 'not-an-email');
  await fill(page, 'accountPassword', 'secret-pass-1');
  await page.locator('#accountSubmitBtn').click();
  await expect(page.locator('#accountError')).toContainText('valid email');

  await fill(page, 'accountEmail', USER.email);
  await page.locator('#accountSubmitBtn').click();

  await expect(page.locator('#accountUserEmail')).toHaveText(USER.email);
  await expect.poll(() => db.row?.data.transactions?.length).toBe(1);
  expect(db.row.version).toBe(1);
  await expect(page.locator('#accountBtnLabel')).toHaveText('Synced');
  await page.locator('#accountCloseBtn').click();

  // A later edit is pushed with the next version.
  await page.locator('[data-open-sheet="financeSheet"]').click();
  await page.locator('#txAmount').fill('700');
  await page.locator('#txType').selectOption('expense');
  await page.locator('#financeForm').evaluate((f) => f.requestSubmit());
  await expect.poll(() => db.row.version, { timeout: 8000 }).toBe(2);
  expect(db.row.data.transactions).toHaveLength(2);

  // Sign out clears this phone but keeps the cloud copy...
  await page.locator('#accountBtn').evaluate((el) => el.click());
  await page.locator('#accountSignOutBtn').click();
  await page.locator('#modalConfirmBtn').click();
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 0');
  expect(db.row.data.transactions).toHaveLength(2);

  // ...and signing back in restores it.
  await page.locator('#accountBtn').evaluate((el) => el.click());
  await fill(page, 'accountEmail', USER.email);
  await fill(page, 'accountPassword', 'secret-pass-1');
  await page.locator('#accountSubmitBtn').click();
  await expect(page.locator('#totalIncomeDisplay')).toHaveText('Rs. 5,000');
  await expect(page.locator('#totalExpenseDisplay')).toHaveText('Rs. 700');
});

test('create-account requires the privacy policy and a long enough password', async ({ page }) => {
  await mockSupabase(page, { row: null, writes: 0, signIns: 0 });
  await page.goto('/');
  await page.locator('#accountBtn').evaluate((el) => el.click());
  await page.locator('#accountSwitchBtn').click();
  await expect(page.locator('#accountTitle')).toHaveText('Create account');
  await fill(page, 'accountEmail', 'new@example.com');
  await fill(page, 'accountPassword', 'short');
  await page.locator('#accountSubmitBtn').click();
  await expect(page.locator('#accountError')).toContainText('at least 8');
  await fill(page, 'accountPassword', 'long-enough-1');
  await page.locator('#accountSubmitBtn').click();
  await expect(page.locator('#accountError')).toContainText('Privacy Policy');
});
