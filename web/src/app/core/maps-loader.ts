import { Injectable, inject, signal } from '@angular/core';
import { Api } from './api';
import { AppConfig } from './models';
import { I18n } from './i18n';

type MapsState = 'idle' | 'loading' | 'ready' | 'no-key' | 'error';

declare global {
  interface Window {
    __waselMapsReady?: () => void;
  }
}

/**
 * Loads the Google Maps JavaScript API once, with the browser key served by /api/config
 * (so the key is never baked into the build). Exposes the state as a signal so screens
 * can fall back to a list when the map is unavailable.
 */
@Injectable({ providedIn: 'root' })
export class MapsLoader {
  private api = inject(Api);
  private i18n = inject(I18n);
  readonly state = signal<MapsState>('idle');
  readonly config = signal<AppConfig | null>(null);
  private loading?: Promise<void>;

  load(): Promise<void> {
    this.loading ??= this.doLoad();
    return this.loading;
  }

  private async doLoad() {
    this.state.set('loading');
    try {
      const config = await this.api.config();
      this.config.set(config);
      if (!config.mapsApiKey) {
        this.state.set('no-key');
        return;
      }
      if (typeof google === 'undefined' || !google.maps?.importLibrary) {
        await new Promise<void>((resolve, reject) => {
          window.__waselMapsReady = () => resolve();
          const params = new URLSearchParams({
            key: config.mapsApiKey,
            v: 'weekly',
            loading: 'async',
            libraries: 'marker',
            language: this.i18n.lang(),
            region: 'JO',
            callback: '__waselMapsReady',
          });
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
          script.async = true;
          script.onerror = () => reject(new Error('maps_script_failed'));
          document.head.appendChild(script);
        });
      }
      await Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('marker')]);
      this.state.set('ready');
    } catch (err) {
      console.warn('Google Maps failed to load', err);
      this.state.set('error');
      this.loading = undefined;
    }
  }
}
