// Opslag in de browser (IndexedDB via idb-keyval), ontwerp §6 en #38: geen server, één gebruiker,
// back-up via export en import van een JSON-bestand.

import { createStore, get, set, del } from 'idb-keyval';
import type { Binnendoos, Doostype, Drager, Invoer, Materiaal, Oplossing, Resultaat, TopOplossing, Tussenlaag, Vormregel } from '../engine/types';
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
  /** Standaard minimaal aantal binnendozen per ontworpen buitendoos. */
  minBinnendozenPerDoos: number;
  /** Standaard minimaal aantal buitendozen per laag op de drager. */
  minBuitendozenPerLaag: number;
  /** Ontworpen buitendoos niet hoger dan zijn breedte of lengte (één laag binnendozen mag altijd). */
  vormregel: Vormregel;
  customDoostype: Extract<Doostype, { soort: 'custom' }>;
  tussenlaag: Tussenlaag;
  materiaal: Materiaal;
  taal: Taal;
  zoeklimiet: number;
  /** null = standaardlogo, '' = geen logo, anders een eigen logo. */
  logo: Logo | null | '';
  /** Weergave van het overzicht van gekozen oplossingen. */
  overzicht: OverzichtWeergave;
}

export interface OverzichtWeergave {
  sortering: 'levering' | 'artikel' | 'gekozen';
  verbergGecontroleerd: boolean;
}

/** Een gekozen oplossing in het overzicht, met de status van de levering. */
export interface GekozenOplossing {
  id: string;
  /** Nummer en datum van de berekening; die staan ook in de voettekst van het PDF. */
  nummer: string;
  datum: string;
  /** Moment waarop de oplossing in het overzicht is gezet. */
  gekozenOp: string;
  artikelcode: string;
  invoer: Invoer;
  oplossing: Oplossing;
  /** Logo van de laatste PDF-export; undefined = nog niet geëxporteerd. */
  logo?: Logo | null;
  /** Verwachte leverdatum als JJJJ-MM-DD, of null. */
  verwachteLevering: string | null;
  /** Dozen en artikelen zijn fysiek gecontroleerd: geleverd zoals afgesproken met leverancier en inkoop. */
  gecontroleerd: boolean;
  /** Taal van het PDF. */
  taal: Taal;
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
  minBinnendozenPerDoos: 1,
  minBuitendozenPerLaag: 1,
  vormregel: 'breedte',
  customDoostype: { soort: 'custom', toeslagL: 14, toeslagB: 14, toeslagH: 28, kartonmassa: 0.75 },
  tussenlaag: { ...GEEN_TUSSENLAAG },
  materiaal: structuredClone(GEEN_MATERIAAL),
  taal: 'nl',
  zoeklimiet: 1500,
  logo: null,
  overzicht: { sortering: 'levering', verbergGecontroleerd: false },
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
  return metStandaard(i);
}

/** Vult ontbrekende instellingen aan met de standaard (bijvoorbeeld uit een oudere versie of back-up). */
export function metStandaard(i: Partial<Instellingen>): Instellingen {
  return { ...STANDAARD_INSTELLINGEN, ...i, overzicht: { ...STANDAARD_INSTELLINGEN.overzicht, ...(i.overzicht ?? {}) } };
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

export async function leesGekozen(): Promise<GekozenOplossing[]> {
  return lees('gekozen', [] as GekozenOplossing[]);
}

export async function schrijfGekozen(g: GekozenOplossing[]): Promise<void> {
  await schrijf('gekozen', g);
}

/** Uniek nummer voor een regel in het overzicht. */
export function nieuwId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Een nieuwe regel voor het overzicht uit een bewaarde berekening en de gekozen oplossing. */
export function regelUitBerekening(b: Berekening, oplossing: Oplossing, taal: Taal, nu = new Date()): GekozenOplossing {
  return {
    id: nieuwId(),
    nummer: b.nummer,
    datum: b.datum,
    gekozenOp: nu.toISOString(),
    artikelcode: b.artikelcode,
    invoer: b.invoer,
    oplossing,
    // Logo van een eerdere PDF-export van deze berekening, zodat het PDF gelijk blijft.
    logo: b.logo,
    verwachteLevering: null,
    gecontroleerd: false,
    taal,
  };
}

/**
 * Zet een gekozen oplossing in het overzicht. Staat het artikel er al met een regel die nog niet
 * fysiek gecontroleerd is, dan vervangt de nieuwe oplossing die regel; de verwachte leverdatum en
 * de taal blijven staan. Anders komt er een nieuwe regel bij.
 */
export function zetInOverzicht(lijst: GekozenOplossing[], regel: GekozenOplossing): { lijst: GekozenOplossing[]; vervangen: boolean } {
  const open = lijst.filter((r) => r.artikelcode === regel.artikelcode && !r.gecontroleerd);
  if (open.length === 0) return { lijst: [...lijst, regel], vervangen: false };
  // Zijn er meer open regels (na het uitvinken van een gecontroleerde regel), dan alleen de laatst gekozen vervangen.
  const oud = open.reduce((a, b) => (b.gekozenOp > a.gekozenOp ? b : a));
  const nieuw: GekozenOplossing = { ...regel, id: oud.id, verwachteLevering: oud.verwachteLevering, taal: oud.taal };
  return { lijst: lijst.map((r) => (r === oud ? nieuw : r)), vervangen: true };
}

const vergelijkCode = (a: string, b: string) => a.localeCompare(b, 'nl', { numeric: true });

/** Sorteert het overzicht; regels zonder verwachte leverdatum komen achteraan. */
export function sorteerOverzicht(lijst: GekozenOplossing[], sortering: OverzichtWeergave['sortering']): GekozenOplossing[] {
  const laatstGekozen = (a: GekozenOplossing, b: GekozenOplossing) => (a.gekozenOp < b.gekozenOp ? 1 : a.gekozenOp > b.gekozenOp ? -1 : 0);
  const uit = [...lijst];
  if (sortering === 'levering')
    uit.sort((a, b) => {
      if (a.verwachteLevering !== b.verwachteLevering) {
        if (!a.verwachteLevering) return 1;
        if (!b.verwachteLevering) return -1;
        return a.verwachteLevering < b.verwachteLevering ? -1 : 1;
      }
      return vergelijkCode(a.artikelcode, b.artikelcode) || laatstGekozen(a, b);
    });
  else if (sortering === 'artikel') uit.sort((a, b) => vergelijkCode(a.artikelcode, b.artikelcode) || laatstGekozen(a, b));
  else uit.sort(laatstGekozen);
  return uit;
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
  /** Overzicht van gekozen oplossingen; ontbreekt in back-ups van vóór het overzicht. */
  gekozen?: GekozenOplossing[];
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
    gekozen: await leesGekozen(),
    teller: await lees<{ dag: string; n: number } | undefined>('teller', undefined),
  };
}

export async function zetBackupTerug(b: Backup): Promise<void> {
  if (b?.type !== 'verpakkingsapp-backup') throw new Error('Dit is geen back-upbestand van de verpakkingsapp.');
  await schrijfArtikelen(b.artikelen ?? {});
  await schrijfDragers(b.dragers ?? STANDAARD_DRAGERS.map(kopieDrager));
  await schrijfInstellingen(metStandaard(b.instellingen ?? {}));
  await schrijfBerekeningen(b.berekeningen ?? []);
  await schrijfGekozen(b.gekozen ?? []);
  // Nooit terug in de teller: nummers van na de back-up kunnen al op een PDF staan.
  const nu = await lees<{ dag: string; n: number } | undefined>('teller', undefined);
  if (b.teller) {
    const n = nu && nu.dag === b.teller.dag ? Math.max(nu.n, b.teller.n) : nu && nu.dag > b.teller.dag ? nu.n : b.teller.n;
    const dag = nu && nu.dag > b.teller.dag ? nu.dag : b.teller.dag;
    await schrijf('teller', { dag, n });
  }
}

export async function wisAlles(): Promise<void> {
  if (!store) return;
  // De teller blijft staan: eerder uitgegeven berekeningsnummers kunnen al op een PDF staan.
  for (const k of ['artikelen', 'dragers', 'instellingen', 'berekeningen', 'gekozen']) await del(k, store);
}
