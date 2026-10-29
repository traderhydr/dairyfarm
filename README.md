# Dairy Farm Manager

Offline-first farm record keeping for dairy farmers: cashbook, cow AI & pregnancy tracking, monthly
Wanda (feed) stock and installments, milkers, Wachi (heifers), vaccination/deworming, sold-cow log and
Doodhi milk-buyer khata. Runs as an installable web app (PWA) and as an Android app (Capacitor).

- Works fully **offline**; records are stored on the phone first.
- Optional **account + cloud sync** (Supabase) to back up and use the same farm on several phones.
- **Reminders** (Android): heat/PD checks, dry-off, calving and vaccination due dates.
- Monthly income-vs-expense chart, CSV/JSON export and restore.

## Develop

```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # unit tests (vitest)
npm run test:e2e     # browser tests (Playwright; first run: npx playwright install chromium)
npm run build        # production build into dist/
```

Requires Node 22+.

## Project layout

| Path | What it is |
| --- | --- |
| `index.html`, `src/styles.css` | Page markup and styles (Tailwind) |
| `src/state.js` | The farm records store: `state`, `commit()`, `onChange()` |
| `src/views/*` | One module per tab (rendering + event wiring) |
| `src/ui/*` | Tabs, modals, toast, account sign-in modal |
| `src/lib/*` | Pure helpers (formatting, dates, totals, reminders) |
| `src/cloud/*` | Supabase auth, the sync engine and 3-way merge |
| `src/native/*` | Android-only behaviour (back button, reminders) |
| `supabase/migrations` | Database schema + row-level security |
| `android/` | The Capacitor Android project (committed) |
| `tests/unit`, `tests/e2e` | vitest and Playwright tests |

## Turn on accounts & cloud sync

Without configuration the app is local-only. To enable accounts, follow [docs/CLOUD_SETUP.md](docs/CLOUD_SETUP.md).

## Android app and Play Store

See [docs/RELEASE.md](docs/RELEASE.md). In short: every push builds a debug APK in GitHub Actions
(Actions tab -> latest run -> Artifacts). Add the keystore secrets and it also produces a signed APK
and a Play Store bundle (`.aab`).

## iPhone

iPhones can't install APKs. Publish the web app (`Deploy web app` workflow -> GitHub Pages), open
the site in Safari, tap **Share -> Add to Home Screen**.
