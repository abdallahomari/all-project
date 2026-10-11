import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, apiErrorCode } from '../../core/api';
import { Geolocation } from '../../core/geolocation';
import { I18n, TranslatePipe } from '../../core/i18n';
import { MapsLoader } from '../../core/maps-loader';
import { Order, OrderLocation } from '../../core/models';
import { OrdersStore } from '../../core/orders-store';
import { storage } from '../../core/storage';
import { Toast } from '../../core/toast';
import { LatLng, inJordan } from '../../domain/geo';
import { findLocation } from '../../domain/maps-link';
import { formatJodNumber, parseJodInput } from '../../domain/money';
import { parseOrderMessage } from '../../domain/order-parser';
import { formatJordanPhone, normalizeJordanPhone } from '../../domain/phone';
import { askLocationUrl } from '../../shared/ask-location';
import { Icon } from '../../shared/icon';
import { LocationPicker } from '../../shared/location-picker';

type Loc = LatLng & { source: OrderLocation['source'] };

@Component({
  selector: 'app-order-form-page',
  imports: [FormsModule, TranslatePipe, Icon, LocationPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-form-page.html',
  styleUrl: './order-form-page.scss',
})
export class OrderFormPage {
  /** Route param — present when editing. */
  readonly id = input<string>();

  protected store = inject(OrdersStore);
  protected maps = inject(MapsLoader);
  protected i18n = inject(I18n);
  private api = inject(Api);
  private geo = inject(Geolocation);
  private toast = inject(Toast);
  private router = inject(Router);
  private picker = viewChild(LocationPicker);

  protected readonly paste = signal('');
  protected readonly parsedMsg = signal('');
  protected readonly shopId = signal<string>(storage.get('wasel.lastShop', ''));
  protected readonly newShop = signal<string | null>(null);
  protected readonly customerName = signal('');
  protected readonly customerPhone = signal('');
  protected readonly amount = signal('');
  protected readonly addressNote = signal('');
  protected readonly location = signal<Loc | null>(null);
  protected readonly withMe = signal(true);
  protected readonly mapsLink = signal('');
  protected readonly resolving = signal(false);
  protected readonly pickerOpen = signal(false);
  protected readonly pickerCenter = signal<LatLng | null>(null);
  protected readonly busy = signal(false);
  /** Order just created without a location: offer to ask the customer. */
  protected readonly askFor = signal<Order | null>(null);

  protected readonly editing = computed(() => !!this.id());
  protected readonly existing = computed(() => (this.id() ? this.store.find(this.id()!) : undefined));
  protected readonly pickerStart = computed(() => this.location() ?? this.geo.position() ?? null);
  private filledFrom = '';

  constructor() {
    if (!this.store.loaded()) this.store.load();
    this.maps.load();
    // Fill the form once when the order to edit is available.
    effect(() => {
      const o = this.existing();
      if (!o || this.filledFrom === o.id) return;
      untracked(() => {
        this.filledFrom = o.id;
        this.shopId.set(o.shopId);
        this.customerName.set(o.customerName);
        this.customerPhone.set(o.customerPhone ? formatJordanPhone(o.customerPhone) : '');
        this.amount.set(o.amountFils ? formatJodNumber(o.amountFils) : '');
        this.addressNote.set(o.addressNote ?? '');
        this.location.set(o.location ? { lat: o.location.lat, lng: o.location.lng, source: o.location.source } : null);
      });
    });
  }

  protected async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.paste.set(text);
        await this.parse();
      }
    } catch {
      /* clipboard permission refused: the textarea still works */
    }
  }

  /** Parse right after a paste, once the textarea value has updated. */
  protected autoParse() {
    setTimeout(() => this.paste().trim() && this.parse(), 0);
  }

  protected async parse() {
    const p = parseOrderMessage(this.paste());
    let count = 0;
    if (p.customerName) (this.customerName.set(p.customerName), count++);
    if (p.customerPhone) (this.customerPhone.set(formatJordanPhone(p.customerPhone)), count++);
    if (p.amountFils !== undefined) (this.amount.set(formatJodNumber(p.amountFils)), count++);
    if (p.addressNote) (this.addressNote.set(p.addressNote), count++);
    if (p.location?.location) {
      this.location.set({ ...p.location.location, source: 'link' });
      count++;
    } else if (p.location?.shortLink) {
      if (await this.resolve(p.location.shortLink)) count++;
    }
    this.parsedMsg.set(count ? this.i18n.t('form.parsed', { count }) : this.i18n.t('form.parsedNone'));
  }

  protected async useLink() {
    const text = this.mapsLink().trim();
    if (!text) return;
    const found = findLocation(text);
    if (found?.location) {
      this.location.set({ ...found.location, source: 'link' });
      this.mapsLink.set('');
    } else if (await this.resolve(found?.shortLink ?? text)) {
      this.mapsLink.set('');
    }
  }

  private async resolve(url: string): Promise<boolean> {
    this.resolving.set(true);
    try {
      const loc = await this.api.resolveMapsLink(url);
      this.location.set({ ...loc, source: 'link' });
      return true;
    } catch (err) {
      this.toast.show(this.i18n.error(apiErrorCode(err)), 'error');
      return false;
    } finally {
      this.resolving.set(false);
    }
  }

  protected async hereNow() {
    try {
      const fix = await Geolocation.once();
      if (!inJordan(fix)) throw new Error('outside');
      this.location.set({ lat: fix.lat, lng: fix.lng, source: 'pin' });
    } catch (err) {
      const code = (err as Error).message === 'outside' ? 'location_outside_jordan' : 'unknown';
      this.toast.show(code === 'unknown' ? this.i18n.t('route.gpsOff') : this.i18n.error(code), 'error');
    }
  }

  protected confirmPin() {
    const c = this.pickerCenter();
    if (c) this.location.set({ lat: c.lat, lng: c.lng, source: 'pin' });
    this.pickerOpen.set(false);
  }

  protected async save(addAnother = false) {
    const amountFils = this.amount().trim() ? parseJodInput(this.amount()) : 0;
    if (amountFils === null) return this.fail('invalid_amountFils');
    if (!this.customerName().trim()) return this.fail('invalid_customerName');
    const phone = this.customerPhone().trim();
    const customerPhone = phone ? normalizeJordanPhone(phone) : undefined;
    if (customerPhone === null) return this.fail('invalid_customer_phone');

    this.busy.set(true);
    try {
      let shopId = this.shopId();
      const newName = this.newShop()?.trim();
      if (newName) {
        shopId = (await this.store.createShop({ name: newName })).id;
        this.shopId.set(shopId);
        this.newShop.set(null);
      }
      if (!shopId || !this.store.shopById().has(shopId)) return this.fail('shop_required');
      storage.set('wasel.lastShop', shopId);

      const body = {
        shopId,
        customerName: this.customerName().trim(),
        customerPhone: customerPhone ?? undefined,
        amountFils,
        addressNote: this.addressNote().trim() || undefined,
      };
      const loc = this.location();
      if (this.editing()) {
        await this.store.update(this.id()!, {
          ...body,
          customerPhone: customerPhone ?? '',
          addressNote: body.addressNote ?? '',
          location: loc ?? null,
        });
        this.toast.show(this.i18n.t('form.saved'), 'success', 2000);
        await this.router.navigateByUrl('/');
        return;
      }
      const order = await this.store.create({
        ...body,
        location: loc ?? undefined,
        status: this.withMe() ? 'picked_up' : 'pending_pickup',
      });
      this.toast.show(this.i18n.t('form.saved'), 'success', 2000);
      if (!order.location) {
        this.askFor.set(order);
        if (addAnother) this.reset();
        return;
      }
      if (addAnother) this.reset();
      else await this.router.navigateByUrl('/');
    } catch (err) {
      this.fail(apiErrorCode(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected askUrl(o: Order) {
    return askLocationUrl(this.i18n, o, this.store.shopById().get(o.shopId));
  }

  protected doneAsking(goHome: boolean) {
    this.askFor.set(null);
    if (goHome) this.router.navigateByUrl('/');
  }

  protected async remove() {
    if (!this.id() || !confirm(this.i18n.t('action.delete') + '?')) return;
    try {
      await this.store.remove(this.id()!);
      await this.router.navigateByUrl('/');
    } catch (err) {
      this.fail(apiErrorCode(err));
    }
  }

  protected reset() {
    this.paste.set('');
    this.parsedMsg.set('');
    this.customerName.set('');
    this.customerPhone.set('');
    this.amount.set('');
    this.addressNote.set('');
    this.location.set(null);
    this.mapsLink.set('');
    window.scrollTo({ top: 0 });
  }

  private fail(code: string) {
    this.toast.show(this.i18n.error(code), 'error');
    this.busy.set(false);
  }
}
