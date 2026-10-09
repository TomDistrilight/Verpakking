// Tekeningen voor scherm en PDF (ontwerp §5, #37): binnendoos, open buitendoos met inhoud,
// complete lading en bovenaanzicht per laag. Alles uit dezelfde coördinaten als de rekenmodule.

import type { As, Binnendoos, Buitendoos, Drager, Invoer, Laag, Oplossing } from '../engine/types';
import { getal } from '../engine/format';
import { blokSvg, esc, grenzenVan, hoeken, maatlijn, mengKleur, proj, sorteer, svgOmhulsel, type Blok } from './iso';

export const KLEUREN = {
  binnendoos: '#F2B33D',
  buitendoos: '#5DA9DD',
  laagA: '#2F6DB5',
  laagB: '#6FA8DC',
  pallet: '#C9A26B',
  palletDonker: '#9C7A4A',
  tussenlaag: '#EBD9A8',
  vel: '#D9D2C3',
  lijn: '#1d2a3a',
};

function opmaak(breedte: number, letterDeler = 16) {
  return { lijn: breedte / 300, letter: breedte / letterDeler };
}

export type Taal = 'nl' | 'en';

const maatTekst = (v: number, taal: Taal) => getal(v, 1, taal);

/** Maatvoering langs de drie zichtbare ribben van een kader (x0..x1, y0..y1, z0..z1). */
function maatvoering(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  waarden: { x: number; y: number; z: number },
  op: { lijn: number; letter: number },
  taal: Taal,
): string {
  const a = op.letter * 1.4;
  return [
    maatlijn([x0, y0, z0], [x1, y0, z0], [-0.5 * a, 0.866 * a], maatTekst(waarden.x, taal), op),
    maatlijn([x1, y0, z0], [x1, y1, z0], [0.5 * a, 0.866 * a], maatTekst(waarden.y, taal), op),
    maatlijn([x0, y0, z0], [x0, y0, z1], [-a, 0], maatTekst(waarden.z, taal), op),
  ].join('');
}

function quad(pt: [number, number, number][], vulling: string, lijn: string, dikte: number): string {
  const s = pt
    .map((p) => proj(...p))
    .map(([a, b]) => `${Math.round(a * 100) / 100},${Math.round(b * 100) / 100}`)
    .join(' ');
  return `<polygon points="${s}" fill="${vulling}" stroke="${lijn}" stroke-width="${Math.round(dikte * 100) / 100}" stroke-linejoin="round"/>`;
}

/** Binnendoos rechtop, met maten. */
export function binnendoosSvg(bd: { L: number; B: number; H: number }, taal: Taal = 'nl'): string {
  const b: Blok = { x: 0, y: 0, z: 0, w: bd.L, d: bd.B, h: bd.H, kleur: KLEUREN.binnendoos };
  const g0 = grenzenVan(hoeken(b));
  const op = opmaak(g0.maxX - g0.minX);
  const inhoud = blokSvg(b, op.lijn) + maatvoering(0, bd.L, 0, bd.B, 0, bd.H, { x: bd.L, y: bd.B, z: bd.H }, op, taal);
  const marge = op.letter * 3.2;
  return svgOmhulsel(inhoud, g0, marge, 'Binnendoos');
}

function maatVanAs(bd: Binnendoos | { L: number; B: number; H: number }, as: As): number {
  return as === 'L' ? bd.L : as === 'B' ? bd.B : bd.H;
}

/** Open buitendoos met de binnendozen er half uit, zoals het voorbeeld (#37). */
export function buitendoosSvg(doos: Buitendoos, bd?: { L: number; B: number; H: number }, taal: Taal = 'nl'): string {
  const { L, B, H } = doos;
  const g0 = grenzenVan([proj(0, 0, 0), proj(L, 0, 0), proj(L, B, 0), proj(0, B, H * 1.9), proj(L, 0, H * 1.9)]);
  const op = opmaak(g0.maxX - g0.minX, 11);
  const lijn = KLEUREN.lijn;
  const kleur = KLEUREN.buitendoos;
  const donker = mengKleur(kleur, 0.62);
  const delen: string[] = [];
  const ind0 = doos.indeling;
  // Alleen tekenen als de indeling bij het aantal binnendozen hoort (§5).
  const heeftInhoud = ind0 && bd && ind0.nL * ind0.nB * ind0.nH === doos.binnendozenPerDoos;
  if (!heeftInhoud) {
    delen.push(blokSvg({ x: 0, y: 0, z: 0, w: L, d: B, h: H, kleur }, op.lijn));
  } else {
    const f = (B / 2) * 0.7;
    // Achterste en linker flap, binnenwanden.
    delen.push(quad([[0, B, H], [L, B, H], [L, B + f, H + f], [0, B + f, H + f]], mengKleur(kleur, 0.85), lijn, op.lijn));
    delen.push(quad([[0, 0, H], [0, B, H], [-f, B, H + f], [-f, 0, H + f]], mengKleur(kleur, 0.75), lijn, op.lijn));
    delen.push(quad([[0, B, 0], [L, B, 0], [L, B, H], [0, B, H]], donker, lijn, op.lijn));
    delen.push(quad([[0, 0, 0], [0, B, 0], [0, B, H], [0, 0, H]], mengKleur(kleur, 0.7), lijn, op.lijn));
    // Binnendozen, half uit de doos getild.
    const ind = doos.indeling!;
    const a = maatVanAs(bd, ind.stand.langsL);
    const b = maatVanAs(bd, ind.stand.langsB);
    const c = maatVanAs(bd, ind.stand.verticaal);
    const x0 = (L - ind.nL * a) / 2;
    const y0 = (B - ind.nB * b) / 2;
    const til = H * 0.55;
    const blokken: Blok[] = [];
    for (let k = 0; k < ind.nH; k++)
      for (let j = 0; j < ind.nB; j++)
        for (let i = 0; i < ind.nL; i++)
          blokken.push({ x: x0 + i * a, y: y0 + j * b, z: til + (doos.binnenmaat ? (doos.H - doos.binnenmaat.H) / 2 : 0) + k * c, w: a, d: b, h: c, kleur: KLEUREN.binnendoos });
    for (const bl of sorteer(blokken)) delen.push(blokSvg(bl, op.lijn * 0.8));
    // Voor- en rechterwand en flappen over de binnendozen heen.
    delen.push(quad([[0, 0, 0], [L, 0, 0], [L, 0, H], [0, 0, H]], kleur, lijn, op.lijn));
    delen.push(quad([[L, 0, 0], [L, B, 0], [L, B, H], [L, 0, H]], mengKleur(kleur, 0.78), lijn, op.lijn));
    delen.push(quad([[0, 0, H], [L, 0, H], [L, -f, H + f * 0.5], [0, -f, H + f * 0.5]], mengKleur(kleur, 1.15), lijn, op.lijn));
    delen.push(quad([[L, 0, H], [L, B, H], [L + f, B, H + f * 0.5], [L + f, 0, H + f * 0.5]], mengKleur(kleur, 0.95), lijn, op.lijn));
  }
  delen.push(maatvoering(0, L, 0, B, 0, H, { x: L, y: B, z: H }, op, taal));
  const punten: [number, number][] = [proj(0, 0, 0), proj(L, 0, 0), proj(L, B, 0), proj(0, B, 0)];
  if (heeftInhoud) {
    const f = (B / 2) * 0.7;
    const top = H * 0.55 + doos.indeling!.nH * maatVanAs(bd!, doos.indeling!.stand.verticaal) + H * 0.05;
    punten.push(proj(-f, 0, H + f), proj(0, B + f, H + f), proj(L + f, B, H + f), proj(0, B, top), proj(L, 0, top), proj(L, -f, H + f));
  } else punten.push(proj(0, B, H), proj(L, 0, H));
  return svgOmhulsel(delen.join(''), grenzenVan(punten), op.letter * 3.2, 'Buitendoos');
}

function palletBlokken(d: Drager): Blok[] {
  const z0 = 0;
  const top = d.hoogte;
  if (d.type === 'kar') {
    const vloer = Math.min(40, top);
    const wiel = Math.max(0, top - vloer);
    const uit: Blok[] = [{ x: 0, y: 0, z: wiel, w: d.breedte, d: d.lengte, h: vloer, kleur: '#9AA5B1' }];
    if (wiel > 0)
      for (const [x, y] of [
        [40, 40],
        [d.breedte - 100, 40],
        [40, d.lengte - 100],
        [d.breedte - 100, d.lengte - 100],
      ])
        uit.push({ x, y, z: 0, w: 60, d: 60, h: wiel, kleur: '#4B5563' });
    return uit;
  }
  const dek = Math.min(22, top / 4);
  const voet = Math.min(22, top / 4);
  const blok = Math.max(0, top - dek * 2 - voet);
  const uit: Blok[] = [];
  const bw = Math.min(145, d.breedte / 5);
  const bd = Math.min(145, d.lengte / 6);
  const xs = [0, (d.breedte - bw) / 2, d.breedte - bw];
  const ys = [0, (d.lengte - bd) / 2, d.lengte - bd];
  for (const x of xs) uit.push({ x, y: 0, z: z0, w: bw, d: d.lengte, h: voet, kleur: KLEUREN.palletDonker });
  for (const x of xs) for (const y of ys) uit.push({ x, y, z: voet, w: bw, d: bd, h: blok, kleur: KLEUREN.palletDonker });
  for (const y of ys) uit.push({ x: 0, y, z: voet + blok, w: d.breedte, d: bd, h: dek, kleur: KLEUREN.pallet });
  uit.push({ x: 0, y: 0, z: top - dek, w: d.breedte, d: d.lengte, h: dek, kleur: KLEUREN.pallet });
  return uit;
}

/** Hoogte (z) van de onderkant van elke laag. */
export function laagHoogtes(o: Oplossing, invoer: Invoer): number[] {
  const t = invoer.tussenlaag;
  const m = invoer.materiaal;
  let z = invoer.drager.hoogte + (m.bodemvel.aan ? m.bodemvel.dikte : 0);
  const uit: number[] = [];
  for (let i = 1; i <= o.aantalLagen; i++) {
    uit.push(z);
    z += o.doos.H;
    if (o.tussenlaagNa.includes(i) && t.soort !== 'geen') z += t.dikte;
  }
  return uit;
}

function omhullendeVan(laag: Laag) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of laag.dozen) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.d);
  }
  return { x0, y0, x1, y1 };
}

/** Complete lading op de drager, kleuren per laag, met maatvoering van de omhullende. */
export function ladingSvg(o: Oplossing, invoer: Invoer, taal: Taal = 'nl'): string {
  const d = invoer.drager;
  const m = invoer.materiaal;
  const t = invoer.tussenlaag;
  // Tekenen van onder naar boven in banden (drager, bodemvel, laag, tussenlaag, …): een hogere band
  // ligt altijd dichter bij de kijker. Binnen een band bepaalt de topologische sortering de volgorde.
  const banden: Blok[][] = [palletBlokken(d)];
  const zs = laagHoogtes(o, invoer);
  if (m.bodemvel.aan) banden.push([{ x: 0, y: 0, z: d.hoogte, w: d.breedte, d: d.lengte, h: m.bodemvel.dikte, kleur: KLEUREN.vel }]);
  for (let i = 0; i < o.aantalLagen; i++) {
    const laag = o.lagen[o.laagVolgorde[i]];
    const kleur = i % 2 === 0 ? KLEUREN.laagA : KLEUREN.laagB;
    banden.push(laag.dozen.map((r) => ({ x: r.x, y: r.y, z: zs[i], w: r.w, d: r.d, h: o.doos.H, kleur })));
    if (o.tussenlaagNa.includes(i + 1) && t.soort !== 'geen') {
      const z = zs[i] + o.doos.H;
      if (t.maat === 'lading') {
        const g = omhullendeVan(laag);
        banden.push([{ x: g.x0, y: g.y0, z, w: g.x1 - g.x0, d: g.y1 - g.y0, h: Math.max(t.dikte, 1), kleur: KLEUREN.tussenlaag }]);
      } else banden.push([{ x: 0, y: 0, z, w: d.breedte, d: d.lengte, h: Math.max(t.dikte, 1), kleur: KLEUREN.tussenlaag }]);
    }
  }
  if (m.topvel.aan && o.aantalLagen > 0) {
    const g = omhullendeVan(o.lagen[o.laagVolgorde[o.aantalLagen - 1]]);
    banden.push([{ x: g.x0, y: g.y0, z: zs[o.aantalLagen - 1] + o.doos.H, w: g.x1 - g.x0, d: g.y1 - g.y0, h: m.topvel.dikte, kleur: KLEUREN.vel }]);
  }
  const blokken = banden.flat();
  // Omhullende van drager en lading (zoals in het PDF vermeld).
  let x0 = 0;
  let y0 = 0;
  let x1 = d.breedte;
  let y1 = d.lengte;
  for (const l of o.lagen) {
    const g = omhullendeVan(l);
    x0 = Math.min(x0, g.x0);
    y0 = Math.min(y0, g.y0);
    x1 = Math.max(x1, g.x1);
    y1 = Math.max(y1, g.y1);
  }
  const alleHoeken = blokken.flatMap(hoeken);
  const g0 = grenzenVan(alleHoeken);
  const op = opmaak(g0.maxX - g0.minX, 11);
  const lijnDikte = Math.min(op.lijn, Math.max(o.doos.L, o.doos.B) / 60);
  const delen = banden.flatMap((band) => sorteer(band)).map((b) => blokSvg(b, lijnDikte));
  delen.push(maatvoering(x0, x1, y0, y1, 0, o.totaleHoogte, { x: x1 - x0, y: y1 - y0, z: o.totaleHoogte }, op, taal));
  return svgOmhulsel(delen.join(''), g0, op.letter * 3.4, 'Lading');
}

/** Bovenaanzicht van één laag; voorzijde onderaan. */
export function bovenaanzichtSvg(laag: Laag, d: Drager, opties: { voorTekst: string; titel: string }): string {
  let x0 = 0;
  let y0 = 0;
  let x1 = d.breedte;
  let y1 = d.lengte;
  for (const r of laag.dozen) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.d);
  }
  const breed = x1 - x0;
  const lijn = Math.max(breed, y1 - y0) / 220;
  const letter = Math.max(breed, y1 - y0) / 16;
  const Y = (y: number) => y1 - y; // voor (y = 0) onderaan
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const delen: string[] = [];
  delen.push(
    `<rect x="${r2(0)}" y="${r2(Y(d.lengte))}" width="${r2(d.breedte)}" height="${r2(d.lengte)}" fill="${KLEUREN.pallet}" stroke="${KLEUREN.palletDonker}" stroke-width="${r2(lijn)}"/>`,
  );
  laag.dozen.forEach((r, i) => {
    const liggend = r.w >= r.d;
    const vul = liggend ? KLEUREN.laagB : KLEUREN.laagA;
    delen.push(
      `<rect x="${r2(r.x)}" y="${r2(Y(r.y + r.d))}" width="${r2(r.w)}" height="${r2(r.d)}" fill="${vul}" fill-opacity="0.9" stroke="${KLEUREN.lijn}" stroke-width="${r2(lijn)}"/>`,
    );
    const fs = Math.min(letter * 0.8, Math.min(r.w, r.d) * 0.45);
    if (fs > letter * 0.25)
      delen.push(
        `<text x="${r2(r.x + r.w / 2)}" y="${r2(Y(r.y + r.d / 2) + fs * 0.35)}" font-family="Helvetica, Arial, sans-serif" font-size="${r2(fs)}" fill="#ffffff" text-anchor="middle">${i + 1}</text>`,
      );
  });
  const pijlY = Y(y0) + letter * 1.0;
  const midden = d.breedte / 2;
  delen.push(
    `<path d="M ${r2(midden)} ${r2(pijlY - letter * 0.15)} l ${r2(-letter * 0.4)} ${r2(letter * 0.55)} l ${r2(letter * 0.8)} 0 z" fill="#334155"/>`,
    `<text x="${r2(midden)}" y="${r2(pijlY + letter * 1.35)}" font-family="Helvetica, Arial, sans-serif" font-size="${r2(letter)}" fill="#334155" text-anchor="middle">${esc(opties.voorTekst)}</text>`,
  );
  const g = { minX: x0, minY: Y(y1), maxX: x1, maxY: pijlY + letter * 1.6 };
  return svgOmhulsel(delen.join(''), g, letter * 0.6, opties.titel);
}
