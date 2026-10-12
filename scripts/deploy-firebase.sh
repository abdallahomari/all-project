#!/usr/bin/env bash
# Deploy Wasel to Firebase (Hosting + Cloud Functions 2nd gen + Storage).
#
# Needs, as environment variables:
#   FIREBASE_PROJECT            Firebase project id (create it at https://console.firebase.google.com,
#                               upgrade to the Blaze plan, and open Storage once to create the bucket)
#   GOOGLE_APPLICATION_CREDENTIALS  path to a service-account JSON key, or
#   FIREBASE_SERVICE_ACCOUNT    the JSON key itself (written to a temp file)
# Optional (map + road routing):
#   GOOGLE_MAPS_BROWSER_KEY, GOOGLE_MAPS_SERVER_KEY, GOOGLE_MAPS_MAP_ID
set -euo pipefail
cd "$(dirname "$0")/.."

: "${FIREBASE_PROJECT:?Set FIREBASE_PROJECT to your Firebase project id}"

if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" && -n "${FIREBASE_SERVICE_ACCOUNT:-}" ]]; then
  key_file="$(mktemp)"
  trap 'rm -f "$key_file"' EXIT
  printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$key_file"
  export GOOGLE_APPLICATION_CREDENTIALS="$key_file"
fi
: "${GOOGLE_APPLICATION_CREDENTIALS:?Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT}"

# Function environment (read by firebase deploy from server/.env.<project>).
env_file="server/.env.${FIREBASE_PROJECT}"
{
  echo "GOOGLE_MAPS_BROWSER_KEY=${GOOGLE_MAPS_BROWSER_KEY:-}"
  echo "GOOGLE_MAPS_SERVER_KEY=${GOOGLE_MAPS_SERVER_KEY:-}"
  echo "GOOGLE_MAPS_MAP_ID=${GOOGLE_MAPS_MAP_ID:-}"
} > "$env_file"

npm --prefix server ci --omit=dev
npx --yes firebase-tools@15 deploy --project "$FIREBASE_PROJECT" --only hosting,functions,storage --non-interactive --force

echo "Live at: https://${FIREBASE_PROJECT}.web.app"
