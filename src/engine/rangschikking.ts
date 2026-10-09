// Rangschikking en top drie (ontwerp §4.3).

import type { Invoer, Oplossing, TopOplossing } from './types';
import { isEuropallet } from './module';
import { getal, procent } from './format';

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

const eenheid = (o: Oplossing) => (o.binnendozenPerDrager === null ? 'buitendozen' : 'binnendozen');

export function sleutel(o: Oplossing): string {
  return `${o.doos.L}|${o.doos.B}|${o.doos.H}|${o.stapelwijze}|${o.doos.gekanteld}`;
}

export interface Rangschikking {
  gesorteerd: Oplossing[];
  top: TopOplossing[];
}

export function rangschik(oplossingen: Oplossing[], invoer: Invoer): Rangschikking {
  if (oplossingen.length === 0) return { gesorteerd: [], top: [] };
  const euro = isEuropallet(invoer.drager);
  let pool = oplossingen;
  const uitleg: string[] = [];
  let modulair = false;

  // Stap 2: kantelregel voor de binnendoos. Kantelen mag, maar is niet verplicht: gekanteld wint alleen
  // bij minstens 10% meer, ook als alleen een gekantelde doos een collimodulemaat heeft (ronde 4, punt 5).
  const gek = pool.filter((o) => o.doos.gekanteld);
  const niet = pool.filter((o) => !o.doos.gekanteld);
  if (gek.length > 0 && niet.length > 0) {
    const g = maxHoofd(gek);
    const n = maxHoofd(niet);
    const verschil = n > 0 ? (g - n) / n : 0;
    if (minstens10ProcentMeer(g, n)) {
      pool = gek;
      uitleg.push(`Gekantelde binnendoos geeft ${getal(g)} tegen ${getal(n)} ${eenheid(gek[0])} (+${procent(verschil)}, minstens 10%), dus gekanteld.`);
    } else {
      pool = niet;
      uitleg.push(`Gekantelde binnendoos geeft ${getal(g)} tegen ${getal(n)} ${eenheid(niet[0])}; minder dan 10% meer, dus niet gekanteld.`);
    }
  }

  // Stap 3: collimodule op de europallet, binnen de gekozen stand.
  if (euro) {
    const mod = pool.filter((o) => o.doos.module !== null);
    if (mod.length > 0) {
      pool = mod;
      modulair = true;
    }
  }

  // Stap 4: recht of verband (niet bij een modulaire winnaar).
  if (!modulair) {
    const recht = pool.filter((o) => o.stapelwijze === 'recht');
    const verband = pool.filter((o) => o.stapelwijze === 'verband');
    if (recht.length > 0 && verband.length > 0) {
      const r = maxHoofd(recht);
      const v = maxHoofd(verband);
      if (minstens10ProcentMeer(r, v)) {
        pool = recht;
        uitleg.push(`Recht geeft ${getal(r)} tegen ${getal(v)} bij verband (+${procent((r - v) / v)}, minstens 10%), dus recht.`);
      } else {
        pool = verband;
        uitleg.push(
          r > v
            ? `Recht geeft ${getal(r)} tegen ${getal(v)} bij verband; minder dan 10% meer, dus verband.`
            : `Verband geeft evenveel of meer (${getal(v)} tegen ${getal(r)} recht), dus verband.`,
        );
      }
    } else if (recht.length > 0 && pool.length > 0) {
      uitleg.push('Geen geldig verband gevonden; de lading staat recht.');
    }
  }

  const poolGesorteerd = [...pool].sort(vergelijker(euro, modulair));
  const winnaar = poolGesorteerd[0];
  if (modulair) uitleg.unshift(`Collimodule ${winnaar.doos.module} op de europallet: een modulaire doos gaat altijd voor; verband mag dan genegeerd worden.`);
  uitleg.push(`${getal(hoofdmaat(winnaar))} ${eenheid(winnaar)} per drager.`);
  // Beslist de vorm tussen twee dozen met hetzelfde aantal per drager en per doos, zeg dat dan.
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
  const rest = oplossingen.filter((o) => o !== winnaar).sort(vergelijker(euro, false));
  const gesorteerd = [winnaar, ...rest];

  const top: TopOplossing[] = [{ oplossing: winnaar, rol: 'winnaar', uitleg }];
  const getoond = new Set([sleutel(winnaar)]);
  const verschilTekst = (o: Oplossing) => {
    const w = hoofdmaat(winnaar);
    const h = hoofdmaat(o);
    const kenmerken = [o.stapelwijze, o.doos.gekanteld ? 'binnendoos gekanteld' : '', o.doos.module ? `collimodule ${o.doos.module}` : '']
      .filter(Boolean)
      .join(', ');
    if (h === w) return `evenveel ${eenheid(o)} als de voorkeursoptie (${kenmerken})`;
    return `${getal(h)} ${eenheid(o)} per drager, ${procent(Math.abs(h - w) / w)} ${h < w ? 'minder' : 'meer'} dan de voorkeursoptie (${kenmerken})`;
  };
  const besteVerband = gesorteerd.find((o) => o.stapelwijze === 'verband');
  if (besteVerband && !getoond.has(sleutel(besteVerband))) {
    getoond.add(sleutel(besteVerband));
    top.push({ oplossing: besteVerband, rol: 'verband', uitleg: [`Beste verbandoplossing: ${verschilTekst(besteVerband)}.`] });
  }
  const besteNiet = gesorteerd.find((o) => !o.doos.gekanteld);
  if (besteNiet && !getoond.has(sleutel(besteNiet))) {
    getoond.add(sleutel(besteNiet));
    top.push({ oplossing: besteNiet, rol: 'nietGekanteld', uitleg: [`Beste oplossing zonder gekantelde binnendoos: ${verschilTekst(besteNiet)}.`] });
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
