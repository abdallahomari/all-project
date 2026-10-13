#!/usr/bin/env bash
# Register the Wasel web app in the Firebase project (once) and write its config into the codebase.
# Needs a Firebase login: GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT (see deploy-firebase.sh)
# or `npx -y firebase-tools@latest login` on your own machine.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/firebase-auth.sh

PROJECT="${FIREBASE_PROJECT:-delivery-guy-70b4a}"
NICKNAME="Wasel Web"
fb() { npx -y firebase-tools@latest "$@" --project "$PROJECT"; }

app_id="$(fb apps:list WEB --json | node -e '
  const r = JSON.parse(require("fs").readFileSync(0, "utf8")).result ?? [];
  const app = r.find((a) => a.displayName === process.argv[1]) ?? r[0];
  process.stdout.write(app?.appId ?? "");' "$NICKNAME")"

if [[ -z "$app_id" ]]; then
  echo "Registering web app \"$NICKNAME\" in $PROJECT…"
  app_id="$(fb apps:create WEB "$NICKNAME" --json | node -e '
    process.stdout.write(JSON.parse(require("fs").readFileSync(0, "utf8")).result.appId);')"
fi
echo "Web app: $app_id"

fb apps:sdkconfig WEB "$app_id" --json | node -e '
  const cfg = JSON.parse(require("fs").readFileSync(0, "utf8")).result.sdkConfig;
  const body = `import type { FirebaseOptions } from \x27firebase/app\x27;

/**
 * Web app config for Firebase project \`${cfg.projectId}\` (app ${cfg.appId}).
 * Written by \`scripts/firebase-setup.sh\` from \`firebase apps:sdkconfig WEB\`.
 * These values are public identifiers, not secrets — access is controlled by security rules.
 */
export const firebaseConfig: FirebaseOptions | null = ${JSON.stringify(cfg, null, 2)};
`;
  require("fs").writeFileSync("web/src/app/core/firebase-config.ts", body);'
echo "Wrote web/src/app/core/firebase-config.ts"
