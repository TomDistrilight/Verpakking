// Rekenmodule: van invoer naar gerangschikte oplossingen (ontwerp §4).
// Deterministisch: dezelfde invoer geeft altijd hetzelfde resultaat. Afkappen gebeurt op
// een vast aantal voetafdrukken, niet op tijd (§6).

import type { Buitendoos, Invoer, Oplossing, Resultaat } from './types';
import { bestaandeKandidaten, binnendozenOpDrager, buitenmaatOverschrijding, maxVoetafdruk, ontwerpKandidaten, STANDAARD_VORMFACTOR, standen, standenBestaand } from './kandidaten';
import { eigenGewichtDoos, toeslag } from './karton';
import { isVariant, metVarianten, zoekPatronen, type Patroon, type PatroonResultaat } from './laagpatroon';
import { isEuropallet, moduleAfstand } from './module';
import { effectieveOverhang, plaats, zoekvlakken, type GeplaatsteLaag } from './plaatsing';
import { hoofdmaat, rangschik } from './rangschikking';
import { maxLagenHoogte, stapel, vasteHoogte, vastGewicht } from './stapelen';
import { beterVoorTweeLagen, zoekVerband, type VerbandUitkomst } from './verband';
import { spreidLading } from './spreiden';
import { getal, mm } from './format';

export const STANDAARD_ZOEKLIMIET = 1500;
/** Aantal voetafdrukken (in volgorde van potentie) waarvoor het vijfblokspatroon uitgebreid zoekt. */
const UITGEBREID_ZOEKEN = 200;
/** Maximaal aantal voetafdrukken waarvoor verband wordt gezocht; daarboven telt de zoektocht als afgekapt. */
const MAX_VERBAND_ZOEKEN = 300;
/** Voor zoveel voetafdrukken (de kansrijkste eerst) doen de varianten van het vijfblokspatroon mee in de verbandzoektocht (rekentijd, §6, #65). */
const VARIANTEN_ZOEKEN = 100;

/** Breedte van de verbandzoektocht: minder patronen bij veel dozen per laag (rekentijd, §6). */
function verbandBreedte(perLaag: number): number {
  if (perLaag <= 20) return 24;
  if (perLaag <= 60) return 12;
  return 6;
}

/** Zoveel varianten van het vijfblokspatroon komen hoogstens bovenop de breedte; minder bij veel dozen per laag (rekentijd, §6, #65). */
function verbandVarianten(perLaag: number): number {
  if (perLaag <= 20) return 8;
  if (perLaag <= 60) return 4;
  return 0;
}

/**
 * De patronen waaruit de verbandzoektocht kiest: de eerste patronen tot de breedte, zoals zonder varianten, plus
 * hoogstens verbandVarianten() varianten van het vijfblokspatroon (#65), of geen als `varianten` uit staat. `voorraad`
 * staat zoals verbandVoorraad() hem geeft.
 */
export function verbandVenster(voorraad: Patroon[], perLaag: number, varianten = true): Patroon[] {
  return metVarianten(voorraad, verbandBreedte(perLaag), varianten ? verbandVarianten(perLaag) : 0);
}

/**
 * De voorraad voor verband van één voetafdruk: de patronen van de zoekvlakken met het hoogste aantal per laag samen, met
 * minstens `minPerLaag` dozen, aflopend op aantal (stabiel: zonder overhang eerst). Bij een gelijk aantal komen de
 * varianten van het vijfblokspatroon achter de andere patronen, ook die van het andere zoekvlak (#65).
 */
export function verbandVoorraad(gelijk: PatroonResultaat[], minPerLaag = 1): Patroon[] {
  return gelijk
    .flatMap((r) => r.voorraad)
    .filter((p) => p.aantal >= minPerLaag)
    .map((p, i) => ({ p, i }))
    .sort((x, y) => y.p.aantal - x.p.aantal || Number(isVariant(x.p)) - Number(isVariant(y.p)) || x.i - y.i)
    .map((x) => x.p);
}

const pos = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const nietNeg = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Controleert de invoer; geeft een lijst met fouten in gewone taal. */
export function valideer(invoer: Invoer): string[] {
  const f: string[] = [];
  const d = invoer.drager;
  if (!invoer.artikelcode?.trim()) f.push('Vul een artikelcode in.');
  if (!Number.isInteger(invoer.artikelenPerBinnendoos) || invoer.artikelenPerBinnendoos < 1) f.push('Artikelen per binnendoos moet een geheel getal van minstens 1 zijn.');
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
      // Zonder binnendoos telt de buitendoos artikelen (ronde 5).
      if (bb.binnendozenPerDoos !== undefined && (!Number.isInteger(bb.binnendozenPerDoos) || bb.binnendozenPerDoos < 1))
        f.push(`${invoer.zonderBinnendoos ? 'Artikelen' : 'Binnendozen'} per buitendoos moet een geheel getal van minstens 1 zijn.`);
      if (bb.gevuldGewicht === undefined && (bb.eigenGewicht === undefined || !invoer.binnendoos))
        f.push(
          invoer.binnendoos
            ? 'Vul het gevulde gewicht van de buitendoos in, of het eigen gewicht, de binnenmaat en de binnendoos.'
            : 'Vul het gevulde gewicht van de buitendoos in.',
        );
      if (bb.eigenGewicht !== undefined && !nietNeg(bb.eigenGewicht)) f.push('Het eigen gewicht van de buitendoos moet een getal van 0 of meer zijn.');
      // Kantelen van de buitendoos zelf (ronde 6, #64): alleen zonder binnendoos; het formulier geeft het dan ook alleen dan door.
      if (bb.kantelbaar && !bb.magVerticaal?.L && !bb.magVerticaal?.B) f.push('Kantelbaar is aangevinkt bij de buitendoos, maar er is geen as gekozen die verticaal mag staan.');
      if (bb.binnenmaat) {
        const bi = bb.binnenmaat;
        if (!pos(bi.L) || !pos(bi.B) || !pos(bi.H)) f.push('De binnenmaat van de buitendoos moet groter dan 0 zijn.');
        else if (bi.H > bb.H || Math.max(bi.L, bi.B) > Math.max(bb.L, bb.B) || Math.min(bi.L, bi.B) > Math.min(bb.L, bb.B))
          f.push('De binnenmaat van de buitendoos is groter dan de buitenmaat.');
      }
    }
  }
  // Zonder buitendoos gelden doostype en max. gevulde buitendoos niet (de velden staan dan ook niet op het scherm).
  const zonderBuitendoos = invoer.instap === 'binnendoos' && !!invoer.zonderBuitendoos;
  // Het doostype geldt alleen voor een nieuw ontworpen buitendoos; bij een bestaande buitendoos staat het niet op het scherm.
  if (invoer.doostype.soort === 'custom' && invoer.instap === 'binnendoos' && !zonderBuitendoos) {
    const c = invoer.doostype;
    if (!nietNeg(c.toeslagL) || !nietNeg(c.toeslagB) || !nietNeg(c.toeslagH)) f.push('De toeslag van het custom doostype mag niet negatief zijn.');
    if (!nietNeg(c.kartonmassa)) f.push('De kartonmassa van het custom doostype mag niet negatief zijn.');
  }
  if (!zonderBuitendoos && !pos(invoer.maxGevuldGewicht)) f.push('Het maximum gevulde gewicht van de buitendoos moet groter dan 0 zijn.');
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
  if (invoer.minBinnendozenPerDoos !== undefined && !geheel(invoer.minBinnendozenPerDoos)) f.push('Min. binnendozen per buitendoos moet een geheel getal van minstens 1 zijn.');
  if (invoer.minBuitendozenPerLaag !== undefined && !geheel(invoer.minBuitendozenPerLaag)) f.push('Min. buitendozen per laag moet een geheel getal van minstens 1 zijn.');
  if (invoer.vormregel !== undefined && !['zacht', 'breedte', 'lengte', 'uit'].includes(invoer.vormregel)) f.push('Onbekende vormregel.');
  if (invoer.vormFactor !== undefined && !(typeof invoer.vormFactor === 'number' && Number.isFinite(invoer.vormFactor) && invoer.vormFactor >= 1))
    f.push('De max. hoogte van de vormregel moet een getal van minstens 1 × de breedte zijn.');
  if (invoer.minSteun !== undefined && !(typeof invoer.minSteun === 'number' && invoer.minSteun >= 0 && invoer.minSteun <= 1))
    f.push('De minimale ondersteuning moet tussen 0 en 100% liggen.');
  return f;
}

function tel(a: Record<string, number>, k: string, n = 1) {
  a[k] = (a[k] ?? 0) + n;
}

/** Opties voor bereken(); uitlijnen staat standaard aan (alleen tests zetten het uit). */
export interface RekenOpties {
  /** Bij verband de dozen waar mogelijk tegen de rand van het blok zetten (ronde 4, punt 2). */
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
  // Vormregel zacht (#66): eerst de voetafdrukken met een doos die niet hoger is dan breed, in de volgorde van "niet hoger dan
  // de breedte" (potentie van die dozen), dan die met alleen hoge dozen. Zo zoekt de app de platte dozen precies zoals bij
  // breedte, ook als de zoekruimte wordt afgekapt, en is de platte voorkeursoptie de uitkomst van breedte.
  const voetafdrukken = [...groepen.entries()]
    .map(([s, doos]) => {
      const plat = doos.filter((d) => !d.hoog);
      return { s, doos, plat: plat.length > 0, p: potentie(plat.length > 0 ? plat : doos) };
    })
    .sort((a, b) => Number(b.plat) - Number(a.plat) || b.p - a.p || (a.s < b.s ? -1 : a.s > b.s ? 1 : 0));
  const limiet = invoer.zoeklimiet ?? STANDAARD_ZOEKLIMIET;
  const afgekapt = voetafdrukken.length > limiet;
  const vlakken = zoekvlakken(invoer.drager);
  const europallet = isEuropallet(invoer.drager);
  // Hoog hoort erbij (#66): een hoge doos die meer geeft, mag het verband van een platte voetafdruk niet overslaan.
  const categorie = (d: Buitendoos) => `${d.gekanteld}|${europallet && d.module !== null}|${!!d.hoog}`;
  const hogeCategorie = (c: string) => c.endsWith('|true');
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
      id: `${d.L}x${d.B}x${d.H}-${d.indeling?.stand.verticaal ?? d.staandeAs ?? 'H'}-${d.binnendozenPerDoos ?? 0}-${wijze}-${u.oplossing.lagen.map((l) => l.dozen.length).join('.')}`,
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
    // Eerst het vlak zonder overhang; bij een gelijk aantal ook de patronen met overhang voor verband (verbandVoorraad).
    const gelijk = resultaten.filter((r) => r.max === max);
    const a = plaats(gelijk[0].voorraad[0].dozen, invoer.drager);
    if (!a) {
      tel(afgewezen, 'overhang', doos.length);
      continue;
    }
    // Alleen lagen met minstens het minimum aantal dozen, ook voor verband.
    const voorraad = verbandVoorraad(gelijk, minPerLaag);
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
  let verbandGezocht = 0;
  let verbandAfgekapt = false;
  /** Zoekt verband op voetafdruk `v` voor de dozen waarvoor `doet` waar is; onwaar als de zoektocht is afgekapt. */
  const zoekVerbandOp = (v: Voet, doet: (d: Buitendoos) => boolean): boolean => {
    if (verbandGezocht >= MAX_VERBAND_ZOEKEN) {
      verbandAfgekapt = true;
      return false;
    }
    verbandGezocht++;
    // De varianten van het vijfblokspatroon komen bovenop de breedte: dezelfde patronen als zonder varianten, plus
    // hoogstens verbandVarianten() varianten, bij de eerste VARIANTEN_ZOEKEN voetafdrukken (#65).
    const zoek = verbandVenster(v.voorraad, v.max, verbandGezocht <= VARIANTEN_ZOEKEN);
    const uitkomst: VerbandUitkomst = zoekVerband(
      zoek.map((p) => p.dozen),
      invoer.drager,
      zoek.length,
      invoer.minSteun ?? 0.75,
    );
    if (!uitkomst.tweezijdig && !uitkomst.eenzijdig) return true;
    /** Haalde de gewichtsgrens bij de laatste aanroep van kies() lagen af bij een van de doorgerekende paren? */
    let ingekort = false;
    /** De verbandoplossing voor doos `d` uit de paren van `u`. */
    const kies = (u: VerbandUitkomst, d: Buitendoos): Oplossing | null => {
      const lagenHoogte = maxLagenHoogte(d.H, invoer);
      const kort = (o: Oplossing | null) => lagenHoogte >= 2 && (!o || o.aantalLagen < lagenHoogte);
      ingekort = false;
      let beste: Oplossing | null = null;
      if (u.tweezijdig) {
        beste = maak(d, [u.tweezijdig.a, u.tweezijdig.b], 'verband', v.bewezen);
        if (kort(beste)) ingekort = true;
      }
      const een = u.eenzijdig;
      const tz = u.tweezijdig;
      if (een && een !== tz) {
        const twee = maak(d, [een.a, een.b], 'verband', v.bewezen);
        if (kort(twee)) ingekort = true;
        // Bij precies twee lagen telt alleen B op A: bij evenveel dozen wint het eenzijdige paar als laag B daarin
        // volgens dezelfde rangorde beter op laag A ligt dan in het tweezijdige paar (#60).
        const beterOpA = (t: Oplossing, b: Oplossing) => !!tz && b.aantalLagen === 2 && hoofdmaat(t) === hoofdmaat(b) && beterVoorTweeLagen(een, tz, invoer.minSteun ?? 0.75);
        if (twee && twee.aantalLagen === 2 && (!beste || hoofdmaat(twee) > hoofdmaat(beste) || beterOpA(twee, beste))) beste = twee;
      }
      return beste;
    };
    // Een paar met een variant kan meer dozen per laag hebben, zodat de gewichtsgrens er een laag af haalt. Haalt de
    // gewichtsgrens bij een van de paren lagen af, dan rekent de app ook de paren zonder varianten door (het venster van
    // V1.7) en houdt de oplossing met de meeste dozen per drager; bij evenveel blijft het paar met de variant (#65). Halen
    // alle paren de volle hoogte, dan geeft het paar met de variant nooit minder: het heeft het maximum per laag in laag A.
    const metVariant = zoek.some(isVariant);
    let zonderVarianten: VerbandUitkomst | null = null;
    for (const d of v.doos) {
      if (!doet(d)) continue;
      let beste = kies(uitkomst, d);
      if (metVariant && (!beste || ingekort)) {
        if (!zonderVarianten) {
          const oud = verbandVenster(v.voorraad, v.max, false);
          zonderVarianten = zoekVerband(
            oud.map((p) => p.dozen),
            invoer.drager,
            oud.length,
            invoer.minSteun ?? 0.75,
          );
        }
        const alt = kies(zonderVarianten, d);
        if (alt && (!beste || hoofdmaat(alt) > hoofdmaat(beste))) beste = alt;
      }
      if (!beste) continue;
      oplossingen.push(beste);
      const c = categorie(d);
      besteVerband.set(c, Math.max(besteVerband.get(c) ?? 0, hoofdmaat(beste)));
      besteVerbandAlles = Math.max(besteVerbandAlles, hoofdmaat(beste));
    }
    return true;
  };
  // De grens is een bovengrens voor verband op een voetafdruk; overslaan als die in de eigen soort niets kan veranderen.
  const nodig = (v: Voet, hoog: boolean) =>
    [...v.grens].some(([c, h]) => hogeCategorie(c) === hoog && (h * 11 > (besteRecht.get(c) ?? 0) * 10 || h > (besteVerband.get(c) ?? 0) || h > besteVerbandAlles));
  const grensVan = (v: Voet, hoog: boolean) => Math.max(0, ...[...v.grens].filter(([c]) => hogeCategorie(c) === hoog).map(([, h]) => h));
  const metSoort = (hoog: boolean) =>
    voeten.filter((v) => [...v.grens.keys()].some((c) => hogeCategorie(c) === hoog)).sort((x, y) => grensVan(y, hoog) - grensVan(x, hoog) || (x.s < y.s ? -1 : 1));
  // Eerst de platte dozen, in dezelfde volgorde en met dezelfde grenzen als bij "niet hoger dan de breedte"; een gevonden
  // verband geldt ook voor de hoge dozen op die voetafdruk. Daarna, bij zacht (#66), de voetafdrukken die alleen nog voor
  // de hoge dozen nodig zijn; die leveren alleen hoge oplossingen, zodat de platte precies die van breedte blijven.
  const gezocht = new Set<Voet>();
  for (const v of metSoort(false)) {
    if (!nodig(v, false)) continue;
    if (!zoekVerbandOp(v, () => true)) break;
    gezocht.add(v);
  }
  for (const v of metSoort(true)) {
    if (verbandAfgekapt) break;
    if (gezocht.has(v) || !nodig(v, true)) continue;
    if (!zoekVerbandOp(v, (d) => !!d.hoog)) break;
  }

  const rangorde = rangschik(oplossingen, invoer);
  // Bij verband dozen waar mogelijk tegen de rand van het blok (ronde 4, punt 2); een rechte stapeling
  // blijft gecentreerd, zoals plaats() hem neerzet. Aantallen, hoogte en gewicht veranderen daar niet
  // door, dus de rangorde blijft gelijk; alleen de getoonde oplossingen worden uitgelijnd.
  const uitgelijnd = new Map<string, Oplossing>();
  const top = rangorde.top.map((t) => {
    const uitlijnen = opties.uitlijnen !== false && t.oplossing.stapelwijze === 'verband';
    const o = uitlijnen ? spreidLading(t.oplossing, invoer, invoer.minSteun ?? 0.75) : t.oplossing;
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
    for (const m of verklaar(invoer, context)) if (!geenOplossing.includes(m) && !(redenen.length > 0 && m.startsWith('Geen geldige oplossing'))) geenOplossing.push(m);
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

/** De kleinst mogelijke buitendozen: één binnendoos per doos, in elke toegestane stand (een bestaande buitendoos in elke stand, #64). */
function kleinsteDozen(invoer: Invoer): KleinsteDoos[] {
  if (invoer.instap === 'binnendoos' && invoer.zonderBuitendoos) return binnendozenOpDrager(invoer).kandidaten.map((d) => ({ L: d.L, B: d.B, H: d.H, gewicht: d.gevuldGewicht }));
  if (invoer.instap === 'bestaandeBuitendoos') {
    const bb = invoer.bestaandeBuitendoos!;
    const gewicht = bb.gevuldGewicht ?? (bb.eigenGewicht ?? 0) + (bb.binnendozenPerDoos ?? 0) * (invoer.binnendoos?.gewicht ?? 0);
    return standenBestaand(invoer).map((st) => ({ L: st.L, B: st.B, H: st.H, gewicht }));
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

/** De hoogste toegestane hoogte volgens de vormregel, in gewone taal. */
function vormGrensTekst(invoer: Invoer): string {
  if (invoer.vormregel === 'zacht') return `${getal(invoer.vormFactor ?? STANDAARD_VORMFACTOR, 2)} × de breedte`;
  return invoer.vormregel === 'lengte' ? 'de lengte' : 'de breedte';
}

/** Bij geen oplossing: per overschreden grens de kleinste aanpassing van alleen die grens (§2 stap 3). */
export function verklaar(invoer: Invoer, context: { afgewezen?: Record<string, number>; minEenLaag?: number; maxPerLaag?: number; kandidaten?: number } = {}): string[] {
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
    // Zonder buitendoos gaat de binnendoos (of het artikel) zelf op de drager; het veld heet dan ook zo.
    const wat = invoer.zonderBuitendoos ? (invoer.zonderBinnendoos ? 'artikelen' : 'binnendozen') : 'buitendozen';
    const veld = `Verlaag "Min. ${wat} per laag" bij Ladingdrager`;
    if (bestaand && context.maxPerLaag !== undefined)
      m.push(
        `${invoer.zonderBuitendoos ? (invoer.zonderBinnendoos ? 'Het artikel' : 'De binnendoos') : 'De buitendoos'} past hoogstens ${context.maxPerLaag} keer in een laag; het minimum is ${minLaag} ${wat} per laag. ${veld}, bijvoorbeeld naar ${context.maxPerLaag}.`,
      );
    else m.push(`Geen oplossing met minstens ${minLaag} ${wat} per laag${context.maxPerLaag !== undefined ? ` (hoogstens ${context.maxPerLaag} gevonden)` : ''}. ${veld}.`);
  }
  if (!bestaand && geenKandidaten && (af.vorm ?? 0) > 0 && zonder({ vormregel: 'uit' }))
    m.push(`Geen buitendoos voldoet aan de vormregel (niet hoger dan ${vormGrensTekst(invoer)}, behalve bij één laag binnendozen). Pas de vormregel aan in de instellingen.`);
  const lichtste = Math.min(...dozen.map((x) => x.gewicht));
  if (!bestaand && lichtste > invoer.maxGevuldGewicht)
    m.push(`Eén binnendoos in een buitendoos weegt al ${getal(lichtste, 1)} kg; het maximum per buitendoos is ${getal(invoer.maxGevuldGewicht, 1)} kg.`);
  if (!bestaand && (context.afgewezen?.buitenmaat ?? 0) > 0) {
    // De kleinste doos (één binnendoos) met de minste overschrijdingen.
    const overschrijdingen = dozen
      .map((x) => ({ x, o: buitenmaatOverschrijding(x.L, x.B, x.H, invoer.minBuitenmaat, invoer.maxBuitenmaat) }))
      .sort((p, q) => p.o.length - q.o.length);
    const k = overschrijdingen[0];
    if (k && k.o.length > 0) m.push(`De kleinste mogelijke buitendoos (${mm(k.x.L)} × ${mm(k.x.B)} × ${mm(k.x.H)} mm) valt buiten de ingestelde buitenmaat: ${k.o.join('; ')}.`);
    else m.push('Geen enkele buitendoos valt binnen de ingestelde min./max. buitenmaat; controleer die grenzen in de instellingen.');
  }
  const laagste = Math.min(...dozen.map((x) => x.H));
  const minHoogte = vasteHoogte(invoer) + laagste;
  if (minHoogte > d.maxTotaleHoogte) m.push(`Eén laag is met de drager al ${mm(minHoogte)} mm hoog; het maximum is ${mm(d.maxTotaleHoogte)} mm.`);
  const minGewicht = vastGewicht(invoer) + lichtste;
  if (context.minEenLaag !== undefined && context.minEenLaag > d.maxTotaalGewicht)
    m.push(
      `Eén volle laag weegt met de drager al ${getal(context.minEenLaag, 1)} kg; het maximale totaalgewicht moet minstens zo hoog zijn (nu ${getal(d.maxTotaalGewicht, 1)} kg).`,
    );
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
