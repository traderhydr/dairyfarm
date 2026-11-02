// Captures the app screenshots used on the landing page (site/img) from a running preview of the app.
// Usage: npm run build && npx vite preview --port 4173 &  then  PW_CHROMIUM_PATH=... node scripts/make-screenshots.mjs
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import fs from 'node:fs';

const URL = process.env.APP_URL || 'http://localhost:4173/';
const OUT = 'site/img';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const click = (page, id) => page.locator('#' + id).evaluate((el) => el.click());

async function shot(name, dark, steps) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  await page.goto(URL);
  await page.waitForTimeout(600);
  await click(page, 'resetDemoBtn');
  await click(page, 'modalConfirmBtn');
  await page.waitForTimeout(300);
  await steps(page);
  await page.waitForTimeout(1500); // let animations settle
  await page.locator('#toastBanner').evaluate((el) => el.classList.add('hidden')).catch(() => {});
  await page.locator('#sideModuleBanner').evaluate((el) => { el.style.display = 'none'; }).catch(() => {});
  const png = await page.screenshot();
  await sharp(png).webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`);
  await page.close();
  console.log('wrote', `${OUT}/${name}.webp`);
}

await shot('cashbook', false, async () => {});
await shot('cows', false, async (p) => { await click(p, 'tabBreedingBtn'); });
await shot('savings', false, async (p) => {
  await p.locator('#openMoreBtn').click();
  await p.locator('#tabSavingsBtn').click();
});
await shot('cashbook-dark', true, async () => {});

// share-preview image (1200x630) for links shared on WhatsApp, Facebook, etc.
const b64 = (file) => fs.readFileSync(file).toString('base64');
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.setContent(`<style>
  @font-face { font-family: G; src: url(data:font/woff2;base64,${b64('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')}) format('woff2-variations'); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0 }
  body { width: 1200px; height: 630px; background: #fafafa; font-family: G, sans-serif; color: #171717; display: flex; overflow: hidden; position: relative; }
  .l { padding: 72px 0 0 80px; width: 700px; }
  .b { display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 600; letter-spacing: -0.02em }
  .b img { width: 48px; height: 48px; border-radius: 12px }
  h1 { margin-top: 90px; font-size: 76px; line-height: 1.02; letter-spacing: -0.045em; font-weight: 600 }
  p { margin-top: 28px; font-size: 30px; color: #4d4d4d; line-height: 1.35; max-width: 560px }
  .p { position: absolute; right: 90px; top: 70px; width: 300px; padding: 8px; border-radius: 40px; background: #fff; border: 1px solid #d9d9d9; box-shadow: 0 24px 48px -12px rgba(0,0,0,.2) }
  .p img { width: 100%; border-radius: 33px; display: block }
</style>
<div class="l"><div class="b"><img src="data:image/png;base64,${b64('public/icon-192.png')}">Dairy Farm Manager</div>
<h1>Farm records that fit in your pocket.</h1><p>Cashbook, cows, feed, milk and savings. Works offline.</p></div>
<div class="p"><img src="data:image/webp;base64,${b64('site/img/cashbook.webp')}"></div>`);
await og.waitForTimeout(400);
await og.screenshot({ path: 'site/og.png' });
console.log('wrote site/og.png');
await browser.close();
