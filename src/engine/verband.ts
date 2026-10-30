// Verband (ontwerp §4.2, #34): een laag ligt in verband op de laag eronder als minstens de helft
// van zijn dozen op twee of meer dozen eronder steunt. Een doos steunt op een doos eronder als
// hun overlap in beide richtingen minstens 50 mm is. Van de paren met de meeste dozen kiest de app het
// paar met de meeste dozen in laag A, dan het paar met de minste overhang, dan het paar met de minste
// torens (dozen die voor minstens 90% op één doos eronder staan), dan het paar waarin de slechtst
// gesteunde doos de meeste steun heeft (tot de min. ondersteuning), dan het paar waarin laag B laag A gespiegeld is
// (#63), en dan het paar waarin de meeste dozen op twee of meer dozen steunen (#60).
// Een verband telt alleen als het in de buurt van een blok zit (ronde 9): elke doos rust voor minstens de min.
// ondersteuning op de laag eronder, en elke laag laat aan de rand van het blok (de buitenomtrek van de lading) hoogstens
// de max. inham leeg. Een holte binnenin het blok mag wel.

import type { Drager, Overhang, Rechthoek } from './types';
import { omhullende, transformeer, type Transformatie } from './laagpatroon';
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

/**
 * Staat elke doos van `boven` zonder toren (minder dan TOREN op één doos) en met minstens `minSteun` van zijn grondvlak op
 * `onder`? Hetzelfde als torens() 0 en kleinsteSteun() ≥ minSteun, maar stopt bij de eerste doos die niet voldoet.
 */
function zonderTorensGesteund(boven: Rechthoek[], onder: Rechthoek[], minSteun: number): boolean {
  for (const u of boven) {
    const grondvlak = u.w * u.d;
    let opp = 0;
    for (const l of onder) {
      const ox = overlap(u.x, u.x + u.w, l.x, l.x + l.w);
      const oy = overlap(u.y, u.y + u.d, l.y, l.y + l.d);
      if (ox <= EPS || oy <= EPS) continue;
      if (ox * oy >= TOREN * grondvlak - EPS) return false;
      opp += ox * oy;
    }
    if (opp / grondvlak < minSteun - STEUN_EPS) return false;
  }
  return true;
}

/** Standaard voor de max. inham bij verband (ronde 9): hoogstens 5% van het blok mag aan de rand leeg blijven. */
export const STANDAARD_MAX_INHAM = 0.05;

/** Rust elke doos van `boven` voor minstens `minSteun` van zijn grondvlak op de dozen van `onder` (ronde 9)? */
export function allesGesteund(boven: Rechthoek[], onder: Rechthoek[], minSteun: number): boolean {
  if (minSteun <= STEUN_EPS) return true;
  for (const u of boven) {
    let opp = 0;
    for (const l of onder) {
      const ox = overlap(u.x, u.x + u.w, l.x, l.x + l.w);
      const oy = overlap(u.y, u.y + u.d, l.y, l.y + l.d);
      if (ox > EPS && oy > EPS) opp += ox * oy;
    }
    if (opp / (u.w * u.d) < minSteun - STEUN_EPS) return false;
  }
  return true;
}

/** Omhullende rechthoek van alle dozen van de lagen. */
function omhulling(...lagen: Rechthoek[][]): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (const l of lagen)
    for (const r of l) {
      x0 = Math.min(x0, r.x);
      x1 = Math.max(x1, r.x + r.w);
      y0 = Math.min(y0, r.y);
      y1 = Math.max(y1, r.y + r.d);
    }
  return { x0, x1, y0, y1 };
}

/**
 * Het deel van het blok `b` dat in `laag` leeg blijft aan de rand van het blok (een inham), als deel van het grondvlak van
 * het blok (0–1). Een holte binnenin, die nergens aan de rand van het blok raakt, telt niet mee (ronde 9).
 */
export function inham(laag: Rechthoek[], b: { x0: number; x1: number; y0: number; y1: number }): number {
  const blokOpp = (b.x1 - b.x0) * (b.y1 - b.y0);
  if (blokOpp <= EPS) return 0;
  const sleutel = (v: number) => Math.round(v * 1000);
  const assen = (lo: number, hi: number, randen: number[]) => {
    const w = [...new Set([lo, hi, ...randen.filter((v) => v > lo + EPS && v < hi - EPS)].map(sleutel))].sort((p, q) => p - q);
    return { w: w.map((k) => k / 1000), plek: new Map(w.map((k, i) => [k, i])) };
  };
  const xs = assen(
    b.x0,
    b.x1,
    laag.flatMap((r) => [r.x, r.x + r.w]),
  );
  const ys = assen(
    b.y0,
    b.y1,
    laag.flatMap((r) => [r.y, r.y + r.d]),
  );
  const nx = xs.w.length - 1;
  const ny = ys.w.length - 1;
  const vol = new Uint8Array(nx * ny);
  const index = (a: { w: number[]; plek: Map<number, number> }, v: number, lo: number, hi: number) => a.plek.get(sleutel(Math.min(hi, Math.max(lo, v))))!;
  for (const r of laag) {
    const i0 = index(xs, r.x, b.x0, b.x1);
    const i1 = index(xs, r.x + r.w, b.x0, b.x1);
    const j0 = index(ys, r.y, b.y0, b.y1);
    const j1 = index(ys, r.y + r.d, b.y0, b.y1);
    for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) vol[i * ny + j] = 1;
  }
  // Vanaf de lege vakken aan de rand alle lege vakken die daarmee verbonden zijn: samen de inham.
  const gezien = new Uint8Array(nx * ny);
  const stapel: number[] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const k = i * ny + j;
      if ((i === 0 || j === 0 || i === nx - 1 || j === ny - 1) && !vol[k] && !gezien[k]) {
        gezien[k] = 1;
        stapel.push(k);
      }
    }
  let leeg = 0;
  while (stapel.length > 0) {
    const k = stapel.pop()!;
    const i = Math.floor(k / ny);
    const j = k % ny;
    leeg += (xs.w[i + 1] - xs.w[i]) * (ys.w[j + 1] - ys.w[j]);
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = i + di;
      const c = j + dj;
      if (a < 0 || c < 0 || a >= nx || c >= ny) continue;
      const m = a * ny + c;
      if (vol[m] || gezien[m]) continue;
      gezien[m] = 1;
      stapel.push(m);
    }
  }
  return leeg / blokOpp;
}

/**
 * Zit het laagpaar in de buurt van een blok (ronde 9)? Elke laag laat aan de rand van het blok (de omhullende van beide
 * lagen) hoogstens `maxInham` van het grondvlak van het blok leeg. Een laag die zoveel van het blok vult dat er hoogstens
 * `maxInham` leeg is, haalt dat altijd; anders telt alleen de lege ruimte die aan de rand raakt.
 */
export function inBlok(a: Rechthoek[], b: Rechthoek[], maxInham: number): boolean {
  if (maxInham >= 1 - EPS) return true;
  const blok = omhulling(a, b);
  const blokOpp = (blok.x1 - blok.x0) * (blok.y1 - blok.y0);
  for (const l of [a, b]) {
    const opp = l.reduce((s, r) => s + r.w * r.d, 0);
    if (opp >= (1 - maxInham) * blokOpp - EPS) continue;
    if (inham(l, blok) > maxInham + 1e-9) return false;
  }
  return true;
}

/** Zoveel mm mag een doos van laag B afwijken van het spiegelbeeld van laag A (#63). */
export const SPIEGEL_MARGE = 0.5;

/** Hoe laag B laag A gespiegeld is: links-rechts ('x'), voor-achter ('y') of beide, dus een halve slag gedraaid ('xy'). */
export type Spiegeling = 'x' | 'y' | 'xy';

/** Sleutel van een vak van 1 mm in het raster van rasterVan. */
const vak = (x: number, y: number) => x * 1_000_000 + y;

/** Raster van 1 mm op de hoek linksvoor van elke doos: een doos binnen SPIEGEL_MARGE ligt in hetzelfde of een buurvak. */
function rasterVan(dozen: Rechthoek[]): Map<number, number[]> {
  const raster = new Map<number, number[]>();
  dozen.forEach((r, j) => {
    const k = vak(Math.round(r.x), Math.round(r.y));
    const lijst = raster.get(k);
    if (lijst) lijst.push(j);
    else raster.set(k, [j]);
  });
  return raster;
}

/** Omhullende van een laag, de som van de middens van zijn dozen en (pas als het nodig is) zijn raster, voor de spiegeltoets. */
interface Kenmerk {
  om: { x: number; y: number; w: number; d: number };
  cx: number;
  cy: number;
  raster?: Map<number, number[]>;
}

function kenmerkVan(dozen: Rechthoek[]): Kenmerk {
  let cx = 0;
  let cy = 0;
  for (const r of dozen) {
    cx += r.x + r.w / 2;
    cy += r.y + r.d / 2;
  }
  return { om: omhullende(dozen), cx, cy };
}

/**
 * Zijn de dozen van `a`, gespiegeld volgens `s` om (sx / 2, sy / 2), dezelfde als die van `b`, los van de volgorde en elke
 * maat binnen SPIEGEL_MARGE? `raster` is het raster van `b`.
 */
function gespiegeldGelijk(a: Rechthoek[], s: Spiegeling, sx: number, sy: number, b: Rechthoek[], raster: Map<number, number[]>): boolean {
  const gebruikt = new Uint8Array(b.length);
  for (const u of a) {
    const x = s === 'y' ? u.x : sx - u.x - u.w;
    const y = s === 'x' ? u.y : sy - u.y - u.d;
    const vx = Math.round(x);
    const vy = Math.round(y);
    let gevonden = -1;
    for (let dx = -1; dx <= 1 && gevonden < 0; dx++)
      for (let dy = -1; dy <= 1 && gevonden < 0; dy++)
        for (const j of raster.get(vak(vx + dx, vy + dy)) ?? []) {
          const v = b[j];
          if (
            !gebruikt[j] &&
            Math.abs(v.x - x) <= SPIEGEL_MARGE &&
            Math.abs(v.y - y) <= SPIEGEL_MARGE &&
            Math.abs(v.w - u.w) <= SPIEGEL_MARGE &&
            Math.abs(v.d - u.d) <= SPIEGEL_MARGE
          ) {
            gevonden = j;
            break;
          }
        }
    if (gevonden < 0) return false;
    gebruikt[gevonden] = 1;
  }
  return true;
}

/** isGespiegeld met de kenmerken van beide lagen al berekend (zoekVerband rekent ze één keer per laag uit). */
function spiegeling(a: Rechthoek[], ka: Kenmerk, b: Rechthoek[], kb: Kenmerk): Spiegeling | null {
  const n = a.length;
  if (n === 0 || n !== b.length) return null;
  const { om } = ka;
  const ob = kb.om;
  // Gespiegeld om het midden van het eigen blok: beide lagen hebben dezelfde omhullende.
  if (Math.abs(om.x - ob.x) > SPIEGEL_MARGE || Math.abs(om.y - ob.y) > SPIEGEL_MARGE || Math.abs(om.w - ob.w) > SPIEGEL_MARGE || Math.abs(om.d - ob.d) > SPIEGEL_MARGE) return null;
  const sx = 2 * om.x + om.w;
  const sy = 2 * om.y + om.d;
  // Snelle toets vooraf: de som van de middens van de gespiegelde dozen van A moet die van B zijn (gespiegeld wordt een
  // midden c in die richting sx − c of sy − c).
  const marge = SPIEGEL_MARGE * n;
  const x = { zelfde: Math.abs(ka.cx - kb.cx) <= marge, gespiegeld: Math.abs(n * sx - ka.cx - kb.cx) <= marge };
  const y = { zelfde: Math.abs(ka.cy - kb.cy) <= marge, gespiegeld: Math.abs(n * sy - ka.cy - kb.cy) <= marge };
  for (const s of ['x', 'y', 'xy'] as const) {
    if (!(s === 'y' ? x.zelfde : x.gespiegeld) || !(s === 'x' ? y.zelfde : y.gespiegeld)) continue;
    kb.raster ??= rasterVan(b);
    if (gespiegeldGelijk(a, s, sx, sy, b, kb.raster)) return s;
  }
  return null;
}

/**
 * Is laag `b` laag `a` gespiegeld (#63)? Dat is zo als de dozen van `b`, zoals ze liggen, gelijk zijn aan de dozen van `a`
 * gespiegeld om het midden van de omhullende van `a`: links-rechts ('x'), voor-achter ('y') of beide ('xy', een halve
 * slag gedraaid), elke maat binnen SPIEGEL_MARGE. Geeft de spiegeling, of null.
 */
export function isGespiegeld(a: Rechthoek[], b: Rechthoek[]): Spiegeling | null {
  if (a.length === 0 || a.length !== b.length) return null;
  return spiegeling(a, kenmerkVan(a), b, kenmerkVan(b));
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
  /** Lag er een paar in verband dat niet in de buurt van een blok zit (te weinig steun of een te grote inham, ronde 9)? */
  buitenBlok?: boolean;
}

const TRANSFORMATIES: Transformatie[] = ['geen', 'spiegelY', 'spiegelX', 'draai180'];

const STEUN_EPS = 1e-9;

/**
 * Maat van een paar voor de keuze (#60, #63): dozen in A, overhang, torens, steun (tot minSteun), laag B laag A gespiegeld
 * en dozen op twee of meer.
 */
interface Stand {
  a: number;
  oh: number;
  torens: number;
  steun: number;
  /** Laag B is laag A gespiegeld (#63); dat geldt in beide richtingen. */
  gespiegeld: boolean;
  score: number;
}

/**
 * Is `n` beter dan `b`? Eerst de meeste dozen in laag A (alleen met `metA`), dan de minste overhang, de minste torens,
 * de meeste steun voor de slechtst gesteunde doos (tot minSteun; daarboven telt het verschil niet), dan een paar waarin
 * laag B laag A gespiegeld is (#63) en dan de meeste dozen op twee of meer dozen eronder.
 */
function beterStand(n: Stand, b: Stand, metA = true): boolean {
  if (metA && n.a !== b.a) return n.a > b.a;
  if (Math.abs(n.oh - b.oh) > EPS) return n.oh < b.oh;
  if (n.torens !== b.torens) return n.torens < b.torens;
  if (Math.abs(n.steun - b.steun) > STEUN_EPS) return n.steun > b.steun;
  if (n.gespiegeld !== b.gespiegeld) return n.gespiegeld;
  return n.score > b.score;
}

/** De maat met alleen laag B op laag A geteld. */
function standBOpA(a: GeplaatsteLaag, b: GeplaatsteLaag, minSteun: number, gespiegeld = isGespiegeld(a.dozen, b.dozen) !== null): Stand {
  return {
    a: a.dozen.length,
    oh: paarOverhang(a, b),
    torens: torens(b.dozen, a.dozen),
    steun: Math.min(minSteun, kleinsteSteun(b.dozen, a.dozen)),
    gespiegeld,
    score: steunendeDozen(b.dozen, a.dozen),
  };
}

/** De maat met ook laag A op laag B geteld (tweezijdig verband); gespiegeld blijft gespiegeld. */
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
 * (minste overhang, minste torens, meeste steun tot minSteun, laag B laag A gespiegeld, meeste dozen op twee of meer)?
 */
export function beterVoorTweeLagen(p: VerbandPaar, q: VerbandPaar, minSteun = 0.75): boolean {
  return beterStand(standBOpA(p.a, p.b, minSteun), standBOpA(q.a, q.b, minSteun), false);
}

/**
 * Zoekt het verbandpaar met de meeste dozen per twee lagen. `voorraad` zijn relatieve patronen,
 * aflopend op aantal. Bij gelijke aantallen wint het paar met de meeste dozen in laag A, dan het paar
 * met de minste overhang, dan het paar met de minste torens, dan het paar waarin de slechtst gesteunde doos
 * de meeste steun heeft (tot `minSteun`), dan het paar waarin laag B laag A gespiegeld is (#63), dan het paar
 * waarin de meeste dozen op twee of meer dozen eronder steunen, en daarna het eerst gevonden paar. Bij tweezijdig
 * verband telt B op A plus A op B, bij het eenzijdige paar (precies twee lagen) alleen B op A.
 */
export function zoekVerband(voorraad: Rechthoek[][], drager: Drager, maxPatronen = 24, minSteun = 0.75, maxInham = STANDAARD_MAX_INHAM): VerbandUitkomst {
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
  // De bloktoets per paar (ronde 9); het blok is voor (i, j) en (j, i) hetzelfde.
  const blokUitslag = new Map<string, boolean>();
  const blokVorm = (i: number, j: number) => {
    const k = i < j ? `${i}|${j}` : `${j}|${i}`;
    let u = blokUitslag.get(k);
    if (u === undefined) {
      u = inBlok(varianten[i].dozen, varianten[j].dozen, maxInham);
      blokUitslag.set(k, u);
    }
    return u;
  };
  // Per laag één keer de kenmerken voor de spiegeltoets (#63).
  const kenmerken = varianten.map((v) => kenmerkVan(v.dozen));
  const gespiegeld = (i: number, j: number) => spiegeling(varianten[i].dozen, kenmerken[i], varianten[j].dozen, kenmerken[j]) !== null;
  // Paren aflopend op totaal, daarbinnen in voorraadvolgorde (dus aflopend op het aantal in A); binnen het
  // hoogste totaal kiest de rangorde hieronder het beste paar (#60).
  const paren: [number, number][] = [];
  for (let i = 0; i < varianten.length; i++) for (let j = 0; j < varianten.length; j++) if (i !== j && varianten[i].dozen.length >= varianten[j].dozen.length) paren.push([i, j]);
  paren.sort((p, q) => {
    const sp = varianten[p[0]].dozen.length + varianten[p[1]].dozen.length;
    const sq = varianten[q[0]].dozen.length + varianten[q[1]].dozen.length;
    return sq - sp || p[0] - q[0] || p[1] - q[1];
  });
  // Per soort het beste paar: eerst het totaal, dan de rangorde van beterStand (#60).
  let eenzijdig: VerbandPaar | null = null;
  let eenTotaal = 0;
  // De beginstand wordt nooit vergeleken: het eerste geldige paar wint altijd.
  const leeg: Stand = { a: 0, oh: 0, torens: 0, steun: 0, gespiegeld: false, score: -1 };
  let eenStand = leeg;
  let tweezijdig: VerbandPaar | null = null;
  let tweeTotaal = 0;
  let tweeStand = leeg;
  /** Alleen een gespiegeld paar kan het gekozen paar nog verbeteren (zie onderaan de lus). */
  let alleenGespiegeld = false;
  let buitenBlok = false;
  for (const [i, j] of paren) {
    const a = varianten[i];
    const b = varianten[j];
    const totaal = a.dozen.length + b.dozen.length;
    // De paren staan aflopend op totaal en daarbinnen op het aantal in A; een tweezijdig paar is ook
    // eenzijdig, dus eenTotaal ≥ tweeTotaal.
    if (tweezijdig && totaal < tweeTotaal) break;
    let spiegel: boolean | null = null;
    if (alleenGespiegeld) {
      // Alleen een gespiegeld paar met evenveel dozen in laag A en zonder overhang kan nog winnen. Binnen een totaal
      // staan de paren aflopend op het aantal in A, dus bij minder dozen in A kan geen later paar meer winnen. Een
      // gespiegeld paar heeft evenveel dozen in beide lagen; de spiegeltoets is goedkoper dan de verbandtoets.
      if (a.dozen.length < tweeStand.a) break;
      if (a.dozen.length !== b.dozen.length || paarOverhang(a, b) > EPS) continue;
      spiegel = gespiegeld(i, j);
      // Het gekozen paar heeft (met alleen B op A) geen torens en genoeg steun; een gespiegeld paar moet dat ook hebben.
      if (!spiegel || !zonderTorensGesteund(b.dozen, a.dozen, minSteun)) continue;
    }
    if (!inVerband(b.dozen, a.dozen)) continue;
    // In de buurt van een blok (ronde 9): elke doos van B rust genoeg op A, en geen laag laat een te grote inham.
    if (!allesGesteund(b.dozen, a.dozen, minSteun) || !blokVorm(i, j)) {
      buitenBlok = true;
      continue;
    }
    const een = standBOpA(a, b, minSteun, spiegel ?? gespiegeld(i, j));
    if (!eenzijdig || (totaal === eenTotaal && beterStand(een, eenStand))) {
      eenzijdig = { a, b };
      eenTotaal = totaal;
      eenStand = een;
    }
    if (tweezijdig && a.dozen.length < tweeStand.a) continue;
    if (!inVerband(a.dozen, b.dozen)) continue;
    if (!allesGesteund(a.dozen, b.dozen, minSteun)) {
      buitenBlok = true;
      continue;
    }
    const twee = plusAOpB(een, a, b, minSteun);
    if (!tweezijdig || beterStand(twee, tweeStand)) {
      tweezijdig = { a, b };
      tweeTotaal = totaal;
      tweeStand = twee;
    }
    // Geen overhang, geen torens, genoeg steun en elke doos op twee of meer dozen: beter kan alleen nog een gespiegeld
    // paar (#63), en ook dat niet als dit paar al gespiegeld is. Latere paren hebben niet meer dozen in laag A; het
    // eenzijdige paar is dan minstens zo goed als dit paar met alleen B op A, dus ook daarvoor telt alleen nog een
    // gespiegeld paar.
    if (tweeStand.oh <= EPS && tweeStand.torens === 0 && tweeStand.steun >= minSteun - STEUN_EPS && tweeStand.score === totaal) {
      if (tweeStand.gespiegeld) break;
      alleenGespiegeld = true;
    }
  }
  return { tweezijdig, eenzijdig, buitenBlok };
}
