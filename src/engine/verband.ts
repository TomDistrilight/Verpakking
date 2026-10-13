// Verband (ontwerp §4.2, #34): een laag ligt in verband op de laag eronder als minstens de helft
// van zijn dozen op twee of meer dozen eronder steunt. Een doos steunt op een doos eronder als
// hun overlap in beide richtingen minstens 50 mm is. Van de paren met de meeste dozen kiest de app het
// paar met de meeste dozen in laag A, dan het paar met de minste overhang, dan het paar met de minste
// torens (dozen die voor minstens 90% op één doos eronder staan), dan een paar waarin elke doos genoeg
// steun heeft, en dan het paar waarin de meeste dozen op twee of meer dozen steunen (#60).

import type { Drager, Overhang, Rechthoek } from './types';
import { transformeer, type Transformatie } from './laagpatroon';
import { plaats, type GeplaatsteLaag } from './plaatsing';

export const MIN_OVERLAP = 50;
/** Een doos die voor minstens dit deel van zijn grondvlak op één doos eronder staat, vormt daarmee een toren. */
export const TOREN = 0.9;
const EPS = 1e-6;

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

/** Steunt `u` op twee of meer dozen van `onder`? */
function opTweeOfMeer(u: Rechthoek, onder: Rechthoek[], minOverlap: number): boolean {
  let n = 0;
  for (let j = 0; j < onder.length && n < 2; j++) {
    const l = onder[j];
    if (overlap(u.x, u.x + u.w, l.x, l.x + l.w) >= minOverlap - EPS && overlap(u.y, u.y + u.d, l.y, l.y + l.d) >= minOverlap - EPS) n++;
  }
  return n >= 2;
}

/** Ligt `boven` in verband op `onder` (beide in dragercoördinaten)? */
export function inVerband(boven: Rechthoek[], onder: Rechthoek[], minOverlap = MIN_OVERLAP): boolean {
  if (boven.length === 0) return false;
  let steunend = 0;
  for (let i = 0; i < boven.length; i++) {
    if (opTweeOfMeer(boven[i], onder, minOverlap)) steunend++;
    // Vroeg stoppen als de helft niet meer haalbaar is.
    if ((steunend + (boven.length - 1 - i)) * 2 < boven.length) return false;
  }
  return steunend * 2 >= boven.length;
}

/** Aantal dozen van `boven` dat op twee of meer dozen van `onder` steunt. */
export function steunendeDozen(boven: Rechthoek[], onder: Rechthoek[], minOverlap = MIN_OVERLAP): number {
  let n = 0;
  for (const u of boven) if (opTweeOfMeer(u, onder, minOverlap)) n++;
  return n;
}

/** Kleinste deel van het grondvlak waarmee een doos van `boven` op de dozen van `onder` rust (0–1). */
export function kleinsteSteun(boven: Rechthoek[], onder: Rechthoek[]): number {
  let min = 1;
  for (const u of boven) {
    let opp = 0;
    for (const l of onder) {
      const ox = overlap(u.x, u.x + u.w, l.x, l.x + l.w);
      const oy = overlap(u.y, u.y + u.d, l.y, l.y + l.d);
      if (ox > EPS && oy > EPS) opp += ox * oy;
    }
    min = Math.min(min, opp / (u.w * u.d));
  }
  return min;
}

/** Aantal dozen van `boven` dat voor minstens TOREN van zijn grondvlak op één doos van `onder` staat (torens). */
export function torens(boven: Rechthoek[], onder: Rechthoek[]): number {
  let n = 0;
  for (const u of boven)
    if (onder.some((l) => Math.max(0, overlap(u.x, u.x + u.w, l.x, l.x + l.w)) * Math.max(0, overlap(u.y, u.y + u.d, l.y, l.y + l.d)) >= TOREN * u.w * u.d - EPS)) n++;
  return n;
}

/** Overhang van een paar lagen: per zijde de grootste van beide, opgeteld. */
function paarOverhang(a: GeplaatsteLaag, b: GeplaatsteLaag): number {
  const zijde = (k: keyof Overhang) => Math.max(a.overhang[k], b.overhang[k]);
  return zijde('voor') + zijde('achter') + zijde('links') + zijde('rechts');
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
 * aflopend op aantal. Bij gelijke aantallen wint het paar met de meeste dozen in laag A, dan het paar
 * met de minste overhang, dan het paar met de minste torens, dan een paar waarin elke doos met minstens
 * `minSteun` van zijn grondvlak op de laag eronder rust, dan het paar waarin de meeste dozen op twee of
 * meer dozen eronder steunen, en daarna het eerst gevonden paar. Bij tweezijdig verband telt B op A plus
 * A op B, bij het eenzijdige paar (precies twee lagen) alleen B op A.
 */
export function zoekVerband(voorraad: Rechthoek[][], drager: Drager, maxPatronen = 24, minSteun = 0.75): VerbandUitkomst {
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
  // Per soort het beste paar: eerst het totaal, dan de meeste dozen in laag A (bij een oneven aantal
  // lagen ligt A er één keer vaker), dan de minste overhang (patronen zonder overhang staan in de
  // voorraad vooraan), dan de minste torens, dan genoeg steun voor elke doos, dan het aantal dozen op twee
  // of meer dozen eronder.
  interface Stand {
    a: number;
    oh: number;
    torens: number;
    genoeg: boolean;
    score: number;
  }
  const beter = (n: Stand, b: Stand) =>
    n.a !== b.a ? n.a > b.a : Math.abs(n.oh - b.oh) > EPS ? n.oh < b.oh : n.torens !== b.torens ? n.torens < b.torens : n.genoeg !== b.genoeg ? n.genoeg : n.score > b.score;
  const genoegSteun = (boven: Rechthoek[], onder: Rechthoek[]) => kleinsteSteun(boven, onder) >= minSteun - 1e-9;
  let eenzijdig: VerbandPaar | null = null;
  let eenTotaal = 0;
  let eenStand: Stand = { a: 0, oh: 0, torens: 0, genoeg: false, score: -1 };
  let tweezijdig: VerbandPaar | null = null;
  let tweeTotaal = 0;
  let tweeStand: Stand = { a: 0, oh: 0, torens: 0, genoeg: false, score: -1 };
  for (const [i, j] of paren) {
    const a = varianten[i];
    const b = varianten[j];
    const totaal = a.dozen.length + b.dozen.length;
    // De paren staan aflopend op totaal en daarbinnen op het aantal in A; een tweezijdig paar is ook
    // eenzijdig, dus eenTotaal ≥ tweeTotaal.
    if (tweezijdig && totaal < tweeTotaal) break;
    if (!inVerband(b.dozen, a.dozen)) continue;
    const ba = steunendeDozen(b.dozen, a.dozen);
    const oh = paarOverhang(a, b);
    const bOpA = genoegSteun(b.dozen, a.dozen);
    const tb = torens(b.dozen, a.dozen);
    const een: Stand = { a: a.dozen.length, oh, torens: tb, genoeg: bOpA, score: ba };
    if (!eenzijdig || (totaal === eenTotaal && beter(een, eenStand))) {
      eenzijdig = { a, b };
      eenTotaal = totaal;
      eenStand = een;
    }
    if (tweezijdig && a.dozen.length < tweeStand.a) continue;
    if (!inVerband(a.dozen, b.dozen)) continue;
    const twee: Stand = {
      a: a.dozen.length,
      oh,
      torens: tb + torens(a.dozen, b.dozen),
      genoeg: bOpA && genoegSteun(a.dozen, b.dozen),
      score: ba + steunendeDozen(a.dozen, b.dozen),
    };
    if (!tweezijdig || beter(twee, tweeStand)) {
      tweezijdig = { a, b };
      tweeTotaal = totaal;
      tweeStand = twee;
    }
    // Geen overhang, geen torens, genoeg steun en elke doos op twee of meer dozen: beter kan niet.
    if (tweeStand.oh <= EPS && tweeStand.torens === 0 && tweeStand.genoeg && tweeStand.score === totaal) break;
  }
  return { tweezijdig, eenzijdig };
}
