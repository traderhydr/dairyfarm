#!/usr/bin/env bash
# Creates the Android signing key for Dairy Farm Manager on YOUR computer, so nobody else ever sees it.
# Mac / Linux: run in a terminal.  Windows: run in "Git Bash" (installed with Git for Windows).
#
#   ./scripts/make-keystore.sh [key-file-name] [alias]
#
# It needs Java (the `keytool` program): install a JDK from https://adoptium.net if it says keytool is missing.
# KEEP THE .p12 FILE AND ITS PASSWORD SAFE (password manager + a second copy somewhere private).
# Never commit them. With Google Play App Signing this is only the *upload* key, so a lost key can be reset by Google.
set -euo pipefail

OUT="${1:-dairyfarm-release.p12}"
ALIAS="${2:-dairyfarm}"
B64="${OUT%.*}.base64.txt"

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool was not found. Install Java (a JDK, version 17 or newer) from https://adoptium.net and try again." >&2
  exit 1
fi
if [ -e "$OUT" ] || [ -e "$B64" ]; then
  echo "Refusing to overwrite $OUT / $B64. Move or rename them first." >&2
  exit 1
fi

read -rsp "Choose a password (at least 8 characters; letters and numbers are safest): " PASS; echo
read -rsp "Type the same password again: " PASS2; echo
if [ "$PASS" != "$PASS2" ]; then echo "The passwords did not match. Nothing was created." >&2; exit 1; fi
if [ "${#PASS}" -lt 8 ]; then echo "Please use at least 8 characters. Nothing was created." >&2; exit 1; fi

keytool -genkeypair -noprompt -keystore "$OUT" -storetype PKCS12 -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=Dairy Farm Manager, O=Hydr, C=PK"

# the key file as one line of text, ready to paste into GitHub (works on macOS, Linux and Git Bash)
base64 < "$OUT" | tr -d '\n' > "$B64"

cat <<MSG

Done. Two files were created in this folder:
  $OUT         your signing key (keep it safe, never share it, never commit it)
  $B64   the same key as text, only needed once to paste into GitHub

Now add FOUR secrets in GitHub (repository -> Settings -> Secrets and variables -> Actions -> Secrets -> New repository secret):

  ANDROID_KEYSTORE_BASE64    open $B64, select all, copy, paste
  ANDROID_KEYSTORE_PASSWORD  the password you just chose
  ANDROID_KEY_ALIAS          $ALIAS
  ANDROID_KEY_PASSWORD       the same password again

Then delete $B64 (you only need it for this paste), and back up $OUT and the password.
MSG
