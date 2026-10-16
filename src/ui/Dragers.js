import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { STANDAARD_DRAGERS, kopieDrager } from '../engine/standaard';
import { getal } from '../engine/format';
import { g } from './formulier';
import { Getal, Keuze, Rij, Tekst, Vink } from './velden';
const t = (v) => (Number.isNaN(v) ? '' : String(v).replace('.', ','));
function naarVelden(d) {
    return {
        naam: d.naam,
        lengte: t(d.lengte),
        breedte: t(d.breedte),
        hoogte: t(d.hoogte),
        gewicht: t(d.gewicht),
        maxGewicht: t(d.maxTotaalGewicht),
        maxHoogte: t(d.maxTotaleHoogte),
        voor: t(d.overhang.voor),
        achter: t(d.overhang.achter),
        links: t(d.overhang.links),
        rechts: t(d.overhang.rechts),
    };
}
export function Dragers(props) {
    const [bewerk, setBewerk] = useState(null);
    const [fout, setFout] = useState('');
    function start(d, nieuw) {
        setBewerk({ d: kopieDrager(d), v: naarVelden(d), nieuw });
        setFout('');
    }
    async function opslaan() {
        if (!bewerk)
            return;
        const { v, d } = bewerk;
        const nieuw = {
            ...d,
            naam: v.naam.trim(),
            lengte: g(v.lengte),
            breedte: g(v.breedte),
            hoogte: g(v.hoogte),
            gewicht: g(v.gewicht),
            maxTotaalGewicht: g(v.maxGewicht),
            maxTotaleHoogte: g(v.maxHoogte),
            overhang: { voor: g(v.voor) || 0, achter: g(v.achter) || 0, links: g(v.links) || 0, rechts: g(v.rechts) || 0 },
            overhangToegestaan: d.type === 'kar' ? false : d.overhangToegestaan,
        };
        if (!nieuw.naam)
            return setFout('Geef de drager een naam.');
        if (![nieuw.lengte, nieuw.breedte, nieuw.maxTotaalGewicht, nieuw.maxTotaleHoogte].every((x) => x > 0))
            return setFout('Lengte, breedte en de maxima moeten groter dan 0 zijn.');
        if (!(nieuw.hoogte >= 0) || !(nieuw.gewicht >= 0))
            return setFout('Hoogte en gewicht mogen niet negatief zijn; vul ze expliciet in.');
        if (nieuw.maxTotaleHoogte <= nieuw.hoogte)
            return setFout('De maximale totale hoogte moet groter zijn dan de hoogte van de drager.');
        const lijst = bewerk.nieuw ? [...props.dragers, nieuw] : props.dragers.map((x) => (x.id === nieuw.id ? nieuw : x));
        await props.onOpslaan(lijst);
        setBewerk(null);
    }
    const b = bewerk;
    const zet = (w) => b && setBewerk({ ...b, v: { ...b.v, ...w } });
    return (_jsxs("div", { className: "pagina", children: [_jsxs("div", { className: "pagina-kop", children: [_jsx("h2", { children: "Ladingdragers" }), _jsxs("div", { className: "acties", children: [_jsx("button", { className: "knop", onClick: () => start({
                                    ...kopieDrager(STANDAARD_DRAGERS[0]),
                                    id: `drager-${Date.now()}`,
                                    naam: '',
                                    type: 'pallet',
                                }, true), children: "Nieuwe drager" }), _jsx("button", { className: "knop secundair", onClick: () => start({
                                    ...kopieDrager(STANDAARD_DRAGERS[0]),
                                    id: `kar-${Date.now()}`,
                                    naam: '',
                                    type: 'kar',
                                    hoogte: Number.NaN,
                                    gewicht: Number.NaN,
                                    overhangToegestaan: false,
                                }, true), children: "Nieuwe kar" })] })] }), b && (_jsxs("div", { className: "paneel", children: [_jsx("h3", { children: b.nieuw ? (b.d.type === 'kar' ? 'Nieuwe kar' : 'Nieuwe drager') : `${b.d.naam} bewerken` }), _jsxs(Rij, { children: [_jsx(Tekst, { label: "Naam", waarde: b.v.naam, onChange: (x) => zet({ naam: x }) }), _jsx(Keuze, { label: "Type", waarde: b.d.type, opties: [
                                    { waarde: 'pallet', tekst: 'Pallet' },
                                    { waarde: 'kar', tekst: 'Kar / rolcontainer' },
                                ], onChange: (x) => setBewerk({ ...b, d: { ...b.d, type: x, overhangToegestaan: x === 'kar' ? false : b.d.overhangToegestaan } }) })] }), _jsxs(Rij, { children: [_jsx(Getal, { label: b.d.type === 'kar' ? 'Binnenlengte (voor → achter)' : 'Lengte (voor → achter)', eenheid: "mm", waarde: b.v.lengte, onChange: (x) => zet({ lengte: x }) }), _jsx(Getal, { label: b.d.type === 'kar' ? 'Binnenbreedte' : 'Breedte (voorzijde)', eenheid: "mm", waarde: b.v.breedte, onChange: (x) => zet({ breedte: x }) }), _jsx(Getal, { label: b.d.type === 'kar' ? 'Vloerhoogte' : 'Eigen hoogte', eenheid: "mm", waarde: b.v.hoogte, onChange: (x) => zet({ hoogte: x }) }), _jsx(Getal, { label: "Eigen gewicht", eenheid: "kg", waarde: b.v.gewicht, hint: b.d.type === 'kar' ? 'Expliciet invullen; 25 kg/m² is hoogstens een startwaarde.' : undefined, onChange: (x) => zet({ gewicht: x }) })] }), _jsxs(Rij, { children: [_jsx(Getal, { label: "Max. totaalgewicht incl. drager", eenheid: "kg", waarde: b.v.maxGewicht, onChange: (x) => zet({ maxGewicht: x }) }), _jsx(Getal, { label: "Max. totale hoogte incl. drager", eenheid: "mm", waarde: b.v.maxHoogte, onChange: (x) => zet({ maxHoogte: x }) })] }), b.d.type === 'pallet' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "vinken", children: [_jsx(Vink, { label: "Overhang toegestaan", aan: b.d.overhangToegestaan, onChange: (x) => setBewerk({ ...b, d: { ...b.d, overhangToegestaan: x } }) }), _jsx(Vink, { label: "Asymmetrische overhang toegestaan", aan: b.d.asymmetrieToegestaan, onChange: (x) => setBewerk({ ...b, d: { ...b.d, asymmetrieToegestaan: x } }) })] }), _jsxs(Rij, { children: [_jsx(Getal, { label: "Max. voor", eenheid: "mm", waarde: b.v.voor, uit: !b.d.overhangToegestaan, onChange: (x) => zet({ voor: x }) }), _jsx(Getal, { label: "Max. achter", eenheid: "mm", waarde: b.v.achter, uit: !b.d.overhangToegestaan, onChange: (x) => zet({ achter: x }) }), _jsx(Getal, { label: "Max. links", eenheid: "mm", waarde: b.v.links, uit: !b.d.overhangToegestaan, onChange: (x) => zet({ links: x }) }), _jsx(Getal, { label: "Max. rechts", eenheid: "mm", waarde: b.v.rechts, uit: !b.d.overhangToegestaan, onChange: (x) => zet({ rechts: x }) })] })] })), fout && _jsx("div", { className: "melding fout", children: fout }), _jsxs("div", { className: "acties", children: [_jsx("button", { className: "knop", onClick: opslaan, children: "Opslaan" }), _jsx("button", { className: "knop secundair", onClick: () => setBewerk(null), children: "Annuleren" })] })] })), _jsxs("table", { className: "tabel", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Naam" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Ladingvlak (mm)" }), _jsx("th", { children: "Hoogte (mm)" }), _jsx("th", { children: "Gewicht (kg)" }), _jsx("th", { children: "Max. hoogte (mm)" }), _jsx("th", { children: "Max. gewicht (kg)" }), _jsx("th", { children: "Overhang v/a/l/r (mm)" }), _jsx("th", {})] }) }), _jsx("tbody", { children: props.dragers.map((d) => (_jsxs("tr", { children: [_jsx("td", { children: d.naam }), _jsx("td", { children: d.type === 'kar' ? 'kar' : 'pallet' }), _jsxs("td", { children: [getal(d.lengte, 1), " \u00D7 ", getal(d.breedte, 1)] }), _jsx("td", { children: getal(d.hoogte, 1) }), _jsx("td", { children: getal(d.gewicht, 1) }), _jsx("td", { children: getal(d.maxTotaleHoogte, 1) }), _jsx("td", { children: getal(d.maxTotaalGewicht, 1) }), _jsx("td", { children: d.overhangToegestaan ? `${d.overhang.voor} / ${d.overhang.achter} / ${d.overhang.links} / ${d.overhang.rechts}` : 'geen' }), _jsxs("td", { className: "rij-acties", children: [_jsx("button", { className: "knop klein secundair", onClick: () => start(d, false), children: "Bewerk" }), _jsx("button", { className: "knop klein gevaar", disabled: props.dragers.length <= 1, onClick: () => {
                                                if (confirm(`${d.naam} verwijderen?`))
                                                    void props.onOpslaan(props.dragers.filter((x) => x.id !== d.id));
                                            }, children: "Verwijder" })] })] }, d.id))) })] }), _jsx("p", { className: "klein", children: "\"Voor\" is de korte zijde van de drager; de lengte loopt van voor naar achter. Een pallet met ladingvlak 1200 \u00D7 800 mm telt als europallet (collimoduleregel)." })] }));
}
