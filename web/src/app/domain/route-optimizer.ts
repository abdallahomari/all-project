import { LatLng, haversine } from './geo';

export interface Stop extends LatLng {
  id: string;
}

export interface RoutePlan {
  /** Stop ids in visiting order. */
  order: string[];
  /** Straight-line metres of the whole open path, starting at the origin when given. */
  totalMeters: number;
}

/**
 * Orders stops into a short open path (the courier does not return to a depot).
 *
 * 1. Nearest neighbour from the origin (courier GPS) builds a first route.
 * 2. 2-opt reverses segments while that shortens the path.
 *
 * Without an origin the path starts at the stop farthest from the centroid, which
 * tends to sweep the area from one edge instead of zig-zagging through the middle.
 * Runs in well under 10 ms for the 20–60 stops of a courier day.
 */
export function planRoute(origin: LatLng | null, stops: Stop[], maxPasses = 50): RoutePlan {
  if (stops.length === 0) return { order: [], totalMeters: 0 };

  const remaining = [...stops];
  let start: LatLng;
  const path: Stop[] = [];

  if (origin) {
    start = origin;
  } else {
    const centroid = {
      lat: stops.reduce((s, p) => s + p.lat, 0) / stops.length,
      lng: stops.reduce((s, p) => s + p.lng, 0) / stops.length,
    };
    let edge = 0;
    remaining.forEach((p, i) => {
      if (haversine(p, centroid) > haversine(remaining[edge], centroid)) edge = i;
    });
    start = remaining[edge];
    path.push(...remaining.splice(edge, 1));
  }

  let current: LatLng = path.at(-1) ?? start;
  while (remaining.length) {
    let best = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversine(current, p);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const [next] = remaining.splice(best, 1);
    path.push(next);
    current = next;
  }

  // pts[0] (the origin, or the chosen first stop) never moves.
  const pts: LatLng[] = origin ? [origin, ...path] : path;
  const n = pts.length;
  let improved = true;
  for (let pass = 0; improved && pass < maxPasses; pass++) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = pts[i - 1];
        const b = pts[i];
        const c = pts[j];
        const d = j + 1 < n ? pts[j + 1] : null;
        const before = haversine(a, b) + (d ? haversine(c, d) : 0);
        const after = haversine(a, c) + (d ? haversine(b, d) : 0);
        if (after + 1e-6 < before) {
          reverse(pts, i, j);
          improved = true;
        }
      }
    }
  }

  const ordered = (origin ? pts.slice(1) : pts) as Stop[];
  return { order: ordered.map((s) => s.id), totalMeters: pathLength(pts) };
}

function reverse<T>(arr: T[], i: number, j: number) {
  while (i < j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
    i++;
    j--;
  }
}

export function pathLength(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1], points[i]);
  return total;
}
