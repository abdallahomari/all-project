# Wasel — Courier app for social-commerce deliveries (Jordan MVP)

> Working name: **Wasel** (واصل, "arrived"). Rename freely.

This document is the engineering plan and UX design spec that the code in `web/` and `server/` implements.
It covers what had to be considered before building, the decisions taken, and what is deliberately left for later.

---

## 1. Problem in one paragraph

A freelance courier in Amman collects parcels from 3–8 Instagram/Facebook shops a day. Each shop sends the
order on WhatsApp in its own format. Customers describe locations by landmarks ("behind Cozmo, 7th circle"),
pay cash on delivery, and are often not home. The courier sorts stops in their head, calls each customer to
find the house, and settles cash with each shop from memory. **Wasel** gives the courier one screen: their own
live position, every customer's exact pin, the stops sorted nearest-first into an efficient route, one-tap
status updates, and a cash ledger per shop.

## 2. Jordan-specific considerations

| Topic | What it means for the product | Decision in MVP |
| --- | --- | --- |
| Addressing | Street names/numbers are used inconsistently; people navigate by landmarks and circles (دوار). A text address is not enough to route. | A GPS pin is required to put an order on the route. Customer sends it through a link; text address kept as a note. |
| WhatsApp is the channel | Shops and customers live on WhatsApp. Locations arrive as Google Maps links or pins. | Paste a WhatsApp message → we extract phone, amount, name and any Google Maps link. "Ask for location" opens WhatsApp with a ready message + link. |
| Google Maps links | Shared as `maps.google.com/?q=lat,lng`, `google.com/maps/place/…/@lat,lng`, `…!3dlat!4dlng`, or short `maps.app.goo.gl/…` links. | Client parses all long formats. Short links are resolved by the server (follows the redirect). |
| Phone numbers | Mobile numbers: `07[789]XXXXXXX` locally, `+962 7[789] XXX XXXX` internationally; Arabic-Indic digits (٠١٢…) are common in messages. | Normaliser converts Arabic-Indic digits and stores E.164 (`+9627…`). `wa.me` links use `9627…`. |
| Currency | Jordanian Dinar (JOD, د.أ) has **3 decimals** (1 JD = 1000 fils). Prices written as "15 JD", "15 دينار", "15.500". | Money is stored as **integer fils**. Displayed with up to 3 decimals. |
| Cash on delivery | Most orders are COD; refusals and "not home" are frequent. | Every failed status needs a reason. Cash ledger shows collected vs. expected per shop. |
| Language | Arabic first, many couriers also read English. | Arabic default with full RTL; one-tap switch to English. |
| Working week | Friday is the weekend; Saturday is a working day for many shops. | "Today" is a calendar day; no weekday assumptions. |
| Connectivity | Mostly good 4G in Amman/Irbid/Zarqa, weaker in outskirts. | Orders are cached locally; the list and route still work if the network drops. |
| Devices | Mid-range Android, used one-handed on a motorbike, outdoors in sun. | Mobile-first PWA-style web app, 48px touch targets, high contrast, large type. |
| Privacy law | Jordan's Personal Data Protection Law No. 24 of 2023 applies to customer names, phones and home locations. | Store the minimum; public location link reveals only the shop name; links are random 128-bit tokens; data can be deleted. Server-side encryption at rest and retention jobs are on the roadmap. |
| Google Maps coverage | Good road data and geocoding in Jordanian cities. | Google Maps JavaScript API for the map; Routes API for road-aware ordering when a server key is configured. |

## 3. Scope

**In the MVP (built):**

1. Courier account (name, phone, PIN) — each courier sees only their own data.
2. Shops list (name, phone).
3. Add order: paste-from-WhatsApp parser, manual fields, location by link / map pin / customer request.
4. Customer location page (public link): one button "Share my location", map to fine-tune the pin, confirm.
5. Route screen: live courier position, numbered pins, list ordered nearest-first and optimised, distance to each stop, "next stop" card.
6. Stop actions: Navigate (Google Maps app), Call, WhatsApp, status update with reason and collected amount.
7. Statuses: Pending pickup → Picked up → Delivered / Partial / Exchange / Postponed / Unreachable / Refused / Returned.
8. Cash ledger: per shop expected vs. collected, delivered count, failed count; share summary on WhatsApp.
9. Arabic/English with RTL.

**Next (not built):** shop web dashboard, AI parsing of screenshots/voice notes, customer ETA messages via
WhatsApp Business API, proof-of-delivery photos, multi-day history and analytics, native app wrapper (Capacitor),
Postgres/Supabase instead of the JSON store.

## 4. Architecture

```
┌──────────────────────────── Browser (courier phone) ─────────────────────────────┐
│ Angular 20 (standalone, signals, zoneless)                                        │
│  features/  route · order-form · cash · shops · settings · login · share-location │
│  domain/    route-optimizer · order-parser · maps-link · phone · money (pure TS)  │
│  core/      api · auth · i18n · geolocation · google-maps-loader · orders store   │
└───────────────┬───────────────────────────────────────────┬──────────────────────┘
                │ REST /api (JSON, bearer token)            │ Maps JS API (browser key)
┌───────────────▼─────────────────────┐          ┌──────────▼───────────────┐
│ Node + Express (server/)            │          │ Google Maps Platform      │
│  auth (scrypt PIN, random tokens)   │──Routes──▶  Routes API (server key)  │
│  orders, shops, public location     │  API     │  Maps JavaScript API      │
│  short-link resolver, route proxy   │          └──────────────────────────┘
│  JSON file store (swap for Postgres)│
└─────────────────────────────────────┘
```

### Key engineering decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Framework | Angular 20, standalone components, signals, `provideZonelessChangeDetection` | Requested; signals + zoneless keep a map-heavy UI fast on mid-range phones. |
| Maps | `@angular/google-maps` + Advanced Markers, script loaded at runtime with the key from `/api/config` | Key is not baked into the build; one build works for every environment. |
| Route ordering | **Two layers.** 1) Local: nearest-neighbour from the courier's GPS + 2-opt improvement on haversine distance — instant, free, works offline. 2) Server: Google Routes API `computeRoutes` with `optimizeWaypointOrder` for real road order + polyline, when `GOOGLE_MAPS_SERVER_KEY` is set. | The courier always gets an order immediately; road accuracy is added when available. Costs stay per "Optimise" tap, never per GPS tick. |
| Open-ended route | Courier does not return to a depot. Local solver optimises an open path; the Routes call uses the local last stop as destination. | Matches how freelance couriers work. |
| Money | Integer fils | Avoids float errors with 3-decimal JOD. |
| Storage | JSON file with atomic writes behind a small repository module | Zero setup for the MVP; the repository is the only thing to replace for Postgres. |
| Auth | Phone + 4–6 digit PIN, scrypt hash, random bearer token | Couriers will not manage passwords; good enough for a pilot. |
| Public location link | `/l/:token`, 128-bit random token per order, reveals only shop name + whether a pin exists | Customers share location without accounts; nothing else leaks. |

### Data model

```
Courier { id, name, phone, pinHash, createdAt }
Session { token, courierId, createdAt }
Shop    { id, courierId, name, phone?, createdAt }
Order   { id, courierId, shopId, customerName, customerPhone, amountFils, collectedFils?,
          addressNote?, location?: { lat, lng, accuracy?, source: 'customer'|'link'|'pin', at },
          locationToken, status, statusReason?, statusNote?, postponedTo?,
          createdAt, updatedAt, closedAt? }
```

### API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/config` | Browser Maps key + map id + whether server routing is on |
| POST | `/api/auth/register`, `/api/auth/login` | Returns `{ token, courier }` |
| GET/POST/PATCH/DELETE | `/api/shops[/:id]` | Courier's shops |
| GET/POST/PATCH/DELETE | `/api/orders[/:id]` | Courier's orders (`?scope=active|today|all`) |
| POST | `/api/route/optimize` | Road-aware order via Routes API (falls back to 501 when no key) |
| POST | `/api/maps/resolve` | Expand a `maps.app.goo.gl` short link to coordinates |
| GET/POST | `/api/public/location/:token` | Customer location page read / submit |

## 5. UX design spec

### Principles

1. **One thumb, one glance.** Every action on the road is reachable with the thumb, in ≤ 2 taps, readable in sunlight.
2. **The next stop is the hero.** The route screen leads with one big card: who, where, how far, how much cash.
3. **Never block the courier.** Missing location is a warning, not an error; the order still saves.
4. **Arabic first.** Layout mirrors in RTL; numbers stay Western digits for clarity on amounts and phones.

### Visual system

| Token | Value | Use |
| --- | --- | --- |
| Primary | Teal `#0F766E` | Main actions, active nav |
| Courier dot | Blue `#2563EB` | Courier position |
| Success | Green `#15803D` | Delivered, collected cash |
| Warning | Amber `#B45309` | Missing location, postponed |
| Danger | Red `#B91C1C` | Refused, unreachable |
| Surface | `#FFFFFF` on `#F4F6F8` | Cards on page |
| Type | IBM Plex Sans Arabic / system UI, 16px base, 20–28px for amounts and names | Legible on the move |
| Touch target | ≥ 48px | Gloves, motion |
| Radius | 14px cards, 999px chips | Soft, friendly |

Dark mode follows the system setting.

### Screens

1. **Route (home)** — map (top ~45% of the screen, collapsible) with blue courier dot and numbered pins in route order;
   *Next stop* card (customer, area note, distance, cash to collect, buttons: Navigate · Call · WhatsApp · Done);
   below it the remaining stops as a numbered list; a "No location" group at the end with an "Ask customer" button.
   Header: progress (e.g. 4 / 17 delivered) and an **Optimise route** button.
2. **Add order** — big "Paste from WhatsApp" box first; parsed fields fill below (shop, customer, phone, amount, note);
   location block with three options: paste a Maps link, drop a pin on the map, or ask the customer.
3. **Stop sheet** — opens from any stop: details, the status buttons as large chips; failure statuses ask for a reason
   (preset chips + free text); Delivered asks to confirm the collected amount (pre-filled).
4. **Cash** — today's totals at the top (collected, still to collect), then one card per shop: delivered,
   failed, collected, with "Share on WhatsApp".
5. **Shops** — simple list + add.
6. **Settings** — language, account, sign out.
7. **Customer location page** (public) — shop name, one huge "Share my location" button, map with a draggable pin,
   "Confirm location", then a thank-you state. Works without login, in Arabic by default.

### Navigation

Bottom bar with four items: **Route · Add · Cash · More** (More = Shops + Settings).

## 6. Route ordering algorithm (local)

1. Start at the courier's current GPS position (or the first stop if GPS is unavailable).
2. **Nearest neighbour:** repeatedly go to the closest unvisited stop (haversine distance).
3. **2-opt:** reverse any segment whose reversal shortens the open path; repeat until no gain (bounded passes).
4. Stops without a location are appended at the end, flagged.
5. Straight-line distance is multiplied by a 1.3 road factor for the displayed "≈ km" (urban detour factor).

When a server key exists, the courier can tap **Optimise with roads**: the server calls Routes API with the
current position as origin, the locally-last stop as destination and the others as intermediates with
`optimizeWaypointOrder: true` (max 25 intermediates), and returns the order + polyline + duration.

## 7. Risks and how the build handles them

| Risk | Handling |
| --- | --- |
| Customers don't share location | WhatsApp "ask" message is pre-written in Arabic; order still works with a manual pin. |
| GPS denied or inaccurate | App explains how to enable it; list falls back to creation order; accuracy shown on customer page. |
| Maps key missing / quota hit | App still works as a list; map area shows a clear setup message. |
| API cost | Local ordering is free; Routes API only on explicit tap. |
| Data leak through public link | Unguessable token; page shows shop name only; submit only accepts coordinates inside a Jordan bounding box. |

## 8. Running it

See the repository `README.md`.
