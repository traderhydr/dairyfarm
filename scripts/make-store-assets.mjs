// Google Play listing images: phone screenshots (1080x1920) and the feature graphic (1024x500) into store/.
// Usage: npm run build && npx vite preview --port 4173 &   then   PW_CHROMIUM_PATH=... node scripts/make-store-assets.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const URL = process.env.APP_URL || 'http://localhost:4173/';
const OUT = 'store';
fs.mkdirSync(`${OUT}/screenshots`, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const click = (page, id) => page.locator('#' + id).evaluate((el) => el.click());

async function shot(file, steps, dark = false, lang = 'en') {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, colorScheme: dark ? 'dark' : 'light' });
  await page.addInitScript((LANG) => { try { if (!localStorage.getItem('dairy_farm_lang')) localStorage.setItem('dairy_farm_lang', LANG); } catch (e) { /* ignore */ } }, lang);
  await page.goto(URL);
  await page.waitForTimeout(600);
  await click(page, 'resetDemoBtn');
  await click(page, 'modalConfirmBtn');
  await page.waitForTimeout(300);
  // two ledgers so the ledger screens are not empty
  await page.evaluate(() => {
    const tx = JSON.parse(localStorage.getItem('dairy_farm_v1_transactions'));
    localStorage.setItem('dairy_farm_v1_ledgers', JSON.stringify([
      { id: 'l-milk', name: 'Milk business', note: 'Daily milk sales and costs' },
      { id: 'l-home', name: 'Household' }
    ]));
    const more = [
      { id: 'tx-m1', type: 'income', date: '2026-11-02', category: 'Milk Sale', amount: 16200, note: 'Dairy collection centre', ledgerId: 'l-milk' },
      { id: 'tx-m2', type: 'expense', date: '2026-11-03', category: 'Green Fodder & Silage', amount: 6400, note: 'Silage load', ledgerId: 'l-milk' },
      { id: 'tx-h1', type: 'expense', date: '2026-11-03', category: 'Other', amount: 3500, note: 'Family expenses', ledgerId: 'l-home' }
    ];
    localStorage.setItem('dairy_farm_v1_transactions', JSON.stringify([...more, ...tx]));
  });
  await page.reload();
  await page.waitForTimeout(700);
  await steps(page);
  await page.waitForTimeout(1600);
  await page.locator('#toastBanner').evaluate((el) => el.classList.add('hidden')).catch(() => {});
  await page.locator('#sideModuleBanner').evaluate((el) => { el.style.display = 'none'; }).catch(() => {});
  await page.screenshot({ path: `${OUT}/screenshots/${file}.png` });
  await page.close();
  console.log('wrote', file);
}

await shot('1-cashbook', async () => {});
await shot('2-ledgers', async (p) => {
  await p.locator('#ledgersCard').scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollTo({ top: document.getElementById('ledgersCard').offsetTop - 70 }));
});
await shot('3-ledger-detail', async (p) => { await p.locator('[data-open-ledger="l-milk"]').click(); });
await shot('4-cow-ai', async (p) => { await click(p, 'tabBreedingBtn'); });
await shot('5-animal-profile', async (p) => {
  await click(p, 'tabAnimalsBtn');
  await p.locator('#animalsListContainer [data-open-profile="Cow #07 (Chandi)"]').click();
});
await shot('6-crops', async (p) => { await p.locator('#modeToggle [data-mode="crops"]').click(); });
await shot('7-wanda', async (p) => { await click(p, 'tabWandaBtn'); });
await shot('8-urdu', async () => {}, false, 'ur');

const b64 = (f) => fs.readFileSync(f).toString('base64');
const g = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await g.setContent(`<style>
  @font-face { font-family: G; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')}) format('woff2-variations'); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0 }
  body { width: 1024px; height: 500px; background: #064e3b; font-family: G, sans-serif; color: #fff; display: flex; overflow: hidden; position: relative }
  .l { padding: 70px 0 0 60px; width: 440px }
  .b { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 600 }
  .b img { width: 44px; height: 44px; border-radius: 11px }
  h1 { margin-top: 44px; font-size: 52px; line-height: 1.04; letter-spacing: -0.04em; font-weight: 600 }
  p { margin-top: 20px; font-size: 21px; line-height: 1.4; color: #a7f3d0 }
  .p { position: absolute; right: 70px; top: 44px; width: 250px; padding: 7px; border-radius: 34px; background: #fff; box-shadow: 0 20px 40px rgba(0,0,0,.35) }
  .p img { width: 100%; border-radius: 28px; display: block }
  .p2 { position: absolute; right: 340px; top: 120px; width: 200px; padding: 6px; border-radius: 28px; background: #fff; box-shadow: 0 20px 40px rgba(0,0,0,.35); opacity: .95 }
  .p2 img { width: 100%; border-radius: 23px; display: block }
</style>
<div class="l"><div class="b"><img src="data:image/png;base64,${b64('public/icon-192.png')}">Dairy Farm Manager</div>
<h1>Your whole dairy farm in one app</h1><p>Cashbook, cows, feed, milk and savings, even without internet</p></div>
<div class="p2"><img src="data:image/png;base64,${b64(`${OUT}/screenshots/4-cow-ai.png`)}"></div>
<div class="p"><img src="data:image/png;base64,${b64(`${OUT}/screenshots/3-ledger-detail.png`)}"></div>`);
await g.waitForTimeout(500);
await g.screenshot({ path: `${OUT}/feature-graphic-1024x500.png` });
console.log('wrote feature graphic');
await browser.close();
