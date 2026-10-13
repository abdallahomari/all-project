#!/usr/bin/env bash
# Deploy Wasel to Firebase project delivery-guy-70b4a:
#   Hosting (Angular app) + Cloud Functions 2nd gen (API) + Storage rules.
#
# Login (one of):
#   GOOGLE_APPLICATION_CREDENTIALS  path to a service-account JSON key
#   FIREBASE_SERVICE_ACCOUNT        the JSON key itself
#   or `npx -y firebase-tools@latest login` on your own machine
# Optional: FIREBASE_PROJECT (default from .firebaserc), GOOGLE_MAPS_BROWSER_KEY,
#           GOOGLE_MAPS_SERVER_KEY, GOOGLE_MAPS_MAP_ID
# Functions need the project on the Blaze plan; Storage needs "Get started" once in the console.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/firebase-auth.sh

PROJECT="${FIREBASE_PROJECT:-delivery-guy-70b4a}"

# Function environment (read by firebase deploy from server/.env.<project>).
{
  echo "GOOGLE_MAPS_BROWSER_KEY=${GOOGLE_MAPS_BROWSER_KEY:-}"
  echo "GOOGLE_MAPS_SERVER_KEY=${GOOGLE_MAPS_SERVER_KEY:-}"
  echo "GOOGLE_MAPS_MAP_ID=${GOOGLE_MAPS_MAP_ID:-}"
} > "server/.env.${PROJECT}"

npm --prefix server ci --omit=dev
npx -y firebase-tools@latest deploy --project "$PROJECT" --only hosting,functions,storage --non-interactive --force

echo "Live at: https://${PROJECT}.web.app"
