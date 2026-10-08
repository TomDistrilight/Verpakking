// Buitendooskandidaten (ontwerp §4.1).

import type { As, Binnendoos, Buitendoos, Invoer, MaatGrens, Stand } from './types';
import { eigenGewichtDoos, kartonOppervlak, toeslag } from './karton';
import { moduleVan } from './module';
import { effectieveOverhang } from './plaatsing';
import { vasteHoogte } from './stapelen';

const EPS = 1e-6;
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

export interface StandVanBinnendoos {
  verticaal: As;
  hoogte: number;
  /** De twee horizontale assen met hun maat. */
  horizontaal: [As, number][];
}

/** Toegestane standen: H altijd verticaal; L of B alleen als de doos kantelbaar is en die as is aangevinkt. */
export function standen(bd: Binnendoos): StandVanBinnendoos[] {
  const maat: Record<As, number> = { L: bd.L, B: bd.B, H: bd.H };
  const vert: As[] = ['H'];
  if (bd.kantelbaar && bd.magVerticaal.L) vert.push('L');
  if (bd.kantelbaar && bd.magVerticaal.B) vert.push('B');
  return vert.map((v) => {
    const hor = (['L', 'B', 'H'] as As[]).filter((a) => a !== v);
    return { verticaal: v, hoogte: maat[v], horizontaal: hor.map((a) => [a, maat[a]] as [As, number]) };
  });
}

/** Grootste voetafdruk (r1 ≥ r2) die op de drager past, inclusief toegestane overhang. */
export function maxVoetafdruk(invoer: Invoer): { r1: number; r2: number } {
  const d = invoer.drager;
  const o = effectieveOverhang(d);
  const W = d.asymmetrieToegestaan ? d.breedte + o.links + o.rechts : d.breedte + 2 * Math.min(o.links, o.rechts);
  const D = d.asymmetrieToegestaan ? d.lengte + o.voor + o.achter : d.lengte + 2 * Math.min(o.voor, o.achter);
  return { r1: Math.max(W, D), r2: Math.min(W, D) };
}

export function maxDoosHoogte(invoer: Invoer): number {
  return invoer.drager.maxTotaleHoogte - vasteHoogte(invoer);
}

function binnenGrens(L: number, B: number, H: number, min?: MaatGrens, max?: MaatGrens): boolean {
  if (min) {
    if (min.L !== undefined && L < min.L - EPS) return false;
    if (min.B !== undefined && B < min.B - EPS) return false;
    if (min.H !== undefined && H < min.H - EPS) return false;
  }
  if (max) {
    if (max.L !== undefined && L > max.L + EPS) return false;
    if (max.B !== undefined && B > max.B + EPS) return false;
    if (max.H !== undefined && H > max.H + EPS) return false;
  }
  return true;
}

export interface KandidaatUitkomst {
  kandidaten: Buitendoos[];
  afgewezen: Record<string, number>;
}

function tel(a: Record<string, number>, k: string, n = 1) {
  a[k] = (a[k] ?? 0) + n;
}

/** Ontwerpt buitendozen uit gehele blokken binnendozen. */
export function ontwerpKandidaten(invoer: Invoer): KandidaatUitkomst {
  const bd = invoer.binnendoos!;
  const t = toeslag(invoer.doostype);
  const { r1, r2 } = maxVoetafdruk(invoer);
  const maxH = maxDoosHoogte(invoer);
  const afgewezen: Record<string, number> = {};
  const gezien = new Set<string>();
  const kandidaten: Buitendoos[] = [];
  const tMin = Math.min(t.L, t.B);

  for (const st of standen(bd)) {
    const h = st.hoogte;
    for (let nz = 1; nz * h + t.H <= maxH + EPS; nz++) {
      for (const volgorde of [0, 1]) {
        const [axX, dx] = st.horizontaal[volgorde];
        const [axY, dy] = st.horizontaal[1 - volgorde];
        for (let nx = 1; nx * dx + tMin <= r1 + EPS; nx++) {
          let nyGeldig = false;
          for (let ny = 1; ny * dy + tMin <= r1 + EPS; ny++) {
            const inX = r6(nx * dx);
            const inY = r6(ny * dy);
            const xIsL = inX >= inY;
            const binL = xIsL ? inX : inY;
            const binB = xIsL ? inY : inX;
            const binH = r6(nz * h);
            const L = r6(binL + t.L);
            const B = r6(binB + t.B);
            const H = r6(binH + t.H);
            if (!(Math.max(L, B) <= r1 + EPS && Math.min(L, B) <= r2 + EPS)) {
              tel(afgewezen, 'voetafdruk');
              break; // een grotere ny maakt de voetafdruk alleen groter
            }
            const n = nx * ny * nz;
            const eigen = eigenGewichtDoos(L, B, H, invoer.doostype);
            const gevuld = n * bd.gewicht + eigen;
            if (gevuld > invoer.maxGevuldGewicht + EPS) {
              tel(afgewezen, 'gewichtDoos');
              break; // meer binnendozen in deze richting wordt alleen zwaarder
            }
            nyGeldig = true;
            const Lb = Math.max(L, B);
            const Bb = Math.min(L, B);
            if (!binnenGrens(Lb, Bb, H, invoer.minBuitenmaat, invoer.maxBuitenmaat)) {
              tel(afgewezen, 'buitenmaat');
              continue;
            }
            const sleutel = `${Lb}|${Bb}|${H}|${st.verticaal}`;
            if (gezien.has(sleutel)) continue;
            gezien.add(sleutel);
            const stand: Stand = { verticaal: st.verticaal, langsL: xIsL ? axX : axY, langsB: xIsL ? axY : axX };
            kandidaten.push({
              L: Lb,
              B: Bb,
              H,
              binnenmaat: { L: binL, B: binB, H: binH },
              indeling: { nL: xIsL ? nx : ny, nB: xIsL ? ny : nx, nH: nz, stand },
              binnendozenPerDoos: n,
              eigenGewicht: eigen,
              kartonOppervlak: kartonOppervlak(L, B, H),
              gevuldGewicht: gevuld,
              gekanteld: st.verticaal !== 'H',
              bestaand: false,
              module: moduleVan(Lb, Bb),
            });
          }
          if (!nyGeldig && nx > 1) break; // ook met één rij al te zwaar of te groot
        }
      }
    }
  }
  return { kandidaten, afgewezen };
}

/** Hoeveel binnendozen passen in een binnenmaat, als één blok in één stand. */
export function inhoudBerekenen(bd: Binnendoos, binnen: { L: number; B: number; H: number }) {
  let best: { n: number; nL: number; nB: number; nH: number; stand: Stand } | null = null;
  for (const st of standen(bd)) {
    const nH = Math.floor(binnen.H / st.hoogte + EPS);
    for (const volgorde of [0, 1]) {
      const [axL, dL] = st.horizontaal[volgorde];
      const [axB, dB] = st.horizontaal[1 - volgorde];
      const nL = Math.floor(binnen.L / dL + EPS);
      const nB = Math.floor(binnen.B / dB + EPS);
      const n = nL * nB * nH;
      if (n > 0 && (!best || n > best.n)) best = { n, nL, nB, nH, stand: { verticaal: st.verticaal, langsL: axL, langsB: axB } };
    }
  }
  return best;
}

/** Eén kandidaat voor de instap "bestaande buitendoos". */
export function bestaandeKandidaat(invoer: Invoer): { kandidaat?: Buitendoos; reden?: string } {
  const bb = invoer.bestaandeBuitendoos!;
  const L = Math.max(bb.L, bb.B);
  const B = Math.min(bb.L, bb.B);
  const H = bb.H;
  let binnendozen: number | null = bb.binnendozenPerDoos ?? null;
  let indeling: Buitendoos['indeling'] = null;
  if (bb.binnenmaat && invoer.binnendoos) {
    const bi = { L: Math.max(bb.binnenmaat.L, bb.binnenmaat.B), B: Math.min(bb.binnenmaat.L, bb.binnenmaat.B), H: bb.binnenmaat.H };
    const inh = inhoudBerekenen(invoer.binnendoos, bi);
    if (inh) {
      indeling = { nL: inh.nL, nB: inh.nB, nH: inh.nH, stand: inh.stand };
      if (binnendozen === null) binnendozen = inh.n;
    } else if (binnendozen === null) {
      return { reden: 'De binnendoos past niet in de opgegeven binnenmaat van de buitendoos.' };
    }
  }
  let gevuld = bb.gevuldGewicht;
  if (gevuld === undefined) {
    if (bb.eigenGewicht !== undefined && binnendozen !== null && invoer.binnendoos) gevuld = bb.eigenGewicht + binnendozen * invoer.binnendoos.gewicht;
    else return { reden: 'Vul het gevulde gewicht van de buitendoos in, of het eigen gewicht en de inhoud.' };
  }
  if (gevuld > invoer.maxGevuldGewicht + EPS)
    return { reden: `De gevulde buitendoos weegt ${gevuld.toFixed(1)} kg; het maximum is ${invoer.maxGevuldGewicht} kg.` };
  if (!binnenGrens(L, B, H, invoer.minBuitenmaat, invoer.maxBuitenmaat)) return { reden: 'De buitendoos valt buiten de ingestelde min./max. buitenmaat.' };
  return {
    kandidaat: {
      L,
      B,
      H,
      binnenmaat: bb.binnenmaat ? { L: Math.max(bb.binnenmaat.L, bb.binnenmaat.B), B: Math.min(bb.binnenmaat.L, bb.binnenmaat.B), H: bb.binnenmaat.H } : null,
      indeling,
      binnendozenPerDoos: binnendozen,
      eigenGewicht: bb.eigenGewicht ?? null,
      kartonOppervlak: null,
      gevuldGewicht: gevuld,
      gekanteld: indeling ? indeling.stand.verticaal !== 'H' : false,
      bestaand: true,
      module: moduleVan(L, B),
    },
  };
}
