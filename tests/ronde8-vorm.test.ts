// Ronde 8, besluit #66: de zachte vormregel. De gebruiker ging akkoord met het voorstel voor de regel "een ontworpen
// buitendoos is niet hoger dan breed":
// 1. een doos die hoger is dan breed (met meer dan één laag binnendozen) wint alleen als die minstens 10% meer
//    binnendozen per drager geeft dan de beste doos die niet hoger is dan breed, net als de kantelregel;
// 2. nooit hoger dan 2 × de breedte; één laag binnendozen mag altijd, zoals nu;
// 3. wint een doos die hoger is dan breed, dan staat de beste doos die niet hoger is dan breed als vaste kaart in de top
//    drie, zodat de gebruiker per geval plat kan kiezen.
// De vergelijking in punt 1 is die met de platte voorkeursoptie: de oplossing die de rangschikking kiest uit alleen de
// dozen die niet hoger zijn dan breed, dus de uitkomst van "niet hoger dan de breedte". Daarna volgt de kantelregel zoals altijd.

import { describe, expect, it } from 'vitest';
import { bereken, valideer } from '../src/engine/bereken';
import { ontwerpKandidaten, STANDAARD_VORMFACTOR } from '../src/engine/kandidaten';
import { hoofdmaat, rangschik } from '../src/engine/rangschikking';
import { kopieDrager, STANDAARD_DRAGERS, standaardInvoer } from '../src/engine/standaard';
import type { Buitendoos, Invoer, Oplossing } from '../src/engine/types';
import { INSTELLINGEN_VERSIE, metStandaard, STANDAARD_INSTELLINGEN, type Instellingen } from '../src/data/opslag';
import { leegFormulier, naarInvoer } from '../src/ui/formulier';

const EPS = 1e-6;

/** Ontwerp met de standaarden van de app: min. 2 per doos en per laag, 23 kg, 2 artikelen per binnendoos, europallet. */
function ontwerp(L: number, B: number, H: number, gewicht: number, extra: Partial<Invoer> = {}): Invoer {
  const i = standaardInvoer();
  i.artikelcode = 'R8';
  i.artikelenPerBinnendoos = 2;
  i.minBinnendozenPerDoos = 2;
  i.minBuitendozenPerLaag = 2;
  i.vormregel = 'zacht';
  i.binnendoos = { L, B, H, gewicht, kantelbaar: false, magVerticaal: { L: false, B: false } };
  return { ...i, ...extra };
}

const maat = (d: Pick<Buitendoos, 'L' | 'B' | 'H'>) => `${d.L}x${d.B}x${d.H}`;
const indeling = (d: Buitendoos) => `${d.indeling!.nL}x${d.indeling!.nB}x${d.indeling!.nH}`;
/** Valt de doos onder de uitzondering: één laag rechtopstaande binnendozen. */
const eenLaagRechtop = (d: Buitendoos) => d.indeling!.nH === 1 && d.indeling!.stand.verticaal === 'H';

/** Artikel 1047492: binnendoos 200 × 200 × 75 mm, hier 1 kg. */
const artikel1047492 = (extra: Partial<Invoer> = {}) => ontwerp(200, 200, 75, 1, extra);

describe('vormregel zacht: kandidaten', () => {
  it('een doos mag hoger zijn dan breed, tot 2 × de breedte; zo’n doos heet hoog', () => {
    const { kandidaten, afgewezen } = ontwerpKandidaten(artikel1047492());
    expect(STANDAARD_VORMFACTOR).toBe(2);
    for (const d of kandidaten) {
      if (!eenLaagRechtop(d)) expect(d.H).toBeLessThanOrEqual(2 * d.B + EPS);
      expect(!!d.hoog).toBe(!eenLaagRechtop(d) && d.H > d.B + EPS);
    }
    // 3 × 1 × 3 (hoogte gedeeld door breedte 1,18) is een hoge kandidaat; 3 × 1 × 6 (2,23) valt af op de vormregel.
    const drieHoog = kandidaten.find((d) => maat(d) === '614x214x253');
    expect(drieHoog && indeling(drieHoog)).toBe('3x1x3');
    expect(drieHoog!.hoog).toBe(true);
    expect(kandidaten.some((d) => maat(d) === '614x214x478')).toBe(false);
    expect(afgewezen.vorm).toBeGreaterThan(0);
    expect(ontwerpKandidaten(artikel1047492({ vormregel: 'uit' })).kandidaten.some((d) => maat(d) === '614x214x478')).toBe(true);
    // Bij de andere vormregels is geen enkele doos hoog.
    for (const vormregel of ['breedte', 'lengte', 'uit'] as const) expect(ontwerpKandidaten(artikel1047492({ vormregel })).kandidaten.some((d) => d.hoog)).toBe(false);
  });

  it('de max. hoogte (× de breedte) is in te stellen', () => {
    const anderhalf = ontwerpKandidaten(artikel1047492({ vormFactor: 1.5 })).kandidaten;
    for (const d of anderhalf) if (!eenLaagRechtop(d)) expect(d.H).toBeLessThanOrEqual(1.5 * d.B + EPS);
    expect(anderhalf.some((d) => d.hoog)).toBe(true);
    expect(ontwerpKandidaten(artikel1047492({ vormFactor: 2.5 })).kandidaten.find((d) => maat(d) === '614x214x478')?.hoog).toBe(true);
    // Met factor 1 zijn het precies de dozen van "niet hoger dan de breedte", zonder hoge doos.
    const een = ontwerpKandidaten(artikel1047492({ vormFactor: 1 })).kandidaten;
    const breedte = ontwerpKandidaten(artikel1047492({ vormregel: 'breedte' })).kandidaten;
    expect(een.map(maat).sort()).toEqual(breedte.map(maat).sort());
    expect(een.some((d) => d.hoog)).toBe(false);
  });

  it('één laag binnendozen mag altijd, ook boven 2 × de breedte, en is dan niet hoog', () => {
    const { kandidaten } = ontwerpKandidaten(ontwerp(60, 40, 120, 0.15, { minBinnendozenPerDoos: 1 }));
    const smal = kandidaten.find((d) => maat(d) === '74x54x148');
    expect(smal && indeling(smal)).toBe('1x1x1');
    expect(smal!.H / smal!.B).toBeGreaterThan(2);
    expect(smal!.hoog).toBeUndefined();
  });

  it('een gekantelde stand die hoger is dan rechtop valt niet onder de uitzondering, ook niet met één laag', () => {
    const i = ontwerp(400, 200, 30, 0.2);
    i.binnendoos!.kantelbaar = true;
    i.binnendoos!.magVerticaal = { L: true, B: true };
    const { kandidaten } = ontwerpKandidaten(i);
    for (const d of kandidaten) if (!eenLaagRechtop(d)) expect(d.H).toBeLessThanOrEqual(2 * d.B + EPS);
    expect(kandidaten.some((d) => d.indeling!.nH === 1 && d.gekanteld && d.hoog)).toBe(true);
  });
});

describe('vormregel zacht: rangschikking en top drie', () => {
  it('artikel 1047492, 1 kg: de doos blijft 614 × 214 × 178 mm met 300 binnendozen; hoger geeft maar 5% meer', () => {
    const r = bereken(artikel1047492());
    const w = r.top[0].oplossing;
    expect([maat(w.doos), indeling(w.doos), hoofdmaat(w)]).toEqual(['614x214x178', '3x1x2', 300]);
    expect(w.doos.hoog).toBeUndefined();
    expect(r.top[0].uitleg).toContain(
      'Hogere doos (hoger dan breed) geeft 315 tegen 300 binnendozen met een doos die niet hoger is dan breed; minder dan 10% meer, dus niet hoger dan breed.',
    );
    // Geen vaste kaart voor een platte doos nodig: de winnaar is al plat. De hogere dozen staan als alternatief erbij.
    expect(r.top.map((t) => t.rol)).not.toContain('nietHoog');
    expect(r.top.length).toBeLessThanOrEqual(3);
    const alternatief = r.top.find((t) => t.rol === 'alternatief' && t.oplossing.doos.hoog);
    expect(alternatief?.uitleg[0]).toMatch(/^Alternatief: 315 binnendozen per drager, 5% meer dan de voorkeursoptie \((recht|verband), hoger dan breed\)\.$/);
    // Dezelfde winnaar als bij "niet hoger dan de breedte"; zonder vormregel wint 3 × 1 × 6 (2,23 × de breedte) met 360.
    const breedte = bereken(artikel1047492({ vormregel: 'breedte' })).top[0].oplossing;
    expect([maat(breedte.doos), breedte.stapelwijze, hoofdmaat(breedte)]).toEqual([maat(w.doos), w.stapelwijze, 300]);
    const uit = bereken(artikel1047492({ vormregel: 'uit' })).top[0].oplossing;
    expect([maat(uit.doos), indeling(uit.doos), hoofdmaat(uit)]).toEqual(['614x214x478', '3x1x6', 360]);
  });

  it('artikel 1047492 met max. 2,5 × de breedte: de hoge doos geeft 20% meer en wint', () => {
    const r = bereken(artikel1047492({ vormFactor: 2.5 }));
    const w = r.top[0].oplossing;
    expect([maat(w.doos), hoofdmaat(w), w.doos.hoog]).toEqual(['614x214x478', 360, true]);
    expect(r.top[0].uitleg[0]).toBe(
      'Hogere doos (hoger dan breed) geeft 360 tegen 300 binnendozen met een doos die niet hoger is dan breed (+20%, minstens 10%), dus hoger dan breed.',
    );
    expect(r.top.find((t) => t.rol === 'nietHoog')?.oplossing.doos.H).toBe(178);
  });

  it('binnendoos 400 × 250 × 150 mm, 5 kg: de hoge doos geeft 40% meer; de beste platte doos staat als vaste kaart erbij', () => {
    const r = bereken(ontwerp(400, 250, 150, 5));
    const w = r.top[0].oplossing;
    expect([maat(w.doos), indeling(w.doos), hoofdmaat(w), w.doos.hoog]).toEqual(['414x264x478', '1x1x3', 84, true]);
    expect(w.doos.H / w.doos.B).toBeCloseTo(1.81, 2);
    expect(r.top[0].uitleg[0]).toBe(
      'Hogere doos (hoger dan breed) geeft 84 tegen 60 binnendozen met een doos die niet hoger is dan breed (+40%, minstens 10%), dus hoger dan breed.',
    );
    expect(r.top.length).toBeLessThanOrEqual(3);
    const plat = r.top.find((t) => t.rol === 'nietHoog')!;
    expect(r.top.indexOf(plat)).toBe(1);
    expect([maat(plat.oplossing.doos), plat.oplossing.stapelwijze, hoofdmaat(plat.oplossing), plat.oplossing.doos.hoog]).toEqual(['764x414x178', 'verband', 60, undefined]);
    expect(plat.uitleg).toEqual(['Beste oplossing met een doos die niet hoger is dan breed: 60 binnendozen per drager, 28,6% minder dan de voorkeursoptie (verband).']);
    // Die kaart is de winnaar van "niet hoger dan de breedte". Dat het verband is, komt doordat de verbandzoektocht hoge
    // en platte dozen apart houdt: anders sloeg de app het verband van 764 × 414 mm over, omdat de hoge doos meer geeft.
    const breedte = bereken(ontwerp(400, 250, 150, 5, { vormregel: 'breedte' })).top[0].oplossing;
    expect([maat(breedte.doos), breedte.stapelwijze, hoofdmaat(breedte)]).toEqual(['764x414x178', 'verband', 60]);
    // Zonder vormregel wint 1 × 1 × 4 (2,38 × de breedte) met ook 84; de max. hoogte houdt het bij 1 × 1 × 3.
    const uit = bereken(ontwerp(400, 250, 150, 5, { vormregel: 'uit' })).top[0].oplossing;
    expect([maat(uit.doos), indeling(uit.doos), hoofdmaat(uit)]).toEqual(['414x264x628', '1x1x4', 84]);
  });

  it('nooit minder dan "niet hoger dan de breedte", en een hoge winnaar geeft altijd minstens 10% meer dan die uitkomst', () => {
    const invoer: [number, number, number, number][] = [
      [200, 200, 75, 1],
      [400, 250, 150, 5],
      [150, 100, 150, 0.5],
      [200, 150, 100, 0.5],
      [250, 150, 50, 0.5],
      [400, 150, 100, 0.5],
      [300, 200, 150, 2],
      [100, 100, 50, 0.3],
    ];
    let hoogGewonnen = 0;
    for (const [L, B, H, g] of invoer) {
      const zacht = bereken(ontwerp(L, B, H, g));
      const breedte = bereken(ontwerp(L, B, H, g, { vormregel: 'breedte' })).top[0].oplossing;
      const w = zacht.top[0].oplossing;
      expect(hoofdmaat(w)).toBeGreaterThanOrEqual(hoofdmaat(breedte));
      if (w.doos.hoog) {
        hoogGewonnen++;
        // De drempel vergelijkt met de platte voorkeursoptie, de uitkomst van "niet hoger dan de breedte".
        expect(hoofdmaat(w) * 10).toBeGreaterThanOrEqual(hoofdmaat(breedte) * 11);
        // Die uitkomst staat in de top drie: als vaste kaart "niet hoger dan breed", of al als beste verband.
        const kaart = zacht.top.find((t) => !t.oplossing.doos.hoog)!.oplossing;
        expect([maat(kaart.doos), kaart.stapelwijze, hoofdmaat(kaart)]).toEqual([maat(breedte.doos), breedte.stapelwijze, hoofdmaat(breedte)]);
      } else expect([maat(w.doos), w.stapelwijze, hoofdmaat(w)]).toEqual([maat(breedte.doos), breedte.stapelwijze, hoofdmaat(breedte)]);
      for (const t of zacht.top) if (!eenLaagRechtop(t.oplossing.doos)) expect(t.oplossing.doos.H).toBeLessThanOrEqual(2 * t.oplossing.doos.B + EPS);
    }
    expect(hoogGewonnen).toBeGreaterThan(0);
  });

  describe('drempel van 10% (rangschikking met vaste aantallen)', () => {
    const basis = bereken(ontwerp(100, 100, 50, 0.3, { vormregel: 'uit' })).top[0].oplossing;
    const i = ontwerp(100, 100, 50, 0.3);
    /** Een oplossing met een vast aantal per drager; hoog en gekanteld naar keuze. */
    const opl = (
      L: number,
      B: number,
      H: number,
      perDrager: number,
      soort: { hoog?: boolean; gekanteld?: boolean; perDoos?: number; verband?: boolean; module?: string } = {},
    ): Oplossing => ({
      ...basis,
      id: `${L}x${B}x${H}-${perDrager}`,
      stapelwijze: soort.verband ? 'verband' : 'recht',
      binnendozenPerDrager: perDrager,
      moduleAfstand: soort.module ? 0 : 50,
      doos: { ...basis.doos, L, B, H, binnendozenPerDoos: soort.perDoos ?? 4, gekanteld: !!soort.gekanteld, module: soort.module ?? null, ...(soort.hoog ? { hoog: true } : {}) },
    });

    it('9% meer: de platte doos wint, met uitleg', () => {
      const plat = opl(814, 414, 278, 100);
      const hoog = opl(414, 214, 428, 109, { hoog: true });
      const r = rangschik([hoog, plat], i);
      expect(r.top[0].oplossing.id).toBe(plat.id);
      expect(r.top[0].uitleg).toContain(
        'Hogere doos (hoger dan breed) geeft 109 tegen 100 binnendozen met een doos die niet hoger is dan breed; minder dan 10% meer, dus niet hoger dan breed.',
      );
      expect(r.top.map((t) => t.rol)).toEqual(['winnaar', 'alternatief']);
    });

    it('precies 10% meer: de hoge doos wint, met de platte doos als vaste kaart', () => {
      const plat = opl(814, 414, 278, 100);
      const hoog = opl(414, 214, 428, 110, { hoog: true });
      const r = rangschik([plat, hoog], i);
      expect(r.top[0].oplossing.id).toBe(hoog.id);
      expect(r.top[0].uitleg[0]).toBe(
        'Hogere doos (hoger dan breed) geeft 110 tegen 100 binnendozen met een doos die niet hoger is dan breed (+10%, minstens 10%), dus hoger dan breed.',
      );
      expect(r.top[1]).toMatchObject({ rol: 'nietHoog', oplossing: { id: plat.id } });
    });

    it('evenveel: de hoge doos wint nooit, ook niet met meer binnendozen per doos', () => {
      const plat = opl(814, 414, 278, 100);
      const hoog = opl(414, 214, 428, 100, { hoog: true, perDoos: 8 });
      const r = rangschik([hoog, plat], i);
      expect(r.top[0].oplossing.id).toBe(plat.id);
      // Geeft de hoge doos niet meer, dan is er niets uit te leggen.
      expect(r.top[0].uitleg.join(' ')).not.toContain('Hogere doos');
      // Zonder de drempel zou de hogere doos winnen: meer binnendozen per doos gaat vóór de vorm.
      expect(rangschik([{ ...hoog, doos: { ...hoog.doos, hoog: undefined } }, plat], i).top[0].oplossing.id).toBe(hoog.id);
    });

    it('de platte vergelijking volgt de kantelregel: een hoge doos wint niet van een gekantelde platte doos met bijna evenveel', () => {
      // Rechtop plat 100, rechtop hoog 115, gekanteld plat 120: "niet hoger dan de breedte" geeft 120 (gekanteld, +20%).
      // De hoge doos geeft daar minder dan 10% meer dan; de gekantelde platte doos wint.
      const rechtop = opl(814, 414, 278, 100);
      const hoog = opl(414, 214, 428, 115, { hoog: true });
      const gekanteld = opl(764, 514, 278, 120, { gekanteld: true });
      expect(rangschik([rechtop, hoog, gekanteld], i).top[0].oplossing.id).toBe(gekanteld.id);
      // Evenveel als de gekantelde platte doos: niet hoger dan breed.
      expect(rangschik([rechtop, opl(414, 214, 428, 120, { hoog: true }), gekanteld], i).top[0].oplossing.id).toBe(gekanteld.id);
    });

    it('een gekantelde platte doos die de kantelregel niet haalt, houdt een hoge doos niet tegen', () => {
      // Rechtop plat 100, gekanteld plat 105 (minder dan 10% meer, dus niet gekanteld), rechtop hoog 112: hoog wint (+12%).
      const rechtop = opl(814, 414, 278, 100);
      const gekanteld = opl(764, 514, 278, 105, { gekanteld: true });
      const hoog = opl(414, 214, 428, 112, { hoog: true });
      const r = rangschik([gekanteld, rechtop, hoog], i);
      expect(r.top[0].oplossing.id).toBe(hoog.id);
      expect(r.top[0].uitleg[0]).toBe(
        'Hogere doos (hoger dan breed) geeft 112 tegen 100 binnendozen met een doos die niet hoger is dan breed (+12%, minstens 10%), dus hoger dan breed.',
      );
      // De vaste kaart is de platte voorkeursoptie: rechtop 100, want gekanteld 105 haalt de kantelregel niet.
      expect(r.top.find((t) => t.rol === 'nietHoog')?.oplossing.id).toBe(rechtop.id);
    });

    it('hoogstens drie kaarten: de kaart voor de platte doos gaat voor een gewoon alternatief', () => {
      const lijst = [opl(414, 214, 428, 130, { hoog: true }), opl(414, 214, 378, 125, { hoog: true }), opl(414, 214, 328, 120, { hoog: true }), opl(814, 414, 278, 100)];
      const r = rangschik(lijst, i);
      expect(r.top.map((t) => t.rol)).toEqual(['winnaar', 'nietHoog', 'alternatief']);
    });

    it('drie vaste kaarten: de platte voorkeursoptie neemt de plaats in van een kaart waarvan ze de rol overneemt', () => {
      // Winnaar gekanteld en hoog, recht; beste verband ook gekanteld en hoog; beste niet-gekantelde doos hoog.
      const winnaar = opl(764, 214, 428, 130, { hoog: true, gekanteld: true });
      const verband = opl(614, 214, 428, 120, { hoog: true, gekanteld: true, verband: true });
      const rechtopHoog = opl(414, 214, 378, 110, { hoog: true });
      const plat = opl(814, 414, 278, 100, { verband: true });
      const r = rangschik([plat, rechtopHoog, verband, winnaar], i);
      expect(r.top.map((t) => [t.rol, t.oplossing.id])).toEqual([
        ['winnaar', winnaar.id],
        ['verband', verband.id],
        ['nietHoog', plat.id],
      ]);
      // Is de beste niet-gekantelde doos zelf plat, dan blijft die kaart staan: er staat dan al een platte doos in de top drie.
      const rechtopPlat = opl(814, 414, 278, 105);
      const gekanteldPlat = opl(764, 514, 278, 118, { gekanteld: true });
      const r2 = rangschik(
        [rechtopPlat, gekanteldPlat, opl(764, 214, 428, 140, { hoog: true, gekanteld: true }), opl(614, 214, 428, 125, { hoog: true, gekanteld: true, verband: true })],
        i,
      );
      expect(r2.top.map((t) => [t.rol, t.oplossing.id])).toEqual([
        ['winnaar', '764x214x428-140'],
        ['verband', '614x214x428-125'],
        ['nietGekanteld', rechtopPlat.id],
      ]);
      // Is de platte voorkeursoptie zelf niet gekanteld, dan neemt ze de plaats in van "niet gekanteld", ook als die doos
      // plat is: er blijft dan een niet-gekantelde oplossing in de top drie (#33).
      // Plat: verband 100 wint van recht 105 (minder dan 10% meer); de beste niet-gekantelde doos is dus recht 105.
      const vlak = opl(814, 414, 278, 100, { verband: true });
      const vlakRecht = opl(1014, 314, 278, 105);
      const r3 = rangschik([vlakRecht, vlak, opl(764, 214, 428, 130, { hoog: true, gekanteld: true }), opl(614, 214, 428, 115, { hoog: true, gekanteld: true, verband: true })], i);
      expect(r3.top.map((t) => [t.rol, t.oplossing.id])).toEqual([
        ['winnaar', '764x214x428-130'],
        ['verband', '614x214x428-115'],
        ['nietHoog', vlak.id],
      ]);
      // Gekanteld en recht, en beide kaarten hoog: dan neemt ze de plaats in van "beste verband".
      const r4 = rangschik([rechtopHoog, opl(814, 414, 278, 90), opl(764, 514, 278, 100, { gekanteld: true }), verband, winnaar], i);
      expect(r4.top.map((t) => [t.rol, t.oplossing.id])).toEqual([
        ['winnaar', winnaar.id],
        ['nietHoog', '764x514x278-100'],
        ['nietGekanteld', rechtopHoog.id],
      ]);
    });

    it('haalt een hoge doos de drempel maar wint ze niet, dan is de uitkomst precies die van "niet hoger dan de breedte"', () => {
      // Plat: rechtop 100, rechtop collimodule 90, gekanteld 150, gekanteld collimodule 115. Breedte kiest 115: gekanteld
      // haalt de kantelregel, en daarbinnen gaat de collimodule voor. Een hoge doos rechtop met 127 haalt de drempel
      // (+10,4%), maar heeft geen collimodule. Zonder terugval tilde ze de lat voor kantelen naar 127, zodat de
      // collimodule-doos met 90 won: minder dan breedte.
      const R = opl(800, 400, 300, 100);
      const R2 = opl(400, 300, 300, 90, { module: '400 × 300' });
      const T1 = opl(810, 410, 300, 150, { gekanteld: true });
      const T2 = opl(600, 400, 300, 115, { gekanteld: true, module: '600 × 400' });
      const HR = opl(410, 210, 500, 127, { hoog: true });
      const breedte = rangschik([R, R2, T1, T2], i);
      const zacht = rangschik([R, R2, T1, T2, HR], i);
      expect(breedte.top[0].oplossing.id).toBe(T2.id);
      expect(zacht.top[0].oplossing.id).toBe(T2.id);
      expect(zacht.top[0].uitleg[0]).toBe(
        'Hogere doos (hoger dan breed) geeft 127 tegen 115 binnendozen met een doos die niet hoger is dan breed (+10,4%), maar zonder collimodule; een collimodule-doos gaat voor, dus niet hoger dan breed.',
      );
      expect(zacht.top[0].uitleg.slice(1)).toEqual(
        breedte.top[0].uitleg.map((z) => z.replace(' binnendozen rechtop ', ' binnendozen rechtop met een doos die niet hoger is dan breed ')),
      );
      // Zonder de rechtopstaande collimodule-doos valt de hoge doos af door de kantelregel (gekanteld 150 geeft minstens
      // 10% meer); ook dan is de uitkomst die van breedte.
      const zacht2 = rangschik([R, T1, T2, HR], i);
      expect(zacht2.top[0].oplossing.id).toBe(rangschik([R, T1, T2], i).top[0].oplossing.id);
      expect(zacht2.top[0].uitleg[0]).toContain('maar valt af door de kantelregel, dus niet hoger dan breed.');
    });
  });
});

describe('instellingen en invoer', () => {
  it('de standaard is zacht met hoogstens 2 × de breedte', () => {
    expect(STANDAARD_INSTELLINGEN.vormregel).toBe('zacht');
    expect(STANDAARD_INSTELLINGEN.vormFactor).toBe(2);
    expect(INSTELLINGEN_VERSIE).toBe(3);
  });

  it('oude instellingen met de oude standaard breedte gaan eenmalig naar zacht; lengte en uit blijven', () => {
    expect(metStandaard({ vormregel: 'breedte', versie: 2 })).toMatchObject({ vormregel: 'zacht', vormFactor: 2, versie: 3 });
    expect(metStandaard({ vormregel: 'lengte', versie: 2 })).toMatchObject({ vormregel: 'lengte', vormFactor: 2, versie: 3 });
    expect(metStandaard({ vormregel: 'uit', versie: 2 })).toMatchObject({ vormregel: 'uit', versie: 3 });
    // Na de bijwerking is breedte een eigen keuze: die blijft staan.
    expect(metStandaard({ vormregel: 'breedte', versie: 3 }).vormregel).toBe('breedte');
    expect(metStandaard({ vormregel: 'zacht', vormFactor: 1.5, versie: 3 })).toMatchObject({ vormregel: 'zacht', vormFactor: 1.5 });
    // De bijwerking van versie 2 werkt nog: minimumaantallen 1 worden 2.
    expect(metStandaard({ vormregel: 'breedte', minBinnendozenPerDoos: 1, minBuitendozenPerLaag: 1 })).toMatchObject({
      vormregel: 'zacht',
      minBinnendozenPerDoos: 2,
      minBuitendozenPerLaag: 2,
      versie: 3,
    });
  });

  it('het formulier geeft vormregel en max. hoogte door; de max. hoogte alleen bij zacht', () => {
    const dragers = STANDAARD_DRAGERS.map(kopieDrager);
    const f = {
      ...leegFormulier(STANDAARD_INSTELLINGEN, dragers),
      artikelcode: 'X',
      bd: { L: '200', B: '200', H: '75', gewicht: '1', kantelbaar: false, magL: false, magB: false },
    };
    expect(naarInvoer(f, dragers, STANDAARD_INSTELLINGEN)).toMatchObject({ vormregel: 'zacht', vormFactor: 2 });
    const anders: Instellingen = { ...STANDAARD_INSTELLINGEN, vormFactor: 1.5 };
    expect(naarInvoer(f, dragers, anders).vormFactor).toBe(1.5);
    const breedte = naarInvoer(f, dragers, { ...STANDAARD_INSTELLINGEN, vormregel: 'breedte' });
    expect(breedte.vormregel).toBe('breedte');
    expect(breedte.vormFactor).toBeUndefined();
  });
});

describe('controle en melding', () => {
  it('de max. hoogte moet een getal van minstens 1 zijn', () => {
    const fout = 'De max. hoogte van de vormregel moet een getal van minstens 1 × de breedte zijn.';
    for (const vormFactor of [0.5, 0, -2, Number.NaN, Number.POSITIVE_INFINITY]) expect(valideer(artikel1047492({ vormFactor }))).toContain(fout);
    for (const vormFactor of [1, 2, 2.5, undefined]) expect(valideer(artikel1047492({ vormFactor }))).toEqual([]);
    expect(valideer(artikel1047492({ vormregel: 'zacht' }))).toEqual([]);
  });

  it('streept de vormregel alle dozen weg, dan noemt de melding de max. hoogte', () => {
    // Min. hoogte 500 vraagt minstens 5 lagen; max. breedte 200 maakt elke doos dan meer dan 2,5 × zo hoog als breed.
    const grenzen = { minBuitenmaat: { H: 500 }, maxBuitenmaat: { B: 200 } };
    const r = bereken(ontwerp(150, 100, 100, 0.5, grenzen));
    expect(r.oplossingen).toHaveLength(0);
    expect(r.geenOplossing.join(' ')).toContain('Geen buitendoos voldoet aan de vormregel (niet hoger dan 2 × de breedte, behalve bij één laag binnendozen).');
    expect(bereken(ontwerp(150, 100, 100, 0.5, { ...grenzen, vormFactor: 2.5 })).geenOplossing.join(' ')).toContain('niet hoger dan 2,5 × de breedte');
    expect(bereken(ontwerp(150, 100, 100, 0.5, { ...grenzen, vormregel: 'breedte' })).geenOplossing.join(' ')).toContain('niet hoger dan de breedte');
  });
});

describe('vormregel zacht: precies "niet hoger dan de breedte", tenzij een hoge doos wint', () => {
  const kantelbaar = (L: number, B: number, H: number, g: number, extra: Partial<Invoer> = {}) =>
    ontwerp(L, B, H, g, { ...extra, binnendoos: { L, B, H, gewicht: g, kantelbaar: true, magVerticaal: { L: true, B: true } } });
  const id = (o: Oplossing) => [o.id, hoofdmaat(o)];

  it('de platte oplossingen zijn precies die van breedte, ook met een kleine zoeklimiet', () => {
    const gevallen: Invoer[] = [
      ontwerp(400, 250, 150, 5),
      ontwerp(80, 40, 80, 0.1, { zoeklimiet: 50 }),
      ontwerp(100, 40, 50, 0.1, { zoeklimiet: 50 }),
      kantelbaar(180, 130, 220, 3),
      kantelbaar(193, 93, 127, 0.3, { drager: { ...kopieDrager(STANDAARD_DRAGERS[0]), maxTotaleHoogte: 1500 } }),
    ];
    for (const g of gevallen) {
      const zacht = bereken(g).oplossingen.filter((o) => !o.doos.hoog);
      const breedte = bereken({ ...g, vormregel: 'breedte' }).oplossingen;
      expect(zacht.map(id).sort()).toEqual(breedte.map(id).sort());
    }
  });

  it('met een kleine zoeklimiet geeft zacht niet minder dan breedte', () => {
    // Bij zoeklimiet 50 zocht zacht eerder minder platte voetafdrukken dan breedte, omdat hoge dozen voorgingen.
    for (const [L, B, H] of [
      [80, 40, 80],
      [100, 40, 50],
      [100, 80, 80],
    ]) {
      const zacht = bereken(ontwerp(L, B, H, 0.1, { zoeklimiet: 50 })).top;
      const breedte = bereken(ontwerp(L, B, H, 0.1, { zoeklimiet: 50, vormregel: 'breedte' })).top[0].oplossing;
      expect(hoofdmaat(zacht[0].oplossing)).toBeGreaterThanOrEqual(hoofdmaat(breedte));
      if (!zacht[0].oplossing.doos.hoog) expect(id(zacht[0].oplossing)).toEqual(id(breedte));
    }
  });

  it('een hoge doos zonder collimodule die de drempel haalt, maakt de uitkomst niet slechter (europallet tot 1500 mm)', () => {
    const drager = { ...kopieDrager(STANDAARD_DRAGERS[0]), maxTotaleHoogte: 1500 };
    const zacht = bereken(kantelbaar(193, 93, 127, 0.3, { drager }));
    const breedte = bereken(kantelbaar(193, 93, 127, 0.3, { drager, vormregel: 'breedte' })).top[0].oplossing;
    expect(id(zacht.top[0].oplossing)).toEqual(id(breedte));
    expect(hoofdmaat(breedte)).toBe(432);
    expect(zacht.top[0].uitleg[0]).toBe(
      'Hogere doos (hoger dan breed) geeft 480 tegen 432 binnendozen met een doos die niet hoger is dan breed (+11,1%), maar zonder collimodule; een collimodule-doos gaat voor, dus niet hoger dan breed.',
    );
  });

  it('de uitleg zegt waarom er geen verband meer meedoet als een hoge doos recht wint', () => {
    const r = bereken(ontwerp(250, 80, 200, 0.3));
    const w = r.top[0];
    expect(w.oplossing.doos.hoog && w.oplossing.stapelwijze).toBe('recht');
    expect(w.uitleg).toContain('Verband met een doos die hoger is dan breed geeft geen 10% meer dan de platte voorkeursoptie; de lading staat recht.');
    expect(w.uitleg.join(' ')).not.toContain('Geen geldig verband gevonden');
    expect(r.top.some((t) => t.oplossing.stapelwijze === 'verband')).toBe(true);
    // Haalt verband met een hoge doos de drempel wel, maar niet de kantelregel, dan zegt de uitleg dat.
    expect(bereken(kantelbaar(280, 230, 40, 0.3)).top[0].uitleg).toContain('Verband met een doos die hoger is dan breed valt af door de kantelregel; de lading staat recht.');
  });

  it('kantelbaar, winnaar hoog en gekanteld: de platte voorkeursoptie staat in de top drie, naast een niet-gekantelde doos', () => {
    const zacht = bereken(kantelbaar(180, 130, 220, 3));
    const breedte = bereken(kantelbaar(180, 130, 220, 3, { vormregel: 'breedte' })).top[0].oplossing;
    expect(zacht.top[0].oplossing.doos.hoog).toBe(true);
    expect(zacht.top[0].oplossing.doos.gekanteld).toBe(true);
    const kaart = zacht.top.find((t) => t.rol === 'nietHoog')!;
    expect(id(kaart.oplossing)).toEqual(id(breedte));
    expect(zacht.top.map((t) => t.rol)).toEqual(['winnaar', 'verband', 'nietHoog']);
    expect(zacht.top.some((t) => !t.oplossing.doos.gekanteld)).toBe(true);
  });

  it('de kantelzin zegt "rechtop met een doos die niet hoger is dan breed" als een hoge rechtopstaande doos meer geeft', () => {
    const a = bereken(kantelbaar(400, 250, 150, 5));
    expect(a.top[0].uitleg[0]).toBe('Gekantelde binnendoos geeft 84 tegen 60 binnendozen rechtop met een doos die niet hoger is dan breed (+40%, minstens 10%), dus gekanteld.');
    expect(a.top.find((t) => t.rol === 'nietGekanteld')?.oplossing.binnendozenPerDrager).toBe(84);
    const b = bereken(kantelbaar(400, 200, 30, 0.2));
    expect(b.top[0].uitleg[1]).toBe(
      'Gekantelde binnendoos geeft 594 tegen 378 binnendozen rechtop met een doos die niet hoger is dan breed (+57,1%, minstens 10%), dus gekanteld.',
    );
    // Bij breedte verandert de zin niet.
    expect(bereken(kantelbaar(400, 250, 150, 5, { vormregel: 'breedte' })).top[0].uitleg[0]).toBe(
      'Gekantelde binnendoos geeft 84 tegen 60 binnendozen rechtop (+40%, minstens 10%), dus gekanteld.',
    );
  });
});
