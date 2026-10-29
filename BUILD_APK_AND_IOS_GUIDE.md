# Dairy Farm Manager — Android (.apk) & iPhone (iOS) Build Package

## Important Note on Android (`.apk`) vs. iPhone (`iOS`)
* **Android phones** use `.apk` files (or Chrome Progressive Web Apps).
* **iPhones (iOS)** cannot install `.apk` files — they use **Safari "Add to Home Screen"** (which works immediately with no developer account fee) or `.ipa` packages compiled on a Mac with Xcode.

---

## Option 1: Fastest Way (No Coding or Compiling Needed — Works in 10 Seconds)

### On iPhone (iOS):
1. Send `www/index.html` to your iPhone (via WhatsApp, Google Drive, or iCloud) and open it in **Safari**.
2. Tap the **Share** button at the bottom of Safari.
3. Tap **"Add to Home Screen"**.
4. Your **Dairy Farm Manager** icon appears on your iPhone Home Screen and opens in full-screen standalone mode!

### On Android:
1. Open `www/index.html` in **Google Chrome** on your Android phone.
2. Tap the **3-dot menu** in the top-right corner and select **"Add to Home screen"** or **"Install app"**.

---

## Option 2: Compile a Downloadable Android `.apk` Automatically in the Cloud (Free via GitHub)

This folder includes an automated GitHub Actions cloud compiler (`.github/workflows/build-android-apk.yml`):
1. Create a free repository on [GitHub](https://github.com) and upload all files from this ZIP.
2. Click the **Actions** tab in your GitHub repository and run **Build Android APK**.
3. In ~2 minutes, download `Dairy-Farm-Manager-Android-APK` (`app-debug.apk`) from the workflow summary and install it directly on your Android phone!

---

## Option 3: Build `.apk` (Android) or `.ipa` (iOS) on Your Computer with Capacitor

If you have Node.js installed on your computer:
```bash
npm ci
npm run build:css   # re-run whenever you change Tailwind classes in www/index.html
npx cap add android
npx cap sync
cd android && ./gradlew assembleDebug
```
Your `.apk` will be ready at `android/app/build/outputs/apk/debug/app-debug.apk`.
For iPhone (`.ipa` on macOS with Xcode):
```bash
npx cap add ios
npx cap open ios
```
