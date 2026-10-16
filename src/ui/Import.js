import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { kantelTekst, leesCsv, raadKoppeling, verwerk, VELDEN } from '../import/excel';
import { Keuze, Vink } from './velden';
async function leesBestand(bestand) {
    if (/\.csv$/i.test(bestand.name) || bestand.type === 'text/csv')
        return [{ naam: bestand.name, data: leesCsv(await bestand.text()) }];
    const { default: readXlsxFile } = await import('read-excel-file/browser');
    const bladen = await readXlsxFile(bestand);
    return bladen.map((b) => ({ naam: b.sheet, data: b.data }));
}
export function Import(props) {
    const [bladen, setBladen] = useState([]);
    const [bladIdx, setBladIdx] = useState(0);
    const [koppeling, setKoppeling] = useState(null);
    const [bevestigd, setBevestigd] = useState(new Set());
    const [melding, setMelding] = useState(null);
    const [bestandsnaam, setBestandsnaam] = useState('');
    const data = bladen[bladIdx]?.data ?? [];
    const rijen = useMemo(() => (koppeling ? verwerk(data, koppeling, props.artikelen) : []), [data, koppeling, props.artikelen]);
    const ontbrekend = koppeling ? VELDEN.filter((v) => v.verplicht && koppeling.kolommen[v.veld] === undefined) : [];
    // De askolommen tellen alleen mee als ook Kantelbaar gekoppeld is (ronde 8, #68).
    const assenZonderKantelbaar = !!koppeling && koppeling.kolommen.kantelbaar === undefined && (koppeling.kolommen.magL !== undefined || koppeling.kolommen.magB !== undefined);
    const kolomNamen = useMemo(() => {
        const breedte = data.reduce((m, r) => Math.max(m, r.length), 0);
        return Array.from({ length: breedte }, (_, i) => {
            const kop = koppeling?.kopRij ? data[0]?.[i] : undefined;
            const letter = String.fromCharCode(65 + (i % 26));
            return kop !== undefined && kop !== null && String(kop).trim() !== '' ? `${letter}: ${String(kop)}` : `Kolom ${letter}`;
        });
    }, [data, koppeling?.kopRij]);
    async function kies(bestand) {
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
            setKoppeling(raadKoppeling(b[0].data[0] ?? []));
            setBevestigd(new Set());
        }
        catch (e) {
            setMelding({ soort: 'fout', tekst: `Bestand niet gelezen: ${e instanceof Error ? e.message : String(e)}` });
        }
    }
    function kiesBlad(i) {
        setBladIdx(i);
        setKoppeling(raadKoppeling(bladen[i].data[0] ?? []));
        setBevestigd(new Set());
    }
    const tellingen = {
        nieuw: rijen.filter((r) => r.status === 'nieuw').length,
        gewijzigd: rijen.filter((r) => r.status === 'gewijzigd').length,
        ongewijzigd: rijen.filter((r) => r.status === 'ongewijzigd').length,
        fout: rijen.filter((r) => r.status === 'fout').length,
    };
    async function opslaan() {
        const op = rijen.filter((r) => r.artikel && (r.status === 'nieuw' || (r.status === 'gewijzigd' && bevestigd.has(r.artikelcode)))).map((r) => r.artikel);
        await props.onOpslaan(op);
        const overgeslagen = tellingen.gewijzigd - op.filter((a) => props.artikelen[a.artikelcode]).length;
        setMelding({
            soort: 'ok',
            tekst: `${op.length} artikelen opgeslagen (${tellingen.nieuw} nieuw, ${op.length - tellingen.nieuw} overschreven). ${overgeslagen} gewijzigde en ${tellingen.fout} foute rijen overgeslagen.`,
        });
        setBladen([]);
        setKoppeling(null);
    }
    const k = koppeling;
    return (_jsxs("div", { className: "pagina", children: [_jsx("div", { className: "pagina-kop", children: _jsx("h2", { children: "Excel-import" }) }), _jsx("p", { children: "Importeer artikelnummer, lengte, breedte, hoogte en gewicht (inclusief inhoud) van de binnendoos, en eventueel het aantal artikelen per binnendoos (leeg = 2) en of de binnendoos kantelbaar is (ja of nee). Bestanden: .xlsx of .csv." }), _jsxs("div", { className: "acties", children: [_jsxs("label", { className: "bestand", children: [_jsx("input", { type: "file", accept: ".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", onChange: (e) => void kies(e.target.files?.[0]) }), _jsx("span", { children: bestandsnaam ? `Gekozen: ${bestandsnaam}` : 'Kies een bestand' })] }), _jsx("a", { className: "knop secundair", href: "./voorbeeld-artikelen.xlsx", download: true, children: "Voorbeeldbestand downloaden" })] }), melding && _jsx("div", { className: `melding ${melding.soort}`, children: melding.tekst }), k && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "paneel", children: [_jsx("h3", { children: "Kolomkoppeling" }), bladen.length > 1 && (_jsx(Keuze, { label: "Werkblad", waarde: String(bladIdx), opties: bladen.map((b, i) => ({ waarde: String(i), tekst: b.naam })), onChange: (v) => kiesBlad(Number(v)) })), _jsx(Vink, { label: "Eerste rij bevat kolomnamen", aan: k.kopRij, onChange: (v) => setKoppeling({ ...k, kopRij: v }) }), _jsxs("div", { className: "koppeling", children: [VELDEN.map((v) => (_jsx(Keuze, { label: `${v.naam}${v.verplicht ? ' *' : ''}`, waarde: k.kolommen[v.veld] === undefined ? '' : String(k.kolommen[v.veld]), opties: [{ waarde: '', tekst: '(niet gebruiken)' }, ...kolomNamen.map((n, i) => ({ waarde: String(i), tekst: n }))], onChange: (x) => {
                                            const kolommen = { ...k.kolommen };
                                            if (x === '')
                                                delete kolommen[v.veld];
                                            else
                                                kolommen[v.veld] = Number(x);
                                            setKoppeling({ ...k, kolommen });
                                        } }, v.veld))), _jsx(Keuze, { label: "Eenheid maten", waarde: k.eenheidLengte, opties: [
                                            { waarde: 'mm', tekst: 'mm' },
                                            { waarde: 'cm', tekst: 'cm' },
                                            { waarde: 'm', tekst: 'm' },
                                        ], onChange: (x) => setKoppeling({ ...k, eenheidLengte: x }) }), _jsx(Keuze, { label: "Eenheid gewicht", waarde: k.eenheidGewicht, opties: [
                                            { waarde: 'kg', tekst: 'kg' },
                                            { waarde: 'g', tekst: 'gram' },
                                        ], onChange: (x) => setKoppeling({ ...k, eenheidGewicht: x }) })] }), ontbrekend.length > 0 && _jsxs("div", { className: "melding waarschuwing", children: ["Koppel nog: ", ontbrekend.map((v) => v.naam).join(', '), "."] }), assenZonderKantelbaar && _jsx("div", { className: "melding waarschuwing", children: "Koppel ook Kantelbaar: zonder die kolom tellen L mag verticaal en B mag verticaal niet mee." }), _jsx("p", { className: "klein", children: "H is de hoogte als de doos rechtop staat. Kantelbaar, L mag verticaal en B mag verticaal zijn ja of nee; leeg is nee. Is Kantelbaar ja zonder kolommen voor L en B, dan mogen L en B allebei verticaal. Zonder kolom Kantelbaar zijn nieuwe binnendozen niet kantelbaar en blijven de kantelrechten van bestaande artikelen behouden." })] }), ontbrekend.length === 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "samenvatting", children: [_jsxs("span", { className: "label groen", children: [tellingen.nieuw, " nieuw"] }), _jsxs("span", { className: "label oranje", children: [tellingen.gewijzigd, " gewijzigd"] }), _jsxs("span", { className: "label", children: [tellingen.ongewijzigd, " ongewijzigd"] }), _jsxs("span", { className: "label rood", children: [tellingen.fout, " fout"] }), tellingen.gewijzigd > 0 && (_jsx("button", { className: "knop klein secundair", onClick: () => setBevestigd(new Set(rijen.filter((r) => r.status === 'gewijzigd').map((r) => r.artikelcode))), children: "Alle wijzigingen bevestigen" }))] }), _jsxs("table", { className: "tabel", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Rij" }), _jsx("th", { children: "Artikelnummer" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Binnendoos (mm, kg)" }), _jsx("th", { children: "Details" }), _jsx("th", { children: "Overschrijven" })] }) }), _jsx("tbody", { children: rijen.map((r) => (_jsxs("tr", { className: `status-${r.status}`, children: [_jsx("td", { children: r.rij }), _jsx("td", { children: r.artikelcode }), _jsx("td", { children: r.status }), _jsx("td", { children: r.artikel
                                                        ? `${r.artikel.binnendoos.L} × ${r.artikel.binnendoos.B} × ${r.artikel.binnendoos.H}, ${r.artikel.binnendoos.gewicht} kg, ${r.artikel.artikelenPerBinnendoos} st., kantelbaar: ${kantelTekst(r.artikel.binnendoos)}`
                                                        : '' }), _jsx("td", { children: r.status === 'fout' ? r.fouten.join(' ') : r.wijzigingen.join('; ') }), _jsx("td", { children: r.status === 'gewijzigd' && (_jsx("input", { type: "checkbox", "aria-label": `Overschrijf ${r.artikelcode}`, checked: bevestigd.has(r.artikelcode), onChange: (e) => {
                                                            const s = new Set(bevestigd);
                                                            if (e.target.checked)
                                                                s.add(r.artikelcode);
                                                            else
                                                                s.delete(r.artikelcode);
                                                            setBevestigd(s);
                                                        } })) })] }, `${r.rij}`))) })] }), _jsx("div", { className: "acties", children: _jsxs("button", { className: "knop", disabled: tellingen.nieuw + bevestigd.size === 0, onClick: opslaan, children: ["Opslaan (", tellingen.nieuw, " nieuw, ", bevestigd.size, " overschrijven)"] }) })] }))] }))] }));
}
