import { Injectable, signal } from '@angular/core';
import { LatLng } from '../domain/geo';

export interface Fix extends LatLng {
  accuracy: number;
  at: number;
}

export type GeoState = 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable';

/** Courier live position. One watch for the whole app; started by the route screen. */
@Injectable({ providedIn: 'root' })
export class Geolocation {
  readonly position = signal<Fix | null>(null);
  readonly state = signal<GeoState>('idle');
  private watchId: number | null = null;

  start() {
    if (this.watchId !== null) return;
    if (!('geolocation' in navigator)) {
      this.state.set('unavailable');
      return;
    }
    this.state.set('locating');
    this.watchId = navigator.geolocation.watchPosition(
      (p) => {
        this.state.set('ok');
        this.position.set({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp });
      },
      (err) => {
        this.state.set(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
        if (err.code === err.PERMISSION_DENIED) this.stop();
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }

  stop() {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  /** Restart after the user changed the permission. */
  retry() {
    this.stop();
    this.start();
  }

  /** One accurate reading (customer page, "I'm at the customer now"). */
  static once(): Promise<Fix> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('unavailable'));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp }),
        (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
      );
    });
  }
}
