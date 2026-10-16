import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Overzicht van gekozen oplossingen: status van de levering, fysieke controle en PDF per regel.
import { useEffect, useMemo, useState } from 'react';
import { sorteerOverzicht } from '../data/opslag';
import { getal, inhoudEenheid } from '../engine/format';
import { leesCsv } from '../import/excel';
import { datumTekst, pasLeverdataToe, verwerkLeverdata } from '../import/leverdata';
import { downloadRapport } from '../pdf/rapport';
import { logoVoorPdf } from './logo';
import { Keuze, Vink } from './velden';
async function leesBestand(bestand) {
    if (/\.csv$/i.test(bestand.name) || bestand.type === 'text/csv')
        return [{ naam: bestand.name, data: leesCsv(await bestand.text()) }];
    const { default: readXlsxFile } = await import('read-excel-file/browser');
    const bladen = await readXlsxFile(bestand);
    return bladen.map((b) => ({ naam: b.sheet, data: b.data }));
}
/** Een volledige datum met een plausibel jaartal (zoals de import), of leeg. */
const bruikbareDatum = (v) => v === '' || /^2[01]\d\d-\d\d-\d\d$/.test(v);
/**
 * Datumveld dat pas opslaat bij een volledige datum. Tijdens het typen geeft de browser tussenwaarden
 * zoals 0002-11-15; die worden niet bewaard, zodat de regel niet verspringt in de sortering.
 */
function DatumVeld(props) {
    const [concept, setConcept] = useState(props.waarde ?? '');
    useEffect(() => setConcept(props.waarde ?? ''), [props.waarde]);
    return (_jsx("input", { type: "date", value: concept, "aria-label": props.label, onChange: (e) => {
            const v = e.target.value;
            setConcept(v);
            if (bruikbareDatum(v) && v !== (props.waarde ?? ''))
                props.onChange(v || null);
        }, onBlur: () => {
            if (!bruikbareDatum(concept))
                setConcept(props.waarde ?? '');
        } }));
}
const STATUS_TEKST = {
    bijwerken: 'bijwerken',
    ongewijzigd: 'ongewijzigd',
    gecontroleerd: 'al gecontroleerd',
    onbekend: 'niet in overzicht',
    fout: 'fout',
};
export function OverzichtGekozen(props) {
    const weergave = props.instellingen.overzicht;
    const [melding, setMelding] = useState(null);
    const [bezig, setBezig] = useState(null);
    const [bladen, setBladen] = useState([]);
    const [bladIdx, setBladIdx] = useState(0);
    const [bestandsnaam, setBestandsnaam] = useState('');
    const [zoek, setZoek] = useState('');
    const gevonden = useMemo(() => {
        const term = zoek.trim().toLowerCase();
        return term ? props.gekozen.filter((r) => r.artikelcode.toLowerCase().includes(term) || (r.invoer.omschrijving ?? '').toLowerCase().includes(term)) : props.gekozen;
    }, [props.gekozen, zoek]);
    const zichtbaar = useMemo(() => sorteerOverzicht(weergave.verbergGecontroleerd ? gevonden.filter((r) => !r.gecontroleerd) : gevonden, weergave.sortering), [gevonden, weergave]);
    // Alleen gecontroleerde regels die ook bij de zoekterm passen, zijn 'verborgen'.
    const verborgenGecontroleerd = weergave.verbergGecontroleerd ? gevonden.filter((r) => r.gecontroleerd).length : 0;
    const import_ = useMemo(() => (bladen[bladIdx] ? verwerkLeverdata(bladen[bladIdx].data, props.gekozen) : null), [bladen, bladIdx, props.gekozen]);
    const teller = (s) => import_?.rijen.filter((r) => r.status === s).length ?? 0;
    const aantalBijwerken = import_?.rijen.filter((r) => r.status === 'bijwerken').reduce((n, r) => n + r.regels.length, 0) ?? 0;
    async function wijzig(id, w) {
        await props.onWijzig((lijst) => lijst.map((r) => (r.id === id ? { ...r, ...w } : r)));
    }
    async function pdf(r) {
        setMelding(null);
        setBezig(r.id);
        try {
            // Het logo van de eerdere export, zodat het PDF gelijk blijft; anders het huidige logo.
            const logo = r.logo !== undefined ? r.logo : await logoVoorPdf(props.instellingen);
            await downloadRapport({ invoer: r.invoer, oplossing: r.oplossing, berekeningsnummer: r.nummer, datum: new Date(r.datum), logo }, r.taal);
            if (r.logo === undefined)
                await wijzig(r.id, { logo });
        }
        catch (e) {
            setMelding({ soort: 'fout', tekst: `PDF maken mislukt: ${e instanceof Error ? e.message : String(e)}` });
        }
        finally {
            setBezig(null);
        }
    }
    async function kiesBestand(bestand) {
        if (!bestand)
            return;
        setMelding(null);
        try {
            const b = await leesBestand(bestand);
            if (b.length === 0 || b.every((x) => x.data.length === 0))
                throw new Error('Het bestand is leeg.');
            setBestandsnaam(bestand.name);
            setBladen(b);
            setBladIdx(0);
        }
        catch (e) {
            setMelding({ soort: 'fout', tekst: `Bestand niet gelezen: ${e instanceof Error ? e.message : String(e)}` });
        }
    }
    async function toepassen() {
        if (!import_)
            return;
        const rijen = import_.rijen;
        await props.onWijzig((lijst) => pasLeverdataToe(lijst, rijen));
        const overgeslagen = [
            teller('onbekend') > 0 ? `${teller('onbekend')} niet in het overzicht` : '',
            teller('gecontroleerd') > 0 ? `${teller('gecontroleerd')} al gecontroleerd` : '',
            teller('fout') > 0 ? `${teller('fout')} met een fout` : '',
        ].filter(Boolean);
        setMelding({
            soort: 'ok',
            tekst: `Verwachte leverdatum bijgewerkt bij ${aantalBijwerken} ${aantalBijwerken === 1 ? 'regel' : 'regels'}.${overgeslagen.length > 0 ? ` Overgeslagen: ${overgeslagen.join(', ')}.` : ''}`,
        });
        setBladen([]);
        setBestandsnaam('');
    }
    return (_jsxs("div", { className: "pagina", children: [_jsx("div", { className: "pagina-kop", children: _jsx("h2", { children: "Overzicht gekozen oplossingen" }) }), _jsxs("p", { children: ["Een oplossing komt hier via ", _jsx("strong", { children: "Opslaan in overzicht" }), " op het rekenscherm of via ", _jsx("strong", { children: "Naar overzicht" }), " in de geschiedenis. Kies je opnieuw een oplossing voor een artikel dat nog niet fysiek gecontroleerd is, dan vervangt die de open regel; de verwachte leverdatum en de taal blijven staan."] }), melding && (_jsx("div", { className: `melding ${melding.soort}`, role: "status", children: melding.tekst })), _jsxs("div", { className: "overzicht-balk", children: [_jsxs("label", { className: "veld zoek", children: [_jsx("span", { className: "veld-label", children: "Zoeken" }), _jsx("input", { type: "search", value: zoek, placeholder: "Artikelnummer of omschrijving", "aria-label": "Zoeken op artikelnummer of omschrijving", onChange: (e) => setZoek(e.target.value) })] }), _jsx(Keuze, { label: "Sorteren op", waarde: weergave.sortering, opties: [
                            { waarde: 'levering', tekst: 'Verwachte levering (vroeg → laat)' },
                            { waarde: 'artikel', tekst: 'Artikelnummer' },
                            { waarde: 'gekozen', tekst: 'Laatst gekozen eerst' },
                        ], onChange: (v) => void props.onWeergave({ ...weergave, sortering: v }) }), _jsx(Vink, { label: "Gecontroleerde oplossingen verbergen", aan: weergave.verbergGecontroleerd, onChange: (v) => void props.onWeergave({ ...weergave, verbergGecontroleerd: v }) }), _jsxs("label", { className: "bestand", children: [_jsx("input", { type: "file", accept: ".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", onChange: (e) => {
                                    const bestand = e.target.files?.[0];
                                    // Leegmaken, zodat hetzelfde (verbeterde) bestand opnieuw gekozen kan worden.
                                    e.target.value = '';
                                    void kiesBestand(bestand);
                                } }), _jsx("span", { children: bestandsnaam ? `Gekozen: ${bestandsnaam}` : 'Leverdata importeren (Excel: kolom A artikelnummer, kolom B datum)' })] }), _jsx("a", { className: "knop secundair", href: "./voorbeeld-leverdata.xlsx", download: true, children: "Voorbeeldbestand leverdata" })] }), import_ && (_jsxs("div", { className: "paneel", children: [_jsxs("h3", { children: ["Leverdata uit ", bestandsnaam] }), bladen.length > 1 && (_jsx(Keuze, { label: "Werkblad", waarde: String(bladIdx), opties: bladen.map((b, i) => ({ waarde: String(i), tekst: b.naam })), onChange: (v) => setBladIdx(Number(v)) })), _jsxs("p", { className: "klein", children: [import_.kopRij ? 'De eerste rij is als kopregel overgeslagen. ' : '', "Alleen regels die nog niet fysiek gecontroleerd zijn krijgen de nieuwe datum. Artikelnummers die niet in het overzicht staan worden overgeslagen; er worden geen artikelen aangemaakt."] }), _jsxs("div", { className: "samenvatting", children: [_jsxs("span", { className: "label groen", children: [teller('bijwerken'), " bijwerken"] }), _jsxs("span", { className: "label", children: [teller('ongewijzigd'), " ongewijzigd"] }), _jsxs("span", { className: "label oranje", children: [teller('gecontroleerd'), " al gecontroleerd"] }), _jsxs("span", { className: "label", children: [teller('onbekend'), " niet in overzicht"] }), _jsxs("span", { className: "label rood", children: [teller('fout'), " fout"] })] }), import_.rijen.length > 0 && (_jsxs("table", { className: "tabel", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Rij" }), _jsx("th", { children: "Artikelnummer" }), _jsx("th", { children: "Verwachte levering" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Toelichting" })] }) }), _jsx("tbody", { children: import_.rijen.map((r) => (_jsxs("tr", { className: r.status === 'fout' ? 'status-fout' : r.status === 'bijwerken' ? 'status-nieuw' : '', children: [_jsx("td", { children: r.rij }), _jsx("td", { children: r.artikelcode }), _jsx("td", { children: datumTekst(r.datum) }), _jsx("td", { children: STATUS_TEKST[r.status] }), _jsx("td", { children: r.melding })] }, r.rij))) })] })), _jsxs("div", { className: "acties", children: [_jsxs("button", { className: "knop", disabled: aantalBijwerken === 0, onClick: () => void toepassen(), children: ["Toepassen (", aantalBijwerken, " ", aantalBijwerken === 1 ? 'regel' : 'regels', " bijwerken)"] }), _jsx("button", { className: "knop secundair", onClick: () => {
                                    setBladen([]);
                                    setBestandsnaam('');
                                }, children: "Annuleren" })] })] })), props.gekozen.length === 0 ? (_jsx("p", { className: "leeg", children: "Nog geen gekozen oplossingen. Reken een artikel door en kies Opslaan in overzicht." })) : (_jsxs(_Fragment, { children: [(verborgenGecontroleerd > 0 || zoek.trim() !== '') && (_jsxs("p", { className: "klein", children: [zichtbaar.length, " van ", props.gekozen.length, " ", props.gekozen.length === 1 ? 'regel' : 'regels', " zichtbaar", verborgenGecontroleerd > 0 ? `; ${verborgenGecontroleerd} gecontroleerde ${verborgenGecontroleerd === 1 ? 'oplossing' : 'oplossingen'} verborgen` : '', zoek.trim() !== '' ? `; zoekterm "${zoek.trim()}"` : '', "."] })), zichtbaar.length === 0 && _jsx("p", { className: "leeg", children: "Geen regels gevonden." }), _jsxs("table", { className: "tabel overzicht", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Artikel" }), _jsx("th", { children: "Buitendoos (mm)" }), _jsx("th", { children: "Per drager" }), _jsx("th", { children: "Berekening" }), _jsx("th", { children: "Verwachte levering" }), _jsx("th", { children: "Fysiek gecontroleerd" }), _jsx("th", { children: "PDF" }), _jsx("th", {})] }) }), _jsx("tbody", { children: zichtbaar.map((r) => {
                                    const o = r.oplossing;
                                    return (_jsxs("tr", { className: r.gecontroleerd ? 'gecontroleerd' : '', children: [_jsxs("td", { children: [_jsx("strong", { children: r.artikelcode }), r.invoer.omschrijving && _jsx("div", { className: "klein", children: r.invoer.omschrijving })] }), _jsxs("td", { children: [getal(o.doos.L, 1), " \u00D7 ", getal(o.doos.B, 1), " \u00D7 ", getal(o.doos.H, 1), _jsx("div", { className: "klein", children: o.doos.geenBuitendoos
                                                            ? 'geen buitendoos'
                                                            : o.doos.binnendozenPerDoos === null
                                                                ? 'inhoud onbekend'
                                                                : `${o.doos.binnendozenPerDoos} ${inhoudEenheid(r.invoer)} per doos` })] }), _jsxs("td", { children: [o.binnendozenPerDrager !== null ? `${o.binnendozenPerDrager} ${inhoudEenheid(r.invoer)}` : `${o.buitendozenPerDrager} buitendozen`, _jsxs("div", { className: "klein", children: [o.buitendozenPerDrager, " dozen op ", r.invoer.drager.naam.toLowerCase(), ", ", o.stapelwijze] })] }), _jsxs("td", { children: [r.nummer, _jsxs("div", { className: "klein", children: ["gekozen ", new Date(r.gekozenOp).toLocaleDateString('nl-NL')] })] }), _jsx("td", { children: _jsx(DatumVeld, { waarde: r.verwachteLevering, label: `Verwachte levering ${r.artikelcode}`, onChange: (v) => void wijzig(r.id, { verwachteLevering: v }) }) }), _jsx("td", { className: "midden", children: _jsx("input", { type: "checkbox", checked: r.gecontroleerd, "aria-label": `Fysiek gecontroleerd ${r.artikelcode}`, title: "Dozen en artikelen zijn geleverd zoals afgesproken met de leverancier en inkoop", onChange: (e) => void wijzig(r.id, { gecontroleerd: e.target.checked }) }) }), _jsxs("td", { className: "rij-acties", children: [_jsxs("select", { value: r.taal, "aria-label": `Taal PDF ${r.artikelcode}`, onChange: (e) => void wijzig(r.id, { taal: e.target.value }), children: [_jsx("option", { value: "nl", children: "NL" }), _jsx("option", { value: "en", children: "EN" })] }), _jsx("button", { className: "knop klein", disabled: bezig === r.id, onClick: () => void pdf(r), children: bezig === r.id ? 'PDF…' : 'PDF' })] }), _jsxs("td", { className: "rij-acties", children: [_jsx("button", { className: "knop klein secundair", onClick: () => props.onOpenen(r), children: "Open invoer" }), _jsx("button", { className: "knop klein gevaar", onClick: () => {
                                                            if (confirm(`Regel van artikel ${r.artikelcode} uit het overzicht verwijderen?`))
                                                                void props.onWijzig((lijst) => lijst.filter((x) => x.id !== r.id));
                                                        }, children: "Verwijder" })] })] }, r.id));
                                }) })] })] }))] }));
}
