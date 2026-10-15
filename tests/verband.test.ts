// Verband: welk laagpaar de app kiest. De regel voor verband (#34) blijft: minstens de helft van de dozen van een laag
// steunt op twee of meer dozen eronder. Van de paren met de meeste dozen per twee lagen kiest de app eerst het paar met
// de meeste dozen in laag A (bij een oneven aantal lagen ligt A er één keer vaker), dan het paar met de minste overhang,
// dan het paar met de minste torens (dozen die voor minstens 90% op één doos eronder staan), dan een paar waarin elke doos
// genoeg steun heeft, dan een paar waarin laag B laag A gespiegeld is (#63, zie ronde6.test.ts), dan het paar waarin de
// meeste dozen op twee of meer dozen eronder steunen. Bij precies twee lagen telt alleen B op A, en het uitlijnen zet geen
// dozen recht op elkaar (#60).

import { describe, expect, it } from 'vitest';
import { bereken, verbandVenster } from '../src/engine/bereken';
import { isVariant, omhullende, transformeer, zoekPatronen, type Transformatie } from '../src/engine/laagpatroon';
import { plaats, zoekvlakken, type GeplaatsteLaag } from '../src/engine/plaatsing';
import { BLOKPALLET, EUROPALLET, kopieDrager, standaardInvoer } from '../src/engine/standaard';
import type { Drager, Invoer, Oplossing, Rechthoek, Resultaat, Stapelwijze } from '../src/engine/types';
import { beterVoorTweeLagen, inVerband, isGespiegeld, kleinsteSteun, steunendeDozen, torens, zoekVerband, type VerbandPaar, type VerbandUitkomst } from '../src/engine/verband';

const TRANSFORMATIES: Transformatie[] = ['geen', 'spiegelY', 'spiegelX', 'draai180'];

/** Alle paren van varianten (patroon × transformatie, geplaatst op de drager), in de volgorde waarin zoekVerband ze bekijkt. */
function verbandParen(voorraad: Rechthoek[][], drager: Drager, maxPatronen = 24): VerbandPaar[] {
  const varianten: GeplaatsteLaag[] = [];
  const gezien = new Set<string>();
  for (const p of voorraad.slice(0, maxPatronen))
    for (const t of TRANSFORMATIES) {
      const g = plaats(transformeer(p, t), drager);
      if (!g) continue;
      const k = g.dozen
        .map((r) => `${r.x},${r.y},${r.w},${r.d}`)
        .sort()
        .join(';');
      if (gezien.has(k)) continue;
      gezien.add(k);
      varianten.push(g);
    }
  const paren: [number, number][] = [];
  for (let i = 0; i < varianten.length; i++) for (let j = 0; j < varianten.length; j++) if (i !== j && varianten[i].dozen.length >= varianten[j].dozen.length) paren.push([i, j]);
  const totaal = (p: [number, number]) => varianten[p[0]].dozen.length + varianten[p[1]].dozen.length;
  paren.sort((p, q) => totaal(q) - totaal(p) || p[0] - q[0] || p[1] - q[1]);
  return paren.map(([i, j]) => ({ a: varianten[i], b: varianten[j] }));
}

/** De keuze van vóór deze regel: het eerst gevonden paar met de meeste dozen per twee lagen. */
function eersteGevonden(voorraad: Rechthoek[][], drager: Drager, maxPatronen = 24): VerbandUitkomst {
  let eenzijdig: VerbandPaar | null = null;
  for (const p of verbandParen(voorraad, drager, maxPatronen)) {
    if (!inVerband(p.b.dozen, p.a.dozen)) continue;
    eenzijdig ??= p;
    if (inVerband(p.a.dozen, p.b.dozen)) return { tweezijdig: p, eenzijdig };
  }
  return { tweezijdig: null, eenzijdig };
}

/**
 * Zoals bereken() bij één voetafdruk en minimaal één doos per laag: de voorraad van de zoekvlakken met het hoogste aantal
 * per laag samen, aflopend op aantal (zonder overhang vooraan), en de breedte van de verbandzoektocht. Zoals in bereken()
 * komen de varianten van het vijfblokspatroon bovenop de breedte (#65): de voorraad is al tot die breedte ingekort.
 */
function voorraadZoalsBereken(drager: Drager, L: number, B: number): { voorraad: Rechthoek[][]; breedte: number } {
  const resultaten = zoekvlakken(drager).map((v) => zoekPatronen(v.W, v.D, L, B));
  const max = Math.max(...resultaten.map((r) => r.max));
  const patronen = resultaten
    .filter((r) => r.max === max)
    .flatMap((r) => r.voorraad)
    .map((p, i) => ({ p, i }))
    .sort((x, y) => y.p.aantal - x.p.aantal || Number(isVariant(x.p)) - Number(isVariant(y.p)) || x.i - y.i)
    .map((x) => x.p);
  const zoek = verbandVenster(patronen, max);
  return { voorraad: zoek.map((p) => p.dozen), breedte: zoek.length };
}

/** Dozen die op twee of meer dozen eronder steunen: B op A, bij tweezijdig verband plus A op B. */
const steunB = (p: VerbandPaar) => steunendeDozen(p.b.dozen, p.a.dozen);
const steunBeide = (p: VerbandPaar) => steunB(p) + steunendeDozen(p.a.dozen, p.b.dozen);
const aantallen = (p: VerbandPaar | null) => (p ? [p.a.dozen.length, p.b.dozen.length] : null);
/** Overhang van een paar: per zijde de grootste van beide lagen, opgeteld (zoals zoekVerband). */
const overhang = (p: VerbandPaar) => (['voor', 'achter', 'links', 'rechts'] as const).reduce((s, k) => s + Math.max(p.a.overhang[k], p.b.overhang[k]), 0);

/** Dozen als vergelijkbare tekst, los van de volgorde. */
const sleutel = (dozen: Rechthoek[]) =>
  dozen
    .map((r) => `${r.x},${r.y},${r.w},${r.d}`)
    .sort()
    .join(';');

/** Torens van een paar (dozen voor minstens 90% op één doos eronder): B op A, bij tweezijdig verband plus A op B. */
const torensB = (p: VerbandPaar) => torens(p.b.dozen, p.a.dozen);
const torensBeide = (p: VerbandPaar) => torensB(p) + torens(p.a.dozen, p.b.dozen);
/** Steun van de slechtst gesteunde doos, tot 75%: B op A, bij tweezijdig verband ook A op B. */
const steunTot75B = (p: VerbandPaar) => Math.min(0.75, kleinsteSteun(p.b.dozen, p.a.dozen));
const steunTot75Beide = (p: VerbandPaar) => Math.min(steunTot75B(p), kleinsteSteun(p.a.dozen, p.b.dozen));
const genoegB = (p: VerbandPaar) => steunTot75B(p) >= 0.75 - 1e-9;

/** Stroken over de volle lengte van de pallet, zodat alleen de breedte telt. */
const stroken = (breedtes: number[]): Rechthoek[] => breedtes.map((w, k) => ({ x: breedtes.slice(0, k).reduce((s, v) => s + v, 0), y: 0, w, d: 1200 }));

/** De laag gespiegeld om het midden van het blok `om`: links-rechts ('x') of voor-achter ('y'). */
function gespiegeld(dozen: Rechthoek[], om: { x: number; y: number; w: number; d: number }, as: 'x' | 'y'): Rechthoek[] {
  return dozen.map((r) => (as === 'x' ? { ...r, x: 2 * om.x + om.w - r.x - r.w } : { ...r, y: 2 * om.y + om.d - r.y - r.d }));
}

function ontwerp(L: number, B: number, H: number, gewicht: number, extra: Partial<Invoer> = {}): Invoer {
  const i = standaardInvoer();
  i.artikelcode = 'V';
  i.binnendoos = { L, B, H, gewicht, kantelbaar: false, magVerticaal: { L: false, B: false } };
  return { ...i, ...extra };
}

function bestaand(L: number, B: number, H: number, gevuld: number, qty: number, drager = kopieDrager(EUROPALLET)): Invoer {
  const i = standaardInvoer();
  i.instap = 'bestaandeBuitendoos';
  i.artikelcode = 'V';
  i.binnendoos = undefined;
  i.bestaandeBuitendoos = { L, B, H, gevuldGewicht: gevuld, binnendozenPerDoos: qty };
  i.drager = drager;
  return i;
}

/** Geen torens: in elk laagpaar van de stapel steunt elke doos op twee of meer dozen eronder. */
function controleerGeenTorens(o: Oplossing) {
  expect(o.stapelwijze).toBe('verband');
  for (let k = 1; k < o.laagVolgorde.length; k++) {
    const onder = o.lagen[o.laagVolgorde[k - 1]].dozen;
    const boven = o.lagen[o.laagVolgorde[k]].dozen;
    expect(steunendeDozen(boven, onder)).toBe(boven.length);
    // Dus ook geen doos met precies dezelfde plek als een doos eronder.
    expect(boven.filter((u) => onder.some((l) => sleutel([u]) === sleutel([l])))).toEqual([]);
  }
}

/** B op A en A op B: [dozen op twee of meer dozen eronder, torens]. */
function steunEnTorens(o: Oplossing): [number, number][] {
  const [a, b] = [o.lagen[0].dozen, o.lagen[1].dozen];
  return [
    [steunendeDozen(b, a), torens(b, a)],
    [steunendeDozen(a, b), torens(a, b)],
  ];
}

/**
 * Het uitlijnen verandert aantallen, hoogte en gewicht niet en zet geen dozen recht op elkaar: in elk laagpaar van de
 * stapel niet minder dozen op twee of meer dozen eronder en niet meer torens dan vóór het uitlijnen.
 */
function controleerUitlijnen(zonder: Oplossing, met: Oplossing) {
  const cijfers = (o: Oplossing) => [o.lagen.map((l) => l.dozen.length), o.laagVolgorde, o.buitendozenPerDrager, o.totaleHoogte, o.totaalGewicht];
  expect(cijfers(met)).toEqual(cijfers(zonder));
  for (let k = 1; k < met.laagVolgorde.length; k++) {
    const [onder, boven] = [met.laagVolgorde[k - 1], met.laagVolgorde[k]];
    expect(steunendeDozen(met.lagen[boven].dozen, met.lagen[onder].dozen)).toBeGreaterThanOrEqual(steunendeDozen(zonder.lagen[boven].dozen, zonder.lagen[onder].dozen));
    expect(torens(met.lagen[boven].dozen, met.lagen[onder].dozen)).toBeLessThanOrEqual(torens(zonder.lagen[boven].dozen, zonder.lagen[onder].dozen));
  }
}

/** Twee lagen: de getoonde verbandoplossing vóór en na het uitlijnen, de rechte stapeling, en de paren die zoekVerband geeft. */
function tweeLagen(i: Invoer) {
  const vind = (r: Resultaat, wijze: Stapelwijze) => r.top.find((t) => t.oplossing.stapelwijze === wijze)!.oplossing;
  const r = bereken(i, { uitlijnen: false });
  const { voorraad, breedte } = voorraadZoalsBereken(i.drager, i.bestaandeBuitendoos!.L, i.bestaandeBuitendoos!.B);
  return { zonder: vind(r, 'verband'), met: vind(bereken(i), 'verband'), recht: vind(r, 'recht'), ...zoekVerband(voorraad, i.drager, breedte) };
}

describe('geen torens in de praktijkcases', () => {
  it('1046693 (binnendoos 235 × 235 × 131 mm): laag B is laag A gespiegeld, elke doos steunt op twee dozen eronder', () => {
    // Reactie van de gebruiker op het voorbeeld met laag A van drie kolommen en laag B met links een kolom van twee
    // dozen: "Waarom is de onderste laag in het voorbeeld recht en niet de 2de laag maar dan gespiegeld. Nu heb je dat
    // aan de linker kant twee torens zijn van dozen die recht op elkaar gestapeld zijn"
    // Het gewicht van 4 kg is aangenomen; het echte gewicht is niet bekend.
    const i = ontwerp(235, 235, 131, 4, { artikelcode: '1046693', maxGevuldGewicht: 10, minBinnendozenPerDoos: 2, minBuitendozenPerLaag: 2 });
    const zonder = bereken(i, { uitlijnen: false }).top[0].oplossing;
    const met = bereken(i).top[0].oplossing;
    expect([met.doos.L, met.doos.B, met.doos.H, met.lagen[0].dozen.length, met.lagen[1].dozen.length, met.aantalLagen]).toEqual([484, 249, 159, 6, 6, 12]);
    // Vóór en na het uitlijnen: B op A 6 van 6 en A op B 6 van 6 (met het eerst gevonden paar was dat 4 van 6).
    controleerGeenTorens(zonder);
    controleerGeenTorens(met);
    // Laag A links een kolom, laag B rechts: gespiegeld om het midden van het blok (x 33,5–766,5).
    const om = omhullende(met.lagen.flatMap((l) => l.dozen));
    expect([om.x, om.x + om.w, om.y, om.y + om.d]).toEqual([33.5, 766.5, 102, 1098]);
    expect(sleutel(met.lagen[1].dozen)).toBe(sleutel(gespiegeld(met.lagen[0].dozen, om, 'x')));
    expect([met.buitendozenPerDrager, met.binnendozenPerDrager, met.totaleHoogte]).toEqual([72, 144, 2052]);
    expect(met.totaalGewicht).toBeCloseTo(634.07, 2);
  });

  it('1000466 (790 × 380 mm): laag B is laag A van voor naar achter gespiegeld, geen dwarse doos recht op een dwarse doos', () => {
    const i = bestaand(790, 380, 275, 13.5, 12);
    const zonder = bereken(i, { uitlijnen: false }).top[0].oplossing;
    const met = bereken(i).top[0].oplossing;
    expect([met.lagen[0].dozen.length, met.lagen[1].dozen.length, met.aantalLagen]).toEqual([3, 3, 7]);
    // B op A en A op B 3 van 3; met het eerst gevonden paar stond de dwarse doos voorop recht op die van laag A.
    controleerGeenTorens(zonder);
    controleerGeenTorens(met);
    const om = omhullende(met.lagen.flatMap((l) => l.dozen));
    expect([om.x, om.x + om.w, om.y, om.y + om.d]).toEqual([5, 795, 15, 1185]);
    expect(sleutel(met.lagen[1].dozen)).toBe(sleutel(gespiegeld(met.lagen[0].dozen, om, 'y')));
    expect([met.buitendozenPerDrager, met.totaleHoogte, met.totaalGewicht]).toEqual([21, 2069, 308.5]);
  });
});

describe('zoekVerband kiest van de paren met de meeste dozen het paar zonder torens', () => {
  const drager = kopieDrager(EUROPALLET);

  it('een gespiegeld paar dat helemaal in verband ligt, wint van een eerder gevonden paar dat maar half in verband ligt', () => {
    // De lagen van 1046693 (dozen van 249 × 484): drie kolommen in twee rijen, en links een kolom van twee met rechts
    // vier dwarse dozen. Beide 6 dozen; de drie kolommen staan voorop, dus het paar met die laag als A komt eerst.
    const kolommen: Rechthoek[] = [0, 1].flatMap((rij) => [0, 1, 2].map((k) => ({ x: 249 * k, y: 484 * rij, w: 249, d: 484 })));
    const kolomEnDwars: Rechthoek[] = [{ x: 0, y: 0, w: 249, d: 484 }, { x: 0, y: 484, w: 249, d: 484 }, ...[0, 1, 2, 3].map((k) => ({ x: 249, y: 249 * k, w: 484, d: 249 }))];
    const voorraad = [kolommen, kolomEnDwars];
    // Het eerst gevonden paar: A de drie kolommen, B de kolom met dwarse dozen. Het is geldig verband, maar alleen de
    // vier dwarse dozen liggen over twee kolommen; de kolom van B staat recht op de linkerkolom van A (torens).
    const oud = eersteGevonden(voorraad, drager).tweezijdig!;
    expect(sleutel(oud.a.dozen)).toBe(sleutel(plaats(kolommen, drager)!.dozen));
    expect([steunB(oud), steunendeDozen(oud.a.dozen, oud.b.dozen)]).toEqual([4, 4]);
    // Nu: A de kolom met dwarse dozen, B dezelfde laag links-rechts gespiegeld. Evenveel dozen, elke doos op twee dozen.
    const { tweezijdig, eenzijdig } = zoekVerband(voorraad, drager);
    const a = plaats(kolomEnDwars, drager)!;
    expect(tweezijdig).not.toBeNull();
    expect(tweezijdig!.a.dozen).toEqual(a.dozen);
    expect(sleutel(tweezijdig!.b.dozen)).toBe(sleutel(gespiegeld(a.dozen, omhullende(a.dozen), 'x')));
    expect(aantallen(tweezijdig)).toEqual(aantallen(oud));
    expect([steunB(tweezijdig!), steunendeDozen(tweezijdig!.a.dozen, tweezijdig!.b.dozen)]).toEqual([6, 6]);
    // Ook het eenzijdige paar (voor precies twee lagen) heeft nu elke doos van B op twee dozen van A.
    expect(aantallen(eenzijdig)).toEqual([6, 6]);
    expect(steunB(eenzijdig!)).toBe(6);
  });

  it('het aantal dozen in laag A gaat voor op het verband, zodat het aantal bij een oneven aantal lagen nooit daalt', () => {
    // Stroken over de volle lengte van de pallet (alle lagen 700 mm breed, x 50–750).
    const zeven = stroken([100, 100, 100, 100, 100, 100, 100]);
    const zes = stroken([125, 100, 100, 100, 100, 175]);
    const vijf = stroken([150, 100, 200, 100, 150]);
    const voorraad = [zeven, zes, vijf];
    // 7 + 5: geldig in beide richtingen, B op A 5 van 5 en A op B 4 van 7.
    const [a7, b5] = [plaats(zeven, drager)!, plaats(vijf, drager)!];
    expect([inVerband(b5.dozen, a7.dozen), inVerband(a7.dozen, b5.dozen)]).toEqual([true, true]);
    expect(steunendeDozen(b5.dozen, a7.dozen) + steunendeDozen(a7.dozen, b5.dozen)).toBe(9);
    // 6 + 6 (de laag en zijn spiegelbeeld): ook 12 dozen per twee lagen en beter in verband, 5 + 5 van 6.
    const [a6, b6] = [plaats(zes, drager)!, plaats(transformeer(zes, 'spiegelX'), drager)!];
    expect([inVerband(b6.dozen, a6.dozen), inVerband(a6.dozen, b6.dozen)]).toEqual([true, true]);
    expect(steunendeDozen(b6.dozen, a6.dozen) + steunendeDozen(a6.dozen, b6.dozen)).toBe(10);
    // De laag van 7 past met geen enkele variant van de laag van 6 in verband, dus 13 per twee lagen kan niet.
    for (const b of [a6, b6]) expect(inVerband(b.dozen, a7.dozen)).toBe(false);
    // Toch wint 7 + 5: bij drie lagen 7 + 5 + 7 = 19 dozen tegen 6 + 6 + 6 = 18.
    const { tweezijdig, eenzijdig } = zoekVerband(voorraad, drager);
    expect(tweezijdig!.a.dozen).toEqual(a7.dozen);
    expect(tweezijdig!.b.dozen).toEqual(b5.dozen);
    expect(aantallen(eenzijdig)).toEqual([7, 5]);
    expect(aantallen(eersteGevonden(voorraad, drager).tweezijdig)).toEqual([7, 5]);
  });

  it('de minste overhang gaat voor op het verband: een paar zonder overhang wint van een paar met overhang dat beter in verband ligt', () => {
    // Overhang links en rechts tot 30 mm. Alle patronen zijn vier stroken over de volle lengte van de pallet.
    const metOverhang = kopieDrager(EUROPALLET);
    metOverhang.overhangToegestaan = true;
    metOverhang.overhang = { voor: 0, achter: 0, links: 30, rechts: 30 };
    // 800 mm breed, dus zonder overhang: vier stroken van 200 mm met daarop 100, 300, 300 en 100 mm. In beide richtingen
    // steunen 2 van de 4 dozen op twee dozen eronder.
    const smalA = stroken([200, 200, 200, 200]);
    const smalB = stroken([100, 300, 300, 100]);
    const [a, b] = [plaats(smalA, metOverhang)!, plaats(smalB, metOverhang)!];
    expect([inVerband(b.dozen, a.dozen), inVerband(a.dozen, b.dozen)]).toEqual([true, true]);
    expect([overhang({ a, b }), steunB({ a, b }), steunendeDozen(a.dozen, b.dozen)]).toEqual([0, 2, 2]);
    // 860 mm breed, dus 30 mm overhang links en rechts: in beide richtingen 3 van 4. Evenveel dozen, beter in verband.
    const breedA = stroken([150, 280, 280, 150]);
    const breedB = stroken([230, 270, 280, 80]);
    const [c, d] = [plaats(breedA, metOverhang)!, plaats(breedB, metOverhang)!];
    expect([inVerband(d.dozen, c.dozen), inVerband(c.dozen, d.dozen)]).toEqual([true, true]);
    expect([c.overhang, d.overhang]).toEqual([
      { voor: 0, achter: 0, links: 30, rechts: 30 },
      { voor: 0, achter: 0, links: 30, rechts: 30 },
    ]);
    expect([steunB({ a: c, b: d }), steunendeDozen(c.dozen, d.dozen)]).toEqual([3, 3]);
    // In welke volgorde de patronen ook in de voorraad staan (bereken() zet ze zonder overhang vooraan): beide soorten
    // verband kiezen het paar zonder overhang.
    for (const voorraad of [
      [smalA, smalB, breedA, breedB],
      [breedA, breedB, smalA, smalB],
    ]) {
      const { tweezijdig, eenzijdig } = zoekVerband(voorraad, metOverhang);
      for (const p of [tweezijdig!, eenzijdig!]) {
        expect([p.a.dozen, p.b.dozen]).toEqual([a.dozen, b.dozen]);
        expect(overhang(p)).toBe(0);
      }
    }
    // Met de brede patronen vooraan was het eerst gevonden paar dat met 30 mm overhang links en rechts.
    const oud = eersteGevonden([breedA, breedB, smalA, smalB], metOverhang);
    expect([oud.tweezijdig!.a.dozen, oud.tweezijdig!.b.dozen]).toEqual([c.dozen, d.dozen]);
    expect([overhang(oud.tweezijdig!), steunBeide(oud.tweezijdig!)]).toEqual([60, 6]);
  });

  // Deze test rekent veel paren door, sinds #65 ook met de varianten van het vijfblokspatroon; daarom een ruimere tijdgrens.
  it('op veel echte laagpatronen: hetzelfde totaal en aantal in laag A als het eerst gevonden paar, niet meer overhang, en bij evenveel overhang minstens zo goed in verband', () => {
    const metOverhang = kopieDrager(EUROPALLET);
    metOverhang.overhangToegestaan = true;
    metOverhang.overhang = { voor: 40, achter: 10, links: 25, rechts: 0 };
    const maten: [number, number][] = [];
    for (const L of [156, 190, 214, 235, 250, 275, 300, 330, 365, 400, 460, 484, 500, 592, 790])
      for (const B of [150, 170, 200, 249, 295, 340, 380]) if (B <= L) maten.push([L, B]);
    let getest = 0;
    let tweezijdig = 0;
    let beter = 0;
    let minderOverhang = 0;
    /**
     * Stap voor stap niet slechter dan het eerst gevonden paar: niet meer overhang; bij evenveel overhang niet meer torens;
     * dan niet minder steun voor de slechtst gesteunde doos (tot 75%); dan minstens zo goed in verband. Geeft wat er beter is, of ''.
     */
    type Maat = (p: VerbandPaar) => number;
    const vergelijk = (nieuw: VerbandPaar, oud: VerbandPaar, steun: Maat, toren: Maat, steunTot75: Maat) => {
      expect(overhang(nieuw)).toBeLessThanOrEqual(overhang(oud) + 1e-6);
      if (overhang(nieuw) < overhang(oud) - 1e-6) return 'overhang';
      expect(toren(nieuw)).toBeLessThanOrEqual(toren(oud));
      if (toren(nieuw) < toren(oud)) return 'torens';
      expect(steunTot75(nieuw)).toBeGreaterThanOrEqual(steunTot75(oud) - 1e-9);
      if (steunTot75(nieuw) > steunTot75(oud) + 1e-9) return 'steun';
      expect(steun(nieuw)).toBeGreaterThanOrEqual(steun(oud));
      return steun(nieuw) > steun(oud) ? 'verband' : '';
    };
    for (const drager of [kopieDrager(EUROPALLET), kopieDrager(BLOKPALLET), metOverhang])
      for (const [L, B] of maten) {
        // Zoals bereken(): de voorraad van elk zoekvlak apart en, met overhang, van beide zoekvlakken samen, aflopend op aantal.
        const perVlak = zoekvlakken(drager).map((v) => zoekPatronen(v.W, v.D, L, B).voorraad);
        const samen = perVlak
          .flat()
          .map((p, i) => ({ p, i }))
          .sort((x, y) => y.p.aantal - x.p.aantal || Number(isVariant(x.p)) - Number(isVariant(y.p)) || x.i - y.i)
          .map((x) => x.p);
        for (const voorraad of perVlak.length > 1 ? [...perVlak, samen] : perVlak) {
          if (voorraad.length === 0) continue;
          const max = voorraad[0].aantal;
          // De varianten van het vijfblokspatroon komen bovenop de breedte, zoals in bereken() (#65).
          const zoek = verbandVenster(voorraad, max);
          const dozen = zoek.map((p) => p.dozen);
          const breedte = zoek.length;
          const oud = eersteGevonden(dozen, drager, breedte);
          const nieuw = zoekVerband(dozen, drager, breedte);
          getest++;
          // Hetzelfde totaal en hetzelfde aantal in laag A (en dus in B), voor beide soorten verband.
          expect(aantallen(nieuw.tweezijdig)).toEqual(aantallen(oud.tweezijdig));
          expect(aantallen(nieuw.eenzijdig)).toEqual(aantallen(oud.eenzijdig));
          if (nieuw.eenzijdig) {
            expect(inVerband(nieuw.eenzijdig.b.dozen, nieuw.eenzijdig.a.dozen)).toBe(true);
            vergelijk(nieuw.eenzijdig, oud.eenzijdig!, steunB, torensB, steunTot75B);
          }
          if (!nieuw.tweezijdig) continue;
          tweezijdig++;
          expect([inVerband(nieuw.tweezijdig.b.dozen, nieuw.tweezijdig.a.dozen), inVerband(nieuw.tweezijdig.a.dozen, nieuw.tweezijdig.b.dozen)]).toEqual([true, true]);
          const uitkomst = vergelijk(nieuw.tweezijdig, oud.tweezijdig!, steunBeide, torensBeide, steunTot75Beide);
          if (uitkomst === 'verband' || uitkomst === 'torens') beter++;
          if (uitkomst === 'overhang') minderOverhang++;
        }
      }
    expect(getest).toBeGreaterThan(250);
    expect(tweezijdig).toBeGreaterThan(200);
    // Bij een flink deel ligt het gekozen paar nu beter in verband dan het eerst gevonden paar.
    expect(beter).toBeGreaterThan(tweezijdig / 10);
    // En soms heeft het minder overhang (gemeten: 7 keer, alleen op de pallet met overhang).
    expect(minderOverhang).toBeGreaterThan(0);
  }, 30_000);
});

describe('verband zonder torens in gemeten cases: overhang, twee lagen en uitlijnen (#60)', () => {
  it('212 × 185 mm op een europallet met 30 mm overhang rondom: het gekozen paar heeft geen overhang, met evenveel dozen', () => {
    const drager = kopieDrager(EUROPALLET);
    drager.overhangToegestaan = true;
    drager.overhang = { voor: 30, achter: 30, links: 30, rechts: 30 };
    const r = bereken(bestaand(212, 185, 150, 8, 4, drager));
    const w = r.top[0].oplossing;
    expect([w.stapelwijze, w.aantalLagen, w.lagen[0].dozen.length, w.lagen[1].dozen.length, w.buitendozenPerDrager]).toEqual(['verband', 5, 24, 24, 120]);
    expect(w.overhang).toEqual({ voor: 0, achter: 0, links: 0, rechts: 0 });
    // Evenveel dozen, even hoog en even zwaar als de rechte stapeling.
    const recht = r.top.find((t) => t.oplossing.stapelwijze === 'recht')!.oplossing;
    expect([recht.buitendozenPerDrager, recht.totaleHoogte, recht.totaalGewicht]).toEqual([w.buitendozenPerDrager, w.totaleHoogte, w.totaalGewicht]);
    // B op A en A op B 16 van 24, zonder torens.
    expect(steunEnTorens(w)).toEqual([
      [16, 0],
      [16, 0],
    ]);
    // Van de paren van 24 + 24 die in beide richtingen in verband liggen, hebben er maar twee geen overhang, met 16 + 16
    // dozen op twee of meer dozen. Paren die beter in verband liggen (tot 38 in plaats van 32; zonder de varianten van het
    // vijfblokspatroon (#65) tot 36) hebben overhang. Zonder de overhang als stap vóór het verband koos de app zo'n paar.
    const { voorraad, breedte } = voorraadZoalsBereken(drager, 212, 185);
    const paren = verbandParen(voorraad, drager, breedte).filter(
      (p) => p.a.dozen.length === 24 && p.b.dozen.length === 24 && inVerband(p.b.dozen, p.a.dozen) && inVerband(p.a.dozen, p.b.dozen),
    );
    expect(paren.filter((p) => overhang(p) === 0).map(steunBeide)).toEqual([32, 32]);
    expect(Math.max(...paren.map(steunBeide))).toBe(38);
    const { tweezijdig } = zoekVerband(voorraad, drager, breedte);
    expect([overhang(tweezijdig!), steunBeide(tweezijdig!)]).toEqual([0, 32]);
  });

  it('twee lagen van 192 × 147 mm: laag B is laag A gespiegeld (#65), met evenveel dozen, even hoog en even zwaar', () => {
    const i = bestaand(192, 147, 900, 5, 1);
    const { zonder, met, recht, tweezijdig, eenzijdig } = tweeLagen(i);
    expect([zonder.aantalLagen, zonder.lagen[0].dozen.length, zonder.lagen[1].dozen.length]).toEqual([2, 32, 32]);
    // Bij precies twee lagen telt alleen B op A. Vóór #65 had het tweezijdige paar 20 van 32 en toonde de app het paar voor
    // twee lagen (eenzijdig) met 24 van 32. Nu is laag A een variant van het vijfblokspatroon en laag B die laag van voor
    // naar achter gespiegeld: evenveel torens (8) en genoeg steun, en gespiegeld gaat voor op meer dozen op twee of meer
    // dozen (#63). Dat paar is het beste in beide richtingen en ook voor twee lagen; B op A 18 van 32. De app toont het.
    expect([aantallen(tweezijdig), steunB(tweezijdig!), isGespiegeld(tweezijdig!.a.dozen, tweezijdig!.b.dozen)]).toEqual([[32, 32], 18, 'y']);
    expect([aantallen(eenzijdig), steunB(eenzijdig!)]).toEqual([[32, 32], 18]);
    expect([sleutel(eenzijdig!.a.dozen), sleutel(eenzijdig!.b.dozen)]).toEqual([sleutel(tweezijdig!.a.dozen), sleutel(tweezijdig!.b.dozen)]);
    expect([sleutel(zonder.lagen[0].dozen), sleutel(zonder.lagen[1].dozen)]).toEqual([sleutel(eenzijdig!.a.dozen), sleutel(eenzijdig!.b.dozen)]);
    // Paren met B op A 24 van 32, ook met 8 torens en genoeg steun, zijn er nog, maar die zijn niet gespiegeld en liggen
    // voor twee lagen dus minder goed.
    const { voorraad, breedte } = voorraadZoalsBereken(i.drager, 192, 147);
    const meer = verbandParen(voorraad, i.drager, breedte).filter(
      (p) => p.a.dozen.length === 32 && p.b.dozen.length === 32 && inVerband(p.b.dozen, p.a.dozen) && steunB(p) === 24 && torensB(p) === 8 && genoegB(p),
    );
    expect(meer.length).toBeGreaterThan(0);
    for (const p of meer) expect([isGespiegeld(p.a.dozen, p.b.dozen), beterVoorTweeLagen(eenzijdig!, p)]).toEqual([null, true]);
    // Vóór en na het uitlijnen 18 van 32. Er staan 8 dozen voor minstens 90% op één doos eronder; minder kan met 32 + 32
    // niet, ook het tweezijdige paar heeft er minstens zoveel.
    expect([steunEnTorens(zonder)[0], steunEnTorens(met)[0]]).toEqual([
      [18, 8],
      [18, 8],
    ]);
    expect(torensB(tweezijdig!)).toBeGreaterThanOrEqual(8);
    controleerUitlijnen(zonder, met);
    // Evenveel dozen, even hoog en even zwaar als de rechte stapeling (de winnaar); het tweezijdige paar heeft ook 32 + 32.
    expect([zonder.buitendozenPerDrager, zonder.totaleHoogte, zonder.totaalGewicht]).toEqual([64, 1944, 345]);
    expect([recht.buitendozenPerDrager, recht.totaleHoogte, recht.totaalGewicht]).toEqual([64, 1944, 345]);
  });

  it('twee lagen van 511 × 90 mm op een blokpallet: genoeg steun gaat voor op meer dozen op twee of meer dozen', () => {
    const i = bestaand(511, 90, 900, 8, 4, kopieDrager(BLOKPALLET));
    const { zonder, met, recht } = tweeLagen(i);
    expect([zonder.aantalLagen, zonder.lagen[0].dozen.length, zonder.lagen[1].dozen.length]).toEqual([2, 23, 23]);
    // Er is een paar van 23 + 23 waarin alle 23 dozen van B op twee of meer dozen van A steunen, maar met dozen die op
    // minder dan 75% van hun grondvlak rusten. De app houdt het paar waarin elke doos genoeg steun heeft: 18 van 23, geen torens.
    const { voorraad, breedte } = voorraadZoalsBereken(i.drager, 511, 90);
    const alle = verbandParen(voorraad, i.drager, breedte).filter((p) => p.a.dozen.length === 23 && p.b.dozen.length === 23 && inVerband(p.b.dozen, p.a.dozen));
    expect(alle.some((p) => steunB(p) === 23 && !genoegB(p))).toBe(true);
    const [a, b] = [zonder.lagen[0].dozen, zonder.lagen[1].dozen];
    expect([steunendeDozen(b, a), torens(b, a), kleinsteSteun(b, a) >= 0.75]).toEqual([18, 0, true]);
    controleerUitlijnen(zonder, met);
    expect([zonder.buitendozenPerDrager, zonder.totaleHoogte, zonder.totaalGewicht]).toEqual([46, 1940, 398]);
    expect([recht.buitendozenPerDrager, recht.totaleHoogte, recht.totaalGewicht]).toEqual([46, 1940, 398]);
  });

  it('twee lagen van 714 × 164 mm (7 + 6): ligt het paar voor twee lagen niet beter in verband, dan blijft het tweezijdige paar', () => {
    const { zonder, met, tweezijdig, eenzijdig } = tweeLagen(bestaand(714, 164, 900, 8, 1));
    expect([zonder.aantalLagen, zonder.lagen[0].dozen.length, zonder.lagen[1].dozen.length, zonder.buitendozenPerDrager]).toEqual([2, 7, 6, 13]);
    // Beide paren 7 + 6 met B op A 6 van 6 (A op B 6 en 5 van 7, maar dat telt bij twee lagen niet).
    expect([aantallen(tweezijdig), steunB(tweezijdig!), aantallen(eenzijdig), steunB(eenzijdig!)]).toEqual([[7, 6], 6, [7, 6], 6]);
    expect(sleutel(eenzijdig!.a.dozen) + sleutel(eenzijdig!.b.dozen)).not.toBe(sleutel(tweezijdig!.a.dozen) + sleutel(tweezijdig!.b.dozen));
    expect([sleutel(zonder.lagen[0].dozen), sleutel(zonder.lagen[1].dozen)]).toEqual([sleutel(tweezijdig!.a.dozen), sleutel(tweezijdig!.b.dozen)]);
    // Vóór en na het uitlijnen 6 van 6, zonder torens.
    controleerGeenTorens(zonder);
    controleerGeenTorens(met);
    controleerUitlijnen(zonder, met);
  });

  it('twee lagen van 189 × 132 mm op een blokpallet met 60 mm overhang voor en achter: geen beter verband ten koste van meer overhang', () => {
    const drager = kopieDrager(BLOKPALLET);
    drager.overhangToegestaan = true;
    drager.overhang = { voor: 60, achter: 60, links: 0, rechts: 0 };
    const { zonder, tweezijdig, eenzijdig } = tweeLagen(bestaand(189, 132, 900, 2, 1, drager));
    // Het paar voor twee lagen heeft één doos meer in laag A (50 + 48) en ligt beter in verband (B op A 28 tegen 25), maar
    // heeft 60 in plaats van 51 mm overhang voor en achter. Dus toont de app het tweezijdige paar van 49 + 49.
    expect([aantallen(tweezijdig), steunB(tweezijdig!), overhang(tweezijdig!)]).toEqual([[49, 49], 25, 102]);
    expect([aantallen(eenzijdig), steunB(eenzijdig!), overhang(eenzijdig!)]).toEqual([[50, 48], 28, 120]);
    expect([sleutel(zonder.lagen[0].dozen), sleutel(zonder.lagen[1].dozen)]).toEqual([sleutel(tweezijdig!.a.dozen), sleutel(tweezijdig!.b.dozen)]);
    expect([zonder.aantalLagen, zonder.buitendozenPerDrager]).toEqual([2, 98]);
    expect(zonder.overhang).toEqual({ voor: 51, achter: 51, links: 0, rechts: 0 });
  });

  it('uitlijnen bij 453 × 190 en 453 × 181 mm: het verband blijft zoals het was, zonder torens', () => {
    const uitkomst = (B: number) => {
      const i = bestaand(453, B, 200, 2, 1);
      const zonder = bereken(i, { uitlijnen: false }).top[0].oplossing;
      const met = bereken(i).top[0].oplossing;
      expect([met.stapelwijze, met.aantalLagen, met.lagen[0].dozen.length, met.lagen[1].dozen.length, met.buitendozenPerDrager]).toEqual(['verband', 9, 9, 9, 81]);
      controleerUitlijnen(zonder, met);
      return { zonder, met };
    };
    // 453 × 190 mm: laag B is laag A gespiegeld, B op A en A op B 8 van 9, vóór en na het uitlijnen. Zolang het uitlijnen
    // daar niet op lette, schoof het links twee dozen recht op een gelijke doos eronder en steunden er nog maar 7 van 9 op
    // twee of meer dozen. Tot #65 gold dat ook voor 453 × 181 mm.
    const a = uitkomst(190);
    for (const o of [a.zonder, a.met]) {
      expect(steunEnTorens(o)).toEqual([
        [8, 0],
        [8, 0],
      ]);
      expect(isGespiegeld(o.lagen[0].dozen, o.lagen[1].dozen)).toBe('y');
    }
    // 453 × 181 mm: sinds #65 twee varianten van het vijfblokspatroon, B op A 9 van 9 en A op B 8 van 9, zonder torens. De
    // slechtst gesteunde doos rust op 60,3% in plaats van 60,0% in het gespiegelde paar van vóór #65 (8 van 9 in beide
    // richtingen); meer steun gaat voor op gespiegeld (#63). Het uitlijnen verschuift hier niets.
    const b = uitkomst(181);
    for (const o of [b.zonder, b.met]) {
      expect(steunEnTorens(o)).toEqual([
        [9, 0],
        [8, 0],
      ]);
      expect(Math.round(Math.min(kleinsteSteun(o.lagen[1].dozen, o.lagen[0].dozen), kleinsteSteun(o.lagen[0].dozen, o.lagen[1].dozen)) * 1000) / 1000).toBe(0.603);
    }
  });

  it('370 × 90 mm op een blokpallet: elke doos houdt genoeg steun, het verband is 32 van 35 en na het uitlijnen 33 van 35, zonder torens', () => {
    const i = bestaand(370, 90, 250, 2, 1, kopieDrager(BLOKPALLET));
    const zonder = bereken(i, { uitlijnen: false }).top[0].oplossing;
    const met = bereken(i).top[0].oplossing;
    expect([met.stapelwijze, met.aantalLagen, met.lagen[0].dozen.length, met.lagen[1].dozen.length, met.buitendozenPerDrager]).toEqual(['verband', 7, 35, 35, 245]);
    // Paren van 35 + 35 zonder torens met meer dozen op twee of meer dozen bestaan (tot 33 + 33), maar daarin rust een doos
    // op minder dan 69% van zijn grondvlak. De app kiest het paar zonder torens waarin elke doos minstens 75% steun heeft:
    // B op A en A op B 32 van 35, na het uitlijnen 33 van 35. Tot #65 liet 385 × 90 mm dit zien (zie de volgende test).
    const { voorraad, breedte } = voorraadZoalsBereken(i.drager, 370, 90);
    const beterInVerband = verbandParen(voorraad, i.drager, breedte).filter(
      (p) => p.a.dozen.length === 35 && p.b.dozen.length === 35 && inVerband(p.b.dozen, p.a.dozen) && inVerband(p.a.dozen, p.b.dozen) && torensBeide(p) === 0 && steunBeide(p) > 64,
    );
    expect(Math.max(...beterInVerband.map(steunBeide))).toBe(66);
    expect(Math.max(...beterInVerband.map(steunTot75Beide))).toBeLessThan(0.69);
    expect(steunEnTorens(zonder)).toEqual([
      [32, 0],
      [32, 0],
    ]);
    expect(steunEnTorens(met)).toEqual([
      [33, 0],
      [33, 0],
    ]);
    for (const o of [zonder, met])
      expect(Math.min(kleinsteSteun(o.lagen[1].dozen, o.lagen[0].dozen), kleinsteSteun(o.lagen[0].dozen, o.lagen[1].dozen))).toBeGreaterThanOrEqual(0.75);
    controleerUitlijnen(zonder, met);
  });

  it('385 × 90 mm op een blokpallet: sinds #65 33 + 33 dozen met torens, want meer dozen gaan voor; het uitlijnen maakt het niet slechter', () => {
    const i = bestaand(385, 90, 250, 2, 1, kopieDrager(BLOKPALLET));
    const zonder = bereken(i, { uitlijnen: false }).top[0].oplossing;
    const met = bereken(i).top[0].oplossing;
    // Vóór #65 was het verband 33 + 32 (228 per drager): B op A 26 van 32 en A op B 24 van 33, zonder torens en met
    // minstens 75% steun voor elke doos. Nu is laag A een variant van het vijfblokspatroon en laag B die laag van voor naar
    // achter gespiegeld: 33 + 33 per twee lagen, 231 per drager. Meer dozen gaan voor (#60), ook al staan er dan per laagpaar
    // 2 dozen voor minstens 90% op één doos en rust de slechtst gesteunde doos op 56% van zijn grondvlak.
    expect([met.stapelwijze, met.aantalLagen, met.lagen[0].dozen.length, met.lagen[1].dozen.length, met.buitendozenPerDrager]).toEqual(['verband', 7, 33, 33, 231]);
    // Vóór en na het uitlijnen B op A en A op B 17 van 33 met 2 torens; geen doos krijgt minder steun. Zonder de regels van
    // #51 en #60 zou het uitlijnen hier 4 + 4 torens maken.
    for (const o of [zonder, met]) {
      expect(isGespiegeld(o.lagen[0].dozen, o.lagen[1].dozen)).toBe('y');
      expect(steunEnTorens(o)).toEqual([
        [17, 2],
        [17, 2],
      ]);
      expect(Math.round(Math.min(kleinsteSteun(o.lagen[1].dozen, o.lagen[0].dozen), kleinsteSteun(o.lagen[0].dozen, o.lagen[1].dozen)) * 1000) / 1000).toBe(0.556);
    }
    controleerUitlijnen(zonder, met);
  });

  it('twee lagen van 553 × 304 mm op een blokpallet: bij evenveel dozen op twee of meer gaat het paar zonder torens voor', () => {
    const i = bestaand(553, 304, 800, 10, 1, kopieDrager(BLOKPALLET));
    i.minBuitendozenPerLaag = 1;
    const zonder = bereken(i, { uitlijnen: false }).top.find((t) => t.oplossing.stapelwijze === 'verband')!.oplossing;
    // In het tweezijdige paar staan twee dozen van laag B helemaal op de linkerkolom van laag A; het paar voor twee lagen
    // heeft evenveel dozen op twee of meer dozen (3 van 5), maar geen torens.
    const [a, b] = [zonder.lagen[0].dozen, zonder.lagen[1].dozen];
    expect([zonder.aantalLagen, a.length, b.length]).toEqual([2, 6, 5]);
    expect([steunendeDozen(b, a), torens(b, a), kleinsteSteun(b, a) >= 0.75]).toEqual([3, 0, true]);
  });

  it('een strengere min. ondersteuning geeft nooit minder steun (511 × 90 × 900 mm op een blokpallet)', () => {
    const steunBij = (minSteun: number) => {
      const i = bestaand(511, 90, 900, 8, 4, kopieDrager(BLOKPALLET));
      i.minSteun = minSteun;
      const o = bereken(i, { uitlijnen: false }).top.find((t) => t.oplossing.stapelwijze === 'verband')!.oplossing;
      return [steunendeDozen(o.lagen[1].dozen, o.lagen[0].dozen), Math.round(kleinsteSteun(o.lagen[1].dozen, o.lagen[0].dozen) * 1000) / 1000];
    };
    // Bij 30% hebben het paar met 23 van 23 op twee of meer dozen (kleinste steun 45,8%) en het gespiegelde paar met 18 van
    // 23 (82,4%) allebei genoeg steun; dan gaat het gespiegelde paar voor op meer dozen op twee of meer dozen (#63). Bij 75%
    // en bij 100% houdt de app het paar met de meeste steun (82,4%); de steun telt als getal, tot aan de ingestelde grens.
    expect(steunBij(0.3)).toEqual([18, 0.824]);
    expect(steunBij(0.75)).toEqual([18, 0.824]);
    expect(steunBij(1)).toEqual([18, 0.824]);
  });

  it('uitlijnen bij twee lagen van 224 × 196 mm: de dozen schuiven wel, en B op A blijft 18 van 18', () => {
    const i = bestaand(224, 196, 900, 2, 1);
    const zonder = bereken(i, { uitlijnen: false }).top[0].oplossing;
    const met = bereken(i).top[0].oplossing;
    expect([met.stapelwijze, met.aantalLagen, met.lagen[0].dozen.length, met.lagen[1].dozen.length, met.buitendozenPerDrager]).toEqual(['verband', 2, 20, 18, 38]);
    expect(met.lagen.map((l) => sleutel(l.dozen))).not.toEqual(zonder.lagen.map((l) => sleutel(l.dozen)));
    // Vóór en na het uitlijnen steunt elke doos van B op twee of meer dozen van A. Met alleen de voorwaarde op dozen precies
    // op een gelijke doos eronder steunden er na het uitlijnen nog maar 10 van 18 op twee of meer dozen.
    controleerGeenTorens(zonder);
    controleerGeenTorens(met);
    controleerUitlijnen(zonder, met);
  });
});
