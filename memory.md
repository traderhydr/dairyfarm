# Dairy Farm Manager: project memory

Living notes so anyone (or any future session) can pick the project up quickly.
Last updated: 2026-11-01. Keep secrets out of this file.

## What this is
Offline-first farm record keeping for dairy farmers: cashbook, cow AI and pregnancy tracking, monthly
Wanda (feed) stock and installments, milkers, Wachi (heifers), vaccination/deworming, sold-cow log and
Doodhi (milk buyer) khata. Ships as a web app (PWA) and an Android app (Capacitor). Target users:
many separate farms, each with private data.

## Where things live
- Repo: `traderhydr/dairyfarm`. Default branch: `main`. Working branch: `claude/new-session-ig9c4u`
  (kept in step with `main`; `main` is updated by fast-forward).
- Website: https://traderhydr.github.io/dairyfarm/ (GitHub Pages, deployed by the *Deploy web app* workflow on push to `main`).
- Backend: Supabase project, reference `rykxbdnbxeqmdflhwtos` (URL `https://rykxbdnbxeqmdflhwtos.supabase.co`).
  Table `farm_data` with row-level security was created from `supabase/migrations/0001_farm_data.sql` and verified
  (4 policies, delete function, realtime).
- GitHub *repository variables* (Settings, Secrets and variables, Actions, **Variables** tab): `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `AUTH_REDIRECT_URL` (= the website address). The anon key is public by design; never use the
  `service_role` key in the app.
- Android app id: `com.sadeeq.dairyfarm` (permanent once published to Play).

## Stack
Vite 5 + vanilla JS modules, Tailwind 3 (compiled, no CDN), vite-plugin-pwa, `@fontsource` fonts (bundled),
Capacitor 8 (Android target API 36, Node 22+, JDK 21), Supabase (auth + Postgres + realtime), vitest, Playwright.

## Code map
| Path | Purpose |
| --- | --- |
| `index.html`, `src/styles.css` | Markup and the flat theme (CSS variables; dark mode = `body.dark-mode`) |
| `src/state.js` | Single store: `state`, `commit()`, `onChange(fn)`, `snapshot()`, `importData()`, `replaceAll()` |
| `src/views/*.js` | One module per tab: render functions + event wiring (state arrays are `state.<name>`) |
| `src/ui/` | `tabs.js` (nav), `sheets.js` (slide-up add forms), `modal.js`, `toast.js`, `menu.js`, `account.js` |
| `src/lib/` | Pure helpers: `format`, `dates`, `calc` (totals, monthly chart data), `reminders`, `platform`, `files` |
| `src/cloud/` | `merge.js` (3-way merge by record id), `sync-engine.js`, `supabase-remote.js`, `auth.js`, `config.js` |
| `src/native/` | Android-only: back button, reminder notifications (`init.js`, `reminders.js`) |
| `android/` | Committed Capacitor project (icons, splash, manifest, `build.gradle` with signing + version) |
| `supabase/migrations/` | SQL (idempotent, safe to re-run) |
| `tests/unit`, `tests/e2e` | vitest and Playwright (`app`, `native`, `cloud` projects) |
| `scripts/` | `make-icons.mjs` (renders icon/splash art), `make-keystore.sh` |
| `docs/` | `CLOUD_SETUP.md`, `RELEASE.md` |

## Design decisions worth remembering
- **Data model:** records are arrays of objects with an `id`. Storage keys are `dairy_farm_v1_*` in localStorage
  (kept stable so older local data still loads). New users start **empty**; sample data is opt-in from the menu.
- **Sync:** one JSON document per user (`farm_data.data`) with an integer `version` for optimistic concurrency.
  Pull on login, realtime, online and visibility events; push is debounced. Conflicts use a 3-way merge
  (base = last synced snapshot): edits beat deletes, local wins if both edited the same record. Signing out clears
  the phone's copy (cloud keeps it) and warns if there are unsynced changes.
- **Cloud code is bundled only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set**; otherwise the app is
  local-only. The `account` chunk loads dynamically.
- **No service worker inside the native app** (the APK ships its files); the PWA registers one for browsers only.
- **UI:** add-forms live in `.sheet` containers opened by `[data-open-sheet]` buttons and closed on save
  (any `commit('local')`), Escape, backdrop or switching tab. Overview cards and reminders show only on the Cashbook tab.
  Bottom nav = Cashbook, Milkers, Cow AI, Wanda, More (More opens the drawer with Wachi, Health, Sold Cows, Doodhi,
  settings and backups). Native back button closes sheet, then modal/drawer, then returns to Cashbook, then exits.
- Backups on Android go through Filesystem + Share (WebViews cannot download blob links).
- Reminders (Android only) are local notifications at 08:00 for heat/PD checks, dry-off, calving and vaccine due dates.

## Commands
```bash
npm ci
npm run dev           # dev server
npm test              # unit tests
npm run test:e2e      # Playwright (builds and serves itself; first time: npx playwright install chromium)
npm run build         # production build into dist/
npx cap sync android  # copy dist/ into the Android project (after npm run build)
node scripts/make-icons.mjs   # regenerate icon/splash art, then run @capacitor/assets (see docs/RELEASE.md)
```
Playwright tips: in this sandbox set `PW_CHROMIUM_PATH` to the preinstalled Chromium. Tests click hidden-form buttons via
`evaluate(el => el.click())` or open the sheet first.

## CI (GitHub Actions)
- **Build Android** (`build-android-apk.yml`): runs on `main`, `master`, `claude/**`; tests, then debug APK artifact
  `Dairy-Farm-Manager-debug-apk`. With keystore secrets it also builds a signed APK + `.aab`.
- **Deploy web app** (`deploy-web.yml`): on push to `main`; needs Pages Source = GitHub Actions.
- Each debug APK is signed with a different throwaway key, so **uninstall the old app before installing a new debug build**.

## Gotchas learned the hard way
- Gradle: `versionCode (expr).toInteger()` breaks (parses as a method call). Compute into a variable first.
- A variable saved as a GitHub *Secret* is invisible to `${{ vars.* }}`; the Supabase keys must be repository **Variables**.
- GitHub Pages environment remembers the default branch at creation; deploy from `main` failed until the environment was
  reset (Pages Source toggled, `github-pages` environment deleted).
- supabase-js `maybeSingle()` expects the REST response to be an array (matters when mocking the API in tests).
- `pkill -f` patterns can match the shell's own command line and kill the session; use a pidfile or port instead.
- The sandbox cannot reach `dl.google.com`, so Android builds can only be verified in CI.

## Status (2026-11-01)
Done: modular rewrite, tests (51 unit, 22 e2e), accounts + cloud sync (tested against a mocked API and a real
account), Android project with icons/splash/reminders/back button/share-sheet backups, release signing wiring,
web deploy, clean-and-simple UI redesign (on `main`, deploying).

Open items / owner actions:
- [ ] Replace `YOUR_CONTACT_EMAIL` in `public/privacy.html` (public page; needs the owner's chosen address).
- [ ] Create the signing key (`scripts/make-keystore.sh`) and add the 4 `ANDROID_*` secrets; back the key up safely.
- [ ] Decide the final Android package name before the first Play upload (permanent afterwards).
- [ ] Play Console: listing, screenshots, Data safety form, closed-test requirement for new accounts (see `docs/RELEASE.md`).
- [ ] Verify the redesign on a real phone (APK) and iPhone (Add to Home Screen); collect UI feedback.
- [ ] Optional: Urdu translation (about 600 strings; needs a native reviewer; consider RTL), per-farm sharing between staff.
- [ ] Optional: move off the debug signing key for testers (Play internal testing track).

## Not planned / known limits
- No iOS native app (iPhones use the web app via Add to Home Screen).
- One shared record per user: very large farms (thousands of records) are fine; multi-user farms sharing one account
  would need a different data model.
