import { HttpError, inJordan } from './validate.js';

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const MAX_INTERMEDIATES = 25;

const toWaypoint = ({ lat, lng }) => ({ location: { latLng: { latitude: lat, longitude: lng } } });
const seconds = (duration) => (duration ? Number.parseInt(String(duration), 10) || 0 : 0);

/**
 * Road-aware stop ordering with the Google Routes API.
 * `origin` is the courier, `stops` are ordered by the local heuristic; its last stop is the destination.
 * Returns { order: stopIds[], distanceMeters, durationSeconds, polyline }.
 */
export async function optimizeRoute({ apiKey, origin, stops, language = 'ar', fetchImpl = fetch }) {
  if (!apiKey) throw new HttpError(501, 'routing_not_configured');
  if (stops.length === 0) return { order: [], distanceMeters: 0, durationSeconds: 0, polyline: null };
  if (stops.length - 1 > MAX_INTERMEDIATES) throw new HttpError(400, 'too_many_stops');

  const destination = stops.at(-1);
  const intermediates = stops.slice(0, -1);
  const body = {
    origin: toWaypoint(origin),
    destination: toWaypoint(destination),
    intermediates: intermediates.map(toWaypoint),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: intermediates.length > 1,
    languageCode: language === 'en' ? 'en' : 'ar',
    regionCode: 'JO',
    units: 'METRIC',
  };

  const res = await fetchImpl(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.warn('Routes API error', res.status, detail.slice(0, 500));
    throw new HttpError(502, 'routing_failed');
  }
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) throw new HttpError(502, 'routing_failed');

  const index = route.optimizedIntermediateWaypointIndex;
  const orderedIntermediates =
    Array.isArray(index) && index.length === intermediates.length && index.every((i) => i >= 0)
      ? index.map((i) => intermediates[i])
      : intermediates;

  return {
    order: [...orderedIntermediates, destination].map((s) => s.id),
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: seconds(route.duration),
    polyline: route.polyline?.encodedPolyline ?? null,
  };
}

const MAPS_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+|consent\.google\.[a-z.]+)$/i;

/** Extract coordinates from a long Google Maps URL. Mirrors web/src/app/domain/maps-link.ts. */
export function coordsFromMapsUrl(raw) {
  let text;
  try {
    text = decodeURIComponent(raw);
  } catch {
    text = raw;
  }
  const patterns = [
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // place data (most precise)
    /[?&](?:q|query|ll|destination|daddr|center)=(?:loc:)?(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/,
    /\/search\/(-?\d{1,2}\.\d+),\s*\+?(-?\d{1,3}\.\d+)/,
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, // map viewport
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  return null;
}

/** Follow a short Google Maps link (maps.app.goo.gl) to its coordinates. Only Google hosts are fetched. */
export async function resolveMapsLink(url, { fetchImpl = fetch, maxHops = 5 } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxHops; hop++) {
    let parsed;
    try {
      parsed = new URL(current);
    } catch {
      throw new HttpError(400, 'invalid_url');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new HttpError(400, 'invalid_url');
    if (!MAPS_HOSTS.test(parsed.hostname)) throw new HttpError(400, 'not_a_maps_link');

    const coords = coordsFromMapsUrl(current);
    if (coords) {
      if (!inJordan(coords.lat, coords.lng)) throw new HttpError(400, 'location_outside_jordan');
      return coords;
    }
    // Google consent interstitial carries the real target in ?continue=
    const cont = parsed.searchParams.get('continue');
    if (cont) {
      current = cont;
      continue;
    }
    if (hop === maxHops) break;
    const res = await fetchImpl(current, { redirect: 'manual' });
    const next = res.headers.get('location');
    if (!next) break;
    current = new URL(next, current).toString();
  }
  throw new HttpError(422, 'no_coordinates_in_link');
}
