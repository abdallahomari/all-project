import { parseOrderMessage } from './order-parser';

describe('parseOrderMessage', () => {
  it('reads a labelled Arabic order with a Google Maps link', () => {
    const msg = `طلب جديد 👟
الاسم: لينا أحمد
رقم الهاتف: 0791234567
العنوان: خلدا، قرب سيفوي
المبلغ: 25.500 دينار
https://maps.google.com/?q=31.9987,35.8331`;
    const p = parseOrderMessage(msg);
    expect(p.customerName).toBe('لينا أحمد');
    expect(p.customerPhone).toBe('+962791234567');
    expect(p.addressNote).toBe('خلدا، قرب سيفوي');
    expect(p.amountFils).toBe(25500);
    expect(p.location?.location).toEqual({ lat: 31.9987, lng: 35.8331 });
  });

  it('handles Arabic-Indic digits and an unlabelled message', () => {
    const msg = `محمد سالم
٠٧٨ ١٢٣ ٤٥٦٧
الجبيهة شارع الجامعة بجانب مخبز
١٨ دينار`;
    const p = parseOrderMessage(msg);
    expect(p.customerName).toBe('محمد سالم');
    expect(p.customerPhone).toBe('+962781234567');
    expect(p.amountFils).toBe(18000);
    expect(p.addressNote).toContain('الجبيهة');
  });

  it('reads an English message with +962 and JD', () => {
    const p = parseOrderMessage('Name: Sara\nPhone: +962 77 765 4321\nTotal: 12.75 JD\nArea: Abdoun');
    expect(p.customerName).toBe('Sara');
    expect(p.customerPhone).toBe('+962777654321');
    expect(p.amountFils).toBe(12750);
    expect(p.addressNote).toBe('Abdoun');
  });

  it('flags short links for the server to resolve', () => {
    const p = parseOrderMessage('موقعي https://maps.app.goo.gl/AbC123xyz');
    expect(p.location?.shortLink).toBe('https://maps.app.goo.gl/AbC123xyz');
    expect(p.location?.location).toBeUndefined();
  });

  it('reads coordinates from a place URL and ignores locations outside Jordan', () => {
    const place = parseOrderMessage(
      'https://www.google.com/maps/place/Mecca+Mall/@31.97,35.83,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d31.9754!4d35.8357',
    );
    expect(place.location?.location).toEqual({ lat: 31.9754, lng: 35.8357 });
    expect(parseOrderMessage('https://maps.google.com/?q=48.8566,2.3522').location).toBeUndefined();
  });
});

describe('parseOrderMessage bare coordinates', () => {
  it('uses bare coordinates as the location and keeps them out of the address', () => {
    const p = parseOrderMessage('رامي\n0777123456\n31.9632, 35.9097\nالمبلغ: 30');
    expect(p.location?.location).toEqual({ lat: 31.9632, lng: 35.9097 });
    expect(p.addressNote).toBeUndefined();
    expect(p.customerName).toBe('رامي');
  });
});
