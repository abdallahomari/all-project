import { toLatinDigits } from './digits';
import { FoundLocation, findLocation } from './maps-link';
import { toFils } from './money';
import { normalizeJordanPhone } from './phone';

export interface ParsedOrder {
  customerName?: string;
  customerPhone?: string;
  amountFils?: number;
  addressNote?: string;
  location?: FoundLocation;
}

const PHONE_RE = /(?:\+|00)?(?:962[\s-]?)?0?7[789](?:[\s-]?\d){7}/g;
const URL_RE = /https?:\/\/\S+/gi;
const COORDS_RE = /geo:\S+|-?\d{1,2}\.\d{3,}\s*[,،]\s*-?\d{1,3}\.\d{3,}/g;

const LABELS = {
  name: /^(?:الاسم|اسم الزبون|اسم العميل|اسم المستلم|الزبون|العميل|المستلم|name|customer(?: name)?)\s*[:：\-–]\s*(.+)$/i,
  phone: /^(?:رقم الهاتف|رقم الموبايل|رقم الجوال|الهاتف|الموبايل|الجوال|الرقم|رقم|phone|mobile|tel|number)\s*[:：\-–]?\s*(.+)$/i,
  amount:
    /^(?:السعر|المبلغ|المجموع|الإجمالي|الاجمالي|المطلوب|الحساب|السعر مع التوصيل|المبلغ المطلوب|total|amount|price|cod)\s*[:：\-–]?\s*(.+)$/i,
  address: /^(?:العنوان|المنطقة|الموقع|السكن|address|area|location)\s*[:：\-–]\s*(.+)$/i,
};

const CURRENCY = '(?:jd|jod|دينار|دنانير|د\\.?\\s?أ|ليرة)';
const AMOUNT_WITH_CURRENCY = new RegExp(`(\\d{1,5}(?:[.,]\\d{1,3})?)\\s*${CURRENCY}`, 'i');
const CURRENCY_THEN_AMOUNT = new RegExp(`${CURRENCY}\\s*(\\d{1,5}(?:[.,]\\d{1,3})?)`, 'i');
const PLAIN_AMOUNT = /(?<![\d.])(\d{1,5}(?:[.,]\d{1,3})?)(?![\d.])/;

function readAmount(text: string): number | undefined {
  const m = text.match(AMOUNT_WITH_CURRENCY) ?? text.match(CURRENCY_THEN_AMOUNT) ?? text.match(PLAIN_AMOUNT);
  if (!m) return undefined;
  const value = Number(m[1].replace(',', '.'));
  return Number.isFinite(value) && value > 0 && value < 100000 ? toFils(value) : undefined;
}

const looksLikeName = (line: string) =>
  line.length >= 2 && line.length <= 40 && !/\d|https?:/i.test(line) && line.split(/\s+/).length <= 4;

/**
 * Pulls customer name, phone, amount, address and location out of a pasted WhatsApp
 * order message. Labelled lines ("الاسم: …", "Total: …") win; otherwise it falls back to
 * patterns (Jordanian mobile numbers, "15 دينار", Google Maps links). Everything it
 * returns is a suggestion the courier confirms in the form.
 */
export function parseOrderMessage(message: string): ParsedOrder {
  const result: ParsedOrder = {};
  const text = toLatinDigits(message).replace(/\r/g, '');
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[\s*•\-–·]+/, '').replace(/[*_~]/g, '').trim())
    .filter(Boolean);

  const location = findLocation(text);
  if (location) result.location = location;

  const leftovers: string[] = [];
  for (const line of lines) {
    let m: RegExpMatchArray | null;
    if (!result.customerName && (m = line.match(LABELS.name))) {
      result.customerName = m[1].trim();
    } else if (!result.customerPhone && (m = line.match(LABELS.phone)) && normalizeJordanPhone(m[1])) {
      result.customerPhone = normalizeJordanPhone(m[1])!;
    } else if (result.amountFils === undefined && (m = line.match(LABELS.amount))) {
      result.amountFils = readAmount(m[1]);
    } else if (!result.addressNote && (m = line.match(LABELS.address)) && !/^https?:/i.test(m[1])) {
      result.addressNote = m[1].trim();
    } else {
      leftovers.push(line);
    }
  }

  if (!result.customerPhone) {
    for (const candidate of text.match(PHONE_RE) ?? []) {
      const phone = normalizeJordanPhone(candidate);
      if (phone) {
        result.customerPhone = phone;
        break;
      }
    }
  }

  const unlabelled = leftovers
    .map((l) => l.replace(URL_RE, '').replace(COORDS_RE, '').replace(PHONE_RE, '').trim())
    .filter((l) => l.length > 1);

  if (result.amountFils === undefined) {
    const withCurrency = unlabelled.find((l) => AMOUNT_WITH_CURRENCY.test(l) || CURRENCY_THEN_AMOUNT.test(l));
    if (withCurrency) result.amountFils = readAmount(withCurrency);
  }

  const rest = unlabelled.filter((l) => !AMOUNT_WITH_CURRENCY.test(l) && !CURRENCY_THEN_AMOUNT.test(l));
  if (!result.customerName) {
    const name = rest.find(looksLikeName);
    if (name) {
      result.customerName = name;
      rest.splice(rest.indexOf(name), 1);
    }
  }
  if (!result.addressNote && rest.length) {
    result.addressNote = rest.join('، ').slice(0, 300);
  }
  return result;
}
