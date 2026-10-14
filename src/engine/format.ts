import type { Invoer } from './types';

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

/**
 * Eenheid van de inhoud: zonder binnendoos (een artikel dat als binnendoos met 1 stuk telt, of een bestaande
 * buitendoos zonder binnendoos) zijn het artikelen, anders binnendozen.
 */
export function inhoudEenheid(invoer: Pick<Invoer, 'zonderBinnendoos'>): 'artikelen' | 'binnendozen' {
  return invoer.zonderBinnendoos ? 'artikelen' : 'binnendozen';
}

/**
 * Het aantal artikelen is een minimum als het uit het minimum aantal artikelen per binnendoos komt (ronde 5).
 * Zonder binnendoos is elk stuk een artikel en is het aantal exact.
 */
export function artikelenIsMinimum(invoer: Pick<Invoer, 'zonderBinnendoos'>): boolean {
  return !invoer.zonderBinnendoos;
}

/** Aantal artikelen per drager voor de weergave: "min. 120" als het een minimum is, anders "120". */
export function artikelenTekst(aantal: number, invoer: Pick<Invoer, 'zonderBinnendoos'>, taal: 'nl' | 'en' = 'nl'): string {
  return `${artikelenIsMinimum(invoer) ? 'min. ' : ''}${getal(aantal, 0, taal)}`;
}
