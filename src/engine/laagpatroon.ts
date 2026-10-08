// Laagpatronen: zoveel mogelijk gelijke rechthoekige dozen (p × q, 90° draaibaar) in een
// rechthoek W × D. Exact voor guillotinepatronen (dynamisch programmeren over rasterpunten),
// aangevuld met het vijfblokspatroon (pinwheel) voor niet-guillotine-indelingen.
// Daarnaast levert de module een voorraad alternatieve patronen voor het zoeken naar verband.

import type { Rechthoek } from './types';

const EPS = 1e-6;

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

export interface Patroon {
  dozen: Rechthoek[];
  aantal: number;
  bron: string;
}

/** Alle waarden i·p + j·q ≤ lim, oplopend gesorteerd. */
export function raster(lim: number, p: number, q: number): number[] {
  const set = new Set<number>();
  for (let i = 0; i * p <= lim + EPS; i++) {
    for (let j = 0; i * p + j * q <= lim + EPS; j++) set.add(r6(i * p + j * q));
  }
  return [...set].sort((a, b) => a - b);
}

/** Grootste rasterwaarde ≤ v. */
function norm(lijst: number[], v: number): number {
  let lo = 0;
  let hi = lijst.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lijst[mid] <= v + EPS) {
      best = lijst[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return best;
}

const vloer = (a: number, b: number) => Math.floor(a / b + EPS);

/** Aantal dozen in een rooster: oriëntatie 0 = p langs x, 1 = q langs x. */
function rooster(w: number, d: number, p: number, q: number, o: 0 | 1): number {
  return o === 0 ? vloer(w, p) * vloer(d, q) : vloer(w, q) * vloer(d, p);
}

function roosterDozen(x0: number, y0: number, w: number, d: number, p: number, q: number, o: 0 | 1): Rechthoek[] {
  const bw = o === 0 ? p : q;
  const bd = o === 0 ? q : p;
  const nx = vloer(w, bw);
  const ny = vloer(d, bd);
  const uit: Rechthoek[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) uit.push({ x: r6(x0 + i * bw), y: r6(y0 + j * bd), w: bw, d: bd });
  return uit;
}

/** Bovengrens op basis van oppervlak en de best te vullen lijn in beide richtingen. */
export function bovengrens(W: number, D: number, p: number, q: number): number {
  const X = raster(W, p, q);
  const Y = raster(D, p, q);
  const lijnX = X[X.length - 1];
  const lijnY = Y[Y.length - 1];
  return vloer(Math.min(W * D, lijnX * D, W * lijnY), p * q);
}

interface Keuze {
  n: number;
  soort: 'rooster' | 'x' | 'y';
  /** Snijpositie of oriëntatie. */
  a: number;
}

/** Guillotine-DP over rasterpunten met reconstructie. */
class Guillotine {
  private memo = new Map<string, Keuze>();
  private X: number[];
  private Y: number[];

  constructor(
    W: number,
    D: number,
    private p: number,
    private q: number,
    private yEerst: boolean,
  ) {
    this.X = raster(W, p, q);
    this.Y = raster(D, p, q);
  }

  get rasterGrootte(): number {
    return this.X.length * this.Y.length;
  }

  f(w: number, d: number): Keuze {
    const sleutel = `${w},${d}`;
    const bekend = this.memo.get(sleutel);
    if (bekend) return bekend;
    const { p, q } = this;
    const g0 = rooster(w, d, p, q, 0);
    const g1 = rooster(w, d, p, q, 1);
    let best: Keuze = g0 >= g1 ? { n: g0, soort: 'rooster', a: 0 } : { n: g1, soort: 'rooster', a: 1 };
    const grens = vloer(w * d, p * q);
    if (best.n < grens) {
      const xSnedes = () => {
        for (const r of this.X) {
          if (r <= EPS) continue;
          if (r > w / 2 + EPS) break;
          const n = this.f(r, d).n + this.f(norm(this.X, w - r), d).n;
          if (n > best.n) best = { n, soort: 'x', a: r };
        }
      };
      const ySnedes = () => {
        for (const s of this.Y) {
          if (s <= EPS) continue;
          if (s > d / 2 + EPS) break;
          const n = this.f(w, s).n + this.f(w, norm(this.Y, d - s)).n;
          if (n > best.n) best = { n, soort: 'y', a: s };
        }
      };
      if (this.yEerst) {
        ySnedes();
        xSnedes();
      } else {
        xSnedes();
        ySnedes();
      }
    }
    this.memo.set(sleutel, best);
    return best;
  }

  normX(v: number) {
    return norm(this.X, v);
  }

  normY(v: number) {
    return norm(this.Y, v);
  }

  dozen(w: number, d: number, x0: number, y0: number): Rechthoek[] {
    const k = this.f(w, d);
    if (k.soort === 'rooster') return roosterDozen(x0, y0, w, d, this.p, this.q, k.a as 0 | 1);
    if (k.soort === 'x') {
      return [...this.dozen(k.a, d, x0, y0), ...this.dozen(this.normX(w - k.a), d, x0 + k.a, y0)];
    }
    return [...this.dozen(w, k.a, x0, y0), ...this.dozen(w, this.normY(d - k.a), x0, y0 + k.a)];
  }

  get xLijst() {
    return this.X;
  }

  get yLijst() {
    return this.Y;
  }
}

/** Vijfblokspatroon (pinwheel); geeft het beste gevonden patroon of null. */
function vijfblok(g: Guillotine, W: number, D: number, maxRaster: number): Patroon | null {
  const X = g.xLijst.filter((v) => v > EPS && v < W - EPS);
  const Y = g.yLijst.filter((v) => v > EPS && v < D - EPS);
  if (X.length > maxRaster || Y.length > maxRaster) return null;
  let best = -1;
  let beste: [number, number, number, number] | null = null;
  for (let i = 0; i < X.length; i++) {
    const x1 = X[i];
    for (let j = i + 1; j < X.length; j++) {
      const x2 = X[j];
      for (let k = 0; k < Y.length; k++) {
        const y1 = Y[k];
        for (let m = k + 1; m < Y.length; m++) {
          const y2 = Y[m];
          const n =
            g.f(g.normX(x2), g.normY(y1)).n +
            g.f(g.normX(W - x2), g.normY(y2)).n +
            g.f(g.normX(W - x1), g.normY(D - y2)).n +
            g.f(g.normX(x1), g.normY(D - y1)).n +
            g.f(g.normX(x2 - x1), g.normY(y2 - y1)).n;
          if (n > best) {
            best = n;
            beste = [x1, x2, y1, y2];
          }
        }
      }
    }
  }
  if (!beste) return null;
  const [x1, x2, y1, y2] = beste;
  const dozen = [
    ...g.dozen(g.normX(x2), g.normY(y1), 0, 0),
    ...g.dozen(g.normX(W - x2), g.normY(y2), x2, 0),
    ...g.dozen(g.normX(W - x1), g.normY(D - y2), x1, y2),
    ...g.dozen(g.normX(x1), g.normY(D - y1), 0, y1),
    ...g.dozen(g.normX(x2 - x1), g.normY(y2 - y1), x1, y1),
  ];
  return { dozen, aantal: dozen.length, bron: 'vijfblok' };
}

/**
 * Vijfblokspatroon met uniforme blokken (elk blok één rooster in de beste stand). Sneller dan de
 * variant met guillotineblokken, zodat het ook bij grotere rasters kan draaien.
 */
function vijfblokRooster(W: number, D: number, p: number, q: number, X0: number[], Y0: number[], maxRaster: number): Patroon | null {
  const X = X0.filter((v) => v > EPS && v < W - EPS);
  const Y = Y0.filter((v) => v > EPS && v < D - EPS);
  if (X.length > maxRaster || Y.length > maxRaster) return null;
  const blok = (w: number, d: number) => (w <= EPS || d <= EPS ? 0 : Math.max(rooster(w, d, p, q, 0), rooster(w, d, p, q, 1)));
  let best = -1;
  let beste: [number, number, number, number] | null = null;
  for (let i = 0; i < X.length; i++) {
    const x1 = X[i];
    for (let j = i + 1; j < X.length; j++) {
      const x2 = X[j];
      for (let k = 0; k < Y.length; k++) {
        const y1 = Y[k];
        const r1 = blok(x2, y1);
        const r4 = blok(x1, D - y1);
        for (let m = k + 1; m < Y.length; m++) {
          const y2 = Y[m];
          const n = r1 + r4 + blok(W - x2, y2) + blok(W - x1, D - y2) + blok(x2 - x1, y2 - y1);
          if (n > best) {
            best = n;
            beste = [x1, x2, y1, y2];
          }
        }
      }
    }
  }
  if (!beste) return null;
  const [x1, x2, y1, y2] = beste;
  const vul = (x0: number, y0: number, w: number, d: number) => {
    if (w <= EPS || d <= EPS) return [];
    const o: 0 | 1 = rooster(w, d, p, q, 0) >= rooster(w, d, p, q, 1) ? 0 : 1;
    return roosterDozen(x0, y0, w, d, p, q, o);
  };
  const dozen = [
    ...vul(0, 0, x2, y1),
    ...vul(x2, 0, W - x2, y2),
    ...vul(x1, y2, W - x1, D - y2),
    ...vul(0, y1, x1, D - y1),
    ...vul(x1, y1, x2 - x1, y2 - y1),
  ];
  return { dozen, aantal: dozen.length, bron: 'vijfblok-rooster' };
}

function sleutel(dozen: Rechthoek[]): string {
  return dozen
    .map((r) => `${r.x},${r.y},${r.w},${r.d}`)
    .sort()
    .join(';');
}

export interface PatroonOpties {
  /** Maximaal aantal patronen in de voorraad. */
  maxVoorraad?: number;
  /** Ondergrens voor alternatieven als fractie van het maximum. */
  minFractie?: number;
  /** Grootste raster (aantal snijposities per richting) voor het snelle vijfblokspatroon. */
  vijfblokRaster?: number;
}

export interface PatroonResultaat {
  /** Beste aantal per laag. */
  max: number;
  bovengrens: number;
  /** Patronen, aflopend op aantal; het eerste heeft het maximum. */
  voorraad: Patroon[];
  /** Het aantal per laag is bewezen maximaal (gelijk aan de bovengrens). */
  bewezen: boolean;
}

/**
 * Zoekt laagpatronen voor dozen p × q in een vlak W (x) × D (y).
 * Het eerste patroon in de voorraad heeft het hoogste gevonden aantal.
 */
export function zoekPatronen(W: number, D: number, p: number, q: number, opties: PatroonOpties = {}): PatroonResultaat {
  const maxVoorraad = opties.maxVoorraad ?? 24;
  const minFractie = opties.minFractie ?? 0.75;
  const leeg: PatroonResultaat = { max: 0, bovengrens: 0, voorraad: [], bewezen: true };
  const pastRecht = p <= W + EPS && q <= D + EPS;
  const pastGedraaid = q <= W + EPS && p <= D + EPS;
  if (!pastRecht && !pastGedraaid) return leeg;
  const ub = bovengrens(W, D, p, q);
  const gX = new Guillotine(W, D, p, q, false);
  const gY = new Guillotine(W, D, p, q, true);
  const Wn = gX.normX(W);
  const Dn = gX.normY(D);
  const kandidaten: Patroon[] = [];
  const voegToe = (pat: Patroon) => {
    if (pat.aantal > 0) kandidaten.push(pat);
  };
  const a = gX.dozen(Wn, Dn, 0, 0);
  voegToe({ dozen: a, aantal: a.length, bron: 'guillotine-x' });
  const b = gY.dozen(Wn, Dn, 0, 0);
  voegToe({ dozen: b, aantal: b.length, bron: 'guillotine-y' });
  if (a.length < ub) {
    const vb = vijfblok(gX, W, D, 28) ?? vijfblokRooster(W, D, p, q, gX.xLijst, gX.yLijst, opties.vijfblokRaster ?? 60);
    if (vb) voegToe(vb);
  }
  let max = 0;
  for (const k of kandidaten) max = Math.max(max, k.aantal);

  // Eenvoudige alternatieven: één rooster en twee roosterblokken naast elkaar.
  const drempel = Math.ceil(max * minFractie);
  for (const o of [0, 1] as const) {
    const r = roosterDozen(0, 0, W, D, p, q, o);
    if (r.length >= drempel) voegToe({ dozen: r, aantal: r.length, bron: `rooster-${o}` });
  }
  for (const r of gX.xLijst) {
    if (r <= EPS || r >= W - EPS) continue;
    for (const o1 of [0, 1] as const)
      for (const o2 of [0, 1] as const) {
        const n = rooster(r, D, p, q, o1) + rooster(W - r, D, p, q, o2);
        if (n >= drempel && n > 0) {
          const dozen = [...roosterDozen(0, 0, r, D, p, q, o1), ...roosterDozen(r, 0, W - r, D, p, q, o2)];
          voegToe({ dozen, aantal: dozen.length, bron: 'tweeblok-x' });
        }
      }
  }
  for (const s of gX.yLijst) {
    if (s <= EPS || s >= D - EPS) continue;
    for (const o1 of [0, 1] as const)
      for (const o2 of [0, 1] as const) {
        const n = rooster(W, s, p, q, o1) + rooster(W, D - s, p, q, o2);
        if (n >= drempel && n > 0) {
          const dozen = [...roosterDozen(0, 0, W, s, p, q, o1), ...roosterDozen(0, s, W, D - s, p, q, o2)];
          voegToe({ dozen, aantal: dozen.length, bron: 'tweeblok-y' });
        }
      }
  }

  // Ontdubbelen (stabiel) en sorteren op aantal.
  const gezien = new Set<string>();
  const uniek: Patroon[] = [];
  for (const k of kandidaten) {
    const s = sleutel(k.dozen);
    if (gezien.has(s)) continue;
    gezien.add(s);
    uniek.push(k);
  }
  const volgorde = new Map(uniek.map((u, i) => [u, i]));
  uniek.sort((u, v) => v.aantal - u.aantal || volgorde.get(u)! - volgorde.get(v)!);
  return { max, bovengrens: ub, voorraad: uniek.slice(0, maxVoorraad), bewezen: max >= ub };
}

/** Omhullende rechthoek van een patroon. */
export function omhullende(dozen: Rechthoek[]): { x: number; y: number; w: number; d: number } {
  if (dozen.length === 0) return { x: 0, y: 0, w: 0, d: 0 };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of dozen) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.d);
  }
  return { x: x0, y: y0, w: r6(x1 - x0), d: r6(y1 - y0) };
}

/** Normaliseert een patroon naar de oorsprong van zijn omhullende. */
export function naarOorsprong(dozen: Rechthoek[]): Rechthoek[] {
  const o = omhullende(dozen);
  return dozen.map((r) => ({ x: r6(r.x - o.x), y: r6(r.y - o.y), w: r.w, d: r.d }));
}

export type Transformatie = 'geen' | 'spiegelX' | 'spiegelY' | 'draai180';

/** Spiegelt of draait een patroon binnen zijn eigen omhullende. */
export function transformeer(dozen: Rechthoek[], t: Transformatie): Rechthoek[] {
  const o = omhullende(dozen);
  const W = o.w;
  const D = o.d;
  const rel = naarOorsprong(dozen);
  return rel.map((r) => {
    const x = t === 'spiegelX' || t === 'draai180' ? r6(W - r.x - r.w) : r.x;
    const y = t === 'spiegelY' || t === 'draai180' ? r6(D - r.y - r.d) : r.y;
    return { x, y, w: r.w, d: r.d };
  });
}
