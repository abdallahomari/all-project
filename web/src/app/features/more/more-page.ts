import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, apiErrorCode } from '../../core/api';
import { Auth } from '../../core/auth';
import { I18n, Lang, TranslatePipe } from '../../core/i18n';
import { OrdersStore } from '../../core/orders-store';
import { Toast } from '../../core/toast';
import { formatJordanPhone, normalizeJordanPhone } from '../../domain/phone';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-more-page',
  imports: [FormsModule, TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page stack">
      <h1 class="page-title">{{ 'more.title' | t }}</h1>

      <h2 class="section-title"><app-icon name="shop" [size]="18" /> {{ 'more.shops' | t }}</h2>
      <section class="card stack">
        <ul class="shops">
          @for (s of store.shops(); track s.id) {
            <li>
              <div class="spacer"><strong>{{ s.name }}</strong>
                @if (s.phone) { <div class="muted small ltr">{{ phone(s.phone) }}</div> }
              </div>
              <button class="btn btn--ghost btn--icon" (click)="removeShop(s.id)" [attr.aria-label]="'action.delete' | t"><app-icon name="trash" [size]="18" /></button>
            </li>
          } @empty {
            <li class="muted">{{ 'more.noShops' | t }}</li>
          }
        </ul>
        <form class="stack" (ngSubmit)="addShop()">
          <input class="input" name="shopName" [placeholder]="'form.shopName' | t" [(ngModel)]="shopName" maxlength="80" />
          <input class="input ltr" name="shopPhone" type="tel" inputmode="tel" [placeholder]="'more.shopPhone' | t" [(ngModel)]="shopPhone" />
          <button class="btn btn--outline btn--block" type="submit" [disabled]="busy()"><app-icon name="plus" /> {{ 'more.addShop' | t }}</button>
        </form>
      </section>

      <h2 class="section-title"><app-icon name="globe" [size]="18" /> {{ 'more.language' | t }}</h2>
      <div class="card chips">
        <button class="chip" [class.chip--on]="i18n.lang() === 'ar'" (click)="setLang('ar')">العربية</button>
        <button class="chip" [class.chip--on]="i18n.lang() === 'en'" (click)="setLang('en')">English</button>
      </div>

      <h2 class="section-title">{{ 'more.account' | t }}</h2>
      <section class="card stack">
        <div><strong>{{ auth.courier()?.name }}</strong><div class="muted small ltr">{{ phone(auth.courier()?.phone) }}</div></div>
        <button class="btn btn--danger btn--block" (click)="signOut()"><app-icon name="logout" /> {{ 'more.signOut' | t }}</button>
      </section>
    </main>
  `,
  styles: `
    .shops { list-style: none; margin: 0; padding: 0; }
    .shops li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--line); }
    .shops li:last-child { border-bottom: 0; }
  `,
})
export class MorePage {
  protected store = inject(OrdersStore);
  protected auth = inject(Auth);
  protected i18n = inject(I18n);
  private api = inject(Api);
  private toast = inject(Toast);
  private router = inject(Router);

  protected shopName = '';
  protected shopPhone = '';
  protected busy = signal(false);

  constructor() {
    if (!this.store.loaded()) this.store.load();
  }

  protected phone = formatJordanPhone;

  protected setLang(lang: Lang) {
    this.i18n.lang.set(lang);
  }

  protected async addShop() {
    const name = this.shopName.trim();
    if (!name) return this.toast.show(this.i18n.error('invalid_name'), 'error');
    if (this.shopPhone.trim() && !normalizeJordanPhone(this.shopPhone)) {
      return this.toast.show(this.i18n.error('invalid_phone'), 'error');
    }
    this.busy.set(true);
    try {
      await this.store.createShop({ name, phone: this.shopPhone.trim() || undefined });
      this.shopName = '';
      this.shopPhone = '';
    } catch (err) {
      this.toast.show(this.i18n.error(apiErrorCode(err)), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  protected async removeShop(id: string) {
    try {
      await this.store.deleteShop(id);
    } catch (err) {
      this.toast.show(this.i18n.error(apiErrorCode(err)), 'error');
    }
  }

  protected async signOut() {
    await this.api.logout().catch(() => undefined);
    this.auth.clear();
    this.store.reset();
    await this.router.navigateByUrl('/login');
  }
}
