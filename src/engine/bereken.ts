// Rekenmodule: van invoer naar gerangschikte oplossingen (ontwerp §4).
// Deterministisch: dezelfde invoer geeft altijd hetzelfde resultaat. Afkappen gebeurt op
// een vast aantal voetafdrukken, niet op tijd (§6).

import type { Buitendoos, Invoer, Oplossing, Resultaat } from './types';
import { bestaandeKandidaten, binnendozenOpDrager, buitenmaatOverschrijding, maxVoetafdruk, ontwerpKandidaten, standen } from './kandidaten';
import { eigenGewichtDoos, toeslag } from './karton';
import { zoekPatronen, type Patroon, type PatroonResultaat } from './laagpatroon';
import { isEuropallet, moduleAfstand } from './module';
import { effectieveOverhang, plaats, zoekvlakken, type GeplaatsteLaag } from './plaatsing';
import { hoofdmaat, rangschik } from './rangschikking';
import { maxLagenHoogte, stapel, vasteHoogte, vastGewicht } from './stapelen';
import { zoekVerband, type VerbandUitkomst } from './verband';
import { spreidLading } from './spreiden';
import { getal, mm } from './format';

export const STANDAARD_ZOEKLIMIET = 1500;
/** Aantal voetafdrukken (in volgorde van potentie) waarvoor het vijfblokspatroon uitgebreid zoekt. */
const UITGEBREID_ZOEKEN = 200;
/** Maximaal aantal voetafdrukken waarvoor verband wordt gezocht; daarboven telt de zoektocht als afgekapt. */
const MAX_VERBAND_ZOEKEN = 300;

/** Breedte van de verbandzoektocht: minder patronen bij veel dozen per laag (rekentijd, §6). */
function verbandBreedte(perLaag: number): number {
  if (perLaag <= 20) return 24;
  if (perLaag <= 60) return 12;
  return 6;
}

const pos = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const nietNeg = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Controleert de invoer; geeft een lijst met fouten in gewone taal. */
export function valideer(invoer: Invoer): string[] {
  const f: string[] = [];
  const d = invoer.drager;
  if (!invoer.artikelcode?.trim()) f.push('Vul een artikelcode in.');
  if (!Number.isInteger(invoer.artikelenPerBinnendoos) || invoer.artikelenPerBinnendoos < 1) f.push('Aantal artikelen per binnendoos moet een geheel getal van minstens 1 zijn.');
  if (invoer.instap === 'binnendoos' || invoer.binnendoos) {
    const b = invoer.binnendoos;
    if (!b) f.push('Vul de binnendoos in.');
    else {
      if (!pos(b.L) || !pos(b.B) || !pos(b.H)) f.push('Lengte, breedte en hoogte van de binnendoos moeten groter dan 0 zijn.');
      if (!pos(b.gewicht)) f.push('Het gevulde gewicht van de binnendoos moet groter dan 0 zijn.');
      if (b.kantelbaar && !b.magVerticaal.L && !b.magVerticaal.B) f.push('Kantelbaar is aangevinkt, maar er is geen as gekozen die verticaal mag staan.');
    }
  }
  if (invoer.instap === 'bestaandeBuitendoos') {
    const bb = invoer.bestaandeBuitendoos;
    if (!bb) f.push('Vul de bestaande buitendoos in.');
    else {
      if (!pos(bb.L) || !pos(bb.B) || !pos(bb.H)) f.push('Lengte, breedte en hoogte van de buitendoos moeten groter dan 0 zijn.');
      if (bb.gevuldGewicht !== undefined && !pos(bb.gevuldGewicht)) f.push('Het gevulde gewicht van de buitendoos moet groter dan 0 zijn.');
      if (bb.binnendozenPerDoos !== undefined && (!Number.isInteger(bb.binnendozenPerDoos) || bb.binnendozenPerDoos < 1))
        f.push('Binnendozen per buitendoos moet een geheel getal van minstens 1 zijn.');
      if (bb.gevuldGewicht === undefined && (bb.eigenGewicht === undefined || !invoer.binnendoos))
        f.push('Vul het gevulde gewicht van de buitendoos in, of het eigen gewicht, de binnenmaat en de binnendoos.');
      if (bb.eigenGewicht !== undefined && !nietNeg(bb.eigenGewicht)) f.push('Het eigen gewicht van de buitendoos moet een getal van 0 of meer zijn.');
      if (bb.binnenmaat) {
        const bi = bb.binnenmaat;
        if (!pos(bi.L) || !pos(bi.B) || !pos(bi.H)) f.push('De binnenmaat van de buitendoos moet groter dan 0 zijn.');
        else if (bi.H > bb.H || Math.max(bi.L, bi.B) > Math.max(bb.L, bb.B) || Math.min(bi.L, bi.B) > Math.min(bb.L, bb.B))
          f.push('De binnenmaat van de buitendoos is groter dan de buitenmaat.');
      }
    }
  }
  if (invoer.doostype.soort === 'custom') {
    const c = invoer.doostype;
    if (!nietNeg(c.toeslagL) || !nietNeg(c.toeslagB) || !nietNeg(c.toeslagH)) f.push('De toeslag van het custom doostype mag niet negatief zijn.');
    if (!nietNeg(c.kartonmassa)) f.push('De kartonmassa van het custom doostype mag niet negatief zijn.');
  }
  if (!pos(invoer.maxGevuldGewicht)) f.push('Het maximum gevulde gewicht van de buitendoos moet groter dan 0 zijn.');
  if (!pos(d.lengte) || !pos(d.breedte)) f.push('Lengte en breedte van de drager moeten groter dan 0 zijn.');
  if (!nietNeg(d.hoogte) || !nietNeg(d.gewicht)) f.push('Hoogte en gewicht van de drager mogen niet negatief zijn.');
  if (!pos(d.maxTotaleHoogte)) f.push('De maximale totale hoogte moet groter dan 0 zijn.');
  else if (d.maxTotaleHoogte <= d.hoogte) f.push('De maximale totale hoogte moet groter zijn dan de hoogte van de drager.');
  if (!pos(d.maxTotaalGewicht)) f.push('Het maximale totaalgewicht moet groter dan 0 zijn.');
  else if (d.maxTotaalGewicht <= d.gewicht) f.push('Het maximale totaalgewicht moet groter zijn dan het gewicht van de drager.');
  const o = d.overhang;
  if (!nietNeg(o.voor) || !nietNeg(o.achter) || !nietNeg(o.links) || !nietNeg(o.rechts)) f.push('Overhang mag niet negatief zijn.');
  const t = invoer.tussenlaag;
  if (t.soort !== 'geen') {
    if (!Number.isInteger(t.naElkeN) || t.naElkeN < 1) f.push('Tussenlaag "na elke N lagen" moet een geheel getal van minstens 1 zijn.');
    if (!nietNeg(t.dikte) || !nietNeg(t.gewicht)) f.push('Vul dikte en gewicht van de tussenlaag in (0 of meer).');
  }
  const m = invoer.materiaal;
  for (const [naam, v] of [
    ['bodemvel', m.bodemvel],
    ['topvel', m.topvel],
  ] as const)
    if (v.aan && (!nietNeg(v.dikte) || !nietNeg(v.gewicht))) f.push(`Vul dikte en gewicht van het ${naam} in (0 of meer).`);
  if (m.hoekprofielen.aan && !nietNeg(m.hoekprofielen.gewicht)) f.push('Vul het gewicht van de hoekprofielen in (0 of meer).');
  if (m.folie.aan && !nietNeg(m.folie.gewicht)) f.push('Vul het gewicht van de stretchfolie in (0 of meer).');
  const geheel = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 1;
  if (invoer.minBinnendozenPerDoos !== undefined && !geheel(invoer.minBinnendozenPerDoos))
    f.push('Min. binnendozen per buitendoos moet een geheel getal van minstens 1 zijn.');
  if (invoer.minBuitendozenPerLaag !== undefined && !geheel(invoer.minBuitendozenPerLaag))
    f.push('Min. buitendozen per laag moet een geheel getal van minstens 1 zijn.');
  if (invoer.vormregel !== undefined && !['breedte', 'lengte', 'uit'].includes(invoer.vormregel)) f.push('Onbekende vormregel.');
  if (invoer.minSteun !== undefined && !(typeof invoer.minSteun === 'number' && invoer.minSteun >= 0 && invoer.minSteun <= 1))
    f.push('De minimale ondersteuning moet tussen 0 en 100% liggen.');
  return f;
}

function tel(a: Record<string, number>, k: string, n = 1) {
  a[k] = (a[k] ?? 0) + n;
}

/** Opties voor bereken(); uitlijnen staat standaard aan (alleen tests zetten het uit). */
export interface RekenOpties {
  /** Dozen waar mogelijk tegen de rand van de drager zetten (ronde 4, punt 2). */
  uitlijnen?: boolean;
}

export function bereken(invoer: Invoer, opties: RekenOpties = {}): Resultaat {
  const fouten = valideer(invoer);
  if (fouten.length > 0) throw new Error(fouten.join('\n'));

  const afgewezen: Record<string, number> = {};
  const redenen: string[] = [];
  let kandidaten: Buitendoos[] = [];
  if (invoer.instap === 'binnendoos' && invoer.zonderBuitendoos) {
    kandidaten = binnendozenOpDrager(invoer).kandidaten;
  } else if (invoer.instap === 'binnendoos') {
    const k = ontwerpKandidaten(invoer);
    kandidaten = k.kandidaten;
    for (const [s, n] of Object.entries(k.afgewezen)) tel(afgewezen, s, n);
  } else {
    const b = bestaandeKandidaten(invoer);
    kandidaten = b.kandidaten;
    redenen.push(...b.redenen);
  }

  // Groeperen per voetafdruk: het laagpatroon hangt niet af van de hoogte.
  const groepen = new Map<string, Buitendoos[]>();
  for (const k of kandidaten) {
    const s = `${k.L}x${k.B}`;
    const g = groepen.get(s);
    if (g) g.push(k);
    else groepen.set(s, [k]);
  }
  const { r1, r2 } = maxVoetafdruk(invoer);
  const potentie = (doos: Buitendoos[]) => {
    const perLaag = Math.floor((r1 * r2) / (doos[0].L * doos[0].B));
    return Math.max(...doos.map((d) => perLaag * maxLagenHoogte(d.H, invoer) * (d.binnendozenPerDoos ?? 1)));
  };
  const voetafdrukken = [...groepen.entries()]
    .map(([s, doos]) => ({ s, doos, p: potentie(doos) }))
    .sort((a, b) => b.p - a.p || (a.s < b.s ? -1 : a.s > b.s ? 1 : 0));
  const limiet = invoer.zoeklimiet ?? STANDAARD_ZOEKLIMIET;
  const afgekapt = voetafdrukken.length > limiet;
  const vlakken = zoekvlakken(invoer.drager);
  const europallet = isEuropallet(invoer.drager);
  const categorie = (d: Buitendoos) => `${d.gekanteld}|${europallet && d.module !== null}`;
  const basisVast = vastGewicht(invoer);
  const minPerLaag = invoer.minBuitendozenPerLaag ?? 1;
  let minEenLaag = Infinity;
  /** Het hoogste aantal dozen per laag op een voetafdruk die afviel op het minimum per laag. */
  let maxPerLaagTeLaag = 0;
  /** Minstens één voetafdruk haalde het minimum per laag; dan is dat minimum niet de oorzaak. */
  let minPerLaagGehaald = false;

  // Ronde 1: laagpatronen en rechte stapeling per voetafdruk.
  interface Voet {
    s: string;
    doos: Buitendoos[];
    voorraad: Patroon[];
    bewezen: boolean;
    recht: Map<string, number>;
    /** Bovengrens voor verband per categorie (bij een bindende gewichtsgrens kan verband meer lagen halen). */
    grens: Map<string, number>;
    max: number;
  }
  const voeten: Voet[] = [];
  const oplossingen: Oplossing[] = [];
  const maak = (d: Buitendoos, lagen: GeplaatsteLaag[], wijze: 'recht' | 'verband', bewezen: boolean): Oplossing | null => {
    if (lagen.some((l) => l.dozen.length < minPerLaag)) return null;
    const u = stapel(d, lagen, wijze, invoer);
    if (!u.oplossing) {
      if (wijze === 'recht') {
        tel(afgewezen, u.afwijzing ?? 'onbekend');
        if (u.afwijzing === 'gewichtDrager') minEenLaag = Math.min(minEenLaag, basisVast + lagen[0].dozen.length * d.gevuldGewicht);
      }
      return null;
    }
    return {
      ...u.oplossing,
      id: `${d.L}x${d.B}x${d.H}-${d.indeling?.stand.verticaal ?? 'H'}-${d.binnendozenPerDoos ?? 0}-${wijze}-${u.oplossing.lagen.map((l) => l.dozen.length).join('.')}`,
      moduleAfstand: europallet ? moduleAfstand(d.L, d.B) : null,
      laagBewezen: bewezen,
    };
  };
  for (const [idx, { s, doos }] of voetafdrukken.slice(0, limiet).entries()) {
    const { L, B } = doos[0];
    // Het uitgebreide vijfblokspatroon alleen voor de kansrijkste voetafdrukken (rekentijd, §6).
    const opties = { vijfblokRaster: idx < UITGEBREID_ZOEKEN ? 60 : 30 };
    const resultaten: PatroonResultaat[] = vlakken.map((v) => zoekPatronen(v.W, v.D, L, B, opties));
    const max = Math.max(...resultaten.map((r) => r.max));
    if (max === 0) {
      tel(afgewezen, 'pastNietOpDrager', doos.length);
      continue;
    }
    if (max < minPerLaag) {
      tel(afgewezen, 'minPerLaag', doos.length);
      maxPerLaagTeLaag = Math.max(maxPerLaagTeLaag, max);
      continue;
    }
    minPerLaagGehaald = true;
    // Eerst het vlak zonder overhang; bij een gelijk aantal ook de patronen met overhang voor verband,
    // samen gesorteerd op aantal (stabiel: zonder overhang eerst).
    const gelijk = resultaten.filter((r) => r.max === max);
    const a = plaats(gelijk[0].voorraad[0].dozen, invoer.drager);
    if (!a) {
      tel(afgewezen, 'overhang', doos.length);
      continue;
    }
    // Alleen lagen met minstens het minimum aantal dozen, ook voor verband.
    const voorraad = gelijk
      .flatMap((r) => r.voorraad)
      .filter((p) => p.aantal >= minPerLaag)
      .map((p, i) => ({ p, i }))
      .sort((x, y) => y.p.aantal - x.p.aantal || x.i - y.i)
      .map((x) => x.p);
    // Bewezen maximaal als het aantal de bovengrens van elk zoekvlak haalt (ook het grootste, met overhang).
    const bewezen = resultaten.every((r) => max >= r.bovengrens);
    const voet: Voet = { s, doos, voorraad, bewezen, recht: new Map(), grens: new Map(), max };
    for (const d of doos) {
      const o = maak(d, [a], 'recht', voet.bewezen);
      const c = categorie(d);
      const lagenHoogte = maxLagenHoogte(d.H, invoer);
      const ruim = lagenHoogte * max * (d.binnendozenPerDoos ?? 1);
      if (o) {
        oplossingen.push(o);
        voet.recht.set(c, Math.max(voet.recht.get(c) ?? 0, hoofdmaat(o)));
      }
      // Beperkt het gewicht de rechte stapeling, dan kan verband met minder dozen per laag meer lagen halen.
      const grens = o && o.aantalLagen === lagenHoogte ? hoofdmaat(o) : ruim;
      if (lagenHoogte >= 2) voet.grens.set(c, Math.max(voet.grens.get(c) ?? 0, grens));
    }
    if (voet.grens.size > 0) voeten.push(voet);
  }

  // Ronde 2: verband, alleen waar het de winnaar of de beste verbandoplossing kan veranderen.
  const besteRecht = new Map<string, number>();
  for (const v of voeten) for (const [c, h] of v.recht) besteRecht.set(c, Math.max(besteRecht.get(c) ?? 0, h));
  const besteVerband = new Map<string, number>();
  let besteVerbandAlles = 0;
  const volgorde = [...voeten].sort((x, y) => Math.max(...y.grens.values()) - Math.max(...x.grens.values()) || (x.s < y.s ? -1 : 1));
  let verbandGezocht = 0;
  let verbandAfgekapt = false;
  for (const v of volgorde) {
    // De grens is een bovengrens voor verband op deze voetafdruk; overslaan als die niets kan veranderen.
    const nodig = [...v.grens].some(([c, h]) => h * 11 > (besteRecht.get(c) ?? 0) * 10 || h > (besteVerband.get(c) ?? 0) || h > besteVerbandAlles);
    if (!nodig) continue;
    if (verbandGezocht >= MAX_VERBAND_ZOEKEN) {
      verbandAfgekapt = true;
      break;
    }
    verbandGezocht++;
    const uitkomst: VerbandUitkomst = zoekVerband(
      v.voorraad.map((p) => p.dozen),
      invoer.drager,
      verbandBreedte(v.max),
    );
    if (!uitkomst.tweezijdig && !uitkomst.eenzijdig) continue;
    for (const d of v.doos) {
      let beste: Oplossing | null = null;
      if (uitkomst.tweezijdig) beste = maak(d, [uitkomst.tweezijdig.a, uitkomst.tweezijdig.b], 'verband', v.bewezen);
      if (uitkomst.eenzijdig && uitkomst.eenzijdig !== uitkomst.tweezijdig) {
        const twee = maak(d, [uitkomst.eenzijdig.a, uitkomst.eenzijdig.b], 'verband', v.bewezen);
        if (twee && twee.aantalLagen === 2 && (!beste || hoofdmaat(twee) > hoofdmaat(beste))) beste = twee;
      }
      if (!beste) continue;
      oplossingen.push(beste);
      const c = categorie(d);
      besteVerband.set(c, Math.max(besteVerband.get(c) ?? 0, hoofdmaat(beste)));
      besteVerbandAlles = Math.max(besteVerbandAlles, hoofdmaat(beste));
    }
  }

  const rangorde = rangschik(oplossingen, invoer);
  // Dozen waar mogelijk tegen de rand van de drager (ronde 4, punt 2). Aantallen, hoogte en gewicht
  // veranderen daar niet door, dus de rangorde blijft gelijk; alleen de getoonde oplossingen worden uitgelijnd.
  const uitgelijnd = new Map<string, Oplossing>();
  const top = rangorde.top.map((t) => {
    const o = opties.uitlijnen === false ? t.oplossing : spreidLading(t.oplossing, invoer, invoer.minSteun ?? 0.75);
    uitgelijnd.set(t.oplossing.id, o);
    return { ...t, oplossing: o };
  });
  const gesorteerd = rangorde.gesorteerd.map((o) => uitgelijnd.get(o.id) ?? o);
  const geenOplossing: string[] = [];
  if (gesorteerd.length === 0) {
    geenOplossing.push(...redenen);
    const context = {
      afgewezen,
      minEenLaag: Number.isFinite(minEenLaag) ? minEenLaag : undefined,
      maxPerLaag: maxPerLaagTeLaag > 0 && !minPerLaagGehaald ? maxPerLaagTeLaag : undefined,
      kandidaten: kandidaten.length,
    };
    for (const m of verklaar(invoer, context))
      if (!geenOplossing.includes(m) && !(redenen.length > 0 && m.startsWith('Geen geldige oplossing'))) geenOplossing.push(m);
  }
  return {
    invoer,
    oplossingen: gesorteerd,
    top,
    geenOplossing,
    log: {
      kandidaten: kandidaten.length,
      voetafdrukken: Math.min(voetafdrukken.length, limiet),
      afgekapt: afgekapt || verbandAfgekapt,
      afgewezen,
      laagNietBewezen: gesorteerd.length > 0 && !gesorteerd[0].laagBewezen,
    },
  };
}

interface KleinsteDoos {
  L: number;
  B: number;
  H: number;
  gewicht: number;
}

/** De kleinst mogelijke buitendozen: één binnendoos per doos, in elke toegestane stand. */
function kleinsteDozen(invoer: Invoer): KleinsteDoos[] {
  if (invoer.instap === 'binnendoos' && invoer.zonderBuitendoos)
    return binnendozenOpDrager(invoer).kandidaten.map((d) => ({ L: d.L, B: d.B, H: d.H, gewicht: d.gevuldGewicht }));
  if (invoer.instap === 'bestaandeBuitendoos') {
    const bb = invoer.bestaandeBuitendoos!;
    const gewicht = bb.gevuldGewicht ?? (bb.eigenGewicht ?? 0) + (bb.binnendozenPerDoos ?? 0) * (invoer.binnendoos?.gewicht ?? 0);
    return [{ L: Math.max(bb.L, bb.B), B: Math.min(bb.L, bb.B), H: bb.H, gewicht }];
  }
  const t = toeslag(invoer.doostype);
  return standen(invoer.binnendoos!).map((st) => {
    const [a, b] = st.horizontaal.map(([, m]) => m);
    const L = Math.max(a, b) + t.L;
    const B = Math.min(a, b) + t.B;
    const H = st.hoogte + t.H;
    return { L, B, H, gewicht: invoer.binnendoos!.gewicht + eigenGewichtDoos(L, B, H, invoer.doostype) };
  });
}

/** Bij geen oplossing: per overschreden grens de kleinste aanpassing van alleen die grens (§2 stap 3). */
export function verklaar(
  invoer: Invoer,
  context: { afgewezen?: Record<string, number>; minEenLaag?: number; maxPerLaag?: number; kandidaten?: number } = {},
): string[] {
  const d = invoer.drager;
  const dozen = kleinsteDozen(invoer);
  const m: string[] = [];
  // Bij een bestaande buitendoos of zonder buitendoos ligt de doos vast: geen meldingen over het ontwerp ervan.
  const bestaand = invoer.instap === 'bestaandeBuitendoos' || !!invoer.zonderBuitendoos;
  const af = context.afgewezen ?? {};
  // Minimumaantallen en vormregel: alleen noemen als ze dozen hebben weggestreept die zonder die
  // regel wel waren overgebleven (een snelle tweede kandidaatronde met alleen die regel losgelaten).
  const minDoos = invoer.minBinnendozenPerDoos ?? 1;
  const minLaag = invoer.minBuitendozenPerLaag ?? 1;
  const geenKandidaten = context.kandidaten === 0;
  const zonder = (w: Partial<Invoer>) => !bestaand && ontwerpKandidaten({ ...invoer, ...w }).kandidaten.length > 0;
  if (!bestaand && geenKandidaten && minDoos > 1 && (af.minBinnendozen ?? 0) > 0 && zonder({ minBinnendozenPerDoos: 1 })) {
    const zwaarte = minDoos * invoer.binnendoos!.gewicht;
    if (zwaarte > invoer.maxGevuldGewicht)
      m.push(
        `${minDoos} binnendozen wegen samen al ${getal(zwaarte, 1)} kg; het maximum per buitendoos is ${getal(invoer.maxGevuldGewicht, 1)} kg. Verlaag het minimum aantal binnendozen per buitendoos.`,
      );
    else m.push(`Geen buitendoos met minstens ${minDoos} binnendozen past binnen de grenzen. Verlaag het minimum aantal binnendozen per buitendoos.`);
  }
  if (minLaag > 1 && (af.minPerLaag ?? 0) > 0 && (context.maxPerLaag !== undefined || (geenKandidaten && zonder({ minBuitendozenPerLaag: 1 })))) {
    if (bestaand && context.maxPerLaag !== undefined)
      m.push(
        `De ${invoer.zonderBuitendoos ? 'binnendoos' : 'buitendoos'} past hoogstens ${context.maxPerLaag} keer in een laag; het minimum is ${minLaag} ${invoer.zonderBuitendoos ? 'dozen' : 'buitendozen'} per laag.`,
      );
    else
      m.push(
        `Geen oplossing met minstens ${minLaag} buitendozen per laag${context.maxPerLaag !== undefined ? ` (hoogstens ${context.maxPerLaag} gevonden)` : ''}. Verlaag het minimum aantal buitendozen per laag.`,
      );
  }
  if (!bestaand && geenKandidaten && (af.vorm ?? 0) > 0 && zonder({ vormregel: 'uit' }))
    m.push(
      `Geen buitendoos voldoet aan de vormregel (niet hoger dan de ${invoer.vormregel === 'lengte' ? 'lengte' : 'breedte'}, behalve bij één laag binnendozen). Pas de vormregel aan in de instellingen.`,
    );
  const lichtste = Math.min(...dozen.map((x) => x.gewicht));
  if (!bestaand && lichtste > invoer.maxGevuldGewicht)
    m.push(`Eén binnendoos in een buitendoos weegt al ${getal(lichtste, 1)} kg; het maximum per buitendoos is ${getal(invoer.maxGevuldGewicht, 1)} kg.`);
  if (!bestaand && (context.afgewezen?.buitenmaat ?? 0) > 0) {
    // De kleinste doos (één binnendoos) met de minste overschrijdingen.
    const overschrijdingen = dozen
      .map((x) => ({ x, o: buitenmaatOverschrijding(x.L, x.B, x.H, invoer.minBuitenmaat, invoer.maxBuitenmaat) }))
      .sort((p, q) => p.o.length - q.o.length);
    const k = overschrijdingen[0];
    if (k && k.o.length > 0)
      m.push(`De kleinste mogelijke buitendoos (${mm(k.x.L)} × ${mm(k.x.B)} × ${mm(k.x.H)} mm) valt buiten de ingestelde buitenmaat: ${k.o.join('; ')}.`);
    else m.push('Geen enkele buitendoos valt binnen de ingestelde min./max. buitenmaat; controleer die grenzen in de instellingen.');
  }
  const laagste = Math.min(...dozen.map((x) => x.H));
  const minHoogte = vasteHoogte(invoer) + laagste;
  if (minHoogte > d.maxTotaleHoogte) m.push(`Eén laag is met de drager al ${mm(minHoogte)} mm hoog; het maximum is ${mm(d.maxTotaleHoogte)} mm.`);
  const minGewicht = vastGewicht(invoer) + lichtste;
  if (context.minEenLaag !== undefined && context.minEenLaag > d.maxTotaalGewicht)
    m.push(`Eén volle laag weegt met de drager al ${getal(context.minEenLaag, 1)} kg; het maximale totaalgewicht moet minstens zo hoog zijn (nu ${getal(d.maxTotaalGewicht, 1)} kg).`);
  else if (minGewicht > d.maxTotaalGewicht) m.push(`Eén buitendoos op de drager weegt al ${getal(minGewicht, 1)} kg; het maximum is ${getal(d.maxTotaalGewicht, 1)} kg.`);

  // Voetafdruk: past de kleinste doos ergens, met de ingestelde overhang?
  const oh = effectieveOverhang(d);
  const extraLengte = d.asymmetrieToegestaan ? oh.voor + oh.achter : 2 * Math.min(oh.voor, oh.achter);
  const extraBreedte = d.asymmetrieToegestaan ? oh.links + oh.rechts : 2 * Math.min(oh.links, oh.rechts);
  const past = (l: number, b: number) => Math.max(0, l - d.lengte) <= extraLengte + 1e-6 && Math.max(0, b - d.breedte) <= extraBreedte + 1e-6;
  let beste: { nodigL: number; nodigB: number; maat: number } | null = null;
  if (!dozen.some((x) => past(x.L, x.B) || past(x.B, x.L))) {
    for (const x of dozen) {
      for (const [langs, dwars] of [
        [x.L, x.B],
        [x.B, x.L],
      ]) {
        const nodigL = Math.max(0, langs - d.lengte);
        const nodigB = Math.max(0, dwars - d.breedte);
        const som = nodigL + nodigB;
        if (!beste || som < beste.nodigL + beste.nodigB || (som === beste.nodigL + beste.nodigB && nodigB < beste.nodigB))
          beste = { nodigL, nodigB, maat: nodigL > 0 ? langs : dwars };
      }
    }
  }
  if (beste) {
    if (d.type === 'kar') m.push(`De doos van ${mm(beste.maat)} mm past niet in de kar (binnenmaat ${mm(d.lengte)} × ${mm(d.breedte)} mm).`);
    else {
      const delen: string[] = [];
      if (beste.nodigL > 0) delen.push(`minstens ${mm(beste.nodigL)} mm overhang in de lengte (voor en achter samen)`);
      if (beste.nodigB > 0) delen.push(`minstens ${mm(beste.nodigB)} mm overhang in de breedte (links en rechts samen)`);
      const ingesteld = d.overhangToegestaan ? ` Ingesteld: ${mm(extraLengte)} mm in de lengte en ${mm(extraBreedte)} mm in de breedte.` : '';
      m.push(`Doos van ${mm(beste.maat)} mm past alleen met ${delen.join(' en ')}.${ingesteld}`);
    }
  }
  if (m.length === 0) m.push('Geen geldige oplossing gevonden binnen de ingestelde grenzen.');
  return m;
}
