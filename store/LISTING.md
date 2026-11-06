# Google Play listing: Dairy Farm Manager

Copy each block into the matching Play Console field. Images are in this folder.

## Main store listing (English)

**App name** (max 30): `Dairy Farm Manager`

**Short description** (max 80):
`Farm records for dairy farmers: cashbook, ledgers, cows, feed and milk.`

**Full description** (max 4000):

```
Dairy Farm Manager keeps all your farm records in one simple app, and it works even when you have no internet.

WHAT YOU CAN DO

Cashbook and ledgers
- Record daily income and expenses in seconds
- Create separate ledgers, for example Milk business, Household or Feed account
- See the total of all ledgers on the home screen, and open any ledger to see its own income, expenses and balance
- Edit or delete any entry later; search and filter by month or type
- See where your money goes with an expense breakdown and a 6-month chart

Cows and breeding
- Cow AI and pregnancy log with expected calving date, heat check and pregnancy check dates
- Record calving and add the calf to your herd
- Milkers: daily morning and evening milk for every cow
- Wachi (heifers): age, weight and when they are ready for first AI

Feed, health and milk buyers
- Monthly Wanda (feed) stock with installments and the balance still due
- Vaccination and deworming records with the next due date
- Doodhi (milk buyer) khata with advances and payments
- Sold cows log with cost, sale price and profit

Savings goals
- Set a target and a date, add money as you save, and see how much to put aside each month

Made for real farms
- Works offline: your records are saved on your phone first
- Optional free account to back up your data and open it on another phone
- Reminders (optional) for heat checks, pregnancy checks, dry-off, calving and vaccine dates
- Back up or export your records any time (JSON and CSV)
- Light and dark mode, large easy buttons, no ads

YOUR DATA IS YOURS
Your records stay on your phone unless you create an account. With an account, each farm's data is private and visible only to that account. You can delete your account and all cloud data from inside the app.
```

**Category:** Business (second choice: Productivity)
**Tags:** Business, Finance, Productivity
**Contact email:** ranamuneercattlefarm@gmail.com (public on the listing)
**Website:** https://traderhydr.github.io/dairyfarm/
**Privacy policy URL:** https://traderhydr.github.io/dairyfarm/privacy.html
(Open it once in a browser to make sure it loads before pasting.)

## Images

| Field | File |
| --- | --- |
| App icon (512x512) | `app-icon-512.png` |
| Feature graphic (1024x500) | `feature-graphic-1024x500.png` |
| Phone screenshots (upload 2 to 8, in this order) | `screenshots/1-cashbook.png` to `screenshots/8-dark.png` (1080x1920) |

The screenshots use the app's sample data. Regenerate them after big UI changes with `scripts/make-store-assets.mjs`.

## App content questions

- **App or game:** App. **Free or paid:** Free (this cannot be changed to free later if you pick paid).
- **Ads:** No ads.
- **Target audience:** 18 and over only. Not designed for children.
- **Content rating questionnaire:** category "Utility, productivity, communication or other". Answer **No** to everything (no violence, sexual content, language, drugs, gambling, user-to-user sharing, location sharing). Expected rating: Everyone.
- **News app / COVID-19 app / government app / financial features:** No. The cashbook is personal record keeping; it does not move money, lend or offer loans.
- **Health apps:** No (the vaccination records are for animals).

## Data safety form

Does the app collect or share user data? **Yes, collects. No, does not share.**

| Data type | Collected | Shared | Optional | Purpose | Notes |
| --- | --- | --- | --- | --- | --- |
| Email address (Personal info) | Yes | No | Yes (only if the farmer makes an account) | Account management | Used to sign in |
| Other user-generated content / app activity: the farm records typed in (cashbook, animals, feed, health, milk buyers) | Yes | No | Yes (only with an account) | App functionality | Stored in the cloud for backup and sync |

- **Everything else (location, contacts, photos, files, device IDs, advertising ID, analytics, crash logs, financial info like cards):** Not collected.
- **Is all data encrypted in transit?** Yes (HTTPS).
- **Can users request data deletion?** Yes. In the app: Account, then "Delete my account and data". The policy page also explains it.
- **Account deletion URL** (Play asks for a web link): `https://traderhydr.github.io/dairyfarm/privacy.html`
- **Data deletion:** also offer the contact email as the way to request deletion by email.

## Release steps in Play Console

1. **Create app**: name above, language English, App, Free, accept the declarations.
2. Fill the **Dashboard "Set up your app"** tasks: privacy policy, app access (**All functionality is available without special access**: the app works without an account), ads (No), content rating, target audience (18+), data safety, government apps (No), financial features (None), health (No).
3. **Store listing**: paste the text above and upload the images.
4. **Testing, Closed testing, Create track**: 
   - New personal developer accounts must run a closed test with **at least 12 testers for 14 days in a row** before they can apply for production.
   - Add testers by email (Gmail addresses): ask 15 to 20 people so you stay above 12 even if some leave. Make an email list in Play Console and attach it to the track.
   - Upload the `.aab` from the GitHub build (*Actions, newest Build Android run, Artifacts, Dairy-Farm-Manager-release*), accept **Play App Signing**, write release notes ("First release"), then send for review.
   - Send testers the opt-in link Play Console gives you; they must accept it and install from Google Play and keep it installed.
5. After 14 days: **Apply for production** (Dashboard), answer the short questions about the test, then create the production release with the same or a newer `.aab` and roll it out.
6. When the app is live, replace "Coming soon" on the website with the Google Play link (tell me and I will do it).

## Before every upload

- The build number (`versionCode`) is the GitHub run number, so each new build is higher automatically. Play rejects an `.aab` with a number it has seen.
- Bump `version` in `package.json` for releases you want users to see.
- Keep a backup of `dairyfarm-release.p12` and its password. With Play App Signing it is only the upload key, but you still need it for every upload.
