# Releasing the Android app

## What the workflows give you

| Workflow | When | Result |
| --- | --- | --- |
| **Build Android** | every push, or run manually | tests, then a **debug APK** (install on your own phone) |
| same, with signing secrets | every push to a branch | also a **signed release APK** and a **Play Store bundle (.aab)** |
| **Deploy web app** | push to `main`, or manually | the website on GitHub Pages: landing page at the root, the app at `/app/` (one-time: *Settings -> Pages -> Source: GitHub Actions*) |

Download results from *Actions -> the run -> Artifacts*.

## One-time: create the signing key

Every release must be signed with a key. Create it **on your own computer** so nobody else ever sees it.

1. Install Java if you don't have it: a **JDK 17 or newer** from <https://adoptium.net> (it includes `keytool`).
2. Get the project on your computer (download the repository as a zip, or `git clone`).
3. Open a terminal in the project folder (Mac/Linux: Terminal; Windows: **Git Bash**, installed with Git for Windows) and run:

   ```bash
   ./scripts/make-keystore.sh
   ```

   Choose a password (at least 8 characters) and type it twice. It creates two files:
   `dairyfarm-release.p12` (the key) and `dairyfarm-release.base64.txt` (the same key as text).

   *Windows without Git Bash:* run this in PowerShell instead (use the same password for both), then paste the clipboard in step 4:

   ```powershell
   keytool -genkeypair -keystore dairyfarm-release.p12 -storetype PKCS12 -alias dairyfarm -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Dairy Farm Manager, O=Hydr, C=PK"
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("dairyfarm-release.p12")) | Set-Clipboard
   ```

4. In GitHub open *your repository -> Settings -> Secrets and variables -> Actions -> **Secrets** -> New repository secret*
   and add four secrets:

   | Secret | Value |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | the text in `dairyfarm-release.base64.txt` (select all, copy, paste) |
   | `ANDROID_KEYSTORE_PASSWORD` | the password you chose |
   | `ANDROID_KEY_ALIAS` | `dairyfarm` |
   | `ANDROID_KEY_PASSWORD` | the same password again |

5. Delete `dairyfarm-release.base64.txt`. **Back up `dairyfarm-release.p12` and the password** in two private places
   (a password manager and a second copy). Never put them in the repository or send them in chat; the repository ignores
   `*.p12`, `*.jks` and `*.keystore` files as a safety net.
6. Run *Actions -> Build Android -> Run workflow*. The run now also produces **Dairy-Farm-Manager-release** with a signed
   `.apk` and the `.aab` that Google Play wants. The build number (`versionCode`) is the workflow run number, so it always
   increases; the visible version is `version` in `package.json` (bump it for each release).

**Use Google Play App Signing** (Play Console offers it when you upload your first bundle, and it is the default for new
apps). Then Google keeps the real app-signing key and yours is only an *upload key*: if you ever lose it, Google can reset it.

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

## The app id

The Android package name is `com.hydr.dairyfarm`. It is permanent once the app has been uploaded to Google Play, so it
cannot be changed after the first upload. (To change it before then: edit `appId` in `capacitor.config.json`,
`namespace` and `applicationId` in `android/app/build.gradle`, the two values in
`android/app/src/main/res/values/strings.xml`, and move `android/app/src/main/java/com/hydr/dairyfarm` plus the `package`
line in `MainActivity.java` to match.)

## Updating icons

Edit the artwork in `scripts/make-icons.mjs`, run it, then regenerate Android resources:

```bash
node scripts/make-icons.mjs
npx @capacitor/assets generate --android --assetPath assets --iconBackgroundColor '#10b981' \
  --iconBackgroundColorDark '#047857' --splashBackgroundColor '#064e3b' --splashBackgroundColorDark '#022c22'
```
