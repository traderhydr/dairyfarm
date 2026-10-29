# Releasing the Android app

## What the workflows give you

| Workflow | When | Result |
| --- | --- | --- |
| **Build Android** | every push, or run manually | tests, then a **debug APK** (install on your own phone) |
| same, with signing secrets | every push to a branch | also a **signed release APK** and a **Play Store bundle (.aab)** |
| **Deploy web app** | push to `main`, or manually | the web/PWA version on GitHub Pages (one-time: *Settings -> Pages -> Source: GitHub Actions*) |

Download results from *Actions -> the run -> Artifacts*.

## One-time: create the signing key

The Play Store requires every release to be signed with the same key forever.

```bash
./scripts/make-keystore.sh dairyfarm-release.jks dairyfarm
```

(Needs Java's `keytool`.) **Back up the `.jks` file and its password somewhere safe and private.**
Never commit it. Then add four GitHub **secrets** (*Settings -> Secrets and variables -> Actions -> Secrets*):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | output of `base64 -w0 dairyfarm-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `dairyfarm` (or what you chose) |
| `ANDROID_KEY_PASSWORD` | the key password (same as above with the script) |

The next run produces `Dairy-Farm-Manager-release` with the signed `.apk` and `.aab`.
The build number (`versionCode`) is the workflow run number, so it always increases.
The visible version is `version` in `package.json`; bump it for each release.

## Publishing on Google Play

1. Create a Play Console developer account (one-time fee) and a new app.
2. Complete the store listing: name, short and full description, screenshots (phone, take them from the
   app), the 512x512 icon (`public/icon-512.png`), and a feature graphic (1024x500).
3. **Privacy policy URL:** the policy is `public/privacy.html`. After deploying the web app it is at
   `https://<your-pages-address>/privacy.html`. Fill in the contact email placeholder
   (`YOUR_CONTACT_EMAIL`) in that file first.
4. **Data safety form:** the app collects email address and the farm records you type in (when an
   account is created); data is encrypted in transit; users can request deletion (in-app: *Account -> Delete my account*).
   No ads, no analytics, no location.
5. **Account deletion:** Play requires a web link for deleting accounts as well. Point it at the privacy
   page (it explains in-app deletion) or add a short page of your own.
6. Upload the `.aab`: *Production* (or *Internal testing* first), roll out.

New personal developer accounts must run a closed test with testers for a period before they can
publish to production; check the current Play Console requirements.

## Changing the app id

The package name `com.sadeeq.dairyfarm` is permanent once published. Change it **before** the first
upload in `capacitor.config.json` and `android/app/build.gradle` (and move
`android/app/src/main/java/com/sadeeq/dairyfarm` accordingly) if you want a different one.

## Updating icons

Edit the artwork in `scripts/make-icons.mjs`, run it, then regenerate Android resources:

```bash
node scripts/make-icons.mjs
npx @capacitor/assets generate --android --assetPath assets --iconBackgroundColor '#10b981' \
  --iconBackgroundColorDark '#047857' --splashBackgroundColor '#064e3b' --splashBackgroundColorDark '#022c22'
```
