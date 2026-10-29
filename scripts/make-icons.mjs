// Renders the app icon / splash artwork (SVG below) to PNG files in assets/ and public/.
// Usage: PW_CHROMIUM_PATH=... node scripts/make-icons.mjs   (needs @playwright/test)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const GRAD = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#047857"/></linearGradient></defs>`;

// Cow face, drawn around the canvas centre (512,512) on a 1024 canvas.
const cow = (scale = 1) => `
<g transform="translate(512 520) scale(${scale}) translate(-512 -520)">
  <!-- horns -->
  <path d="M372 318 C340 262 318 232 300 214 C346 214 390 250 412 306 Z" fill="#fde68a"/>
  <path d="M652 318 C684 262 706 232 724 214 C678 214 634 250 612 306 Z" fill="#fde68a"/>
  <!-- ears -->
  <ellipse cx="262" cy="436" rx="104" ry="58" transform="rotate(-18 262 436)" fill="#e2e8f0"/>
  <ellipse cx="262" cy="436" rx="66" ry="30" transform="rotate(-18 262 436)" fill="#fbcfe8"/>
  <ellipse cx="762" cy="436" rx="104" ry="58" transform="rotate(18 762 436)" fill="#e2e8f0"/>
  <ellipse cx="762" cy="436" rx="66" ry="30" transform="rotate(18 762 436)" fill="#fbcfe8"/>
  <!-- head -->
  <rect x="312" y="290" width="400" height="470" rx="180" fill="#ffffff"/>
  <!-- patch over left eye -->
  <path d="M312 440 C312 350 360 300 440 300 C470 300 486 330 478 380 C470 440 430 500 372 500 C335 500 312 480 312 440 Z" fill="#1e293b"/>
  <!-- eyes -->
  <circle cx="414" cy="446" r="30" fill="#ffffff"/><circle cx="414" cy="446" r="20" fill="#0f172a"/>
  <circle cx="610" cy="446" r="30" fill="#ffffff"/><circle cx="610" cy="446" r="20" fill="#0f172a"/>
  <!-- muzzle -->
  <rect x="352" y="590" width="320" height="190" rx="95" fill="#fbcfe8"/>
  <ellipse cx="444" cy="690" rx="22" ry="34" fill="#be185d"/>
  <ellipse cx="580" cy="690" rx="22" ry="34" fill="#be185d"/>
</g>`;

const svg = (inner, size = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${inner}</svg>`;

const files = {
  // full-bleed square icon (legacy launchers, iOS, PWA "any")
  'assets/icon-only.png': svg(`${GRAD}<rect width="1024" height="1024" fill="url(#g)"/>${cow(1)}`),
  // adaptive icon layers (Android crops to a circle/squircle: keep art inside the safe zone)
  'assets/icon-foreground.png': svg(cow(0.8)),
  'assets/icon-background.png': svg(`${GRAD}<rect width="1024" height="1024" fill="url(#g)"/>`),
  // PWA maskable icon (same safe-zone rule)
  'public/icon-512.png': svg(`${GRAD}<rect width="1024" height="1024" fill="url(#g)"/>${cow(0.8)}`),
  'public/icon-192.png': svg(`${GRAD}<rect width="1024" height="1024" fill="url(#g)"/>${cow(0.8)}`)
};

const splash = (bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="${bg}"/>` +
  `<g transform="translate(866 866) scale(1)">${svg(cow(1)).replace(/<\/?svg[^>]*>/g, '')}</g></svg>`;
files['assets/splash.png'] = splash('#064e3b');
files['assets/splash-dark.png'] = splash('#022c22');

const sizes = { 'public/icon-192.png': 192, 'public/icon-512.png': 512 };

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
for (const [path, markup] of Object.entries(files)) {
  const isSplash = path.includes('splash');
  const dim = sizes[path] || (isSplash ? 2732 : 1024);
  const page = await browser.newPage({ viewport: { width: dim, height: dim } });
  const transparent = path.endsWith('icon-foreground.png');
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${dim}px;height:${dim}px}</style>${markup}`);
  await page.screenshot({ path, omitBackground: transparent, clip: { x: 0, y: 0, width: dim, height: dim } });
  await page.close();
  console.log('wrote', path, dim);
}

// Status-bar notification icon: white silhouette on transparent (Android tints it).
const silhouette = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><mask id="m">
  <g fill="#fff"><path d="M372 318 C340 262 318 232 300 214 C346 214 390 250 412 306 Z"/><path d="M652 318 C684 262 706 232 724 214 C678 214 634 250 612 306 Z"/>
  <ellipse cx="262" cy="436" rx="104" ry="58" transform="rotate(-18 262 436)"/><ellipse cx="762" cy="436" rx="104" ry="58" transform="rotate(18 762 436)"/>
  <rect x="312" y="290" width="400" height="470" rx="180"/></g>
  <g fill="#000"><circle cx="414" cy="446" r="34"/><circle cx="610" cy="446" r="34"/><rect x="352" y="590" width="320" height="8"/>
  <ellipse cx="444" cy="690" rx="26" ry="38"/><ellipse cx="580" cy="690" rx="26" ry="38"/></g></mask></defs>
  <rect width="1024" height="1024" fill="#fff" mask="url(#m)"/></svg>`;
const statDirs = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
for (const [density, px] of Object.entries(statDirs)) {
  const dir = `android/app/src/main/res/drawable-${density}`;
  if (!fs.existsSync('android')) break;
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: px, height: px } });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${px}px;height:${px}px}</style>${silhouette}`);
  await page.screenshot({ path: `${dir}/ic_stat_cow.png`, omitBackground: true });
  await page.close();
  console.log('wrote', `${dir}/ic_stat_cow.png`);
}
await browser.close();
fs.writeFileSync('assets/icon.svg', files['assets/icon-only.png']);
