import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { valideer } from '../engine/bereken';
import { FEFCO_0201 } from '../engine/karton';
import { STANDAARD_ARTIKELEN_PER_BINNENDOOS, TUSSENLAAG_STANDAARD } from '../engine/standaard';
import { regelUitBerekening, volgendNummer } from '../data/opslag';
import { downloadRapport } from '../pdf/rapport';
import { rekenAsync } from '../rekenen';
import { dragerVelden, metArtikel, naarInvoer } from './formulier';
import { logoVoorPdf } from './logo';
import { Detail, Overzicht } from './Resultaten';
import { Getal, Keuze, Rij, Sectie, Tekst, Vink } from './velden';
/** Waarde in de dragerkeuze voor de drager uit een geopende berekening. */
const SNAPSHOT = '__uit-berekening__';
/** Uitleg van de vormregel onder sectie 3; bij zacht met de ingestelde max. hoogte. */
const vormregelTekst = (regel, factor) => regel === 'zacht'
    ? `Vormregel: een buitendoos hoger dan breed wint alleen bij minstens 10% meer per drager, en is nooit hoger dan ${String(factor).replace('.', ',')} × de breedte; één laag binnendozen mag altijd. Aan te passen onder Instellingen.`
    : VORMREGEL_TEKST[regel];
const VORMREGEL_TEKST = {
    breedte: 'Vormregel: een buitendoos is niet hoger dan zijn breedte, behalve bij één laag binnendozen. Aan te passen onder Instellingen.',
    lengte: 'Vormregel: een buitendoos is niet hoger dan zijn lengte, behalve bij één laag binnendozen. Aan te passen onder Instellingen.',
    uit: 'Vormregel staat uit: de buitendoos mag hoger zijn dan breed. Aan te passen onder Instellingen.',
};
export function Berekenen(p) {
    const f = p.formulier;
    const zet = (wijziging) => p.setFormulier({ ...f, ...wijziging });
    const [resultaat, setResultaat] = useState(null);
    const [gekozen, setGekozen] = useState(null);
    const [huidig, setHuidig] = useState(null);
    const [bezig, setBezig] = useState(false);
    const [pdfBezig, setPdfBezig] = useState(false);
    /** Id van de oplossing die vanuit dit resultaat in het overzicht is gezet. */
    const [inOverzicht, setInOverzicht] = useState(null);
    const [melding, setMelding] = useState(null);
    const invoer = useMemo(() => naarInvoer(f, p.dragers, p.instellingen), [f, p.dragers, p.instellingen]);
    const fouten = useMemo(() => valideer(invoer), [invoer]);
    const drager = f.dragerSnapshot ?? p.dragers.find((d) => d.id === f.dragerId) ?? p.dragers[0];
    const isKar = drager?.type === 'kar';
    const actueleInvoer = useRef(invoer);
    actueleInvoer.current = invoer;
    // Een nieuwe invoer maakt een oud resultaat ongeldig.
    useEffect(() => {
        setResultaat(null);
        setGekozen(null);
        setHuidig(null);
        setInOverzicht(null);
    }, [invoer]);
    const codes = useMemo(() => Object.keys(p.artikelen).sort(), [p.artikelen]);
    const gevonden = p.artikelen[f.artikelcode.trim()];
    const binnendoosLeeg = [f.bd.L, f.bd.B, f.bd.H, f.bd.gewicht].every((v) => v.trim() === '');
    // Artikel dat automatisch is geladen tijdens het typen; zolang de gebruiker die gegevens niet
    // aanpast, mogen ze bij verder typen worden vervangen of weer leeggemaakt (bijv. 100 → 1002).
    const [autoGeladen, setAutoGeladen] = useState(null);
    const autoOngewijzigd = (() => {
        const a = autoGeladen ? p.artikelen[autoGeladen] : undefined;
        if (!a)
            return false;
        const m = metArtikel(f, a);
        return (JSON.stringify([m.bd, m.omschrijving, m.artikelenPerBinnendoos, m.zonderBinnendoos, m.zonderBuitendoos]) ===
            JSON.stringify([f.bd, f.omschrijving, f.artikelenPerBinnendoos, f.zonderBinnendoos, f.zonderBuitendoos]));
    })();
    /** Typen laadt een artikel alleen als dat geen gegevens van de gebruiker overschrijft. */
    function typArtikel(code) {
        const a = p.artikelen[code.trim()];
        if (a && (binnendoosLeeg || autoOngewijzigd)) {
            p.setFormulier(metArtikel({ ...f, artikelcode: code }, a));
            setAutoGeladen(a.artikelcode);
        }
        else if (!a && autoOngewijzigd) {
            p.setFormulier({
                ...f,
                artikelcode: code,
                omschrijving: '',
                artikelenPerBinnendoos: String(STANDAARD_ARTIKELEN_PER_BINNENDOOS),
                zonderBinnendoos: false,
                zonderBuitendoos: false,
                bd: { L: '', B: '', H: '', gewicht: '', kantelbaar: false, magL: false, magB: false },
            });
            setAutoGeladen(null);
        }
        else
            zet({ artikelcode: code });
    }
    function kiesDrager(id) {
        if (id === SNAPSHOT)
            return;
        const d = p.dragers.find((x) => x.id === id);
        if (d)
            zet({ dragerId: id, dragerSnapshot: null, drager: dragerVelden(d) });
    }
    async function reken() {
        setMelding(null);
        setBezig(true);
        const verzonden = invoer;
        try {
            const r = await rekenAsync(verzonden);
            // Alleen tonen als de invoer intussen niet is gewijzigd.
            if (actueleInvoer.current !== verzonden)
                return;
            setResultaat(r);
            setInOverzicht(null);
            const winnaar = r.top[0]?.oplossing ?? null;
            setGekozen(winnaar);
            if (winnaar) {
                const datum = new Date();
                const b = {
                    nummer: await volgendNummer(datum),
                    datum: datum.toISOString(),
                    artikelcode: r.invoer.artikelcode,
                    invoer: r.invoer,
                    oplossing: winnaar,
                    top: r.top,
                    log: r.log,
                };
                await p.onBerekeningOpslaan(b);
                if (actueleInvoer.current === verzonden)
                    setHuidig(b);
            }
        }
        catch (e) {
            setMelding({ soort: 'fout', tekst: e instanceof Error ? e.message : String(e) });
        }
        finally {
            setBezig(false);
        }
    }
    async function kies(o) {
        setGekozen(o);
        if (huidig) {
            const b = { ...huidig, oplossing: o };
            setHuidig(b);
            await p.onBerekeningOpslaan(b);
        }
    }
    async function pdf(taal) {
        if (!resultaat || !gekozen || !huidig)
            return;
        setPdfBezig(true);
        try {
            const logo = await logoVoorPdf(p.instellingen);
            await downloadRapport({ invoer: resultaat.invoer, oplossing: gekozen, berekeningsnummer: huidig.nummer, datum: new Date(huidig.datum), logo }, taal);
            const b = { ...huidig, oplossing: gekozen, logo };
            setHuidig(b);
            await p.onBerekeningOpslaan(b);
            setMelding({ soort: 'ok', tekst: `PDF gemaakt voor berekening ${huidig.nummer}.` });
        }
        catch (e) {
            setMelding({ soort: 'fout', tekst: `PDF maken mislukt: ${e instanceof Error ? e.message : String(e)}` });
        }
        finally {
            setPdfBezig(false);
        }
    }
    async function naarOverzicht(taal) {
        if (!resultaat || !gekozen || !huidig)
            return;
        const b = { ...huidig, oplossing: gekozen };
        const vervangen = await p.onNaarOverzicht(regelUitBerekening(b, gekozen, taal));
        setInOverzicht(gekozen.id);
        setMelding({
            soort: 'ok',
            tekst: vervangen
                ? `Oplossing voor artikel ${b.artikelcode} staat in het overzicht; de open regel van dit artikel is vervangen (verwachte leverdatum en taal blijven staan).`
                : `Oplossing voor artikel ${b.artikelcode} staat in het overzicht.`,
        });
    }
    async function artikelOpslaan() {
        const i = invoer;
        if (!i.artikelcode || !i.binnendoos)
            return;
        await p.onArtikelOpslaan({
            artikelcode: i.artikelcode,
            omschrijving: f.omschrijving.trim(),
            artikelenPerBinnendoos: i.artikelenPerBinnendoos,
            zonderBinnendoos: f.zonderBinnendoos,
            zonderBuitendoos: f.zonderBuitendoos,
            binnendoos: i.binnendoos,
            bijgewerkt: new Date().toISOString(),
        });
        setMelding({ soort: 'ok', tekst: `Artikel ${i.artikelcode} opgeslagen.` });
    }
    const bestaand = f.instap === 'bestaandeBuitendoos';
    // Bij een bestaande buitendoos is de binnendoos optioneel (ronde 5); zonder binnendoos bevat de buitendoos de artikelen zelf.
    const metBinnendoos = !bestaand || f.bestaand.metBinnendoos;
    // "Artikel zonder binnendoos" geldt alleen bij instap binnendoos; een achtergebleven vinkje telt bij een bestaande buitendoos niet.
    const artikelZonderBinnendoos = !bestaand && f.zonderBinnendoos;
    const bdLabel = artikelZonderBinnendoos ? 'artikel' : 'binnendoos';
    const titelArtikel = bestaand ? (metBinnendoos ? '2. Artikel en binnendoos' : '2. Artikel') : f.zonderBinnendoos ? '2. Artikel' : '2. Artikel en binnendoos';
    const binnendoosFouten = !invoer.binnendoos ||
        [invoer.binnendoos.L, invoer.binnendoos.B, invoer.binnendoos.H, invoer.binnendoos.gewicht].some((v) => !(v > 0)) ||
        !Number.isInteger(invoer.artikelenPerBinnendoos) ||
        invoer.artikelenPerBinnendoos < 1 ||
        (invoer.binnendoos.kantelbaar && !invoer.binnendoos.magVerticaal.L && !invoer.binnendoos.magVerticaal.B);
    return (_jsxs("div", { className: "berekenen", children: [_jsxs("div", { className: "formulier", children: [_jsx(Sectie, { titel: "1. Instap", children: _jsxs("div", { className: "tabs-klein", role: "radiogroup", "aria-label": "Instap", children: [_jsx("button", { className: f.instap === 'binnendoos' ? 'actief' : '', onClick: () => zet({ instap: 'binnendoos' }), role: "radio", "aria-checked": f.instap === 'binnendoos', children: "Artikel of binnendoos" }), _jsx("button", { className: f.instap === 'bestaandeBuitendoos' ? 'actief' : '', onClick: () => zet({ instap: 'bestaandeBuitendoos' }), role: "radio", "aria-checked": f.instap === 'bestaandeBuitendoos', children: "Bestaande buitendoos" })] }) }), _jsxs(Sectie, { titel: titelArtikel, rechts: f.instap === 'binnendoos' ? (_jsx("button", { className: "knop klein secundair", disabled: !invoer.artikelcode || binnendoosFouten, onClick: artikelOpslaan, children: "Opslaan als artikel" })) : undefined, children: [_jsxs(Rij, { children: [_jsx(Tekst, { label: "Artikelnummer", waarde: f.artikelcode, onChange: typArtikel, lijst: "artikelcodes", placeholder: "Typ of kies" }), _jsx(Tekst, { label: "Omschrijving", waarde: f.omschrijving, onChange: (v) => zet({ omschrijving: v }) })] }), gevonden && !binnendoosLeeg && !autoOngewijzigd && (_jsxs("button", { className: "knop klein secundair", onClick: () => p.setFormulier(metArtikel(f, gevonden)), children: ["Gegevens van artikel ", gevonden.artikelcode, " laden"] })), _jsx("datalist", { id: "artikelcodes", children: codes.map((c) => (_jsx("option", { value: c, children: p.artikelen[c].omschrijving }, c))) }), f.instap === 'binnendoos' && (_jsx(Vink, { label: "Artikel zonder binnendoos (telt als binnendoos met 1 stuk)", aan: f.zonderBinnendoos, onChange: (v) => zet({
                                    zonderBinnendoos: v,
                                    // Met binnendoos weer de standaard in plaats van de vaste 1 van een artikel zonder binnendoos.
                                    artikelenPerBinnendoos: v ? '1' : f.artikelenPerBinnendoos === '1' ? String(STANDAARD_ARTIKELEN_PER_BINNENDOOS) : f.artikelenPerBinnendoos,
                                }) })), bestaand && (_jsx(Vink, { label: "Binnendoos opgeven (alleen nodig om de inhoud van de buitendoos te berekenen)", aan: f.bestaand.metBinnendoos, onChange: (v) => zet({ bestaand: { ...f.bestaand, metBinnendoos: v } }) })), metBinnendoos && (_jsxs(_Fragment, { children: [_jsxs(Rij, { children: [_jsx(Getal, { label: `Lengte ${bdLabel}`, eenheid: "mm", waarde: f.bd.L, onChange: (v) => zet({ bd: { ...f.bd, L: v } }) }), _jsx(Getal, { label: `Breedte ${bdLabel}`, eenheid: "mm", waarde: f.bd.B, onChange: (v) => zet({ bd: { ...f.bd, B: v } }) }), _jsx(Getal, { label: `Hoogte ${bdLabel} (rechtop)`, eenheid: "mm", waarde: f.bd.H, onChange: (v) => zet({ bd: { ...f.bd, H: v } }) }), _jsx(Getal, { label: artikelZonderBinnendoos ? 'Gewicht artikel' : 'Gewicht gevulde binnendoos', eenheid: "kg", waarde: f.bd.gewicht, onChange: (v) => zet({ bd: { ...f.bd, gewicht: v } }) })] }), _jsxs(Rij, { children: [_jsx(Getal, { label: "Artikelen per binnendoos", waarde: artikelZonderBinnendoos ? '1' : f.artikelenPerBinnendoos, uit: artikelZonderBinnendoos, onChange: (v) => zet({ artikelenPerBinnendoos: v }) }), _jsxs("div", { className: "vinken", children: [_jsx(Vink, { label: "Kantelbaar", aan: f.bd.kantelbaar, onChange: (v) => zet({ bd: { ...f.bd, kantelbaar: v } }) }), _jsx(Vink, { label: "L mag verticaal", aan: f.bd.magL, uit: !f.bd.kantelbaar, onChange: (v) => zet({ bd: { ...f.bd, magL: v } }) }), _jsx(Vink, { label: "B mag verticaal", aan: f.bd.magB, uit: !f.bd.kantelbaar, onChange: (v) => zet({ bd: { ...f.bd, magB: v } }) })] })] })] }))] }), f.instap === 'bestaandeBuitendoos' ? (_jsxs(Sectie, { titel: "3. Bestaande buitendoos", children: [_jsxs(Rij, { children: [_jsx(Getal, { label: "Lengte (buitenmaat)", eenheid: "mm", waarde: f.bestaand.L, onChange: (v) => zet({ bestaand: { ...f.bestaand, L: v } }) }), _jsx(Getal, { label: "Breedte (buitenmaat)", eenheid: "mm", waarde: f.bestaand.B, onChange: (v) => zet({ bestaand: { ...f.bestaand, B: v } }) }), _jsx(Getal, { label: "Hoogte (buitenmaat)", eenheid: "mm", waarde: f.bestaand.H, onChange: (v) => zet({ bestaand: { ...f.bestaand, H: v } }) })] }), !metBinnendoos && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "vinken", children: [_jsx(Vink, { label: "Kantelbaar", aan: f.bestaand.kantelbaar, onChange: (v) => zet({ bestaand: { ...f.bestaand, kantelbaar: v } }) }), _jsx(Vink, { label: "L mag verticaal", aan: f.bestaand.magL, uit: !f.bestaand.kantelbaar, onChange: (v) => zet({ bestaand: { ...f.bestaand, magL: v } }) }), _jsx(Vink, { label: "B mag verticaal", aan: f.bestaand.magB, uit: !f.bestaand.kantelbaar, onChange: (v) => zet({ bestaand: { ...f.bestaand, magB: v } }) })] }), _jsx("p", { className: "hint ruimte-onder", children: "Kantelen mag, maar hoeft niet: gekanteld wint alleen bij minstens 10% meer per drager." })] })), _jsxs(Rij, { children: [_jsx(Getal, { label: "Gevuld gewicht", eenheid: "kg", 
                                        // Zonder binnendoos (of zonder binnenmaat) kan de app het gewicht niet uit de inhoud berekenen.
                                        hint: metBinnendoos && f.bestaand.metBinnenmaat ? undefined : 'Verplicht', waarde: f.bestaand.gevuld, onChange: (v) => zet({ bestaand: { ...f.bestaand, gevuld: v } }) }), _jsx(Getal, { label: metBinnendoos ? 'Binnendozen per buitendoos' : 'Artikelen per buitendoos', hint: "Optioneel", waarde: f.bestaand.aantal, onChange: (v) => zet({ bestaand: { ...f.bestaand, aantal: v } }) }), _jsx(Getal, { label: "Max. gevulde buitendoos", eenheid: "kg", waarde: f.maxGevuld, onChange: (v) => zet({ maxGevuld: v }) })] }), metBinnendoos && (_jsx(Vink, { label: "Binnenmaat en eigen gewicht opgeven (de app berekent de inhoud)", aan: f.bestaand.metBinnenmaat, onChange: (v) => zet({ bestaand: { ...f.bestaand, metBinnenmaat: v } }) })), metBinnendoos && f.bestaand.metBinnenmaat && (_jsxs(Rij, { children: [_jsx(Getal, { label: "Binnenlengte", eenheid: "mm", waarde: f.bestaand.binnenL, onChange: (v) => zet({ bestaand: { ...f.bestaand, binnenL: v } }) }), _jsx(Getal, { label: "Binnenbreedte", eenheid: "mm", waarde: f.bestaand.binnenB, onChange: (v) => zet({ bestaand: { ...f.bestaand, binnenB: v } }) }), _jsx(Getal, { label: "Binnenhoogte", eenheid: "mm", waarde: f.bestaand.binnenH, onChange: (v) => zet({ bestaand: { ...f.bestaand, binnenH: v } }) }), _jsx(Getal, { label: "Eigen gewicht", eenheid: "kg", waarde: f.bestaand.eigen, onChange: (v) => zet({ bestaand: { ...f.bestaand, eigen: v } }) })] }))] })) : (_jsxs(Sectie, { titel: "3. Buitendoos", children: [_jsx(Vink, { label: `Geen buitendoos: ${f.zonderBinnendoos ? 'het artikel' : 'de binnendoos'} gaat direct op de drager`, aan: f.zonderBuitendoos, onChange: (v) => zet({ zonderBuitendoos: v }) }), f.zonderBuitendoos ? (_jsxs("p", { className: "hint", children: ["Voor een groot of zwaar artikel zonder buitendoos. De app berekent hoe ", f.zonderBinnendoos ? 'het artikel' : 'de binnendoos', " zelf het best op de drager gestapeld wordt; doostype, max. gevulde buitendoos, minimum per doos en vormregel gelden dan niet. Kantelen mag alleen als dat hierboven is toegestaan. Het minimum per laag bij Ladingdrager geldt wel: past er maar \u00E9\u00E9n per laag, zet het dan op 1."] })) : (_jsxs(_Fragment, { children: [_jsxs(Rij, { children: [_jsx(Keuze, { label: "Doostype", waarde: f.doostype, opties: [
                                                    { waarde: '0201', tekst: 'FEFCO 0201, dubbele golf 7 mm' },
                                                    { waarde: 'custom', tekst: 'Custom' },
                                                ], onChange: (v) => zet({ doostype: v }) }), _jsx(Getal, { label: "Max. gevulde buitendoos", eenheid: "kg", waarde: f.maxGevuld, onChange: (v) => zet({ maxGevuld: v }) }), _jsx(Getal, { label: f.zonderBinnendoos ? 'Min. artikelen per buitendoos' : 'Min. binnendozen per buitendoos', waarde: f.minPerDoos, onChange: (v) => zet({ minPerDoos: v }) })] }), _jsx("p", { className: "hint", children: vormregelTekst(p.instellingen.vormregel, p.instellingen.vormFactor) }), f.doostype === '0201' ? (_jsxs("p", { className: "hint", children: ["Toeslag binnen \u2192 buiten: lengte +", FEFCO_0201.toeslagL, ", breedte +", FEFCO_0201.toeslagB, ", hoogte +", FEFCO_0201.toeslagH, " mm; karton", ' ', String(FEFCO_0201.kartonmassa).replace('.', ','), " kg/m\u00B2."] })) : (_jsxs(Rij, { children: [_jsx(Getal, { label: "Toeslag lengte", eenheid: "mm", waarde: f.custom.tL, onChange: (v) => zet({ custom: { ...f.custom, tL: v } }) }), _jsx(Getal, { label: "Toeslag breedte", eenheid: "mm", waarde: f.custom.tB, onChange: (v) => zet({ custom: { ...f.custom, tB: v } }) }), _jsx(Getal, { label: "Toeslag hoogte", eenheid: "mm", waarde: f.custom.tH, onChange: (v) => zet({ custom: { ...f.custom, tH: v } }) }), _jsx(Getal, { label: "Kartonmassa", eenheid: "kg/m\u00B2", waarde: f.custom.massa, onChange: (v) => zet({ custom: { ...f.custom, massa: v } }) })] }))] }))] })), _jsxs(Sectie, { titel: "4. Ladingdrager", children: [_jsxs(Rij, { children: [_jsx(Keuze, { label: "Drager", waarde: f.dragerSnapshot ? SNAPSHOT : f.dragerId, opties: [
                                            ...(f.dragerSnapshot ? [{ waarde: SNAPSHOT, tekst: `${f.dragerSnapshot.naam} (uit de geopende berekening)` }] : []),
                                            ...p.dragers.map((d) => ({ waarde: d.id, tekst: `${d.naam} (${d.lengte} × ${d.breedte} × ${d.hoogte} mm)` })),
                                        ], onChange: kiesDrager }), _jsx(Getal, { label: "Max. totale hoogte incl. drager", eenheid: "mm", waarde: f.drager.maxHoogte, onChange: (v) => zet({ drager: { ...f.drager, maxHoogte: v } }) }), _jsx(Getal, { label: "Max. totaalgewicht incl. drager", eenheid: "kg", waarde: f.drager.maxGewicht, onChange: (v) => zet({ drager: { ...f.drager, maxGewicht: v } }) }), _jsx(Getal, { label: f.instap === 'binnendoos' && f.zonderBuitendoos ? (f.zonderBinnendoos ? 'Min. artikelen per laag' : 'Min. binnendozen per laag') : 'Min. buitendozen per laag', waarde: f.minPerLaag, onChange: (v) => zet({ minPerLaag: v }) })] }), f.dragerSnapshot && (_jsxs("p", { className: "hint", children: ["Drager zoals vastgelegd in de geopende berekening: ", f.dragerSnapshot.naam, ", ", f.dragerSnapshot.lengte, " \u00D7 ", f.dragerSnapshot.breedte, " \u00D7 ", f.dragerSnapshot.hoogte, " mm,", ' ', f.dragerSnapshot.gewicht, " kg. Kies een drager uit de lijst om de huidige gegevens te gebruiken."] })), isKar ? (_jsx("p", { className: "hint", children: "Kar: geen overhang; het ladingvlak is de binnenmaat." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "vinken", children: [_jsx(Vink, { label: "Overhang toegestaan", aan: f.drager.overhangToegestaan, onChange: (v) => zet({ drager: { ...f.drager, overhangToegestaan: v } }) }), _jsx(Vink, { label: "Asymmetrische overhang toegestaan", aan: f.drager.asym, onChange: (v) => zet({ drager: { ...f.drager, asym: v } }) })] }), f.drager.overhangToegestaan && (_jsxs(Rij, { children: [_jsx(Getal, { label: "Max. voor", eenheid: "mm", waarde: f.drager.voor, onChange: (v) => zet({ drager: { ...f.drager, voor: v } }) }), _jsx(Getal, { label: "Max. achter", eenheid: "mm", waarde: f.drager.achter, onChange: (v) => zet({ drager: { ...f.drager, achter: v } }) }), _jsx(Getal, { label: "Max. links", eenheid: "mm", waarde: f.drager.links, onChange: (v) => zet({ drager: { ...f.drager, links: v } }) }), _jsx(Getal, { label: "Max. rechts", eenheid: "mm", waarde: f.drager.rechts, onChange: (v) => zet({ drager: { ...f.drager, rechts: v } }) })] }))] }))] }), _jsxs(Sectie, { titel: "5. Tussenlagen en materiaal", children: [_jsxs(Rij, { children: [_jsx(Keuze, { label: "Tussenlaag", waarde: f.tussenlaag.soort, opties: [
                                            { waarde: 'geen', tekst: 'Geen' },
                                            { waarde: 'karton', tekst: 'Karton' },
                                            { waarde: 'hout', tekst: 'Hout' },
                                        ], onChange: (v) => zet({
                                            tussenlaag: v === 'geen'
                                                ? { ...f.tussenlaag, soort: v }
                                                : { ...f.tussenlaag, soort: v, dikte: String(TUSSENLAAG_STANDAARD[v].dikte), gewicht: String(TUSSENLAAG_STANDAARD[v].gewicht) },
                                        }) }), f.tussenlaag.soort !== 'geen' && (_jsxs(_Fragment, { children: [_jsx(Getal, { label: "Na elke N lagen", waarde: f.tussenlaag.naElkeN, onChange: (v) => zet({ tussenlaag: { ...f.tussenlaag, naElkeN: v } }) }), _jsx(Getal, { label: "Dikte", eenheid: "mm", waarde: f.tussenlaag.dikte, onChange: (v) => zet({ tussenlaag: { ...f.tussenlaag, dikte: v } }) }), _jsx(Getal, { label: "Gewicht per stuk", eenheid: "kg", waarde: f.tussenlaag.gewicht, onChange: (v) => zet({ tussenlaag: { ...f.tussenlaag, gewicht: v } }) }), _jsx(Keuze, { label: "Maat", waarde: f.tussenlaag.maat, opties: [
                                                    { waarde: 'drager', tekst: 'Dragermaat' },
                                                    { waarde: 'lading', tekst: 'Ladingmaat' },
                                                ], onChange: (v) => zet({ tussenlaag: { ...f.tussenlaag, maat: v } }) })] }))] }), _jsxs("div", { className: "materiaal", children: [_jsxs("div", { children: [_jsx(Vink, { label: "Bodemvel", aan: f.materiaal.bodemvel, onChange: (v) => zet({ materiaal: { ...f.materiaal, bodemvel: v } }) }), f.materiaal.bodemvel && (_jsxs(Rij, { children: [_jsx(Getal, { label: "Dikte", eenheid: "mm", waarde: f.materiaal.bodemDikte, onChange: (v) => zet({ materiaal: { ...f.materiaal, bodemDikte: v } }) }), _jsx(Getal, { label: "Gewicht", eenheid: "kg", waarde: f.materiaal.bodemGewicht, onChange: (v) => zet({ materiaal: { ...f.materiaal, bodemGewicht: v } }) })] }))] }), _jsxs("div", { children: [_jsx(Vink, { label: "Topvel", aan: f.materiaal.topvel, onChange: (v) => zet({ materiaal: { ...f.materiaal, topvel: v } }) }), f.materiaal.topvel && (_jsxs(Rij, { children: [_jsx(Getal, { label: "Dikte", eenheid: "mm", waarde: f.materiaal.topDikte, onChange: (v) => zet({ materiaal: { ...f.materiaal, topDikte: v } }) }), _jsx(Getal, { label: "Gewicht", eenheid: "kg", waarde: f.materiaal.topGewicht, onChange: (v) => zet({ materiaal: { ...f.materiaal, topGewicht: v } }) })] }))] }), _jsxs("div", { children: [_jsx(Vink, { label: "Hoekprofielen", aan: f.materiaal.hoek, onChange: (v) => zet({ materiaal: { ...f.materiaal, hoek: v } }) }), f.materiaal.hoek && _jsx(Getal, { label: "Gewicht", eenheid: "kg", waarde: f.materiaal.hoekGewicht, onChange: (v) => zet({ materiaal: { ...f.materiaal, hoekGewicht: v } }) })] }), _jsxs("div", { children: [_jsx(Vink, { label: "Stretchfolie", aan: f.materiaal.folie, onChange: (v) => zet({ materiaal: { ...f.materiaal, folie: v } }) }), f.materiaal.folie && (_jsx(Getal, { label: "Gewicht", eenheid: "kg", waarde: f.materiaal.folieGewicht, onChange: (v) => zet({ materiaal: { ...f.materiaal, folieGewicht: v } }) }))] })] })] }), fouten.length > 0 && (_jsxs("div", { className: "melding waarschuwing", "aria-live": "polite", children: [_jsx("strong", { children: "Nog in te vullen of te corrigeren:" }), _jsx("ul", { children: fouten.map((m, i) => (_jsx("li", { children: m }, i))) })] })), _jsx("div", { className: "acties", children: _jsx("button", { className: "knop groot", disabled: fouten.length > 0 || bezig, onClick: reken, children: bezig ? 'Bezig met rekenen…' : 'Bereken' }) })] }), _jsxs("div", { className: "uitkomst", children: [melding && (_jsx("div", { className: `melding ${melding.soort === 'ok' ? 'ok' : 'fout'}`, role: "status", children: melding.tekst })), bezig && _jsx("div", { className: "laden", children: "Kandidaten genereren en testen\u2026" }), !bezig && !resultaat && (_jsxs("div", { className: "leeg", children: [_jsx("h2", { children: "Resultaten" }), _jsxs("p", { children: ["Vul de gegevens in en kies ", _jsx("strong", { children: "Bereken" }), ". De app toont tot drie oplossingen en legt uit waarom de voorkeursoptie bovenaan staat."] })] })), resultaat && _jsx(Overzicht, { resultaat: resultaat, gekozen: gekozen, onKies: (o) => void kies(o), nummer: huidig?.nummer }), resultaat && gekozen && (_jsx(Detail, { o: gekozen, invoer: resultaat.invoer, onPdf: pdf, bezig: pdfBezig, standaardTaal: "nl", onOverzicht: huidig ? (taal) => void naarOverzicht(taal) : undefined, inOverzicht: inOverzicht === gekozen.id }))] })] }));
}
