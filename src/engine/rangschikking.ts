// Rangschikking en top drie (ontwerp §4.3).

import type { Invoer, Oplossing, TopOplossing } from './types';
import { isEuropallet } from './module';
import { gekanteldWat, getal, inhoudEenheid, procent } from './format';

/** Hoofdmaat: binnendozen per drager; zonder bekende inhoud buitendozen per drager (§4.3 stap 1). */
export function hoofdmaat(o: Oplossing): number {
  return o.binnendozenPerDrager ?? o.buitendozenPerDrager;
}

/** Minstens 10% meer: a ≥ 1,1 × b, exact in gehele getallen. */
function minstens10ProcentMeer(a: number, b: number): boolean {
  return a * 10 >= b * 11;
}

function vergelijker(europallet: boolean, rechtEerst: boolean) {
  return (a: Oplossing, b: Oplossing): number => {
    const ha = hoofdmaat(a);
    const hb = hoofdmaat(b);
    if (ha !== hb) return hb - ha;
    const pa = a.doos.binnendozenPerDoos ?? 0;
    const pb = b.doos.binnendozenPerDoos ?? 0;
    if (pa !== pb) return pb - pa;
    // Breder en langer gaat voor hoger: bij dezelfde inhoud de doos met de laagste hoogte ten opzichte van zijn breedte.
    const v = vormVergelijking(a, b);
    if (v !== 0) return v;
    if (a.totaleHoogte !== b.totaleHoogte) return a.totaleHoogte - b.totaleHoogte;
    if (europallet) {
      const ma = a.moduleAfstand ?? Infinity;
      const mb = b.moduleAfstand ?? Infinity;
      if (ma !== mb) return ma - mb;
    }
    if (a.totaalGewicht !== b.totaalGewicht) return a.totaalGewicht - b.totaalGewicht;
    if (a.doos.L !== b.doos.L) return a.doos.L - b.doos.L;
    if (a.doos.B !== b.doos.B) return a.doos.B - b.doos.B;
    if (a.doos.H !== b.doos.H) return a.doos.H - b.doos.H;
    if (a.doos.gekanteld !== b.doos.gekanteld) return a.doos.gekanteld ? 1 : -1;
    if (a.stapelwijze !== b.stapelwijze) {
      const eerste = rechtEerst ? 'recht' : 'verband';
      return a.stapelwijze === eerste ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}

/** Negatief als a platter is dan b (lagere hoogte / breedte), positief als b platter is. */
function vormVergelijking(a: Oplossing, b: Oplossing): number {
  const va = a.doos.H * b.doos.B;
  const vb = b.doos.H * a.doos.B;
  return Math.abs(va - vb) > 1e-6 ? va - vb : 0;
}

function maxHoofd(lijst: Oplossing[]): number {
  return lijst.reduce((m, o) => Math.max(m, hoofdmaat(o)), 0);
}

/** Eenheid van de hoofdmaat; zonder binnendoos (artikel, of bestaande buitendoos zonder binnendoos) zijn het artikelen. */
const eenheid = (o: Oplossing, invoer: Invoer) => (o.binnendozenPerDrager === null ? 'buitendozen' : inhoudEenheid(invoer));

export function sleutel(o: Oplossing): string {
  return `${o.doos.L}|${o.doos.B}|${o.doos.H}|${o.stapelwijze}|${o.doos.gekanteld}`;
}

export interface Rangschikking {
  gesorteerd: Oplossing[];
  top: TopOplossing[];
}

/** Welke oplossingen kies() krijgt bij de vormregel zacht (#66): alle, alleen de platte, of de platte plus de hoge die de drempel halen. */
type Soort = 'alles' | 'plat' | 'ketting';

interface Keuze {
  winnaar: Oplossing;
  /** Uitleg van de kantelregel en de collimodule, vóór recht of verband. */
  voor: string[];
  /** Uitleg van recht of verband. */
  stap4: string[];
  poolGesorteerd: Oplossing[];
  /** Doet er na de kantelregel, na de collimodule en na "gekanteld wint" nog een doos mee die hoger is dan breed? */
  hoogNa: { kantel: boolean; module: boolean; gekanteld: boolean };
}

/**
 * Stap 2 (na de vormregel) tot en met 5 van §4.3 over `kandidaten`: de kantelregel, de collimodule, recht of verband en de
 * volgorde bij gelijke stand. `alle` zijn alle oplossingen van de berekening, voor de uitleg.
 */
function kies(kandidaten: Oplossing[], alle: Oplossing[], soort: Soort, invoer: Invoer, buitenBlok: boolean): Keuze {
  const euro = isEuropallet(invoer.drager);
  let pool = kandidaten;
  const stap4: string[] = [];
  let modulair = false;

  // Stap 2: kantelen mag, maar is niet verplicht (#33, ronde 4 punt 5). Een gekantelde oplossing doet
  // alleen mee als ze minstens 10% meer binnendozen per drager geeft dan de beste rechtopstaande
  // oplossing, ook als die geen collimodule heeft. Zo dwingt de collimodule nooit kantelen af.
  const rechtop = pool.filter((o) => !o.doos.gekanteld);
  const gekanteld = pool.filter((o) => o.doos.gekanteld);
  const besteRechtop = maxHoofd(rechtop);
  const besteGekanteld = maxHoofd(gekanteld);
  const loont = new Set(rechtop.length === 0 ? gekanteld : gekanteld.filter((o) => minstens10ProcentMeer(hoofdmaat(o), besteRechtop)));
  pool = pool.filter((o) => !o.doos.gekanteld || loont.has(o));
  const hoogNa = { kantel: pool.some((o) => o.doos.hoog), module: false, gekanteld: false };

  // Stap 3: collimodule op de europallet, binnen de oplossingen die nog meedoen (#5, #9).
  let zonderModule = 0;
  if (euro) {
    const mod = pool.filter((o) => o.doos.module !== null);
    if (mod.length > 0) {
      zonderModule = maxHoofd(pool.filter((o) => o.doos.module === null));
      pool = mod;
      modulair = true;
    }
  }
  hoogNa.module = pool.some((o) => o.doos.hoog);
  // Doet er nog een gekantelde oplossing mee, dan geeft die minstens 10% meer dan elke rechtopstaande: gekanteld.
  if (pool.some((o) => o.doos.gekanteld)) pool = pool.filter((o) => o.doos.gekanteld);
  hoogNa.gekanteld = pool.some((o) => o.doos.hoog);
  // Net zo: doet er nog een doos mee die hoger is dan breed, dan geeft die minstens 10% meer dan elke doos die dat niet is.
  if (hoogNa.gekanteld) pool = pool.filter((o) => o.doos.hoog);

  // Stap 4: recht of verband (niet bij een modulaire winnaar).
  if (!modulair) {
    const recht = pool.filter((o) => o.stapelwijze === 'recht');
    const verband = pool.filter((o) => o.stapelwijze === 'verband');
    if (recht.length > 0 && verband.length > 0) {
      const r = maxHoofd(recht);
      const v = maxHoofd(verband);
      if (minstens10ProcentMeer(r, v)) {
        pool = recht;
        stap4.push(`Recht geeft ${getal(r)} tegen ${getal(v)} bij verband (+${procent((r - v) / v)}, minstens 10%), dus recht.`);
      } else {
        pool = verband;
        stap4.push(
          r > v
            ? `Recht geeft ${getal(r)} tegen ${getal(v)} bij verband; minder dan 10% meer, dus verband.`
            : `Verband geeft evenveel of meer (${getal(v)} tegen ${getal(r)} recht), dus verband.`,
        );
      }
    } else if (recht.length > 0 && pool.length > 0) {
      stap4.push(geenVerbandTekst(kandidaten, alle, soort, hoogNa.gekanteld, buitenBlok));
    }
  }

  const poolGesorteerd = [...pool].sort(vergelijker(euro, modulair));
  const winnaar = poolGesorteerd[0];
  const voor: string[] = [];
  // Bij een bestaande buitendoos zonder binnendoos kantelt de buitendoos zelf (#64), anders de binnendoos.
  const wat = gekanteld.length > 0 ? gekanteldWat(gekanteld[0].doos) : 'binnendoos';
  // Geeft een rechtopstaande doos die hoger is dan breed meer dan de beste rechtopstaande waarmee de kantelregel hier
  // vergelijkt (omdat ze de drempel van de vormregel niet haalde, of omdat de uitkomst de platte voorkeursoptie is), dan
  // zegt de uitleg dat die vergelijking over dozen gaat die niet hoger zijn dan breed (#66).
  const rechtopTekst = maxHoofd(alle.filter((o) => !o.doos.gekanteld)) > besteRechtop ? 'rechtop met een doos die niet hoger is dan breed' : 'rechtop';
  if (rechtop.length > 0 && gekanteld.length > 0) {
    if (winnaar.doos.gekanteld)
      voor.push(
        `Gekantelde ${wat} geeft ${getal(hoofdmaat(winnaar))} tegen ${getal(besteRechtop)} ${eenheid(winnaar, invoer)} ${rechtopTekst} (+${procent((hoofdmaat(winnaar) - besteRechtop) / besteRechtop)}, minstens 10%), dus gekanteld.`,
      );
    else if (loont.size === 0)
      voor.push(
        `Gekantelde ${wat} geeft ${getal(besteGekanteld)} tegen ${getal(besteRechtop)} ${eenheid(winnaar, invoer)} ${rechtopTekst}; minder dan 10% meer, dus niet gekanteld.`,
      );
  }
  if (modulair)
    voor.push(
      zonderModule > hoofdmaat(winnaar)
        ? `Collimodule ${winnaar.doos.module} op de europallet gaat voor, ook al geeft een doos zonder collimodule meer (${getal(zonderModule)} tegen ${getal(hoofdmaat(winnaar))} ${eenheid(winnaar, invoer)}); verband mag dan genegeerd worden.`
        : `Collimodule ${winnaar.doos.module} op de europallet: een modulaire doos gaat voor; verband mag dan genegeerd worden.`,
    );
  return { winnaar, voor, stap4, poolGesorteerd, hoogNa };
}

/**
 * Uitleg als de lading recht staat omdat er in stap 4 geen verband meer meedoet. `buitenBlok`: bij het zoeken lag er een
 * paar in verband dat niet in de buurt van een blok zit (ronde 9).
 */
function geenVerbandTekst(kandidaten: Oplossing[], alle: Oplossing[], soort: Soort, hoogWint: boolean, buitenBlok: boolean): string {
  const standaard = 'Geen geldig verband gevonden; de lading staat recht.';
  if (!alle.some((o) => o.stapelwijze === 'verband')) return buitenBlok ? 'Geen verband gevonden dat in de buurt van een blok zit; de lading staat recht.' : standaard;
  // Vormregel zacht (#66): wint een doos die hoger is dan breed, dan doet alleen nog zo'n doos mee.
  if (soort === 'ketting' && hoogWint) {
    if (!alle.some((o) => o.doos.hoog && o.stapelwijze === 'verband')) return 'Geen geldig verband met een doos die hoger is dan breed; de lading staat recht.';
    if (!kandidaten.some((o) => o.doos.hoog && o.stapelwijze === 'verband'))
      return 'Verband met een doos die hoger is dan breed geeft geen 10% meer dan de platte voorkeursoptie; de lading staat recht.';
    return 'Verband met een doos die hoger is dan breed valt af door de kantelregel; de lading staat recht.';
  }
  if (soort === 'plat' && !kandidaten.some((o) => o.stapelwijze === 'verband')) return 'Geen geldig verband met een doos die niet hoger is dan breed; de lading staat recht.';
  return standaard;
}

/** `buitenBlok`: bij het zoeken naar verband lag er een paar in verband dat niet in de buurt van een blok zit (ronde 9). */
export function rangschik(oplossingen: Oplossing[], invoer: Invoer, buitenBlok = false): Rangschikking {
  if (oplossingen.length === 0) return { gesorteerd: [], top: [] };
  const euro = isEuropallet(invoer.drager);

  // Stap 2 begint met de vormregel zacht (#66). De platte voorkeursoptie is de oplossing die dezelfde stappen kiezen uit
  // alleen de dozen die niet hoger zijn dan breed: de uitkomst van "niet hoger dan de breedte". Een doos die hoger is dan
  // breed doet alleen mee als ze minstens 10% meer per drager geeft dan die uitkomst. Daarna volgen de kantelregel, de
  // collimodule en de andere stappen over de platte dozen en de hoge die de drempel haalden. Wint daar geen hoge doos, dan
  // is de uitkomst de platte voorkeursoptie zelf. Zo geeft zacht precies de uitkomst van breedte, tenzij een hoge doos
  // wint, en die geeft dan minstens 10% meer. Is de platte voorkeursoptie op de europallet een collimodule-doos, dan gaat
  // die voor op een hoge doos zonder collimodule (#5): dan halen alleen hoge collimodule-dozen de drempel. Anders kon een
  // hoge doos zonder collimodule via de kantelregel winnen van een gekantelde platte collimodule-doos, afhankelijk van
  // een andere oplossing die zelf nooit wint.
  const plat = oplossingen.filter((o) => !o.doos.hoog);
  const hoog = oplossingen.filter((o) => o.doos.hoog);
  const vorm = plat.length > 0 && hoog.length > 0;
  const platKeuze = vorm ? kies(plat, oplossingen, 'plat', invoer, buitenBlok) : undefined;
  const bestePlat = platKeuze ? hoofdmaat(platKeuze.winnaar) : 0;
  const hoogGenoeg = hoog.filter((o) => minstens10ProcentMeer(hoofdmaat(o), bestePlat));
  const moduleGaatVoor = euro && !!platKeuze && platKeuze.winnaar.doos.module !== null;
  const hoogLoont = new Set(moduleGaatVoor ? hoogGenoeg.filter((o) => o.doos.module !== null) : hoogGenoeg);
  const ketting = vorm
    ? hoogLoont.size > 0
      ? kies(
          oplossingen.filter((o) => !o.doos.hoog || hoogLoont.has(o)),
          oplossingen,
          'ketting',
          invoer,
          buitenBlok,
        )
      : undefined
    : kies(oplossingen, oplossingen, 'alles', invoer, buitenBlok);
  const keuze = ketting && (!platKeuze || ketting.winnaar.doos.hoog) ? ketting : platKeuze!;
  const winnaar = keuze.winnaar;

  // De uitleg volgt de stappen: eerst de vorm, dan kantelen, dan de collimodule, dan recht of verband.
  const vormUitleg: string[] = [];
  if (vorm) {
    const plattekst = `${eenheid(winnaar, invoer)} met een doos die niet hoger is dan breed`;
    const besteHoog = maxHoofd(hoog);
    if (winnaar.doos.hoog)
      vormUitleg.push(
        `Hogere doos (hoger dan breed) geeft ${getal(hoofdmaat(winnaar))} tegen ${getal(bestePlat)} ${plattekst} (+${procent((hoofdmaat(winnaar) - bestePlat) / bestePlat)}, minstens 10%), dus hoger dan breed.`,
      );
    else if (hoogGenoeg.length > 0) {
      // Een hoge doos gaf minstens 10% meer, maar won niet (#66): ze had geen collimodule terwijl de platte voorkeursoptie
      // die wel heeft, of ze viel na de drempel af door de kantelregel of de collimodule.
      const h = maxHoofd(hoogLoont.size > 0 ? [...hoogLoont] : hoogGenoeg);
      const zonderModule = hoogLoont.size === 0 || (ketting!.hoogNa.kantel && !ketting!.hoogNa.module);
      const waarom = zonderModule ? 'zonder collimodule; een collimodule-doos gaat voor' : 'valt af door de kantelregel';
      vormUitleg.push(
        `Hogere doos (hoger dan breed) geeft ${getal(h)} tegen ${getal(bestePlat)} ${plattekst} (+${procent((h - bestePlat) / bestePlat)}), maar ${waarom}, dus niet hoger dan breed.`,
      );
    } else if (besteHoog > bestePlat)
      vormUitleg.push(`Hogere doos (hoger dan breed) geeft ${getal(besteHoog)} tegen ${getal(bestePlat)} ${plattekst}; minder dan 10% meer, dus niet hoger dan breed.`);
  }
  const uitleg = [...vormUitleg, ...keuze.voor, ...keuze.stap4];
  uitleg.push(`${getal(hoofdmaat(winnaar))} ${eenheid(winnaar, invoer)} per drager.`);
  // Beslist de vorm tussen twee dozen met hetzelfde aantal per drager en per doos, zeg dat dan.
  const poolGesorteerd = keuze.poolGesorteerd;
  const tweede = poolGesorteerd.find((o) => sleutel(o) !== sleutel(winnaar) && (o.doos.L !== winnaar.doos.L || o.doos.B !== winnaar.doos.B || o.doos.H !== winnaar.doos.H));
  if (
    tweede &&
    hoofdmaat(tweede) === hoofdmaat(winnaar) &&
    (tweede.doos.binnendozenPerDoos ?? 0) === (winnaar.doos.binnendozenPerDoos ?? 0) &&
    vormVergelijking(winnaar, tweede) < 0
  )
    uitleg.push(
      `Evenveel per drager en per doos als ${getal(tweede.doos.L)} × ${getal(tweede.doos.B)} × ${getal(tweede.doos.H)} mm; de plattere doos gaat voor (hoogte gedeeld door breedte ${getal(winnaar.doos.H / winnaar.doos.B, 2)} tegen ${getal(tweede.doos.H / tweede.doos.B, 2)}).`,
    );
  // Voor de kaart "niet gekanteld": bij een bestaande buitendoos zonder binnendoos kantelt de buitendoos zelf (#64).
  const eersteGekanteld = oplossingen.find((o) => o.doos.gekanteld);
  const wat = eersteGekanteld ? gekanteldWat(eersteGekanteld.doos) : 'binnendoos';
  const rest = oplossingen.filter((o) => o !== winnaar).sort(vergelijker(euro, false));
  const gesorteerd = [winnaar, ...rest];

  const top: TopOplossing[] = [{ oplossing: winnaar, rol: 'winnaar', uitleg }];
  const getoond = new Set([sleutel(winnaar)]);
  const verschilTekst = (o: Oplossing) => {
    const w = hoofdmaat(winnaar);
    const h = hoofdmaat(o);
    const kenmerken = [
      o.stapelwijze,
      o.doos.gekanteld ? `${gekanteldWat(o.doos)} gekanteld` : '',
      o.doos.hoog ? 'hoger dan breed' : '',
      o.doos.module ? `collimodule ${o.doos.module}` : '',
    ]
      .filter(Boolean)
      .join(', ');
    if (h === w) return `evenveel ${eenheid(o, invoer)} als de voorkeursoptie (${kenmerken})`;
    return `${getal(h)} ${eenheid(o, invoer)} per drager, ${procent(Math.abs(h - w) / w)} ${h < w ? 'minder' : 'meer'} dan de voorkeursoptie (${kenmerken})`;
  };
  const besteVerband = gesorteerd.find((o) => o.stapelwijze === 'verband');
  if (besteVerband && !getoond.has(sleutel(besteVerband))) {
    getoond.add(sleutel(besteVerband));
    top.push({ oplossing: besteVerband, rol: 'verband', uitleg: [`Beste verbandoplossing: ${verschilTekst(besteVerband)}.`] });
  }
  const besteNiet = gesorteerd.find((o) => !o.doos.gekanteld);
  if (besteNiet && !getoond.has(sleutel(besteNiet))) {
    getoond.add(sleutel(besteNiet));
    top.push({ oplossing: besteNiet, rol: 'nietGekanteld', uitleg: [`Beste oplossing zonder gekantelde ${wat}: ${verschilTekst(besteNiet)}.`] });
  }
  // Vormregel zacht (#66): wint een doos die hoger is dan breed, dan staat de platte voorkeursoptie (de uitkomst van "niet
  // hoger dan de breedte") ook in de top drie, zodat de gebruiker per geval plat kan kiezen. Die kaart gaat voor de gewone
  // alternatieven. Staan er al drie kaarten (winnaar, beste verband en niet gekanteld), dan neemt ze de plaats in van een
  // kaart waarvan ze de rol kan overnemen: van "niet gekanteld" als de platte voorkeursoptie zelf niet gekanteld is (#33),
  // anders van "beste verband" als ze zelf verband is, of als beide kaarten een doos hebben die hoger is dan breed. Anders
  // staat er al een platte doos in de top drie, en blijven de drie kaarten staan.
  const besteNietHoog = winnaar.doos.hoog ? platKeuze?.winnaar : undefined;
  if (besteNietHoog && !getoond.has(sleutel(besteNietHoog))) {
    const kaart: TopOplossing = {
      oplossing: besteNietHoog,
      rol: 'nietHoog',
      uitleg: [`Beste oplossing met een doos die niet hoger is dan breed: ${verschilTekst(besteNietHoog)}.`],
    };
    let plek = top.length;
    if (top.length >= 3) {
      const verband = top.findIndex((t) => t.rol === 'verband');
      const niet = top.findIndex((t) => t.rol === 'nietGekanteld');
      if (!besteNietHoog.doos.gekanteld) plek = niet;
      else if (besteNietHoog.stapelwijze === 'verband' || (verband >= 0 && niet >= 0 && top[verband].oplossing.doos.hoog && top[niet].oplossing.doos.hoog)) plek = verband;
      else plek = -1;
    }
    if (plek >= 0) {
      if (plek < top.length) getoond.delete(sleutel(top[plek].oplossing));
      getoond.add(sleutel(besteNietHoog));
      top[plek] = kaart;
    }
  }
  for (const o of gesorteerd) {
    if (top.length >= 3) break;
    const k = sleutel(o);
    if (getoond.has(k)) continue;
    getoond.add(k);
    top.push({ oplossing: o, rol: 'alternatief', uitleg: [`Alternatief: ${verschilTekst(o)}.`] });
  }
  return { gesorteerd, top };
}
