// Spreiden van de lading (ronde 4, punt 2): dozen tegen de rand van de drager, gewicht gelijk verdeeld,
// zolang de dozen erboven genoeg steun houden.

import { describe, expect, it } from 'vitest';
import { bereken } from '../src/engine/bereken';
import { omhullende, zoekPatronen } from '../src/engine/laagpatroon';
import { binnenGrenzen, overhangVan, plaats, zoekvlakken } from '../src/engine/plaatsing';
import { spreidLading } from '../src/engine/spreiden';
import { kopieDrager, EUROPALLET, standaardInvoer } from '../src/engine/standaard';
import type { Drager, Invoer, Oplossing, Overhang, Rechthoek, Stapelwijze } from '../src/engine/types';
import { inVerband } from '../src/engine/verband';

// bereken() lijnt de getoonde oplossingen zelf al uit; deze tests beginnen bij de oplossing van vóór het uitlijnen.
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

function grenzen(o: Oplossing, drager: Drager) {
  const om = omhullende(o.lagen.flatMap((l) => l.dozen));
  return {
    x0: Math.min(0, om.x),
    x1: Math.max(drager.breedte, om.x + om.w),
    y0: Math.min(0, om.y),
    y1: Math.max(drager.lengte, om.y + om.d),
  };
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
  const g = grenzen(o, drager);
  // Zelfde dozen, zelfde volgorde; alleen de posities verschuiven.
  expect(s.lagen).toHaveLength(o.lagen.length);
  s.lagen.forEach((l, i) => {
    expect(l.dozen.map((r) => [r.w, r.d])).toEqual(o.lagen[i].dozen.map((r) => [r.w, r.d]));
    for (let a = 0; a < l.dozen.length; a++) {
      const r = l.dozen[a];
      expect(r.x).toBeGreaterThanOrEqual(g.x0 - EPS);
      expect(r.x + r.w).toBeLessThanOrEqual(g.x1 + EPS);
      expect(r.y).toBeGreaterThanOrEqual(g.y0 - EPS);
      expect(r.y + r.d).toBeLessThanOrEqual(g.y1 + EPS);
      for (let b = a + 1; b < l.dozen.length; b++) expect(overlapt(r, l.dozen[b])).toBe(false);
    }
    if (binnenGrenzen(o.lagen[i].dozen, drager)) expect(binnenGrenzen(l.dozen, drager)).toBe(true);
  });
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

describe('dozen tegen de rand', () => {
  // Voorbeeld van de gebruiker: doos 1 dwars voorop, dozen 2 en 3 erachter, allebei links.
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

  it('schuift doos 3 tegen de rechterrand, doos 2 blijft links (voorbeeld van de gebruiker)', () => {
    const { o, invoer } = handOplossing([A, B], [0, 1], 'verband');
    const s = spreidEnControleer(o, invoer);
    expect(s).not.toBe(o);
    const [d1, d2, d3] = s.lagen[1].dozen;
    expect(d3.x + d3.w).toBe(800);
    expect(d2.x).toBe(0);
    expect(d1.x).toBe(0);
    // Dozen 2 en 3 staan achteraan tegen de rand, doos 1 voorop.
    expect(d1.y).toBe(0);
    expect(d2.y + d2.d).toBe(1200);
    expect(d3.y + d3.d).toBe(1200);
  });

  it('doet hetzelfde met de echte oplossing van 790 × 380 (1000466) en verdeelt het gewicht', () => {
    const invoer = bestaand(790, 380, 275, 13.5, 12);
    const o = bereken(invoer, ZONDER_UITLIJNEN).top[0].oplossing;
    expect(o.stapelwijze).toBe('verband');
    const laagB = o.lagen[1].dozen;
    expect(laagB[0].w).toBe(790);
    expect(laagB[2].x + laagB[2].w).toBeLessThan(800);
    const s = spreidEnControleer(o, invoer);
    const [d1, d2, d3] = s.lagen[1].dozen;
    expect(d3.x + d3.w).toBe(800);
    expect(d2.x).toBe(0);
    expect(d1.x + d1.w / 2).toBe(400);
    // Het zwaartepunt van de laag schuift naar het midden van de pallet.
    expect(Math.abs(zwaartepuntX(s.lagen[1].dozen) - 400)).toBeLessThan(Math.abs(zwaartepuntX(laagB) - 400));
    expect(zwaartepuntX(s.lagen[1].dozen)).toBeCloseTo(400, 6);
  });

  it('een doos op het midden blijft gecentreerd', () => {
    const laag = [
      { x: 50, y: 400, w: 200, d: 400 },
      { x: 330, y: 400, w: 140, d: 400 },
      { x: 550, y: 400, w: 200, d: 400 },
    ];
    const { o, invoer } = handOplossing([laag], [0, 0, 0], 'recht');
    const s = spreidEnControleer(o, invoer);
    expect(s.lagen[0].dozen[0]).toEqual({ x: 0, y: 400, w: 200, d: 400 });
    // Midden van doos 2 ligt op 400: hij blijft daar; in de lengte liggen alle middens al op 600.
    expect(s.lagen[0].dozen[1]).toEqual({ x: 330, y: 400, w: 140, d: 400 });
    expect(s.lagen[0].dozen[2]).toEqual({ x: 600, y: 400, w: 200, d: 400 });
  });

  it('geeft de invoer zelf terug als er niets te schuiven is', () => {
    // 8 × 15 dozen van 100 × 80 vullen de europallet precies.
    const invoer = bestaand(100, 80, 100, 1, 1);
    const o = bereken(invoer, ZONDER_UITLIJNEN).top[0].oplossing;
    expect(o.lagen[0].dozen).toHaveLength(120);
    expect(spreidLading(o, invoer)).toBe(o);
  });
});

describe('rechte stapeling', () => {
  it('alle lagen blijven gelijk, de aantallen ook, en elke doos blijft volledig gesteund', () => {
    for (const invoer of [binnendoos(300, 200, 150, 2), bestaand(156, 136, 200, 2, 1), bestaand(790, 380, 275, 13.5, 12)]) {
      const o = bereken(invoer, ZONDER_UITLIJNEN).oplossingen.find((x) => x.stapelwijze === 'recht')!;
      const s = spreidEnControleer(o, invoer);
      expect(s).not.toBe(o);
      expect(s.lagen).toHaveLength(1);
      expect(s.laagVolgorde.every((i) => i === 0)).toBe(true);
      expect(s.buitendozenPerDrager).toBe(o.buitendozenPerDrager);
      expect(steun(s.lagen[0].dozen, s.lagen[0].dozen).every((x) => x.fractie === 1 && x.midden)).toBe(true);
    }
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

  it('valt terug op alleen de breedte als spreiden in de lengte de steun onder het minimum brengt', () => {
    // Eén doos midden op de vier dozen eronder: in de lengte zou hij maar 60% steun houden.
    const boven = [{ x: 210, y: 350, w: 380, d: 500 }];
    const { o, invoer } = handOplossing([onder, boven], [0, 1], 'verband');
    const s = spreidEnControleer(o, invoer);
    expect(s).not.toBe(o);
    expect(s.lagen[0].dozen.map((r) => r.x)).toEqual([0, 420, 0, 420]);
    expect(s.lagen[0].dozen.map((r) => r.y)).toEqual([100, 100, 600, 600]);
    expect(s.lagen[1].dozen).toEqual(boven);
    expect(steun(s.lagen[1].dozen, s.lagen[0].dozen)[0].fractie).toBeCloseTo(340 / 380, 6);
  });

  it('laat alles staan als geen enkele variant de steun houdt', () => {
    const boven = [{ x: 210, y: 350, w: 380, d: 500 }];
    const { o, invoer } = handOplossing([onder, boven], [0, 1], 'verband');
    expect(spreidLading(o, invoer, 1)).toBe(o);
  });

  it('houdt het verband: de volledige spreiding zou het verband breken', () => {
    // Twee smalle dozen over de naad: elk 120 mm op beide dozen eronder. In de lengte gespreid
    // houden ze maar 20 mm over, te weinig voor verband (50 mm).
    const boven = [
      { x: 20, y: 480, w: 380, d: 240 },
      { x: 400, y: 480, w: 380, d: 240 },
    ];
    const { o, invoer } = handOplossing([onder, boven], [0, 1], 'verband');
    expect(inVerband(boven, onder)).toBe(true);
    // Zonder verbandregel en zonder steunminimum zou in beide richtingen gespreid worden.
    const zonderVerband = spreidLading({ ...o, stapelwijze: 'recht' }, invoer, 0);
    expect(zonderVerband.lagen[0].dozen.map((r) => r.y)).toEqual([0, 0, 700, 700]);
    expect(inVerband(zonderVerband.lagen[1].dozen, zonderVerband.lagen[0].dozen)).toBe(false);
    // Met de verbandregel alleen in de breedte.
    const s = spreidEnControleer(o, invoer, 0);
    expect(s.lagen[0].dozen.map((r) => r.y)).toEqual([100, 100, 600, 600]);
    expect(s.lagen[0].dozen.map((r) => r.x)).toEqual([0, 420, 0, 420]);
    expect(s.lagen[1].dozen.map((r) => r.x)).toEqual([0, 420]);
    expect(inVerband(s.lagen[1].dozen, s.lagen[0].dozen)).toBe(true);
  });

  it('een doos die al minder steun had, gaat er niet verder op achteruit', () => {
    // De bovenste doos steunt maar voor 50% (hij steekt over de achterste onderdoos heen naar achteren).
    const laagA = [{ x: 200, y: 300, w: 400, d: 400 }];
    const laagB = [{ x: 200, y: 500, w: 400, d: 400 }];
    const { o, invoer } = handOplossing([laagA, laagB], [0, 1], 'verband');
    expect(steun(laagB, laagA)[0].fractie).toBe(0.5);
    // In de lengte gespreid zou hij van de onderdoos af schuiven; in de breedte valt niets te schuiven.
    expect(spreidEnControleer(o, invoer)).toBe(o);
    // Twee vrije dozen in dezelfde laag mogen wel naar de rand, zolang de eerste niet achteruitgaat
    // (symmetrisch, zodat het zwaartepunt niet verschuift).
    const vrij = [
      { x: 50, y: 100, w: 100, d: 100 },
      { x: 650, y: 100, w: 100, d: 100 },
    ];
    const ruimer = handOplossing([laagA, [...laagB, ...vrij]], [0, 1], 'verband');
    const s = spreidEnControleer(ruimer.o, ruimer.invoer);
    expect(s.lagen[1].dozen[1].x).toBe(0);
    expect(s.lagen[1].dozen[2].x + s.lagen[1].dozen[2].w).toBe(800);
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

  it('een kolom die net over het midden ligt, duwt het zwaartepunt niet uit het midden (217 × 206 × 103)', () => {
    const invoer = bestaand(217, 206, 103, 6, 1);
    invoer.minBuitendozenPerLaag = 2;
    for (const t of bereken(invoer, ZONDER_UITLIJNEN).top) {
      const s = spreidEnControleer(t.oplossing, invoer);
      expect(afstand(s)).toBeLessThanOrEqual(afstand(t.oplossing) + 2 + 1e-9);
    }
  });

  it('een scheve laag schuift niet verder naar één kant', () => {
    const laag = [
      { x: 20, y: 400, w: 300, d: 400 },
      { x: 330, y: 400, w: 140, d: 400 },
    ];
    const { o, invoer } = handOplossing([laag], [0, 0, 0], 'recht');
    expect(spreidLading(o, invoer)).toBe(o);
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

  it('geen overlap, binnen de grenzen, overhang groeit niet, deterministisch', () => {
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

  let gespreid = 0;
  let totaal = 0;
  for (const [naam, maak] of gevallen)
    it(`${naam}: elke topoplossing blijft geldig`, () => {
      const invoer = maak();
      const r = bereken(invoer, ZONDER_UITLIJNEN);
      expect(r.top.length).toBeGreaterThan(0);
      for (const t of r.top) {
        totaal++;
        if (spreidEnControleer(t.oplossing, invoer) !== t.oplossing) gespreid++;
      }
    });

  it('spreidt de meeste topoplossingen echt', () => {
    expect(totaal).toBeGreaterThan(10);
    expect(gespreid).toBeGreaterThan(totaal / 2);
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
