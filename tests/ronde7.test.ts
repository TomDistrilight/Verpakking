// Ronde 7. De gebruiker, over de laagopbouw van een verbandoplossing met 6 dozen van 414 × 314 mm per laag op een
// europallet (8 lagen, 1968 mm hoog):
// "Beter is doos 3 met 90 graden draaien en vanuit daar verband stapelen. In dat geval wordt er een blok van gemaakt in
// plaats van 2 losse blokken. Waarom wordt dit nu niet gedaan?"
//
// Oorzaak: de app maakte per voetafdruk maar één vijfblokspatroon (de eerste snijposities met het hoogste aantal). Dat
// patroon valt uiteen in een gesloten blok van 4 dozen en een losse strook van 2. Het patroon van de gebruiker (doos 3
// gedraaid: een gesloten pinwheel met een gat in het midden, één blok) heeft ook 6 dozen, maar kwam nooit in de voorraad.
// #65: naast het beste vijfblokspatroon gaan tot VIJFBLOK_VARIANTEN andere vijfblokspatronen met hetzelfde aantal mee,
// achter de andere patronen met hetzelfde aantal. Het eerste patroon (rechte stapeling) en het maximum blijven gelijk. De
// keuze van het verbandpaar is niet veranderd; die kiest nu het patroon van de gebruiker: elke doos op twee dozen,
// volledig gesteund.

import { describe, expect, it } from 'vitest';

import { bereken } from '../src/engine/bereken';
import { omhullende, VIJFBLOK_VARIANT, VIJFBLOK_VARIANTEN, zoekPatronen, type Patroon, type PatroonResultaat } from '../src/engine/laagpatroon';
import { zoekvlakken } from '../src/engine/plaatsing';
import { BLOKPALLET, EUROPALLET, kopieDrager, standaardInvoer } from '../src/engine/standaard';
import type { Invoer, Oplossing, Overhang, Rechthoek } from '../src/engine/types';
import { isGespiegeld, kleinsteSteun, steunendeDozen, torens, zoekVerband, type VerbandPaar } from '../src/engine/verband';

// ---------------------------------------------------------------------------------------------------------------------
// Hulpmiddelen.

const EPS = 1e-6;
const EURO = kopieDrager(EUROPALLET);

/** Dozen als vergelijkbare tekst, los van de volgorde. */
const sleutel = (dozen: Rechthoek[]) =>
  dozen
    .map((r) => `${r.x},${r.y},${r.w},${r.d}`)
    .sort()
    .join(';');
const dozenVan = (lijst: [number, number, number, number][]): Rechthoek[] => lijst.map(([x, y, w, d]) => ({ x, y, w, d }));
const isVariant = (p: Patroon) => p.bron === VIJFBLOK_VARIANT;

/** Rechte snedes door de hele laag die geen doos doorsnijden. Is er zo'n snede, dan bestaat de laag uit losse blokken. */
function snedes(dozen: Rechthoek[]): string[] {
  const om = omhullende(dozen);
  const uit: string[] = [];
  for (const as of ['x', 'y'] as const) {
    const begin = as === 'x' ? om.x : om.y;
    const eind = begin + (as === 'x' ? om.w : om.d);
    const randen = [...new Set(dozen.flatMap((r) => (as === 'x' ? [r.x, r.x + r.w] : [r.y, r.y + r.d])))].sort((a, b) => a - b);
    for (const c of randen) {
      if (c <= begin + EPS || c >= eind - EPS) continue;
      const door = dozen.some((r) => (as === 'x' ? r.x < c - EPS && r.x + r.w > c + EPS : r.y < c - EPS && r.y + r.d > c + EPS));
      if (!door) uit.push(`${as}=${c}`);
    }
  }
  return uit;
}

/** De doos tegen de rechterrand van de laag die de middenlijn (van voor naar achter gemeten) kruist: "doos 3". */
function rechtsMidden(dozen: Rechthoek[]): Rechthoek {
  const om = omhullende(dozen);
  const midden = om.y + om.d / 2;
  const r = dozen.find((r) => Math.abs(r.x + r.w - (om.x + om.w)) < EPS && r.y < midden && r.y + r.d > midden);
  expect(r).toBeDefined();
  return r!;
}

/** Het oude beste vijfblokspatroon (relatief): een blok van 4 dozen en een losse strook van 2, gescheiden bij y = 728. */
const OUD_A = dozenVan([
  [0, 0, 414, 314],
  [414, 0, 314, 414],
  [314, 414, 414, 314],
  [314, 728, 414, 314],
  [0, 314, 314, 414],
  [0, 728, 314, 414],
]);
/** Het patroon van de gebruiker (relatief): doos 3 gedraaid, een gesloten pinwheel met een gat in het midden. */
const GEBRUIKER_A = dozenVan([
  [0, 0, 414, 314],
  [414, 0, 314, 414],
  [414, 414, 314, 414],
  [314, 828, 414, 314],
  [0, 314, 314, 414],
  [0, 728, 314, 414],
]);

/** Het geval van de gebruiker: een bestaande buitendoos van 414 × 314 × 228 mm, 10 kg, zonder binnendoos, op een europallet. */
function gebruiker(): Invoer {
  const i = standaardInvoer();
  i.instap = 'bestaandeBuitendoos';
  i.artikelcode = 'R7';
  i.binnendoos = undefined;
  i.zonderBinnendoos = true;
  i.artikelenPerBinnendoos = 1;
  i.bestaandeBuitendoos = { L: 414, B: 314, H: 228, gevuldGewicht: 10, binnendozenPerDoos: 1 };
  i.minBuitendozenPerLaag = 2;
  i.minSteun = 0.75;
  return i;
}
const oplossingVan = (stapelwijze: 'recht' | 'verband', uitlijnen = true): Oplossing =>
  bereken(gebruiker(), { uitlijnen }).top.find((t) => t.oplossing.stapelwijze === stapelwijze)!.oplossing;

// ---------------------------------------------------------------------------------------------------------------------

describe('zoekPatronen: varianten van het vijfblokspatroon (#65)', () => {
  const r = zoekPatronen(800, 1200, 414, 314);
  const varianten = r.voorraad.filter(isVariant);

  it('414 × 314 mm op een europallet: het oude beste vijfblokspatroon blijft eerste, met hetzelfde maximum', () => {
    expect([r.max, r.bewezen]).toEqual([6, true]);
    expect(r.voorraad[0].bron).toBe('vijfblok');
    expect(sleutel(r.voorraad[0].dozen)).toBe(sleutel(OUD_A));
    // Twee losse blokken: een rechte snede bij y = 728 raakt geen doos. Het patroon van de gebruiker is één blok.
    expect(snedes(OUD_A)).toEqual(['y=728']);
    expect(snedes(GEBRUIKER_A)).toEqual([]);
    // Zonder de varianten dezelfde patronen als vóór #65, in dezelfde volgorde.
    expect(r.voorraad.filter((p) => !isVariant(p)).map((p) => p.bron)).toEqual(['vijfblok', 'guillotine-x', 'guillotine-y', 'tweeblok-x', 'tweeblok-y']);
  });

  it('de varianten: elk met het maximum, allemaal verschillend, hooguit VIJFBLOK_VARIANTEN, en het patroon van de gebruiker zit erbij', () => {
    expect(varianten.length).toBeGreaterThan(0);
    expect(varianten.length).toBeLessThanOrEqual(VIJFBLOK_VARIANTEN);
    for (const v of varianten) expect([v.aantal, v.dozen.length]).toEqual([r.max, r.max]);
    const sleutels = r.voorraad.map((p) => sleutel(p.dozen));
    expect(new Set(sleutels).size).toBe(sleutels.length);
    expect(varianten.map((v) => sleutel(v.dozen))).toContain(sleutel(GEBRUIKER_A));
  });

  it('de varianten komen achter alle andere patronen met hetzelfde aantal; de voorraad groeit alleen met de varianten', () => {
    const eerste = r.voorraad.findIndex(isVariant);
    expect(r.voorraad.slice(0, eerste).every((p) => !isVariant(p) && p.aantal === r.max)).toBe(true);
    expect(r.voorraad.slice(eerste).every((p) => isVariant(p) || p.aantal < r.max)).toBe(true);
    expect(r.voorraad.slice(eerste, eerste + varianten.length).every(isVariant)).toBe(true);
    expect(r.voorraad.length).toBeLessThanOrEqual(24 + varianten.length);
  });

  it('zonder de varianten kiest de verbandzoektocht het oude paar; met de varianten het patroon van de gebruiker', () => {
    const zonderVarianten = r.voorraad.filter((p) => !isVariant(p)).map((p) => p.dozen);
    const zonder = zoekVerband(zonderVarianten, EURO, 24, 0.75).tweezijdig!;
    const alle = r.voorraad.map((p) => p.dozen);
    const met = zoekVerband(alle, EURO, 24 + varianten.length, 0.75).tweezijdig!;
    const som = (o: Overhang) => o.voor + o.achter + o.links + o.rechts;
    /** Dozen in A en B, overhang van beide lagen, torens van B op A en van A op B. */
    const stand = (p: VerbandPaar) => [p.a.dozen.length, p.b.dozen.length, som(p.a.overhang) + som(p.b.overhang), torens(p.b.dozen, p.a.dozen), torens(p.a.dozen, p.b.dozen)];
    // Vroeger: 6/6 zonder overhang en torens; de slechtst gesteunde doos rust voor 76% op de laag eronder (genoeg), 5 van de
    // 6 dozen op twee dozen en beide lagen in twee losse blokken.
    expect(stand(zonder)).toEqual([6, 6, 0, 0, 0]);
    expect(kleinsteSteun(zonder.b.dozen, zonder.a.dozen)).toBeCloseTo(0.758, 3);
    expect([steunendeDozen(zonder.b.dozen, zonder.a.dozen), steunendeDozen(zonder.a.dozen, zonder.b.dozen)]).toEqual([5, 5]);
    expect(snedes(zonder.a.dozen).length).toBeGreaterThan(0);
    expect(snedes(zonder.b.dozen).length).toBeGreaterThan(0);
    expect(isGespiegeld(zonder.a.dozen, zonder.b.dozen)).not.toBeNull();
    // Nu: evenveel dozen, geen overhang en torens, genoeg steun en gespiegeld; de meeste dozen op twee dozen beslist (stap 6
    // van de rangorde): 6 + 6 in plaats van 5 + 5, en elke doos volledig gesteund.
    expect(stand(met)).toEqual([6, 6, 0, 0, 0]);
    expect([kleinsteSteun(met.b.dozen, met.a.dozen), kleinsteSteun(met.a.dozen, met.b.dozen)]).toEqual([1, 1]);
    expect([steunendeDozen(met.b.dozen, met.a.dozen), steunendeDozen(met.a.dozen, met.b.dozen)]).toEqual([6, 6]);
    expect([snedes(met.a.dozen), snedes(met.b.dozen)]).toEqual([[], []]);
    expect(isGespiegeld(met.a.dozen, met.b.dozen)).not.toBeNull();
  });
});

describe('bereken: het geval van de gebruiker (414 × 314 × 228 mm, 10 kg, europallet)', () => {
  it('verband 6/6, 8 lagen, 48 dozen en 1968 mm hoog, zoals voorheen; nu één blok met doos 3 gedraaid', () => {
    const o = oplossingVan('verband');
    const [a, b] = o.lagen.map((l) => l.dozen);
    expect([a.length, b.length, o.aantalLagen, o.buitendozenPerDrager, o.totaleHoogte]).toEqual([6, 6, 8, 48, 1968]);
    expect(sleutel(a)).toBe(
      sleutel(
        dozenVan([
          [36, 29, 414, 314],
          [450, 29, 314, 414],
          [450, 443, 314, 414],
          [350, 857, 414, 314],
          [36, 343, 314, 414],
          [36, 757, 314, 414],
        ]),
      ),
    );
    // Beide lagen hebben dezelfde omtrek van 728 × 1142 mm en vallen niet in losse blokken uiteen.
    expect(omhullende(a)).toEqual({ x: 36, y: 29, w: 728, d: 1142 });
    expect(omhullende(b)).toEqual(omhullende(a));
    expect([snedes(a), snedes(b)]).toEqual([[], []]);
    // Doos 3, rechts in het midden van laag A, staat gedraaid: 314 mm breed en 414 mm diep.
    const doos3 = rechtsMidden(a);
    expect([doos3.w, doos3.d]).toEqual([314, 414]);
    // Zonder uitlijnen precies dezelfde lagen.
    const zonder = oplossingVan('verband', false);
    expect(zonder.lagen.map((l) => sleutel(l.dozen))).toEqual([sleutel(a), sleutel(b)]);
  });

  it('elke doos van laag B op twee dozen van laag A en omgekeerd, volledig gesteund, zonder torens, en B is A gespiegeld', () => {
    const o = oplossingVan('verband');
    const [a, b] = o.lagen.map((l) => l.dozen);
    expect([steunendeDozen(b, a), steunendeDozen(a, b)]).toEqual([6, 6]);
    expect([torens(b, a), torens(a, b)]).toEqual([0, 0]);
    expect([kleinsteSteun(b, a), kleinsteSteun(a, b)]).toEqual([1, 1]);
    expect(isGespiegeld(a, b)).not.toBeNull();
  });

  it('de rechte stapeling houdt het oude eerste patroon, met 48 dozen', () => {
    const o = oplossingVan('recht');
    expect([o.lagen.length, o.lagen[0].dozen.length, o.aantalLagen, o.buitendozenPerDrager]).toEqual([1, 6, 8, 48]);
    const a = o.lagen[0].dozen;
    expect(sleutel(a)).toBe(
      sleutel(
        dozenVan([
          [36, 29, 414, 314],
          [450, 29, 314, 414],
          [350, 443, 414, 314],
          [350, 757, 414, 314],
          [36, 343, 314, 414],
          [36, 757, 314, 414],
        ]),
      ),
    );
    const doos3 = rechtsMidden(a);
    expect([doos3.w, doos3.d]).toEqual([414, 314]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe('invarianten op een raster van voetafdrukken (europallet en blokpallet)', () => {
  interface Geval {
    naam: string;
    r: PatroonResultaat;
    /** Alle patronen, zonder grens aan de omvang van de voorraad. */
    alle: PatroonResultaat;
  }
  let gevallen: Geval[] | null = null;
  /** Eén keer rekenen voor alle tests in dit blok. */
  function raster(): Geval[] {
    if (gevallen) return gevallen;
    const maten: [number, number][] = [
      [414, 314],
      [190, 140],
      [210, 130],
      [245, 155],
    ];
    for (let L = 250; L <= 600; L += 50) for (let B = 160; B <= L; B += 45) maten.push([L, B]);
    gevallen = [];
    for (const drager of [EUROPALLET, BLOKPALLET])
      for (const v of zoekvlakken(kopieDrager(drager)))
        for (const [L, B] of maten)
          gevallen.push({ naam: `${v.W} × ${v.D}, ${L} × ${B}`, r: zoekPatronen(v.W, v.D, L, B), alle: zoekPatronen(v.W, v.D, L, B, { maxVoorraad: 10_000 }) });
    return gevallen;
  }

  it('het raster is niet leeg: er zijn gevallen met varianten (ook van het snelle vijfblokspatroon) en gevallen zonder', () => {
    const g = raster();
    expect(g.length).toBeGreaterThan(100);
    const met = g.filter((x) => x.r.voorraad.some(isVariant));
    expect(met.length).toBeGreaterThanOrEqual(15);
    expect(met.some((x) => x.r.voorraad.some((p) => p.bron === 'vijfblok-rooster'))).toBe(true);
    expect(g.length - met.length).toBeGreaterThanOrEqual(50);
  });

  it('zonder de varianten: aflopend op aantal, met hetzelfde eerste patroon en maximum, en er valt geen patroon af', () => {
    for (const { naam, r, alle } of raster()) {
      const zonder = r.voorraad.filter((p) => !isVariant(p));
      expect(zonder.length, naam).toBeGreaterThan(0);
      expect(zonder[0], naam).toBe(r.voorraad[0]);
      expect(r.max, naam).toBe(r.voorraad[0].aantal);
      for (let k = 1; k < zonder.length; k++) expect(zonder[k].aantal, naam).toBeLessThanOrEqual(zonder[k - 1].aantal);
      // De eerste 24 patronen zonder varianten zijn dezelfde als in de volledige lijst: geen patroon valt af door de varianten.
      const begin = zonder.slice(0, 24).map((p) => sleutel(p.dozen));
      const volledig = alle.voorraad.filter((p) => !isVariant(p)).slice(0, 24);
      expect(begin, naam).toEqual(volledig.map((p) => sleutel(p.dozen)));
      expect([alle.max, alle.bovengrens], naam).toEqual([r.max, r.bovengrens]);
    }
  });

  it('varianten: hooguit VIJFBLOK_VARIANTEN, elk met het maximum, achter de andere patronen met dat aantal; geen dubbele patronen', () => {
    for (const { naam, r } of raster()) {
      const varianten = r.voorraad.filter(isVariant);
      expect(varianten.length, naam).toBeLessThanOrEqual(VIJFBLOK_VARIANTEN);
      expect(r.voorraad.length, naam).toBeLessThanOrEqual(24 + VIJFBLOK_VARIANTEN);
      for (const v of varianten) expect(v.aantal, naam).toBe(r.max);
      const eerste = r.voorraad.findIndex(isVariant);
      if (eerste >= 0) {
        expect(eerste, naam).toBeGreaterThan(0);
        const erachter = r.voorraad.slice(eerste).filter((p) => !isVariant(p) && p.aantal === r.max);
        expect(erachter, naam).toEqual([]);
      }
      const sleutels = r.voorraad.map((p) => sleutel(p.dozen));
      expect(new Set(sleutels).size, naam).toBe(sleutels.length);
    }
  });

  it('waar de guillotine de bovengrens al haalt, draait de vijfblokzoektocht niet en zijn er geen varianten', () => {
    const vol = raster().filter(({ r }) => r.voorraad[0].bron === 'guillotine-x' && r.voorraad[0].aantal === r.bovengrens);
    expect(vol.length).toBeGreaterThanOrEqual(50);
    for (const { naam, r } of vol) {
      const vijfblok = r.voorraad.filter((p) => p.bron.startsWith('vijfblok'));
      expect(vijfblok, naam).toEqual([]);
    }
    // Bijvoorbeeld 400 × 300 mm op een europallet: 8 dozen, gelijk aan de bovengrens.
    const r = zoekPatronen(800, 1200, 400, 300);
    expect([r.max, r.bovengrens, r.voorraad[0].bron]).toEqual([8, 8, 'guillotine-x']);
    expect(r.voorraad.some(isVariant)).toBe(false);
  });
});
