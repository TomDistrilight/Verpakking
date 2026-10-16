import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { maakBackup, zetBackupTerug, wisAlles } from '../data/opslag';
import { g } from './formulier';
import { logoUitBestand, logoVoorPdf } from './logo';
import { Getal, Keuze, Rij } from './velden';
const t = (v) => (v === undefined || Number.isNaN(v) ? '' : String(v).replace('.', ','));
const opt = (v) => (v.trim() === '' ? undefined : g(v));
export function Instellingen(props) {
    const i = props.instellingen;
    const [velden, setVelden] = useState({
        maxGevuld: t(i.maxGevuldGewicht),
        minL: t(i.minBuitenmaat.L),
        minB: t(i.minBuitenmaat.B),
        minH: t(i.minBuitenmaat.H),
        maxL: t(i.maxBuitenmaat.L),
        maxB: t(i.maxBuitenmaat.B),
        maxH: t(i.maxBuitenmaat.H),
        tL: t(i.customDoostype.toeslagL),
        tB: t(i.customDoostype.toeslagB),
        tH: t(i.customDoostype.toeslagH),
        massa: t(i.customDoostype.kartonmassa),
        zoeklimiet: t(i.zoeklimiet),
        minPerDoos: t(i.minBinnendozenPerDoos),
        minPerLaag: t(i.minBuitendozenPerLaag),
        vormregel: i.vormregel,
        vormFactor: t(i.vormFactor),
        minSteun: t(i.minSteun),
    });
    const [melding, setMelding] = useState(null);
    const [logoUrl, setLogoUrl] = useState(null);
    useEffect(() => {
        void logoVoorPdf(i).then((l) => setLogoUrl(l?.dataUrl ?? null));
    }, [i]);
    const zet = (w) => setVelden({ ...velden, ...w });
    async function opslaan() {
        const nieuw = {
            ...i,
            maxGevuldGewicht: g(velden.maxGevuld),
            minBuitenmaat: { L: opt(velden.minL), B: opt(velden.minB), H: opt(velden.minH) },
            maxBuitenmaat: { L: opt(velden.maxL), B: opt(velden.maxB), H: opt(velden.maxH) },
            customDoostype: { soort: 'custom', toeslagL: g(velden.tL), toeslagB: g(velden.tB), toeslagH: g(velden.tH), kartonmassa: g(velden.massa) },
            zoeklimiet: Math.round(g(velden.zoeklimiet)),
            minBinnendozenPerDoos: g(velden.minPerDoos),
            minBuitendozenPerLaag: g(velden.minPerLaag),
            vormregel: velden.vormregel,
            // De max. hoogte geldt alleen bij de vormregel zacht; anders blijft de opgeslagen waarde staan.
            vormFactor: velden.vormregel === 'zacht' ? g(velden.vormFactor) : i.vormFactor,
            minSteun: g(velden.minSteun),
        };
        const getallen = [nieuw.maxGevuldGewicht, nieuw.customDoostype.toeslagL, nieuw.customDoostype.toeslagB, nieuw.customDoostype.toeslagH, nieuw.customDoostype.kartonmassa];
        if (getallen.some((x) => !(x >= 0)) || !(nieuw.maxGevuldGewicht > 0))
            return setMelding({ soort: 'fout', tekst: 'Controleer de getallen; ze moeten ingevuld en niet negatief zijn.' });
        if (!(nieuw.zoeklimiet >= 50))
            return setMelding({ soort: 'fout', tekst: 'De zoeklimiet moet minstens 50 voetafdrukken zijn.' });
        if (![nieuw.minBinnendozenPerDoos, nieuw.minBuitendozenPerLaag].every((x) => Number.isInteger(x) && x >= 1))
            return setMelding({ soort: 'fout', tekst: 'De minimumaantallen moeten gehele getallen van minstens 1 zijn.' });
        if (!(nieuw.minSteun >= 0 && nieuw.minSteun <= 100))
            return setMelding({ soort: 'fout', tekst: 'De minimale ondersteuning moet tussen 0 en 100% liggen.' });
        if (!(nieuw.vormFactor >= 1))
            return setMelding({ soort: 'fout', tekst: 'De max. hoogte bij de vormregel moet minstens 1 × de breedte zijn.' });
        const grenzen = [...Object.values(nieuw.minBuitenmaat), ...Object.values(nieuw.maxBuitenmaat)].filter((x) => x !== undefined);
        if (grenzen.some((x) => !(x > 0)))
            return setMelding({ soort: 'fout', tekst: 'Min./max. buitenmaat moet leeg zijn of groter dan 0.' });
        await props.onOpslaan(nieuw);
        setMelding({ soort: 'ok', tekst: 'Instellingen opgeslagen. Ze gelden voor nieuwe berekeningen.' });
    }
    async function exporteer() {
        const b = await maakBackup();
        const blob = new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `verpakkingsapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    async function importeer(bestand) {
        if (!bestand)
            return;
        try {
            const b = JSON.parse(await bestand.text());
            if (!confirm('Alle huidige gegevens in deze browser worden vervangen door de back-up. Doorgaan?'))
                return;
            await zetBackupTerug(b);
            await props.onHerladen();
            setMelding({ soort: 'ok', tekst: 'Back-up teruggezet.' });
        }
        catch (e) {
            setMelding({ soort: 'fout', tekst: `Back-up niet teruggezet: ${e instanceof Error ? e.message : String(e)}` });
        }
    }
    return (_jsxs("div", { className: "pagina", children: [_jsx("div", { className: "pagina-kop", children: _jsx("h2", { children: "Instellingen" }) }), melding && _jsx("div", { className: `melding ${melding.soort}`, children: melding.tekst }), _jsxs("div", { className: "paneel", children: [_jsx("h3", { children: "Standaarden voor nieuwe berekeningen" }), _jsxs(Rij, { children: [_jsx(Getal, { label: "Max. gevulde buitendoos", eenheid: "kg", waarde: velden.maxGevuld, onChange: (v) => zet({ maxGevuld: v }) }), _jsx(Getal, { label: "Zoeklimiet (voetafdrukken)", waarde: velden.zoeklimiet, hint: "Afkappen op aantal, niet op tijd", onChange: (v) => zet({ zoeklimiet: v }) })] }), _jsxs(Rij, { children: [_jsx(Getal, { label: "Min. binnendozen per buitendoos", waarde: velden.minPerDoos, hint: "Geldt voor een nieuw ontworpen buitendoos", onChange: (v) => zet({ minPerDoos: v }) }), _jsx(Getal, { label: "Min. buitendozen per laag", waarde: velden.minPerLaag, onChange: (v) => zet({ minPerLaag: v }) }), _jsx(Keuze, { label: "Vormregel buitendoos", waarde: velden.vormregel, opties: [
                                    { waarde: 'zacht', tekst: 'Hoger dan breed alleen bij minstens 10% meer' },
                                    { waarde: 'breedte', tekst: 'Niet hoger dan de breedte' },
                                    { waarde: 'lengte', tekst: 'Niet hoger dan de lengte' },
                                    { waarde: 'uit', tekst: 'Uit' },
                                ], onChange: (v) => zet({ vormregel: v }) }), _jsx(Getal, { label: "Max. hoogte (\u00D7 de breedte)", waarde: velden.vormFactor, uit: velden.vormregel !== 'zacht', onChange: (v) => zet({ vormFactor: v }) })] }), _jsx("p", { className: "hint", children: "Vormregel: breder en langer gaat voor hoger. Bij \"Hoger dan breed alleen bij minstens 10% meer\" wint een doos die hoger is dan breed alleen als hij minstens 10% meer binnendozen per drager geeft, en is hij nooit hoger dan de max. hoogte; de beste doos die niet hoger is dan breed staat dan ook in de top drie. Een doos met \u00E9\u00E9n laag binnendozen mag altijd, want dan bepaalt de binnendoos de hoogte." }), _jsx("h4", { children: "Verband: dozen tegen de rand van het blok" }), _jsx(Rij, { children: _jsx(Getal, { label: "Min. ondersteuning bij uitlijnen", eenheid: "%", waarde: velden.minSteun, hint: "Bij verband gaan de dozen waar mogelijk naar de buitenkant van het blok (alle lagen samen), zolang elke doos minstens dit deel van zijn grondvlak op de laag eronder houdt. De app kiest bij verband ook bij voorkeur lagen waarin elke doos zoveel steun heeft. Een rechte stapeling blijft gecentreerd.", onChange: (v) => zet({ minSteun: v }) }) }), _jsx("h4", { children: "Min. en max. buitenmaat (leeg = geen grens)" }), _jsxs(Rij, { children: [_jsx(Getal, { label: "Min. lengte", eenheid: "mm", waarde: velden.minL, onChange: (v) => zet({ minL: v }) }), _jsx(Getal, { label: "Min. breedte", eenheid: "mm", waarde: velden.minB, onChange: (v) => zet({ minB: v }) }), _jsx(Getal, { label: "Min. hoogte", eenheid: "mm", waarde: velden.minH, onChange: (v) => zet({ minH: v }) })] }), _jsxs(Rij, { children: [_jsx(Getal, { label: "Max. lengte", eenheid: "mm", waarde: velden.maxL, onChange: (v) => zet({ maxL: v }) }), _jsx(Getal, { label: "Max. breedte", eenheid: "mm", waarde: velden.maxB, onChange: (v) => zet({ maxB: v }) }), _jsx(Getal, { label: "Max. hoogte", eenheid: "mm", waarde: velden.maxH, onChange: (v) => zet({ maxH: v }) })] }), _jsx("h4", { children: "Standaardwaarden doostype custom" }), _jsxs(Rij, { children: [_jsx(Getal, { label: "Toeslag lengte", eenheid: "mm", waarde: velden.tL, onChange: (v) => zet({ tL: v }) }), _jsx(Getal, { label: "Toeslag breedte", eenheid: "mm", waarde: velden.tB, onChange: (v) => zet({ tB: v }) }), _jsx(Getal, { label: "Toeslag hoogte", eenheid: "mm", waarde: velden.tH, onChange: (v) => zet({ tH: v }) }), _jsx(Getal, { label: "Kartonmassa", eenheid: "kg/m\u00B2", waarde: velden.massa, onChange: (v) => zet({ massa: v }) })] }), _jsx("div", { className: "acties", children: _jsx("button", { className: "knop", onClick: opslaan, children: "Opslaan" }) })] }), _jsxs("div", { className: "paneel", children: [_jsx("h3", { children: "PDF" }), _jsx("p", { className: "hint", children: "Het PDF is standaard in het Nederlands; Engels kies je bij het exporteren." }), _jsxs("div", { className: "logo-rij", children: [_jsx("div", { className: "logo-voorbeeld", children: logoUrl ? _jsx("img", { src: logoUrl, alt: "Logo" }) : _jsx("span", { className: "klein", children: "Geen logo" }) }), _jsxs("label", { className: "bestand", children: [_jsx("input", { type: "file", accept: "image/png,image/jpeg", onChange: async (e) => {
                                            const f = e.target.files?.[0];
                                            if (!f)
                                                return;
                                            try {
                                                await props.onOpslaan({ ...i, logo: await logoUitBestand(f) });
                                                setMelding({ soort: 'ok', tekst: 'Logo opgeslagen.' });
                                            }
                                            catch (err) {
                                                setMelding({ soort: 'fout', tekst: err instanceof Error ? err.message : String(err) });
                                            }
                                        } }), _jsx("span", { children: "Eigen logo kiezen (PNG of JPG)" })] }), _jsx("button", { className: "knop secundair", onClick: () => void props.onOpslaan({ ...i, logo: null }), children: "Standaardlogo" }), _jsx("button", { className: "knop secundair", onClick: () => void props.onOpslaan({ ...i, logo: '' }), children: "Geen logo" })] })] }), _jsxs("div", { className: "paneel", children: [_jsx("h3", { children: "Gegevens" }), _jsx("p", { children: "Artikelen, dragers, instellingen, berekeningen en het overzicht van gekozen oplossingen staan alleen in deze browser. Maak regelmatig een back-up; met het back-upbestand zet je alles terug, ook op een andere computer." }), _jsxs("div", { className: "acties", children: [_jsx("button", { className: "knop", onClick: () => void exporteer(), children: "Back-up downloaden" }), _jsxs("label", { className: "bestand", children: [_jsx("input", { type: "file", accept: "application/json,.json", onChange: (e) => void importeer(e.target.files?.[0]) }), _jsx("span", { children: "Back-up terugzetten" })] }), _jsx("button", { className: "knop gevaar", onClick: async () => {
                                    if (!confirm('Alle artikelen, dragers, instellingen, berekeningen en het overzicht in deze browser wissen?'))
                                        return;
                                    await wisAlles();
                                    await props.onHerladen();
                                    setMelding({ soort: 'ok', tekst: 'Alle gegevens gewist.' });
                                }, children: "Alles wissen" })] })] })] }));
}
