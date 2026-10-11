// Jordan's bounding box with a small margin. Public submissions outside it are rejected.
export const JORDAN_BOUNDS = { south: 29.1, west: 34.8, north: 33.45, east: 39.35 };

export const STATUSES = [
  'pending_pickup',
  'picked_up',
  'delivered',
  'partial',
  'exchange',
  'postponed',
  'unreachable',
  'refused',
  'returned',
];

export const ACTIVE_STATUSES = ['pending_pickup', 'picked_up'];

export class HttpError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

export function toLatinDigits(value) {
  return String(value).replace(ARABIC_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/** Normalise a Jordanian mobile number to E.164 (+9627XXXXXXXX). Returns null if invalid. */
export function normalizeJordanPhone(raw) {
  if (raw == null) return null;
  let digits = toLatinDigits(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('962')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^7[789]\d{7}$/.test(digits) ? `+962${digits}` : null;
}

export function requireString(value, field, { max = 200, optional = false } = {}) {
  if (value == null || value === '') {
    if (optional) return undefined;
    throw new HttpError(400, 'invalid_' + field);
  }
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_' + field);
  const trimmed = value.trim();
  if (!trimmed && !optional) throw new HttpError(400, 'invalid_' + field);
  if (trimmed.length > max) throw new HttpError(400, 'invalid_' + field);
  return trimmed || undefined;
}

export function requireFils(value, field, { optional = false } = {}) {
  if (value == null && optional) return undefined;
  if (!Number.isInteger(value) || value < 0 || value > 100_000_000) {
    throw new HttpError(400, 'invalid_' + field);
  }
  return value;
}

export function inJordan(lat, lng) {
  return (
    lat >= JORDAN_BOUNDS.south &&
    lat <= JORDAN_BOUNDS.north &&
    lng >= JORDAN_BOUNDS.west &&
    lng <= JORDAN_BOUNDS.east
  );
}

export function requireLocation(value, { optional = false, source } = {}) {
  if (value == null) {
    if (optional) return undefined;
    throw new HttpError(400, 'invalid_location');
  }
  const { lat, lng, accuracy } = value;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new HttpError(400, 'invalid_location');
  }
  if (!inJordan(lat, lng)) throw new HttpError(400, 'location_outside_jordan');
  const loc = {
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    source: source ?? (['customer', 'link', 'pin'].includes(value.source) ? value.source : 'pin'),
    at: new Date().toISOString(),
  };
  if (typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0) {
    loc.accuracy = Math.round(accuracy);
  }
  return loc;
}
