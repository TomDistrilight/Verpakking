// Ronde 5: "Min. artikelen per binnendoos" (een minimum, standaard 2) en een bestaande buitendoos zonder binnendoos.
// Ronde 8 (#67): het veld heet weer "Artikelen per binnendoos" en is een vast aantal, zonder "min." in resultaten en PDF.
// De standaard 2 blijft. De verwachtingen hieronder zijn daarop aangepast; zie ook ronde8-artikel.test.ts.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
// svg2pdf.js heeft een browser nodig; voor de rijen van het rapport is het niet nodig.
vi.mock('svg2pdf.js', () => ({}));
import { bereken, valideer } from '../src/engine/bereken';
import { artikelenTekst, inhoudEenheid } from '../src/engine/format';
import { STANDAARD_ARTIKELEN_PER_BINNENDOOS, STANDAARD_DRAGERS, kopieDrager, standaardInvoer } from '../src/engine/standaard';
import { STANDAARD_INSTELLINGEN } from '../src/data/opslag';
import { raadKoppeling, VELDEN, verwerk } from '../src/import/excel';
import { blokken } from '../src/pdf/rapport';
import { leegFormulier, metArtikel, naarInvoer, vanInvoer } from '../src/ui/formulier';
import { Artikelen, naarBewerk } from '../src/ui/Artikelen';
import { Berekenen } from '../src/ui/Berekenen';
import { Kaart } from '../src/ui/Resultaten';
const dragers = STANDAARD_DRAGERS.map(kopieDrager);
const inst = STANDAARD_INSTELLINGEN;
const leeg = () => leegFormulier(inst, dragers);
const bdVelden = (L, B, H, gewicht) => ({ L, B, H, gewicht, kantelbaar: false, magL: false, magB: false });
/** Bestaande buitendoos 600 × 400 × 300 mm, 12 kg, 6 artikelen per doos, zonder binnendoos (op de europallet). */
function bestaandZonder(extra = {}) {
    const f = leeg();
    return {
        ...f,
        instap: 'bestaandeBuitendoos',
        artikelcode: 'R5',
        bestaand: { ...f.bestaand, L: '600', B: '400', H: '300', gevuld: '12', aantal: '6', ...extra },
    };
}
/** Dezelfde buitendoos met een binnendoos van 290 × 195 × 140 mm, 1,9 kg en minimaal 4 artikelen per binnendoos. */
function bestaandMet() {
    const f = bestaandZonder({ metBinnendoos: true, aantal: '8', gevuld: '' });
    return {
        ...f,
        artikelenPerBinnendoos: '4',
        bd: bdVelden('290', '195', '140', '1,9'),
        bestaand: { ...f.bestaand, metBinnenmaat: true, binnenL: '590', binnenB: '392', binnenH: '290', eigen: '0,6' },
    };
}
function ontwerp(extra = {}) {
    const i = standaardInvoer();
    i.artikelcode = 'R5';
    i.artikelenPerBinnendoos = 2;
    i.binnendoos = { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } };
    return { ...i, ...extra };
}
describe('artikelen per binnendoos: standaard 2', () => {
    it('het lege formulier, een nieuw artikel en een lege importcel krijgen 2', () => {
        expect(STANDAARD_ARTIKELEN_PER_BINNENDOOS).toBe(2);
        expect(leeg().artikelenPerBinnendoos).toBe('2');
        expect(naarInvoer({ ...leeg(), artikelcode: 'X', bd: bdVelden('300', '200', '150', '2') }, dragers, inst).artikelenPerBinnendoos).toBe(2);
        expect(naarBewerk().aantal).toBe('2');
        const rijen = verwerk([['A1', 300, 200, 150, 2, null]], { ...raadKoppeling(['Artikelcode', 'Lengte', 'Breedte', 'Hoogte', 'Gewicht', 'Min. artikelen per binnendoos']), kopRij: false }, {});
        expect(rijen[0].artikel.artikelenPerBinnendoos).toBe(2);
    });
    it('een artikel zonder binnendoos telt altijd 1; een opgeslagen artikel houdt zijn eigen aantal', () => {
        const f = { ...leeg(), artikelcode: 'X', zonderBinnendoos: true, bd: bdVelden('300', '200', '150', '2') };
        expect(naarInvoer(f, dragers, inst).artikelenPerBinnendoos).toBe(1);
        const artikel = {
            artikelcode: 'A1',
            omschrijving: '',
            artikelenPerBinnendoos: 1,
            zonderBinnendoos: false,
            binnendoos: { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } },
            bijgewerkt: '2026-01-01T00:00:00.000Z',
        };
        expect(metArtikel(leeg(), artikel).artikelenPerBinnendoos).toBe('1');
        expect(naarBewerk(artikel).aantal).toBe('1');
        expect(metArtikel(leeg(), { ...artikel, artikelenPerBinnendoos: 6, zonderBinnendoos: true }).artikelenPerBinnendoos).toBe('1');
    });
    it('de foutmelding noemt het veld bij zijn naam', () => {
        // Ronde 8 (#67): zonder "Min." ervoor.
        expect(valideer(ontwerp({ artikelenPerBinnendoos: 0 }))).toContain('Artikelen per binnendoos moet een geheel getal van minstens 1 zijn.');
        const fout = verwerk([['A1', 300, 200, 150, 2, 1.5]], { ...raadKoppeling(['Artikelcode', 'Lengte', 'Breedte', 'Hoogte', 'Gewicht', 'Aantal']), kopRij: false }, {});
        expect(fout[0].fouten).toEqual(['Artikelen per binnendoos moet een geheel getal van minstens 1 zijn.']);
    });
});
describe('Excel-import', () => {
    const kop = ['Artikelcode', 'Lengte binnendoos (mm)', 'Breedte binnendoos (mm)', 'Hoogte binnendoos (mm)', 'Gewicht binnendoos incl. inhoud (kg)'];
    it('herkent de oude en de nieuwe kop voor het aantal, zonder andere kolommen te pakken', () => {
        for (const naam of ['Aantal artikelen per binnendoos', 'Min. aantal artikelen per binnendoos', 'Min. artikelen per binnendoos'])
            expect(raadKoppeling([...kop, naam, 'Omschrijving']).kolommen).toEqual({ artikelcode: 0, L: 1, B: 2, H: 3, gewicht: 4, aantal: 5, omschrijving: 6 });
        // Ook vóór de artikelcode: "artikelen" in de kop maakt er geen artikelcode van.
        expect(raadKoppeling(['Min. artikelen per binnendoos', ...kop]).kolommen).toEqual({ aantal: 0, artikelcode: 1, L: 2, B: 3, H: 4, gewicht: 5 });
        // Ronde 8 (#67): het veld heet weer "Artikelen per binnendoos"; de oude koppen worden nog herkend.
        expect(VELDEN.find((v) => v.veld === 'aantal').naam).toBe('Artikelen per binnendoos');
    });
    it('een kolom als "Gewicht per binnendoos" blijft het gewicht, ook vóór de kolom met het aantal', () => {
        const k = ['Artikelcode', 'Lengte (mm)', 'Breedte (mm)', 'Hoogte (mm)', 'Gewicht per binnendoos (kg)', 'Min. artikelen per binnendoos'];
        expect(raadKoppeling(k).kolommen).toEqual({ artikelcode: 0, L: 1, B: 2, H: 3, gewicht: 4, aantal: 5 });
    });
    it('een gewijzigd aantal heet in het voorbeeld "Artikelen per binnendoos"', () => {
        const oud = {
            artikelcode: 'A1',
            omschrijving: '',
            artikelenPerBinnendoos: 1,
            zonderBinnendoos: false,
            binnendoos: { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } },
            bijgewerkt: '2026-01-01T00:00:00.000Z',
        };
        const data = [
            [...kop, 'Min. artikelen per binnendoos'],
            ['A1', 300, 200, 150, 2, null],
        ];
        const [rij] = verwerk(data, raadKoppeling(data[0]), { A1: oud });
        expect(rij.status).toBe('gewijzigd');
        // Ronde 8 (#67): zonder "Min." ervoor.
        expect(rij.wijzigingen).toEqual(['Artikelen per binnendoos: 1 → 2 ']);
    });
});
describe('formulier: bestaande buitendoos met of zonder binnendoos', () => {
    it('standaard zonder binnendoos', () => {
        expect(leeg().bestaand.metBinnendoos).toBe(false);
    });
    it('zonder binnendoos: geen binnendoos, binnenmaat of eigen gewicht; het aantal telt artikelen', () => {
        // Verborgen velden (binnendoos uit een geladen artikel, binnenmaat) tellen niet mee.
        const f = { ...bestaandZonder({ metBinnenmaat: true, binnenL: '590', binnenB: '392', binnenH: '290', eigen: '0,6' }), bd: bdVelden('290', '195', '140', '1,9') };
        const i = naarInvoer({ ...f, artikelenPerBinnendoos: 'abc' }, dragers, inst);
        expect(i.binnendoos).toBeUndefined();
        expect(i.zonderBinnendoos).toBe(true);
        expect(i.artikelenPerBinnendoos).toBe(1);
        expect(i.bestaandeBuitendoos).toEqual({ L: 600, B: 400, H: 300, gevuldGewicht: 12, binnendozenPerDoos: 6, binnenmaat: undefined, eigenGewicht: undefined });
        expect(valideer(i)).toEqual([]);
    });
    it('zonder binnendoos: terug uit een opgeslagen berekening en weer dezelfde invoer', () => {
        const i = JSON.parse(JSON.stringify(naarInvoer(bestaandZonder(), dragers, inst)));
        const terug = vanInvoer(i, leeg());
        expect(terug.instap).toBe('bestaandeBuitendoos');
        expect(terug.bestaand.metBinnendoos).toBe(false);
        expect(terug.zonderBinnendoos).toBe(false);
        expect(terug.artikelenPerBinnendoos).toBe('2');
        expect(terug.bestaand.aantal).toBe('6');
        expect(naarInvoer(terug, dragers, inst)).toEqual(i);
    });
    it('met binnendoos: binnendoos, minimum per binnendoos en binnenmaat gaan mee, ook na openen', () => {
        const i = naarInvoer(bestaandMet(), dragers, inst);
        expect(i.binnendoos).toEqual({ L: 290, B: 195, H: 140, gewicht: 1.9, kantelbaar: false, magVerticaal: { L: false, B: false } });
        expect(i.zonderBinnendoos).toBeUndefined();
        expect(i.artikelenPerBinnendoos).toBe(4);
        expect(i.bestaandeBuitendoos).toMatchObject({ binnendozenPerDoos: 8, binnenmaat: { L: 590, B: 392, H: 290 }, eigenGewicht: 0.6 });
        expect(valideer(i)).toEqual([]);
        const opgeslagen = JSON.parse(JSON.stringify(i));
        const terug = vanInvoer(opgeslagen, leeg());
        expect(terug.bestaand.metBinnendoos).toBe(true);
        expect(terug.bestaand.metBinnenmaat).toBe(true);
        expect(terug.artikelenPerBinnendoos).toBe('4');
        expect(naarInvoer(terug, dragers, inst)).toEqual(opgeslagen);
    });
    it('een berekening van vóór ronde 5 zonder binnendoosmaten houdt hetzelfde aantal artikelen', () => {
        // Toen telde het veld binnendozen per buitendoos, met een apart aantal artikelen per binnendoos.
        const oud = naarInvoer(bestaandZonder(), dragers, inst);
        delete oud.zonderBinnendoos;
        oud.artikelenPerBinnendoos = 4;
        oud.bestaandeBuitendoos.binnendozenPerDoos = 6;
        const terug = vanInvoer(JSON.parse(JSON.stringify(oud)), leeg());
        expect([terug.bestaand.metBinnendoos, terug.bestaand.aantal]).toEqual([false, '24']);
        const nieuw = naarInvoer(terug, dragers, inst);
        expect(bereken(nieuw).top[0].oplossing.artikelenPerDrager).toBe(bereken(oud).top[0].oplossing.artikelenPerDrager);
    });
    it('een achtergebleven vinkje "Artikel zonder binnendoos" telt niet bij een bestaande buitendoos met binnendoos', () => {
        const i = naarInvoer({ ...bestaandMet(), zonderBinnendoos: true }, dragers, inst);
        expect([i.artikelenPerBinnendoos, i.zonderBinnendoos]).toEqual([4, undefined]);
    });
    it('met binnendoos maar zonder binnenmaat: geen binnenmaat of eigen gewicht', () => {
        const f = bestaandMet();
        const i = naarInvoer({ ...f, bestaand: { ...f.bestaand, metBinnenmaat: false, gevuld: '14' } }, dragers, inst);
        expect(i.bestaandeBuitendoos).toMatchObject({ gevuldGewicht: 14, binnenmaat: undefined, eigenGewicht: undefined });
        expect(i.binnendoos).toBeDefined();
    });
    it('instap binnendoos blijft gelijk: altijd een binnendoos; artikel zonder binnendoos telt als artikelen', () => {
        const f = { ...leeg(), artikelcode: 'X', bd: bdVelden('300', '200', '150', '2') };
        const i = naarInvoer(f, dragers, inst);
        expect(i.binnendoos).toBeDefined();
        expect(i.bestaandeBuitendoos).toBeUndefined();
        expect(i.zonderBinnendoos).toBeUndefined();
        const artikel = naarInvoer({ ...f, zonderBinnendoos: true }, dragers, inst);
        expect(artikel.zonderBinnendoos).toBe(true);
        expect(vanInvoer(artikel, leeg()).zonderBinnendoos).toBe(true);
        // Een lege binnendoos is bij instap binnendoos nog steeds een fout.
        expect(valideer(naarInvoer(leeg(), dragers, inst))).toContain('Lengte, breedte en hoogte van de binnendoos moeten groter dan 0 zijn.');
    });
});
describe('controle van de invoer', () => {
    const zonder = () => naarInvoer(bestaandZonder(), dragers, inst);
    it('zonder binnendoos is het gevulde gewicht van de buitendoos nodig, met een korte melding', () => {
        const i = naarInvoer(bestaandZonder({ gevuld: '' }), dragers, inst);
        expect(valideer(i)).toEqual(['Vul het gevulde gewicht van de buitendoos in.']);
    });
    it('met binnendoos blijft de langere melding', () => {
        const f = bestaandMet();
        const i = naarInvoer({ ...f, bestaand: { ...f.bestaand, metBinnenmaat: false } }, dragers, inst);
        expect(valideer(i)).toEqual(['Vul het gevulde gewicht van de buitendoos in, of het eigen gewicht, de binnenmaat en de binnendoos.']);
    });
    it('het aantal per buitendoos heet artikelen zonder binnendoos en binnendozen met binnendoos', () => {
        const i = zonder();
        i.bestaandeBuitendoos.binnendozenPerDoos = 1.5;
        expect(valideer(i)).toEqual(['Artikelen per buitendoos moet een geheel getal van minstens 1 zijn.']);
        const m = naarInvoer(bestaandMet(), dragers, inst);
        m.bestaandeBuitendoos.binnendozenPerDoos = 0;
        expect(valideer(m)).toContain('Binnendozen per buitendoos moet een geheel getal van minstens 1 zijn.');
    });
});
describe('rekenen met een bestaande buitendoos zonder binnendoos', () => {
    const r = bereken(naarInvoer(bestaandZonder(), dragers, inst));
    const w = r.top[0].oplossing;
    it('600 × 400 × 300 mm, 12 kg, 6 artikelen per doos: 24 dozen en 144 artikelen per europallet', () => {
        expect(r.invoer.binnendoos).toBeUndefined();
        expect(w.doos.bestaand).toBe(true);
        expect(w.doos.binnendozenPerDoos).toBe(6);
        expect(w.buitendozenPerDrager).toBe(24);
        expect(w.artikelenPerDrager).toBe(w.buitendozenPerDrager * 6);
        expect(w.artikelenPerDrager).toBe(144);
    });
    it('de uitleg spreekt van artikelen, niet van binnendozen', () => {
        const tekst = r.top.flatMap((t) => t.uitleg).join(' ');
        expect(r.top[0].uitleg.at(-1)).toBe('144 artikelen per drager.');
        expect(tekst).not.toContain('binnendozen');
    });
    it('zonder opgegeven aantal is de inhoud onbekend en telt de uitleg buitendozen', () => {
        const o = bereken(naarInvoer(bestaandZonder({ aantal: '' }), dragers, inst));
        expect(o.top[0].oplossing.artikelenPerDrager).toBeNull();
        expect(o.top[0].uitleg.at(-1)).toBe('24 buitendozen per drager.');
    });
    it('ook een artikel zonder binnendoos (instap binnendoos) telt artikelen in de uitleg', () => {
        const a = bereken(ontwerp({ zonderBinnendoos: true, artikelenPerBinnendoos: 1 }));
        expect(a.top[0].uitleg.at(-1)).toMatch(/^\d+ artikelen per drager\.$/);
        const b = bereken(ontwerp());
        expect(b.top[0].uitleg.at(-1)).toMatch(/^\d+ binnendozen per drager\.$/);
    });
});
describe('weergave: aantal artikelen en de eenheid', () => {
    it('het aantal artikelen is altijd exact, met en zonder binnendoos', () => {
        // Ronde 8 (#67): artikelenIsMinimum is vervallen en artikelenTekst zet nooit meer "min." voor het aantal.
        expect(artikelenTekst(480)).toBe('480');
        expect(artikelenTekst(480, 'en')).toBe('480');
        expect(artikelenTekst(144)).toBe('144');
        expect(inhoudEenheid({})).toBe('binnendozen');
        expect(inhoudEenheid({ zonderBinnendoos: true })).toBe('artikelen');
    });
    it('de resultaatkaart toont een exact aantal artikelen, en artikelen per buitendoos zonder binnendoos', () => {
        const met = bereken(ontwerp()).top[0];
        const html = renderToStaticMarkup(createElement(Kaart, { o: met.oplossing, rol: met.rol, uitleg: met.uitleg, gekozen: false, onKies: () => { } }));
        // Ronde 8 (#67): ook met een binnendoos zonder "min." ervoor.
        expect(html).toContain(`<dt>Artikelen per drager</dt><dd>${met.oplossing.artikelenPerDrager}</dd>`);
        expect(html).toContain('<dt>Binnendozen per buitendoos</dt>');
        const r = bereken(naarInvoer(bestaandZonder(), dragers, inst)).top[0];
        const zonder = renderToStaticMarkup(createElement(Kaart, { o: r.oplossing, rol: r.rol, uitleg: r.uitleg, gekozen: false, onKies: () => { }, zonderBinnendoos: true }));
        expect(zonder).toContain('<dt>Artikelen per drager</dt><dd>144</dd>');
        expect(zonder).toContain('<dt>Artikelen per buitendoos</dt><dd>6</dd>');
        expect(zonder).toContain('<strong>144</strong> artikelen per drager');
        expect(zonder).not.toContain('binnendozen');
    });
    it('het rapport: geen binnendoos, artikelen per doos en een exact aantal artikelen per drager', () => {
        const r = bereken(naarInvoer(bestaandZonder(), dragers, inst));
        const nl = blokken(r.invoer, r.top[0].oplossing, 'nl');
        expect(nl.binnendoos).toEqual({ titel: 'Binnendoos', rijen: [['Geen binnendoos', 'De buitendoos bevat de artikelen zelf.']], leeg: 'Geen binnendoos' });
        expect(nl.buitendoos.rijen[0]).toEqual(['Artikelen per doos', '6']);
        expect(nl.buitendoos.rijen.map(([label]) => label)).not.toContain('Dozen per laag');
        expect(nl.drager.rijen.at(-1)).toEqual(['Artikelen per drager', '144']);
        const en = blokken(r.invoer, r.top[0].oplossing, 'en');
        expect(en.binnendoos).toEqual({ titel: 'Inner box', rijen: [['No inner box', 'The outer box holds the articles directly.']], leeg: 'No inner box' });
        expect(en.buitendoos.rijen[0]).toEqual(['Articles per box', '6']);
        expect(en.drager.rijen.at(-1)).toEqual(['Articles per carrier', '144']);
    });
    it('het rapport: met en zonder binnendoos een exact aantal per doos en per drager', () => {
        // Ronde 8 (#67): weer "Aantal per doos" ("Quantity per box") zoals vóór ronde 5, en geen "min." per drager.
        const r = bereken(ontwerp());
        const o = r.top[0].oplossing;
        const nl = blokken(r.invoer, o, 'nl');
        expect(nl.binnendoos.rijen[0]).toEqual(['Aantal per doos', '2']);
        expect(nl.buitendoos.rijen[0]).toEqual(['Totaal aantal dozen', String(o.doos.binnendozenPerDoos)]);
        expect(nl.drager.rijen.at(-1)).toEqual(['Artikelen per drager', String(o.artikelenPerDrager)]);
        const en = blokken(r.invoer, o, 'en');
        expect(en.binnendoos.rijen[0]).toEqual(['Quantity per box', '2']);
        expect(en.drager.rijen.at(-1)).toEqual(['Articles per carrier', String(o.artikelenPerDrager)]);
        const a = bereken(ontwerp({ zonderBinnendoos: true, artikelenPerBinnendoos: 1 }));
        const art = blokken(a.invoer, a.top[0].oplossing, 'nl');
        expect(art.binnendoos.rijen[0]).toEqual(['Aantal per doos', '1']);
        expect(art.buitendoos.rijen[0][0]).toBe('Artikelen per doos');
        expect(art.drager.rijen.at(-1)).toEqual(['Artikelen per drager', String(a.top[0].oplossing.artikelenPerDrager)]);
    });
});
describe('schermen', () => {
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
    it('instap binnendoos: het veld heet "Artikelen per binnendoos" en staat op 2', () => {
        const html = scherm(leeg());
        // Ronde 8 (#67): het label is weer "Artikelen per binnendoos", zonder "Min.".
        expect(html).toContain('aria-label="Artikelen per binnendoos" value="2"');
        expect(html).toContain('Artikel zonder binnendoos (telt als binnendoos met 1 stuk)');
        expect(html).not.toContain('Binnendoos opgeven');
        expect(html).not.toContain('Min. artikelen per binnendoos');
    });
    it('bestaande buitendoos zonder binnendoos: alleen artikel en buitendoos, gewicht verplicht', () => {
        const html = scherm(bestaandZonder());
        expect(html).toContain('<h3>2. Artikel</h3>');
        expect(html).toContain('Binnendoos opgeven (alleen nodig om de inhoud van de buitendoos te berekenen)');
        for (const weg of [
            // Ronde 8 (#67): het veld heet nu "Artikelen per binnendoos"; zonder binnendoos staat het er niet.
            'Artikelen per binnendoos',
            'Gewicht gevulde binnendoos',
            // "Kantelbaar" staat er sinds ronde 6 wel, bij de buitendoos zelf (#64; zie ronde6.test.ts).
            'Artikel zonder binnendoos',
            'Binnenmaat en eigen gewicht opgeven',
            'Binnendozen per buitendoos',
            'Bij een bestaande buitendoos is de binnendoos optioneel',
            'Nog in te vullen',
        ])
            expect(html).not.toContain(weg);
        expect(html).toContain('<span class="veld-label">Artikelen per buitendoos</span>');
        expect(html).toMatch(/<span class="veld-label">Gevuld gewicht<\/span>.*?<span class="hint">Verplicht<\/span>/);
    });
    it('bestaande buitendoos met binnendoos: de binnendoosvelden en de binnenmaat komen terug', () => {
        const html = scherm(bestaandMet());
        expect(html).toContain('<h3>2. Artikel en binnendoos</h3>');
        // Ronde 8 (#67): zonder "Min.".
        expect(html).toContain('aria-label="Artikelen per binnendoos"');
        expect(html).toContain('Gewicht gevulde binnendoos');
        expect(html).toContain('<span class="veld-label">Binnendozen per buitendoos</span>');
        expect(html).toContain('Binnenmaat en eigen gewicht opgeven (de app berekent de inhoud)');
        expect(html).not.toContain('Artikel zonder binnendoos');
        expect(html).not.toContain('Nog in te vullen');
    });
    it('artikelen: de kolom heet "Artikelen per binnendoos"', () => {
        // Ronde 8 (#67): de kolom heet weer "Artikelen per binnendoos", zonder "Min.".
        const html = renderToStaticMarkup(createElement(Artikelen, { artikelen: {}, onOpslaan: async () => { }, onVerwijder: async () => { }, onBereken: () => { } }));
        expect(html).not.toContain('Artikelen per binnendoos'); // geen tabel zonder artikelen
        const a = {
            artikelcode: 'A1',
            omschrijving: '',
            artikelenPerBinnendoos: 2,
            zonderBinnendoos: false,
            binnendoos: { L: 300, B: 200, H: 150, gewicht: 2, kantelbaar: false, magVerticaal: { L: false, B: false } },
            bijgewerkt: '2026-01-01T00:00:00.000Z',
        };
        const tabel = renderToStaticMarkup(createElement(Artikelen, { artikelen: { A1: a }, onOpslaan: async () => { }, onVerwijder: async () => { }, onBereken: () => { } }));
        expect(tabel).toContain('<th>Artikelen per binnendoos</th>');
        expect(tabel).not.toContain('Min. artikelen per binnendoos');
    });
});
