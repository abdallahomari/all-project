import { decodePolyline } from './polyline';
import { formatJod, parseJodInput } from './money';
import { formatJordanPhone, normalizeJordanPhone, whatsappLink } from './phone';
import { coordsFromText } from './maps-link';

describe('domain helpers', () => {
  it('formats and parses Jordanian dinars in fils', () => {
    expect(formatJod(15000, 'en')).toBe('15 JD');
    expect(formatJod(15500, 'ar')).toBe('15.500 د.أ');
    expect(parseJodInput('12.5')).toBe(12500);
    expect(parseJodInput('١٢٫٧٥٠')).toBe(12750);
    expect(parseJodInput('abc')).toBeNull();
  });

  it('normalises and formats phones', () => {
    expect(normalizeJordanPhone('079-123-4567')).toBe('+962791234567');
    expect(normalizeJordanPhone('0651234567')).toBeNull();
    expect(formatJordanPhone('+962791234567')).toBe('079 123 4567');
    expect(whatsappLink('+962791234567', 'hi there')).toBe('https://wa.me/962791234567?text=hi%20there');
  });

  it('decodes Google polylines', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });

  it('reads search URLs', () => {
    expect(coordsFromText('https://www.google.com/maps/search/31.95,+35.91')).toEqual({ lat: 31.95, lng: 35.91 });
  });
});
