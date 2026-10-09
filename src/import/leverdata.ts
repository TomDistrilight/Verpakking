// Import van verwachte leverdata voor het overzicht: kolom A het artikelnummer, kolom B de datum.
// Vult de leverdatum in of overschrijft die bij nog niet gecontroleerde oplossingen. Er worden
// geen artikelen of regels aangemaakt.

import type { GekozenOplossing } from '../data/opslag';
import { leesGetal, type Cel, type Rij } from './excel';

const tweeCijfers = (n: number) => String(n).padStart(2, '0');

/** JJJJ-MM-DD als het een bestaande kalenderdag is, anders null. */
function maakDatum(jaar: number, maand: number, dag: number): string | null {
  if (!Number.isInteger(jaar) || !Number.isInteger(maand) || !Number.isInteger(dag)) return null;
  // Een verwachte levering ligt in deze of de volgende eeuw; kleinere getallen zijn eerder weeknummers of levertijden.
  if (jaar < 2000 || jaar > 2199 || maand < 1 || maand > 12 || dag < 1) return null;
  const d = new Date(Date.UTC(jaar, maand - 1, dag));
  if (d.getUTCMonth() !== maand - 1 || d.getUTCDate() !== dag) return null;
  return `${jaar}-${tweeCijfers(maand)}-${tweeCijfers(dag)}`;
}

/** Excel-serienummer (dagen sinds 30-12-1899) naar JJJJ-MM-DD. */
function vanSerienummer(n: number): string | null {
  if (!(n >= 36526 && n < 109574)) return null; // 1-1-2000 tot en met het jaar 2199
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000);
  return maakDatum(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Leest een datum uit een cel: een datumcel, een Excel-serienummer, JJJJMMDD of tekst als
 * dd-mm-jjjj, dd/mm/jjjj, dd.mm.jjjj (ook met een jaartal van twee cijfers) of jjjj-mm-dd.
 * Geeft JJJJ-MM-DD of null.
 */
export function leesDatum(c: Cel): string | null {
  if (c instanceof Date) {
    if (Number.isNaN(c.getTime())) return null;
    // read-excel-file zet de datum en tijd uit de cel als UTC; de kalenderdag komt dus uit de UTC-velden.
    // Alleen een datum om precies lokale middernacht (niet om middernacht UTC) is een lokale datum.
    const middernacht = (u: number, m: number, s: number) => u === 0 && m === 0 && s === 0;
    const lokaal = middernacht(c.getHours(), c.getMinutes(), c.getSeconds()) && !middernacht(c.getUTCHours(), c.getUTCMinutes(), c.getUTCSeconds());
    return lokaal ? maakDatum(c.getFullYear(), c.getMonth() + 1, c.getDate()) : maakDatum(c.getUTCFullYear(), c.getUTCMonth() + 1, c.getUTCDate());
  }
  if (typeof c === 'number') {
    if (!Number.isFinite(c)) return null;
    if (Number.isInteger(c) && c >= 19000101 && c <= 22001231) return maakDatum(Math.floor(c / 10000), Math.floor(c / 100) % 100, c % 100);
    return vanSerienummer(c);
  }
  if (typeof c !== 'string') return null;
  const s = c.trim();
  if (s === '') return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return maakDatum(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?:\s.*)?$/.exec(s);
  if (m) {
    const jaar = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return maakDatum(jaar, Number(m[2]), Number(m[1]));
  }
  if (/^\d+([.,]\d+)?$/.test(s)) {
    const n = leesGetal(s);
    return n === null ? null : leesDatum(n);
  }
  return null;
}

/** JJJJ-MM-DD naar dd-mm-jjjj. */
export function datumTekst(iso: string | null | undefined): string {
  if (!iso) return '';
  const [j, m, d] = iso.split('-');
  return `${d}-${m}-${j}`;
}

export type LeverStatus = 'bijwerken' | 'ongewijzigd' | 'gecontroleerd' | 'onbekend' | 'fout';

export interface LeverRij {
  /** Rijnummer zoals in Excel (1-gebaseerd). */
  rij: number;
  artikelcode: string;
  datum: string | null;
  status: LeverStatus;
  melding: string;
  /** De regels in het overzicht die de nieuwe datum krijgen. */
  regels: string[];
}

function celTekst(c: Cel): string {
  if (c === null || c === undefined) return '';
  if (typeof c === 'number') return Number.isFinite(c) ? String(c) : '';
  return String(c).trim();
}

const leeg = (c: Cel) => c === null || c === undefined || String(c).trim() === '';

/**
 * Verwerkt de rijen van een werkblad. Een eerste rij zonder geldige datum in kolom B geldt als
 * kopregel. Een artikelnummer dat dubbel in het bestand staat, telt alleen de eerste keer.
 */
export function verwerkLeverdata(data: Rij[], gekozen: GekozenOplossing[]): { rijen: LeverRij[]; kopRij: boolean } {
  const rijen: LeverRij[] = [];
  const gezien = new Map<string, number>();
  const eersteGevuld = data.findIndex((r) => (r ?? []).some((c) => !leeg(c)));
  const kopRij = eersteGevuld >= 0 && leesDatum(data[eersteGevuld]?.[1]) === null;
  for (let i = 0; i < data.length; i++) {
    const rij = data[i] ?? [];
    if (i === eersteGevuld && kopRij) continue;
    if (leeg(rij[0]) && leeg(rij[1])) continue;
    const artikelcode = celTekst(rij[0]);
    const datum = leesDatum(rij[1]);
    const r: LeverRij = { rij: i + 1, artikelcode, datum, status: 'fout', melding: '', regels: [] };
    rijen.push(r);
    if (!artikelcode) {
      r.melding = 'Artikelnummer ontbreekt in kolom A.';
      continue;
    }
    if (!datum) {
      r.melding = leeg(rij[1])
        ? 'Datum ontbreekt in kolom B.'
        : `"${celTekst(rij[1])}" is geen geldige datum. Gebruik een datum, bijvoorbeeld 31-12-2026; weeknummers en levertijden in dagen worden niet herkend.`;
      continue;
    }
    const eerder = gezien.get(artikelcode);
    if (eerder !== undefined) {
      r.melding = `Artikelnummer staat dubbel in dit bestand; rij ${eerder} telt.`;
      continue;
    }
    gezien.set(artikelcode, i + 1);
    const regels = gekozen.filter((g) => g.artikelcode === artikelcode);
    if (regels.length === 0) {
      r.status = 'onbekend';
      r.melding = 'Staat niet in het overzicht; overgeslagen.';
      continue;
    }
    const open = regels.filter((g) => !g.gecontroleerd);
    if (open.length === 0) {
      r.status = 'gecontroleerd';
      r.melding = 'Al fysiek gecontroleerd; leverdatum blijft staan.';
      continue;
    }
    const anders = open.filter((g) => g.verwachteLevering !== datum);
    if (anders.length === 0) {
      r.status = 'ongewijzigd';
      r.melding = 'Leverdatum is al gelijk.';
      continue;
    }
    r.status = 'bijwerken';
    r.regels = anders.map((g) => g.id);
    const oud = [...new Set(anders.map((g) => datumTekst(g.verwachteLevering) || 'leeg'))].join(', ');
    r.melding = `Leverdatum ${oud} → ${datumTekst(datum)}${anders.length > 1 ? ` (${anders.length} regels)` : ''}.`;
  }
  return { rijen, kopRij };
}

/** Zet de nieuwe leverdata in het overzicht; gecontroleerde regels blijven ongemoeid. */
export function pasLeverdataToe(gekozen: GekozenOplossing[], rijen: LeverRij[]): GekozenOplossing[] {
  const nieuw = new Map<string, string>();
  for (const r of rijen) if (r.status === 'bijwerken' && r.datum) for (const id of r.regels) nieuw.set(id, r.datum);
  return gekozen.map((g) => (!g.gecontroleerd && nieuw.has(g.id) ? { ...g, verwachteLevering: nieuw.get(g.id)! } : g));
}
