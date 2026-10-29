#!/usr/bin/env bash
# Creates the Android release keystore and prints the values to store as GitHub secrets.
# KEEP THE .jks FILE AND PASSWORDS SAFE (password manager + offline copy): if you lose them
# you can never publish an update to the same Play Store app.
set -euo pipefail

OUT="${1:-dairyfarm-release.jks}"
ALIAS="${2:-dairyfarm}"

if [ -e "$OUT" ]; then echo "Refusing to overwrite $OUT" >&2; exit 1; fi

read -rsp "Choose a keystore password (min 6 chars): " PASS; echo
keytool -genkeypair -v -keystore "$OUT" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" -dname "CN=Dairy Farm Manager, O=Dairy Farm, C=PK"

echo
echo "Created $OUT. Add these GitHub repository secrets (Settings -> Secrets and variables -> Actions):"
echo "  ANDROID_KEYSTORE_BASE64   = $(base64 -w0 "$OUT" 2>/dev/null | cut -c1-24)...(run: base64 -w0 $OUT)"
echo "  ANDROID_KEYSTORE_PASSWORD = the password you just typed"
echo "  ANDROID_KEY_ALIAS         = $ALIAS"
echo "  ANDROID_KEY_PASSWORD      = the same password"
