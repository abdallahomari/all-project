import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18n, TranslatePipe } from '../../core/i18n';
import { Order, SUCCESS_STATUSES, Shop, isActive } from '../../core/models';
import { OrdersStore } from '../../core/orders-store';
import { formatJod } from '../../domain/money';
import { whatsappLink, whatsappShare } from '../../domain/phone';
import { Icon } from '../../shared/icon';

interface ShopCash {
  shop: Shop;
  orders: Order[];
  delivered: number;
  failed: number;
  active: number;
  collected: number;
  pending: number;
}

@Component({
  selector: 'app-cash-page',
  imports: [TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page stack">
      <h1 class="page-title">{{ 'cash.title' | t }}</h1>
      <div class="totals">
        <div class="card total">
          <span class="muted small">{{ 'cash.collected' | t }}</span>
          <strong class="amount big ok">{{ money(totals().collected) }}</strong>
        </div>
        <div class="card total">
          <span class="muted small">{{ 'cash.pending' | t }}</span>
          <strong class="amount big">{{ money(totals().pending) }}</strong>
        </div>
      </div>

      @for (row of rows(); track row.shop.id) {
        <section class="card stack">
          <div class="row">
            <h2 class="spacer">{{ row.shop.name }}</h2>
            <strong class="amount ok">{{ money(row.collected) }}</strong>
          </div>
          <div class="stats small">
            <span class="badge badge--delivered">{{ 'cash.delivered' | t }} {{ row.delivered }}</span>
            <span class="badge badge--refused">{{ 'cash.failed' | t }} {{ row.failed }}</span>
            <span class="badge badge--picked_up">{{ 'cash.active' | t }} {{ row.active }}</span>
          </div>
          <ul class="lines small">
            @for (o of row.orders; track o.id) {
              <li>
                <span class="spacer">{{ o.customerName }}</span>
                <span class="badge" [class]="'badge badge--' + o.status">{{ 'status.' + o.status | t }}</span>
                <span class="amount">{{ money(o.collectedFils ?? o.amountFils) }}</span>
              </li>
            }
          </ul>
          <a class="btn btn--outline btn--block" [href]="shareUrl(row)" target="_blank" rel="noopener">
            <app-icon name="whatsapp" /> {{ 'action.share' | t }}
          </a>
        </section>
      } @empty {
        <p class="muted empty">{{ 'cash.empty' | t }}</p>
      }
    </main>
  `,
  styles: `
    .totals { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .total { display: flex; flex-direction: column; gap: 4px; }
    .big { font-size: 24px; }
    .ok { color: var(--success); }
    h2 { margin: 0; font-size: 18px; }
    .stats { display: flex; gap: 6px; flex-wrap: wrap; }
    .lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .lines li { display: flex; gap: 8px; align-items: center; }
    .empty { text-align: center; padding: 32px 0; }
  `,
})
export class CashPage {
  private store = inject(OrdersStore);
  private i18n = inject(I18n);

  constructor() {
    this.store.load();
  }

  protected rows = computed<ShopCash[]>(() => {
    const byShop = new Map<string, Order[]>();
    for (const o of this.store.orders()) byShop.set(o.shopId, [...(byShop.get(o.shopId) ?? []), o]);
    return [...byShop.entries()]
      .map(([shopId, orders]) => {
        const shop = this.store.shopById().get(shopId) ?? { id: shopId, name: '—' };
        const success = orders.filter((o) => SUCCESS_STATUSES.includes(o.status));
        const active = orders.filter((o) => isActive(o.status));
        return {
          shop,
          orders,
          delivered: success.length,
          active: active.length,
          failed: orders.length - success.length - active.length,
          collected: success.reduce((s, o) => s + (o.collectedFils ?? 0), 0),
          pending: active.reduce((s, o) => s + o.amountFils, 0),
        };
      })
      .sort((a, b) => b.collected - a.collected);
  });

  protected totals = computed(() =>
    this.rows().reduce((t, r) => ({ collected: t.collected + r.collected, pending: t.pending + r.pending }), {
      collected: 0,
      pending: 0,
    }),
  );

  protected money(fils: number) {
    return formatJod(fils, this.i18n.lang());
  }

  /** Arabic summary for the shop owner, sent on WhatsApp. */
  protected shareUrl(row: ShopCash) {
    const ar = (k: string, p?: Record<string, string | number>) => this.i18n.tIn('ar', k, p);
    const date = new Date().toLocaleDateString('en-GB');
    const lines = [
      ar('cash.summaryTitle', { shop: row.shop.name, date }),
      `${ar('cash.delivered')}: ${row.delivered}`,
      `${ar('cash.failed')}: ${row.failed}`,
      `${ar('cash.active')}: ${row.active}`,
      `${ar('cash.collected')}: ${formatJod(row.collected, 'ar')}`,
      '',
      ...row.orders.map(
        (o) =>
          `• ${o.customerName} — ${ar('status.' + o.status)}` +
          (o.statusReason ? ` (${ar('reason.' + o.statusReason)})` : '') +
          ` — ${formatJod(o.collectedFils ?? o.amountFils, 'ar')}`,
      ),
    ];
    const text = lines.join('\n');
    return row.shop.phone ? whatsappLink(row.shop.phone, text) : whatsappShare(text);
  }
}
