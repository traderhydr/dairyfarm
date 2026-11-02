// Builds the website: landing page at the root, the web app under /app/.
//   node scripts/build-site.mjs        ->  dist-site/
// (The Android app is built separately with `npm run build`; it bundles the app at its own root.)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist-site';
const SITE_URL = (process.env.SITE_URL || 'https://traderhydr.github.io/dairyfarm/').replace(/\/?$/, '/');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// 1. the app, with relative asset paths so it works from any sub-folder
execSync(`npx vite build --outDir ${OUT}/app --emptyOutDir`, { stdio: 'inherit' });

// 2. landing page files (with the public address filled in)
for (const file of fs.readdirSync('site')) {
  const from = path.join('site', file);
  if (fs.statSync(from).isDirectory()) continue;
  const to = path.join(OUT, file);
  if (/\.(html|txt|js|css)$/.test(file)) fs.writeFileSync(to, fs.readFileSync(from, 'utf8').replaceAll('%SITE_URL%', SITE_URL));
  else fs.copyFileSync(from, to);
}
fs.cpSync('site/img', path.join(OUT, 'img'), { recursive: true });

// 3. shared assets
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
fs.copyFileSync('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', path.join(OUT, 'fonts/geist-latin-wght-normal.woff2'));
fs.copyFileSync('node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2', path.join(OUT, 'fonts/geist-mono-latin-wght-normal.woff2'));
for (const icon of ['icon-192.png', 'icon-512.png', 'privacy.html']) fs.copyFileSync(path.join('public', icon), path.join(OUT, icon));

console.log(`site built in ${OUT}/ for ${SITE_URL}`);
