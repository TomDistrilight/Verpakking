// Rekenmodule: van invoer naar gerangschikte oplossingen (ontwerp §4).
// Deterministisch: dezelfde invoer geeft altijd hetzelfde resultaat. Afkappen gebeurt op
// een vast aantal voetafdrukken, niet op tijd (§6).

import type { Buitendoos, Invoer, Oplossing, Resultaat } from './types';
import { bestaandeKandidaat, maxVoetafdruk, ontwerpKandidaten, standen } from './kandidaten';
import { eigenGewichtDoos, toeslag } from './karton';
import { zoekPatronen, type PatroonResultaat } from './laagpatroon';
import { isEuropallet, moduleAfstand } from './module';
import { effectieveOverhang, plaats, zoekvlakken } from './plaatsing';
import { rangschik } from './rangschikking';
import { maxLagenHoogte, stapel, vasteHoogte, vastGewicht } from './stapelen';
import { zoekVerband } from './verband';
import { getal, mm } from './format';

export const STANDAARD_ZOEKLIMIET = 1500;

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
    if (!nietNeg(t.dikte) || !nietNeg(t.gewicht)) f.push('Dikte en gewicht van de tussenlaag mogen niet negatief zijn.');
  }
  const m = invoer.materiaal;
  for (const [naam, v] of [
    ['bodemvel', m.bodemvel],
    ['topvel', m.topvel],
  ] as const)
    if (v.aan && (!nietNeg(v.dikte) || !nietNeg(v.gewicht))) f.push(`Dikte en gewicht van het ${naam} mogen niet negatief zijn.`);
  return f;
}

function tel(a: Record<string, number>, k: string, n = 1) {
  a[k] = (a[k] ?? 0) + n;
}

/** Maximaal aantal patronen voor de verbandzoektocht, afhankelijk van het aantal dozen per laag. */
function verbandBreedte(perLaag: number): number {
  if (perLaag <= 20) return 12;
  if (perLaag <= 60) return 6;
  return 3;
}

export function bereken(invoer: Invoer): Resultaat {
  const fouten = valideer(invoer);
  if (fouten.length > 0) throw new Error(fouten.join('\n'));

  const afgewezen: Record<string, number> = {};
  const geenOplossing: string[] = [];
  let kandidaten: Buitendoos[] = [];
  if (invoer.instap === 'binnendoos') {
    const k = ontwerpKandidaten(invoer);
    kandidaten = k.kandidaten;
    for (const [s, n] of Object.entries(k.afgewezen)) tel(afgewezen, s, n);
  } else {
    const b = bestaandeKandidaat(invoer);
    if (b.kandidaat) kandidaten = [b.kandidaat];
    else if (b.reden) geenOplossing.push(b.reden);
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

  const oplossingen: Oplossing[] = [];
  for (const { doos } of voetafdrukken.slice(0, limiet)) {
    const { L, B } = doos[0];
    let gekozen: PatroonResultaat | null = null;
    for (const v of vlakken) {
      const r = zoekPatronen(v.W, v.D, L, B);
      if (!gekozen || r.max > gekozen.max) gekozen = r;
    }
    if (!gekozen || gekozen.max === 0) {
      tel(afgewezen, 'pastNietOpDrager', doos.length);
      continue;
    }
    const a = plaats(gekozen.voorraad[0].dozen, invoer.drager);
    if (!a) {
      tel(afgewezen, 'overhang', doos.length);
      continue;
    }
    const paar = zoekVerband(
      gekozen.voorraad.map((p) => p.dozen),
      invoer.drager,
      verbandBreedte(gekozen.max),
    );
    for (const d of doos) {
      const varianten: { lagen: typeof a[]; wijze: 'recht' | 'verband' }[] = [{ lagen: [a], wijze: 'recht' }];
      if (paar) varianten.push({ lagen: [paar.a, paar.b], wijze: 'verband' });
      for (const v of varianten) {
        const u = stapel(d, v.lagen, v.wijze, invoer);
        if (!u.oplossing) {
          if (v.wijze === 'recht') tel(afgewezen, u.afwijzing ?? 'onbekend');
          continue;
        }
        oplossingen.push({
          ...u.oplossing,
          id: `${d.L}x${d.B}x${d.H}-${d.indeling?.stand.verticaal ?? 'H'}-${v.wijze}`,
          moduleAfstand: europallet ? moduleAfstand(d.L, d.B) : null,
        });
      }
    }
  }

  const { gesorteerd, top } = rangschik(oplossingen, invoer);
  if (gesorteerd.length === 0 && geenOplossing.length === 0) geenOplossing.push(...verklaar(invoer));
  return {
    invoer,
    oplossingen: gesorteerd,
    top,
    geenOplossing,
    log: { kandidaten: kandidaten.length, voetafdrukken: Math.min(voetafdrukken.length, limiet), afgekapt, afgewezen },
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
export function verklaar(invoer: Invoer): string[] {
  const d = invoer.drager;
  const dozen = kleinsteDozen(invoer);
  const m: string[] = [];
  const lichtste = Math.min(...dozen.map((x) => x.gewicht));
  if (lichtste > invoer.maxGevuldGewicht)
    m.push(`Eén binnendoos in een buitendoos weegt al ${getal(lichtste, 1)} kg; het maximum per buitendoos is ${getal(invoer.maxGevuldGewicht, 1)} kg.`);
  const laagste = Math.min(...dozen.map((x) => x.H));
  const minHoogte = vasteHoogte(invoer) + laagste;
  if (minHoogte > d.maxTotaleHoogte) m.push(`Eén laag is met de drager al ${mm(minHoogte)} mm hoog; het maximum is ${mm(d.maxTotaleHoogte)} mm.`);
  const minGewicht = vastGewicht(invoer) + lichtste;
  if (minGewicht > d.maxTotaalGewicht) m.push(`Eén buitendoos op de drager weegt al ${getal(minGewicht, 1)} kg; het maximum is ${getal(d.maxTotaalGewicht, 1)} kg.`);

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
