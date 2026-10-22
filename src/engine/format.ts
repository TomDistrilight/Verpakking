import type { Buitendoos, Invoer } from './types';

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
 * Aantal artikelen per drager voor de weergave, bijvoorbeeld "240". Het aantal artikelen per binnendoos is een vast
 * aantal (ronde 8, #67), dus ook het aantal per drager is exact: zonder "min." ervoor.
 */
export function artikelenTekst(aantal: number, taal: 'nl' | 'en' = 'nl'): string {
  return getal(aantal, 0, taal);
}

/**
 * Wat er bij een gekantelde oplossing gekanteld is (ronde 6, #64): bij een bestaande buitendoos zonder binnendoos de
 * buitendoos zelf (die heeft dan een staande as), anders de binnendoos.
 */
export function gekanteldWat(doos: Pick<Buitendoos, 'staandeAs'>): 'buitendoos' | 'binnendoos' {
  return doos.staandeAs ? 'buitendoos' : 'binnendoos';
}
