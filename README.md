# Wasel (واصل) — delivery route app for social-commerce couriers in Jordan

Freelance couriers who deliver for Instagram / Facebook / WhatsApp shops get one screen with:

- their **live GPS position** and every customer's **exact pin** on Google Maps;
- stops **sorted closest-first** into an efficient route (and optionally re-ordered by real roads);
- **one-tap status**: delivered, partial, exchange, postponed, not reachable, refused, returned — with reasons;
- a **customer location link** sent on WhatsApp — the customer taps it, shares their location, and the order joins the route;
- **paste-from-WhatsApp** order entry (name, Jordanian mobile, JD amount, Google Maps link);
- a **cash ledger per shop** with a WhatsApp summary.

Arabic (RTL) first, English available. Plan, Jordan considerations and UX spec: [`docs/PLAN.md`](docs/PLAN.md).

## Structure

| Path | What |
| --- | --- |
| `web/` | Angular 20 app (standalone components, signals, zoneless, `@angular/google-maps`) |
| `server/` | Node + Express 5 API, JSON-file store, Google Routes API proxy |
| `docs/PLAN.md` | Engineering plan + UX design spec |

## Run locally

```bash
# 1. API (port 3000)
cd server && npm install && npm start

# 2. Web app (port 4200, proxies /api to :3000)
cd web && npm install && npm start
```

Open http://localhost:4200 on your phone or in Chrome DevTools' mobile view and create a courier account.

### Google Maps keys

The app works without keys: the map is hidden, and stops are still sorted by straight-line distance. To turn the map on:

| Env var (server) | Google Cloud setup | Used for |
| --- | --- | --- |
| `GOOGLE_MAPS_BROWSER_KEY` | Enable **Maps JavaScript API**; restrict the key by HTTP referrer (your domain) | Map, pins, customer pin picker |
| `GOOGLE_MAPS_MAP_ID` (optional) | Create a Map ID (vector) — defaults to `DEMO_MAP_ID` | Advanced markers |
| `GOOGLE_MAPS_SERVER_KEY` (optional) | Enable **Routes API**; restrict by server IP | "Optimise with roads" button |

```bash
GOOGLE_MAPS_BROWSER_KEY=... GOOGLE_MAPS_SERVER_KEY=... npm start
```

The browser key is served at runtime from `/api/config`, so one build works in every environment.

### Production

```bash
cd web && npm run build          # outputs web/dist/web/browser
cd ../server && npm start        # serves the API and the built app on PORT (default 3000)
```

Serve over **HTTPS** — browsers only allow GPS on secure origins. Other env vars: `PORT`, `DATA_FILE`
(default `server/data/db.json`), `STATIC_DIR`.

## Deploy to Firebase (project `delivery-guy-70b4a`)

Firebase Hosting serves the app; `/api/**` is rewritten to a 2nd-gen Cloud Function (`server/src/firebase.js`,
region `europe-west1`) that runs the same Express API. Data is kept as one JSON object (`wasel/db.json`) in the
project's default Storage bucket; the function runs as a single instance and only answers a write once it is saved.
Browser access to Storage is denied (`storage.rules`). The web app connects to Firebase through
`web/src/app/core/firebase.ts` (config in `firebase-config.ts`, or Hosting's `/__/firebase/init.json`).

One-time, in the [Firebase console](https://console.firebase.google.com/project/delivery-guy-70b4a):
put the project on the **Blaze** plan (needed for Cloud Functions) and open **Storage → Get started** once.

Then, signed in (`npx -y firebase-tools@latest login`, or a service-account key in
`GOOGLE_APPLICATION_CREDENTIALS` / `FIREBASE_SERVICE_ACCOUNT`):

```bash
./scripts/firebase-setup.sh    # registers the "Wasel Web" app and writes its config
./scripts/deploy-firebase.sh   # → https://delivery-guy-70b4a.web.app
```

Test locally first with `npx -y firebase-tools@latest emulators:start --only hosting,functions,storage --project demo-wasel`.

## Tests

```bash
cd server && npm test                                   # API + Google helpers (node:test)
cd web && CHROME_BIN=/path/to/chrome npx ng test --watch=false   # route optimiser, WhatsApp parser, helpers
```
