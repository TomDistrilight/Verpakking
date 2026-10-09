import type { Doostype } from './types';

/** FEFCO 0201, dubbele golf 7 mm (ontwerp §3, #8). Vaste waarden. */
export const FEFCO_0201 = { toeslagL: 14, toeslagB: 14, toeslagH: 28, kartonmassa: 0.75 } as const;

/** Lijmlap van een 0201-vel in mm. */
const LIJMLAP = 35;

export function toeslag(dt: Doostype): { L: number; B: number; H: number } {
  if (dt.soort === '0201') return { L: FEFCO_0201.toeslagL, B: FEFCO_0201.toeslagB, H: FEFCO_0201.toeslagH };
  return { L: dt.toeslagL, B: dt.toeslagB, H: dt.toeslagH };
}

export function kartonmassa(dt: Doostype): number {
  return dt.soort === '0201' ? FEFCO_0201.kartonmassa : dt.kartonmassa;
}

/**
 * Oppervlak van een FEFCO 0201-vel in m², op buitenmaten, inclusief flappen (B/2 diep) en lijmlap:
 * (2L + 2B + 0,035) × (H + B). L is de langste en B de kortste horizontale maat (§4.1).
 */
export function kartonOppervlak(L: number, B: number, H: number): number {
  const l = Math.max(L, B);
  const b = Math.min(L, B);
  return ((2 * l + 2 * b + LIJMLAP) / 1000) * ((H + b) / 1000);
}

export function eigenGewichtDoos(L: number, B: number, H: number, dt: Doostype): number {
  return kartonOppervlak(L, B, H) * kartonmassa(dt);
}
