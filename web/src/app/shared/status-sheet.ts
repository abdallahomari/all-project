import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiErrorCode } from '../core/api';
import { I18n, TranslatePipe } from '../core/i18n';
import { Order, OrderStatus, Shop, isActive } from '../core/models';
import { OrdersStore } from '../core/orders-store';
import { Toast } from '../core/toast';
import { formatJod, formatJodNumber, parseJodInput } from '../domain/money';
import { Icon } from './icon';

const REASONS: Partial<Record<OrderStatus, string[]>> = {
  partial: ['size', 'not_as_expected', 'changed_mind'],
  exchange: ['size', 'not_as_expected'],
  postponed: ['customer_request', 'not_home', 'no_cash'],
  unreachable: ['no_answer', 'phone_off', 'wrong_number', 'wrong_address', 'not_home'],
  refused: ['changed_mind', 'price', 'not_as_expected', 'no_cash', 'size'],
};

const OTHER_STATUSES: OrderStatus[] = ['unreachable', 'postponed', 'refused', 'partial', 'exchange', 'returned'];

const tomorrow = () => {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Bottom sheet: record what happened at a stop in one or two taps. */
@Component({
  selector: 'app-status-sheet',
  imports: [FormsModule, TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-sheet.html',
  styleUrl: './status-sheet.scss',
})
export class StatusSheet {
  private store = inject(OrdersStore);
  private toast = inject(Toast);
  protected i18n = inject(I18n);

  readonly order = input.required<Order>();
  readonly shop = input<Shop | undefined>();
  readonly closed = output<void>();
  readonly edit = output<string>();

  protected readonly others = OTHER_STATUSES;
  protected readonly chosen = signal<OrderStatus | null>(null);
  protected readonly reason = signal('');
  protected readonly note = signal('');
  protected readonly date = signal(tomorrow());
  protected readonly collected = signal('');
  protected readonly busy = signal(false);

  protected readonly active = computed(() => isActive(this.order().status));
  protected readonly amount = computed(() => formatJod(this.order().amountFils, this.i18n.lang()));
  protected readonly reasons = computed(() => (this.chosen() ? REASONS[this.chosen()!] ?? [] : []));
  protected readonly needsCash = computed(() => this.chosen() === 'delivered' || this.chosen() === 'partial');

  protected choose(status: OrderStatus) {
    this.chosen.set(status);
    this.reason.set('');
    this.note.set('');
    if (status === 'delivered' || status === 'partial') {
      this.collected.set(formatJodNumber(this.order().amountFils));
    }
  }

  protected async deliverNow() {
    this.chosen.set('delivered');
    this.collected.set(formatJodNumber(this.order().amountFils));
    await this.confirm();
  }

  protected async confirm() {
    const status = this.chosen();
    if (!status) return;
    let collectedFils: number | undefined;
    if (this.needsCash()) {
      const parsed = parseJodInput(this.collected() || '0');
      if (parsed === null) {
        this.toast.show(this.i18n.error('invalid_amountFils'), 'error');
        return;
      }
      collectedFils = parsed;
    }
    await this.save({
      status,
      collectedFils,
      statusReason: this.reason() || undefined,
      statusNote: this.note().trim() || undefined,
      postponedTo: status === 'postponed' ? this.date() : undefined,
    });
  }

  protected reopen() {
    return this.save({ status: 'picked_up' });
  }

  private async save(change: Parameters<OrdersStore['setStatus']>[1]) {
    this.busy.set(true);
    try {
      await this.store.setStatus(this.order().id, change);
      this.toast.show(this.i18n.t(`status.${change.status}`), 'success', 2000);
      this.closed.emit();
    } catch (err) {
      this.toast.show(this.i18n.error(apiErrorCode(err)), 'error');
    } finally {
      this.busy.set(false);
    }
  }
}
