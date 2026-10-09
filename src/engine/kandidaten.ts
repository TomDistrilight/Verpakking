// Buitendooskandidaten (ontwerp §4.1).

import type { As, Binnendoos, Buitendoos, Invoer, MaatGrens, Stand } from './types';
import { getal } from './format';
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
  const gezien = new Map<string, number>();
  const kandidaten: Buitendoos[] = [];
  const tMin = Math.min(t.L, t.B);
  const minPerDoos = invoer.minBinnendozenPerDoos ?? 1;
  const minPerLaag = invoer.minBuitendozenPerLaag ?? 1;
  const vorm = invoer.vormregel ?? 'uit';

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
            // Bovengrens dozen per laag: het oppervlak van het ladingvlak (met overhang) gedeeld door de voetafdruk.
            if (Math.floor((r1 * r2) / (L * B) + EPS) < minPerLaag) {
              tel(afgewezen, 'minPerLaag');
              break; // een grotere voetafdruk geeft alleen minder dozen per laag
            }
            const n = nx * ny * nz;
            const eigen = eigenGewichtDoos(L, B, H, invoer.doostype);
            const gevuld = n * bd.gewicht + eigen;
            if (gevuld > invoer.maxGevuldGewicht + EPS) {
              tel(afgewezen, 'gewichtDoos');
              break; // meer binnendozen in deze richting wordt alleen zwaarder
            }
            nyGeldig = true;
            if (n < minPerDoos) {
              tel(afgewezen, 'minBinnendozen');
              continue;
            }
            // Bij een custom toeslag met B > L kan de langste binnenmaat de kortste buitenmaat worden:
            // binnenmaat en indeling draaien dan mee, zodat ze bij de buitenmaat L ≥ B horen.
            const omgedraaid = L < B;
            const Lb = omgedraaid ? B : L;
            const Bb = omgedraaid ? L : B;
            if (!binnenGrens(Lb, Bb, H, invoer.minBuitenmaat, invoer.maxBuitenmaat)) {
              tel(afgewezen, 'buitenmaat');
              continue;
            }
            // Vormregel: breder en langer gaat voor hoger. Bij één laag binnendozen bepaalt de binnendoos de hoogte.
            if (vorm !== 'uit' && nz > 1 && H > (vorm === 'breedte' ? Bb : Lb) + EPS) {
              tel(afgewezen, 'vorm');
              continue;
            }
            const langsL = xIsL !== omgedraaid ? axX : axY;
            const langsB = xIsL !== omgedraaid ? axY : axX;
            const nL = xIsL !== omgedraaid ? nx : ny;
            const nB = xIsL !== omgedraaid ? ny : nx;
            const sleutel = `${Lb}|${Bb}|${H}|${st.verticaal}`;
            const bestaand = gezien.get(sleutel);
            if (bestaand !== undefined && kandidaten[bestaand].binnendozenPerDoos! >= n) continue;
            const kandidaat: Buitendoos = {
              L: Lb,
              B: Bb,
              H,
              binnenmaat: { L: omgedraaid ? binB : binL, B: omgedraaid ? binL : binB, H: binH },
              indeling: { nL, nB, nH: nz, stand: { verticaal: st.verticaal, langsL, langsB } },
              binnendozenPerDoos: n,
              eigenGewicht: eigen,
              kartonOppervlak: kartonOppervlak(L, B, H),
              gevuldGewicht: gevuld,
              gekanteld: st.verticaal !== 'H',
              bestaand: false,
              module: moduleVan(Lb, Bb),
            };
            if (bestaand !== undefined) kandidaten[bestaand] = kandidaat;
            else {
              gezien.set(sleutel, kandidaten.length);
              kandidaten.push(kandidaat);
            }
          }
          if (!nyGeldig && nx > 1) break; // ook met één rij al te zwaar of te groot
        }
      }
    }
  }
  return { kandidaten, afgewezen };
}

interface Inhoud {
  n: number;
  nL: number;
  nB: number;
  nH: number;
  stand: Stand;
}

/** Alle blokindelingen van binnendozen in een binnenmaat, één per stand en richting. */
export function inhoudOpties(bd: Binnendoos, binnen: { L: number; B: number; H: number }): Inhoud[] {
  const uit: Inhoud[] = [];
  for (const st of standen(bd)) {
    const nH = Math.floor(binnen.H / st.hoogte + EPS);
    for (const volgorde of [0, 1]) {
      const [axL, dL] = st.horizontaal[volgorde];
      const [axB, dB] = st.horizontaal[1 - volgorde];
      const nL = Math.floor(binnen.L / dL + EPS);
      const nB = Math.floor(binnen.B / dB + EPS);
      const n = nL * nB * nH;
      if (n > 0) uit.push({ n, nL, nB, nH, stand: { verticaal: st.verticaal, langsL: axL, langsB: axB } });
    }
  }
  return uit;
}

/** De indeling met de meeste binnendozen. */
export function inhoudBerekenen(bd: Binnendoos, binnen: { L: number; B: number; H: number }): Inhoud | null {
  return inhoudOpties(bd, binnen).reduce<Inhoud | null>((best, o) => (!best || o.n > best.n ? o : best), null);
}

function maatTekst(v: number) {
  return getal(v, 1);
}

/** Welke ingestelde buitenmaatgrenzen een doos overschrijdt, in gewone taal. */
export function buitenmaatOverschrijding(L: number, B: number, H: number, min?: MaatGrens, max?: MaatGrens): string[] {
  const uit: string[] = [];
  const as = [
    ['lengte', L, 'L'],
    ['breedte', B, 'B'],
    ['hoogte', H, 'H'],
  ] as const;
  for (const [naam, v, k] of as) {
    const mx = max?.[k];
    const mn = min?.[k];
    if (mx !== undefined && v > mx + EPS) uit.push(`${naam} ${maatTekst(v)} mm is meer dan het maximum van ${maatTekst(mx)} mm`);
    if (mn !== undefined && v < mn - EPS) uit.push(`${naam} ${maatTekst(v)} mm is minder dan het minimum van ${maatTekst(mn)} mm`);
  }
  return uit;
}

/**
 * Kandidaten voor de instap "bestaande buitendoos". Met binnenmaat en binnendoos maar zonder
 * opgegeven aantal: de beste rechtopstaande en de beste gekantelde inhoud, zodat de kantelregel
 * (§4.3 stap 3) kan kiezen. Met een opgegeven aantal: die ene doos; de indeling alleen als een
 * stand precies dat aantal geeft.
 */
export function bestaandeKandidaten(invoer: Invoer): { kandidaten: Buitendoos[]; redenen: string[] } {
  const bb = invoer.bestaandeBuitendoos!;
  const bd = invoer.binnendoos;
  const L = Math.max(bb.L, bb.B);
  const B = Math.min(bb.L, bb.B);
  const H = bb.H;
  const binnenmaat = bb.binnenmaat ? { L: Math.max(bb.binnenmaat.L, bb.binnenmaat.B), B: Math.min(bb.binnenmaat.L, bb.binnenmaat.B), H: bb.binnenmaat.H } : null;
  const redenen: string[] = [];

  let varianten: { n: number | null; indeling: Buitendoos['indeling'] }[] = [];
  if (binnenmaat && bd) {
    const opties = inhoudOpties(bd, binnenmaat);
    if (bb.binnendozenPerDoos !== undefined) {
      const passend = opties.filter((o) => o.n === bb.binnendozenPerDoos).sort((a, b) => Number(a.stand.verticaal !== 'H') - Number(b.stand.verticaal !== 'H'));
      const o = passend[0];
      varianten = [{ n: bb.binnendozenPerDoos, indeling: o ? { nL: o.nL, nB: o.nB, nH: o.nH, stand: o.stand } : null }];
    } else {
      const beste = (lijst: Inhoud[]) => lijst.reduce<Inhoud | null>((m, o) => (!m || o.n > m.n ? o : m), null);
      for (const o of [beste(opties.filter((x) => x.stand.verticaal === 'H')), beste(opties.filter((x) => x.stand.verticaal !== 'H'))])
        if (o) varianten.push({ n: o.n, indeling: { nL: o.nL, nB: o.nB, nH: o.nH, stand: o.stand } });
      if (varianten.length === 0) redenen.push('De binnendoos past niet in de opgegeven binnenmaat van de buitendoos.');
    }
  } else varianten = [{ n: bb.binnendozenPerDoos ?? null, indeling: null }];

  const grens = buitenmaatOverschrijding(L, B, H, invoer.minBuitenmaat, invoer.maxBuitenmaat);
  if (grens.length > 0) redenen.push(`De buitendoos valt buiten de ingestelde buitenmaat: ${grens.join('; ')}.`);

  const kandidaten: Buitendoos[] = [];
  for (const v of varianten) {
    let gevuld = bb.gevuldGewicht;
    if (gevuld === undefined) {
      if (bb.eigenGewicht !== undefined && v.n !== null && bd) gevuld = bb.eigenGewicht + v.n * bd.gewicht;
      else {
        redenen.push('Vul het gevulde gewicht van de buitendoos in, of het eigen gewicht en de inhoud.');
        continue;
      }
    }
    if (!Number.isFinite(gevuld)) {
      redenen.push('Het gewicht van de buitendoos is geen geldig getal.');
      continue;
    }
    if (gevuld > invoer.maxGevuldGewicht + EPS) {
      redenen.push(`De gevulde buitendoos weegt ${getal(gevuld, 1)} kg; het maximum is ${getal(invoer.maxGevuldGewicht, 1)} kg.`);
      continue;
    }
    if (grens.length > 0) continue;
    kandidaten.push({
      L,
      B,
      H,
      binnenmaat,
      indeling: v.indeling,
      binnendozenPerDoos: v.n,
      eigenGewicht: bb.eigenGewicht ?? null,
      kartonOppervlak: null,
      gevuldGewicht: gevuld,
      gekanteld: v.indeling ? v.indeling.stand.verticaal !== 'H' : false,
      bestaand: true,
      module: moduleVan(L, B),
    });
  }
  return { kandidaten, redenen: [...new Set(redenen)] };
}
