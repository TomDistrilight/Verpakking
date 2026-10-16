// Ronde 6. De gebruiker:
// "1
// Geef bij verband stapelen de voorkeur aan de lagen gespiegeld op elkaar stapelen.
//
// 2
// Wanneer er alleen een buitendoos is. Moet er de keuze zijn of deze gekanteld mag worden of niet."
//
// Punt 1 (#63): van de verbandparen kiest de app eerst het paar met de meeste dozen in laag A, dan de minste overhang, de
// minste torens en de meeste steun (tot de min. ondersteuning), dan een paar waarin laag B laag A gespiegeld is, en pas
// daarna het paar met de meeste dozen op twee of meer dozen. Gespiegeld kost dus nooit dozen, overhang, torens of steun.
// Punt 2 (#64): bij een bestaande buitendoos zonder binnendoos mag de buitendoos zelf kantelen, als dat is aangevinkt; de
// kantelregel (minstens 10% meer per drager) beslist.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
// svg2pdf.js heeft een browser nodig; voor de rijen van het rapport is het niet nodig.
vi.mock('svg2pdf.js', () => ({}));
import { bereken, valideer, verbandVenster, verbandVoorraad } from '../src/engine/bereken';
import { gekanteldWat } from '../src/engine/format';
import { bestaandeKandidaten, standenBestaand } from '../src/engine/kandidaten';
import { isVariant, omhullende, transformeer, zoekPatronen } from '../src/engine/laagpatroon';
import { plaats, zoekvlakken } from '../src/engine/plaatsing';
import { BLOKPALLET, EUROPALLET, STANDAARD_DRAGERS, kopieDrager, standaardInvoer } from '../src/engine/standaard';
import { beterVoorTweeLagen, inVerband, isGespiegeld, kleinsteSteun, steunendeDozen, torens, zoekVerband } from '../src/engine/verband';
import { STANDAARD_INSTELLINGEN } from '../src/data/opslag';
import { blokken } from '../src/pdf/rapport';
import { leegFormulier, naarInvoer, vanInvoer } from '../src/ui/formulier';
import { Berekenen } from '../src/ui/Berekenen';
import { Detail, Kaart } from '../src/ui/Resultaten';
// ---------------------------------------------------------------------------------------------------------------------
// Hulpmiddelen voor punt 1.
const TRANSFORMATIES = ['geen', 'spiegelY', 'spiegelX', 'draai180'];
/** Alle paren van varianten (patroon × transformatie, geplaatst op de drager), in de volgorde waarin zoekVerband ze bekijkt. */
function verbandParen(voorraad, drager, maxPatronen = 24) {
    const varianten = [];
    const gezien = new Set();
    for (const p of voorraad.slice(0, maxPatronen))
        for (const t of TRANSFORMATIES) {
            const g = plaats(transformeer(p, t), drager);
            if (!g)
                continue;
            const k = sleutel(g.dozen);
            if (gezien.has(k))
                continue;
            gezien.add(k);
            varianten.push(g);
        }
    const paren = [];
    for (let i = 0; i < varianten.length; i++)
        for (let j = 0; j < varianten.length; j++)
            if (i !== j && varianten[i].dozen.length >= varianten[j].dozen.length)
                paren.push([i, j]);
    const totaal = (p) => varianten[p[0]].dozen.length + varianten[p[1]].dozen.length;
    paren.sort((p, q) => totaal(q) - totaal(p) || p[0] - q[0] || p[1] - q[1]);
    return paren.map(([i, j]) => ({ a: varianten[i], b: varianten[j] }));
}
/** Dozen als vergelijkbare tekst, los van de volgorde. */
const sleutel = (dozen) => dozen
    .map((r) => `${r.x},${r.y},${r.w},${r.d}`)
    .sort()
    .join(';');
const paarSleutel = (p) => (p ? `${sleutel(p.a.dozen)} / ${sleutel(p.b.dozen)}` : 'geen');
const aantallen = (p) => (p ? [p.a.dozen.length, p.b.dozen.length] : null);
const gespiegeld = (p) => isGespiegeld(p.a.dozen, p.b.dozen);
/** Overhang van een paar: per zijde de grootste van beide lagen, opgeteld (zoals zoekVerband). */
const overhang = (p) => ['voor', 'achter', 'links', 'rechts'].reduce((s, k) => s + Math.max(p.a.overhang[k], p.b.overhang[k]), 0);
/** Alleen laag B op laag A (het eenzijdige paar, precies twee lagen). */
const maatBOpA = (p, minSteun = 0.75) => ({
    a: p.a.dozen.length,
    oh: overhang(p),
    torens: torens(p.b.dozen, p.a.dozen),
    steun: Math.min(minSteun, kleinsteSteun(p.b.dozen, p.a.dozen)),
    score: steunendeDozen(p.b.dozen, p.a.dozen),
});
/** B op A en A op B (tweezijdig verband). */
const maatBeide = (p, minSteun = 0.75) => {
    const m = maatBOpA(p, minSteun);
    return {
        ...m,
        torens: m.torens + torens(p.a.dozen, p.b.dozen),
        steun: Math.min(m.steun, kleinsteSteun(p.a.dozen, p.b.dozen)),
        score: m.score + steunendeDozen(p.a.dozen, p.b.dozen),
    };
};
const tekst = (m) => [m.oh, m.torens, Math.round(m.steun * 1000) / 1000, m.score];
/** De rangorde van vóór #63 (#60): zonder de stap "gespiegeld". */
function beterOud(n, b, metA = true) {
    if (metA && n.a !== b.a)
        return n.a > b.a;
    if (Math.abs(n.oh - b.oh) > 1e-6)
        return n.oh < b.oh;
    if (n.torens !== b.torens)
        return n.torens < b.torens;
    if (Math.abs(n.steun - b.steun) > 1e-9)
        return n.steun > b.steun;
    return n.score > b.score;
}
/** De keuze van vóór #63, opnieuw opgebouwd: hetzelfde totaal en dezelfde rangorde, maar zonder de stap "gespiegeld". */
function zoekVerbandOud(voorraad, drager, maxPatronen = 24, minSteun = 0.75) {
    let eenzijdig = null;
    let eenMaat = null;
    let eenTotaal = 0;
    let tweezijdig = null;
    let tweeMaat = null;
    let tweeTotaal = 0;
    for (const p of verbandParen(voorraad, drager, maxPatronen)) {
        const totaal = p.a.dozen.length + p.b.dozen.length;
        if (tweezijdig && totaal < tweeTotaal)
            break;
        if (!inVerband(p.b.dozen, p.a.dozen))
            continue;
        const een = maatBOpA(p, minSteun);
        if (!eenzijdig || (totaal === eenTotaal && beterOud(een, eenMaat))) {
            eenzijdig = p;
            eenMaat = een;
            eenTotaal = totaal;
        }
        if (!inVerband(p.a.dozen, p.b.dozen))
            continue;
        const twee = maatBeide(p, minSteun);
        if (!tweezijdig || beterOud(twee, tweeMaat)) {
            tweezijdig = p;
            tweeMaat = twee;
            tweeTotaal = totaal;
        }
    }
    return { tweezijdig, eenzijdig };
}
/**
 * Zoals bereken() bij één voetafdruk en minimaal één doos per laag: de voorraad van de zoekvlakken met het hoogste aantal
 * per laag samen, aflopend op aantal (zonder overhang vooraan), en de breedte van de verbandzoektocht. Zoals in bereken()
 * komen de varianten van het vijfblokspatroon bovenop de breedte (#65): de voorraad is al tot die breedte ingekort.
 */
function voorraadZoalsBereken(drager, L, B) {
    const resultaten = zoekvlakken(drager).map((v) => zoekPatronen(v.W, v.D, L, B));
    const max = Math.max(...resultaten.map((r) => r.max));
    const zoek = verbandVenster(verbandVoorraad(resultaten.filter((r) => r.max === max)), max);
    return { voorraad: zoek.map((p) => p.dozen), breedte: zoek.length };
}
const EURO = kopieDrager(EUROPALLET);
/** Stroken over de volle lengte van de europallet, zodat alleen de breedte telt; zonder gaten, van x 0 tot 800. */
const stroken = (breedtes) => breedtes.map((w, k) => ({ x: breedtes.slice(0, k).reduce((s, v) => s + v, 0), y: 0, w, d: 1200 }));
/** Stroken op opgegeven plekken [x, breedte], ook met gaten ertussen. */
const strokenOp = (xw) => xw.map(([x, w]) => ({ x, y: 0, w, d: 1200 }));
const geplaatst = (dozen, t = 'geen') => plaats(transformeer(dozen, t), EURO);
function bestaand(L, B, H, gevuld, qty, drager = kopieDrager(EUROPALLET)) {
    const i = standaardInvoer();
    i.instap = 'bestaandeBuitendoos';
    i.artikelcode = 'R6';
    i.binnendoos = undefined;
    i.bestaandeBuitendoos = { L, B, H, gevuldGewicht: gevuld, binnendozenPerDoos: qty };
    i.drager = drager;
    return i;
}
const verbandVan = (i, uitlijnen = true) => bereken(i, { uitlijnen }).top.find((t) => t.oplossing.stapelwijze === 'verband').oplossing;
const lagenSpiegeling = (o) => isGespiegeld(o.lagen[0].dozen, o.lagen[1].dozen);
// ---------------------------------------------------------------------------------------------------------------------
describe('punt 1: herkennen of laag B laag A gespiegeld is', () => {
    // Een laag zonder enige symmetrie: links een kolom van twee dozen, rechts vier dwarse dozen, alles tegen de voorkant.
    const a = [{ x: 0, y: 0, w: 249, d: 484 }, { x: 0, y: 484, w: 249, d: 484 }, ...[0, 1, 2, 3].map((k) => ({ x: 249, y: 249 * k, w: 484, d: 249 }))];
    const om = omhullende(a);
    const spiegelX = (r) => ({ ...r, x: 2 * om.x + om.w - r.x - r.w });
    const spiegelY = (r) => ({ ...r, y: 2 * om.y + om.d - r.y - r.d });
    it('links-rechts, voor-achter en beide (een halve slag gedraaid), los van de volgorde van de dozen', () => {
        expect(isGespiegeld(a, a.map(spiegelX))).toBe('x');
        expect(isGespiegeld(a, a.map(spiegelY))).toBe('y');
        expect(isGespiegeld(a, a.map((r) => spiegelX(spiegelY(r))))).toBe('xy');
        expect(isGespiegeld(a, a.map(spiegelX).reverse())).toBe('x');
        // Gespiegeld geldt in beide richtingen: A is dan ook B gespiegeld.
        expect(isGespiegeld(a.map(spiegelY), a)).toBe('y');
        // Een getransformeerd patroon op de drager is het spiegelbeeld om het midden van zijn eigen blok.
        expect(isGespiegeld(geplaatst(a).dozen, geplaatst(a, 'spiegelX').dozen)).toBe('x');
        expect(isGespiegeld(geplaatst(a).dozen, geplaatst(a, 'spiegelY').dozen)).toBe('y');
        expect(isGespiegeld(geplaatst(a).dozen, geplaatst(a, 'draai180').dozen)).toBe('xy');
    });
    it('met een marge van een halve millimeter', () => {
        const bijna = a.map(spiegelX).map((r, k) => (k === 2 ? { ...r, x: r.x + 0.4, y: r.y - 0.4 } : r));
        expect(isGespiegeld(a, bijna)).toBe('x');
        const scheef = a.map(spiegelX).map((r, k) => (k === 2 ? { ...r, y: r.y + 1 } : r));
        expect(isGespiegeld(a, scheef)).toBeNull();
    });
    it('niet gespiegeld: dezelfde laag, een verschoven laag, een andere laag of een ander aantal dozen', () => {
        expect(isGespiegeld(a, a)).toBeNull();
        expect(isGespiegeld(a, a.map((r) => ({ ...r, x: r.x + 50 })))).toBeNull();
        const kolommen = [0, 1].flatMap((rij) => [0, 1, 2].map((k) => ({ x: 249 * k, y: 484 * rij, w: 249, d: 484 })));
        expect(isGespiegeld(a, kolommen)).toBeNull();
        expect(isGespiegeld(a, a.map(spiegelX).slice(1))).toBeNull();
        expect(isGespiegeld([], [])).toBeNull();
    });
});
describe('punt 1: zoekVerband kiest bij verder gelijke paren het gespiegelde paar (#63)', () => {
    it('gelijke stand: het gespiegelde paar wint van een eerder gevonden paar dat niet gespiegeld is', () => {
        // P is symmetrisch (één variant), Q niet (Q en Q gespiegeld). Het eerst gevonden paar is P met Q.
        const P = stroken([100, 300, 300, 100]);
        const Q = stroken([100, 100, 250, 350]);
        const oud = zoekVerbandOud([P, Q], EURO);
        expect(paarSleutel(oud.tweezijdig)).toBe(paarSleutel({ a: geplaatst(P), b: geplaatst(Q) }));
        expect(gespiegeld(oud.tweezijdig)).toBeNull();
        const { tweezijdig, eenzijdig } = zoekVerband([P, Q], EURO);
        // Nu: Q met zijn spiegelbeeld, met precies dezelfde stand: geen overhang, 4 torens, genoeg steun en 4 dozen op twee of meer.
        expect(paarSleutel(tweezijdig)).toBe(paarSleutel({ a: geplaatst(Q), b: geplaatst(Q, 'spiegelX') }));
        expect(gespiegeld(tweezijdig)).toBe('x');
        expect(tekst(maatBeide(tweezijdig))).toEqual(tekst(maatBeide(oud.tweezijdig)));
        expect(tekst(maatBeide(tweezijdig))).toEqual([0, 4, 0.75, 4]);
        // Het paar voor precies twee lagen (alleen B op A) ook.
        expect(gespiegeld(oud.eenzijdig)).toBeNull();
        expect(gespiegeld(eenzijdig)).toBe('x');
        expect(tekst(maatBOpA(eenzijdig))).toEqual(tekst(maatBOpA(oud.eenzijdig)));
    });
    it('gespiegeld gaat voor op meer dozen op twee of meer dozen eronder', () => {
        // Bij gelijke overhang, torens en steun (50%) wint het gespiegelde paar met 4 dozen op twee of meer van het paar met 6.
        const P = strokenOp([
            [0, 350],
            [350, 200],
            [550, 150],
            [700, 100],
        ]);
        const Q = strokenOp([
            [0, 150],
            [150, 150],
            [400, 200],
            [600, 200],
        ]);
        const oud = zoekVerbandOud([P, Q], EURO).tweezijdig;
        const nieuw = zoekVerband([P, Q], EURO).tweezijdig;
        expect([gespiegeld(oud), tekst(maatBeide(oud))]).toEqual([null, [0, 2, 0.5, 6]]);
        expect([gespiegeld(nieuw), tekst(maatBeide(nieuw))]).toEqual(['x', [0, 2, 0.5, 4]]);
        expect(paarSleutel(nieuw)).toBe(paarSleutel({ a: geplaatst(Q), b: geplaatst(Q, 'spiegelX') }));
    });
    it('maar niet ten koste van meer torens', () => {
        const P = stroken([100, 100, 100, 500]);
        const Q = stroken([100, 450, 100, 150]);
        const { tweezijdig, eenzijdig } = zoekVerband([P, Q], EURO);
        // Er is een gespiegeld paar dat in beide richtingen in verband ligt (Q met zijn spiegelbeeld), maar met 4 torens tegen 2.
        const spiegel = { a: geplaatst(Q), b: geplaatst(Q, 'spiegelX') };
        expect([inVerband(spiegel.b.dozen, spiegel.a.dozen), inVerband(spiegel.a.dozen, spiegel.b.dozen), gespiegeld(spiegel)]).toEqual([true, true, 'x']);
        expect(tekst(maatBeide(spiegel))).toEqual([0, 4, 0.75, 4]);
        expect([gespiegeld(tweezijdig), tekst(maatBeide(tweezijdig))]).toEqual([null, [0, 2, 0.75, 6]]);
        expect(paarSleutel(tweezijdig)).toBe(paarSleutel(zoekVerbandOud([P, Q], EURO).tweezijdig));
        // Bij twee lagen: B op A 2 torens bij het gespiegelde paar, 1 bij het gekozen paar.
        expect([tekst(maatBOpA(spiegel)), gespiegeld(eenzijdig), tekst(maatBOpA(eenzijdig))]).toEqual([[0, 2, 0.75, 2], null, [0, 1, 0.75, 3]]);
    });
    it('en niet ten koste van steun', () => {
        // Q heeft een gat van 100 mm; het gespiegelde paar van Q steunt een doos voor maar 60% (minder dan 75%).
        const P = stroken([100, 100, 100, 500]);
        const Q = strokenOp([
            [0, 150],
            [150, 250],
            [500, 100],
            [600, 200],
        ]);
        const spiegel = { a: geplaatst(Q), b: geplaatst(Q, 'spiegelX') };
        expect([gespiegeld(spiegel), tekst(maatBeide(spiegel))]).toEqual(['x', [0, 4, 0.6, 4]]);
        const { tweezijdig, eenzijdig } = zoekVerband([P, Q], EURO);
        expect([gespiegeld(tweezijdig), tekst(maatBeide(tweezijdig))]).toEqual([null, [0, 4, 0.75, 4]]);
        expect([gespiegeld(eenzijdig), tekst(maatBOpA(eenzijdig))]).toEqual([null, [0, 2, 0.75, 2]]);
    });
});
describe('punt 1: bij precies twee lagen dezelfde rangorde (beterVoorTweeLagen)', () => {
    const P = stroken([100, 300, 300, 100]);
    const Q = stroken([100, 100, 250, 350]);
    const spiegel = { a: geplaatst(Q), b: geplaatst(Q, 'spiegelX') };
    const ander = { a: geplaatst(P), b: geplaatst(Q) };
    it('bij gelijke stand van B op A wint het gespiegelde paar', () => {
        expect(tekst(maatBOpA(spiegel))).toEqual(tekst(maatBOpA(ander)));
        expect([gespiegeld(spiegel), gespiegeld(ander)]).toEqual(['x', null]);
        expect(beterVoorTweeLagen(spiegel, ander)).toBe(true);
        expect(beterVoorTweeLagen(ander, spiegel)).toBe(false);
    });
    it('gespiegeld gaat voor op meer dozen op twee of meer, maar niet op minder torens of meer steun', () => {
        // Minder dozen op twee of meer (2 tegen 3) maar gespiegeld, bij gelijke overhang, torens en steun (50%).
        const R = strokenOp([
            [0, 150],
            [150, 150],
            [400, 200],
            [600, 200],
        ]);
        const S = strokenOp([
            [0, 350],
            [350, 200],
            [550, 150],
            [700, 100],
        ]);
        const rSpiegel = { a: geplaatst(R), b: geplaatst(R, 'spiegelX') };
        const rAnder = { a: geplaatst(R), b: geplaatst(S, 'spiegelX') };
        expect([gespiegeld(rSpiegel), tekst(maatBOpA(rSpiegel)), gespiegeld(rAnder), tekst(maatBOpA(rAnder))]).toEqual(['x', [0, 1, 0.5, 2], null, [0, 1, 0.5, 3]]);
        expect(beterVoorTweeLagen(rSpiegel, rAnder)).toBe(true);
        // Meer torens: gespiegeld verliest.
        const T = stroken([100, 450, 100, 150]);
        const tSpiegel = { a: geplaatst(T), b: geplaatst(T, 'spiegelX') };
        const tAnder = { a: geplaatst(stroken([100, 100, 100, 500])), b: geplaatst(T, 'spiegelX') };
        expect([tekst(maatBOpA(tSpiegel)), tekst(maatBOpA(tAnder))]).toEqual([
            [0, 2, 0.75, 2],
            [0, 1, 0.75, 3],
        ]);
        expect([beterVoorTweeLagen(tSpiegel, tAnder), beterVoorTweeLagen(tAnder, tSpiegel)]).toEqual([false, true]);
        // Minder steun: gespiegeld verliest.
        const U = strokenOp([
            [0, 150],
            [150, 250],
            [500, 100],
            [600, 200],
        ]);
        const uSpiegel = { a: geplaatst(U), b: geplaatst(U, 'spiegelX') };
        const uAnder = { a: geplaatst(stroken([100, 100, 100, 500])), b: geplaatst(U) };
        expect([tekst(maatBOpA(uSpiegel)), tekst(maatBOpA(uAnder))]).toEqual([
            [0, 2, 0.6, 2],
            [0, 2, 0.75, 2],
        ]);
        expect([beterVoorTweeLagen(uSpiegel, uAnder), beterVoorTweeLagen(uAnder, uSpiegel)]).toEqual([false, true]);
    });
});
describe('punt 1: gemeten op echte voetafdrukken', () => {
    it('592 × 295 mm op een europallet: nu gespiegeld, met evenveel dozen, steun en verband, ook na het uitlijnen', () => {
        const i = bestaand(592, 295, 200, 2, 1);
        const { voorraad, breedte } = voorraadZoalsBereken(i.drager, 592, 295);
        const oud = zoekVerbandOud(voorraad, i.drager, breedte).tweezijdig;
        const nieuw = zoekVerband(voorraad, i.drager, breedte).tweezijdig;
        // Vóór #63 al een paar zonder overhang en torens waarin elke doos op twee dozen steunt, maar niet gespiegeld. Nu het
        // gespiegelde paar met precies dezelfde stand (de zoektocht stopt dus niet meer bij het eerste perfecte paar).
        expect([gespiegeld(oud), tekst(maatBeide(oud))]).toEqual([null, [0, 0, 0.75, 8]]);
        expect([gespiegeld(nieuw), tekst(maatBeide(nieuw))]).toEqual(['y', [0, 0, 0.75, 8]]);
        const zonder = verbandVan(i, false);
        const met = verbandVan(i);
        expect([zonder.aantalLagen, zonder.lagen[0].dozen.length, zonder.lagen[1].dozen.length, zonder.buitendozenPerDrager]).toEqual([9, 4, 4, 36]);
        expect([sleutel(zonder.lagen[0].dozen), sleutel(zonder.lagen[1].dozen)]).toEqual([sleutel(nieuw.a.dozen), sleutel(nieuw.b.dozen)]);
        expect([lagenSpiegeling(zonder), lagenSpiegeling(met)]).toEqual(['y', 'y']);
    });
    it('meer torens of minder steun: dan blijft het paar dat niet gespiegeld is (275 × 249 mm, 400 × 340 mm op een blokpallet)', () => {
        // 275 × 249 mm op een europallet: het gekozen paar heeft 2 torens; elk gespiegeld paar met evenveel dozen en zonder
        // overhang heeft er 4 of 8.
        const euro = kopieDrager(EUROPALLET);
        const a = voorraadZoalsBereken(euro, 275, 249);
        const keuze = zoekVerband(a.voorraad, euro, a.breedte).tweezijdig;
        expect([gespiegeld(keuze), maatBeide(keuze).torens]).toEqual([null, 2]);
        const spiegelA = verbandParen(a.voorraad, euro, a.breedte).filter((p) => p.a.dozen.length === 12 && p.b.dozen.length === 12 && overhang(p) === 0 && gespiegeld(p) && inVerband(p.b.dozen, p.a.dozen) && inVerband(p.a.dozen, p.b.dozen));
        expect(spiegelA.length).toBeGreaterThan(0);
        expect(Math.min(...spiegelA.map((p) => maatBeide(p).torens))).toBe(4);
        // 400 × 340 mm op een blokpallet: het gekozen paar heeft geen torens en genoeg steun; elk gespiegeld paar zonder torens
        // steunt een doos voor hoogstens 70%, ook met de varianten van het vijfblokspatroon (#65). Tot #65 liet 275 × 200 mm op
        // een blokpallet dit zien (zie de volgende test).
        const blok = kopieDrager(BLOKPALLET);
        const b = voorraadZoalsBereken(blok, 400, 340);
        const keuzeB = zoekVerband(b.voorraad, blok, b.breedte).tweezijdig;
        expect([gespiegeld(keuzeB), tekst(maatBeide(keuzeB))]).toEqual([null, [0, 0, 0.75, 6]]);
        const spiegelB = verbandParen(b.voorraad, blok, b.breedte).filter((p) => p.a.dozen.length === 6 && p.b.dozen.length === 6 && gespiegeld(p) && inVerband(p.b.dozen, p.a.dozen) && inVerband(p.a.dozen, p.b.dozen));
        expect(spiegelB.length).toBeGreaterThan(0);
        expect(Math.max(...spiegelB.filter((p) => maatBeide(p).torens === 0).map((p) => maatBeide(p).steun))).toBeLessThanOrEqual(0.7 + 1e-9);
    });
    it('275 × 200 mm op een blokpallet: sinds #65 gespiegeld, met precies dezelfde stand', () => {
        // Tot #65 was het gekozen paar niet gespiegeld (geen overhang en torens, genoeg steun, 36 dozen op twee of meer dozen)
        // en steunde elk gespiegeld paar zonder torens een doos voor hoogstens 50%. Nu is laag A een variant van het
        // vijfblokspatroon en laag B die laag van voor naar achter gespiegeld, met precies dezelfde stand: dan wint gespiegeld.
        const blok = kopieDrager(BLOKPALLET);
        const b = voorraadZoalsBereken(blok, 275, 200);
        const keuze = zoekVerband(b.voorraad, blok, b.breedte).tweezijdig;
        expect([gespiegeld(keuze), tekst(maatBeide(keuze))]).toEqual(['y', [0, 0, 0.75, 36]]);
        // Zonder de stap "gespiegeld" (de keuze van vóór #63) blijft het paar van vóór #65, met dezelfde stand.
        const oud = zoekVerbandOud(b.voorraad, blok, b.breedte).tweezijdig;
        expect([gespiegeld(oud), tekst(maatBeide(oud))]).toEqual([null, [0, 0, 0.75, 36]]);
        // Ook bereken() toont het gespiegelde paar, vóór en na het uitlijnen.
        const i = bestaand(275, 200, 200, 2, 1, kopieDrager(BLOKPALLET));
        expect([lagenSpiegeling(verbandVan(i, false)), lagenSpiegeling(verbandVan(i))]).toEqual(['y', 'y']);
    });
    it('1046693 en 1000466 blijven gespiegeld en ongewijzigd, ook na het uitlijnen', () => {
        const i = standaardInvoer();
        i.artikelcode = '1046693';
        i.binnendoos = { L: 235, B: 235, H: 131, gewicht: 4, kantelbaar: false, magVerticaal: { L: false, B: false } };
        Object.assign(i, { maxGevuldGewicht: 10, minBinnendozenPerDoos: 2, minBuitendozenPerLaag: 2 });
        const zonder = bereken(i, { uitlijnen: false }).top[0].oplossing;
        const met = bereken(i).top[0].oplossing;
        expect([lagenSpiegeling(zonder), lagenSpiegeling(met)]).toEqual(['x', 'x']);
        expect([met.doos.L, met.doos.B, met.doos.H, met.lagen[0].dozen.length, met.lagen[1].dozen.length, met.aantalLagen, met.buitendozenPerDrager, met.totaleHoogte]).toEqual([
            484, 249, 159, 6, 6, 12, 72, 2052,
        ]);
        const j = bestaand(790, 380, 275, 13.5, 12);
        const zonderJ = bereken(j, { uitlijnen: false }).top[0].oplossing;
        const metJ = bereken(j).top[0].oplossing;
        expect([lagenSpiegeling(zonderJ), lagenSpiegeling(metJ)]).toEqual(['y', 'y']);
        expect([metJ.lagen[0].dozen.length, metJ.lagen[1].dozen.length, metJ.aantalLagen, metJ.buitendozenPerDrager, metJ.totaleHoogte, metJ.totaalGewicht]).toEqual([
            3, 3, 7, 21, 2069, 308.5,
        ]);
    });
    it('het uitlijnen houdt gespiegelde lagen gespiegeld', () => {
        for (const [L, B, drager] of [
            [592, 295, EUROPALLET],
            [400, 200, EUROPALLET],
            [275, 200, EUROPALLET],
            [300, 150, BLOKPALLET],
            [484, 249, BLOKPALLET],
        ]) {
            const i = bestaand(L, B, 200, 2, 1, kopieDrager(drager));
            const voor = lagenSpiegeling(verbandVan(i, false));
            expect(voor).not.toBeNull();
            expect(lagenSpiegeling(verbandVan(i))).toBe(voor);
        }
    });
});
describe('punt 1: op veel echte laagpatronen', () => {
    // Deze test rekent veel paren door, sinds #65 ook met de varianten van het vijfblokspatroon; daarom een ruimere tijdgrens.
    it('zelfde aantallen, overhang, torens en steun als vóór #63; is er bij gelijke stand een gespiegeld paar, dan is het gekozen paar gespiegeld', () => {
        const metOverhang = kopieDrager(EUROPALLET);
        metOverhang.overhangToegestaan = true;
        metOverhang.overhang = { voor: 40, achter: 10, links: 25, rechts: 0 };
        const maten = [];
        for (const L of [156, 190, 214, 235, 250, 275, 300, 330, 365, 400, 460, 484, 500, 592, 790])
            for (const B of [150, 170, 200, 249, 295, 340, 380])
                if (B <= L)
                    maten.push([L, B]);
        const tel = { voorraden: 0, tweezijdig: 0, gespiegeld: 0, nuGespiegeld: 0, eenzijdigNuGespiegeld: 0 };
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
                    if (voorraad.length === 0)
                        continue;
                    const max = voorraad[0].aantal;
                    // De varianten van het vijfblokspatroon komen bovenop de breedte, zoals in bereken() (#65).
                    const zoek = verbandVenster(voorraad, max);
                    const dozen = zoek.map((p) => p.dozen);
                    const breedte = zoek.length;
                    const oud = zoekVerbandOud(dozen, drager, breedte);
                    const nieuw = zoekVerband(dozen, drager, breedte);
                    tel.voorraden++;
                    for (const soort of ['tweezijdig', 'eenzijdig']) {
                        const n = nieuw[soort];
                        const o = oud[soort];
                        expect(aantallen(n)).toEqual(aantallen(o));
                        if (!n || !o)
                            continue;
                        const maat = soort === 'tweezijdig' ? maatBeide : maatBOpA;
                        const [mn, mo] = [maat(n), maat(o)];
                        // Gespiegeld staat na de steun: aantal in A, overhang, torens en steun (tot 75%) blijven precies gelijk.
                        expect([mn.a, mn.torens]).toEqual([mo.a, mo.torens]);
                        expect(mn.oh).toBeCloseTo(mo.oh, 6);
                        expect(mn.steun).toBeCloseTo(mo.steun, 9);
                        const [gn, go] = [gespiegeld(n) !== null, gespiegeld(o) !== null];
                        // Was het paar al gespiegeld, dan blijft de keuze gelijk; verandert de keuze, dan naar een gespiegeld paar.
                        if (go)
                            expect(paarSleutel(n)).toBe(paarSleutel(o));
                        if (paarSleutel(n) !== paarSleutel(o)) {
                            expect([gn, go]).toEqual([true, false]);
                            if (soort === 'tweezijdig')
                                tel.nuGespiegeld++;
                            else
                                tel.eenzijdigNuGespiegeld++;
                        }
                        if (soort === 'tweezijdig') {
                            tel.tweezijdig++;
                            if (gn)
                                tel.gespiegeld++;
                        }
                        if (gn)
                            continue;
                        // Niet gespiegeld: dan heeft geen enkel geldig paar met evenveel dozen en dezelfde stand tot en met de steun een
                        // gespiegelde laag B.
                        const totaal = n.a.dozen.length + n.b.dozen.length;
                        const gelijk = verbandParen(dozen, drager, breedte).filter((p) => {
                            if (p.a.dozen.length + p.b.dozen.length !== totaal || p.a.dozen.length !== mn.a)
                                return false;
                            if (!inVerband(p.b.dozen, p.a.dozen) || (soort === 'tweezijdig' && !inVerband(p.a.dozen, p.b.dozen)))
                                return false;
                            const m = maat(p);
                            return Math.abs(m.oh - mn.oh) <= 1e-6 && m.torens === mn.torens && Math.abs(m.steun - mn.steun) <= 1e-9;
                        });
                        expect(gelijk.filter((p) => gespiegeld(p) !== null).map(paarSleutel)).toEqual([]);
                    }
                }
            }
        expect(tel.voorraden).toBeGreaterThan(250);
        expect(tel.tweezijdig).toBeGreaterThan(200);
        // Gemeten met de varianten van het vijfblokspatroon (#65): van 350 tweezijdige keuzes waren er 224 al gespiegeld; 18 zijn
        // het nu (242), steeds met dezelfde stand. Vóór #65: 228 al gespiegeld, 13 nu (241).
        expect(tel.gespiegeld).toBeGreaterThan(tel.tweezijdig / 2);
        expect(tel.nuGespiegeld).toBeGreaterThan(0);
    }, 30_000);
});
// ---------------------------------------------------------------------------------------------------------------------
// Punt 2: een bestaande buitendoos zonder binnendoos mag zelf kantelen (#64).
const dragers = STANDAARD_DRAGERS.map(kopieDrager);
const inst = STANDAARD_INSTELLINGEN;
const leeg = () => leegFormulier(inst, dragers);
/** Bestaande buitendoos zonder binnendoos (standaard 600 × 400 × 300 mm, 12 kg, 6 artikelen per doos, op de europallet). */
function buitendoos(extra = {}) {
    const f = leeg();
    return { ...f, instap: 'bestaandeBuitendoos', artikelcode: 'R6', bestaand: { ...f.bestaand, L: '600', B: '400', H: '300', gevuld: '12', aantal: '6', ...extra } };
}
const kantelbaar = (extra = {}) => buitendoos({ kantelbaar: true, magL: true, magB: true, ...extra });
describe('punt 2: formulier', () => {
    it('standaard niet kantelbaar; zonder vinkje gaat er niets mee naar de rekenmodule', () => {
        expect([leeg().bestaand.kantelbaar, leeg().bestaand.magL, leeg().bestaand.magB]).toEqual([false, false, false]);
        const i = naarInvoer(buitendoos({ magL: true }), dragers, inst);
        expect(i.bestaandeBuitendoos.kantelbaar).toBeUndefined();
        expect(i.bestaandeBuitendoos.magVerticaal).toBeUndefined();
    });
    it('kantelbaar zonder binnendoos: mee naar de rekenmodule en terug uit een opgeslagen berekening', () => {
        const i = JSON.parse(JSON.stringify(naarInvoer(kantelbaar({ magB: false }), dragers, inst)));
        expect(i.bestaandeBuitendoos).toMatchObject({ L: 600, B: 400, H: 300, kantelbaar: true, magVerticaal: { L: true, B: false } });
        expect(valideer(i)).toEqual([]);
        const terug = vanInvoer(i, leeg());
        expect([terug.bestaand.metBinnendoos, terug.bestaand.kantelbaar, terug.bestaand.magL, terug.bestaand.magB]).toEqual([false, true, true, false]);
        expect(naarInvoer(terug, dragers, inst)).toEqual(i);
    });
    it('met binnendoos kantelt de buitendoos niet: de vinkjes gaan niet mee', () => {
        const f = kantelbaar({ metBinnendoos: true, gevuld: '14', aantal: '8' });
        const i = naarInvoer({ ...f, bd: { L: '290', B: '195', H: '140', gewicht: '1,9', kantelbaar: false, magL: false, magB: false } }, dragers, inst);
        expect(i.binnendoos).toBeDefined();
        expect(i.bestaandeBuitendoos.kantelbaar).toBeUndefined();
        expect(i.bestaandeBuitendoos.magVerticaal).toBeUndefined();
    });
    it('een berekening van vóór ronde 6 heeft geen kantelgegevens: niet kantelbaar', () => {
        const oud = JSON.parse(JSON.stringify(naarInvoer(buitendoos(), dragers, inst)));
        delete oud.bestaandeBuitendoos.kantelbaar;
        delete oud.bestaandeBuitendoos.magVerticaal;
        const terug = vanInvoer(oud, leeg());
        expect([terug.bestaand.kantelbaar, terug.bestaand.magL, terug.bestaand.magB]).toEqual([false, false, false]);
        expect(bereken(naarInvoer(terug, dragers, inst)).oplossingen.some((o) => o.doos.gekanteld)).toBe(false);
    });
    it('kantelbaar zonder as: een melding in gewone taal', () => {
        const i = naarInvoer(kantelbaar({ magL: false, magB: false }), dragers, inst);
        expect(valideer(i)).toEqual(['Kantelbaar is aangevinkt bij de buitendoos, maar er is geen as gekozen die verticaal mag staan.']);
    });
});
describe('punt 2: kandidaten', () => {
    it('600 × 400 × 300 mm met L en B verticaal: rechtop, L verticaal en B verticaal, met dezelfde inhoud en hetzelfde gewicht', () => {
        const { kandidaten, redenen } = bestaandeKandidaten(naarInvoer(kantelbaar(), dragers, inst));
        expect(redenen).toEqual([]);
        expect(kandidaten.map((d) => [d.L, d.B, d.H, d.gekanteld, d.staandeAs ?? null, d.module])).toEqual([
            [600, 400, 300, false, null, '600 × 400'],
            [400, 300, 600, true, 'L', '400 × 300'],
            [600, 300, 400, true, 'B', null],
        ]);
        for (const d of kandidaten)
            expect([d.bestaand, d.gevuldGewicht, d.binnendozenPerDoos, d.indeling, d.binnenmaat]).toEqual([true, 12, 6, null, null]);
        // Alleen L verticaal.
        expect(bestaandeKandidaten(naarInvoer(kantelbaar({ magB: false }), dragers, inst)).kandidaten.map((d) => d.staandeAs ?? 'H')).toEqual(['H', 'L']);
    });
    it('een stand die dezelfde doos op de drager geeft, telt één keer (kubus, twee gelijke maten)', () => {
        const kubus = naarInvoer(kantelbaar({ L: '400', B: '400', H: '400' }), dragers, inst);
        expect(bestaandeKandidaten(kubus).kandidaten.map((d) => [d.L, d.B, d.H, d.staandeAs ?? 'H'])).toEqual([[400, 400, 400, 'H']]);
        // 600 × 400 × 400: met B verticaal staat dezelfde doos op de drager als rechtop.
        const i = naarInvoer(kantelbaar({ H: '400' }), dragers, inst);
        expect(standenBestaand(i)).toEqual([
            { L: 600, B: 400, H: 400 },
            { L: 400, B: 400, H: 600, staandeAs: 'L' },
        ]);
    });
    it('met een binnendoos kantelt de buitendoos niet, ook niet als de rekenmodule de vinkjes krijgt', () => {
        const i = naarInvoer(kantelbaar({ metBinnendoos: true, gevuld: '14', aantal: '8' }), dragers, inst);
        i.binnendoos = { L: 290, B: 195, H: 140, gewicht: 1.9, kantelbaar: false, magVerticaal: { L: false, B: false } };
        i.bestaandeBuitendoos.kantelbaar = true;
        i.bestaandeBuitendoos.magVerticaal = { L: true, B: true };
        expect(bestaandeKandidaten(i).kandidaten.map((d) => [d.L, d.B, d.H, d.gekanteld])).toEqual([[600, 400, 300, false]]);
    });
    it('de min./max. buitenmaat geldt voor de maten zoals de doos op de drager staat', () => {
        const i = naarInvoer(kantelbaar(), dragers, inst);
        i.maxBuitenmaat = { H: 500 };
        expect(bestaandeKandidaten(i).kandidaten.map((d) => d.staandeAs ?? 'H')).toEqual(['H', 'B']);
        i.maxBuitenmaat = { H: 250 };
        const { kandidaten, redenen } = bestaandeKandidaten(i);
        expect(kandidaten).toEqual([]);
        expect(redenen).toEqual([
            'De buitendoos valt buiten de ingestelde buitenmaat: hoogte 300 mm is meer dan het maximum van 250 mm.',
            'De gekantelde buitendoos (L verticaal) valt buiten de ingestelde buitenmaat: hoogte 600 mm is meer dan het maximum van 250 mm.',
            'De gekantelde buitendoos (B verticaal) valt buiten de ingestelde buitenmaat: hoogte 400 mm is meer dan het maximum van 250 mm.',
        ]);
    });
});
describe('punt 2: rekenen met de kantelregel (minstens 10% meer per drager)', () => {
    it('600 × 400 × 300 mm, 12 kg: gekanteld geeft niet meer, dus blijft de doos rechtop', () => {
        const r = bereken(naarInvoer(kantelbaar(), dragers, inst));
        const w = r.top[0].oplossing;
        expect([w.doos.gekanteld, w.doos.staandeAs, w.buitendozenPerDrager, w.artikelenPerDrager]).toEqual([false, undefined, 24, 144]);
        // Met L verticaal ook 24 dozen per drager (400 × 300 mm, 8 per laag, 3 lagen): geen 10% meer.
        const gekanteld = r.oplossingen.filter((o) => o.doos.gekanteld);
        expect(Math.max(...gekanteld.map((o) => o.buitendozenPerDrager))).toBe(24);
        expect(r.top[0].uitleg[0]).toBe('Gekantelde buitendoos geeft 144 tegen 144 artikelen rechtop; minder dan 10% meer, dus niet gekanteld.');
        // Zonder kantelen precies dezelfde winnaar.
        const zonder = bereken(naarInvoer(buitendoos(), dragers, inst)).top[0].oplossing;
        expect([zonder.id, zonder.buitendozenPerDrager]).toEqual([w.id, 24]);
    });
    it('600 × 300 × 450 mm, 12 kg: met L verticaal 18 in plaats van 16 dozen per drager (+12,5%), dus gekanteld', () => {
        const f = kantelbaar({ L: '600', B: '300', H: '450' });
        const r = bereken(naarInvoer(f, dragers, inst));
        const w = r.top[0].oplossing;
        expect([w.doos.L, w.doos.B, w.doos.H, w.doos.gekanteld, w.doos.staandeAs, w.buitendozenPerDrager, w.artikelenPerDrager]).toEqual([450, 300, 600, true, 'L', 18, 108]);
        expect(w.id.startsWith('450x300x600-L-6-')).toBe(true);
        expect(r.top[0].uitleg[0]).toBe('Gekantelde buitendoos geeft 108 tegen 96 artikelen rechtop (+12,5%, minstens 10%), dus gekanteld.');
        const niet = r.top.find((t) => t.rol === 'nietGekanteld');
        expect([niet.oplossing.doos.gekanteld, niet.oplossing.buitendozenPerDrager]).toEqual([false, 16]);
        expect(niet.uitleg[0]).toMatch(/^Beste oplossing zonder gekantelde buitendoos: 96 artikelen per drager, 11,1% minder dan de voorkeursoptie \(/);
        const alles = r.top.flatMap((t) => t.uitleg).join(' ');
        expect(alles).not.toContain('binnendoos');
        expect(alles).not.toContain('binnendozen');
        // Zonder kantelen (of zonder L verticaal) blijft de doos rechtop met 16 dozen per drager.
        for (const g of [buitendoos({ L: '600', B: '300', H: '450' }), kantelbaar({ L: '600', B: '300', H: '450', magL: false })]) {
            const o = bereken(naarInvoer(g, dragers, inst)).top[0].oplossing;
            expect([o.doos.gekanteld, o.buitendozenPerDrager]).toEqual([false, 16]);
        }
    });
    it('bij een gekantelde binnendoos blijft het "binnendoos"', () => {
        expect([gekanteldWat({ staandeAs: 'L' }), gekanteldWat({ staandeAs: 'B' }), gekanteldWat({})]).toEqual(['buitendoos', 'buitendoos', 'binnendoos']);
        const i = standaardInvoer();
        i.artikelcode = 'R6';
        i.binnendoos = { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: true, magVerticaal: { L: true, B: true } };
        const tekstAlles = bereken(i)
            .top.flatMap((t) => t.uitleg)
            .join(' ');
        expect(tekstAlles).toContain('Gekantelde binnendoos');
        expect(tekstAlles).not.toContain('buitendoos gekanteld');
    });
});
describe('punt 2: weergave en rapport', () => {
    const r = bereken(naarInvoer(kantelbaar({ L: '600', B: '300', H: '450' }), dragers, inst));
    const w = r.top[0];
    it('de resultaatkaart zegt "Buitendoos gekanteld"', () => {
        const html = renderToStaticMarkup(createElement(Kaart, { o: w.oplossing, rol: w.rol, uitleg: w.uitleg, gekozen: false, onKies: () => { }, zonderBinnendoos: true }));
        expect(html).toContain('<span class="label oranje">Buitendoos gekanteld</span>');
        expect(html).not.toContain('Binnendoos gekanteld');
        expect(html).toContain('<dt>Buitenmaat</dt><dd>450 × 300 × 600 mm</dd>');
        // Bij de tekening van de gekozen oplossing staat welke ingevoerde as verticaal staat.
        const detail = renderToStaticMarkup(createElement(Detail, { o: w.oplossing, invoer: r.invoer, onPdf: () => { }, bezig: false, standaardTaal: 'nl' }));
        expect(detail.replace(/<!-- -->/g, '')).toContain('<figcaption>Buitendoos (gekanteld, lengte 600 mm verticaal)</figcaption>');
    });
    it('het rapport noemt de stand van de buitendoos: rechtop, of welke ingevoerde as verticaal staat', () => {
        const nl = blokken(r.invoer, w.oplossing, 'nl');
        expect(nl.buitendoos.rijen).toContainEqual(['Stand', 'gekanteld (lengte 600 mm verticaal)']);
        expect(nl.buitendoos.rijen).toContainEqual(['Afmeting', '450 × 300 × 600 mm (L × B × H)']);
        const en = blokken(r.invoer, w.oplossing, 'en');
        expect(en.buitendoos.rijen).toContainEqual(['Orientation', 'tilted (length 600 mm vertical)']);
        // B verticaal: de ingevulde breedte van 300 mm staat verticaal.
        const metB = r.oplossingen.find((o) => o.doos.staandeAs === 'B');
        expect(blokken(r.invoer, metB, 'nl').buitendoos.rijen).toContainEqual(['Stand', 'gekanteld (breedte 300 mm verticaal)']);
        expect(blokken(r.invoer, metB, 'en').buitendoos.rijen).toContainEqual(['Orientation', 'tilted (width 300 mm vertical)']);
        // Rechtop.
        const rechtop = r.oplossingen.find((o) => !o.doos.gekanteld);
        expect(blokken(r.invoer, rechtop, 'nl').buitendoos.rijen).toContainEqual(['Stand', 'rechtop']);
        expect(blokken(r.invoer, rechtop, 'en').buitendoos.rijen).toContainEqual(['Orientation', 'upright']);
        // Een ontworpen buitendoos heeft geen standregel in het buitendoosblok (de stand van de binnendoos staat bij de binnendoos).
        const i = standaardInvoer();
        i.artikelcode = 'R6';
        i.binnendoos = { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } };
        const ontwerp = bereken(i);
        expect(blokken(ontwerp.invoer, ontwerp.top[0].oplossing, 'nl').buitendoos.rijen.map(([label]) => label)).not.toContain('Stand');
    });
    it('het scherm: de kantelvinkjes staan bij de bestaande buitendoos zonder binnendoos, met een korte uitleg', () => {
        const scherm = (f) => renderToStaticMarkup(createElement(Berekenen, {
            formulier: f,
            setFormulier: () => { },
            artikelen: {},
            dragers,
            instellingen: inst,
            onArtikelOpslaan: async () => { },
            onBerekeningOpslaan: async () => { },
            onNaarOverzicht: async () => false,
        }));
        const hint = 'Kantelen mag, maar hoeft niet: gekanteld wint alleen bij minstens 10% meer per drager.';
        const zonder = scherm(buitendoos());
        expect(zonder).toContain('<h3>3. Bestaande buitendoos</h3>');
        expect(zonder.split('<h3>3. Bestaande buitendoos</h3>')[1]).toContain('<span>Kantelbaar</span>');
        expect(zonder).toContain('<span>L mag verticaal</span>');
        expect(zonder).toContain('<span>B mag verticaal</span>');
        expect(zonder).toContain(hint);
        // Zolang "Kantelbaar" uit staat, zijn de assen uitgeschakeld.
        expect(zonder).toMatch(/<label class="vink uit"><input type="checkbox" disabled=""\/><span>L mag verticaal<\/span>/);
        expect(scherm(kantelbaar())).toMatch(/<label class="vink"><input type="checkbox" checked=""\/><span>L mag verticaal<\/span>/);
        // Met binnendoos: geen kantelvinkjes bij de buitendoos (alleen die van de binnendoos) en geen uitleg.
        const met = scherm({ ...buitendoos({ metBinnendoos: true }), bd: { L: '290', B: '195', H: '140', gewicht: '1,9', kantelbaar: false, magL: false, magB: false } });
        expect(met.split('<h3>3. Bestaande buitendoos</h3>')[1]).not.toContain('Kantelbaar');
        expect(met).not.toContain(hint);
    });
});
