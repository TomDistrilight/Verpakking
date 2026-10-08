// Stapelen (ontwerp §4.2): volledige lagen, tussenlagen na elke N lagen (niet na de laatste),
// bodemvel en topvel, en de controle op totale hoogte en totaalgewicht.

import type { Buitendoos, Invoer, Laag, Oplossing, Overhang, Stapelwijze } from './types';
import { omhullende } from './laagpatroon';
import type { GeplaatsteLaag } from './plaatsing';

const EPS = 1e-6;

export function aantalTussenlagen(n: number, invoer: Invoer): number {
  const t = invoer.tussenlaag;
  if (t.soort === 'geen' || t.naElkeN <= 0 || n <= 1) return 0;
  return Math.floor((n - 1) / t.naElkeN);
}

export function tussenlaagNa(n: number, invoer: Invoer): number[] {
  const t = invoer.tussenlaag;
  const uit: number[] = [];
  if (t.soort === 'geen' || t.naElkeN <= 0) return uit;
  for (let k = t.naElkeN; k < n; k += t.naElkeN) uit.push(k);
  return uit;
}

function vel(v: { aan: boolean; dikte: number }): number {
  return v.aan ? v.dikte : 0;
}

function velGewicht(v: { aan: boolean; gewicht: number }): number {
  return v.aan ? v.gewicht : 0;
}

export function vasteHoogte(invoer: Invoer): number {
  const m = invoer.materiaal;
  return invoer.drager.hoogte + vel(m.bodemvel) + vel(m.topvel);
}

export function vastGewicht(invoer: Invoer): number {
  const m = invoer.materiaal;
  return invoer.drager.gewicht + velGewicht(m.bodemvel) + velGewicht(m.topvel) + velGewicht(m.hoekprofielen) + velGewicht(m.folie);
}

export function totaleHoogte(n: number, doosH: number, invoer: Invoer): number {
  const t = invoer.tussenlaag;
  return vasteHoogte(invoer) + n * doosH + aantalTussenlagen(n, invoer) * (t.soort === 'geen' ? 0 : t.dikte);
}

/** Hoogste aantal lagen dat in de hoogte past (kan 0 zijn). */
export function maxLagenHoogte(doosH: number, invoer: Invoer): number {
  let n = 0;
  while (totaleHoogte(n + 1, doosH, invoer) <= invoer.drager.maxTotaleHoogte + EPS) {
    n++;
    if (n > 10000) break;
  }
  return n;
}

export type Afwijzing = 'hoogte' | 'gewichtDrager';

export interface StapelUitkomst {
  oplossing?: Omit<Oplossing, 'id' | 'moduleAfstand'>;
  afwijzing?: Afwijzing;
}

/**
 * Stapelt een doos met één (recht) of twee afwisselende (verband) lagen.
 * Lagen: [A] of [A, B]; laag 1, 3, 5, … is A.
 */
export function stapel(doos: Buitendoos, lagen: GeplaatsteLaag[], stapelwijze: Stapelwijze, invoer: Invoer): StapelUitkomst {
  let n = maxLagenHoogte(doos.H, invoer);
  if (n === 0) return { afwijzing: 'hoogte' };
  const t = invoer.tussenlaag;
  const tlGewicht = t.soort === 'geen' ? 0 : t.gewicht;
  const volgorde = (k: number) => Array.from({ length: k }, (_, i) => (lagen.length === 2 ? i % 2 : 0));
  const dozenBij = (k: number) => volgorde(k).reduce((s, idx) => s + lagen[idx].dozen.length, 0);
  const gewichtBij = (k: number) => vastGewicht(invoer) + dozenBij(k) * doos.gevuldGewicht + aantalTussenlagen(k, invoer) * tlGewicht;
  while (n > 0 && gewichtBij(n) > invoer.drager.maxTotaalGewicht + EPS) n--;
  if (n === 0) return { afwijzing: 'gewichtDrager' };
  if (stapelwijze === 'verband' && n < 2) return { afwijzing: 'hoogte' };

  const laagVolgorde = volgorde(n);
  const buitendozen = dozenBij(n);
  const binnen = doos.binnendozenPerDoos === null ? null : buitendozen * doos.binnendozenPerDoos;
  const artikelen = binnen === null ? null : binnen * invoer.artikelenPerBinnendoos;
  const gebruikteLagen = lagen.slice(0, stapelwijze === 'verband' ? 2 : 1);
  const overhang: Overhang = { voor: 0, achter: 0, links: 0, rechts: 0 };
  for (const l of gebruikteLagen) {
    overhang.voor = Math.max(overhang.voor, l.overhang.voor);
    overhang.achter = Math.max(overhang.achter, l.overhang.achter);
    overhang.links = Math.max(overhang.links, l.overhang.links);
    overhang.rechts = Math.max(overhang.rechts, l.overhang.rechts);
  }
  const alle = gebruikteLagen.flatMap((l) => l.dozen);
  const o = omhullende(alle);
  const x0 = Math.min(0, o.x);
  const y0 = Math.min(0, o.y);
  const x1 = Math.max(invoer.drager.breedte, o.x + o.w);
  const y1 = Math.max(invoer.drager.lengte, o.y + o.d);
  const resultaatLagen: Laag[] = gebruikteLagen.map((l) => ({ dozen: l.dozen }));
  return {
    oplossing: {
      doos,
      stapelwijze,
      lagen: resultaatLagen,
      laagVolgorde,
      aantalLagen: n,
      buitendozenPerDrager: buitendozen,
      binnendozenPerDrager: binnen,
      artikelenPerDrager: artikelen,
      tussenlaagNa: tussenlaagNa(n, invoer),
      totaleHoogte: totaleHoogte(n, doos.H, invoer),
      totaalGewicht: gewichtBij(n),
      overhang,
      omhullende: { breedte: x1 - x0, lengte: y1 - y0 },
    },
  };
}
