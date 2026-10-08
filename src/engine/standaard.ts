// Standaardwaarden uit het ontwerp (§2, §3, #16, #39).

import type { Drager, Invoer, Materiaal, Tussenlaag } from './types';

export const GEEN_OVERHANG = { voor: 0, achter: 0, links: 0, rechts: 0 };

export const EUROPALLET: Drager = {
  id: 'europallet',
  naam: 'Europallet',
  type: 'pallet',
  lengte: 1200,
  breedte: 800,
  hoogte: 144,
  gewicht: 25,
  maxTotaalGewicht: 1000,
  maxTotaleHoogte: 2100,
  overhangToegestaan: false,
  overhang: { ...GEEN_OVERHANG },
  asymmetrieToegestaan: true,
};

export const BLOKPALLET: Drager = {
  id: 'blokpallet',
  naam: 'Blokpallet',
  type: 'pallet',
  lengte: 1200,
  breedte: 1000,
  hoogte: 140,
  gewicht: 30,
  maxTotaalGewicht: 1000,
  maxTotaleHoogte: 2100,
  overhangToegestaan: false,
  overhang: { ...GEEN_OVERHANG },
  asymmetrieToegestaan: true,
};

export const STANDAARD_DRAGERS: Drager[] = [EUROPALLET, BLOKPALLET];

export const TUSSENLAAG_STANDAARD = {
  karton: { dikte: 5, gewicht: 2 },
  hout: { dikte: 15, gewicht: 5 },
} as const;

export const GEEN_TUSSENLAAG: Tussenlaag = { soort: 'geen', naElkeN: 2, dikte: 0, gewicht: 0, maat: 'drager' };

export const GEEN_MATERIAAL: Materiaal = {
  bodemvel: { aan: false, dikte: 3, gewicht: 1 },
  topvel: { aan: false, dikte: 3, gewicht: 1 },
  hoekprofielen: { aan: false, gewicht: 2 },
  folie: { aan: false, gewicht: 1 },
};

export const MAX_GEVULD_GEWICHT = 23;

export function kopieDrager(d: Drager): Drager {
  return { ...d, overhang: { ...d.overhang } };
}

export function standaardInvoer(): Invoer {
  return {
    instap: 'binnendoos',
    artikelcode: '',
    artikelenPerBinnendoos: 1,
    binnendoos: { L: 0, B: 0, H: 0, gewicht: 0, kantelbaar: false, magVerticaal: { L: false, B: false } },
    doostype: { soort: '0201' },
    maxGevuldGewicht: MAX_GEVULD_GEWICHT,
    drager: kopieDrager(EUROPALLET),
    tussenlaag: { ...GEEN_TUSSENLAAG },
    materiaal: structuredClone(GEEN_MATERIAAL),
  };
}
