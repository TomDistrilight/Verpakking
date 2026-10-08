// Acceptatievoorbeelden uit het functioneel ontwerp V1.3, §6 en bijlage A.

import { describe, expect, it } from 'vitest';
import { bereken } from '../src/engine/bereken';
import { ontwerpKandidaten } from '../src/engine/kandidaten';
import { kartonOppervlak } from '../src/engine/karton';
import { isEuropallet } from '../src/engine/module';
import { binnenGrenzen, plaats } from '../src/engine/plaatsing';
import { rangschik } from '../src/engine/rangschikking';
import { maxLagenHoogte, totaleHoogte } from '../src/engine/stapelen';
import { BLOKPALLET, EUROPALLET, kopieDrager, standaardInvoer } from '../src/engine/standaard';
import type { Invoer, Oplossing } from '../src/engine/types';

function invoerBinnendoos(L: number, B: number, H: number, gewicht: number): Invoer {
  const i = standaardInvoer();
  i.artikelcode = 'TEST';
  i.binnendoos = { L, B, H, gewicht, kantelbaar: false, magVerticaal: { L: false, B: false } };
  return i;
}

function invoerBestaand(L: number, B: number, H: number, gevuld: number, qty: number, achter = 0): Invoer {
  const i = standaardInvoer();
  i.instap = 'bestaandeBuitendoos';
  i.artikelcode = 'CASE';
  i.binnendoos = undefined;
  i.bestaandeBuitendoos = { L, B, H, gevuldGewicht: gevuld, binnendozenPerDoos: qty };
  if (achter > 0) {
    i.drager.overhangToegestaan = true;
    i.drager.overhang = { voor: 0, achter, links: 0, rechts: 0 };
    i.drager.asymmetrieToegestaan = true;
  }
  return i;
}

describe('§6 doosmaat en karton', () => {
  it('binnendoos 300 × 200 × 150, 2 × 2 × 2, FEFCO 0201', () => {
    const { kandidaten } = ontwerpKandidaten(invoerBinnendoos(300, 200, 150, 2));
    const k = kandidaten.find((c) => c.binnendozenPerDoos === 8 && c.L === 614 && c.B === 414 && c.H === 328);
    expect(k).toBeDefined();
    expect(k!.binnenmaat).toEqual({ L: 600, B: 400, H: 300 });
    expect(k!.kartonOppervlak!).toBeCloseTo(1.5515, 4);
    expect(k!.eigenGewicht!).toBeCloseTo(1.1636, 4);
    expect(k!.gevuldGewicht).toBeCloseTo(17.164, 3);
    expect(k!.module).toBeNull(); // 614 × 414 is groter dan 600 × 400
  });

  it('L en B worden voor de kartonformule gewisseld', () => {
    expect(kartonOppervlak(414, 614, 328)).toBeCloseTo(kartonOppervlak(614, 414, 328), 10);
  });
});

describe('§6 hoogte en tussenlagen', () => {
  it('europallet 144 mm: beschikbare ladinghoogte 1956 mm', () => {
    const i = standaardInvoer();
    expect(totaleHoogte(0, 0, i)).toBe(144);
    expect(maxLagenHoogte(1956, i)).toBe(1);
    expect(maxLagenHoogte(1957, i)).toBe(0);
  });

  it('dozen 326 mm: 6 lagen zonder, 5 met kartonnen tussenlaag na elke 2', () => {
    const i = standaardInvoer();
    expect(maxLagenHoogte(326, i)).toBe(6);
    expect(totaleHoogte(6, 326, i)).toBe(2100);
    i.tussenlaag = { soort: 'karton', naElkeN: 2, dikte: 5, gewicht: 2, maat: 'drager' };
    expect(maxLagenHoogte(326, i)).toBe(5);
    expect(totaleHoogte(5, 326, i)).toBe(1784);
  });
});

function opl(p: Partial<Oplossing> & { n: number; gekanteld?: boolean; L?: number; B?: number; module?: string | null }): Oplossing {
  const L = p.L ?? 500;
  const B = p.B ?? 300;
  return {
    id: `${L}-${p.n}-${p.stapelwijze ?? 'recht'}-${p.gekanteld ? 'k' : 'n'}`,
    doos: {
      L,
      B,
      H: 300,
      binnenmaat: null,
      indeling: null,
      binnendozenPerDoos: 1,
      eigenGewicht: null,
      kartonOppervlak: null,
      gevuldGewicht: 10,
      gekanteld: p.gekanteld ?? false,
      bestaand: false,
      module: p.module ?? null,
    },
    stapelwijze: p.stapelwijze ?? 'recht',
    lagen: [],
    laagVolgorde: [],
    aantalLagen: 1,
    buitendozenPerDrager: p.n,
    binnendozenPerDrager: p.n,
    artikelenPerDrager: p.n,
    tussenlaagNa: [],
    totaleHoogte: 1000,
    totaalGewicht: 100,
    overhang: { voor: 0, achter: 0, links: 0, rechts: 0 },
    omhullende: { breedte: 800, lengte: 1200 },
    moduleAfstand: null,
  };
}

describe('§6 rangschikking', () => {
  const blok = standaardInvoer();
  blok.drager = kopieDrager(BLOKPALLET);

  it('verband 100, recht 109: verband wint, recht in de top drie', () => {
    const r = rangschik([opl({ n: 109, stapelwijze: 'recht' }), opl({ n: 100, stapelwijze: 'verband', L: 501 })], blok);
    expect(r.top[0].oplossing.stapelwijze).toBe('verband');
    expect(r.top.map((t) => t.oplossing.binnendozenPerDrager)).toContain(109);
  });

  it('verband 100, recht 110: recht wint, verband in de top drie', () => {
    const r = rangschik([opl({ n: 110, stapelwijze: 'recht' }), opl({ n: 100, stapelwijze: 'verband', L: 501 })], blok);
    expect(r.top[0].oplossing.stapelwijze).toBe('recht');
    expect(r.top[1].rol).toBe('verband');
  });

  it('niet-gekanteld 100, gekanteld 109: niet-gekanteld wint', () => {
    const r = rangschik([opl({ n: 109, gekanteld: true }), opl({ n: 100, L: 501 })], blok);
    expect(r.top[0].oplossing.doos.gekanteld).toBe(false);
    expect(r.top.some((t) => t.oplossing.doos.gekanteld)).toBe(true);
  });

  it('niet-gekanteld 100, gekanteld 110: gekanteld wint, niet-gekanteld in de top drie', () => {
    const r = rangschik([opl({ n: 110, gekanteld: true }), opl({ n: 100, L: 501 })], blok);
    expect(r.top[0].oplossing.doos.gekanteld).toBe(true);
    expect(r.top.find((t) => t.rol === 'nietGekanteld')?.oplossing.binnendozenPerDrager).toBe(100);
  });

  it('europallet: modulaire doos met 90 wint van niet-modulair met 100; op de blokpallet niet', () => {
    const lijst = [opl({ n: 100, L: 610, B: 410 }), opl({ n: 90, L: 600, B: 400, module: '600 × 400' })];
    const euro = standaardInvoer();
    expect(rangschik(lijst, euro).top[0].oplossing.binnendozenPerDrager).toBe(90);
    expect(rangschik(lijst, blok).top[0].oplossing.binnendozenPerDrager).toBe(100);
  });

  it('eigen drager "Pallet 140" met ladingvlak 1200 × 800 telt als europallet', () => {
    expect(isEuropallet({ ...EUROPALLET, naam: 'Pallet 140', hoogte: 140 })).toBe(true);
    expect(isEuropallet({ ...EUROPALLET, type: 'kar' })).toBe(false);
  });
});

describe('§6 overhang', () => {
  it('een doos 1 mm voorbij de rechtergrens wordt afgewezen', () => {
    const d = { ...kopieDrager(EUROPALLET), overhangToegestaan: true, overhang: { voor: 0, achter: 0, links: 20, rechts: 0 }, asymmetrieToegestaan: false };
    expect(plaats([{ x: 0, y: 0, w: 801, d: 400 }], d)).toBeNull();
    expect(binnenGrenzen([{ x: 0, y: 0, w: 801, d: 400 }], d)).toBe(false);
    expect(binnenGrenzen([{ x: 0, y: 0, w: 800, d: 400 }], d)).toBe(true);
  });

  it('1042794 met standaardinstellingen: geen oplossing en de benodigde overhang', () => {
    const r = bereken(invoerBestaand(1245, 380, 180, 18.8, 10));
    expect(r.oplossingen).toHaveLength(0);
    expect(r.geenOplossing).toContain('Doos van 1245 mm past alleen met minstens 45 mm overhang in de lengte (voor en achter samen).');
  });

  it('1042794 met 45 mm achter: voorzijde gelijk, overhang alleen achter; 44 mm is te weinig', () => {
    const r = bereken(invoerBestaand(1245, 380, 180, 18.8, 10, 45));
    const w = r.top[0].oplossing;
    expect(w.overhang).toEqual({ voor: 0, achter: 45, links: 0, rechts: 0 });
    expect(bereken(invoerBestaand(1245, 380, 180, 18.8, 10, 44)).oplossingen).toHaveLength(0);
  });
});

describe('Bijlage A: praktijkcases', () => {
  const cases = [
    { art: '1042794', L: 1245, B: 380, H: 180, kg: 18.8, qty: 10, achter: 45, perLaag: 2, lagen: 10, dozen: 20, hoogte: 1944, gewicht: 401.0 },
    { art: '1037172', L: 385, B: 362, H: 250, kg: 6.5, qty: 8, achter: 0, perLaag: 6, lagen: 7, dozen: 42, hoogte: 1894, gewicht: 298.0 },
    { art: '2029248', L: 1625, B: 240, H: 242, kg: 16.8, qty: 9, achter: 425, perLaag: 3, lagen: 8, dozen: 24, hoogte: 2080, gewicht: 428.2 },
    { art: '1000466', L: 790, B: 380, H: 275, kg: 13.5, qty: 12, achter: 0, perLaag: 3, lagen: 7, dozen: 21, hoogte: 2069, gewicht: 308.5 },
    { art: '2013186', L: 515, B: 260, H: 490, kg: 17.2, qty: 6, achter: 0, perLaag: 6, lagen: 3, dozen: 18, hoogte: 1614, gewicht: 334.6 },
    { art: '2028463', L: 500, B: 295, H: 385, kg: 16.6, qty: 24, achter: 0, perLaag: 6, lagen: 5, dozen: 30, hoogte: 2069, gewicht: 523.0 },
  ];
  for (const c of cases) {
    it(`${c.art}: ${c.perLaag} per laag, ${c.lagen} lagen, ${c.dozen} buitendozen`, () => {
      const r = bereken(invoerBestaand(c.L, c.B, c.H, c.kg, c.qty, c.achter));
      const w = r.top[0].oplossing;
      expect(w.lagen.every((l) => l.dozen.length === c.perLaag)).toBe(true);
      expect(w.aantalLagen).toBe(c.lagen);
      expect(w.buitendozenPerDrager).toBe(c.dozen);
      expect(w.binnendozenPerDrager).toBe(c.dozen * c.qty);
      expect(w.totaleHoogte).toBe(c.hoogte);
      expect(w.totaalGewicht).toBeCloseTo(c.gewicht, 6);
      if (c.achter > 0) {
        expect(w.overhang.achter).toBeCloseTo(c.achter, 6);
        expect(w.overhang.voor).toBe(0);
        expect(bereken(invoerBestaand(c.L, c.B, c.H, c.kg, c.qty, c.achter - 1)).oplossingen).toHaveLength(0);
      }
    });
  }

  it('1000466 ligt in verband, zoals in de praktijk', () => {
    const r = bereken(invoerBestaand(790, 380, 275, 13.5, 12));
    expect(r.top[0].oplossing.stapelwijze).toBe('verband');
  });

  it('2028463 heeft een gemengde laag (4 + 2)', () => {
    const r = bereken(invoerBestaand(500, 295, 385, 16.6, 24));
    const laag = r.top[0].oplossing.lagen[0].dozen;
    const standen = new Set(laag.map((d) => d.w));
    expect(standen.size).toBe(2);
  });
});

describe('determinisme', () => {
  it('dezelfde invoer geeft hetzelfde resultaat', () => {
    const i = invoerBinnendoos(300, 200, 150, 2);
    const a = bereken(i);
    const b = bereken(structuredClone(i));
    expect(JSON.stringify(a.top)).toBe(JSON.stringify(b.top));
    expect(a.top.length).toBeGreaterThan(0);
  });
});
