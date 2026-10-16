import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { getal } from '../engine/format';
import { STANDAARD_ARTIKELEN_PER_BINNENDOOS } from '../engine/standaard';
import { g } from './formulier';
import { Getal, Rij, Tekst, Vink } from './velden';
const tekst = (v) => String(v).replace('.', ',');
/** Bewerkvelden van een artikel; zonder artikel die van een nieuw artikel (met de standaard 2 artikelen per binnendoos). */
export function naarBewerk(a) {
    if (!a)
        return {
            artikelcode: '',
            omschrijving: '',
            aantal: String(STANDAARD_ARTIKELEN_PER_BINNENDOOS),
            zonder: false,
            zonderBuitendoos: false,
            L: '',
            B: '',
            H: '',
            gewicht: '',
            kantelbaar: false,
            magL: false,
            magB: false,
            nieuw: true,
        };
    return {
        artikelcode: a.artikelcode,
        omschrijving: a.omschrijving,
        aantal: tekst(a.artikelenPerBinnendoos),
        zonder: a.zonderBinnendoos,
        zonderBuitendoos: !!a.zonderBuitendoos,
        L: tekst(a.binnendoos.L),
        B: tekst(a.binnendoos.B),
        H: tekst(a.binnendoos.H),
        gewicht: tekst(a.binnendoos.gewicht),
        kantelbaar: a.binnendoos.kantelbaar,
        magL: a.binnendoos.magVerticaal.L,
        magB: a.binnendoos.magVerticaal.B,
        nieuw: false,
    };
}
export function Artikelen(props) {
    const [zoek, setZoek] = useState('');
    const [bewerk, setBewerk] = useState(null);
    const [oudeCode, setOudeCode] = useState();
    const [fout, setFout] = useState('');
    const lijst = useMemo(() => {
        const z = zoek.trim().toLowerCase();
        return Object.values(props.artikelen)
            .filter((a) => !z || a.artikelcode.toLowerCase().includes(z) || a.omschrijving.toLowerCase().includes(z))
            .sort((a, b) => a.artikelcode.localeCompare(b.artikelcode, 'nl', { numeric: true }));
    }, [props.artikelen, zoek]);
    async function opslaan() {
        if (!bewerk)
            return;
        const code = bewerk.artikelcode.trim();
        const maten = [g(bewerk.L), g(bewerk.B), g(bewerk.H), g(bewerk.gewicht)];
        const aantal = bewerk.zonder ? 1 : g(bewerk.aantal);
        if (!code)
            return setFout('Vul een artikelnummer in.');
        if (maten.some((m) => !(m > 0)))
            return setFout('Lengte, breedte, hoogte en gewicht moeten groter dan 0 zijn.');
        if (!Number.isInteger(aantal) || aantal < 1)
            return setFout('Artikelen per binnendoos moet een geheel getal van minstens 1 zijn.');
        if (bewerk.kantelbaar && !bewerk.magL && !bewerk.magB)
            return setFout('Kies bij kantelbaar welke as verticaal mag staan.');
        if (code !== oudeCode && props.artikelen[code])
            return setFout(`Artikelnummer ${code} bestaat al.`);
        await props.onOpslaan({
            artikelcode: code,
            omschrijving: bewerk.omschrijving.trim(),
            artikelenPerBinnendoos: aantal,
            zonderBinnendoos: bewerk.zonder,
            ...(bewerk.zonderBuitendoos ? { zonderBuitendoos: true } : {}),
            binnendoos: {
                L: maten[0],
                B: maten[1],
                H: maten[2],
                gewicht: maten[3],
                kantelbaar: bewerk.kantelbaar,
                magVerticaal: { L: bewerk.kantelbaar && bewerk.magL, B: bewerk.kantelbaar && bewerk.magB },
            },
            bijgewerkt: new Date().toISOString(),
        }, oudeCode);
        setBewerk(null);
        setFout('');
    }
    const b = bewerk;
    return (_jsxs("div", { className: "pagina", children: [_jsxs("div", { className: "pagina-kop", children: [_jsx("h2", { children: "Artikelen" }), _jsxs("div", { className: "acties", children: [_jsx("input", { className: "zoek", placeholder: "Zoek op nummer of omschrijving", value: zoek, onChange: (e) => setZoek(e.target.value), "aria-label": "Zoeken" }), _jsx("button", { className: "knop", onClick: () => {
                                    setBewerk(naarBewerk());
                                    setOudeCode(undefined);
                                    setFout('');
                                }, children: "Nieuw artikel" })] })] }), b && (_jsxs("div", { className: "paneel", children: [_jsx("h3", { children: b.nieuw ? 'Nieuw artikel' : `Artikel ${oudeCode} bewerken` }), _jsxs(Rij, { children: [_jsx(Tekst, { label: "Artikelnummer", waarde: b.artikelcode, onChange: (v) => setBewerk({ ...b, artikelcode: v }) }), _jsx(Tekst, { label: "Omschrijving", waarde: b.omschrijving, onChange: (v) => setBewerk({ ...b, omschrijving: v }) }), _jsx(Getal, { label: "Artikelen per binnendoos", waarde: b.aantal, uit: b.zonder, onChange: (v) => setBewerk({ ...b, aantal: v }) })] }), _jsxs("div", { className: "vinken", children: [_jsx(Vink, { label: "Artikel zonder binnendoos (telt als binnendoos met 1 stuk)", aan: b.zonder, onChange: (v) => setBewerk({ ...b, zonder: v, aantal: v ? '1' : b.aantal === '1' ? String(STANDAARD_ARTIKELEN_PER_BINNENDOOS) : b.aantal }) }), _jsx(Vink, { label: `Geen buitendoos: ${b.zonder ? 'het artikel' : 'de binnendoos'} gaat direct op de drager`, aan: b.zonderBuitendoos, onChange: (v) => setBewerk({ ...b, zonderBuitendoos: v }) })] }), _jsxs(Rij, { children: [_jsx(Getal, { label: "Lengte", eenheid: "mm", waarde: b.L, onChange: (v) => setBewerk({ ...b, L: v }) }), _jsx(Getal, { label: "Breedte", eenheid: "mm", waarde: b.B, onChange: (v) => setBewerk({ ...b, B: v }) }), _jsx(Getal, { label: "Hoogte (rechtop)", eenheid: "mm", waarde: b.H, onChange: (v) => setBewerk({ ...b, H: v }) }), _jsx(Getal, { label: b.zonder ? 'Gewicht' : 'Gewicht gevuld', eenheid: "kg", waarde: b.gewicht, onChange: (v) => setBewerk({ ...b, gewicht: v }) })] }), _jsxs("div", { className: "vinken", children: [_jsx(Vink, { label: "Kantelbaar", aan: b.kantelbaar, onChange: (v) => setBewerk({ ...b, kantelbaar: v }) }), _jsx(Vink, { label: "L mag verticaal", aan: b.magL, uit: !b.kantelbaar, onChange: (v) => setBewerk({ ...b, magL: v }) }), _jsx(Vink, { label: "B mag verticaal", aan: b.magB, uit: !b.kantelbaar, onChange: (v) => setBewerk({ ...b, magB: v }) })] }), fout && _jsx("div", { className: "melding fout", children: fout }), _jsxs("div", { className: "acties", children: [_jsx("button", { className: "knop", onClick: opslaan, children: "Opslaan" }), _jsx("button", { className: "knop secundair", onClick: () => setBewerk(null), children: "Annuleren" })] })] })), lijst.length === 0 ? (_jsx("p", { className: "leeg", children: "Nog geen artikelen. Voeg er een toe, importeer een Excel-bestand of sla een artikel op vanuit het rekenscherm." })) : (_jsxs("table", { className: "tabel", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Artikelnummer" }), _jsx("th", { children: "Omschrijving" }), _jsx("th", { children: "Binnendoos L \u00D7 B \u00D7 H (mm)" }), _jsx("th", { children: "Gewicht (kg)" }), _jsx("th", { children: "Artikelen per binnendoos" }), _jsx("th", { children: "Kantelbaar" }), _jsx("th", {})] }) }), _jsx("tbody", { children: lijst.map((a) => (_jsxs("tr", { children: [_jsx("td", { children: a.artikelcode }), _jsx("td", { children: a.omschrijving }), _jsxs("td", { children: [getal(a.binnendoos.L, 1), " \u00D7 ", getal(a.binnendoos.B, 1), " \u00D7 ", getal(a.binnendoos.H, 1), a.zonderBinnendoos && _jsx("span", { className: "label", children: "artikel" }), a.zonderBuitendoos && _jsx("span", { className: "label", children: "geen buitendoos" })] }), _jsx("td", { children: getal(a.binnendoos.gewicht, 3) }), _jsx("td", { children: a.artikelenPerBinnendoos }), _jsx("td", { children: a.binnendoos.kantelbaar ? `ja (${[a.binnendoos.magVerticaal.L && 'L', a.binnendoos.magVerticaal.B && 'B'].filter(Boolean).join(', ')})` : 'nee' }), _jsxs("td", { className: "rij-acties", children: [_jsx("button", { className: "knop klein", onClick: () => props.onBereken(a), children: "Bereken" }), _jsx("button", { className: "knop klein secundair", onClick: () => {
                                                setBewerk(naarBewerk(a));
                                                setOudeCode(a.artikelcode);
                                                setFout('');
                                            }, children: "Bewerk" }), _jsx("button", { className: "knop klein gevaar", onClick: () => {
                                                if (confirm(`Artikel ${a.artikelcode} verwijderen?`))
                                                    void props.onVerwijder(a.artikelcode);
                                            }, children: "Verwijder" })] })] }, a.artikelcode))) })] })), _jsxs("p", { className: "klein", children: [Object.keys(props.artikelen).length, " artikelen opgeslagen in deze browser."] })] }));
}
