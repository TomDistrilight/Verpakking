import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { regelUitBerekening } from '../data/opslag';
import { getal, inhoudEenheid } from '../engine/format';
import { downloadRapport } from '../pdf/rapport';
import { logoVoorPdf } from './logo';
export function Geschiedenis(props) {
    const [fout, setFout] = useState('');
    const [melding, setMelding] = useState('');
    async function naarOverzicht(b) {
        setFout('');
        const vervangen = await props.onNaarOverzicht(regelUitBerekening(b, b.oplossing, 'nl'));
        setMelding(vervangen
            ? `Berekening ${b.nummer} staat in het overzicht; de open regel van artikel ${b.artikelcode} is vervangen (verwachte leverdatum en taal blijven staan).`
            : `Berekening ${b.nummer} staat in het overzicht.`);
    }
    const lijst = [...props.berekeningen].sort((a, b) => (a.datum < b.datum ? 1 : -1));
    async function pdf(b, taal) {
        setFout('');
        try {
            // Het logo van de eerdere export, zodat het PDF hetzelfde blijft; anders het huidige logo.
            const logo = b.logo !== undefined ? b.logo : await logoVoorPdf(props.instellingen);
            await downloadRapport({ invoer: b.invoer, oplossing: b.oplossing, berekeningsnummer: b.nummer, datum: new Date(b.datum), logo }, taal);
        }
        catch (e) {
            setFout(`PDF maken mislukt: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    return (_jsxs("div", { className: "pagina", children: [_jsx("div", { className: "pagina-kop", children: _jsx("h2", { children: "Geschiedenis" }) }), _jsx("p", { children: "Elke berekening met een oplossing wordt hier met al zijn invoer, de top drie en het zoeklog bewaard, zodat het PDF later precies opnieuw te maken is." }), fout && _jsx("div", { className: "melding fout", children: fout }), melding && (_jsx("div", { className: "melding ok", role: "status", children: melding })), lijst.length === 0 ? (_jsx("p", { className: "leeg", children: "Nog geen berekeningen bewaard. Reken een artikel door op het rekenscherm." })) : (_jsxs("table", { className: "tabel", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Nummer" }), _jsx("th", { children: "Datum" }), _jsx("th", { children: "Artikel" }), _jsx("th", { children: "Buitendoos (mm)" }), _jsx("th", { children: "Per drager" }), _jsx("th", { children: "Drager" }), _jsx("th", {})] }) }), _jsx("tbody", { children: lijst.map((b) => {
                            const o = b.oplossing;
                            return (_jsxs("tr", { children: [_jsx("td", { children: b.nummer }), _jsx("td", { children: new Date(b.datum).toLocaleString('nl-NL') }), _jsx("td", { children: b.artikelcode }), _jsxs("td", { children: [getal(o.doos.L, 1), " \u00D7 ", getal(o.doos.B, 1), " \u00D7 ", getal(o.doos.H, 1), o.doos.geenBuitendoos && _jsx("div", { className: "klein", children: "geen buitendoos" })] }), _jsxs("td", { children: [o.binnendozenPerDrager !== null ? `${o.binnendozenPerDrager} ${inhoudEenheid(b.invoer)}` : `${o.buitendozenPerDrager} buitendozen`, " (", o.stapelwijze, ")"] }), _jsx("td", { children: b.invoer.drager.naam }), _jsxs("td", { className: "rij-acties", children: [_jsx("button", { className: "knop klein", onClick: () => void pdf(b, 'nl'), children: "PDF NL" }), _jsx("button", { className: "knop klein", onClick: () => void pdf(b, 'en'), children: "PDF EN" }), _jsx("button", { className: "knop klein secundair", onClick: () => void naarOverzicht(b), children: "Naar overzicht" }), _jsx("button", { className: "knop klein secundair", onClick: () => props.onOpenen(b), children: "Open invoer" }), _jsx("button", { className: "knop klein gevaar", onClick: () => {
                                                    if (confirm(`Berekening ${b.nummer} verwijderen?`))
                                                        void props.onVerwijder(b.nummer);
                                                }, children: "Verwijder" })] })] }, b.nummer));
                        }) })] }))] }));
}
