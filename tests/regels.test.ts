// Ronde 3: minimumaantallen per doos en per laag, en de vormregel (breder en langer gaat voor hoger).

import { describe, expect, it } from 'vitest';
import { bereken, valideer } from '../src/engine/bereken';
import { ontwerpKandidaten } from '../src/engine/kandidaten';
import { rangschik } from '../src/engine/rangschikking';
import { standaardInvoer } from '../src/engine/standaard';
import type { Buitendoos, Invoer, Oplossing, Vormregel } from '../src/engine/types';

function ontwerp(L: number, B: number, H: number, gewicht: number, extra: Partial<Invoer> = {}): Invoer {
  const i = standaardInvoer();
  i.artikelcode = 'R3';
  i.binnendoos = { L, B, H, gewicht, kantelbaar: false, magVerticaal: { L: false, B: false } };
  return { ...i, ...extra };
}

const indeling = (o: Oplossing) => {
  const d = o.doos.indeling!;
  return `${d.nL}x${d.nB}x${d.nH}`;
};

describe('vormregel', () => {
  it('uit: de hoge kolom van binnendozen wint, zoals voorheen', () => {
    const w = bereken(ontwerp(100, 100, 50, 0.3, { vormregel: 'uit' })).top[0].oplossing;
    expect([w.doos.L, w.doos.B, w.doos.H]).toEqual([214, 114, 978]);
    expect(w.binnendozenPerDrager).toBe(2888);
  });

  it('breedte: de doos is niet hoger dan breed (100 × 100 × 50 geeft 414 × 314 × 278)', () => {
    const r = bereken(ontwerp(100, 100, 50, 0.3, { vormregel: 'breedte' }));
    const w = r.top[0].oplossing;
    expect([w.doos.L, w.doos.B, w.doos.H]).toEqual([414, 314, 278]);
    expect(indeling(w)).toBe('4x3x5');
    expect(w.binnendozenPerDrager).toBe(2520);
    for (const o of r.oplossingen) expect(o.doos.H <= o.doos.B || o.doos.indeling!.nH === 1).toBe(true);
    expect(r.log.afgewezen.vorm).toBeGreaterThan(0);
  });

  it('lengte: de doos is niet hoger dan lang (milder)', () => {
    const r = bereken(ontwerp(100, 100, 50, 0.3, { vormregel: 'lengte' }));
    const w = r.top[0].oplossing;
    expect([w.doos.L, w.doos.B, w.doos.H]).toEqual([714, 114, 478]);
    for (const o of r.oplossingen) expect(o.doos.H <= o.doos.L || o.doos.indeling!.nH === 1).toBe(true);
  });

  it('één laag binnendozen mag altijd, ook als de doos dan hoger is dan breed', () => {
    const { kandidaten } = ontwerpKandidaten(ontwerp(60, 40, 120, 0.15, { vormregel: 'breedte' }));
    const hoog = (d: Buitendoos) => d.H > d.B;
    expect(kandidaten.some((d) => hoog(d) && d.indeling!.nH === 1)).toBe(true);
    expect(kandidaten.some((d) => [d.L, d.B, d.H].join('x') === '74x54x148')).toBe(true);
    expect(kandidaten.filter((d) => hoog(d) && d.indeling!.nH > 1)).toHaveLength(0);
  });

  it('geldt niet voor een bestaande buitendoos', () => {
    const i = ontwerp(100, 100, 100, 0.5, { vormregel: 'breedte' });
    i.instap = 'bestaandeBuitendoos';
    i.bestaandeBuitendoos = { L: 214, B: 114, H: 728, gevuldGewicht: 8, binnendozenPerDoos: 14 };
    const r = bereken(i);
    expect(r.top[0].oplossing.doos.H).toBe(728);
  });

  it('meldt de vormregel als die alle dozen wegstreept', () => {
    // Min. hoogte 300 vraagt minstens 3 lagen binnendozen; max. breedte 200 maakt elke doos dan hoger dan breed.
    const i = ontwerp(150, 100, 100, 0.5, { vormregel: 'breedte', minBuitenmaat: { H: 300 }, maxBuitenmaat: { B: 200 } });
    const r = bereken(i);
    expect(r.oplossingen).toHaveLength(0);
    expect(r.geenOplossing.join(' ')).toContain('vormregel');
  });

  it('bij een gelijk aantal per drager gaat de plattere doos voor', () => {
    const basis = bereken(ontwerp(100, 100, 50, 0.3, { vormregel: 'uit' })).top[0].oplossing;
    const doos = (L: number, B: number, H: number, n: number): Oplossing => ({
      ...basis,
      id: `${L}x${B}x${H}`,
      stapelwijze: 'recht',
      binnendozenPerDrager: 1200,
      doos: { ...basis.doos, L, B, H, binnendozenPerDoos: n, gekanteld: false, module: null },
    });
    const hoog = doos(414, 314, 278, 60);
    const plat = doos(614, 414, 128, 48);
    const i = ontwerp(100, 100, 50, 0.3);
    expect(rangschik([hoog, plat], i).top[0].oplossing.id).toBe(plat.id);
    expect(rangschik([plat, hoog], i).top[0].oplossing.id).toBe(plat.id);
  });
});

describe('minimum binnendozen per buitendoos', () => {
  it('geen enkele ontworpen doos heeft minder binnendozen dan het minimum', () => {
    const r = bereken(ontwerp(300, 200, 150, 2, { vormregel: 'breedte', minBinnendozenPerDoos: 4 }));
    expect(r.oplossingen.length).toBeGreaterThan(0);
    for (const o of r.oplossingen) expect(o.doos.binnendozenPerDoos!).toBeGreaterThanOrEqual(4);
    expect(r.log.afgewezen.minBinnendozen).toBeGreaterThan(0);
    // Zonder minimum wint een doos met 2 binnendozen.
    expect(bereken(ontwerp(300, 200, 150, 2, { vormregel: 'breedte' })).top[0].oplossing.doos.binnendozenPerDoos).toBe(2);
  });

  it('meldt het gewicht als het minimum niet in één doos past', () => {
    const r = bereken(ontwerp(300, 200, 150, 2, { minBinnendozenPerDoos: 12 }));
    expect(r.oplossingen).toHaveLength(0);
    expect(r.geenOplossing.join(' ')).toContain('12 binnendozen wegen samen al 24 kg');
  });

  it('noemt het minimum per laag niet als dat niet de oorzaak is', () => {
    const r = bereken(ontwerp(300, 200, 150, 2, { minBinnendozenPerDoos: 12, minBuitendozenPerLaag: 2 }));
    expect(r.oplossingen).toHaveLength(0);
    const t = r.geenOplossing.join(' ');
    expect(t).toContain('12 binnendozen wegen samen al 24 kg');
    expect(t).not.toContain('per laag');
  });

  it('noemt het minimum per laag als alleen dat de oorzaak is', () => {
    const r = bereken(ontwerp(300, 200, 150, 2, { minBuitendozenPerLaag: 40 }));
    expect(r.oplossingen).toHaveLength(0);
    expect(r.geenOplossing.join(' ')).toContain('Geen oplossing met minstens 40 buitendozen per laag');
  });

  it('geldt niet voor een bestaande buitendoos', () => {
    const i = ontwerp(100, 100, 100, 0.5, { minBinnendozenPerDoos: 50 });
    i.instap = 'bestaandeBuitendoos';
    i.bestaandeBuitendoos = { L: 214, B: 214, H: 228, gevuldGewicht: 4, binnendozenPerDoos: 8 };
    expect(bereken(i).top.length).toBeGreaterThan(0);
  });
});

describe('minimum buitendozen per laag', () => {
  it('elke laag heeft minstens het minimum aantal dozen, ook bij verband', () => {
    for (const vorm of ['uit', 'breedte'] as Vormregel[]) {
      const r = bereken(ontwerp(300, 200, 150, 2, { vormregel: vorm, minBuitendozenPerLaag: 7 }));
      expect(r.oplossingen.length).toBeGreaterThan(0);
      for (const o of r.oplossingen) for (const l of o.lagen) expect(l.dozen.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('een doos zo groot als de europallet valt af bij minimaal 2 per laag', () => {
    const i = ontwerp(100, 80, 60, 0.05, { vormregel: 'uit', minBuitendozenPerLaag: 2 });
    const r = bereken(i);
    for (const o of r.oplossingen) expect(Math.min(...o.lagen.map((l) => l.dozen.length))).toBeGreaterThanOrEqual(2);
    const zonder = bereken({ ...i, minBuitendozenPerLaag: 1 });
    expect(zonder.oplossingen.some((o) => o.lagen[0].dozen.length === 1)).toBe(true);
  });

  it('meldt het maximum per laag bij een bestaande buitendoos', () => {
    const i = ontwerp(100, 100, 100, 0.5, { minBuitendozenPerLaag: 5 });
    i.instap = 'bestaandeBuitendoos';
    i.binnendoos = undefined;
    i.bestaandeBuitendoos = { L: 600, B: 400, H: 300, gevuldGewicht: 10 };
    const r = bereken(i);
    expect(r.oplossingen).toHaveLength(0);
    expect(r.geenOplossing.join(' ')).toContain('De buitendoos past hoogstens 4 keer in een laag; het minimum is 5 buitendozen per laag.');
  });
});

describe('invoercontrole minimumaantallen en vormregel', () => {
  it('meldt een ongeldig minimum', () => {
    const fouten = valideer(ontwerp(100, 100, 50, 0.3, { minBinnendozenPerDoos: 0, minBuitendozenPerLaag: 1.5 })).join(' ');
    expect(fouten).toContain('Min. binnendozen per buitendoos');
    expect(fouten).toContain('Min. buitendozen per laag');
    expect(valideer(ontwerp(100, 100, 50, 0.3, { minBinnendozenPerDoos: Number.NaN }))).not.toHaveLength(0);
    expect(valideer(ontwerp(100, 100, 50, 0.3, { vormregel: 'schuin' as Vormregel }))).toContain('Onbekende vormregel.');
  });
});
