// Uitlijnen van de lading (ronde 4, punt 2 en de aanvullingen daarop): bij verband een mooi blok. Het blok is de omhullende
// van alle lagen samen, zoals plaats() ze neerzet. Per laag gaan de dozen links van het midden van het blok naar de linkerkant
// van het blok en de dozen rechts van het midden naar de rechterkant; een doos op het midden blijft gecentreerd. Daarna
// hetzelfde van voor naar achter. Zo sluit elke laag aan op de buitenkant van het blok en komen tussenruimtes binnenin in
// plaats van aan de zijkant. Dat mag alleen zolang de dozen erboven genoeg steun houden, het verband blijft en het
// zwaartepunt in het midden blijft. Geen doos komt buiten het blok, dus overhang en buitenmaat worden nooit groter.

import { describe, expect, it } from 'vitest';
import { bereken } from '../src/engine/bereken';
import { omhullende, zoekPatronen } from '../src/engine/laagpatroon';
import { binnenGrenzen, overhangVan, plaats, zoekvlakken } from '../src/engine/plaatsing';
import { spreidLading } from '../src/engine/spreiden';
import { kopieDrager, EUROPALLET, standaardInvoer } from '../src/engine/standaard';
import type { Invoer, Oplossing, Overhang, Rechthoek, Stapelwijze } from '../src/engine/types';
import { inVerband, steunendeDozen, torens } from '../src/engine/verband';

// bereken() lijnt de getoonde verbandoplossingen zelf al uit; een rechte stapeling blijft gecentreerd. Deze tests
// beginnen bij de oplossing van vóór het uitlijnen en toetsen spreidLading zelf, ook op rechte lagen.
const ZONDER_UITLIJNEN = { uitlijnen: false } as const;

const EPS = 1e-6;
const ZIJDEN: (keyof Overhang)[] = ['voor', 'achter', 'links', 'rechts'];

function binnendoos(L: number, B: number, H: number, gewicht: number): Invoer {
  const i = standaardInvoer();
  i.artikelcode = 'S';
  i.binnendoos = { L, B, H, gewicht, kantelbaar: false, magVerticaal: { L: false, B: false } };
  return i;
}

function bestaand(L: number, B: number, H: number, gevuld: number, qty: number): Invoer {
  const i = standaardInvoer();
  i.instap = 'bestaandeBuitendoos';
  i.artikelcode = 'S';
  i.binnendoos = undefined;
  i.bestaandeBuitendoos = { L, B, H, gevuldGewicht: gevuld, binnendozenPerDoos: qty };
  return i;
}

let basis: { o: Oplossing; invoer: Invoer } | null = null;

/** Een oplossing met zelfgekozen lagen, op een europallet zonder overhang. */
function handOplossing(lagen: Rechthoek[][], laagVolgorde: number[], stapelwijze: Stapelwijze): { o: Oplossing; invoer: Invoer } {
  if (!basis) {
    const invoer = binnendoos(300, 200, 150, 2);
    basis = { o: bereken(invoer, ZONDER_UITLIJNEN).top[0].oplossing, invoer };
  }
  const o: Oplossing = {
    ...structuredClone(basis.o),
    stapelwijze,
    lagen: lagen.map((dozen) => ({ dozen })),
    laagVolgorde,
    aantalLagen: laagVolgorde.length,
  };
  return { o, invoer: basis.invoer };
}

function overlapt(a: Rechthoek, b: Rechthoek): boolean {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > EPS && Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y) > EPS;
}

/** Het blok: de omhullende van alle dozen van vóór het uitlijnen. */
function blok(o: Oplossing) {
  const om = omhullende(o.lagen.flatMap((l) => l.dozen));
  return { x0: om.x, x1: om.x + om.w, y0: om.y, y1: om.y + om.d };
}

/** Steunfractie en of het midden binnen de omhullende van de steunvlakken ligt, per doos van `boven`. */
function steun(boven: Rechthoek[], onder: Rechthoek[]) {
  return boven.map((u) => {
    let opp = 0;
    const vlakken: Rechthoek[] = [];
    for (const l of onder) {
      const x0 = Math.max(u.x, l.x);
      const y0 = Math.max(u.y, l.y);
      const w = Math.min(u.x + u.w, l.x + l.w) - x0;
      const d = Math.min(u.y + u.d, l.y + l.d) - y0;
      if (w > EPS && d > EPS) {
        opp += w * d;
        vlakken.push({ x: x0, y: y0, w, d });
      }
    }
    const om = omhullende(vlakken);
    const cx = u.x + u.w / 2;
    const cy = u.y + u.d / 2;
    const midden = vlakken.length > 0 && cx >= om.x - EPS && cx <= om.x + om.w + EPS && cy >= om.y - EPS && cy <= om.y + om.d + EPS;
    return { fractie: opp / (u.w * u.d), midden };
  });
}

/** Zwaartepunt in x van een laag met dozen van gelijk gewicht. */
function zwaartepuntX(dozen: Rechthoek[]): number {
  return dozen.reduce((s, r) => s + r.x + r.w / 2, 0) / dozen.length;
}

/** Alle regels waaraan een gespreide oplossing moet voldoen. */
function controleer(o: Oplossing, s: Oplossing, invoer: Invoer, minSteun = 0.75) {
  const drager = invoer.drager;
  // Geen doos komt buiten het blok (de omhullende van alle dozen van vóór het uitlijnen), dus ook niet verder over de rand.
  const g = blok(o);
  // Zelfde dozen, zelfde volgorde; alleen de posities verschuiven.
  expect(s.lagen).toHaveLength(o.lagen.length);
  s.lagen.forEach((l, i) => {
    expect(l.dozen.map((r) => [r.w, r.d])).toEqual(o.lagen[i].dozen.map((r) => [r.w, r.d]));
    // Gesloten zijkanten: geen kant van een laag schuift naar binnen. Een laag wordt dus in de breedte en de lengte nooit
    // kleiner en krijgt geen gat aan de zijkant van het blok erbij; tussenruimtes komen binnenin.
    if (l.dozen.length > 0) {
      const voor = omhullende(o.lagen[i].dozen);
      const na = omhullende(l.dozen);
      expect(na.x).toBeLessThanOrEqual(voor.x + EPS);
      expect(na.x + na.w).toBeGreaterThanOrEqual(voor.x + voor.w - EPS);
      expect(na.y).toBeLessThanOrEqual(voor.y + EPS);
      expect(na.y + na.d).toBeGreaterThanOrEqual(voor.y + voor.d - EPS);
    }
    // Elke doos binnen het blok en geen overlap; de afwijkingen worden verzameld, zodat de controle bij veel dozen snel blijft.
    expect(l.dozen.filter((r) => r.x < g.x0 - EPS || r.x + r.w > g.x1 + EPS || r.y < g.y0 - EPS || r.y + r.d > g.y1 + EPS)).toEqual([]);
    const botsingen: [number, number][] = [];
    for (let a = 0; a < l.dozen.length; a++) for (let b = a + 1; b < l.dozen.length; b++) if (overlapt(l.dozen[a], l.dozen[b])) botsingen.push([a, b]);
    expect(botsingen).toEqual([]);
    if (binnenGrenzen(o.lagen[i].dozen, drager)) expect(binnenGrenzen(l.dozen, drager)).toBe(true);
  });
  // Daardoor vult de lading na het uitlijnen nog steeds precies het blok.
  const n = blok(s);
  for (const k of ['x0', 'x1', 'y0', 'y1'] as const) expect(n[k]).toBeCloseTo(g[k], 6);
  // De overhang groeit nergens en klopt met de nieuwe lagen.
  for (const z of ZIJDEN) {
    expect(s.overhang[z]).toBeLessThanOrEqual(o.overhang[z] + EPS);
    expect(s.overhang[z]).toBeCloseTo(Math.max(...s.lagen.map((l) => overhangVan(l.dozen, drager)[z])), 6);
  }
  expect(s.omhullende.breedte).toBeLessThanOrEqual(o.omhullende.breedte + EPS);
  expect(s.omhullende.lengte).toBeLessThanOrEqual(o.omhullende.lengte + EPS);
  // Aantallen, hoogte en gewicht blijven gelijk.
  for (const k of ['id', 'stapelwijze', 'aantalLagen', 'buitendozenPerDrager', 'binnendozenPerDrager', 'totaleHoogte', 'totaalGewicht'] as const)
    expect(s[k]).toBe(o[k]);
  expect(s.laagVolgorde).toEqual(o.laagVolgorde);
  // Steun en verband per laagpaar.
  for (let k = 1; k < o.laagVolgorde.length; k++) {
    const [onder, boven] = [o.laagVolgorde[k - 1], o.laagVolgorde[k]];
    const oud = steun(o.lagen[boven].dozen, o.lagen[onder].dozen);
    const nieuw = steun(s.lagen[boven].dozen, s.lagen[onder].dozen);
    nieuw.forEach((n, i) => {
      expect(n.fractie).toBeGreaterThanOrEqual(Math.min(minSteun, oud[i].fractie) - 1e-9);
      if (oud[i].midden) expect(n.midden).toBe(true);
    });
    if (o.stapelwijze === 'verband' && inVerband(o.lagen[boven].dozen, o.lagen[onder].dozen))
      expect(inVerband(s.lagen[boven].dozen, s.lagen[onder].dozen)).toBe(true);
    // Bij verband geen nieuwe torens (#60): niet minder dozen op twee of meer dozen, niet meer dozen voor 90% op één doos.
    if (o.stapelwijze === 'verband') {
      expect(steunendeDozen(s.lagen[boven].dozen, s.lagen[onder].dozen)).toBeGreaterThanOrEqual(steunendeDozen(o.lagen[boven].dozen, o.lagen[onder].dozen));
      expect(torens(s.lagen[boven].dozen, s.lagen[onder].dozen)).toBeLessThanOrEqual(torens(o.lagen[boven].dozen, o.lagen[onder].dozen));
    }
  }
}

/** Spreidt en controleert ook dat de invoer niet verandert en het resultaat deterministisch is. */
function spreidEnControleer(o: Oplossing, invoer: Invoer, minSteun = 0.75): Oplossing {
  const voor = JSON.stringify(o);
  const s = spreidLading(o, invoer, minSteun);
  expect(JSON.stringify(o)).toBe(voor);
  expect(spreidLading(structuredClone(o), structuredClone(invoer), minSteun)).toEqual(s);
  controleer(o, s, invoer, minSteun);
  return s;
}

describe('dozen tegen de rand van het blok', () => {
  // Voorbeeld van de gebruiker: doos 1 dwars voorop, dozen 2 en 3 erachter, allebei links. Het blok (de omhullende van
  // beide lagen) loopt van x 0 tot 790 en van y 0 tot 1170, binnen de pallet van 800 × 1200.
  const A = [
    { x: 0, y: 0, w: 790, d: 380 },
    { x: 0, y: 380, w: 790, d: 380 },
    { x: 0, y: 760, w: 790, d: 380 },
  ];
  const B = [
    { x: 0, y: 0, w: 790, d: 380 },
    { x: 0, y: 380, w: 380, d: 790 },
    { x: 380, y: 380, w: 380, d: 790 },
  ];

  it('schuift doos 3 tegen de rechterkant van het blok, doos 2 blijft links (voorbeeld van de gebruiker)', () => {
    const { o, invoer } = handOplossing([A, B], [0, 1], 'verband');
    const s = spreidEnControleer(o, invoer);
    expect(s).not.toBe(o);
    const [d1, d2, d3] = s.lagen[1].dozen;
    // Tot de kant van het blok (790), niet tot de rand van de pallet (800).
    expect(d3.x + d3.w).toBe(790);
    expect(d2.x).toBe(0);
    expect(d1.x).toBe(0);
    // Dozen 2 en 3 staan achteraan tegen de kant van het blok, doos 1 voorop.
    expect(d1.y).toBe(0);
    expect(d2.y + d2.d).toBe(1170);
    expect(d3.y + d3.d).toBe(1170);
    // In laag A sluit de achterste doos ook achteraan aan; de tussenruimte van 30 mm komt binnenin.
    expect(s.lagen[0].dozen.map((r) => r.y)).toEqual([0, 380, 790]);
  });

  it('doet hetzelfde met de echte oplossing van 790 × 380 (1000466) en verdeelt het gewicht', () => {
    const invoer = bestaand(790, 380, 275, 13.5, 12);
    const o = bereken(invoer, ZONDER_UITLIJNEN).top[0].oplossing;
    expect(o.stapelwijze).toBe('verband');
    const laagB = o.lagen[1].dozen;
    expect(laagB[0].w).toBe(790);
    expect(laagB[2].x + laagB[2].w).toBeLessThan(795);
    const s = spreidEnControleer(o, invoer);
    // Het blok loopt van x 5 tot 795 en van y 15 tot 1185; beide lagen sluiten daar rondom op aan. Laag A: de dwarse doos
    // voorop, twee dozen in de lengte erachter; laag B is dat van voor naar achter gespiegeld (geen torens). In beide
    // lagen sluit de rechter doos in de lengte aan op de rechterkant van het blok.
    expect(s.lagen.map((l) => l.dozen.map((r) => [r.x, r.x + r.w, r.y, r.y + r.d]))).toEqual([
      [
        [5, 795, 15, 395],
        [5, 385, 395, 1185],
        [415, 795, 395, 1185],
      ],
      [
        [5, 795, 805, 1185],
        [5, 385, 15, 805],
        [415, 795, 15, 805],
      ],
    ]);
    const [d1, d2, d3] = s.lagen[1].dozen;
    expect(d3.x + d3.w).toBe(795);
    expect(d2.x).toBe(5);
    expect(d1.x + d1.w / 2).toBe(400);
    // Het zwaartepunt van de laag schuift naar het midden van de pallet.
    expect(Math.abs(zwaartepuntX(s.lagen[1].dozen) - 400)).toBeLessThan(Math.abs(zwaartepuntX(laagB) - 400));
    expect(zwaartepuntX(s.lagen[1].dozen)).toBeCloseTo(400, 6);
    // Ook in laag A, waar de rechter doos in de lengte eerst op x 385–765 stond.
    expect(Math.abs(zwaartepuntX(s.lagen[0].dozen) - 400)).toBeLessThan(Math.abs(zwaartepuntX(o.lagen[0].dozen) - 400));
    expect(zwaartepuntX(s.lagen[0].dozen)).toBeCloseTo(400, 6);
  });

  it('een doos op het midden blijft gecentreerd', () => {
    const laag = [
      { x: 50, y: 400, w: 200, d: 400 },
      { x: 330, y: 400, w: 140, d: 400 },
      { x: 550, y: 400, w: 200, d: 400 },
    ];
    // De andere verbandlaag is breder: het blok loopt van x 20 tot 780, met het midden op 400.
    const breed = [
      { x: 20, y: 400, w: 380, d: 400 },
      { x: 400, y: 400, w: 380, d: 400 },
    ];
    const { o, invoer } = handOplossing([laag, breed], [1, 0, 1, 0], 'verband');
    const s = spreidEnControleer(o, invoer);
    expect(s.lagen[0].dozen[0]).toEqual({ x: 20, y: 400, w: 200, d: 400 });
    // Midden van doos 2 ligt op het midden van het blok (400): hij blijft daar; in de lengte liggen alle middens al op 600.
    expect(s.lagen[0].dozen[1]).toEqual({ x: 330, y: 400, w: 140, d: 400 });
    expect(s.lagen[0].dozen[2]).toEqual({ x: 580, y: 400, w: 200, d: 400 });
    expect(s.lagen[1].dozen).toEqual(breed);
  });

  it('geeft de invoer zelf terug als er niets te schuiven is', () => {
    // 8 × 15 dozen van 100 × 80 vullen de europallet precies.
    const invoer = bestaand(100, 80, 100, 1, 1);
    const o = bereken(invoer, ZONDER_UITLIJNEN).top[0].oplossing;
    expect(o.lagen[0].dozen).toHaveLength(120);
    expect(spreidLading(o, invoer)).toBe(o);
  });
});

describe('alleen verband wordt uitgelijnd', () => {
  it('bereken() lijnt verband uit en laat een rechte stapeling gecentreerd staan', () => {
    let recht = 0;
    let zouSchuiven = 0;
    let verband = 0;
    let uitgelijnd = 0;
    for (const invoer of [
      binnendoos(300, 200, 150, 2),
      binnendoos(190, 130, 100, 1),
      bestaand(156, 136, 200, 2, 1),
      bestaand(790, 380, 275, 13.5, 12),
      bestaand(590, 392, 300, 10, 1),
      bestaand(390, 290, 250, 6, 1),
      // Ronde 9: verband telt alleen nog in de buurt van een blok, dus vallen hierboven verbandoplossingen weg (zoals 4/3
      // en 40/40). Deze twee geven verband dat wel uitgelijnd wordt.
      binnendoos(150, 100, 150, 1),
      bestaand(240, 190, 250, 6, 1),
    ]) {
      const zonder = bereken(invoer, ZONDER_UITLIJNEN).top;
      const met = bereken(invoer).top;
      expect(met.map((t) => t.oplossing.id)).toEqual(zonder.map((t) => t.oplossing.id));
      met.forEach((t, k) => {
        const o = zonder[k].oplossing;
        if (o.stapelwijze === 'recht') {
          recht++;
          if (spreidLading(o, invoer) !== o) zouSchuiven++;
          expect(t.oplossing).toEqual(o);
        } else {
          verband++;
          const s = spreidLading(o, invoer);
          if (s !== o) uitgelijnd++;
          expect(t.oplossing).toEqual(s);
        }
      });
    }
    expect(recht).toBeGreaterThan(5);
    expect(verband).toBeGreaterThan(5);
    // De meeste verbandoplossingen worden echt uitgelijnd (5 van de 8).
    expect(uitgelijnd).toBeGreaterThan(verband / 2);
    // Ook binnen het blok had spreidLading sommige rechte stapelingen verschoven (een laag met een tussenruimte binnenin,
    // 3 van de 9); bereken() laat ze bewust staan zoals plaats() ze neerzet.
    expect(zouSchuiven).toBeGreaterThan(0);
  });
});

describe('verband en steun', () => {
  // Onderlaag: 2 × 2 dozen van 380 × 500, gecentreerd, met vrije ruimte rondom.
  const onder = [
    { x: 20, y: 100, w: 380, d: 500 },
    { x: 400, y: 100, w: 380, d: 500 },
    { x: 20, y: 600, w: 380, d: 500 },
    { x: 400, y: 600, w: 380, d: 500 },
  ];
  // Daaronder een grotere laag van 2 × 2 dozen van 390 × 580 (x 10–790, y 20–1180): die maakt het blok groter dan de
  // lagen erboven, zodat die binnen het blok kunnen schuiven. Hij staat in de lagen als laag 2, onderop.
  const vol = [
    { x: 10, y: 20, w: 390, d: 580 },
    { x: 400, y: 20, w: 390, d: 580 },
    { x: 10, y: 600, w: 390, d: 580 },
    { x: 400, y: 600, w: 390, d: 580 },
  ];

  it('valt terug op alleen de breedte als spreiden in de lengte de steun onder het minimum brengt', () => {
    // Eén doos midden op de vier dozen eronder: in beide richtingen tot de kant van het blok zou hij maar 64% steun houden.
    const boven = [{ x: 210, y: 350, w: 380, d: 500 }];
    const { o, invoer } = handOplossing([onder, boven, vol], [2, 0, 1], 'verband');
    const s = spreidEnControleer(o, invoer);
    expect(s).not.toBe(o);
    expect(s.lagen[0].dozen.map((r) => r.x)).toEqual([10, 410, 10, 410]);
    expect(s.lagen[0].dozen.map((r) => r.y)).toEqual([100, 100, 600, 600]);
    expect(s.lagen[1].dozen).toEqual(boven);
    expect(s.lagen[2].dozen).toEqual(vol);
    expect(steun(s.lagen[1].dozen, s.lagen[0].dozen)[0].fractie).toBeCloseTo(360 / 380, 6);
  });

  it('laat alles staan als geen enkele variant de steun houdt', () => {
    const boven = [{ x: 210, y: 350, w: 380, d: 500 }];
    const { o, invoer } = handOplossing([onder, boven, vol], [2, 0, 1], 'verband');
    expect(spreidLading(o, invoer, 1)).toBe(o);
  });

  it('houdt het verband: de volledige spreiding zou het verband breken', () => {
    // Twee smalle dozen over de naad: elk 120 mm op beide dozen eronder. In de lengte gespreid
    // houden ze maar 40 mm over, te weinig voor verband (50 mm).
    const boven = [
      { x: 20, y: 480, w: 380, d: 240 },
      { x: 400, y: 480, w: 380, d: 240 },
    ];
    const { o, invoer } = handOplossing([onder, boven, vol], [2, 0, 1], 'verband');
    expect(inVerband(boven, onder)).toBe(true);
    // Zonder verbandregel en zonder steunminimum zou in beide richtingen tot de kant van het blok geschoven worden.
    const zonderVerband = spreidLading({ ...o, stapelwijze: 'recht' }, invoer, 0);
    expect(zonderVerband.lagen[0].dozen.map((r) => r.y)).toEqual([20, 20, 680, 680]);
    expect(inVerband(zonderVerband.lagen[1].dozen, zonderVerband.lagen[0].dozen)).toBe(false);
    // Met de verbandregel alleen in de breedte.
    const s = spreidEnControleer(o, invoer, 0);
    expect(s.lagen[0].dozen.map((r) => r.y)).toEqual([100, 100, 600, 600]);
    expect(s.lagen[0].dozen.map((r) => r.x)).toEqual([10, 410, 10, 410]);
    expect(s.lagen[1].dozen.map((r) => r.x)).toEqual([10, 410]);
    expect(inVerband(s.lagen[1].dozen, s.lagen[0].dozen)).toBe(true);
  });

  it('een doos die al minder steun had, gaat er niet verder op achteruit', () => {
    // De bovenste doos steunt maar voor 50% (hij steekt over de achterste onderdoos heen naar achteren).
    const laagA = [{ x: 200, y: 300, w: 400, d: 400 }];
    const laagB = [{ x: 200, y: 500, w: 400, d: 400 }];
    // De grotere laag onderop maakt het blok y 20–1180, zodat er in de lengte ruimte is om te schuiven.
    const { o, invoer } = handOplossing([laagA, laagB, vol], [2, 0, 1], 'verband');
    expect(steun(laagB, laagA)[0].fractie).toBe(0.5);
    // In de lengte gespreid zou hij van de onderdoos af schuiven (laag A naar voren, laag B naar achteren); in de
    // breedte valt niets te schuiven.
    expect(spreidEnControleer(o, invoer)).toBe(o);
    // Twee vrije dozen in dezelfde laag mogen wel naar de kant van het blok (x 10–790), zolang de eerste niet
    // achteruitgaat (symmetrisch, zodat het zwaartepunt niet verschuift).
    const vrij = [
      { x: 50, y: 100, w: 100, d: 100 },
      { x: 650, y: 100, w: 100, d: 100 },
    ];
    const ruimer = handOplossing([laagA, [...laagB, ...vrij], vol], [2, 0, 1], 'verband');
    const s = spreidEnControleer(ruimer.o, ruimer.invoer);
    expect(s.lagen[1].dozen[1].x).toBe(10);
    expect(s.lagen[1].dozen[2].x + s.lagen[1].dozen[2].w).toBe(790);
    expect(s.lagen[1].dozen[0]).toEqual(laagB[0]);
    expect(steun(s.lagen[1].dozen, s.lagen[0].dozen)[0].fractie).toBeGreaterThanOrEqual(0.5 - 1e-9);
  });
});

describe('gewicht gelijk verdeeld', () => {
  const afstand = (o: Oplossing) => {
    const dozen = o.laagVolgorde.flatMap((k) => o.lagen[k].dozen);
    const x = dozen.reduce((t, r) => t + r.x + r.w / 2, 0) / dozen.length;
    const y = dozen.reduce((t, r) => t + r.y + r.d / 2, 0) / dozen.length;
    return Math.hypot(x - 400, y - 600);
  };

  it('het zwaartepunt houdt het uitlijnen tegen bij scheve overhang (409 × 197 × 200)', () => {
    // Met overhang alleen achter en rechts staat het blok uit het midden; uitlijnen tot de kant van het blok
    // zou het zwaartepunt van de verbandoplossing van 7,8 naar 16,2 mm uit het midden duwen.
    const invoer = bestaand(409, 197, 200, 5, 1);
    invoer.drager.overhangToegestaan = true;
    invoer.drager.overhang = { voor: 0, achter: 50, links: 0, rechts: 30 };
    let verband = 0;
    for (const t of bereken(invoer, ZONDER_UITLIJNEN).top) {
      if (t.oplossing.stapelwijze === 'verband') verband++;
      const s = spreidEnControleer(t.oplossing, invoer);
      expect(afstand(s)).toBeLessThanOrEqual(afstand(t.oplossing) + 2 + 1e-9);
    }
    expect(verband).toBeGreaterThan(0);
  });

  it('een scheve laag schuift niet verder naar één kant', () => {
    const laag = [
      { x: 20, y: 400, w: 300, d: 400 },
      { x: 330, y: 400, w: 140, d: 400 },
    ];
    // De andere verbandlaag is breder (x 0–800). Tot de kant van het blok zou de linkerdoos 20 mm naar links gaan en het
    // zwaartepunt van de stapel 5 mm verder uit het midden duwen; dat mag hooguit 2 mm zijn.
    const breed = [
      { x: 0, y: 400, w: 400, d: 400 },
      { x: 400, y: 400, w: 400, d: 400 },
    ];
    const { o, invoer } = handOplossing([laag, breed], [1, 0, 1, 0], 'verband');
    expect(spreidLading(o, invoer)).toBe(o);
    // Met een gespiegelde doos rechts blijft het zwaartepunt in het midden en gaan beide buitenste dozen wel naar de kant.
    const symmetrisch = handOplossing([[...laag, { x: 480, y: 400, w: 300, d: 400 }], breed], [1, 0, 1, 0], 'verband');
    const s = spreidEnControleer(symmetrisch.o, symmetrisch.invoer);
    expect(s.lagen[0].dozen.map((r) => r.x)).toEqual([0, 330, 500]);
    expect(afstand(s)).toBeLessThanOrEqual(afstand(symmetrisch.o) + 1e-9);
  });
});

describe('eigenschappen op veel laagpatronen', () => {
  const maten: [number, number][] = [
    [300, 200],
    [400, 300],
    [156, 136],
    [250, 180],
    [214, 114],
    [330, 220],
    [500, 295],
    [365, 245],
    [190, 170],
    [460, 310],
    [275, 185],
    [206, 134],
    [592, 340],
    [790, 380],
  ];
  const metOverhang = kopieDrager(EUROPALLET);
  metOverhang.overhangToegestaan = true;
  metOverhang.overhang = { voor: 40, achter: 10, links: 25, rechts: 0 };

  it('geen overlap, binnen het blok, gesloten zijkanten, overhang groeit niet, deterministisch', () => {
    let gespreid = 0;
    let getest = 0;
    for (const drager of [kopieDrager(EUROPALLET), metOverhang]) {
      const { o: basisOpl, invoer: basisInvoer } = handOplossing([[]], [0], 'recht');
      const invoer = { ...basisInvoer, drager };
      for (const vlak of zoekvlakken(drager))
        for (const [L, B] of maten)
          for (const p of zoekPatronen(vlak.W, vlak.D, L, B).voorraad.slice(0, 6)) {
            const g = plaats(p.dozen, drager);
            if (!g) continue;
            const om = omhullende(g.dozen);
            const o: Oplossing = {
              ...basisOpl,
              lagen: [{ dozen: g.dozen }],
              laagVolgorde: [0, 0, 0, 0],
              aantalLagen: 4,
              overhang: g.overhang,
              omhullende: {
                breedte: Math.max(drager.breedte, om.x + om.w) - Math.min(0, om.x),
                lengte: Math.max(drager.lengte, om.y + om.d) - Math.min(0, om.y),
              },
            };
            const s = spreidEnControleer(o, invoer);
            getest++;
            if (s !== o) gespreid++;
          }
    }
    expect(getest).toBeGreaterThan(100);
    expect(gespreid).toBeGreaterThan(getest / 2);
  });

  it('twee verschillende lagen in verband: elke laag sluit aan op het blok van beide samen', () => {
    // Zoals bij verband: twee laagpatronen met evenveel dozen om en om. Het blok is dan vaak groter dan elke laag apart.
    let gespreid = 0;
    let getest = 0;
    for (const drager of [kopieDrager(EUROPALLET), metOverhang]) {
      const { o: basisOpl, invoer: basisInvoer } = handOplossing([[]], [0], 'verband');
      const invoer = { ...basisInvoer, drager };
      for (const vlak of zoekvlakken(drager))
        for (const [L, B] of maten) {
          const lagen = zoekPatronen(vlak.W, vlak.D, L, B).voorraad.slice(0, 6).map((p) => plaats(p.dozen, drager)).filter((g) => g !== null);
          for (const a of lagen)
            for (const b of lagen) {
              if (a === b || a.dozen.length !== b.dozen.length) continue;
              const om = omhullende([...a.dozen, ...b.dozen]);
              const o: Oplossing = {
                ...basisOpl,
                lagen: [{ dozen: a.dozen }, { dozen: b.dozen }],
                laagVolgorde: [0, 1, 0, 1],
                aantalLagen: 4,
                overhang: {
                  voor: Math.max(a.overhang.voor, b.overhang.voor),
                  achter: Math.max(a.overhang.achter, b.overhang.achter),
                  links: Math.max(a.overhang.links, b.overhang.links),
                  rechts: Math.max(a.overhang.rechts, b.overhang.rechts),
                },
                omhullende: {
                  breedte: Math.max(drager.breedte, om.x + om.w) - Math.min(0, om.x),
                  lengte: Math.max(drager.lengte, om.y + om.d) - Math.min(0, om.y),
                },
              };
              const s = spreidEnControleer(o, invoer);
              getest++;
              if (s !== o) gespreid++;
            }
        }
    }
    expect(getest).toBeGreaterThan(300);
    // Willekeurige paren: het uitlijnen mag daar vaak niet, omdat het torens zou geven (#60). Gemeten: 262 van 604.
    expect(gespreid).toBeGreaterThan(getest / 4);
  });
});

describe('van invoer tot gespreide oplossing', () => {
  const metOverhang = (i: Invoer, o: Overhang, asym = true) => {
    i.drager.overhangToegestaan = true;
    i.drager.overhang = o;
    i.drager.asymmetrieToegestaan = asym;
    return i;
  };
  const gevallen: [string, () => Invoer][] = [
    ['binnendoos 300 × 200 × 150, 2 kg', () => binnendoos(300, 200, 150, 2)],
    ['binnendoos 100 × 100 × 50, 0,3 kg', () => binnendoos(100, 100, 50, 0.3)],
    ['binnendoos 250 × 180 × 120, 1,5 kg', () => binnendoos(250, 180, 120, 1.5)],
    ['binnendoos 400 × 300 × 100, 3 kg', () => binnendoos(400, 300, 100, 3)],
    ['bestaande doos 156 × 136 (verband)', () => bestaand(156, 136, 200, 2, 1)],
    ['bestaande doos 790 × 380 (verband)', () => bestaand(790, 380, 275, 13.5, 12)],
    ['bestaande doos 592 × 340 met overhang (verband)', () => metOverhang(bestaand(592, 340, 300, 10, 1), { voor: 40, achter: 40, links: 40, rechts: 40 })],
    ['bestaande doos 191 × 104 met scheve overhang', () => metOverhang(bestaand(191, 104, 200, 2, 1), { voor: 41, achter: 2, links: 23, rechts: 8 })],
  ];

  /**
   * Valt er bij het uitlijnen iets te schuiven? Per laag hetzelfde doel per doos als spreidLading: links van het midden van
   * het blok zo ver mogelijk naar links (tot de rand van het blok of de doos ervoor), rechts zo ver mogelijk naar rechts,
   * op het midden gecentreerd; daarna hetzelfde van voor naar achter. Of de steun en het verband dat toelaten, telt hier niet.
   */
  function kanSchuiven(o: Oplossing): boolean {
    const om = omhullende(o.lagen.flatMap((l) => l.dozen));
    // Langs één as: p en m positie en maat langs de as, q en n dwars erop.
    const schuift = (p: number[], m: number[], q: number[], n: number[], lo: number, hi: number) => {
      const volgorde = p.map((_, i) => i).sort((a, b) => p[a] - p[b] || a - b);
      const voor = (i: number, j: number) => Math.min(q[i] + n[i], q[j] + n[j]) - Math.max(q[i], q[j]) > EPS && p[i] + m[i] <= p[j] + EPS;
      const pmin = p.map(() => lo);
      for (const i of volgorde) for (const j of volgorde) if (voor(i, j)) pmin[j] = Math.max(pmin[j], pmin[i] + m[i]);
      const pmax = m.map((mi) => hi - mi);
      for (const i of [...volgorde].reverse()) for (const j of volgorde) if (voor(i, j)) pmax[i] = Math.min(pmax[i], pmax[j] - m[i]);
      const midden = (lo + hi) / 2;
      return p.some((pi, i) => {
        const c = pi + m[i] / 2;
        const doel = c < midden - 0.5 ? pmin[i] : c > midden + 0.5 ? pmax[i] : Math.min(Math.max(midden - m[i] / 2, pmin[i]), pmax[i]);
        return Math.abs(doel - pi) > EPS;
      });
    };
    return o.lagen.some(({ dozen: d }) => {
      const [x, w, y, dd] = [d.map((r) => r.x), d.map((r) => r.w), d.map((r) => r.y), d.map((r) => r.d)];
      return schuift(x, w, y, dd, om.x, om.x + om.w) || schuift(y, dd, x, w, om.y, om.y + om.d);
    });
  }

  let totaal = 0;
  let verband = 0;
  let schuifbaar = 0;
  let uitgelijnd = 0;
  for (const [naam, maak] of gevallen)
    it(`${naam}: elke topoplossing blijft geldig`, () => {
      const invoer = maak();
      const r = bereken(invoer, ZONDER_UITLIJNEN);
      expect(r.top.length).toBeGreaterThan(0);
      for (const t of r.top) {
        totaal++;
        const s = spreidEnControleer(t.oplossing, invoer);
        if (t.oplossing.stapelwijze !== 'verband') continue;
        verband++;
        const kan = kanSchuiven(t.oplossing);
        if (kan) schuifbaar++;
        if (s !== t.oplossing) uitgelijnd++;
        // Zonder iets te schuiven blijft de oplossing zoals hij was.
        if (!kan) expect(s).toBe(t.oplossing);
      }
    });

  it('lijnt de meeste verbandoplossingen waarin iets te schuiven valt echt uit', () => {
    // bereken() lijnt alleen verband uit. Van de 11 verbandoplossingen valt er in 5 iets te schuiven; daarvan schuiven er 4
    // echt. Bij de bestaande doos van 156 × 136 mm laten de steun en het verband het niet toe. Sinds #65 zijn de 4
    // verbandoplossingen met dozen van 414 × 314 mm (binnendozen 300 × 200 en 400 × 300) één gesloten blok waarin elke doos
    // op twee dozen steunt; daar valt niets te schuiven. Vóór #65 viel er in 9 van de 11 iets te schuiven en schoven er 6.
    expect(totaal).toBeGreaterThan(10);
    expect(verband).toBeGreaterThan(5);
    expect(schuifbaar).toBeGreaterThan(3);
    expect(uitgelijnd).toBeGreaterThan(schuifbaar / 2);
  });
});

describe('rekentijd', () => {
  it('blijft ruim onder 50 ms per oplossing, ook bij 100 dozen per laag', () => {
    // Raster van 10 × 10 dozen van 76 × 116; de bovenlaag ligt in beide richtingen een halve doos
    // verschoven, zodat bij minSteun 1 elke variant wordt geprobeerd en afgewezen (het meeste werk).
    const A: Rechthoek[] = [];
    const B: Rechthoek[] = [];
    for (let i = 0; i < 10; i++)
      for (let j = 0; j < 10; j++) {
        A.push({ x: 20 + 76 * i, y: 20 + 116 * j, w: 76, d: 116 });
        B.push({
          x: i === 0 ? 20 : 58 + 76 * (i - 1),
          y: j === 0 ? 20 : 78 + 116 * (j - 1),
          w: i === 0 ? 38 : 76,
          d: j === 0 ? 58 : 116,
        });
      }
    const { o, invoer } = handOplossing([A, B], [0, 1, 0, 1, 0, 1], 'verband');
    expect(spreidLading(o, invoer, 1)).toBe(o);
    const gevallen: [Oplossing, Invoer, number][] = [[o, invoer, 1], [o, invoer, 0.75]];
    const groot = bestaand(110, 75, 100, 1, 1);
    for (const t of bereken(groot, ZONDER_UITLIJNEN).top) gevallen.push([t.oplossing, groot, 0.75]);
    for (const [opl, inv, minSteun] of gevallen) {
      spreidLading(opl, inv, minSteun);
      const n = 20;
      const t0 = performance.now();
      for (let k = 0; k < n; k++) spreidLading(opl, inv, minSteun);
      expect((performance.now() - t0) / n).toBeLessThan(50);
    }
    expect(Math.max(...gevallen.map(([opl]) => opl.lagen[0].dozen.length))).toBeGreaterThanOrEqual(90);
  });
});
