import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { leesArtikelen, leesBerekeningen, leesDragers, leesGekozen, leesInstellingen, schrijfArtikelen, schrijfBerekeningen, schrijfDragers, schrijfGekozen, schrijfInstellingen, zetInOverzicht, } from './data/opslag';
import { leegFormulier, metArtikel, vanInvoer } from './ui/formulier';
import { Berekenen } from './ui/Berekenen';
import { Artikelen } from './ui/Artikelen';
import { Dragers } from './ui/Dragers';
import { Import } from './ui/Import';
import { Geschiedenis } from './ui/Geschiedenis';
import { Instellingen } from './ui/Instellingen';
import { OverzichtGekozen } from './ui/OverzichtGekozen';
const TABS = [
    { id: 'berekenen', naam: 'Berekenen' },
    { id: 'overzicht', naam: 'Overzicht' },
    { id: 'artikelen', naam: 'Artikelen' },
    { id: 'dragers', naam: 'Dragers' },
    { id: 'import', naam: 'Excel-import' },
    { id: 'geschiedenis', naam: 'Geschiedenis' },
    { id: 'instellingen', naam: 'Instellingen' },
];
export function App() {
    const [tab, setTab] = useState('berekenen');
    const [gegevens, setGegevens] = useState(null);
    const [formulier, setFormulier] = useState(null);
    const [versie, setVersie] = useState(0);
    // Het overzicht wordt direct in het geheugen bijgewerkt (het scherm reageert meteen) en daarna in
    // volgorde opgeslagen, zodat snelle wijzigingen elkaar niet overschrijven.
    const gekozenNu = useRef([]);
    const wachtrij = useRef(Promise.resolve());
    const laad = useCallback(async () => {
        const [artikelen, dragers, instellingen, berekeningen, gekozen] = await Promise.all([
            leesArtikelen(),
            leesDragers(),
            leesInstellingen(),
            leesBerekeningen(),
            leesGekozen(),
        ]);
        gekozenNu.current = gekozen;
        setGegevens({ artikelen, dragers, instellingen, berekeningen, gekozen });
        setFormulier(leegFormulier(instellingen, dragers));
        setVersie((v) => v + 1);
    }, []);
    useEffect(() => {
        void laad();
    }, [laad]);
    if (!gegevens || !formulier)
        return _jsx("div", { className: "laden", children: "Laden\u2026" });
    const { artikelen, dragers, instellingen, berekeningen, gekozen } = gegevens;
    async function bewaarArtikelen(a) {
        await schrijfArtikelen(a);
        setGegevens((g) => g && { ...g, artikelen: a });
    }
    function wijzigGekozen(wijziging) {
        const { lijst, uit } = wijziging(gekozenNu.current);
        gekozenNu.current = lijst;
        setGegevens((g) => g && { ...g, gekozen: lijst });
        const stap = wachtrij.current.then(() => schrijfGekozen(lijst));
        wachtrij.current = stap.catch(() => undefined);
        return stap.then(() => uit);
    }
    /** Zet een gekozen oplossing in het overzicht; geeft true als een open regel is vervangen. */
    function naarOverzicht(regel) {
        return wijzigGekozen((lijst) => {
            const r = zetInOverzicht(lijst, regel);
            return { lijst: r.lijst, uit: r.vervangen };
        });
    }
    async function bewaarInstellingen(i) {
        const oud = instellingen;
        setGegevens((g) => g && { ...g, instellingen: i });
        // Velden van het rekenformulier die nog de oude standaard hebben, krijgen de nieuwe standaard.
        setFormulier((f) => {
            if (!f)
                return f;
            const tekst = (v) => String(v).replace('.', ',');
            const volg = (veld, vorig, nieuw) => (veld === tekst(vorig) ? tekst(nieuw) : veld);
            return {
                ...f,
                maxGevuld: volg(f.maxGevuld, oud.maxGevuldGewicht, i.maxGevuldGewicht),
                minPerDoos: volg(f.minPerDoos, oud.minBinnendozenPerDoos, i.minBinnendozenPerDoos),
                minPerLaag: volg(f.minPerLaag, oud.minBuitendozenPerLaag, i.minBuitendozenPerLaag),
            };
        });
        await schrijfInstellingen(i);
    }
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "kop", children: [_jsxs("div", { className: "merk", children: [_jsxs("svg", { viewBox: "0 0 32 32", width: "28", height: "28", "aria-hidden": "true", children: [_jsx("path", { d: "M16 3 28 9v14l-12 6L4 23V9z", fill: "#2F6DB5" }), _jsx("path", { d: "M16 3 28 9l-12 6L4 9z", fill: "#6FA8DC" }), _jsx("path", { d: "M16 15v14L4 23V9z", fill: "#245a99" })] }), _jsx("span", { children: "Verpakkingsapp" })] }), _jsx("nav", { "aria-label": "Hoofdmenu", children: TABS.map((t) => (_jsx("button", { className: tab === t.id ? 'actief' : '', onClick: () => setTab(t.id), "aria-current": tab === t.id ? 'page' : undefined, children: t.naam }, t.id))) })] }), _jsxs("main", { children: [tab === 'berekenen' && (_jsx(Berekenen, { formulier: formulier, setFormulier: setFormulier, artikelen: artikelen, dragers: dragers, instellingen: instellingen, onArtikelOpslaan: (a) => bewaarArtikelen({ ...artikelen, [a.artikelcode]: a }), onNaarOverzicht: naarOverzicht, onBerekeningOpslaan: async (b) => {
                            // Opslaan of bijwerken op nummer; het nummer is uniek (zie volgendNummer).
                            const huidige = await leesBerekeningen();
                            const lijst = huidige.some((x) => x.nummer === b.nummer) ? huidige.map((x) => (x.nummer === b.nummer ? b : x)) : [...huidige, b];
                            await schrijfBerekeningen(lijst);
                            setGegevens((g) => g && { ...g, berekeningen: lijst });
                        } })), tab === 'overzicht' && (_jsx(OverzichtGekozen, { gekozen: gekozen, instellingen: instellingen, onWijzig: (w) => wijzigGekozen((lijst) => ({ lijst: w(lijst), uit: undefined })), onWeergave: (w) => bewaarInstellingen({ ...instellingen, overzicht: w }), onOpenen: (r) => {
                            setFormulier(vanInvoer(r.invoer, formulier));
                            setTab('berekenen');
                        } })), tab === 'artikelen' && (_jsx(Artikelen, { artikelen: artikelen, onOpslaan: async (a, oud) => {
                            const nieuw = { ...artikelen };
                            if (oud && oud !== a.artikelcode)
                                delete nieuw[oud];
                            nieuw[a.artikelcode] = a;
                            await bewaarArtikelen(nieuw);
                        }, onVerwijder: async (code) => {
                            const nieuw = { ...artikelen };
                            delete nieuw[code];
                            await bewaarArtikelen(nieuw);
                        }, onBereken: (a) => {
                            setFormulier(metArtikel({ ...formulier, instap: 'binnendoos' }, a));
                            setTab('berekenen');
                        } })), tab === 'dragers' && (_jsx(Dragers, { dragers: dragers, onOpslaan: async (d) => {
                            await schrijfDragers(d);
                            setGegevens((g) => g && { ...g, dragers: d });
                            if (!d.some((x) => x.id === formulier.dragerId))
                                setFormulier(leegFormulier(instellingen, d));
                        } })), tab === 'import' && (_jsx(Import, { artikelen: artikelen, onOpslaan: async (lijst) => {
                            const nieuw = { ...artikelen };
                            for (const a of lijst)
                                nieuw[a.artikelcode] = a;
                            await bewaarArtikelen(nieuw);
                        } })), tab === 'geschiedenis' && (_jsx(Geschiedenis, { berekeningen: berekeningen, instellingen: instellingen, onOpenen: (b) => {
                            setFormulier(vanInvoer(b.invoer, formulier));
                            setTab('berekenen');
                        }, onNaarOverzicht: naarOverzicht, onVerwijder: async (nummer) => {
                            const lijst = berekeningen.filter((b) => b.nummer !== nummer);
                            await schrijfBerekeningen(lijst);
                            setGegevens((g) => g && { ...g, berekeningen: lijst });
                        } })), tab === 'instellingen' && (_jsx(Instellingen, { instellingen: instellingen, onOpslaan: bewaarInstellingen, onHerladen: laad }, versie))] }), _jsx("footer", { className: "voet", children: "Gegevens blijven in deze browser. Maak via Instellingen regelmatig een back-up." })] }));
}
