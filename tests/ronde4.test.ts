// Ronde 4: standaard minimaal 2, Nederlands als standaardtaal, kantelen niet verplicht en rekenen zonder buitendoos.

import { describe, expect, it } from 'vitest';
import { bereken, valideer } from '../src/engine/bereken';
import { binnendozenOpDrager } from '../src/engine/kandidaten';
import { rangschik } from '../src/engine/rangschikking';
import { standaardInvoer } from '../src/engine/standaard';
import type { Invoer, Oplossing } from '../src/engine/types';
import { INSTELLINGEN_VERSIE, metStandaard, STANDAARD_INSTELLINGEN } from '../src/data/opslag';
import { leegFormulier, naarInvoer, vanInvoer } from '../src/ui/formulier';
import { STANDAARD_DRAGERS, kopieDrager } from '../src/engine/standaard';

function ontwerp(L: number, B: number, H: number, gewicht: number, extra: Partial<Invoer> = {}): Invoer {
  const i = standaardInvoer();
  i.artikelcode = 'R4';
  i.binnendoos = { L, B, H, gewicht, kantelbaar: false, magVerticaal: { L: false, B: false } };
  return { ...i, ...extra };
}

describe('standaardinstellingen', () => {
  it('minimaal 2 binnendozen per doos en 2 buitendozen per laag, 75% ondersteuning', () => {
    expect(STANDAARD_INSTELLINGEN.minBinnendozenPerDoos).toBe(2);
    expect(STANDAARD_INSTELLINGEN.minBuitendozenPerLaag).toBe(2);
    expect(STANDAARD_INSTELLINGEN.minSteun).toBe(75);
    const f = leegFormulier(STANDAARD_INSTELLINGEN, STANDAARD_DRAGERS.map(kopieDrager));
    expect([f.minPerDoos, f.minPerLaag]).toEqual(['2', '2']);
  });

  it('oude instellingen met de oude standaard 1 krijgen 2; een later bewust gekozen 1 blijft', () => {
    expect(metStandaard({ minBinnendozenPerDoos: 1, minBuitendozenPerLaag: 1 })).toMatchObject({ minBinnendozenPerDoos: 2, minBuitendozenPerLaag: 2, versie: INSTELLINGEN_VERSIE });
    expect(metStandaard({ minBinnendozenPerDoos: 3, minBuitendozenPerLaag: 4 })).toMatchObject({ minBinnendozenPerDoos: 3, minBuitendozenPerLaag: 4 });
    expect(metStandaard({ minBinnendozenPerDoos: 1, minBuitendozenPerLaag: 1, versie: 2 })).toMatchObject({ minBinnendozenPerDoos: 1, minBuitendozenPerLaag: 1 });
  });

  it('de vervallen standaardtaal wordt niet meer bewaard; Nederlands is de standaard', () => {
    expect('taal' in metStandaard({ taal: 'en' } as never)).toBe(false);
  });
});

describe('kantelen mag, maar is niet verplicht', () => {
  it('134 × 550 × 553 mm, kantelbaar: rechtop met meer dozen wint (684 × 564 × 581, 30 per pallet)', () => {
    for (const mag of [
      { L: true, B: false },
      { L: false, B: true },
      { L: true, B: true },
    ]) {
      const i = ontwerp(134, 550, 553, 1.6, { vormregel: 'breedte', minBinnendozenPerDoos: 2, minBuitendozenPerLaag: 2 });
      i.binnendoos!.kantelbaar = true;
      i.binnendoos!.magVerticaal = mag;
      const r = bereken(i);
      const beste = Math.max(...r.oplossingen.filter((o) => !o.doos.gekanteld).map((o) => o.binnendozenPerDrager!));
      expect(beste).toBe(30);
      const w = r.top[0].oplossing;
      expect(w.doos.gekanteld).toBe(false);
    }
  });

  it('rechtop met meer dozen gaat ook voor een gekantelde collimodule-doos; gekanteld wint alleen bij minstens 10% meer', () => {
    const basis = bereken(ontwerp(300, 200, 150, 2)).top[0].oplossing;
    const maak = (id: string, gekanteld: boolean, module: string | null, aantal: number): Oplossing => ({
      ...basis,
      id,
      stapelwijze: 'recht',
      binnendozenPerDrager: aantal,
      doos: { ...basis.doos, L: module ? 594 : 614, B: module ? 394 : 414, gekanteld, module },
    });
    const i = ontwerp(300, 200, 150, 2);
    const r1 = rangschik([maak('gek-mod', true, '600 × 400', 100), maak('recht', false, null, 105)], i);
    expect(r1.top[0].oplossing.id).toBe('recht');
    const r2 = rangschik([maak('gek-mod', true, '600 × 400', 111), maak('recht', false, null, 100)], i);
    expect(r2.top[0].oplossing.id).toBe('gek-mod');
    expect(r2.top[0].uitleg.join(' ')).toContain('Collimodule');
    // Binnen dezelfde stand blijft de collimodule voorgaan.
    const r3 = rangschik([maak('mod', false, '600 × 400', 100), maak('meer', false, null, 105)], i);
    expect(r3.top[0].oplossing.id).toBe('mod');
    expect(r3.top[0].uitleg[0]).toContain('ook al geeft een doos zonder collimodule meer (105 tegen 100');
  });

  it('een rechtopstaande collimodule-doos blijft voorgaan op een gekantelde doos met meer (#5, #9)', () => {
    const basis = bereken(ontwerp(300, 200, 150, 2)).top[0].oplossing;
    const maak = (id: string, gekanteld: boolean, module: string | null, aantal: number): Oplossing => ({
      ...basis,
      id,
      stapelwijze: 'recht',
      binnendozenPerDrager: aantal,
      doos: { ...basis.doos, L: module ? 398 : 799, B: module ? 300 : 398, gekanteld, module },
    });
    const r = rangschik([maak('recht-mod', false, '400 × 300', 160), maak('gek', true, null, 180)], ontwerp(300, 200, 150, 2));
    expect(r.top[0].oplossing.id).toBe('recht-mod');
    // De uitleg volgt de volgorde van de stappen: eerst de collimodule, dan de kantelregel binnen de modulaire dozen.
    expect(r.top[0].uitleg[0]).toContain('Collimodule 400 × 300');
    // Echt voorbeeld uit de review: 384 × 143 × 157 mm, 1,2 kg, kantelbaar (B verticaal).
    const i = ontwerp(384, 143, 157, 1.2, { vormregel: 'breedte', minBinnendozenPerDoos: 2, minBuitendozenPerLaag: 2 });
    i.binnendoos!.kantelbaar = true;
    i.binnendoos!.magVerticaal = { L: false, B: true };
    const w = bereken(i).top[0].oplossing;
    expect(w.doos.gekanteld).toBe(false);
    expect(w.doos.module).not.toBeNull();
  });

  it('een gekantelde collimodule-doos wint niet van rechtop met meer, ook niet als er een zwakkere rechtopstaande collimodule is', () => {
    const basis = bereken(ontwerp(300, 200, 150, 2)).top[0].oplossing;
    const maak = (id: string, gekanteld: boolean, module: string | null, aantal: number): Oplossing => ({
      ...basis,
      id,
      stapelwijze: 'recht',
      binnendozenPerDrager: aantal,
      doos: { ...basis.doos, L: module ? 294 : 534, B: module ? 198 : 106, gekanteld, module },
    });
    const r = rangschik([maak('gek-mod', true, '300 × 200', 160), maak('recht-mod', false, '300 × 200', 128), maak('recht', false, null, 180)], ontwerp(300, 200, 150, 2));
    expect(r.top[0].oplossing.id).toBe('recht-mod');
    expect(r.top[0].uitleg[0]).toContain('Gekantelde binnendoos geeft 160 tegen 180');
    // Echt voorbeeld uit de review: 92 × 130 × 280 mm, 5 kg, kantelbaar.
    const i = ontwerp(92, 130, 280, 5, { vormregel: 'breedte', minBinnendozenPerDoos: 2, minBuitendozenPerLaag: 2 });
    i.binnendoos!.kantelbaar = true;
    i.binnendoos!.magVerticaal = { L: true, B: true };
    const res = bereken(i);
    const besteRechtop = Math.max(...res.oplossingen.filter((o) => !o.doos.gekanteld).map((o) => o.binnendozenPerDrager!));
    const w = res.top[0].oplossing;
    expect(!w.doos.gekanteld || w.binnendozenPerDrager! * 10 >= besteRechtop * 11).toBe(true);
  });

  it('kantelt de kantelregel eerst (alleen gekantelde collimodule), dan staat die zin eerst in de uitleg', () => {
    const basis = bereken(ontwerp(300, 200, 150, 2)).top[0].oplossing;
    const maak = (id: string, gekanteld: boolean, module: string | null, aantal: number): Oplossing => ({
      ...basis,
      id,
      stapelwijze: 'recht',
      binnendozenPerDrager: aantal,
      doos: { ...basis.doos, L: module ? 594 : 614, B: module ? 394 : 414, gekanteld, module },
    });
    const r = rangschik([maak('gek-mod', true, '600 × 400', 111), maak('recht', false, null, 100)], ontwerp(300, 200, 150, 2));
    expect(r.top[0].uitleg[0]).toContain('Gekantelde binnendoos geeft 111 tegen 100');
    expect(r.top[0].uitleg[1]).toContain('Collimodule 600 × 400');
  });
});

describe('zonder buitendoos', () => {
  it('de binnendoos zelf gaat op de drager, in elke toegestane stand', () => {
    const i = ontwerp(600, 400, 300, 40, { zonderBuitendoos: true });
    i.binnendoos!.kantelbaar = true;
    i.binnendoos!.magVerticaal = { L: false, B: true };
    const { kandidaten } = binnendozenOpDrager(i);
    expect(kandidaten.map((d) => [d.L, d.B, d.H, d.gekanteld])).toEqual([
      [600, 400, 300, false],
      [600, 300, 400, true],
    ]);
    for (const d of kandidaten) {
      expect(d.geenBuitendoos).toBe(true);
      expect(d.binnendozenPerDoos).toBe(1);
      expect(d.eigenGewicht).toBe(0);
      expect(d.gevuldGewicht).toBe(40);
    }
  });

  it('rekent ook voor een artikel zwaarder dan de max. gevulde buitendoos en negeert min. per doos en vormregel', () => {
    const i = ontwerp(600, 400, 300, 40, { zonderBuitendoos: true, minBinnendozenPerDoos: 5, vormregel: 'breedte', minBuitendozenPerLaag: 2 });
    const r = bereken(i);
    const w = r.top[0].oplossing;
    expect(w.doos.geenBuitendoos).toBe(true);
    expect([w.doos.L, w.doos.B, w.doos.H]).toEqual([600, 400, 300]);
    expect(w.lagen[0].dozen.length).toBe(4);
    expect(w.doos.module).toBe('600 × 400');
    expect(w.binnendozenPerDrager).toBe(w.buitendozenPerDrager);
  });

  it('verborgen velden (doostype, max. gevulde buitendoos) blokkeren de berekening niet', () => {
    const i = ontwerp(600, 400, 300, 10, {
      zonderBuitendoos: true,
      maxGevuldGewicht: Number.NaN,
      doostype: { soort: 'custom', toeslagL: Number.NaN, toeslagB: 14, toeslagH: 28, kartonmassa: 0.75 },
    });
    expect(valideer(i)).toEqual([]);
    expect(bereken(i).top.length).toBeGreaterThan(0);
    // Met buitendoos blijven die velden wel verplicht.
    expect(valideer({ ...i, zonderBuitendoos: undefined }).length).toBeGreaterThan(0);
  });

  it('een groot artikel met één per laag: de melding noemt het veld om te verlagen', () => {
    const r = bereken(ontwerp(1000, 700, 500, 50, { zonderBuitendoos: true, minBuitendozenPerLaag: 2 }));
    expect(r.oplossingen).toHaveLength(0);
    expect(r.geenOplossing.join(' ')).toContain('De binnendoos past hoogstens 1 keer in een laag; het minimum is 2 binnendozen per laag. Verlaag "Min. binnendozen per laag" bij Ladingdrager, bijvoorbeeld naar 1.');
    const artikel = bereken(ontwerp(1100, 750, 900, 50, { zonderBuitendoos: true, zonderBinnendoos: true, minBuitendozenPerLaag: 2 }));
    expect(artikel.geenOplossing.join(' ')).toContain('Het artikel past hoogstens 1 keer in een laag; het minimum is 2 artikelen per laag.');
    expect(bereken(ontwerp(1000, 700, 500, 50, { zonderBuitendoos: true, minBuitendozenPerLaag: 1 })).top.length).toBeGreaterThan(0);
  });

  it('een verborgen custom doostype blokkeert een bestaande buitendoos niet', () => {
    const i = ontwerp(100, 100, 100, 1, { doostype: { soort: 'custom', toeslagL: Number.NaN, toeslagB: 14, toeslagH: 28, kartonmassa: 0.75 } });
    i.instap = 'bestaandeBuitendoos';
    i.bestaandeBuitendoos = { L: 400, B: 300, H: 200, gevuldGewicht: 10 };
    expect(valideer(i)).toEqual([]);
  });

  it('getallen die in een back-up null zijn geworden, geven lege velden; artikel zonder binnendoos blijft bewaard', () => {
    const dragers = STANDAARD_DRAGERS.map(kopieDrager);
    const f = {
      ...leegFormulier(STANDAARD_INSTELLINGEN, dragers),
      artikelcode: 'X',
      zonderBinnendoos: true,
      zonderBuitendoos: true,
      maxGevuld: '',
      bd: { L: '600', B: '400', H: '300', gewicht: '40', kantelbaar: false, magL: false, magB: false },
    };
    const i = JSON.parse(JSON.stringify(naarInvoer(f, dragers, STANDAARD_INSTELLINGEN)));
    expect(i.maxGevuldGewicht).toBeNull();
    const terug = vanInvoer(i, leegFormulier(STANDAARD_INSTELLINGEN, dragers));
    expect(terug.maxGevuld).toBe('');
    expect(terug.zonderBinnendoos).toBe(true);
    expect(terug.zonderBuitendoos).toBe(true);
  });

  it('het minimum per laag blijft gelden, met een melding over de binnendoos', () => {
    const r = bereken(ontwerp(600, 400, 300, 10, { zonderBuitendoos: true, minBuitendozenPerLaag: 5 }));
    expect(r.oplossingen).toHaveLength(0);
    expect(r.geenOplossing.join(' ')).toContain('De binnendoos past hoogstens 4 keer in een laag');
  });

  it('het formulier geeft de keuze door, zonder minimum per doos, en zet hem terug bij openen', () => {
    const dragers = STANDAARD_DRAGERS.map(kopieDrager);
    const f = { ...leegFormulier(STANDAARD_INSTELLINGEN, dragers), artikelcode: 'X', zonderBuitendoos: true, bd: { L: '600', B: '400', H: '300', gewicht: '40', kantelbaar: false, magL: false, magB: false } };
    const i = naarInvoer(f, dragers, STANDAARD_INSTELLINGEN);
    expect(i.zonderBuitendoos).toBe(true);
    expect(i.minBinnendozenPerDoos).toBeUndefined();
    expect(i.minSteun).toBe(0.75);
    expect(vanInvoer(i, leegFormulier(STANDAARD_INSTELLINGEN, dragers)).zonderBuitendoos).toBe(true);
    const zonder = naarInvoer({ ...f, zonderBuitendoos: false }, dragers, STANDAARD_INSTELLINGEN);
    expect(zonder.zonderBuitendoos).toBeUndefined();
    expect(zonder.minBinnendozenPerDoos).toBe(2);
  });
});

describe('dozen tegen de rand van de drager', () => {
  it('praktijkcase 1000466 (790 × 380 mm): in laag B staat doos 3 tegen de rechterrand', () => {
    const i = standaardInvoer();
    i.instap = 'bestaandeBuitendoos';
    i.artikelcode = '1000466';
    i.binnendoos = undefined;
    i.bestaandeBuitendoos = { L: 790, B: 380, H: 275, gevuldGewicht: 13.5, binnendozenPerDoos: 12 };
    const zonder = bereken(i, { uitlijnen: false }).top[0].oplossing;
    const met = bereken(i).top[0].oplossing;
    expect(zonder.lagen[1].dozen[2].x + zonder.lagen[1].dozen[2].w).toBeLessThan(800);
    expect(met.lagen[1].dozen[2].x + met.lagen[1].dozen[2].w).toBe(800);
    expect(met.lagen[1].dozen[1].x).toBe(0);
    // Aantallen, hoogte en gewicht blijven gelijk; ook de oplossing in de rangorde is uitgelijnd.
    expect([met.buitendozenPerDrager, met.totaleHoogte, met.totaalGewicht]).toEqual([zonder.buitendozenPerDrager, zonder.totaleHoogte, zonder.totaalGewicht]);
    expect(bereken(i).oplossingen[0]).toEqual(met);
  });
});
