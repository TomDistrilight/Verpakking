// Spreiden van de lading (ronde 4, punt 2): dozen waar mogelijk tegen de rand van de drager, met het
// gewicht zo gelijk mogelijk verdeeld, zolang de dozen erboven genoeg ondersteund blijven.
//
// Per laagpatroon schuift elke doos links van het midden zo ver mogelijk naar links en elke doos rechts
// van het midden zo ver mogelijk naar rechts; een doos op het midden blijft gecentreerd. Daarna
// hetzelfde van voor naar achter. De regel is symmetrisch, dus het zwaartepunt blijft in het midden.
// Dozen gaan tot de rand van de drager, of tot de bestaande omvang van de lading als die al
// overhangt: de overhang wordt nooit groter dan hij al was.

import type { Invoer, Laag, Oplossing, Overhang, Rechthoek } from './types';
import { omhullende } from './laagpatroon';
import { overhangVan } from './plaatsing';
import { inVerband } from './verband';

const EPS = 1e-6;
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** Overlap van twee intervallen (negatief als ze elkaar niet raken). */
function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

/**
 * Spreidt één as. `p`/`m` zijn positie en maat langs de as, `q`/`n` positie en maat dwars erop.
 * Geeft de nieuwe posities, of de oude als de dozen niet tussen `lo` en `hi` passen of het vangnet
 * onderaan ingrijpt. De dozen mogen elkaar vooraf niet overlappen.
 *
 * Doos i moet vóór doos j blijven als ze dwars overlappen en i langs de as vóór j ligt. Met die
 * volgorde is pmin de positie als alles naar het begin geschoven is (langste pad vanaf `lo`) en
 * pmax de positie als alles naar het eind geschoven is (`hi` min het langste pad naar het eind).
 *
 * Waarom er geen overlap ontstaat: als i vóór j ligt, ligt het midden van i vóór dat van j, dus j
 * valt nooit in een eerdere groep (begin < midden < eind) dan i. Verder geldt pmin_i + m_i ≤ pmin_j
 * en pmax_i + m_i ≤ pmax_j, en elke nieuwe positie ligt in [pmin, pmax]:
 *  - beide naar het begin of beide naar het eind: volgt direct uit die twee ongelijkheden;
 *  - i naar het begin, j niet: p_i + m_i = pmin_i + m_i ≤ pmin_j ≤ p_j;
 *  - i op het midden, j naar het eind: p_i + m_i ≤ pmax_i + m_i ≤ pmax_j = p_j;
 *  - beide op het midden: hun middens liggen dan hooguit 1 mm uit elkaar en tegelijk minstens
 *    (m_i + m_j) / 2; dat kan alleen bij dozen van samen hooguit 2 mm (het vangnet onderaan).
 * Dozen die dwars niet overlappen, kunnen elkaar langs de as niet raken.
 */
function spreidAs(p: number[], m: number[], q: number[], n: number[], lo: number, hi: number): number[] {
  const k = p.length;
  // Op volgorde van positie: elke doos die vóór een andere moet blijven, komt eerder.
  const volgorde = Array.from({ length: k }, (_, i) => i).sort((a, b) => p[a] - p[b] || a - b);
  const na: number[][] = Array.from({ length: k }, () => []);
  for (let a = 0; a < k; a++)
    for (let b = a + 1; b < k; b++) {
      const i = volgorde[a];
      const j = volgorde[b];
      if (overlap(q[i], q[i] + n[i], q[j], q[j] + n[j]) > EPS && p[i] + m[i] <= p[j] + EPS) na[i].push(j);
    }
  const pmin = new Array<number>(k).fill(lo);
  for (const i of volgorde) for (const j of na[i]) pmin[j] = Math.max(pmin[j], pmin[i] + m[i]);
  const pmax = m.map((mi) => hi - mi);
  for (let a = k - 1; a >= 0; a--) {
    const i = volgorde[a];
    for (const j of na[i]) pmax[i] = Math.min(pmax[i], pmax[j] - m[i]);
  }
  if (pmin.some((v, i) => v > pmax[i] + EPS)) return p;
  const midden = (lo + hi) / 2;
  const uit = p.map((pi, i) => {
    const c = pi + m[i] / 2;
    if (c < midden - 0.5) return r6(pmin[i]);
    if (c > midden + 0.5) return r6(pmax[i]);
    return r6(Math.min(Math.max(midden - m[i] / 2, pmin[i]), pmax[i]));
  });
  // Vangnet: elke doos die vóór een andere moest blijven, doet dat nog.
  for (let i = 0; i < k; i++) for (const j of na[i]) if (uit[i] + m[i] > uit[j] + EPS) return p;
  return uit;
}

interface Grenzen {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function spreidX(dozen: Rechthoek[], g: Grenzen): Rechthoek[] {
  const x = spreidAs(
    dozen.map((r) => r.x),
    dozen.map((r) => r.w),
    dozen.map((r) => r.y),
    dozen.map((r) => r.d),
    g.x0,
    g.x1,
  );
  return dozen.map((r, i) => ({ ...r, x: x[i] }));
}

function spreidY(dozen: Rechthoek[], g: Grenzen): Rechthoek[] {
  const y = spreidAs(
    dozen.map((r) => r.y),
    dozen.map((r) => r.d),
    dozen.map((r) => r.x),
    dozen.map((r) => r.w),
    g.y0,
    g.y1,
  );
  return dozen.map((r, i) => ({ ...r, y: y[i] }));
}

interface Steun {
  /** Deel van het eigen oppervlak dat op dozen eronder rust. */
  fractie: number;
  /** Het midden van de doos ligt binnen de omhullende van zijn steunvlakken. */
  middenGesteund: boolean;
}

/** Steun van elke doos in `boven` op de laag `onder`. */
function steun(boven: Rechthoek[], onder: Rechthoek[]): Steun[] {
  return boven.map((u) => {
    let opp = 0;
    let bx0 = Infinity;
    let by0 = Infinity;
    let bx1 = -Infinity;
    let by1 = -Infinity;
    for (const l of onder) {
      const ox = overlap(u.x, u.x + u.w, l.x, l.x + l.w);
      const oy = overlap(u.y, u.y + u.d, l.y, l.y + l.d);
      if (ox <= EPS || oy <= EPS) continue;
      opp += ox * oy;
      bx0 = Math.min(bx0, Math.max(u.x, l.x));
      by0 = Math.min(by0, Math.max(u.y, l.y));
      bx1 = Math.max(bx1, Math.min(u.x + u.w, l.x + l.w));
      by1 = Math.max(by1, Math.min(u.y + u.d, l.y + l.d));
    }
    const cx = u.x + u.w / 2;
    const cy = u.y + u.d / 2;
    return {
      fractie: opp / (u.w * u.d),
      middenGesteund: cx >= bx0 - EPS && cx <= bx1 + EPS && cy >= by0 - EPS && cy <= by1 + EPS,
    };
  });
}

/**
 * Schuift de dozen van een oplossing waar mogelijk tegen de rand van de drager (zie boven).
 * Varianten in volgorde: beide richtingen, alleen in de breedte, alleen in de lengte. De eerste
 * variant die de steun en het verband houdt, wint; anders blijft de oplossing zoals hij was.
 *
 * Steun: geen doos zakt onder `minSteun` (of, als hij daar al onder zat, onder zijn oude steun), en
 * een doos waarvan het midden gesteund was, blijft dat. Bij verband blijft elk laagpaar dat in
 * verband lag, in verband. Geeft een nieuwe oplossing, of de invoer zelf als er niets verschuift.
 */
export function spreidLading(o: Oplossing, invoer: Invoer, minSteun = 0.75): Oplossing {
  const drager = invoer.drager;
  const alle = o.lagen.flatMap((l) => l.dozen);
  if (alle.length === 0) return o;
  const om = omhullende(alle);
  const g: Grenzen = {
    x0: Math.min(0, om.x),
    x1: Math.max(drager.breedte, om.x + om.w),
    y0: Math.min(0, om.y),
    y1: Math.max(drager.lengte, om.y + om.d),
  };

  // Elk laagpaar (onder, boven) één keer, met de steun en het verband van de oorspronkelijke oplossing.
  const paren: { onder: number; boven: number; steun: Steun[]; verband: boolean }[] = [];
  for (let k = 1; k < o.laagVolgorde.length; k++) {
    const onder = o.laagVolgorde[k - 1];
    const boven = o.laagVolgorde[k];
    if (paren.some((p) => p.onder === onder && p.boven === boven)) continue;
    const a = o.lagen[onder].dozen;
    const b = o.lagen[boven].dozen;
    paren.push({ onder, boven, steun: steun(b, a), verband: o.stapelwijze === 'verband' && inVerband(b, a) });
  }

  const varianten: [boolean, boolean][] = [
    [true, true],
    [true, false],
    [false, true],
  ];
  for (const [inX, inY] of varianten) {
    const lagen: Laag[] = o.lagen.map((l) => {
      let dozen = l.dozen;
      if (inX) dozen = spreidX(dozen, g);
      if (inY) dozen = spreidY(dozen, g);
      return { dozen };
    });
    const verschoven = lagen.some((l, i) =>
      l.dozen.some((r, j) => Math.abs(r.x - o.lagen[i].dozen[j].x) > EPS || Math.abs(r.y - o.lagen[i].dozen[j].y) > EPS),
    );
    // Niets verschoven: de volgende varianten verschuiven dan ook niets, of zijn gelijk aan de vorige
    // (verschuift alleen in de breedte niets, dan is alleen in de lengte gelijk aan beide richtingen).
    if (!verschoven) return o;
    const goed = paren.every((p) => {
      const a = lagen[p.onder].dozen;
      const b = lagen[p.boven].dozen;
      const nieuw = steun(b, a);
      const steunOk = nieuw.every(
        (s, i) => s.fractie >= Math.min(minSteun, p.steun[i].fractie) - 1e-9 && (!p.steun[i].middenGesteund || s.middenGesteund),
      );
      return steunOk && (!p.verband || inVerband(b, a));
    });
    if (!goed) continue;

    const overhang: Overhang = { voor: 0, achter: 0, links: 0, rechts: 0 };
    for (const l of lagen) {
      const oh = overhangVan(l.dozen, drager);
      overhang.voor = Math.max(overhang.voor, oh.voor);
      overhang.achter = Math.max(overhang.achter, oh.achter);
      overhang.links = Math.max(overhang.links, oh.links);
      overhang.rechts = Math.max(overhang.rechts, oh.rechts);
    }
    const n = omhullende(lagen.flatMap((l) => l.dozen));
    const x0 = Math.min(0, n.x);
    const y0 = Math.min(0, n.y);
    const x1 = Math.max(drager.breedte, n.x + n.w);
    const y1 = Math.max(drager.lengte, n.y + n.d);
    return { ...o, lagen, overhang, omhullende: { breedte: x1 - x0, lengte: y1 - y0 } };
  }
  return o;
}
