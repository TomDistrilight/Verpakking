// Opslag in de browser (IndexedDB via idb-keyval), ontwerp §6 en #38: geen server, één gebruiker,
// back-up via export en import van een JSON-bestand.

import { createStore, get, set, del } from 'idb-keyval';
import type { Binnendoos, Doostype, Drager, Invoer, Materiaal, Oplossing, Resultaat, TopOplossing, Tussenlaag } from '../engine/types';
import { GEEN_MATERIAAL, GEEN_TUSSENLAAG, MAX_GEVULD_GEWICHT, STANDAARD_DRAGERS, kopieDrager } from '../engine/standaard';
import type { Logo, Taal } from '../pdf/rapport';

export interface Artikel {
  artikelcode: string;
  omschrijving: string;
  artikelenPerBinnendoos: number;
  /** Artikel zonder binnendoos: de maat hieronder is die van het artikel (telt als binnendoos met 1 stuk). */
  zonderBinnendoos: boolean;
  binnendoos: Binnendoos;
  bijgewerkt: string;
}

export interface Instellingen {
  maxGevuldGewicht: number;
  minBuitenmaat: { L?: number; B?: number; H?: number };
  maxBuitenmaat: { L?: number; B?: number; H?: number };
  customDoostype: Extract<Doostype, { soort: 'custom' }>;
  tussenlaag: Tussenlaag;
  materiaal: Materiaal;
  taal: Taal;
  zoeklimiet: number;
  /** null = standaardlogo, '' = geen logo, anders een eigen logo. */
  logo: Logo | null | '';
}

export interface Berekening {
  nummer: string;
  datum: string;
  artikelcode: string;
  invoer: Invoer;
  /** De gekozen oplossing. */
  oplossing: Oplossing;
  /** De getoonde top drie en het zoeklog (kandidaatuitslagen, §3). */
  top?: TopOplossing[];
  log?: Resultaat['log'];
  /** Logo dat bij de laatste PDF-export is gebruikt; undefined = nog niet geëxporteerd. */
  logo?: Logo | null;
}

export const STANDAARD_INSTELLINGEN: Instellingen = {
  maxGevuldGewicht: MAX_GEVULD_GEWICHT,
  minBuitenmaat: {},
  maxBuitenmaat: {},
  customDoostype: { soort: 'custom', toeslagL: 14, toeslagB: 14, toeslagH: 28, kartonmassa: 0.75 },
  tussenlaag: { ...GEEN_TUSSENLAAG },
  materiaal: structuredClone(GEEN_MATERIAAL),
  taal: 'nl',
  zoeklimiet: 1500,
  logo: null,
};

const store = typeof indexedDB !== 'undefined' ? createStore('verpakking', 'gegevens') : undefined;

async function lees<T>(sleutel: string, standaard: T): Promise<T> {
  if (!store) return standaard;
  const v = await get<T>(sleutel, store);
  return v === undefined ? standaard : v;
}

async function schrijf<T>(sleutel: string, waarde: T): Promise<void> {
  if (!store) return;
  await set(sleutel, waarde, store);
}

export async function leesArtikelen(): Promise<Record<string, Artikel>> {
  return lees('artikelen', {} as Record<string, Artikel>);
}

export async function schrijfArtikelen(a: Record<string, Artikel>): Promise<void> {
  await schrijf('artikelen', a);
}

export async function leesDragers(): Promise<Drager[]> {
  const d = await lees<Drager[] | null>('dragers', null);
  return d && d.length > 0 ? d : STANDAARD_DRAGERS.map(kopieDrager);
}

export async function schrijfDragers(d: Drager[]): Promise<void> {
  await schrijf('dragers', d);
}

export async function leesInstellingen(): Promise<Instellingen> {
  const i = await lees<Partial<Instellingen>>('instellingen', {});
  return { ...STANDAARD_INSTELLINGEN, ...i };
}

export async function schrijfInstellingen(i: Instellingen): Promise<void> {
  await schrijf('instellingen', i);
}

export async function leesBerekeningen(): Promise<Berekening[]> {
  return lees('berekeningen', [] as Berekening[]);
}

export async function schrijfBerekeningen(b: Berekening[]): Promise<void> {
  await schrijf('berekeningen', b);
}

/**
 * Volgend berekeningsnummer: JJJJMMDD-NNN, oplopend per dag. Houdt ook rekening met nummers die
 * al in de geschiedenis staan (bijvoorbeeld na het terugzetten van een back-up), zodat een nummer
 * nooit twee keer voorkomt.
 */
export async function volgendNummer(datum = new Date()): Promise<string> {
  const dag = `${datum.getFullYear()}${String(datum.getMonth() + 1).padStart(2, '0')}${String(datum.getDate()).padStart(2, '0')}`;
  const teller = await lees<{ dag: string; n: number }>('teller', { dag, n: 0 });
  const inGeschiedenis = (await leesBerekeningen())
    .map((b) => b.nummer)
    .filter((nr) => nr.startsWith(`${dag}-`))
    .map((nr) => Number(nr.slice(dag.length + 1)) || 0);
  const n = Math.max(teller.dag === dag ? teller.n : 0, ...inGeschiedenis, 0) + 1;
  await schrijf('teller', { dag, n });
  return `${dag}-${String(n).padStart(3, '0')}`;
}

export interface Backup {
  type: 'verpakkingsapp-backup';
  versie: 1;
  gemaakt: string;
  artikelen: Record<string, Artikel>;
  dragers: Drager[];
  instellingen: Instellingen;
  berekeningen: Berekening[];
  teller?: { dag: string; n: number };
}

export async function maakBackup(): Promise<Backup> {
  return {
    type: 'verpakkingsapp-backup',
    versie: 1,
    gemaakt: new Date().toISOString(),
    artikelen: await leesArtikelen(),
    dragers: await leesDragers(),
    instellingen: await leesInstellingen(),
    berekeningen: await leesBerekeningen(),
    teller: await lees<{ dag: string; n: number } | undefined>('teller', undefined),
  };
}

export async function zetBackupTerug(b: Backup): Promise<void> {
  if (b?.type !== 'verpakkingsapp-backup') throw new Error('Dit is geen back-upbestand van de verpakkingsapp.');
  await schrijfArtikelen(b.artikelen ?? {});
  await schrijfDragers(b.dragers ?? STANDAARD_DRAGERS.map(kopieDrager));
  await schrijfInstellingen({ ...STANDAARD_INSTELLINGEN, ...(b.instellingen ?? {}) });
  await schrijfBerekeningen(b.berekeningen ?? []);
  if (b.teller) await schrijf('teller', b.teller);
}

export async function wisAlles(): Promise<void> {
  if (!store) return;
  for (const k of ['artikelen', 'dragers', 'instellingen', 'berekeningen', 'teller']) await del(k, store);
}
