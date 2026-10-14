// Verband (ontwerp §4.2, #34): een laag ligt in verband op de laag eronder als minstens de helft
// van zijn dozen op twee of meer dozen eronder steunt. Een doos steunt op een doos eronder als
// hun overlap in beide richtingen minstens 50 mm is. Van de paren met de meeste dozen kiest de app het
// paar met de meeste dozen in laag A, dan het paar met de minste overhang, dan het paar met de minste
// torens (dozen die voor minstens 90% op één doos eronder staan), dan het paar waarin de slechtst
// gesteunde doos de meeste steun heeft (tot de min. ondersteuning), en dan het paar waarin de meeste dozen
// op twee of meer dozen steunen (#60).

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

const STEUN_EPS = 1e-9;

/** Maat van een paar voor de keuze (#60): dozen in A, overhang, torens, steun (tot minSteun) en dozen op twee of meer. */
interface Stand {
  a: number;
  oh: number;
  torens: number;
  steun: number;
  score: number;
}

/**
 * Is `n` beter dan `b`? Eerst de meeste dozen in laag A (alleen met `metA`), dan de minste overhang, de minste torens,
 * de meeste steun voor de slechtst gesteunde doos (tot minSteun; daarboven telt het verschil niet) en de meeste dozen
 * op twee of meer dozen eronder.
 */
function beterStand(n: Stand, b: Stand, metA = true): boolean {
  if (metA && n.a !== b.a) return n.a > b.a;
  if (Math.abs(n.oh - b.oh) > EPS) return n.oh < b.oh;
  if (n.torens !== b.torens) return n.torens < b.torens;
  if (Math.abs(n.steun - b.steun) > STEUN_EPS) return n.steun > b.steun;
  return n.score > b.score;
}

/** De maat met alleen laag B op laag A geteld. */
function standBOpA(a: GeplaatsteLaag, b: GeplaatsteLaag, minSteun: number): Stand {
  return {
    a: a.dozen.length,
    oh: paarOverhang(a, b),
    torens: torens(b.dozen, a.dozen),
    steun: Math.min(minSteun, kleinsteSteun(b.dozen, a.dozen)),
    score: steunendeDozen(b.dozen, a.dozen),
  };
}

/** De maat met ook laag A op laag B geteld (tweezijdig verband). */
function plusAOpB(s: Stand, a: GeplaatsteLaag, b: GeplaatsteLaag, minSteun: number): Stand {
  return {
    ...s,
    torens: s.torens + torens(a.dozen, b.dozen),
    steun: Math.min(s.steun, minSteun, kleinsteSteun(a.dozen, b.dozen)),
    score: s.score + steunendeDozen(a.dozen, b.dozen),
  };
}

/**
 * Bij precies twee lagen telt alleen B op A: ligt laag B van `p` volgens dezelfde rangorde beter op laag A dan bij `q`
 * (minste overhang, minste torens, meeste steun tot minSteun, meeste dozen op twee of meer)?
 */
export function beterVoorTweeLagen(p: VerbandPaar, q: VerbandPaar, minSteun = 0.75): boolean {
  return beterStand(standBOpA(p.a, p.b, minSteun), standBOpA(q.a, q.b, minSteun), false);
}

/**
 * Zoekt het verbandpaar met de meeste dozen per twee lagen. `voorraad` zijn relatieve patronen,
 * aflopend op aantal. Bij gelijke aantallen wint het paar met de meeste dozen in laag A, dan het paar
 * met de minste overhang, dan het paar met de minste torens, dan het paar waarin de slechtst gesteunde doos
 * de meeste steun heeft (tot `minSteun`), dan het paar waarin de meeste dozen op twee of meer dozen eronder
 * steunen, en daarna het eerst gevonden paar. Bij tweezijdig verband telt B op A plus A op B, bij het
 * eenzijdige paar (precies twee lagen) alleen B op A.
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
  // Paren aflopend op totaal, daarbinnen in voorraadvolgorde (dus aflopend op het aantal in A); binnen het
  // hoogste totaal kiest de rangorde hieronder het beste paar (#60).
  const paren: [number, number][] = [];
  for (let i = 0; i < varianten.length; i++)
    for (let j = 0; j < varianten.length; j++) if (i !== j && varianten[i].dozen.length >= varianten[j].dozen.length) paren.push([i, j]);
  paren.sort((p, q) => {
    const sp = varianten[p[0]].dozen.length + varianten[p[1]].dozen.length;
    const sq = varianten[q[0]].dozen.length + varianten[q[1]].dozen.length;
    return sq - sp || p[0] - q[0] || p[1] - q[1];
  });
  // Per soort het beste paar: eerst het totaal, dan de rangorde van beterStand (#60).
  let eenzijdig: VerbandPaar | null = null;
  let eenTotaal = 0;
  // De beginstand wordt nooit vergeleken: het eerste geldige paar wint altijd.
  const leeg: Stand = { a: 0, oh: 0, torens: 0, steun: 0, score: -1 };
  let eenStand = leeg;
  let tweezijdig: VerbandPaar | null = null;
  let tweeTotaal = 0;
  let tweeStand = leeg;
  for (const [i, j] of paren) {
    const a = varianten[i];
    const b = varianten[j];
    const totaal = a.dozen.length + b.dozen.length;
    // De paren staan aflopend op totaal en daarbinnen op het aantal in A; een tweezijdig paar is ook
    // eenzijdig, dus eenTotaal ≥ tweeTotaal.
    if (tweezijdig && totaal < tweeTotaal) break;
    if (!inVerband(b.dozen, a.dozen)) continue;
    const een = standBOpA(a, b, minSteun);
    if (!eenzijdig || (totaal === eenTotaal && beterStand(een, eenStand))) {
      eenzijdig = { a, b };
      eenTotaal = totaal;
      eenStand = een;
    }
    if (tweezijdig && a.dozen.length < tweeStand.a) continue;
    if (!inVerband(a.dozen, b.dozen)) continue;
    const twee = plusAOpB(een, a, b, minSteun);
    if (!tweezijdig || beterStand(twee, tweeStand)) {
      tweezijdig = { a, b };
      tweeTotaal = totaal;
      tweeStand = twee;
    }
    // Geen overhang, geen torens, genoeg steun en elke doos op twee of meer dozen: beter kan niet.
    if (tweeStand.oh <= EPS && tweeStand.torens === 0 && tweeStand.steun >= minSteun - STEUN_EPS && tweeStand.score === totaal) break;
  }
  return { tweezijdig, eenzijdig };
}
