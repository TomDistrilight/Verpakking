const cache = new Map<string, Intl.NumberFormat>();

/** Getal in Nederlandse notatie, met hoogstens `decimalen` cijfers achter de komma. */
export function getal(v: number, decimalen = 0, taal: 'nl' | 'en' = 'nl'): string {
  const k = `${taal}|${decimalen}`;
  let f = cache.get(k);
  if (!f) {
    f = new Intl.NumberFormat(taal === 'nl' ? 'nl-NL' : 'en-GB', { maximumFractionDigits: decimalen, minimumFractionDigits: 0, useGrouping: false });
    cache.set(k, f);
  }
  return f.format(v);
}

/** Getal met precies `decimalen` cijfers achter de komma. */
export function vast(v: number, decimalen: number, taal: 'nl' | 'en' = 'nl'): string {
  return new Intl.NumberFormat(taal === 'nl' ? 'nl-NL' : 'en-GB', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen, useGrouping: false }).format(v);
}

export function mm(v: number): string {
  return getal(v, 1);
}

export function maat(a: number, b: number, c?: number): string {
  return c === undefined ? `${mm(a)} × ${mm(b)}` : `${mm(a)} × ${mm(b)} × ${mm(c)}`;
}

export function procent(v: number): string {
  return `${getal(v * 100, 1)}%`;
}
