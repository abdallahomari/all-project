import { ChangeDetectionStrategy, Component, computed, input, output, signal, viewChild } from '@angular/core';
import { GoogleMap } from '@angular/google-maps';
import { AMMAN, LatLng } from '../domain/geo';
import { Icon } from './icon';

/**
 * Fixed pin in the middle of the map; the user drags the map under it.
 * Easier with one thumb than dragging a small marker.
 */
@Component({
  selector: 'app-location-picker',
  imports: [GoogleMap, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker">
      <google-map width="100%" height="100%" [options]="options()" [center]="start()" [zoom]="start() === fallback ? 12 : 17"
        (idle)="onIdle()" />
      <div class="picker__pin" aria-hidden="true"><app-icon name="pin" [size]="44" /></div>
      @if (accuracy(); as a) {
        <div class="picker__badge">{{ accuracyLabel() }}</div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .picker { position: relative; height: 100%; min-height: 280px; border-radius: var(--radius); overflow: hidden; }
    .picker__pin { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -100%); color: var(--danger);
      pointer-events: none; filter: drop-shadow(0 2px 2px rgb(0 0 0 / .35)); }
    .picker__badge { position: absolute; inset-inline-start: 8px; bottom: 8px; background: var(--surface); color: var(--ink);
      padding: 4px 10px; border-radius: 999px; font-size: 13px; box-shadow: var(--shadow); }
  `,
})
export class LocationPicker {
  readonly initial = input<LatLng | null>(null);
  readonly mapId = input('DEMO_MAP_ID');
  readonly accuracy = input<number | null>(null);
  readonly accuracyLabel = input('');
  readonly moved = output<LatLng>();

  protected readonly fallback = AMMAN;
  protected readonly start = computed(() => this.initial() ?? this.fallback);
  protected readonly options = computed<google.maps.MapOptions>(() => ({
    mapId: this.mapId(),
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy',
    clickableIcons: false,
  }));
  private map = viewChild(GoogleMap);
  readonly center = signal<LatLng | null>(null);

  protected onIdle() {
    const c = this.map()?.getCenter();
    if (!c) return;
    const point = { lat: c.lat(), lng: c.lng() };
    this.center.set(point);
    this.moved.emit(point);
  }

  panTo(point: LatLng, zoom = 17) {
    this.map()?.panTo(point);
    this.map()?.googleMap?.setZoom(zoom);
  }
}
