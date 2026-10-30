// Ronde 9: drie punten van de gebruiker.
// 1. Bij het overschrijven van artikelen via de Excel-import werd niet alles meegenomen (omschrijving, kantelbaar, maten,
//    gewicht). Oorzaak: met het voorbeeldbestand (kolommen Kantelbaar, L mag verticaal en B mag verticaal) gaf Kantelbaar ja
//    met lege askolommen een fout, en een rij met een fout wordt helemaal niet geïmporteerd.
// 2. Bij een "vierkante" binnendoos (twee gelijke maten) is kantelen geen geldig alternatief: de gekantelde stand is dan
//    dezelfde doos als rechtop.
// 3. Verband telt alleen als het in de buurt van een blok zit: elke doos rust voor minstens de min. ondersteuning op de laag
//    eronder, en elke laag laat aan de rand van het blok hoogstens de max. inham leeg.

import { describe, expect, it } from 'vitest';
import { bereken, valideer } from '../src/engine/bereken';
import { standen } from '../src/engine/kandidaten';
import { hoofdmaat } from '../src/engine/rangschikking';
import { kopieDrager, STANDAARD_DRAGERS, standaardInvoer } from '../src/engine/standaard';
import type { Invoer, Oplossing, Rechthoek } from '../src/engine/types';
import { allesGesteund, inBlok, inham, kleinsteSteun, STANDAARD_MAX_INHAM, zoekVerband } from '../src/engine/verband';
import { metStandaard, STANDAARD_INSTELLINGEN, type Artikel } from '../src/data/opslag';
import { raadKoppeling, verwerk, type Rij } from '../src/import/excel';
import { leegFormulier, naarInvoer } from '../src/ui/formulier';

const NU = new Date('2026-10-28T12:00:00Z');

/** Ontwerp met de standaarden van de app: min. 2 per doos en per laag, vormregel zacht, europallet. */
function ontwerp(L: number, B: number, H: number, gewicht: number, kantel: { L: boolean; B: boolean } | null = null, extra: Partial<Invoer> = {}): Invoer {
  const i = standaardInvoer();
  i.artikelcode = 'R9';
  i.artikelenPerBinnendoos = 2;
  i.minBinnendozenPerDoos = 2;
  i.minBuitendozenPerLaag = 2;
  i.vormregel = 'zacht';
  i.binnendoos = { L, B, H, gewicht, kantelbaar: !!kantel, magVerticaal: kantel ?? { L: false, B: false } };
  return { ...i, ...extra };
}

const r = (x: number, y: number, w: number, d: number): Rechthoek => ({ x, y, w, d });
const maat = (o: Oplossing) => `${o.doos.L}x${o.doos.B}x${o.doos.H}`;

/** Voldoet een verbandoplossing aan de bloktoets van ronde 9 (lagen zoals gevonden, dus zonder uitlijnen)? */
function inDeBuurtVanEenBlok(o: Oplossing, minSteun = 0.75, maxInham = STANDAARD_MAX_INHAM): boolean {
  if (o.stapelwijze !== 'verband') return true;
  const [a, b] = o.lagen.map((l) => l.dozen);
  return allesGesteund(b, a, minSteun) && (o.aantalLagen < 3 || allesGesteund(a, b, minSteun)) && inBlok(a, b, maxInham);
}

describe('punt 1: overschrijven via de Excel-import', () => {
  const KOP = [
    'Artikelcode',
    'Lengte binnendoos (mm)',
    'Breedte binnendoos (mm)',
    'Hoogte binnendoos (mm)',
    'Gewicht binnendoos incl. inhoud (kg)',
    'Artikelen per binnendoos',
    'Omschrijving',
    'Kantelbaar (ja/nee)',
    'L mag verticaal (ja/nee)',
    'B mag verticaal (ja/nee)',
  ];
  const bestaand: Record<string, Artikel> = {
    'T-1': {
      artikelcode: 'T-1',
      omschrijving: '',
      artikelenPerBinnendoos: 2,
      zonderBinnendoos: false,
      binnendoos: { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } },
      bijgewerkt: '2026-10-01T00:00:00Z',
    },
  };

  it('Kantelbaar ja met lege askolommen in het voorbeeldbestand: maten, gewicht, omschrijving en kantelrechten worden overschreven', () => {
    const data: Rij[] = [KOP, ['T-1', 310, 210, 160, 2.5, 3, 'Nieuw', 'ja', null, null]];
    const [rij] = verwerk(data, raadKoppeling(KOP), bestaand, NU);
    expect(rij.fouten).toEqual([]);
    expect(rij.status).toBe('gewijzigd');
    expect(rij.artikel).toMatchObject({
      omschrijving: 'Nieuw',
      artikelenPerBinnendoos: 3,
      binnendoos: { L: 310, B: 210, H: 160, gewicht: 2.5, kantelbaar: true, magVerticaal: { L: true, B: true } },
    });
    expect(rij.wijzigingen).toEqual([
      'Lengte: 300 → 310 mm',
      'Breedte: 200 → 210 mm',
      'Hoogte: 150 → 160 mm',
      'Gewicht: 2 → 2.5 kg',
      'Artikelen per binnendoos: 2 → 3',
      'Omschrijving: "" → "Nieuw"',
      'Kantelbaar: nee → ja (L en B verticaal)',
    ]);
  });

  it('een expliciete tegenspraak blijft een fout, zodat er niets stilzwijgend verandert', () => {
    const [rij] = verwerk([KOP, ['T-1', 310, 210, 160, 2.5, 3, 'Nieuw', 'nee', 'ja', null]], raadKoppeling(KOP), bestaand, NU);
    expect(rij.status).toBe('fout');
    expect(rij.fouten).toEqual(['L mag verticaal is ja, maar Kantelbaar is nee.']);
  });
});

describe('punt 2: kantelen bij een vierkante binnendoos', () => {
  it('een gekantelde stand met dezelfde maten als rechtop of als een eerdere stand valt weg', () => {
    const asStand = (L: number, B: number, H: number, kL: boolean, kB: boolean) =>
      standen({ L, B, H, gewicht: 1, kantelbaar: true, magVerticaal: { L: kL, B: kB } }).map((s) => s.verticaal);
    // B = H: "B verticaal" is rechtop; "L verticaal" is een echte andere stand.
    expect(asStand(134, 550, 550, true, true)).toEqual(['H', 'L']);
    // L = H: "L verticaal" is rechtop.
    expect(asStand(300, 200, 300, true, true)).toEqual(['H', 'B']);
    // L = B: "L verticaal" en "B verticaal" zijn dezelfde gekantelde doos.
    expect(asStand(300, 300, 150, true, true)).toEqual(['H', 'L']);
    // Een kubus heeft maar één stand.
    expect(asStand(200, 200, 200, true, true)).toEqual(['H']);
    // Drie verschillende maten: alles blijft.
    expect(asStand(300, 200, 150, true, true)).toEqual(['H', 'L', 'B']);
  });

  it('binnendoos 134 × 550 × 550 mm, B verticaal toegestaan: geen kaart met dezelfde doos "gekanteld"', () => {
    const res = bereken(ontwerp(134, 550, 550, 2.2, { L: false, B: true }));
    expect(res.oplossingen.some((o) => o.doos.gekanteld)).toBe(false);
    const maten = res.top.map((t) => `${maat(t.oplossing)}|${t.oplossing.stapelwijze}`);
    expect(new Set(maten).size).toBe(maten.length);
    // Er is geen kantelkeuze meer om uit te leggen.
    expect(res.top[0].uitleg.join(' ')).not.toContain('Gekantelde binnendoos');
  });
});

describe('punt 3: verband in de buurt van een blok', () => {
  it('allesGesteund: elke doos rust voor minstens de min. ondersteuning op de laag eronder', () => {
    const onder = [r(0, 0, 400, 300), r(400, 0, 400, 300)];
    // Over de naad: 50% op elke doos, samen 100%.
    expect(allesGesteund([r(200, 0, 400, 300)], onder, 0.75)).toBe(true);
    // Half naast de laag: 50% steun.
    expect(allesGesteund([r(600, 0, 400, 300)], onder, 0.75)).toBe(false);
    expect(allesGesteund([r(600, 0, 400, 300)], onder, 0.5)).toBe(true);
    // Min. ondersteuning 0 zet de toets uit.
    expect(allesGesteund([r(2000, 0, 400, 300)], onder, 0)).toBe(true);
  });

  it('inham: lege ruimte aan de rand van het blok telt, een holte binnenin niet', () => {
    const blok = { x0: 0, x1: 300, y0: 0, y1: 300 };
    // Vier dozen rond een gat in het midden (een molen): het gat raakt de rand niet.
    const molen = [r(0, 0, 200, 100), r(200, 0, 100, 200), r(100, 200, 200, 100), r(0, 100, 100, 200)];
    expect(inham(molen, blok)).toBe(0);
    // Een open hoek van 100 × 100 is een inham van 1/9 van het blok.
    const hoek = [r(0, 0, 300, 100), r(0, 100, 300, 100), r(0, 200, 200, 100)];
    expect(inham(hoek, blok)).toBeCloseTo(1 / 9, 9);
  });

  it('inBlok: een L-vormige laag valt af, een gesloten laag met een holte binnenin niet', () => {
    // Twee dozen van 764 × 414 in een L: de open hoek is 350 × 764 mm, ruim 29% van het blok.
    const a = [r(18, 11, 764, 414), r(18, 425, 414, 764)];
    const b = [r(18, 775, 764, 414), r(18, 11, 414, 764)];
    expect(inBlok(a, b, 0.05)).toBe(false);
    expect(inBlok(a, b, 1)).toBe(true);
    const molen = [r(0, 0, 200, 100), r(200, 0, 100, 200), r(100, 200, 200, 100), r(0, 100, 100, 200)];
    expect(inBlok(molen, molen, 0.05)).toBe(true);
  });

  it('zoekVerband slaat een paar over dat niet in de buurt van een blok zit (afbeelding 2: twee dozen, de bovenste laag een L)', () => {
    const drager = kopieDrager(STANDAARD_DRAGERS[0]);
    const a = [r(0, 0, 614, 414), r(0, 414, 614, 414)];
    const l = [r(0, 0, 414, 614), r(0, 614, 614, 414)];
    // Het oude criterium (de helft van de dozen op twee of meer dozen) laat dit paar toe; de blokregel niet.
    expect(kleinsteSteun(l, a)).toBeLessThan(1);
    const u = zoekVerband([a, l], drager, 2, 0.75, 0.05);
    expect(u.eenzijdig).toBeNull();
    expect(u.tweezijdig).toBeNull();
  });

  it('de voorbeelden van de gebruiker: geen verband meer dat niet in de buurt van een blok zit', () => {
    // Afbeelding 2: 600 × 400 × 200 mm (614 × 414 × 828 mm, L-vormige bovenlaag). Afbeelding 3: 600 × 250 × 200 mm (zigzag,
    // 1856 mm). Afbeelding 4: 400 × 250 × 150 mm, 5 kg (7 per laag met een open hoek, 2056 mm). Afbeelding 1: 134 × 550 × 550 mm.
    const gevallen: [Invoer, string][] = [
      [ontwerp(600, 400, 200, 2), '614x414x628|recht|18'],
      [ontwerp(600, 250, 200, 2), '614x264x428|recht|40'],
      [ontwerp(400, 250, 150, 5), '414x264x478|recht|84'],
      [ontwerp(134, 550, 550, 2.2, { L: true, B: true }), '684x564x578|recht|30'],
    ];
    for (const [inv, winnaar] of gevallen) {
      const res = bereken(inv, { uitlijnen: false });
      const w = res.top[0].oplossing;
      expect(`${maat(w)}|${w.stapelwijze}|${hoofdmaat(w)}`).toBe(winnaar);
      for (const o of res.oplossingen) expect(inDeBuurtVanEenBlok(o), `${maat(o)} ${o.stapelwijze}`).toBe(true);
    }
  });

  it('de uitleg zegt het als er wel verband was, maar niet in de buurt van een blok', () => {
    // 600 × 400 × 200 mm: er ligt wel een paar in verband (afbeelding 2), maar dat zit niet in de buurt van een blok.
    const u = bereken(ontwerp(600, 400, 200, 2)).top[0].uitleg;
    expect(u[0]).toBe('Geen verband gevonden dat in de buurt van een blok zit; de lading staat recht.');
    expect(
      zoekVerband(
        [
          [r(0, 0, 614, 414), r(0, 414, 614, 414)],
          [r(0, 0, 414, 614), r(0, 614, 614, 414)],
        ],
        kopieDrager(STANDAARD_DRAGERS[0]),
        2,
      ).buitenBlok,
    ).toBe(true);
    // Een bestaande buitendoos van 400 × 390 mm op de europallet: zes dozen per laag, geen enkel paar ligt in verband.
    const i = standaardInvoer();
    i.instap = 'bestaandeBuitendoos';
    i.artikelcode = 'R9';
    i.binnendoos = undefined;
    i.bestaandeBuitendoos = { L: 400, B: 390, H: 300, gevuldGewicht: 12, binnendozenPerDoos: 6 };
    const w = bereken(i).top[0];
    expect([w.oplossing.stapelwijze, w.uitleg[0]]).toEqual(['recht', 'Geen geldig verband gevonden; de lading staat recht.']);
  });

  it('elk verband in de uitkomst haalt de bloktoets, ook bij kantelbaar en op de blokpallet', () => {
    const blok = kopieDrager(STANDAARD_DRAGERS[1]);
    const gevallen: Invoer[] = [
      ontwerp(250, 200, 200, 1),
      ontwerp(400, 250, 200, 2),
      ontwerp(250, 150, 200, 2),
      ontwerp(300, 150, 100, 2),
      ontwerp(200, 100, 100, 1, null, { drager: blok }),
      ontwerp(250, 200, 250, 2, { L: true, B: true }),
    ];
    for (const inv of gevallen) for (const o of bereken(inv, { uitlijnen: false }).oplossingen) expect(inDeBuurtVanEenBlok(o), `${maat(o)} ${o.stapelwijze}`).toBe(true);
  });

  it('een strengere max. inham of min. ondersteuning laat nooit een verband toe dat de toets niet haalt', () => {
    const inv = ontwerp(300, 200, 150, 2);
    for (const [minSteun, maxInham] of [
      [0.9, 0.05],
      [0.75, 0],
      [1, 0],
    ])
      for (const o of bereken({ ...inv, minSteun, maxInham }, { uitlijnen: false }).oplossingen) expect(inDeBuurtVanEenBlok(o, minSteun, maxInham)).toBe(true);
  });

  it('de max. inham: standaard 5%, in te stellen tussen 0 en 100%', () => {
    expect(STANDAARD_MAX_INHAM).toBe(0.05);
    expect(STANDAARD_INSTELLINGEN.maxInham).toBe(5);
    // Oude instellingen zonder max. inham krijgen de standaard.
    const oud = { ...STANDAARD_INSTELLINGEN } as Partial<typeof STANDAARD_INSTELLINGEN>;
    delete oud.maxInham;
    expect(metStandaard(oud).maxInham).toBe(5);
    const dragers = STANDAARD_DRAGERS.map(kopieDrager);
    const inv = naarInvoer(leegFormulier(STANDAARD_INSTELLINGEN, dragers), dragers, STANDAARD_INSTELLINGEN);
    expect(inv.maxInham).toBe(0.05);
    expect(inv.minSteun).toBe(0.75);
    expect(valideer({ ...ontwerp(300, 200, 150, 2), maxInham: 1.2 })).toContain('De max. inham per laag bij verband moet tussen 0 en 100% liggen.');
    expect(valideer({ ...ontwerp(300, 200, 150, 2), maxInham: 0 })).toEqual([]);
  });
});
