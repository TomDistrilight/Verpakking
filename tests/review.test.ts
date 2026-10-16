// Regressietests voor de bevindingen uit de codereview.

import { describe, expect, it } from 'vitest';
import { bereken, valideer } from '../src/engine/bereken';
import { ontwerpKandidaten } from '../src/engine/kandidaten';
import { standaardInvoer } from '../src/engine/standaard';
import type { Invoer } from '../src/engine/types';

function bestaand(L: number, B: number, H: number, gevuld: number | undefined, qty?: number): Invoer {
  const i = standaardInvoer();
  i.instap = 'bestaandeBuitendoos';
  i.artikelcode = 'R';
  i.binnendoos = undefined;
  i.bestaandeBuitendoos = { L, B, H, gevuldGewicht: gevuld, binnendozenPerDoos: qty };
  return i;
}

describe('invoercontrole', () => {
  it('meldt ongeldige gewichten van folie, hoekprofielen en eigen gewicht', () => {
    const i = bestaand(400, 300, 200, 20);
    i.materiaal.folie = { aan: true, gewicht: Number.NaN };
    i.materiaal.hoekprofielen = { aan: true, gewicht: -500 };
    expect(valideer(i).join(' ')).toContain('stretchfolie');
    expect(valideer(i).join(' ')).toContain('hoekprofielen');
    const j = bestaand(414, 314, 428, undefined);
    j.binnendoos = { L: 100, B: 100, H: 100, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } };
    j.bestaandeBuitendoos!.binnenmaat = { L: 400, B: 300, H: 400 };
    j.bestaandeBuitendoos!.eigenGewicht = Number.NaN;
    expect(valideer(j).join(' ')).toContain('eigen gewicht');
  });
});

describe('bestaande buitendoos met binnenmaat', () => {
  it('past de kantelregel toe: 32 gekanteld tegen 30 rechtop (+6,7%) geeft rechtop', () => {
    const i = bestaand(214, 214, 278, undefined);
    i.binnendoos = { L: 100, B: 60, H: 50, gewicht: 0.2, kantelbaar: true, magVerticaal: { L: false, B: true } };
    i.bestaandeBuitendoos!.binnenmaat = { L: 200, B: 200, H: 250 };
    i.bestaandeBuitendoos!.eigenGewicht = 1;
    const r = bereken(i);
    expect(r.top[0].oplossing.doos.gekanteld).toBe(false);
    expect(r.top[0].oplossing.doos.binnendozenPerDoos).toBe(30);
    expect(r.top.some((t) => t.oplossing.doos.gekanteld && t.oplossing.doos.binnendozenPerDoos === 32)).toBe(true);
  });

  it('toont geen indeling als het opgegeven aantal niet bij de binnenmaat past', () => {
    const i = bestaand(414, 314, 228, 20, 20);
    i.binnendoos = { L: 100, B: 100, H: 100, gewicht: 0.5, kantelbaar: false, magVerticaal: { L: false, B: false } };
    i.bestaandeBuitendoos!.binnenmaat = { L: 400, B: 300, H: 200 };
    const w = bereken(i).top[0].oplossing;
    expect(w.doos.binnendozenPerDoos).toBe(20);
    expect(w.doos.indeling).toBeNull();
  });
});

describe('meldingen bij geen oplossing', () => {
  it('noemt het gewicht van één volle laag', () => {
    const i = bestaand(400, 300, 200, 20);
    i.drager.maxTotaalGewicht = 100;
    const r = bereken(i);
    expect(r.oplossingen).toHaveLength(0);
    expect(r.geenOplossing.join(' ')).toContain('Eén volle laag weegt met de drager al 185 kg');
  });

  it('noemt de kleinste doos bij een te krappe max. buitenmaat', () => {
    const i = standaardInvoer();
    i.artikelcode = 'R';
    i.binnendoos = { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } };
    i.maxBuitenmaat = { H: 170 };
    const r = bereken(i);
    expect(r.geenOplossing.join(' ')).toContain('314 × 214 × 178 mm');
  });

  it('noemt alle overschreden grenzen bij een bestaande doos', () => {
    const r = bereken(bestaand(1245, 380, 180, 25));
    const t = r.geenOplossing.join(' ');
    expect(t).toContain('25 kg');
    expect(t).toContain('45 mm overhang in de lengte');
  });
});

describe('custom doostype met grotere breedtetoeslag', () => {
  it('houdt de doos met de meeste binnendozen en een kloppende binnenmaat', () => {
    const i = standaardInvoer();
    i.artikelcode = 'R';
    i.binnendoos = { L: 50, B: 50, H: 100, gewicht: 0.1, kantelbaar: false, magVerticaal: { L: false, B: false } };
    i.doostype = { soort: 'custom', toeslagL: 0, toeslagB: 50, toeslagH: 0, kartonmassa: 0.75 };
    i.minBuitenmaat = { L: 400, B: 350 };
    i.maxBuitenmaat = { L: 400, B: 350, H: 100 };
    const { kandidaten } = ontwerpKandidaten(i);
    const k = kandidaten.find((c) => c.L === 400 && c.B === 350 && c.H === 100);
    expect(k?.binnendozenPerDoos).toBe(49);
    const ind = k!.indeling!;
    expect(ind.nL * ind.nB * ind.nH).toBe(49);
    expect(k!.binnenmaat!.L + 50).toBe(400);
  });
});

describe('laagpatronen en verband', () => {
  it('vindt het vijfblokspatroon bij een groter raster (206 × 134: 31 per laag)', () => {
    const w = bereken(bestaand(206, 134, 200, 2, 1)).top[0].oplossing;
    expect(Math.max(...w.lagen.map((l) => l.dozen.length))).toBe(31);
  });

  it('zoekt verband in de volledige voorraad (156 × 136)', () => {
    const r = bereken(bestaand(156, 136, 200, 2, 1));
    expect(r.top[0].oplossing.stapelwijze).toBe('verband');
    expect(r.top[0].oplossing.buitendozenPerDrager).toBe(360);
  });

  it('gebruikt bij gelijk aantal ook de patronen met overhang voor verband (592 × 340)', () => {
    const i = bestaand(592, 340, 300, 10, 1);
    i.drager.overhangToegestaan = true;
    i.drager.overhang = { voor: 40, achter: 40, links: 40, rechts: 40 };
    const w = bereken(i).top[0].oplossing;
    expect(w.stapelwijze).toBe('verband');
    expect(w.buitendozenPerDrager).toBe(24);
  });

  it('bij twee lagen is één laagpaar in verband genoeg (426 × 382 × 900)', () => {
    const w = bereken(bestaand(426, 382, 900, 10, 1)).top[0].oplossing;
    expect(w.aantalLagen).toBe(2);
    expect(w.stapelwijze).toBe('verband');
    expect(w.buitendozenPerDrager).toBe(8);
  });

  it('markeert een niet bewezen laagindeling (kar 850 × 800, doos 300 × 250)', () => {
    const i = bestaand(300, 250, 200, 2, 1);
    i.drager = { ...i.drager, id: 'kar', naam: 'Kar', type: 'kar', lengte: 850, breedte: 800, hoogte: 200 };
    const r = bereken(i);
    expect(r.log.laagNietBewezen).toBe(true);
  });

  it('zoekt verband ook als de gewichtsgrens de rechte stapeling beperkt', () => {
    const i = standaardInvoer();
    i.artikelcode = 'R';
    i.drager.maxTotaalGewicht = 176;
    i.binnendoos = { L: 319, B: 266, H: 65, gewicht: 6.58, kantelbaar: true, magVerticaal: { L: false, B: true } };
    const w = bereken(i).top[0].oplossing;
    expect(w.binnendozenPerDrager).toBe(22);
    expect(w.stapelwijze).toBe('verband');
  });

  it('neemt patronen met overhang mee in de verbandzoektocht (392 × 116 × 200; 166 × 193 × 84)', () => {
    const metOverhang = (i: Invoer, aan = true) => {
      i.drager.overhangToegestaan = aan;
      i.drager.overhang = { voor: 2, achter: 5, links: 3, rechts: 22 };
      i.drager.asymmetrieToegestaan = false;
      return i;
    };
    // 392 × 116 × 200 mm: met de patronen uit het vlak met overhang 20 + 20 dozen per twee lagen (180 per drager, 2 mm
    // overhang voor en achter), zonder overhang 20 + 18 (172 per drager).
    const met = bereken(metOverhang(bestaand(392, 116, 200, 2, 1))).top[0].oplossing;
    expect([met.stapelwijze, met.lagen[0].dozen.length, met.lagen[1].dozen.length, met.buitendozenPerDrager]).toEqual(['verband', 20, 20, 180]);
    expect(met.overhang).toEqual({ voor: 2, achter: 2, links: 0, rechts: 0 });
    const zonder = bereken(metOverhang(bestaand(392, 116, 200, 2, 1), false)).top.find((t) => t.oplossing.stapelwijze === 'verband')!.oplossing;
    expect([zonder.lagen[0].dozen.length, zonder.lagen[1].dozen.length, zonder.buitendozenPerDrager]).toEqual([20, 18, 172]);
    // 166 × 193 × 84 mm: vóór #65 gaf verband met een laag uit het vlak met overhang 517 binnendozen (zonder overhang 506).
    // Nu is laag A een variant van het vijfblokspatroon en laag B die laag links-rechts gespiegeld: 24 + 24 dozen zonder
    // overhang, 528 binnendozen (#65).
    const i = metOverhang(standaardInvoer());
    i.artikelcode = 'R';
    i.binnendoos = { L: 166, B: 193, H: 84, gewicht: 1.24, kantelbaar: false, magVerticaal: { L: false, B: false } };
    const w = bereken(i).top[0].oplossing;
    expect([w.stapelwijze, w.binnendozenPerDrager]).toEqual(['verband', 528]);
    expect(w.overhang).toEqual({ voor: 0, achter: 0, links: 0, rechts: 0 });
  });

  it('een laag is pas bewezen maximaal als ook het vlak met overhang is gehaald', () => {
    const i = bestaand(191, 104, 200, 2, 1);
    i.drager.overhangToegestaan = true;
    i.drager.overhang = { voor: 41, achter: 2, links: 23, rechts: 8 };
    const r = bereken(i);
    const per = Math.max(...r.top[0].oplossing.lagen.map((l) => l.dozen.length));
    expect(per === 50 || r.log.laagNietBewezen).toBe(true);
  });
});
