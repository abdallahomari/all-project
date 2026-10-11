const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/** Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits to 0-9, and the Arabic decimal separator to ".". */
export function toLatinDigits(value: string): string {
  return value
    .replace(ARABIC_DIGITS, (d) => {
      const code = d.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    })
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
}
