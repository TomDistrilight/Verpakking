// Excel-/CSV-import (ontwerp §2 stap 6, #17, #19, #35): kolomkoppeling met eenheid per kolom,
// controle per rij, voorbeeld vóór opslaan en geen ongemerkt dubbele artikelen.

import type { Artikel } from '../data/opslag';

export type Cel = string | number | boolean | Date | null | undefined | unknown;
export type Rij = Cel[];

export type Veld = 'artikelcode' | 'L' | 'B' | 'H' | 'gewicht' | 'aantal' | 'omschrijving';
export type LengteEenheid = 'mm' | 'cm' | 'm';
export type GewichtEenheid = 'kg' | 'g';

export const VELDEN: { veld: Veld; naam: string; verplicht: boolean }[] = [
  { veld: 'artikelcode', naam: 'Artikelnummer', verplicht: true },
  { veld: 'L', naam: 'Lengte binnendoos', verplicht: true },
  { veld: 'B', naam: 'Breedte binnendoos', verplicht: true },
  { veld: 'H', naam: 'Hoogte binnendoos', verplicht: true },
  { veld: 'gewicht', naam: 'Gewicht binnendoos (incl. inhoud)', verplicht: true },
  { veld: 'aantal', naam: 'Aantal artikelen per binnendoos', verplicht: false },
  { veld: 'omschrijving', naam: 'Omschrijving', verplicht: false },
];

export interface Koppeling {
  kolommen: Partial<Record<Veld, number>>;
  eenheidLengte: LengteEenheid;
  eenheidGewicht: GewichtEenheid;
  /** Eerste rij bevat kolomnamen. */
  kopRij: boolean;
}

const PATRONEN: Record<Veld, RegExp> = {
  artikelcode: /artikel|art\.?\s*nr|item|sku|code|nummer/i,
  L: /^\s*(l|lengte|length|len)\b|lengte|length/i,
  B: /^\s*(b|w|breedte|width|wid)\b|breedte|width/i,
  H: /^\s*(h|hoogte|height)\b|hoogte|height/i,
  gewicht: /gewicht|weight|kg|massa|gross|bruto/i,
  aantal: /aantal|qty|quantity|stuks|pcs|per\s*doos|per\s*box/i,
  omschrijving: /omschrijving|description|naam|name|desc/i,
};

/** Raadt de koppeling aan de hand van de kolomnamen. */
export function raadKoppeling(kop: Cel[]): Koppeling {
  const namen = kop.map((c) => (c === null || c === undefined ? '' : String(c)));
  const kolommen: Partial<Record<Veld, number>> = {};
  const bezet = new Set<number>();
  for (const v of ['aantal', 'gewicht', 'omschrijving', 'artikelcode', 'L', 'B', 'H'] as Veld[]) {
    const i = namen.findIndex((n, idx) => !bezet.has(idx) && n.trim() !== '' && PATRONEN[v].test(n));
    if (i >= 0) {
      kolommen[v] = i;
      bezet.add(i);
    }
  }
  const alles = namen.join(' ').toLowerCase();
  const eenheidLengte: LengteEenheid = /\(cm\)|\bcm\b/.test(alles) ? 'cm' : /\(m\)/.test(alles) ? 'm' : 'mm';
  const eenheidGewicht: GewichtEenheid = /\(g\)|\bgram\b/.test(alles) ? 'g' : 'kg';
  const kopRij = namen.some((n) => n.trim() !== '' && Number.isNaN(Number(n.replace(',', '.'))));
  return { kolommen, eenheidLengte, eenheidGewicht, kopRij };
}

/** Leest een getal uit een cel; accepteert komma of punt als decimaalteken. */
export function leesGetal(c: Cel): number | null {
  if (typeof c === 'number') return Number.isFinite(c) ? c : null;
  if (typeof c !== 'string') return null;
  let s = c.trim().replace(/\s/g, '');
  if (s === '') return null;
  if (s.includes(',') && s.includes('.')) {
    // Duizendtalscheiding: het laatst voorkomende teken is het decimaalteken.
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else s = s.replace(',', '.');
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

const FACTOR_LENGTE: Record<LengteEenheid, number> = { mm: 1, cm: 10, m: 1000 };
const FACTOR_GEWICHT: Record<GewichtEenheid, number> = { kg: 1, g: 0.001 };

export type Status = 'nieuw' | 'gewijzigd' | 'ongewijzigd' | 'fout';

export interface ImportRij {
  /** Rijnummer zoals in Excel (1-gebaseerd). */
  rij: number;
  artikelcode: string;
  status: Status;
  fouten: string[];
  wijzigingen: string[];
  artikel?: Artikel;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function verwerk(data: Rij[], k: Koppeling, bestaand: Record<string, Artikel>, nu = new Date()): ImportRij[] {
  const uit: ImportRij[] = [];
  const gezien = new Map<string, number>();
  const start = k.kopRij ? 1 : 0;
  const cel = (rij: Rij, v: Veld) => (k.kolommen[v] === undefined ? undefined : rij[k.kolommen[v]!]);
  for (let i = start; i < data.length; i++) {
    const rij = data[i] ?? [];
    if (rij.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;
    const fouten: string[] = [];
    const codeCel = cel(rij, 'artikelcode');
    const artikelcode = codeCel === null || codeCel === undefined ? '' : String(codeCel).trim();
    if (!artikelcode) fouten.push('Artikelnummer ontbreekt.');
    const maat = (v: 'L' | 'B' | 'H', naam: string) => {
      const g = leesGetal(cel(rij, v));
      if (g === null || g <= 0) {
        fouten.push(`${naam} ontbreekt of is geen getal groter dan 0.`);
        return 0;
      }
      return r3(g * FACTOR_LENGTE[k.eenheidLengte]);
    };
    const L = maat('L', 'Lengte');
    const B = maat('B', 'Breedte');
    const H = maat('H', 'Hoogte');
    const gw = leesGetal(cel(rij, 'gewicht'));
    let gewicht = 0;
    if (gw === null || gw <= 0) fouten.push('Gewicht ontbreekt of is geen getal groter dan 0.');
    else gewicht = r3(gw * FACTOR_GEWICHT[k.eenheidGewicht]);
    let aantal = 1;
    const ac = cel(rij, 'aantal');
    if (ac !== undefined && ac !== null && String(ac).trim() !== '') {
      const a = leesGetal(ac);
      if (a === null || !Number.isInteger(a) || a < 1) fouten.push('Aantal artikelen per binnendoos moet een geheel getal van minstens 1 zijn.');
      else aantal = a;
    }
    const oc = cel(rij, 'omschrijving');
    const omschrijving = oc === undefined || oc === null ? undefined : String(oc).trim();
    if (artikelcode) {
      const eerder = gezien.get(artikelcode);
      if (eerder !== undefined) fouten.push(`Artikelnummer staat dubbel in dit bestand (ook in rij ${eerder}).`);
      else gezien.set(artikelcode, i + 1);
    }
    if (fouten.length > 0) {
      uit.push({ rij: i + 1, artikelcode, status: 'fout', fouten, wijzigingen: [] });
      continue;
    }
    const oud = bestaand[artikelcode];
    const artikel: Artikel = {
      artikelcode,
      omschrijving: omschrijving ?? oud?.omschrijving ?? '',
      artikelenPerBinnendoos: aantal,
      // Een Excel-rij beschrijft altijd een binnendoos (#17, #35).
      zonderBinnendoos: false,
      binnendoos: {
        L,
        B,
        H,
        gewicht,
        kantelbaar: oud?.binnendoos.kantelbaar ?? false,
        magVerticaal: oud ? { ...oud.binnendoos.magVerticaal } : { L: false, B: false },
      },
      bijgewerkt: nu.toISOString(),
    };
    if (!oud) {
      uit.push({ rij: i + 1, artikelcode, status: 'nieuw', fouten: [], wijzigingen: [], artikel });
      continue;
    }
    const w: string[] = [];
    const vgl = (naam: string, a: number, b: number, eenheid: string) => {
      if (Math.abs(a - b) > 1e-9) w.push(`${naam}: ${a} → ${b} ${eenheid}`);
    };
    vgl('Lengte', oud.binnendoos.L, L, 'mm');
    vgl('Breedte', oud.binnendoos.B, B, 'mm');
    vgl('Hoogte', oud.binnendoos.H, H, 'mm');
    vgl('Gewicht', oud.binnendoos.gewicht, gewicht, 'kg');
    vgl('Aantal per binnendoos', oud.artikelenPerBinnendoos, aantal, '');
    if (omschrijving !== undefined && omschrijving !== oud.omschrijving) w.push(`Omschrijving: "${oud.omschrijving}" → "${omschrijving}"`);
    if (oud.zonderBinnendoos) w.push('Artikel zonder binnendoos → met binnendoos');
    uit.push({ rij: i + 1, artikelcode, status: w.length > 0 ? 'gewijzigd' : 'ongewijzigd', fouten: [], wijzigingen: w, artikel });
  }
  return uit;
}

/** Eenvoudige CSV-lezer: herkent ; , of tab als scheidingsteken en aanhalingstekens. */
export function leesCsv(tekst: string): Rij[] {
  const eerste = tekst.split(/\r?\n/, 1)[0] ?? '';
  const telling = [';', ',', '\t'].map((s) => [s, eerste.split(s).length - 1] as const);
  const scheiding = telling.sort((a, b) => b[1] - a[1])[0][0];
  const rijen: Rij[] = [];
  let rij: string[] = [];
  let veld = '';
  let tussenAanhaling = false;
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i];
    if (tussenAanhaling) {
      if (c === '"') {
        if (tekst[i + 1] === '"') {
          veld += '"';
          i++;
        } else tussenAanhaling = false;
      } else veld += c;
    } else if (c === '"') tussenAanhaling = true;
    else if (c === scheiding) {
      rij.push(veld);
      veld = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && tekst[i + 1] === '\n') i++;
      rij.push(veld);
      rijen.push(rij);
      rij = [];
      veld = '';
    } else veld += c;
  }
  if (veld !== '' || rij.length > 0) {
    rij.push(veld);
    rijen.push(rij);
  }
  return rijen;
}
