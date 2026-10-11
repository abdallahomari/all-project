import { Injectable, computed, inject, signal } from '@angular/core';
import { LatLng } from '../domain/geo';
import { decodePolyline } from '../domain/polyline';
import { planRoute } from '../domain/route-optimizer';
import { Api } from './api';
import { I18n } from './i18n';
import { NewOrder, Order, OrderPatch, Shop, StatusChange, isActive } from './models';
import { storage } from './storage';

const CACHE = 'wasel.cache';
const ROUTE = 'wasel.route';

export interface RoadInfo {
  distanceMeters: number;
  durationSeconds: number;
  path: LatLng[];
}

/**
 * Single source of truth for the courier's orders, shops and planned route.
 * Data is cached in localStorage so the route survives a dropped connection.
 */
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private api = inject(Api);
  private i18n = inject(I18n);

  private cached = storage.get<{ orders: Order[]; shops: Shop[] }>(CACHE, { orders: [], shops: [] });
  readonly orders = signal<Order[]>(this.cached.orders);
  readonly shops = signal<Shop[]>(this.cached.shops);
  readonly loaded = signal(false);
  readonly offline = signal(false);

  /** Planned visiting order (ids of on-route orders). */
  readonly routeIds = signal<string[]>(storage.get<string[]>(ROUTE, []));
  readonly road = signal<RoadInfo | null>(null);

  readonly shopById = computed(() => new Map(this.shops().map((s) => [s.id, s])));
  readonly active = computed(() => this.orders().filter((o) => isActive(o.status)));
  readonly pickups = computed(() => this.orders().filter((o) => o.status === 'pending_pickup'));
  readonly onRoad = computed(() => this.orders().filter((o) => o.status === 'picked_up'));
  readonly routable = computed(() => this.onRoad().filter((o) => o.location));
  readonly missingLocation = computed(() => this.onRoad().filter((o) => !o.location));
  readonly closedToday = computed(() => this.orders().filter((o) => !isActive(o.status)));

  /** On-route orders in planned order; anything not yet planned goes last. */
  readonly route = computed(() => {
    const byId = new Map(this.routable().map((o) => [o.id, o]));
    const planned = this.routeIds()
      .map((id) => byId.get(id))
      .filter((o): o is Order => !!o);
    const plannedIds = new Set(planned.map((o) => o.id));
    return [...planned, ...this.routable().filter((o) => !plannedIds.has(o.id))];
  });

  /** True when the routable set differs from the last plan (new order, new location, order closed). */
  readonly planOutdated = computed(() => {
    const ids = new Set(this.routable().map((o) => o.id));
    const planned = this.routeIds();
    return planned.length !== ids.size || planned.some((id) => !ids.has(id));
  });

  async load() {
    try {
      const [orders, shops] = await Promise.all([this.api.orders('today'), this.api.shops()]);
      this.orders.set(orders);
      this.shops.set(shops);
      this.offline.set(false);
      this.persist();
    } catch {
      this.offline.set(true);
    } finally {
      this.loaded.set(true);
    }
  }

  /** Plan the route locally from the courier's position (free, instant, works offline). */
  plan(origin: LatLng | null) {
    const stops = this.routable().map((o) => ({ id: o.id, lat: o.location!.lat, lng: o.location!.lng }));
    this.setRoute(planRoute(origin, stops).order);
    this.road.set(null);
  }

  /** Re-order with real roads through the server (Google Routes API). Throws an API error. */
  async planWithRoads(origin: LatLng) {
    this.plan(origin);
    const stops = this.route()
      .slice(0, 26)
      .map((o) => ({ id: o.id, lat: o.location!.lat, lng: o.location!.lng }));
    if (!stops.length) return;
    const res = await this.api.optimizeRoute(origin, stops, this.i18n.lang());
    const rest = this.routeIds().filter((id) => !res.order.includes(id));
    this.setRoute([...res.order, ...rest]);
    this.road.set({
      distanceMeters: res.distanceMeters,
      durationSeconds: res.durationSeconds,
      path: res.polyline ? decodePolyline(res.polyline) : [],
    });
  }

  /** Manual reorder (drag or "move up"). */
  moveStop(id: string, delta: number) {
    const ids = this.route().map((o) => o.id);
    const from = ids.indexOf(id);
    const to = Math.max(0, Math.min(ids.length - 1, from + delta));
    if (from < 0 || from === to) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    this.setRoute(ids);
    this.road.set(null);
  }

  async create(body: NewOrder) {
    const order = await this.api.createOrder(body);
    this.orders.update((list) => [...list, order]);
    this.persist();
    return order;
  }

  async update(id: string, body: OrderPatch | StatusChange) {
    const order = await this.api.updateOrder(id, body);
    this.replace(order);
    return order;
  }

  async setStatus(id: string, change: StatusChange) {
    return this.update(id, change);
  }

  async markShopPickedUp(shopId: string) {
    const ids = this.pickups()
      .filter((o) => o.shopId === shopId)
      .map((o) => o.id);
    const results = await Promise.all(ids.map((id) => this.api.updateOrder(id, { status: 'picked_up' })));
    results.forEach((o) => this.replace(o));
  }

  async remove(id: string) {
    await this.api.deleteOrder(id);
    this.orders.update((list) => list.filter((o) => o.id !== id));
    this.persist();
  }

  async createShop(body: { name: string; phone?: string }) {
    const shop = await this.api.createShop(body);
    this.shops.update((list) => [...list, shop]);
    this.persist();
    return shop;
  }

  async deleteShop(id: string) {
    await this.api.deleteShop(id);
    this.shops.update((list) => list.filter((s) => s.id !== id));
    this.persist();
  }

  find(id: string) {
    return this.orders().find((o) => o.id === id);
  }

  /** Call on sign-out so the next courier on this phone starts clean. */
  reset() {
    this.orders.set([]);
    this.shops.set([]);
    this.routeIds.set([]);
    this.road.set(null);
    this.loaded.set(false);
    storage.remove(CACHE);
    storage.remove(ROUTE);
  }

  private replace(order: Order) {
    this.orders.update((list) => list.map((o) => (o.id === order.id ? order : o)));
    this.persist();
  }

  private setRoute(ids: string[]) {
    this.routeIds.set(ids);
    storage.set(ROUTE, ids);
  }

  private persist() {
    storage.set(CACHE, { orders: this.orders(), shops: this.shops() });
  }
}
