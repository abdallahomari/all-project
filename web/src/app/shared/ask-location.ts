import { Order, Shop } from '../core/models';
import { I18n } from '../core/i18n';
import { whatsappLink, whatsappShare } from '../domain/phone';

/** Public link the customer opens to share their location. */
export const locationLink = (order: Order) => `${location.origin}/l/${order.locationToken}`;

/** WhatsApp message (Arabic, the customer's language) asking the customer for their location. */
export function askLocationUrl(i18n: I18n, order: Order, shop: Shop | undefined): string {
  const text = i18n.tIn('ar', 'ask.message', {
    name: order.customerName,
    shop: shop?.name ?? '',
    link: locationLink(order),
  });
  return order.customerPhone ? whatsappLink(order.customerPhone, text) : whatsappShare(text);
}
