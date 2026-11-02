import { expect, test } from '@playwright/test';

// The website as GitHub Pages serves it: landing page at /dairyfarm/, the app under /dairyfarm/app/.
const ROOT = '/dairyfarm/';
const APP = '/dairyfarm/app/';

test.describe('landing page', () => {
  test('first-time visitors see the page, with a clear headline and no broken assets', async ({ page }) => {
    const problems = [];
    page.on('pageerror', (e) => problems.push(`error: ${e.message}`));
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });

    await page.goto(ROOT);
    await expect(page).toHaveTitle(/Dairy Farm Manager/);
    await expect(page.locator('h1')).toHaveText('Farm records that fit in your pocket.');
    await expect(page.getByRole('link', { name: 'Open the app' }).first()).toHaveAttribute('href', 'app/');

    // scroll through so lazy images load and reveal animations run
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    });
    // lazy images download as they scroll into view: wait for all of them to arrive
    await expect.poll(
      () => page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src)),
      { timeout: 10000 }
    ).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('has share-preview and search tags with absolute addresses', async ({ page }) => {
    await page.goto(ROOT);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toMatch(/^https:\/\/.+\/og\.png$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\//);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /offline/i);
    const ogRes = await page.request.get(ROOT + 'og.png');
    expect(ogRes.status()).toBe(200);
  });

  test('the Open the app button leads into the working app', async ({ page }) => {
    await page.goto(ROOT);
    await page.locator('.nav').getByRole('link', { name: 'Open the app' }).click();
    await expect(page).toHaveURL(new RegExp(`${APP}$`));
    await expect(page.locator('#totalIncomeDisplay')).toBeVisible();
  });

  test('links to the privacy policy and every in-page link target exists', async ({ page }) => {
    await page.goto(ROOT);
    const res = await page.request.get(ROOT + 'privacy.html');
    expect(res.status()).toBe(200);
    const missing = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !document.querySelector(h)));
    expect(missing).toEqual([]);
  });

  test('FAQ answers open and close', async ({ page }) => {
    await page.goto(ROOT);
    const first = page.locator('.faq details').first();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await expect(first.locator('p')).toBeVisible();
  });

  for (const [name, width] of [['phone', 390], ['desktop', 1280]]) {
    test(`no sideways scrolling on a ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(ROOT);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('reduced motion shows everything without waiting for animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROOT);
    const hidden = await page.evaluate(() => [...document.querySelectorAll('.reveal')].filter((el) => getComputedStyle(el).opacity === '0').length);
    expect(hidden).toBe(0);
  });
});

test.describe('moving the app to /app/ does not strand anyone', () => {
  test('email sign-in and password-reset links that land on the front page are forwarded with their token', async ({ page }) => {
    await page.goto(`${ROOT}#access_token=abc123&refresh_token=r1&type=recovery`);
    await expect(page).toHaveURL(new RegExp(`${APP}#access_token=abc123&refresh_token=r1&type=recovery$`));
    await expect(page.locator('#totalIncomeDisplay')).toBeVisible();

    await page.goto(`${ROOT}?code=pkce-code-1`);
    await expect(page).toHaveURL(new RegExp(`${APP}\\?code=pkce-code-1$`));
  });

  test('people who already use the app go straight to it, and ?landing still shows the page', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dairy_farm_v1_transactions', '[]'));
    await page.goto(ROOT);
    await expect(page).toHaveURL(new RegExp(`${APP}$`));
    await page.goto(`${ROOT}?landing`);
    await expect(page).toHaveURL(new RegExp(`${ROOT}\\?landing$`));
    await expect(page.locator('h1')).toBeVisible();
  });

  test('the installed home-screen icon (standalone mode) opens the app, not the page', async ({ page }) => {
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q));
    });
    await page.goto(ROOT);
    await expect(page).toHaveURL(new RegExp(`${APP}$`));
  });

  test('the app works offline from its new address', async ({ page, context }) => {
    await page.goto(APP);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope);
    expect(scope).toMatch(/\/dairyfarm\/app\/$/);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#totalIncomeDisplay')).toBeVisible();
  });

  test('the retired root service worker removes only its own cache and unregisters itself', async ({ page }) => {
    await page.goto(`${ROOT}?landing`);
    const origin = new URL(page.url()).origin;
    const rootScope = `${origin}${ROOT}`;
    await page.evaluate(async ({ rootScope }) => {
      await caches.open(`workbox-precache-v2-${rootScope}`);            // old app's cache
      await caches.open(`workbox-precache-v2-${rootScope}app/`);        // new app's cache: must survive
      await navigator.serviceWorker.register('sw.js', { scope: rootScope });
    }, { rootScope });
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).length === 0, null, { timeout: 15000 });
    const names = await page.evaluate(() => caches.keys());
    expect(names.filter((n) => n.endsWith(`${ROOT}`))).toEqual([]);
    expect(names.some((n) => n.endsWith(`${ROOT}app/`))).toBe(true);
  });

  test('the old address for the privacy policy still works', async ({ page }) => {
    expect((await page.request.get(ROOT + 'privacy.html')).status()).toBe(200);
    expect((await page.request.get(APP + 'privacy.html')).status()).toBe(200);
  });
});
