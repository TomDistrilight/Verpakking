// Voorbeeldbestanden voor de Excel-import (public/): de app moet ze zonder aanpassen van de
// kolomkoppeling kunnen lezen, en het onaangeroerde voorbeeld voegt niets toe.

import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import readXlsxFile from 'read-excel-file/node';
import { bereken } from '../src/engine/bereken';
import { standaardInvoer } from '../src/engine/standaard';
import { regelUitBerekening, type Berekening } from '../src/data/opslag';
import { raadKoppeling, verwerk, type Rij } from '../src/import/excel';
import { verwerkLeverdata } from '../src/import/leverdata';

const pad = (naam: string) => fileURLToPath(new URL(`../public/${naam}`, import.meta.url));
const lees = async (naam: string) => (await readXlsxFile(pad(naam))).map((b) => ({ naam: b.sheet, data: b.data as Rij[] }));

const KOP_ARTIKELEN = [
  'Artikelcode',
  'Lengte binnendoos (mm)',
  'Breedte binnendoos (mm)',
  'Hoogte binnendoos (mm)',
  'Gewicht binnendoos incl. inhoud (kg)',
  'Aantal artikelen per binnendoos',
  'Omschrijving',
];

describe('voorbeeld artikelen', () => {
  it('heeft eerst het werkblad Artikelen met alleen de kopregel, daarna de uitleg', async () => {
    const bladen = await lees('voorbeeld-artikelen.xlsx');
    expect(bladen.map((b) => b.naam)).toEqual(['Artikelen', 'Uitleg']);
    expect(bladen[0].data).toEqual([KOP_ARTIKELEN]);
    expect(bladen[1].data.length).toBeGreaterThan(7);
  });

  it('de kolomnamen koppelen alle zeven velden aan A t/m G, in mm en kg', async () => {
    const [blad] = await lees('voorbeeld-artikelen.xlsx');
    const k = raadKoppeling(blad.data[0]);
    expect(k.kolommen).toEqual({ artikelcode: 0, L: 1, B: 2, H: 3, gewicht: 4, aantal: 5, omschrijving: 6 });
    expect(k.eenheidLengte).toBe('mm');
    expect(k.eenheidGewicht).toBe('kg');
    expect(k.kopRij).toBe(true);
  });

  it('het onaangeroerde voorbeeld geeft geen rijen', async () => {
    const [blad] = await lees('voorbeeld-artikelen.xlsx');
    expect(verwerk(blad.data, raadKoppeling(blad.data[0]), {})).toEqual([]);
  });

  it('ingevulde rijen worden nieuwe artikelen; een leeg aantal is 1', async () => {
    const [blad] = await lees('voorbeeld-artikelen.xlsx');
    const data: Rij[] = [...blad.data, ['A1', 300, 200, 150, 2.5, 4, 'Kop en schotel'], ['B2', '400', '250,5', 120, '1,25', null, null]];
    const rijen = verwerk(data, raadKoppeling(data[0]), {}, new Date('2026-10-09T12:00:00Z'));
    expect(rijen.map((r) => [r.rij, r.artikelcode, r.status])).toEqual([
      [2, 'A1', 'nieuw'],
      [3, 'B2', 'nieuw'],
    ]);
    const [a1, b2] = rijen.map((r) => r.artikel!);
    expect(a1.binnendoos).toMatchObject({ L: 300, B: 200, H: 150, gewicht: 2.5 });
    expect(a1.artikelenPerBinnendoos).toBe(4);
    expect(a1.omschrijving).toBe('Kop en schotel');
    expect(b2.binnendoos).toMatchObject({ L: 400, B: 250.5, H: 120, gewicht: 1.25 });
    expect(b2.artikelenPerBinnendoos).toBe(1);
    expect(b2.omschrijving).toBe('');
  });
});

describe('voorbeeld leverdata', () => {
  const invoer = (() => {
    const i = standaardInvoer();
    i.artikelcode = 'A1';
    i.binnendoos = { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } };
    return i;
  })();
  const resultaat = bereken(invoer);
  const berekening: Berekening = {
    nummer: '20261009-001',
    datum: '2026-10-09T10:00:00.000Z',
    artikelcode: 'A1',
    invoer,
    oplossing: resultaat.top[0].oplossing,
    top: resultaat.top,
    log: resultaat.log,
  };
  const regel = regelUitBerekening(berekening, resultaat.top[0].oplossing, 'nl');

  it('heeft eerst het werkblad Leverdata met alleen de kopregel, daarna de uitleg', async () => {
    const bladen = await lees('voorbeeld-leverdata.xlsx');
    expect(bladen.map((b) => b.naam)).toEqual(['Leverdata', 'Uitleg']);
    expect(bladen[0].data).toEqual([['Artikelcode', 'Verwachte leverdatum']]);
  });

  it('het onaangeroerde voorbeeld heeft een kopregel en geen rijen', async () => {
    const [blad] = await lees('voorbeeld-leverdata.xlsx');
    expect(verwerkLeverdata(blad.data, [regel])).toEqual({ rijen: [], kopRij: true });
  });

  it('een ingevulde datum werkt de open regel bij', async () => {
    const [blad] = await lees('voorbeeld-leverdata.xlsx');
    const { rijen, kopRij } = verwerkLeverdata([...blad.data, ['A1', new Date(Date.UTC(2026, 10, 15))]], [regel]);
    expect(kopRij).toBe(true);
    expect(rijen).toHaveLength(1);
    expect(rijen[0]).toMatchObject({ rij: 2, artikelcode: 'A1', datum: '2026-11-15', status: 'bijwerken', regels: [regel.id] });
  });
});
