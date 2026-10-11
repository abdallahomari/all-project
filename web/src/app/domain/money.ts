/** Jordanian Dinar has 3 decimals: 1 JD = 1000 fils. Money is kept as integer fils everywhere. */
export const FILS_PER_JOD = 1000;

export const toFils = (jod: number) => Math.round(jod * FILS_PER_JOD);

/** 15500 → "15.500", 15000 → "15". */
export function formatJodNumber(fils: number): string {
  const jod = fils / FILS_PER_JOD;
  return Number.isInteger(jod) ? String(jod) : jod.toFixed(3);
}

export function formatJod(fils: number, lang: 'ar' | 'en'): string {
  return lang === 'ar' ? `${formatJodNumber(fils)} د.أ` : `${formatJodNumber(fils)} JD`;
}

/** Parses "15", "15.5", "15.500", "١٥٫٥" typed by the courier. Returns fils or null. */
export function parseJodInput(text: string): number | null {
  const cleaned = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/٫/g, '.')
    .replace(/,/g, '.')
    .trim();
  if (!/^\d{1,6}(\.\d{1,3})?$/.test(cleaned)) return null;
  return toFils(Number(cleaned));
}
