import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Api, apiErrorCode } from '../../core/api';
import { Geolocation } from '../../core/geolocation';
import { I18n, TranslatePipe } from '../../core/i18n';
import { MapsLoader } from '../../core/maps-loader';
import { LatLng, inJordan } from '../../domain/geo';
import { Icon } from '../../shared/icon';
import { LocationPicker } from '../../shared/location-picker';

type Step = 'loading' | 'not-found' | 'closed' | 'intro' | 'locating' | 'adjust' | 'sending' | 'done';

/**
 * Public page the customer opens from the courier's WhatsApp message.
 * No account, no app: one button, a map to fine-tune the pin, confirm.
 */
@Component({
  selector: 'app-share-location-page',
  imports: [TranslatePipe, Icon, LocationPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="share">
      <header class="brand">
        <span class="brand__mark"><app-icon name="pin" [size]="26" /></span>
        <strong>{{ 'app.name' | t }}</strong>
        <button class="btn btn--ghost btn--sm lang" (click)="i18n.lang.set(i18n.lang() === 'ar' ? 'en' : 'ar')">
          {{ i18n.lang() === 'ar' ? 'English' : 'العربية' }}
        </button>
      </header>

      @switch (step()) {
        @case ('loading') { <p class="muted center">…</p> }
        @case ('not-found') { <div class="notice notice--error">{{ 'share.notFound' | t }}</div> }
        @case ('closed') { <div class="notice notice--info">{{ 'share.closed' | t }}</div> }
        @case ('done') {
          <div class="done card">
            <span class="done__icon"><app-icon name="check" [size]="40" /></span>
            <h1>{{ 'share.thanks' | t }}</h1>
          </div>
        }
        @default {
          <section class="card stack">
            <h1>{{ 'share.title' | t }}</h1>
            @if (shopName()) { <p>{{ 'share.from' | t: { shop: shopName() } }}</p> }

            @if (step() === 'intro' || step() === 'locating') {
              <p class="muted">{{ (hadLocation() ? 'share.already' : 'share.intro') | t }}</p>
              <button class="btn btn--primary btn--block btn--xl" [disabled]="step() === 'locating'" (click)="locate()">
                <app-icon name="crosshair" /> {{ (step() === 'locating' ? 'share.locating' : 'share.button') | t }}
              </button>
              @if (denied()) {
                <div class="notice notice--warn small">{{ 'share.denied' | t }}</div>
              }
              @if (maps.state() === 'ready') {
                <button class="btn btn--ghost btn--block" (click)="manual()"><app-icon name="map" [size]="18" /> {{ 'share.manual' | t }}</button>
              }
            }

            @if (step() === 'adjust' || step() === 'sending') {
              <p class="muted small">{{ 'share.adjust' | t }}</p>
              <app-location-picker class="picker" [initial]="fix()" [accuracy]="accuracy()"
                [accuracyLabel]="'share.accuracy' | t: { m: accuracy() ?? 0 }"
                [mapId]="maps.config()?.mapId ?? 'DEMO_MAP_ID'" (moved)="center.set($event)" />
              <button class="btn btn--success btn--block btn--xl" [disabled]="step() === 'sending' || !center()" (click)="send(center()!)">
                <app-icon name="check" /> {{ 'share.confirm' | t }}
              </button>
            }
            @if (error()) { <div class="notice notice--error small">{{ error() }}</div> }
            <p class="muted small center">{{ 'share.privacy' | t }}</p>
          </section>
        }
      }
    </main>
  `,
  styles: `
    .share { max-width: 520px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
    .brand { display: flex; align-items: center; gap: 8px; font-size: 18px; }
    .brand__mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--primary); color: var(--primary-ink); }
    .lang { margin-inline-start: auto; }
    h1 { font-size: 22px; margin: 0; }
    p { margin: 0; }
    .picker { height: 52dvh; min-height: 300px; }
    .center { text-align: center; }
    .done { text-align: center; padding: 32px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .done__icon { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; background: var(--success-soft); color: var(--success); }
  `,
})
export class ShareLocationPage implements OnInit {
  readonly token = input.required<string>();

  private api = inject(Api);
  protected i18n = inject(I18n);
  protected maps = inject(MapsLoader);

  protected readonly step = signal<Step>('loading');
  protected readonly shopName = signal('');
  protected readonly hadLocation = signal(false);
  protected readonly fix = signal<LatLng | null>(null);
  protected readonly accuracy = signal<number | null>(null);
  protected readonly center = signal<LatLng | null>(null);
  protected readonly denied = signal(false);
  protected readonly error = signal('');

  async ngOnInit() {
    this.maps.load();
    try {
      const info = await this.api.publicLocation(this.token());
      this.shopName.set(info.shopName);
      this.hadLocation.set(info.hasLocation);
      this.step.set(info.closed ? 'closed' : 'intro');
    } catch {
      this.step.set('not-found');
    }
  }

  protected async locate() {
    this.step.set('locating');
    this.error.set('');
    try {
      const fix = await Geolocation.once();
      this.fix.set({ lat: fix.lat, lng: fix.lng });
      this.accuracy.set(Math.round(fix.accuracy));
      if (this.maps.state() === 'ready') {
        this.center.set({ lat: fix.lat, lng: fix.lng });
        this.step.set('adjust');
      } else {
        await this.send(fix, Math.round(fix.accuracy));
      }
    } catch (err) {
      this.denied.set((err as Error).message === 'denied');
      if (!this.denied()) this.error.set(this.i18n.error('unknown'));
      this.step.set('intro');
    }
  }

  protected manual() {
    this.fix.set(null);
    this.accuracy.set(null);
    this.step.set('adjust');
  }

  protected async send(point: LatLng, accuracy = this.accuracy() ?? undefined) {
    if (!inJordan(point)) {
      this.error.set(this.i18n.error('location_outside_jordan'));
      return;
    }
    this.step.set('sending');
    try {
      await this.api.submitPublicLocation(this.token(), { lat: point.lat, lng: point.lng, accuracy });
      this.step.set('done');
    } catch (err) {
      const code = apiErrorCode(err);
      if (code === 'order_closed') this.step.set('closed');
      else {
        this.error.set(this.i18n.error(code));
        this.step.set(this.maps.state() === 'ready' ? 'adjust' : 'intro');
      }
    }
  }
}
