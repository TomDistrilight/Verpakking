// Invoerformulier (tekstvelden) en de omzetting naar de invoer van de rekenmodule.

import type { Drager, Invoer, Materiaal, Tussenlaag } from '../engine/types';
import { STANDAARD_ARTIKELEN_PER_BINNENDOOS } from '../engine/standaard';
import type { Artikel, Instellingen } from '../data/opslag';
import { leesGetal } from '../import/excel';

export interface Formulier {
  instap: 'binnendoos' | 'bestaandeBuitendoos';
  artikelcode: string;
  omschrijving: string;
  /** Aantal artikelen per binnendoos (een vast aantal, geen minimum; ronde 8, #67). */
  artikelenPerBinnendoos: string;
  zonderBinnendoos: boolean;
  /** Geen buitendoos: de binnendoos gaat zelf op de drager. */
  zonderBuitendoos: boolean;
  bd: { L: string; B: string; H: string; gewicht: string; kantelbaar: boolean; magL: boolean; magB: boolean };
  bestaand: {
    /**
     * Bestaande buitendoos met een binnendoos (ronde 5). Uit: de buitendoos bevat de artikelen zelf; de binnendoosvelden
     * staan niet op het scherm en het aantal in de doos telt artikelen.
     */
    metBinnendoos: boolean;
    L: string;
    B: string;
    H: string;
    gevuld: string;
    aantal: string;
    metBinnenmaat: boolean;
    binnenL: string;
    binnenB: string;
    binnenH: string;
    eigen: string;
    /**
     * Alleen zonder binnendoos (ronde 6, #64): de buitendoos mag gekanteld op de drager, met de ingevoerde lengte (magL) of
     * breedte (magB) verticaal. Met binnendoos kantelt de buitendoos niet.
     */
    kantelbaar: boolean;
    magL: boolean;
    magB: boolean;
  };
  doostype: '0201' | 'custom';
  custom: { tL: string; tB: string; tH: string; massa: string };
  maxGevuld: string;
  /** Minimaal aantal binnendozen per ontworpen buitendoos. */
  minPerDoos: string;
  /** Minimaal aantal buitendozen per laag op de drager. */
  minPerLaag: string;
  dragerId: string;
  /** Drager zoals vastgelegd in een geopende berekening; null = de huidige drager uit de lijst. */
  dragerSnapshot: Drager | null;
  drager: {
    maxHoogte: string;
    maxGewicht: string;
    overhangToegestaan: boolean;
    voor: string;
    achter: string;
    links: string;
    rechts: string;
    asym: boolean;
  };
  tussenlaag: { soort: Tussenlaag['soort']; naElkeN: string; dikte: string; gewicht: string; maat: Tussenlaag['maat'] };
  materiaal: {
    bodemvel: boolean;
    bodemDikte: string;
    bodemGewicht: string;
    topvel: boolean;
    topDikte: string;
    topGewicht: string;
    hoek: boolean;
    hoekGewicht: string;
    folie: boolean;
    folieGewicht: string;
  };
}

// Een getal uit een back-up kan null zijn (JSON kent geen NaN): dat geeft een leeg veld.
const s = (v: number | undefined | null) => (v === undefined || v === null || Number.isNaN(v) ? '' : String(v).replace('.', ','));

export function dragerVelden(d: Drager): Formulier['drager'] {
  return {
    maxHoogte: s(d.maxTotaleHoogte),
    maxGewicht: s(d.maxTotaalGewicht),
    overhangToegestaan: d.overhangToegestaan,
    voor: s(d.overhang.voor),
    achter: s(d.overhang.achter),
    links: s(d.overhang.links),
    rechts: s(d.overhang.rechts),
    asym: d.asymmetrieToegestaan,
  };
}

export function leegFormulier(inst: Instellingen, dragers: Drager[]): Formulier {
  const d = dragers[0];
  const m: Materiaal = inst.materiaal;
  return {
    instap: 'binnendoos',
    artikelcode: '',
    omschrijving: '',
    artikelenPerBinnendoos: String(STANDAARD_ARTIKELEN_PER_BINNENDOOS),
    zonderBinnendoos: false,
    zonderBuitendoos: false,
    bd: { L: '', B: '', H: '', gewicht: '', kantelbaar: false, magL: false, magB: false },
    bestaand: {
      metBinnendoos: false,
      L: '',
      B: '',
      H: '',
      gevuld: '',
      aantal: '',
      metBinnenmaat: false,
      binnenL: '',
      binnenB: '',
      binnenH: '',
      eigen: '',
      kantelbaar: false,
      magL: false,
      magB: false,
    },
    doostype: '0201',
    custom: { tL: s(inst.customDoostype.toeslagL), tB: s(inst.customDoostype.toeslagB), tH: s(inst.customDoostype.toeslagH), massa: s(inst.customDoostype.kartonmassa) },
    maxGevuld: s(inst.maxGevuldGewicht),
    minPerDoos: s(inst.minBinnendozenPerDoos),
    minPerLaag: s(inst.minBuitendozenPerLaag),
    dragerId: d?.id ?? '',
    dragerSnapshot: null,
    drager: d ? dragerVelden(d) : { maxHoogte: '', maxGewicht: '', overhangToegestaan: false, voor: '0', achter: '0', links: '0', rechts: '0', asym: true },
    tussenlaag: {
      soort: inst.tussenlaag.soort,
      naElkeN: s(inst.tussenlaag.naElkeN),
      dikte: s(inst.tussenlaag.dikte),
      gewicht: s(inst.tussenlaag.gewicht),
      maat: inst.tussenlaag.maat,
    },
    materiaal: {
      bodemvel: m.bodemvel.aan,
      bodemDikte: s(m.bodemvel.dikte),
      bodemGewicht: s(m.bodemvel.gewicht),
      topvel: m.topvel.aan,
      topDikte: s(m.topvel.dikte),
      topGewicht: s(m.topvel.gewicht),
      hoek: m.hoekprofielen.aan,
      hoekGewicht: s(m.hoekprofielen.gewicht),
      folie: m.folie.aan,
      folieGewicht: s(m.folie.gewicht),
    },
  };
}

export function metArtikel(f: Formulier, a: Artikel): Formulier {
  return {
    ...f,
    artikelcode: a.artikelcode,
    omschrijving: a.omschrijving,
    artikelenPerBinnendoos: String(a.zonderBinnendoos ? 1 : a.artikelenPerBinnendoos),
    zonderBinnendoos: a.zonderBinnendoos,
    zonderBuitendoos: !!a.zonderBuitendoos,
    bd: {
      L: s(a.binnendoos.L),
      B: s(a.binnendoos.B),
      H: s(a.binnendoos.H),
      gewicht: s(a.binnendoos.gewicht),
      kantelbaar: a.binnendoos.kantelbaar,
      magL: a.binnendoos.magVerticaal.L,
      magB: a.binnendoos.magVerticaal.B,
    },
  };
}

/** Getal uit een tekstveld; leeg of ongeldig geeft NaN, zodat de controle het meldt. */
export function g(v: string): number {
  const x = leesGetal(v);
  return x === null ? Number.NaN : x;
}

/** Optioneel getal: leeg geeft undefined. */
function og(v: string): number | undefined {
  return v.trim() === '' ? undefined : g(v);
}

export function naarInvoer(f: Formulier, dragers: Drager[], inst: Instellingen): Invoer {
  const basis = f.dragerSnapshot ?? dragers.find((d) => d.id === f.dragerId) ?? dragers[0];
  const drager: Drager = {
    ...basis,
    maxTotaleHoogte: g(f.drager.maxHoogte),
    maxTotaalGewicht: g(f.drager.maxGewicht),
    overhangToegestaan: basis.type === 'kar' ? false : f.drager.overhangToegestaan,
    overhang: { voor: og(f.drager.voor) ?? 0, achter: og(f.drager.achter) ?? 0, links: og(f.drager.links) ?? 0, rechts: og(f.drager.rechts) ?? 0 },
    asymmetrieToegestaan: f.drager.asym,
  };
  // Bij een bestaande buitendoos is de binnendoos optioneel (ronde 5): zonder binnendoos bevat de buitendoos de
  // artikelen zelf en telt het aantal in de doos artikelen (als binnendoos met 1 stuk).
  const metBinnendoos = f.instap === 'binnendoos' || f.bestaand.metBinnendoos;
  // De binnenmaat dient alleen om de inhoud te berekenen; daar is een binnendoos voor nodig.
  const metBinnenmaat = metBinnendoos && f.bestaand.metBinnenmaat;
  // Zonder binnendoos mag de buitendoos zelf kantelen (ronde 6, #64); met binnendoos niet, want de inhoud mag misschien niet kantelen.
  const buitendoosKantelbaar = !metBinnendoos && f.bestaand.kantelbaar;
  const bd = metBinnendoos
    ? {
        L: g(f.bd.L),
        B: g(f.bd.B),
        H: g(f.bd.H),
        gewicht: g(f.bd.gewicht),
        kantelbaar: f.bd.kantelbaar,
        magVerticaal: { L: f.bd.kantelbaar && f.bd.magL, B: f.bd.kantelbaar && f.bd.magB },
      }
    : undefined;
  const t = f.tussenlaag;
  const m = f.materiaal;
  return {
    instap: f.instap,
    artikelcode: f.artikelcode.trim(),
    omschrijving: f.omschrijving.trim() || undefined,
    // "Artikel zonder binnendoos" geldt alleen bij instap binnendoos; bij een bestaande buitendoos beslist "Binnendoos opgeven".
    artikelenPerBinnendoos: (f.instap === 'binnendoos' && f.zonderBinnendoos) || !metBinnendoos ? 1 : g(f.artikelenPerBinnendoos),
    binnendoos: bd,
    bestaandeBuitendoos:
      f.instap === 'bestaandeBuitendoos'
        ? {
            L: g(f.bestaand.L),
            B: g(f.bestaand.B),
            H: g(f.bestaand.H),
            gevuldGewicht: og(f.bestaand.gevuld),
            // Zonder binnendoos: het aantal artikelen per buitendoos.
            binnendozenPerDoos: og(f.bestaand.aantal),
            binnenmaat: metBinnenmaat ? { L: g(f.bestaand.binnenL), B: g(f.bestaand.binnenB), H: g(f.bestaand.binnenH) } : undefined,
            eigenGewicht: metBinnenmaat ? og(f.bestaand.eigen) : undefined,
            kantelbaar: buitendoosKantelbaar ? true : undefined,
            magVerticaal: buitendoosKantelbaar ? { L: f.bestaand.magL, B: f.bestaand.magB } : undefined,
          }
        : undefined,
    doostype:
      f.doostype === '0201' ? { soort: '0201' } : { soort: 'custom', toeslagL: g(f.custom.tL), toeslagB: g(f.custom.tB), toeslagH: g(f.custom.tH), kartonmassa: g(f.custom.massa) },
    maxGevuldGewicht: g(f.maxGevuld),
    minBuitenmaat: inst.minBuitenmaat,
    maxBuitenmaat: inst.maxBuitenmaat,
    // Het minimum per doos geldt alleen voor een ontworpen buitendoos; een bestaande doos ligt vast.
    minBinnendozenPerDoos: f.instap === 'binnendoos' && !f.zonderBuitendoos ? g(f.minPerDoos) : undefined,
    minBuitendozenPerLaag: g(f.minPerLaag),
    vormregel: inst.vormregel,
    // De max. hoogte (× de breedte) geldt alleen bij de vormregel zacht (#66).
    vormFactor: inst.vormregel === 'zacht' ? inst.vormFactor : undefined,
    zonderBuitendoos: f.instap === 'binnendoos' && f.zonderBuitendoos ? true : undefined,
    // Voor de weergave ("artikelen"): een artikel zonder binnendoos, of een bestaande buitendoos zonder binnendoos.
    zonderBinnendoos: (f.instap === 'binnendoos' && f.zonderBinnendoos) || !metBinnendoos ? true : undefined,
    minSteun: inst.minSteun / 100,
    maxInham: inst.maxInham / 100,
    drager,
    // Bij ingeschakelde opties is een leeg veld een fout (de controle meldt NaN), geen stille 0.
    tussenlaag: {
      soort: t.soort,
      naElkeN: g(t.naElkeN),
      dikte: t.soort === 'geen' ? 0 : g(t.dikte),
      gewicht: t.soort === 'geen' ? 0 : g(t.gewicht),
      maat: t.maat,
    },
    materiaal: {
      bodemvel: { aan: m.bodemvel, dikte: m.bodemvel ? g(m.bodemDikte) : 0, gewicht: m.bodemvel ? g(m.bodemGewicht) : 0 },
      topvel: { aan: m.topvel, dikte: m.topvel ? g(m.topDikte) : 0, gewicht: m.topvel ? g(m.topGewicht) : 0 },
      hoekprofielen: { aan: m.hoek, gewicht: m.hoek ? g(m.hoekGewicht) : 0 },
      folie: { aan: m.folie, gewicht: m.folie ? g(m.folieGewicht) : 0 },
    },
    zoeklimiet: inst.zoeklimiet,
  };
}

/** Formulier terugzetten vanuit een opgeslagen berekening. */
export function vanInvoer(i: Invoer, basis: Formulier): Formulier {
  const bd = i.binnendoos;
  const leegBd = { L: '', B: '', H: '', gewicht: '', kantelbaar: false, magL: false, magB: false };
  const bb = i.bestaandeBuitendoos;
  const metBinnendoos = i.instap === 'bestaandeBuitendoos' && !!bd && !i.zonderBinnendoos;
  // Een bestaande buitendoos zonder binnendoos rekent met 1 artikel per binnendoos; dat is niet ingevuld, dus de standaard.
  const zonderBinnendoosBestaand = i.instap === 'bestaandeBuitendoos' && !metBinnendoos;
  // Een berekening van vóór ronde 5 zonder binnendoosmaten telde binnendozen per buitendoos met een apart aantal artikelen
  // per binnendoos. Zonder binnendoos telt het veld nu artikelen per buitendoos: reken dat om, zodat het aantal artikelen gelijk blijft.
  const oudZonderBinnendoos = zonderBinnendoosBestaand && !i.zonderBinnendoos && bb?.binnendozenPerDoos !== undefined;
  const aantal = oudZonderBinnendoos ? bb!.binnendozenPerDoos! * i.artikelenPerBinnendoos : bb?.binnendozenPerDoos;
  return {
    ...basis,
    instap: i.instap,
    artikelcode: i.artikelcode,
    omschrijving: i.omschrijving ?? '',
    artikelenPerBinnendoos: zonderBinnendoosBestaand ? String(STANDAARD_ARTIKELEN_PER_BINNENDOOS) : String(i.artikelenPerBinnendoos),
    zonderBinnendoos: i.instap === 'binnendoos' && !!i.zonderBinnendoos,
    zonderBuitendoos: !!i.zonderBuitendoos,
    bd: bd ? { L: s(bd.L), B: s(bd.B), H: s(bd.H), gewicht: s(bd.gewicht), kantelbaar: bd.kantelbaar, magL: bd.magVerticaal.L, magB: bd.magVerticaal.B } : leegBd,
    bestaand: bb
      ? {
          metBinnendoos,
          L: s(bb.L),
          B: s(bb.B),
          H: s(bb.H),
          gevuld: s(bb.gevuldGewicht),
          aantal: s(aantal),
          metBinnenmaat: !!bb.binnenmaat,
          binnenL: s(bb.binnenmaat?.L),
          binnenB: s(bb.binnenmaat?.B),
          binnenH: s(bb.binnenmaat?.H),
          eigen: s(bb.eigenGewicht),
          // Een berekening van vóór ronde 6 heeft geen kantelgegevens bij de buitendoos: niet kantelbaar.
          kantelbaar: !!bb.kantelbaar,
          magL: !!bb.kantelbaar && !!bb.magVerticaal?.L,
          magB: !!bb.kantelbaar && !!bb.magVerticaal?.B,
        }
      : basis.bestaand,
    doostype: i.doostype.soort,
    custom: i.doostype.soort === 'custom' ? { tL: s(i.doostype.toeslagL), tB: s(i.doostype.toeslagB), tH: s(i.doostype.toeslagH), massa: s(i.doostype.kartonmassa) } : basis.custom,
    maxGevuld: s(i.maxGevuldGewicht),
    minPerDoos: i.minBinnendozenPerDoos !== undefined ? s(i.minBinnendozenPerDoos) : basis.minPerDoos,
    minPerLaag: i.minBuitendozenPerLaag !== undefined ? s(i.minBuitendozenPerLaag) : basis.minPerLaag,
    dragerId: i.drager.id,
    dragerSnapshot: { ...i.drager, overhang: { ...i.drager.overhang } },
    drager: dragerVelden(i.drager),
    tussenlaag: { soort: i.tussenlaag.soort, naElkeN: s(i.tussenlaag.naElkeN), dikte: s(i.tussenlaag.dikte), gewicht: s(i.tussenlaag.gewicht), maat: i.tussenlaag.maat },
    materiaal: {
      bodemvel: i.materiaal.bodemvel.aan,
      bodemDikte: s(i.materiaal.bodemvel.dikte),
      bodemGewicht: s(i.materiaal.bodemvel.gewicht),
      topvel: i.materiaal.topvel.aan,
      topDikte: s(i.materiaal.topvel.dikte),
      topGewicht: s(i.materiaal.topvel.gewicht),
      hoek: i.materiaal.hoekprofielen.aan,
      hoekGewicht: s(i.materiaal.hoekprofielen.gewicht),
      folie: i.materiaal.folie.aan,
      folieGewicht: s(i.materiaal.folie.gewicht),
    },
  };
}
