// Ladingtekening met hoekprofielen en stretchfolie (ronde 4, punt 9).

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { KLEUREN, ladingSvg } from '../src/draw/tekeningen';
import { mengKleur, proj } from '../src/draw/iso';
import { bereken } from '../src/engine/bereken';
import { EUROPALLET, standaardInvoer } from '../src/engine/standaard';
import type { Drager, Invoer, Laag, Oplossing, Rechthoek } from '../src/engine/types';

function raster(x0: number, y0: number, w: number, d: number, nx: number, ny: number): Rechthoek[] {
  const uit: Rechthoek[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) uit.push({ x: x0 + i * w, y: y0 + j * d, w, d });
  return uit;
}

function oplossing(doos: { L: number; B: number; H: number }, lagen: Laag[], volgorde: number[], tussenlaagNa: number[], totaleHoogte: number): Oplossing {
  const perLaag = lagen[0].dozen.length;
  return {
    id: 'vast',
    doos: { ...doos, binnenmaat: null, indeling: null, binnendozenPerDoos: null, eigenGewicht: null, kartonOppervlak: null, gevuldGewicht: 10, gekanteld: false, bestaand: true, module: null },
    stapelwijze: lagen.length > 1 ? 'verband' : 'recht',
    lagen,
    laagVolgorde: volgorde,
    aantalLagen: volgorde.length,
    buitendozenPerDrager: perLaag * volgorde.length,
    binnendozenPerDrager: null,
    artikelenPerDrager: null,
    tussenlaagNa,
    totaleHoogte,
    totaalGewicht: 500,
    overhang: { voor: 0, achter: 0, links: 0, rechts: 0 },
    omhullende: { breedte: 800, lengte: 1200 },
    moduleAfstand: null,
    laagBewezen: true,
  };
}

/** Vaste gevallen, onafhankelijk van de rekenmodule (die mag veranderen zonder dat deze tests breken). */
function gevallen(): { naam: string; o: Oplossing; invoer: Invoer }[] {
  const a = standaardInvoer();
  const oa = oplossing({ L: 400, B: 300, H: 250 }, [{ dozen: raster(0, 0, 400, 300, 2, 4) }], [0, 0, 0, 0], [], 144 + 4 * 250);

  // Overhang links/rechts/voor/achter, verband, tussenlaag op ladingmaat, bodem- en topvel.
  const b = standaardInvoer();
  b.drager.overhangToegestaan = true;
  b.drager.overhang = { voor: 10, achter: 30, links: 20, rechts: 20 };
  b.tussenlaag = { soort: 'karton', naElkeN: 2, dikte: 5, gewicht: 2, maat: 'lading' };
  b.materiaal.bodemvel.aan = true;
  b.materiaal.topvel.aan = true;
  const ob = oplossing(
    { L: 420, B: 310, H: 200 },
    [{ dozen: raster(-20, -10, 420, 310, 2, 4) }, { dozen: [...raster(-20, -10, 310, 420, 2, 3), ...raster(600, -10, 200, 310, 1, 4)] }],
    [0, 1, 0, 1],
    [2],
    144 + 3 + 4 * 200 + 5 + 3,
  );

  // Kar met een houten tussenlaag op dragermaat; de dozen staan 50 mm van de rand.
  const c = standaardInvoer();
  const kar: Drager = { ...EUROPALLET, id: 'kar', naam: 'Kar', type: 'kar', lengte: 1300, breedte: 700, hoogte: 150, overhang: { voor: 0, achter: 0, links: 0, rechts: 0 } };
  c.drager = kar;
  c.tussenlaag = { soort: 'hout', naElkeN: 1, dikte: 15, gewicht: 5, maat: 'drager' };
  const oc = oplossing({ L: 600, B: 400, H: 300 }, [{ dozen: raster(50, 50, 300, 600, 2, 2) }], [0, 0], [1], 150 + 2 * 300 + 15);
  return [
    { naam: 'recht', o: oa, invoer: a },
    { naam: 'overhang', o: ob, invoer: b },
    { naam: 'kar', o: oc, invoer: c },
  ];
}

/**
 * SHA-256 van ladingSvg vóór hoekprofielen en folie werden toegevoegd (gelijk voor nl en en). Staan beide
 * opties uit, dan moet de tekening byte voor byte gelijk blijven. Verandert de tekening bewust, dan deze
 * waarden opnieuw bepalen.
 */
const ORIGINEEL: Record<string, string> = {
  recht: 'a28a42efdf8989b4564729da1bf1c12521c79ccd2d51d9a77da9d986dca20d05',
  overhang: '2de7214694d9fcdf372822faa2b5fb47f545c183c8ec819786c528a022888e00',
  kar: 'c97bc3b78526405c29a73e802291d2dfa6562fbf702280a7323adfff6bd5eb49',
};

function met(i: Invoer, hoek: boolean, folie: boolean): Invoer {
  const j = structuredClone(i);
  j.materiaal.hoekprofielen.aan = hoek;
  j.materiaal.folie.aan = folie;
  return j;
}

/** Losse tekenelementen in volgorde (zonder het svg-omhulsel). */
function elementen(svg: string): string[] {
  return svg.match(/<(polygon|line|circle|path|rect)\b[^>]*\/>|<text\b[^>]*>[^<]*<\/text>/g) ?? [];
}

// Kleuren van de vlakken van een profiel (voor, rechts, boven), gemengd zoals blokSvg dat doet.
const profielTinten = [KLEUREN.hoekprofiel, mengKleur(KLEUREN.hoekprofiel, 0.78), mengKleur(KLEUREN.hoekprofiel, 1.25)];
const isProfiel = (e: string) => profielTinten.some((k) => e.includes(`fill="${k}"`));
const isFolie = (e: string) => e.includes('fill-opacity="0.3"');
const isWikkellijn = (e: string) => e.startsWith('<line') && e.includes('stroke-opacity');
const isLaag = (e: string) => [KLEUREN.laagA, KLEUREN.laagB].some((k) => e.includes(`fill="${k}"`));
const isMaat = (e: string) => e.includes('stroke-dasharray') || e.startsWith('<text') || e.startsWith('<circle');

function basisInvoer(): Invoer {
  const i = standaardInvoer();
  i.artikelcode = 'T';
  i.binnendoos = { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } };
  return i;
}

describe('ladingtekening: hoekprofielen en stretchfolie', () => {
  it('is byte voor byte gelijk aan de oorspronkelijke tekening als beide uit staan', () => {
    for (const g of gevallen()) {
      for (const taal of ['nl', 'en'] as const) {
        const svg = ladingSvg(g.o, met(g.invoer, false, false), taal);
        expect(createHash('sha256').update(svg).digest('hex'), `${g.naam} ${taal}`).toBe(ORIGINEEL[g.naam]);
      }
    }
  });

  it('voegt alleen elementen toe en laat de bestaande ongewijzigd en in dezelfde volgorde', () => {
    for (const g of gevallen()) {
      const uit = elementen(ladingSvg(g.o, met(g.invoer, false, false)));
      for (const [hoek, folie] of [
        [true, false],
        [false, true],
        [true, true],
      ]) {
        const aan = elementen(ladingSvg(g.o, met(g.invoer, hoek, folie)));
        let k = 0;
        for (const e of aan) if (k < uit.length && e === uit[k]) k++;
        expect(k, `${g.naam} hoek=${hoek} folie=${folie}`).toBe(uit.length);
        expect(aan.length).toBeGreaterThan(uit.length);
      }
    }
  });

  it('tekent hoekprofielen alleen als ze aan staan: één verborgen achter de lading, drie erover', () => {
    for (const g of gevallen()) {
      const uit = elementen(ladingSvg(g.o, met(g.invoer, false, true)));
      expect(uit.some(isProfiel), g.naam).toBe(false);
      const aan = elementen(ladingSvg(g.o, met(g.invoer, true, false)));
      const profielen = aan.map((e, i) => (isProfiel(e) ? i : -1)).filter((i) => i >= 0);
      const lagen = aan.map((e, i) => (isLaag(e) ? i : -1)).filter((i) => i >= 0);
      // Bovenkanten (L-vormig, 6 punten): vier profielen.
      const bovenkanten = aan.filter((e) => isProfiel(e) && e.match(/points="([^"]*)"/)![1].split(' ').length === 6);
      expect(bovenkanten.length, g.naam).toBe(4);
      // Er staat profiel vóór de eerste laag (verborgen, linksachter) en na de laatste (zichtbaar).
      expect(profielen[0]).toBeLessThan(lagen[0]);
      expect(profielen[profielen.length - 1]).toBeGreaterThan(lagen[lagen.length - 1]);
      // Geen folie zonder folie.
      expect(aan.some(isFolie) || aan.some(isWikkellijn)).toBe(false);
    }
  });

  it('tekent de folie alleen als hij aan staat: doorzichtig, na de lading en vóór de maatvoering', () => {
    for (const g of gevallen()) {
      const uit = elementen(ladingSvg(g.o, met(g.invoer, true, false)));
      expect(uit.some(isFolie) || uit.some(isWikkellijn), g.naam).toBe(false);
      const aan = elementen(ladingSvg(g.o, met(g.invoer, true, true)));
      const folie = aan.map((e, i) => (isFolie(e) ? i : -1)).filter((i) => i >= 0);
      expect(folie.length, g.naam).toBe(2); // voor- en rechterkant
      for (const i of folie) expect(aan[i]).toMatch(/^<polygon [^>]*fill="#[0-9a-fA-F]{6}"[^>]*stroke="#[0-9a-fA-F]{6}"/);
      expect(aan.some(isWikkellijn)).toBe(true);
      const laatsteDoos = Math.max(...aan.map((e, i) => (isLaag(e) || isProfiel(e) ? i : -1)));
      const eersteMaat = aan.findIndex(isMaat);
      expect(folie[0]).toBeGreaterThan(laatsteDoos);
      const laatsteFolie = Math.max(...aan.map((e, i) => (isFolie(e) || isWikkellijn(e) ? i : -1)));
      expect(laatsteFolie).toBeLessThan(eersteMaat);
      // svg2pdf.js: geen CSS-klassen, filters, verlopen of clipPaths.
      expect(ladingSvg(g.o, met(g.invoer, true, true))).not.toMatch(/class=|<filter|Gradient|clipPath|<style/);
    }
  });

  it('zet de hoekprofielen om de lading, ook bij overhang buiten de pallet', () => {
    const g = gevallen().find((x) => x.naam === 'overhang')!;
    const aan = elementen(ladingSvg(g.o, met(g.invoer, true, false)));
    const xs = aan
      .filter(isProfiel)
      .flatMap((e) => e.match(/points="([^"]*)"/)![1].split(' '))
      .map((p) => Number(p.split(',')[0]));
    // Linksvoor van de lading ligt op (−20, −10), 20 en 10 mm buiten de pallet; het profiel ligt daar net buiten.
    const hoek = proj(-20, -10, 0)[0];
    expect(Math.min(...xs)).toBeLessThan(hoek);
    expect(Math.min(...xs)).toBeGreaterThan(hoek - 40);
    // Rechtsachter op (820, 1230).
    const rechtsAchter = proj(820, 1230, 0)[0];
    expect(Math.max(...xs)).toBeGreaterThan(rechtsAchter);
    expect(Math.max(...xs)).toBeLessThan(rechtsAchter + 40);
  });

  it('geeft geen NaN of Infinity en is deterministisch, ook voor een berekende oplossing', () => {
    const r = bereken(basisInvoer());
    const lijst = [...gevallen(), { naam: 'berekend', o: r.top[0].oplossing, invoer: basisInvoer() }];
    for (const g of lijst)
      for (const [hoek, folie] of [
        [false, false],
        [true, false],
        [false, true],
        [true, true],
      ]) {
        const svg = ladingSvg(g.o, met(g.invoer, hoek, folie));
        expect(svg, `${g.naam} hoek=${hoek} folie=${folie}`).not.toMatch(/NaN|Infinity|undefined/);
        expect(ladingSvg(g.o, met(g.invoer, hoek, folie))).toBe(svg);
      }
  });

  it('slaat hoekprofielen en folie over als er geen lading is', () => {
    const g = gevallen()[0];
    const leeg = { ...g.o, aantalLagen: 0, laagVolgorde: [] };
    const svg = ladingSvg(leeg, met(g.invoer, true, true));
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(elementen(svg).some((e) => isProfiel(e) || isFolie(e))).toBe(false);
  });
});
