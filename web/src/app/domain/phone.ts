import { toLatinDigits } from './digits';

/** Normalises a Jordanian mobile (07[789]XXXXXXX, +962…, 00962…) to E.164, or null. */
export function normalizeJordanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = toLatinDigits(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('962')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^7[789]\d{7}$/.test(digits) ? `+962${digits}` : null;
}

/** +962791234567 → 079 123 4567 (how Jordanians read numbers). */
export function formatJordanPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const local = '0' + e164.replace(/^\+962/, '');
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** wa.me link; text is optional. */
export function whatsappLink(e164: string, text?: string): string {
  const base = `https://wa.me/${e164.replace(/^\+/, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** WhatsApp share without a fixed recipient (courier picks the chat). */
export const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
