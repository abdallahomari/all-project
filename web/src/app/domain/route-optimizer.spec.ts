import { haversine } from './geo';
import { pathLength, planRoute, Stop } from './route-optimizer';

describe('planRoute', () => {
  // Points along a west→east line in Amman, given out of order.
  const line: Stop[] = [
    { id: 'c', lat: 31.95, lng: 35.93 },
    { id: 'a', lat: 31.95, lng: 35.87 },
    { id: 'd', lat: 31.95, lng: 35.96 },
    { id: 'b', lat: 31.95, lng: 35.9 },
  ];

  it('returns an empty plan for no stops', () => {
    expect(planRoute({ lat: 31.9, lng: 35.9 }, [])).toEqual({ order: [], totalMeters: 0 });
  });

  it('visits the closest stop first from the courier position', () => {
    const origin = { lat: 31.95, lng: 35.85 }; // west end
    expect(planRoute(origin, line).order).toEqual(['a', 'b', 'c', 'd']);
    const eastOrigin = { lat: 31.95, lng: 35.99 };
    expect(planRoute(eastOrigin, line).order).toEqual(['d', 'c', 'b', 'a']);
  });

  it('starts from an edge of the area when GPS is unavailable', () => {
    const order = planRoute(null, line).order;
    expect([['a', 'b', 'c', 'd'], ['d', 'c', 'b', 'a']]).toContain(order);
  });

  it('2-opt never makes the nearest-neighbour route longer', () => {
    // Deterministic pseudo-random cloud of 40 stops around Amman.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const stops: Stop[] = Array.from({ length: 40 }, (_, i) => ({
      id: `s${i}`,
      lat: 31.9 + rnd() * 0.12,
      lng: 35.82 + rnd() * 0.15,
    }));
    const origin = { lat: 31.95, lng: 35.9 };
    const optimised = planRoute(origin, stops);
    const nnOnly = planRoute(origin, stops, 0);
    expect(optimised.totalMeters).toBeLessThanOrEqual(nnOnly.totalMeters);
    expect(new Set(optimised.order).size).toBe(40);
    const byId = new Map(stops.map((s) => [s.id, s]));
    expect(pathLength([origin, ...optimised.order.map((id) => byId.get(id)!)])).toBeCloseTo(optimised.totalMeters, 3);
  });

  it('measures Amman distances sensibly', () => {
    // 7th circle to Abdali is roughly 4 km in a straight line.
    const d = haversine({ lat: 31.9567, lng: 35.8603 }, { lat: 31.9632, lng: 35.9097 });
    expect(d).toBeGreaterThan(4000);
    expect(d).toBeLessThan(5500);
  });
});
