import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { apiErrorCode } from '../../core/api';
import { Geolocation } from '../../core/geolocation';
import { I18n, TranslatePipe } from '../../core/i18n';
import { MapsLoader } from '../../core/maps-loader';
import { Order, Shop } from '../../core/models';
import { OrdersStore } from '../../core/orders-store';
import { storage } from '../../core/storage';
import { Toast } from '../../core/toast';
import { LatLng, roadEstimate } from '../../domain/geo';
import { navigationUrl } from '../../domain/maps-link';
import { formatJod } from '../../domain/money';
import { whatsappLink } from '../../domain/phone';
import { askLocationUrl } from '../../shared/ask-location';
import { Icon } from '../../shared/icon';
import { MapStop, RouteMap } from '../../shared/route-map';
import { StatusSheet } from '../../shared/status-sheet';

interface StopView {
  order: Order;
  shop?: Shop;
  n: number;
  /** Estimated road metres from the previous point (courier for the first stop). */
  legMeters: number | null;
}

const REFRESH_MS = 30_000;

@Component({
  selector: 'app-route-page',
  imports: [RouterLink, TranslatePipe, Icon, RouteMap, StatusSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-page.html',
  styleUrl: './route-page.scss',
})
export class RoutePage {
  protected store = inject(OrdersStore);
  protected geo = inject(Geolocation);
  protected maps = inject(MapsLoader);
  protected i18n = inject(I18n);
  private toast = inject(Toast);
  private router = inject(Router);

  protected readonly mapOpen = signal(storage.get('wasel.mapOpen', true));
  protected readonly sheetId = signal<string | null>(null);
  protected readonly roadBusy = signal(false);
  protected readonly showDone = signal(false);
  private plannedWithGps = false;

  protected readonly here = computed<LatLng | null>(() => {
    const p = this.geo.position();
    return p ? { lat: p.lat, lng: p.lng } : null;
  });

  protected readonly stops = computed<StopView[]>(() => {
    const shops = this.store.shopById();
    let prev: LatLng | null = this.here();
    return this.store.route().map((order, i) => {
      const legMeters = prev ? roadEstimate(prev, order.location!) : null;
      prev = order.location!;
      return { order, shop: shops.get(order.shopId), n: i + 1, legMeters };
    });
  });
  protected readonly next = computed(() => this.stops()[0] ?? null);
  protected readonly later = computed(() => this.stops().slice(1));

  protected readonly mapStops = computed<MapStop[]>(() =>
    this.stops().map((s) => ({
      id: s.order.id,
      lat: s.order.location!.lat,
      lng: s.order.location!.lng,
      label: String(s.n),
      title: s.order.customerName,
      next: s.n === 1,
    })),
  );

  protected readonly pickupGroups = computed(() => {
    const groups = new Map<string, { shop?: Shop; orders: Order[] }>();
    for (const o of this.store.pickups()) {
      const g = groups.get(o.shopId) ?? { shop: this.store.shopById().get(o.shopId), orders: [] };
      g.orders.push(o);
      groups.set(o.shopId, g);
    }
    return [...groups.entries()].map(([shopId, g]) => ({ shopId, ...g }));
  });

  protected readonly progress = computed(() => {
    const done = this.store.closedToday().length;
    return { done, total: done + this.store.active().length };
  });

  protected readonly sheetOrder = computed(() => {
    const id = this.sheetId();
    return id ? this.store.find(id) ?? null : null;
  });

  constructor() {
    this.store.load();
    this.geo.start();
    this.maps.load();

    // Keep the plan in step with the orders; re-plan once when the first GPS fix arrives.
    effect(() => {
      const outdated = this.store.planOutdated();
      const here = this.here();
      untracked(() => {
        if (outdated || (here && !this.plannedWithGps)) {
          this.store.plan(here);
          if (here) this.plannedWithGps = true;
        }
      });
    });

    // Pick up customer locations shared from WhatsApp links.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') this.store.load();
    }, REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected km(meters: number | null) {
    return meters == null ? '' : this.i18n.t('route.approx', { km: (meters / 1000).toFixed(1) });
  }

  protected money(fils: number) {
    return formatJod(fils, this.i18n.lang());
  }

  protected navUrl(o: Order) {
    return navigationUrl(o.location!);
  }

  protected waUrl(o: Order) {
    return o.customerPhone ? whatsappLink(o.customerPhone) : null;
  }

  protected askUrl(o: Order) {
    return askLocationUrl(this.i18n, o, this.store.shopById().get(o.shopId));
  }

  protected toggleMap() {
    this.mapOpen.update((v) => !v);
    storage.set('wasel.mapOpen', this.mapOpen());
  }

  protected sortNow() {
    this.store.plan(this.here());
    this.toast.show(this.i18n.t('route.optimized'), 'success', 2000);
  }

  protected async sortWithRoads() {
    const here = this.here();
    if (!here) {
      this.toast.show(this.i18n.t('route.gpsOff'), 'error');
      return;
    }
    this.roadBusy.set(true);
    try {
      await this.store.planWithRoads(here);
      const road = this.store.road();
      if (road) {
        this.toast.show(
          this.i18n.t('route.roadOptimized', {
            km: (road.distanceMeters / 1000).toFixed(1),
            min: Math.round(road.durationSeconds / 60),
          }),
          'success',
        );
      }
    } catch (err) {
      this.toast.show(this.i18n.error(apiErrorCode(err)), 'error');
    } finally {
      this.roadBusy.set(false);
    }
  }

  protected async pickedAll(shopId: string) {
    try {
      await this.store.markShopPickedUp(shopId);
    } catch (err) {
      this.toast.show(this.i18n.error(apiErrorCode(err)), 'error');
    }
  }

  protected edit(id: string) {
    this.sheetId.set(null);
    this.router.navigate(['/orders', id]);
  }
}
