import { describe, expect, it } from 'vitest';
import { leesCsv, leesGetal, raadKoppeling, verwerk } from '../src/import/excel';
import type { Artikel } from '../src/data/opslag';

const kop = ['Artikelnummer', 'Omschrijving', 'Lengte binnendoos (mm)', 'Breedte binnendoos (mm)', 'Hoogte binnendoos (mm)', 'Gewicht binnendoos (kg)', 'Aantal artikelen per binnendoos'];

describe('kolomkoppeling', () => {
  it('herkent de kolommen uit het aangeleverde formaat', () => {
    const k = raadKoppeling(kop);
    expect(k.kolommen).toEqual({ artikelcode: 0, omschrijving: 1, L: 2, B: 3, H: 4, gewicht: 5, aantal: 6 });
    expect(k.eenheidLengte).toBe('mm');
    expect(k.eenheidGewicht).toBe('kg');
    expect(k.kopRij).toBe(true);
  });

  it('herkent cm in de kolomnamen', () => {
    expect(raadKoppeling(['Art.nr', 'Lengte (cm)', 'Breedte (cm)', 'Hoogte (cm)', 'Gewicht']).eenheidLengte).toBe('cm');
  });
});

describe('getallen', () => {
  it('leest komma en punt als decimaalteken', () => {
    expect(leesGetal('2,75')).toBe(2.75);
    expect(leesGetal('2.75')).toBe(2.75);
    expect(leesGetal('1.234,5')).toBe(1234.5);
    expect(leesGetal('1,234.5')).toBe(1234.5);
    expect(leesGetal(12)).toBe(12);
    expect(leesGetal('')).toBeNull();
    expect(leesGetal('abc')).toBeNull();
  });
});

describe('verwerken', () => {
  const k = raadKoppeling(kop);
  const bestaand: Record<string, Artikel> = {
    A1: {
      artikelcode: 'A1',
      omschrijving: 'Oud',
      artikelenPerBinnendoos: 1,
      zonderBinnendoos: false,
      binnendoos: { L: 100, B: 100, H: 100, gewicht: 1, kantelbaar: true, magVerticaal: { L: true, B: false } },
      bijgewerkt: '2026-01-01T00:00:00.000Z',
    },
  };

  it('markeert nieuw, gewijzigd, ongewijzigd en fout', () => {
    const rijen = verwerk(
      [
        kop,
        ['N1', 'Nieuw', 300, 200, 150, 2, null],
        ['A1', 'Oud', 100, 100, 120, 1, 1],
        ['A1', 'Dubbel', 1, 1, 1, 1, 1],
        ['', 'Geen code', 1, 1, 1, 1, 1],
        ['N2', 'Fout aantal', 1, 1, 1, 1, 1.5],
      ],
      k,
      bestaand,
    );
    expect(rijen.map((r) => r.status)).toEqual(['nieuw', 'gewijzigd', 'fout', 'fout', 'fout']);
    expect(rijen[0].artikel!.artikelenPerBinnendoos).toBe(1); // leeg = 1 (#35)
    expect(rijen[0].artikel!.binnendoos.kantelbaar).toBe(false); // standaard niet kantelbaar
    expect(rijen[1].wijzigingen).toEqual(['Hoogte: 100 → 120 mm']);
    expect(rijen[1].artikel!.binnendoos.kantelbaar).toBe(true); // kantelrechten blijven behouden
    expect(rijen[2].fouten[0]).toContain('dubbel');
    expect(rijen[3].rij).toBe(5);
  });

  it('rekent cm en gram om naar mm en kg', () => {
    const rijen = verwerk([['X', '', 30, 20, 15, 2500, 2]], { ...k, kopRij: false, eenheidLengte: 'cm', eenheidGewicht: 'g' }, {});
    expect(rijen[0].artikel!.binnendoos).toMatchObject({ L: 300, B: 200, H: 150, gewicht: 2.5 });
    expect(rijen[0].artikel!.artikelenPerBinnendoos).toBe(2);
  });

  it('slaat lege rijen over', () => {
    expect(verwerk([kop, [null, null, null], ['Y', '', 1, 1, 1, 1, null]], k, {})).toHaveLength(1);
  });
});

describe('CSV', () => {
  it('leest puntkomma-gescheiden met aanhalingstekens', () => {
    const r = leesCsv('Artikelnummer;Omschrijving;L\n"A;1";"Met ""quote""";12,5\r\nB2;Gewoon;3\n');
    expect(r).toEqual([
      ['Artikelnummer', 'Omschrijving', 'L'],
      ['A;1', 'Met "quote"', '12,5'],
      ['B2', 'Gewoon', '3'],
    ]);
  });
});
