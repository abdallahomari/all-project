import { ChangeDetectionStrategy, Component, computed, effect, input, output, viewChild } from '@angular/core';
import { GoogleMap, MapAdvancedMarker, MapPolyline } from '@angular/google-maps';
import { AMMAN, LatLng } from '../domain/geo';

export interface MapStop extends LatLng {
  id: string;
  label: string;
  title: string;
  next: boolean;
}

function pin(label: string, next: boolean): HTMLElement {
  const el = document.createElement('div');
  el.className = next ? 'map-pin map-pin--next' : 'map-pin';
  el.textContent = label;
  return el;
}

function courierDot(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'map-courier';
  return el;
}

/** Courier position, numbered stops in route order and the road path when known. */
@Component({
  selector: 'app-route-map',
  imports: [GoogleMap, MapAdvancedMarker, MapPolyline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <google-map width="100%" height="100%" [options]="options()" [center]="initialCenter" [zoom]="12">
      @if (courier(); as c) {
        <map-advanced-marker [position]="c" [content]="courierEl" [zIndex]="1000" [title]="youLabel()" />
      }
      @for (s of markers(); track s.stop.id) {
        <map-advanced-marker
          [position]="s.stop"
          [content]="s.el"
          [zIndex]="s.stop.next ? 999 : 100"
          [title]="s.stop.title"
          (mapClick)="stopClick.emit(s.stop.id)"
        />
      }
      @if (path().length > 1) {
        <map-polyline [path]="path()" [options]="lineOptions" />
      }
    </google-map>
  `,
  styles: `:host { display: block; width: 100%; height: 100%; }`,
})
export class RouteMap {
  readonly courier = input<LatLng | null>(null);
  readonly stops = input<MapStop[]>([]);
  readonly path = input<LatLng[]>([]);
  readonly mapId = input('DEMO_MAP_ID');
  readonly youLabel = input('');
  readonly stopClick = output<string>();

  private map = viewChild(GoogleMap);
  protected readonly initialCenter = AMMAN;
  protected readonly courierEl = courierDot();
  protected readonly lineOptions: google.maps.PolylineOptions = {
    strokeColor: '#0F766E',
    strokeOpacity: 0.85,
    strokeWeight: 5,
  };
  protected readonly options = computed<google.maps.MapOptions>(() => ({
    mapId: this.mapId(),
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy',
    clickableIcons: false,
  }));
  protected readonly markers = computed(() => this.stops().map((stop) => ({ stop, el: pin(stop.label, stop.next) })));

  private fittedKey = '';

  constructor() {
    // Re-frame only when the set/order of stops changes — never on every GPS tick.
    effect(() => {
      const map = this.map();
      const stops = this.stops();
      const key = stops.map((s) => s.id).join(',');
      if (!map || key === this.fittedKey) return;
      const courier = this.courier();
      const points = [...stops, ...(courier ? [courier] : [])];
      if (!points.length) return;
      this.fittedKey = key;
      if (points.length === 1) {
        map.googleMap?.setCenter(points[0]);
        map.googleMap?.setZoom(15);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 48);
    });
  }

  recenter() {
    const c = this.courier();
    if (c) this.map()?.panTo(c);
  }
}
