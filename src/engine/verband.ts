// Verband (ontwerp §4.2, #34): een laag ligt in verband op de laag eronder als minstens de helft
// van zijn dozen op twee of meer dozen eronder steunt. Een doos steunt op een doos eronder als
// hun overlap in beide richtingen minstens 50 mm is.

import type { Drager, Rechthoek } from './types';
import { transformeer, type Transformatie } from './laagpatroon';
import { plaats, type GeplaatsteLaag } from './plaatsing';

export const MIN_OVERLAP = 50;
const EPS = 1e-6;

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

/** Ligt `boven` in verband op `onder` (beide in dragercoördinaten)? */
export function inVerband(boven: Rechthoek[], onder: Rechthoek[], minOverlap = MIN_OVERLAP): boolean {
  if (boven.length === 0) return false;
  let steunend = 0;
  for (let i = 0; i < boven.length; i++) {
    const u = boven[i];
    let n = 0;
    for (let j = 0; j < onder.length && n < 2; j++) {
      const l = onder[j];
      if (
        overlap(u.x, u.x + u.w, l.x, l.x + l.w) >= minOverlap - EPS &&
        overlap(u.y, u.y + u.d, l.y, l.y + l.d) >= minOverlap - EPS
      )
        n++;
    }
    if (n >= 2) steunend++;
    // Vroeg stoppen als de helft niet meer haalbaar is.
    if ((steunend + (boven.length - 1 - i)) * 2 < boven.length) return false;
  }
  return steunend * 2 >= boven.length;
}

export interface VerbandPaar {
  /** Onderste (oneven) laag. */
  a: GeplaatsteLaag;
  /** Tweede (even) laag. */
  b: GeplaatsteLaag;
}

export interface VerbandUitkomst {
  /** B op A én A op B in verband: geldig bij elk aantal lagen. */
  tweezijdig: VerbandPaar | null;
  /** Alleen B op A in verband: genoeg bij precies twee lagen (één laagpaar). */
  eenzijdig: VerbandPaar | null;
}

const TRANSFORMATIES: Transformatie[] = ['geen', 'spiegelY', 'spiegelX', 'draai180'];

/**
 * Zoekt het verbandpaar met de meeste dozen per twee lagen. `voorraad` zijn relatieve patronen,
 * aflopend op aantal. Bij gelijke aantallen wint het eerst gevonden paar.
 */
export function zoekVerband(voorraad: Rechthoek[][], drager: Drager, maxPatronen = 24): VerbandUitkomst {
  const basis = voorraad.slice(0, maxPatronen);
  // Alle varianten (patroon × transformatie), geplaatst op de drager.
  const varianten: GeplaatsteLaag[] = [];
  const gezien = new Set<string>();
  for (const p of basis) {
    for (const t of TRANSFORMATIES) {
      const g = plaats(transformeer(p, t), drager);
      if (!g) continue;
      const k = g.dozen
        .map((r) => `${r.x},${r.y},${r.w},${r.d}`)
        .sort()
        .join(';');
      if (gezien.has(k)) continue;
      gezien.add(k);
      varianten.push(g);
    }
  }
  // Paren op volgorde van haalbaar totaal; de eerste die voldoet is de beste.
  const paren: [number, number][] = [];
  for (let i = 0; i < varianten.length; i++)
    for (let j = 0; j < varianten.length; j++) if (i !== j && varianten[i].dozen.length >= varianten[j].dozen.length) paren.push([i, j]);
  paren.sort((p, q) => {
    const sp = varianten[p[0]].dozen.length + varianten[p[1]].dozen.length;
    const sq = varianten[q[0]].dozen.length + varianten[q[1]].dozen.length;
    return sq - sp || p[0] - q[0] || p[1] - q[1];
  });
  let eenzijdig: VerbandPaar | null = null;
  for (const [i, j] of paren) {
    const a = varianten[i];
    const b = varianten[j];
    if (!inVerband(b.dozen, a.dozen)) continue;
    eenzijdig ??= { a, b };
    if (inVerband(a.dozen, b.dozen)) return { tweezijdig: { a, b }, eenzijdig };
  }
  return { tweezijdig: null, eenzijdig };
}
