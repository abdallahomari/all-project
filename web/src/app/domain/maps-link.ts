import { LatLng, inJordan } from './geo';
import { toLatinDigits } from './digits';

const COORD_PATTERNS: RegExp[] = [
  /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // place data (most precise)
  /[?&](?:q|query|ll|destination|daddr|center)=(?:loc:)?(-?\d{1,2}\.\d+)\s*,\s*\+?(-?\d{1,3}\.\d+)/,
  /\/search\/(-?\d{1,2}\.\d+),\s*\+?(-?\d{1,3}\.\d+)/,
  /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, // map viewport
  /geo:(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
];

/** Bare "31.9539, 35.9106" written in a message (at least 3 decimals to avoid matching prices). */
const BARE_COORDS = /(?<![\d.])(-?\d{1,2}\.\d{3,})\s*[,،]\s*(-?\d{1,3}\.\d{3,})(?![\d.])/;

const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const SHORT_LINK = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i;

export interface FoundLocation {
  /** Coordinates when they could be read directly. */
  location?: LatLng;
  /** A short link (maps.app.goo.gl) that the server has to expand. */
  shortLink?: string;
  /** The URL or text the location came from. */
  raw: string;
}

export function coordsFromText(text: string): LatLng | null {
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    /* keep raw */
  }
  decoded = toLatinDigits(decoded);
  for (const pattern of COORD_PATTERNS) {
    const m = decoded.match(pattern);
    if (m) {
      const loc = { lat: Number(m[1]), lng: Number(m[2]) };
      if (Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) return loc;
    }
  }
  return null;
}

/** Finds the first Google Maps location in a free-text WhatsApp message. */
export function findLocation(text: string): FoundLocation | null {
  const latin = toLatinDigits(text);
  for (const url of latin.match(URL_RE) ?? []) {
    const clean = url.replace(/[).,،]+$/, '');
    if (SHORT_LINK.test(clean)) return { shortLink: clean, raw: clean };
    if (/google\.|goo\.gl/i.test(clean)) {
      const location = coordsFromText(clean);
      if (location && inJordan(location)) return { location, raw: clean };
    }
  }
  const geo = coordsFromText(latin.match(/geo:[^\s]+/)?.[0] ?? '');
  if (geo && inJordan(geo)) return { location: geo, raw: 'geo' };
  const bare = latin.match(BARE_COORDS);
  if (bare) {
    const location = { lat: Number(bare[1]), lng: Number(bare[2]) };
    if (inJordan(location)) return { location, raw: bare[0] };
  }
  return null;
}

/** Opens turn-by-turn navigation in the Google Maps app (or web). */
export const navigationUrl = ({ lat, lng }: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
