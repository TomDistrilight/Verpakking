// Overzicht van gekozen oplossingen en de import van verwachte leverdata.

import { describe, expect, it } from 'vitest';
import { bereken } from '../src/engine/bereken';
import { standaardInvoer } from '../src/engine/standaard';
import { metStandaard, regelUitBerekening, sorteerOverzicht, zetInOverzicht, type Berekening, type GekozenOplossing } from '../src/data/opslag';
import { datumTekst, leesDatum, pasLeverdataToe, verwerkLeverdata } from '../src/import/leverdata';

const invoer = (() => {
  const i = standaardInvoer();
  i.artikelcode = 'A1';
  i.binnendoos = { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } };
  return i;
})();
const resultaat = bereken(invoer);

function berekening(nummer: string, artikelcode = 'A1'): Berekening {
  return {
    nummer,
    datum: '2026-10-09T10:00:00.000Z',
    artikelcode,
    invoer: { ...invoer, artikelcode },
    oplossing: resultaat.top[0].oplossing,
    top: resultaat.top,
    log: resultaat.log,
  };
}

function regel(artikelcode: string, w: Partial<GekozenOplossing> = {}): GekozenOplossing {
  return { ...regelUitBerekening(berekening(`20261009-${artikelcode}`, artikelcode), resultaat.top[0].oplossing, 'nl'), ...w };
}

describe('regels in het overzicht', () => {
  it('maakt een open regel uit een berekening', () => {
    const r = regelUitBerekening(berekening('20261009-001'), resultaat.top[1].oplossing, 'en', new Date('2026-10-09T12:00:00Z'));
    expect(r.nummer).toBe('20261009-001');
    expect(r.oplossing.id).toBe(resultaat.top[1].oplossing.id);
    expect(r.gecontroleerd).toBe(false);
    expect(r.verwachteLevering).toBeNull();
    expect(r.taal).toBe('en');
    expect(r.gekozenOp).toBe('2026-10-09T12:00:00.000Z');
    expect(r.id).not.toBe(regelUitBerekening(berekening('20261009-001'), resultaat.top[1].oplossing, 'en').id);
  });

  it('een nieuwe keuze vervangt de open regel van hetzelfde artikel en houdt leverdatum en taal', () => {
    const oud = regel('A1', { verwachteLevering: '2026-11-01', taal: 'en' });
    const ander = regel('B2');
    const nieuw = { ...regel('A1'), oplossing: resultaat.top[1].oplossing, nummer: '20261010-001' };
    const { lijst, vervangen } = zetInOverzicht([oud, ander], nieuw);
    expect(vervangen).toBe(true);
    expect(lijst).toHaveLength(2);
    const a1 = lijst.find((r) => r.artikelcode === 'A1')!;
    expect(a1.id).toBe(oud.id);
    expect(a1.nummer).toBe('20261010-001');
    expect(a1.oplossing.id).toBe(resultaat.top[1].oplossing.id);
    expect(a1.verwachteLevering).toBe('2026-11-01');
    expect(a1.taal).toBe('en');
  });

  it('een gecontroleerde regel blijft staan; de nieuwe keuze komt erbij', () => {
    const oud = regel('A1', { gecontroleerd: true, verwachteLevering: '2026-11-01' });
    const { lijst, vervangen } = zetInOverzicht([oud], regel('A1'));
    expect(vervangen).toBe(false);
    expect(lijst).toHaveLength(2);
    expect(lijst[0]).toBe(oud);
    expect(lijst[1].verwachteLevering).toBeNull();
  });

  it('sorteert op verwachte levering van vroeg naar laat, zonder datum achteraan', () => {
    const lijst = [
      regel('C', { verwachteLevering: null }),
      regel('B', { verwachteLevering: '2026-12-01' }),
      regel('A', { verwachteLevering: '2026-10-15' }),
      regel('D', { verwachteLevering: '2027-01-02' }),
    ];
    expect(sorteerOverzicht(lijst, 'levering').map((r) => r.artikelcode)).toEqual(['A', 'B', 'D', 'C']);
    expect(sorteerOverzicht(lijst, 'artikel').map((r) => r.artikelcode)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('vult de weergave aan voor oudere instellingen', () => {
    expect(metStandaard({ taal: 'en' }).overzicht).toEqual({ sortering: 'levering', verbergGecontroleerd: false });
    expect(metStandaard({ overzicht: { sortering: 'artikel' } as never }).overzicht.verbergGecontroleerd).toBe(false);
    expect(metStandaard({}).vormregel).toBe('breedte');
    expect(metStandaard({}).minBinnendozenPerDoos).toBe(1);
    expect(metStandaard({}).minBuitendozenPerLaag).toBe(1);
  });
});

describe('datums lezen', () => {
  it('leest datumcellen, serienummers en tekst', () => {
    expect(leesDatum(new Date(Date.UTC(2026, 9, 12)))).toBe('2026-10-12');
    expect(leesDatum(new Date(2026, 9, 12))).toBe('2026-10-12');
    expect(leesDatum(46307)).toBe('2026-10-12');
    expect(leesDatum(20261012)).toBe('2026-10-12');
    expect(leesDatum('12-10-2026')).toBe('2026-10-12');
    expect(leesDatum('12/10/2026')).toBe('2026-10-12');
    expect(leesDatum('12.10.26')).toBe('2026-10-12');
    expect(leesDatum('1-2-2027')).toBe('2027-02-01');
    expect(leesDatum('2026-10-12')).toBe('2026-10-12');
    expect(leesDatum('2026-10-12T00:00:00')).toBe('2026-10-12');
    expect(leesDatum(' 46307 ')).toBe('2026-10-12');
  });

  it('weigert geen of ongeldige datums', () => {
    for (const c of ['', '31-02-2026', '2026-13-01', 'morgen', null, undefined, true, Number.NaN, -5, '12-10'] as unknown[]) expect(leesDatum(c)).toBeNull();
  });

  it('toont een datum als dd-mm-jjjj', () => {
    expect(datumTekst('2026-10-12')).toBe('12-10-2026');
    expect(datumTekst(null)).toBe('');
  });
});

describe('leverdata importeren', () => {
  const lijst = [
    regel('1000466', { verwachteLevering: '2026-10-01' }),
    regel('2028463', { gecontroleerd: true, verwachteLevering: '2026-09-01' }),
    regel('2013186', { verwachteLevering: '2026-11-20' }),
    regel('2029248'),
  ];

  it('werkt open regels bij, slaat gecontroleerde en onbekende artikelen over en maakt niets aan', () => {
    const data = [
      ['Artikelnummer', 'Verwachte levering'],
      [1000466, new Date(Date.UTC(2026, 10, 15))],
      ['2028463', '01-12-2026'],
      ['9999999', '01-12-2026'],
      ['2013186', '20-11-2026'],
      ['2029248', 46400],
      ['', ''],
      ['2029248', '05-01-2027'],
      ['3000000', 'volgende week'],
      [null, '01-01-2027'],
    ];
    const { rijen, kopRij } = verwerkLeverdata(data, lijst);
    expect(kopRij).toBe(true);
    const status = Object.fromEntries(rijen.map((r) => [r.rij, r.status]));
    expect(status).toEqual({ 2: 'bijwerken', 3: 'gecontroleerd', 4: 'onbekend', 5: 'ongewijzigd', 6: 'bijwerken', 8: 'fout', 9: 'fout', 10: 'fout' });
    expect(rijen.find((r) => r.rij === 8)!.melding).toContain('dubbel');

    const nieuw = pasLeverdataToe(lijst, rijen);
    expect(nieuw).toHaveLength(lijst.length);
    const per = Object.fromEntries(nieuw.map((r) => [r.artikelcode, r.verwachteLevering]));
    expect(per).toEqual({ '1000466': '2026-11-15', '2028463': '2026-09-01', '2013186': '2026-11-20', '2029248': '2027-01-13' });
  });

  it('zonder kopregel telt de eerste rij mee', () => {
    const { rijen, kopRij } = verwerkLeverdata([['1000466', '15-11-2026']], lijst);
    expect(kopRij).toBe(false);
    expect(rijen[0].status).toBe('bijwerken');
  });

  it('een regel die intussen gecontroleerd is, krijgt geen nieuwe datum', () => {
    const { rijen } = verwerkLeverdata([['1000466', '15-11-2026']], lijst);
    const gecontroleerd = lijst.map((r) => (r.artikelcode === '1000466' ? { ...r, gecontroleerd: true } : r));
    expect(pasLeverdataToe(gecontroleerd, rijen).find((r) => r.artikelcode === '1000466')!.verwachteLevering).toBe('2026-10-01');
  });
});
