# Dairy Farm Manager: project memory

Living notes so anyone (or any future session) can pick the project up quickly.
Last updated: 2026-11-09. Keep secrets out of this file.

## What this is
Offline-first farm record keeping for dairy farmers: cashbook, cow AI and pregnancy tracking, monthly
Wanda (feed) stock and installments, milkers, Wachi (heifers), vaccination/deworming, sold-cow log and
Doodhi (milk buyer) khata, plus savings goals. Ships as a web app (PWA) and an Android app (Capacitor). Target users:
many separate farms, each with private data.

## Where things live
- Repo: `traderhydr/dairyfarm`. Default branch: `main`. Working branch: `claude/new-session-ig9c4u`
  (kept in step with `main`; `main` is updated by fast-forward).
- Website: https://traderhydr.github.io/dairyfarm/ is the **landing page**; the web app is at `/dairyfarm/app/` (GitHub Pages, deployed by the *Deploy web app* workflow on push to `main`, built by `npm run build:site`).
- Backend: Supabase project, reference `rykxbdnbxeqmdflhwtos` (URL `https://rykxbdnbxeqmdflhwtos.supabase.co`).
  Table `farm_data` with row-level security was created from `supabase/migrations/0001_farm_data.sql` and verified
  (4 policies, delete function, realtime).
- GitHub *repository variables* (Settings, Secrets and variables, Actions, **Variables** tab): `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `AUTH_REDIRECT_URL` (= the website address). The anon key is public by design; never use the
  `service_role` key in the app.
- Android app id: `com.hydr.dairyfarm` (chosen by the owner 2026-11-04; was `com.sadeeq.dairyfarm`; permanent once published to Play).

## Stack
Vite 5 + vanilla JS modules, Tailwind 3 (compiled, no CDN), vite-plugin-pwa, `@fontsource` fonts (bundled),
Capacitor 8 (Android target API 36, Node 22+, JDK 21), Geist fonts (latin-only variable files, referenced from `styles.css`), Supabase (auth + Postgres + realtime), vitest, Playwright.

## Code map
| Path | Purpose |
| --- | --- |
| `index.html`, `src/styles.css` | Markup and the design layer (CSS tokens; dark mode = `body.dark-mode`; `ui/theme.js` remembers the choice and follows the phone's setting) |
| `src/state.js` | Single store: `state`, `commit()`, `onChange(fn)`, `snapshot()`, `importData()`, `replaceAll()` |
| `src/views/*.js` | One module per tab: render functions + event wiring (state arrays are `state.<name>`) |
| `src/ui/` | `tabs.js` (nav), `sheets.js` (slide-up add forms), `motion.js` (enter animations, count-up, bar growth, confetti), `modal.js`, `toast.js`, `menu.js`, `account.js` |
| `src/lib/` | Pure helpers: `format`, `dates`, `calc` (totals, monthly chart data), `savings` (goal progress, days left, monthly plan), `reminders`, `platform`, `files` |
| `src/cloud/` | `merge.js` (3-way merge by record id), `sync-engine.js`, `supabase-remote.js`, `auth.js`, `config.js` |
| `src/native/` | Android-only: back button, reminder notifications (`init.js`, `reminders.js`) |
| `site/` | Landing page + `sw.js` (retires the old root service worker); built into the website by `scripts/build-site.mjs` |
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
- **Design language (professional pass, 2026-11-03):** neutral surfaces with hairline borders, Geist type with mono eyebrow labels,
  two font weights (500/600), 8px controls and 12px cards, ink (`--primary`) primary buttons and + button, and **one** accent
  (emerald, `--accent`) for progress bars, success and the logo. Colour only ever means success (green), danger (red) or caution
  (amber); indigo/sky/teal/violet from the old markup are mapped to neutral. The semantic colour rules in `styles.css` are
  generated from the classes in use (exact `[class~="..."]` matches), and a "neutral panels" block after them keeps
  calculation previews, the milk logger, reminders and the menu quiet. Reference used: the public Vercel DESIGN.md in
  VoltAgent/awesome-design-md (principles only; no Vercel branding). Re-skinning = change the tokens at the top of `styles.css`
  (e.g. make `--primary` green).
- **UI:** add-forms live in `.sheet` containers opened by `[data-open-sheet]` buttons and closed on save
  (any `commit('local')`), Escape, backdrop or switching tab. Overview cards and reminders show only on the Cashbook tab.
  Bottom nav = Cashbook, Animals (profiles), Cow AI, Wanda, More (More opens the drawer with Milkers, Wachi, Health, Sold Cows, Doodhi,
  Savings, settings and backups). Native back button closes sheet, then modal/drawer, then returns to Cashbook, then exits.
- **Website layout (2026-11-04):** root = landing page, app = `/app/` (the Android build is unchanged: `npm run build`, app at its own root).
  The landing page's inline head script forwards to `app/` (keeping query + hash) when the URL carries sign-in tokens
  (`access_token`, `type=recovery`, `code=`...), the page runs standalone (installed icon), or localStorage already holds
  `dairy_farm_v1_*` data; `?landing` bypasses it. `site/sw.js` replaces the old root-scope service worker (which would
  otherwise keep serving the cached old app at the root): it unregisters itself, deletes only caches ending in the root scope
  (never the `/app/` one) and reloads tabs. `AUTH_REDIRECT_URL` can stay the site root because of the forwarding.
  `scripts/serve-site.mjs` serves `dist-site` under `/dairyfarm/` like Pages does; `tests/e2e/site.spec.js` covers all of this.
  Landing screenshots/OG image come from `scripts/make-screenshots.mjs`; re-run it after big UI changes.
- **Savings goals** (`savingsGoals` collection, key `dairy_farm_v1_savings`, drawer tab "Savings Goals"): each goal has a
  target, optional date, and a list of contributions. Shows progress, days left and a suggested monthly amount; a goal due
  within 45 days appears in the Cashbook reminders; reaching the target fires confetti once (`justReached`). A contribution can
  optionally also be booked in the Cashbook as a "Savings" expense. Included in sync, backups, restore and CSV automatically
  (everything iterates `COLLECTIONS`).
- **Cashbook editing (2026-11-06):** each entry has Edit and Delete. Edit reopens the Add sheet filled in (`editingId` in `views/finance.js`,
  title/button text switch); saving updates the same record. `closeSheets()` dispatches a `sheetclose` event so views that reuse a form
  (add/edit) reset it when the sheet closes by any route. On phones (<640px) `#txTable` renders as stacked cards so the buttons are never clipped.
- **Ledgers (2026-11-06):** `ledgers` collection (key `dairy_farm_v1_ledgers`, `{id, name}`); entries carry an optional `ledgerId`, and entries
  without one (old data, Wanda/Savings postings) belong to the built-in, non-removable **General** ledger (`lib/ledgers.js`). Cashbook home = overview
  of ALL ledgers + a Ledgers card (one tap-card per ledger with balance/in/out). Opening a ledger (`views/ledgers.js`, `body.ledger-open`) hides the
  overview and shows that ledger's own totals; the entry list, insights and trend chart are scoped through `scopedTransactions()`. Deleting a ledger moves
  its entries to General. New entries default to the open ledger; the Edit form can move an entry. Native back button leaves an open ledger first.
  Gotcha: Playwright reuses already-running preview servers, so after code changes rebuild `dist`, `dist-cloud` (fake Supabase env) and `dist-site` or tests run against stale code.
- **Editing (2026-11-06):** every record type has an Edit button that reopens its add sheet filled in. Shared helper `ui/record-editor.js`
  (`createEditor({sheetId, formId, editTitle, addOnly, onReset})`, `setField`): `begin(id, fill)`, `find(list)` in the submit handler; fields listed in
  `addOnly` (advance payment, "also add to Cashbook", starting balance, pick-from-herd) are hidden while editing, and editing never touches payments or
  Cashbook entries already created. Closing the sheet any way resets to add mode (`sheetclose`). Cashbook rows are also tappable to edit. Ledgers have
  Edit (name + optional `note`). Cow AI status, Wachi stage, milk yields keep their inline controls too.
- **Pregnancy days (2026-11-07):** each Cow AI card (not for Repeat or Calved) shows "Pregnant: day N of 283" (or "Since AI" until confirmed), days to calving / due today / days overdue and a progress bar; the add form previews it too. `pregnancyProgress()` in `lib/dates.js` (whole local days, DST-safe).
- **Search (2026-11-07):** every record list (Cow AI, Milkers, Wanda, Wachi, Health, Sold Cows, Doodhi, Savings) has a search box above it (`ui/list-search.js`: matches any word in any value of the record incl. payments/history, case-insensitive, "No matches" message; section totals ignore the search). Cashbook keeps its own search + month + type filters.
- **Animal profiles (2026-11-07):** drawer tab "Animal Profiles" (`views/animals.js`) + a profile sheet (`#profileSheet`, outside any section so it opens from any tab) reachable from the Profile button on Milkers, Wachi, Cow AI and Sold Cows cards. No new collection: a profile is *derived* by joining records on the animal's tag (`lib/animals.js`: `sameAnimal` = all words of the shorter tag appear in the longer, so "Cow #07" matches "Cow #07 (Chandi)"; `buildProfile`, `listAnimals`). Shows pregnancy, AI history, treatments (health records whose target matches; new optional `disease` field and "Illness Treatment" type), calves/baby record (`calves[]` on the AI record, written at calving; Wachi `damTag`, or parsed from "(Dam: ...)" for old data), and sale. Tag inputs suggest herd animals (`#animalTagOptions` datalist) so tags match. **Sold with/without calf:** the Sold Cows form shows a box listing the calf/calves still in the herd for the animal in the form; ticked calves are stored in `sale.withCalves` and removed from Wachi together with the cow; `sale.animal` keeps a snapshot of her herd details after she leaves the herd. Profile actions: + Treatment, + AI record, Mark sold (prefills those sheets).
- **Profit & loss (2026-11-09):** Cashbook "Profit & Loss" card (`views/profit.js`, `lib/calc.js` periodRange/rangeTotals/dailyTotals): today, 7 days, month, year; hero shows profit/loss + margin; day-by-day (month-by-month for the year); follows the open ledger.
- **Goats/Sheep and Horses (2026-11-09):** collections `goats` ({tag, species, sex, breed, ageMonths, weightKg, count, status, cost, salePrice, notes}) and `horses` ({name, breed, sex, ageYears, color, purpose, status, monthlyCost, cost, salePrice, notes}); drawer tabs, add/edit/delete/search, in sync/backup/CSV/sample data and in Animal Profiles (profile `kind` goat/horse; no AI/calves sections). Selling a single goat/horse from the Sold form marks it Sold with the sale price; a group (count > 1) stays on the list. Animal Profiles has an Add animal chooser and an Edit button per profile (`animal-edit` event: the owning view opens its edit sheet).
- **Crops & Land mode (2026-11-09):** the Farm | Crops & Land toggle under the header (`ui/mode.js`, remembered in localStorage `dairy_farm_mode`, `body[data-mode]`; `.farm-only` / `.crops-only` classes) swaps the bottom bar (Crops, Land, More) and sections. Collections `lands` ({name, ownership Own/Theeka, area, unit Acre/Kanal/Marla, theeka per year, owner, water, notes}) and `crops` ({crop, cropOther, season, year, landId or landName, area, areaUnit, ownership, sowingDate, seedVariety, seedRate kg/acre, water, irrigations, notes, status, `costs[]` {category, label, amount, date}, `harvests[]` {date, qty, unit, income, note}}). Totals are always derived (`lib/crops.js`: cropTotals, cropsSummary; 1 acre = 8 kanal = 160 marla). The add form's "costs so far" create the first cost lines (add-only); the crop details sheet adds/edits/removes cost lines and harvests (uses `commit('local-keep')` so the sheet stays open and sync still runs). Back button returns to `homeTab()`.
- **Urdu / English (2026-11-09):** first-run screen `#languageGate` (before anything else; choice kept in localStorage `dairy_farm_lang`) and a toggle button `#langToggleBtn` next to the Farm/Crops switch. English stays the source language: `src/i18n/index.js` translates the DOM in place from `ur.json` (exact text, whitespace-normalised) + number-aware regex rules in `patterns.js`, with a MutationObserver for everything rendered later (toasts, lists, sheets); text that has no entry (user data, sample names) stays as typed, and stored data is never translated. `"a • b"` strings are translated part by part. Placeholders/aria-labels/titles are translated too (`e.g. ...` keeps the example). `langchange` event re-renders (dates use `ur-PK-u-nu-latn` via `dateLocale()`). RTL: `html[dir=rtl]` rules at the end of `styles.css` (FAB and drawer move to the other side, numbers/dates stay LTR); Urdu font is Noto Naskh Arabic (variable, loaded only when Urdu is chosen). **Adding a screen or string: add the English text to a `src/i18n/*.txt`-style source and `ur.json` (keys are the exact English text); untranslated text just shows in English. The mobile "install guide" modal is English only. Translations were written by an AI and need a native-speaker review.** Playwright tests start with the language already set to English (the `__lang_init` init script) except the Urdu tests.
- **Wanda totals (2026-11-09):** the Wanda tab starts with a summary card (`wandaTotals()` in `lib/calc.js`): total Wanda cost, total paid, balance due, bags and a paid-% bar, over all stock batches.
- **Audit 2026-11-09:** (1) records from a restore/cloud can hold anything, so every number or date interpolated into HTML is escaped, and `formatDisplayDate` returns "—" for bad dates instead of echoing the text; `tests/e2e/app.spec.js` "hostile data" poisons every field of every collection and opens every screen, so a new view that forgets `escapeHtml` fails that test. (2) Dark-mode colour rules are exact class names: a new pale tint (e.g. `bg-emerald-50/60`) needs a rule in the "variants added after the colour pass" block at the end of `styles.css`. (3) The sync engine keeps cloud collections it does not know about (newer app version) when it pushes. **Rollout note: an app older than the crops/goats/horses release that syncs the same account can still drop those collections (it predates this safeguard), so update every device/tester.** (4) Version is 3.1.0 (`package.json`); landing page, store screenshots (`scripts/make-store-assets.mjs`) and `site/img` were refreshed.
- **Motion:** CSS keyframes + `ui/motion.js`. A tab opening adds `.tab-enter` for about 1s (so ordinary re-renders never replay
  it); money cards count up (`animateNumber`, final text is always exact); progress bars grow; sheets, dialogs and toasts
  animate. Everything respects `prefers-reduced-motion`. Beware: never animate a transform on an ancestor of a
  `position: fixed` element (the + button, sheets), it re-anchors them; that is why the enter animation skips `.fab` and `.sheet`.
- Dark-mode colour rules for tinted status colours are **generated** from the classes actually used and match exact class names
  (`[class~="..."]`); a substring match once turned every `hover:bg-rose-50` into a permanent red background.
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
Done: modular rewrite, tests (60 unit, 50 e2e), accounts + cloud sync (tested against a mocked API and a real
account), Android project with icons/splash/reminders/back button/share-sheet backups, release signing wiring,
web deploy, clean-and-simple UI redesign (on `main`), savings goals, animations, the professional design pass and a landing page (all on the working branch; `main` has everything up to the design pass).

Open items / owner actions:
- [x] Contact email ranamuneercattlefarm@gmail.com added to `public/privacy.html` and the landing-page footer (2026-11-03, owner's choice; both are public pages).
- [ ] Create the signing key on the owner's own computer (`scripts/make-keystore.sh`, steps in `docs/RELEASE.md`) and add the 4 `ANDROID_*` GitHub secrets; back the key up. (2026-11-04: a key generated in the AI session was deliberately discarded; the owner chose to make their own so no one else sees it.)
- [ ] Play Console: listing, screenshots, Data safety form, closed-test requirement for new accounts (see `docs/RELEASE.md`).
- [ ] Landing page: add real store links once the Android app is on Google Play (currently says "Coming soon"); add a contact email once chosen.
- [ ] Verify the redesign on a real phone (APK) and iPhone (Add to Home Screen); collect UI feedback.
- [ ] Optional: Urdu translation (about 600 strings; needs a native reviewer; consider RTL), per-farm sharing between staff.
- [ ] Optional: move off the debug signing key for testers (Play internal testing track).

## Not planned / known limits
- No iOS native app (iPhones use the web app via Add to Home Screen).
- One shared record per user: very large farms (thousands of records) are fine; multi-user farms sharing one account
  would need a different data model.
