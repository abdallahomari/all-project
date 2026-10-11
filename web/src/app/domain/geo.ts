export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Urban detour factor: straight-line distance × 1.3 ≈ road distance in Jordanian cities. */
export const ROAD_FACTOR = 1.3;

export const roadEstimate = (a: LatLng, b: LatLng) => haversine(a, b) * ROAD_FACTOR;

/** Jordan with a small margin; mirrors server/src/validate.js. */
export const JORDAN_BOUNDS = { south: 29.1, west: 34.8, north: 33.45, east: 39.35 };

export const inJordan = ({ lat, lng }: LatLng) =>
  lat >= JORDAN_BOUNDS.south && lat <= JORDAN_BOUNDS.north && lng >= JORDAN_BOUNDS.west && lng <= JORDAN_BOUNDS.east;

/** Downtown Amman, used to centre maps when no position is known. */
export const AMMAN: LatLng = { lat: 31.9539, lng: 35.9106 };
