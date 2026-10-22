// Ronde 8: "Artikelen per binnendoos" is weer een vast aantal, zonder "min." (#67), en de Excel-import van artikelen
// leest ook of de binnendoos kantelbaar is en welke as verticaal mag staan (#68).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import readXlsxFile from 'read-excel-file/node';
import { describe, expect, it, vi } from 'vitest';

// svg2pdf.js heeft een browser nodig; voor de rijen van het rapport is het niet nodig.
vi.mock('svg2pdf.js', () => ({}));

import { bereken, valideer } from '../src/engine/bereken';
import { artikelenTekst } from '../src/engine/format';
import { STANDAARD_DRAGERS, kopieDrager, standaardInvoer } from '../src/engine/standaard';
import type { Invoer } from '../src/engine/types';
import { STANDAARD_INSTELLINGEN, type Artikel } from '../src/data/opslag';
import { kantelTekst, leesJaNee, raadKoppeling, VELDEN, verwerk, type Koppeling, type Rij } from '../src/import/excel';
import { blokken } from '../src/pdf/rapport';
import { leegFormulier, naarInvoer, type Formulier } from '../src/ui/formulier';
import { Artikelen, naarBewerk } from '../src/ui/Artikelen';
import { Berekenen } from '../src/ui/Berekenen';
import { Import } from '../src/ui/Import';
import { Kaart } from '../src/ui/Resultaten';

const dragers = STANDAARD_DRAGERS.map(kopieDrager);
const inst = STANDAARD_INSTELLINGEN;
const leeg = () => leegFormulier(inst, dragers);
const bron = (pad: string) => readFileSync(fileURLToPath(new URL(`../${pad}`, import.meta.url)), 'utf-8');
const NU = new Date('2026-10-16T12:00:00Z');

/** Binnendoos 300 × 200 × 150 mm, 2 kg, 2 artikelen per binnendoos, standaardinstellingen. */
function ontwerp(extra: Partial<Invoer> = {}): Invoer {
  const i = standaardInvoer();
  i.artikelcode = 'R8';
  i.artikelenPerBinnendoos = 2;
  i.binnendoos = { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } };
  return { ...i, ...extra };
}

function artikel(code: string, kantelbaar: boolean, L: boolean, B: boolean, extra: Partial<Artikel> = {}): Artikel {
  return {
    artikelcode: code,
    omschrijving: '',
    artikelenPerBinnendoos: 2,
    zonderBinnendoos: false,
    binnendoos: { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar, magVerticaal: { L, B } },
    bijgewerkt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

const scherm = (f: Formulier) =>
  renderToStaticMarkup(
    createElement(Berekenen, {
      formulier: f,
      setFormulier: () => {},
      artikelen: {},
      dragers,
      instellingen: inst,
      onArtikelOpslaan: async () => {},
      onBerekeningOpslaan: async () => {},
      onNaarOverzicht: async () => false,
    }),
  );

describe('artikelen per binnendoos: weer een vast aantal (#67)', () => {
  it('het veld heet in de import, de foutmeldingen en het voorbeeld van wat verandert "Artikelen per binnendoos"', () => {
    expect(VELDEN.find((v) => v.veld === 'aantal')!.naam).toBe('Artikelen per binnendoos');
    expect(valideer(ontwerp({ artikelenPerBinnendoos: 1.5 }))).toContain('Artikelen per binnendoos moet een geheel getal van minstens 1 zijn.');
    const k: Koppeling = { ...raadKoppeling(['Artikelcode', 'Lengte', 'Breedte', 'Hoogte', 'Gewicht', 'Artikelen per binnendoos']), kopRij: false };
    expect(k.kolommen.aantal).toBe(5);
    expect(verwerk([['A1', 300, 200, 150, 2, 0]], k, {})[0].fouten).toEqual(['Artikelen per binnendoos moet een geheel getal van minstens 1 zijn.']);
    const [rij] = verwerk([['A1', 300, 200, 150, 2, 4]], k, { A1: artikel('A1', false, false, false, { artikelenPerBinnendoos: 1 }) });
    expect(rij.wijzigingen).toEqual(['Artikelen per binnendoos: 1 → 4 ']);
  });

  it('de import herkent de nieuwe kop en de oude koppen nog steeds', () => {
    const kop = ['Artikelcode', 'Lengte binnendoos (mm)', 'Breedte binnendoos (mm)', 'Hoogte binnendoos (mm)', 'Gewicht binnendoos incl. inhoud (kg)'];
    for (const naam of ['Artikelen per binnendoos', 'Aantal artikelen per binnendoos', 'Min. aantal artikelen per binnendoos', 'Min. artikelen per binnendoos'])
      expect(raadKoppeling([...kop, naam]).kolommen).toEqual({ artikelcode: 0, L: 1, B: 2, H: 3, gewicht: 4, aantal: 5 });
  });

  it('het rekenscherm toont "Artikelen per binnendoos" met 2; de echte minimumvelden houden "Min."', () => {
    const html = scherm(leeg());
    expect(html).toContain('aria-label="Artikelen per binnendoos" value="2"');
    expect(html).not.toContain('Min. artikelen per binnendoos');
    expect(html).toContain('Min. binnendozen per buitendoos');
    expect(html).toContain('Min. buitendozen per laag');
  });

  it('het tabblad Artikelen: kolom "Artikelen per binnendoos"', () => {
    const tabel = renderToStaticMarkup(
      createElement(Artikelen, { artikelen: { A1: artikel('A1', false, false, false) }, onOpslaan: async () => {}, onVerwijder: async () => {}, onBereken: () => {} }),
    );
    expect(tabel).toContain('<th>Artikelen per binnendoos</th>');
    expect(tabel).not.toContain('Min. artikelen');
  });

  it('geen "min." of "minimum" meer bij het aantal artikelen in de bronteksten van schermen, rapport en rekenmodule', () => {
    // Het bewerkscherm en de foutmelding van het tabblad Artikelen zijn niet zonder klikken te tonen; dus via de bron.
    for (const pad of [
      'src/ui/Artikelen.tsx',
      'src/ui/Berekenen.tsx',
      'src/ui/Import.tsx',
      'src/ui/Resultaten.tsx',
      'src/pdf/rapport.ts',
      'src/engine/bereken.ts',
      'src/engine/format.ts',
    ]) {
      const tekst = bron(pad);
      expect(tekst, pad).not.toMatch(/min\. artikelen per binnendoos|minimum aantal artikelen|min\. aantal per doos|min\. quantity|artikelenIsMinimum/i);
    }
    expect(bron('src/ui/Artikelen.tsx')).toContain("setFout('Artikelen per binnendoos moet een geheel getal van minstens 1 zijn.')");
    expect(bron('src/ui/Artikelen.tsx')).toContain('<Getal label="Artikelen per binnendoos"');
  });

  it('de standaard 2 blijft; een artikel zonder binnendoos telt 1', () => {
    expect(leeg().artikelenPerBinnendoos).toBe('2');
    expect(naarBewerk().aantal).toBe('2');
    const k: Koppeling = { ...raadKoppeling(['Artikelcode', 'Lengte', 'Breedte', 'Hoogte', 'Gewicht', 'Artikelen per binnendoos']), kopRij: false };
    expect(verwerk([['A1', 300, 200, 150, 2, null]], k, {})[0].artikel!.artikelenPerBinnendoos).toBe(2);
    const f = { ...leeg(), artikelcode: 'X', zonderBinnendoos: true, bd: { L: '300', B: '200', H: '150', gewicht: '2', kantelbaar: false, magL: false, magB: false } };
    expect(naarInvoer(f, dragers, inst).artikelenPerBinnendoos).toBe(1);
  });

  it('de importpagina noemt het aantal zonder "minimum"', () => {
    const html = renderToStaticMarkup(createElement(Import, { artikelen: {}, onOpslaan: async () => {} }));
    expect(html).toContain('het aantal artikelen per binnendoos (leeg = 2)');
    expect(html).not.toContain('minimum');
  });
});

describe('artikelen per drager zonder "min." (#67)', () => {
  it('artikelenTekst geeft het kale aantal, in het Nederlands en Engels', () => {
    expect(artikelenTekst(240)).toBe('240');
    expect(artikelenTekst(240, 'en')).toBe('240');
    expect(artikelenTekst(1250)).toBe('1250');
  });

  it('de resultaatkaart toont het exacte aantal artikelen', () => {
    const t = bereken(ontwerp()).top[0];
    const o = t.oplossing;
    expect(o.artikelenPerDrager).toBe(o.binnendozenPerDrager! * 2);
    const html = renderToStaticMarkup(createElement(Kaart, { o, rol: t.rol, uitleg: t.uitleg, gekozen: false, onKies: () => {} }));
    expect(html).toContain(`<dt>Artikelen per drager</dt><dd>${o.artikelenPerDrager}</dd>`);
    expect(html).not.toContain('min.');
  });

  it('het rapport: "Aantal per doos" en een exact aantal artikelen per drager, ook in het Engels', () => {
    const r = bereken(ontwerp());
    const o = r.top[0].oplossing;
    const nl = blokken(r.invoer, o, 'nl');
    expect(nl.binnendoos.rijen[0]).toEqual(['Aantal per doos', '2']);
    expect(nl.drager.rijen.at(-1)).toEqual(['Artikelen per drager', String(o.artikelenPerDrager)]);
    const en = blokken(r.invoer, o, 'en');
    expect(en.binnendoos.rijen[0]).toEqual(['Quantity per box', '2']);
    expect(en.drager.rijen.at(-1)).toEqual(['Articles per carrier', String(o.artikelenPerDrager)]);
    expect(JSON.stringify([nl, en])).not.toMatch(/min\./i);
  });
});

describe('Excel-import: ja of nee lezen (#68)', () => {
  it('herkent ja en nee in allerlei vormen, hoofdletters tellen niet', () => {
    for (const ja of ['ja', 'JA', 'Ja', 'j', 'J', 'yes', 'Yes', 'y', 'Y', 'x', 'X', '1', ' ja ', 'true', 'TRUE', 'waar', 'WAAR', 1, true])
      expect(leesJaNee(ja), String(ja)).toBe(true);
    for (const nee of ['nee', 'NEE', 'n', 'N', 'no', 'No', '0', 'false', 'FALSE', 'onwaar', 'Onwaar', 0, false]) expect(leesJaNee(nee), String(nee)).toBe(false);
  });

  it('een lege cel is nee; iets anders is een fout (undefined)', () => {
    for (const leegte of ['', '   ', null, undefined]) expect(leesJaNee(leegte)).toBe(false);
    for (const fout of ['misschien', 'jaa', '2', 2, -1, 0.5, 'ok', new Date(2026, 9, 16)]) expect(leesJaNee(fout), String(fout)).toBeUndefined();
  });

  it('kantelTekst beschrijft de kantelrechten', () => {
    expect(kantelTekst({ kantelbaar: false, magVerticaal: { L: false, B: false } })).toBe('nee');
    expect(kantelTekst({ kantelbaar: false, magVerticaal: { L: true, B: true } })).toBe('nee');
    expect(kantelTekst({ kantelbaar: true, magVerticaal: { L: true, B: true } })).toBe('ja (L en B verticaal)');
    expect(kantelTekst({ kantelbaar: true, magVerticaal: { L: true, B: false } })).toBe('ja (L verticaal)');
    expect(kantelTekst({ kantelbaar: true, magVerticaal: { L: false, B: true } })).toBe('ja (B verticaal)');
  });
});

describe('Excel-import: kolommen voor kantelbaar herkennen (#68)', () => {
  const maten = ['Artikelcode', 'Lengte binnendoos (mm)', 'Breedte binnendoos (mm)', 'Hoogte binnendoos (mm)', 'Gewicht (kg)'];

  it('de drie velden staan in de kolomkoppeling, niet verplicht', () => {
    expect(VELDEN.filter((v) => ['kantelbaar', 'magL', 'magB'].includes(v.veld))).toEqual([
      { veld: 'kantelbaar', naam: 'Kantelbaar', verplicht: false },
      { veld: 'magL', naam: 'L mag verticaal', verplicht: false },
      { veld: 'magB', naam: 'B mag verticaal', verplicht: false },
    ]);
  });

  it('herkent Kantelbaar, L mag verticaal en B mag verticaal naast de maten', () => {
    expect(raadKoppeling([...maten, 'Kantelbaar', 'L mag verticaal', 'B mag verticaal']).kolommen).toEqual({
      artikelcode: 0,
      L: 1,
      B: 2,
      H: 3,
      gewicht: 4,
      kantelbaar: 5,
      magL: 6,
      magB: 7,
    });
  });

  it('"L mag verticaal" vóór de lengte wordt geen lengte; "Lengte binnendoos" wordt geen askolom', () => {
    expect(raadKoppeling(['L mag verticaal', 'B mag verticaal', 'Kantelbaar', ...maten]).kolommen).toEqual({
      magL: 0,
      magB: 1,
      kantelbaar: 2,
      artikelcode: 3,
      L: 4,
      B: 5,
      H: 6,
      gewicht: 7,
    });
    const zonder = raadKoppeling(maten).kolommen;
    expect(zonder.magL).toBeUndefined();
    expect(zonder.magB).toBeUndefined();
    expect(zonder.kantelbaar).toBeUndefined();
    // Ook de korte koppen L en B blijven de maten.
    expect(raadKoppeling(['Art.nr', 'L', 'B', 'H', 'Gewicht', 'L mag verticaal', 'B mag verticaal']).kolommen).toMatchObject({ L: 1, B: 2, H: 3, magL: 5, magB: 6 });
  });

  it('herkent ook Kantelen, Tilt, Lengte mag verticaal en Breedte mag verticaal', () => {
    for (const kop of ['Kantelen', 'Tilt', 'Kantelbaar (ja/nee)', 'kantelbaar?']) expect(raadKoppeling([...maten, kop]).kolommen.kantelbaar, kop).toBe(5);
    expect(raadKoppeling(['Lengte mag verticaal', 'Breedte mag verticaal', ...maten]).kolommen).toMatchObject({ magL: 0, magB: 1, L: 3, B: 4 });
    expect(raadKoppeling([...maten, 'Length may be vertical', 'Width may be vertical']).kolommen).toMatchObject({ L: 1, B: 2, magL: 5, magB: 6 });
  });

  it('een kop als "Hoogte (niet kantelen)" blijft de hoogte', () => {
    const k = raadKoppeling(['Artikelcode', 'Lengte', 'Breedte', 'Hoogte (niet kantelen)', 'Gewicht', 'Kantelbaar']).kolommen;
    expect(k).toMatchObject({ H: 3, kantelbaar: 5 });
  });
});

describe('Excel-import: kantelrechten verwerken (#68)', () => {
  const MATEN = ['Artikelcode', 'Lengte', 'Breedte', 'Hoogte', 'Gewicht'];
  /** Koppeling met de maten in A–E en de genoemde kantelkolommen vanaf F. */
  const koppeling = (...kantel: ('kantelbaar' | 'magL' | 'magB')[]): Koppeling => {
    const namen = { kantelbaar: 'Kantelbaar', magL: 'L mag verticaal', magB: 'B mag verticaal' };
    const k = raadKoppeling([...MATEN, ...kantel.map((v) => namen[v])]);
    expect(Object.keys(k.kolommen).sort()).toEqual([...['artikelcode', 'L', 'B', 'H', 'gewicht'], ...kantel].sort());
    return { ...k, kopRij: false };
  };
  const rij = (code: string, ...kantel: unknown[]): Rij => [code, 300, 200, 150, 2, ...kantel];
  const een = (k: Koppeling, r: Rij, bestaand: Record<string, Artikel> = {}) => verwerk([r], k, bestaand, NU)[0];
  const assen = (r: ReturnType<typeof een>) => [r.artikel!.binnendoos.kantelbaar, r.artikel!.binnendoos.magVerticaal.L, r.artikel!.binnendoos.magVerticaal.B];

  it('zonder kolom Kantelbaar: een nieuw artikel is niet kantelbaar, een bestaand artikel houdt zijn kantelrechten', () => {
    const k = koppeling();
    expect(assen(een(k, rij('N1')))).toEqual([false, false, false]);
    const oud = een(k, rij('A1'), { A1: artikel('A1', true, true, false) });
    expect(oud.status).toBe('ongewijzigd');
    expect(assen(oud)).toEqual([true, true, false]);
  });

  it('zonder kolom Kantelbaar tellen de askolommen niet mee', () => {
    const k = koppeling('magL', 'magB');
    expect(assen(een(k, rij('N1', 'ja', 'ja')))).toEqual([false, false, false]);
    const oud = een(k, rij('A1', 'nee', 'ja'), { A1: artikel('A1', true, true, false) });
    expect(oud.status).toBe('ongewijzigd');
    expect(assen(oud)).toEqual([true, true, false]);
    // Zelfs een ongeldige waarde geeft dan geen fout: de kolom doet niet mee.
    expect(een(k, rij('N2', 'misschien', '')).status).toBe('nieuw');
  });

  it('Kantelbaar leeg of nee: niet kantelbaar', () => {
    const k = koppeling('kantelbaar');
    for (const w of ['', null, undefined, 'nee', 'N', 0, false]) expect(assen(een(k, rij('N1', w))), String(w)).toEqual([false, false, false]);
    // Ook een rij die korter is dan de kolom Kantelbaar.
    expect(assen(een(k, rij('N1')))).toEqual([false, false, false]);
  });

  it('Kantelbaar ja zonder askolommen: L en B mogen allebei verticaal', () => {
    const k = koppeling('kantelbaar');
    for (const w of ['ja', 'x', 'X', 1, '1', 'waar', 'Yes', true]) expect(assen(een(k, rij('N1', w))), String(w)).toEqual([true, true, true]);
  });

  it('Kantelbaar ja met beide askolommen: die bepalen welke as verticaal mag', () => {
    const k = koppeling('kantelbaar', 'magL', 'magB');
    expect(assen(een(k, rij('N1', 'ja', 'ja', 'nee')))).toEqual([true, true, false]);
    expect(assen(een(k, rij('N1', 'ja', '', 'x')))).toEqual([true, false, true]);
    expect(assen(een(k, rij('N1', 'j', 'y', 1)))).toEqual([true, true, true]);
    expect(assen(een(k, rij('N1', 'nee', 'nee', 'nee')))).toEqual([false, false, false]);
  });

  it('Kantelbaar ja met één askolom: die as volgt de kolom, de andere mag niet', () => {
    expect(assen(een(koppeling('kantelbaar', 'magL'), rij('N1', 'ja', 'ja')))).toEqual([true, true, false]);
    expect(assen(een(koppeling('kantelbaar', 'magB'), rij('N1', 'ja', 'waar')))).toEqual([true, false, true]);
    expect(een(koppeling('kantelbaar', 'magL'), rij('N1', 'ja', 'nee')).fouten).toEqual(['Kantelbaar is ja, maar L en B mogen geen van beide verticaal staan.']);
  });

  it('Kantelbaar ja maar L en B allebei nee of leeg: een fout', () => {
    const k = koppeling('kantelbaar', 'magL', 'magB');
    for (const [l, b] of [
      ['nee', 'nee'],
      ['', ''],
      [null, 0],
    ]) {
      const r = een(k, rij('N1', 'ja', l, b));
      expect(r.status).toBe('fout');
      expect(r.fouten).toEqual(['Kantelbaar is ja, maar L en B mogen geen van beide verticaal staan.']);
    }
  });

  it('een as ja terwijl Kantelbaar nee of leeg is: een fout per as', () => {
    const k = koppeling('kantelbaar', 'magL', 'magB');
    expect(een(k, rij('N1', 'nee', 'ja', 'nee')).fouten).toEqual(['L mag verticaal is ja, maar Kantelbaar is nee.']);
    expect(een(k, rij('N1', '', '', 'x')).fouten).toEqual(['B mag verticaal is ja, maar Kantelbaar is nee.']);
    expect(een(k, rij('N1', 'n', 1, 'ja')).fouten).toEqual(['L mag verticaal is ja, maar Kantelbaar is nee.', 'B mag verticaal is ja, maar Kantelbaar is nee.']);
  });

  it('een ongeldige waarde: een duidelijke fout, zonder vervolgfouten', () => {
    const k = koppeling('kantelbaar', 'magL', 'magB');
    expect(een(k, rij('N1', 'misschien', 'ja', 'nee')).fouten).toEqual(['Kantelbaar moet ja of nee zijn, niet "misschien".']);
    expect(een(k, rij('N1', 'ja', 2, 'nee')).fouten).toEqual(['L mag verticaal moet ja of nee zijn, niet "2".']);
    expect(een(k, rij('N1', 'ja', 'nee', ' ok ')).fouten).toEqual(['B mag verticaal moet ja of nee zijn, niet "ok".']);
    // Samen met andere fouten in de rij.
    const r = verwerk([['N1', 0, 200, 150, 2, 'jaa', '', '']], k, {}, NU)[0];
    expect(r.fouten).toEqual(['Lengte ontbreekt of is geen getal groter dan 0.', 'Kantelbaar moet ja of nee zijn, niet "jaa".']);
  });

  it('wijzigingen van een bestaand artikel staan in het voorbeeld', () => {
    const k = koppeling('kantelbaar', 'magL', 'magB');
    const nieuwJa = een(koppeling('kantelbaar'), rij('A1', 'ja'), { A1: artikel('A1', false, false, false) });
    expect(nieuwJa.status).toBe('gewijzigd');
    expect(nieuwJa.wijzigingen).toEqual(['Kantelbaar: nee → ja (L en B verticaal)']);
    const breder = een(k, rij('A1', 'ja', 'ja', 'ja'), { A1: artikel('A1', true, true, false) });
    expect(breder.wijzigingen).toEqual(['Kantelbaar: ja (L verticaal) → ja (L en B verticaal)']);
    const uit = een(k, rij('A1', '', '', ''), { A1: artikel('A1', true, false, true) });
    expect(uit.wijzigingen).toEqual(['Kantelbaar: ja (B verticaal) → nee']);
    expect(assen(uit)).toEqual([false, false, false]);
    const zelfde = een(k, rij('A1', 'ja', 'ja', 'nee'), { A1: artikel('A1', true, true, false) });
    expect(zelfde.status).toBe('ongewijzigd');
    expect(zelfde.wijzigingen).toEqual([]);
    // Samen met een andere wijziging, in de vaste volgorde: maten, aantal, omschrijving, kantelbaar.
    const beide = verwerk([['A1', 300, 200, 160, 2, 'ja', 'nee', 'ja']], k, { A1: artikel('A1', false, false, false) }, NU)[0];
    expect(beide.wijzigingen).toEqual(['Hoogte: 150 → 160 mm', 'Kantelbaar: nee → ja (B verticaal)']);
  });

  it('een artikel zonder binnendoos krijgt bij herimport de kantelrechten uit de kolommen', () => {
    const r = een(koppeling('kantelbaar', 'magL'), rij('A1', 'ja', 'ja'), { A1: artikel('A1', false, false, false, { zonderBinnendoos: true, artikelenPerBinnendoos: 1 }) });
    expect(r.wijzigingen).toEqual(['Artikelen per binnendoos: 1 → 2 ', 'Kantelbaar: nee → ja (L verticaal)', 'Artikel zonder binnendoos → met binnendoos']);
    expect(assen(r)).toEqual([true, true, false]);
  });

  it('een kop in de eerste rij wordt overgeslagen; een CSV-achtige tekstrij werkt ook', () => {
    const data: Rij[] = [
      [...MATEN, 'Kantelbaar', 'L mag verticaal', 'B mag verticaal'],
      ['N1', '300', '200', '150', '2,5', 'Ja', 'Nee', 'Ja'],
    ];
    const [r] = verwerk(data, raadKoppeling(data[0]), {}, NU);
    expect(r.rij).toBe(2);
    expect(r.status).toBe('nieuw');
    expect(assen(r)).toEqual([true, false, true]);
  });
});

describe('voorbeeldbestand met kantelkolommen (#67, #68)', () => {
  const pad = fileURLToPath(new URL('../public/voorbeeld-artikelen.xlsx', import.meta.url));
  const lees = async () => (await readXlsxFile(pad)).map((b) => ({ naam: b.sheet, data: b.data as Rij[] }));

  it('de kopregel heeft "Artikelen per binnendoos" en de drie kantelkolommen', async () => {
    const [artikelen] = await lees();
    const kop = artikelen.data[0];
    expect(kop.slice(5)).toEqual(['Artikelen per binnendoos', 'Omschrijving', 'Kantelbaar (ja/nee)', 'L mag verticaal (ja/nee)', 'B mag verticaal (ja/nee)']);
    expect(kop).not.toContain('Min. aantal artikelen per binnendoos');
    // Het onaangeroerde voorbeeld blijft leeg (#53).
    expect(artikelen.data).toHaveLength(1);
    expect(verwerk(artikelen.data, raadKoppeling(kop), {})).toEqual([]);
  });

  it('de uitleg noemt de nieuwe kolommen en zegt niet meer "minstens"', async () => {
    const [, uitleg] = await lees();
    const rijen = uitleg.data.map((r) => r.map((c) => (c === null ? '' : String(c))));
    const regel = (kolom: string) => rijen.find((r) => r[0] === kolom)!;
    expect(regel('F').slice(1)).toEqual(['Artikelen per binnendoos', 'Hoeveel artikelen er in één binnendoos zitten, als geheel getal. Mag leeg blijven: leeg = 2.']);
    expect(regel('H')[1]).toBe('Kantelbaar (ja/nee)');
    expect(regel('H')[2]).toContain('leeg = nee');
    expect(regel('I')[1]).toBe('L mag verticaal (ja/nee)');
    expect(regel('J')[1]).toBe('B mag verticaal (ja/nee)');
    const alles = rijen.flat().join(' ');
    expect(alles).not.toContain('minstens in één binnendoos');
    expect(alles).not.toContain('Min. aantal');
    expect(alles).toContain('x (= ja)');
    expect(alles).toContain('Het werkblad Voorbeeld toont drie ingevulde rijen.');
  });

  it('het werkblad Voorbeeld importeert zonder fouten, met de kantelrechten', async () => {
    const bladen = await lees();
    const voorbeeld = bladen.find((b) => b.naam === 'Voorbeeld')!;
    expect(voorbeeld.data[0]).toEqual(bladen[0].data[0]);
    const k = raadKoppeling(voorbeeld.data[0]);
    expect(k.kolommen).toEqual({ artikelcode: 0, L: 1, B: 2, H: 3, gewicht: 4, aantal: 5, omschrijving: 6, kantelbaar: 7, magL: 8, magB: 9 });
    const rijen = verwerk(voorbeeld.data, k, {}, NU);
    expect(rijen.map((r) => [r.artikelcode, r.status, r.fouten])).toEqual([
      ['VOORBEELD-1', 'nieuw', []],
      ['VOORBEELD-2', 'nieuw', []],
      ['VOORBEELD-3', 'nieuw', []],
    ]);
    const [a, b, c] = rijen.map((r) => r.artikel!);
    expect([a.binnendoos.kantelbaar, a.binnendoos.magVerticaal]).toEqual([false, { L: false, B: false }]);
    expect([b.binnendoos.kantelbaar, b.binnendoos.magVerticaal]).toEqual([true, { L: true, B: false }]);
    expect([c.binnendoos.kantelbaar, c.binnendoos.magVerticaal]).toEqual([true, { L: true, B: true }]);
    expect(rijen.map((r) => r.artikel!.artikelenPerBinnendoos)).toEqual([4, 6, 2]);
    expect(rijen.map((r) => r.artikel!.omschrijving)).toEqual(['Kop en schotel', 'Vaas', 'Bordenset']);
  });

  it('ingevulde rijen op het werkblad Artikelen lezen ja en nee uit de kantelkolommen', async () => {
    const [artikelen] = await lees();
    const data: Rij[] = [...artikelen.data, ['A1', 300, 200, 150, 2.5, 4, 'Kop', 'x', '', 'ja'], ['B2', 400, 250, 120, 1.25, null, null, null, null, null]];
    const rijen = verwerk(data, raadKoppeling(data[0]), {}, NU);
    expect(rijen.map((r) => [r.artikelcode, r.status])).toEqual([
      ['A1', 'nieuw'],
      ['B2', 'nieuw'],
    ]);
    expect(rijen[0].artikel!.binnendoos).toMatchObject({ kantelbaar: true, magVerticaal: { L: false, B: true } });
    expect(rijen[1].artikel!.binnendoos).toMatchObject({ kantelbaar: false, magVerticaal: { L: false, B: false } });
  });
});
