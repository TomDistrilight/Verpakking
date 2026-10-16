import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { artikelenTekst, gekanteldWat, getal, inhoudEenheid, vast } from '../engine/format';
import { binnendoosSvg, bovenaanzichtSvg, buitendoosSvg, ladingSvg } from '../draw/tekeningen';
import { Svg } from './velden';
const ROL = {
    winnaar: 'Voorkeur',
    verband: 'Beste verband',
    nietGekanteld: 'Niet gekanteld',
    nietHoog: 'Niet hoger dan breed',
    alternatief: 'Alternatief',
};
const n = (v, d = 1) => getal(v, d);
function Kenmerken({ o }) {
    return (_jsxs("div", { className: "labels", children: [_jsx("span", { className: "label", children: o.stapelwijze === 'verband' ? 'Verband' : 'Recht' }), o.doos.geenBuitendoos && _jsx("span", { className: "label", children: "Geen buitendoos" }), o.doos.gekanteld && _jsx("span", { className: "label oranje", children: gekanteldWat(o.doos) === 'buitendoos' ? 'Buitendoos gekanteld' : 'Binnendoos gekanteld' }), o.doos.module && _jsxs("span", { className: "label groen", children: ["Collimodule ", o.doos.module] }), (o.overhang.voor > 0 || o.overhang.achter > 0 || o.overhang.links > 0 || o.overhang.rechts > 0) && _jsx("span", { className: "label oranje", children: "Overhang" })] }));
}
export function Kaart(props) {
    const { o } = props;
    // Een artikel zonder binnendoos telt als binnendoos met 1 stuk: dan heten de binnendozen 'artikelen'. Zo ook een
    // bestaande buitendoos zonder binnendoos: die bevat de artikelen zelf.
    const invoer = { zonderBinnendoos: props.zonderBinnendoos };
    const eenheid = inhoudEenheid(invoer);
    return (_jsxs("article", { className: `kaart${props.gekozen ? ' gekozen' : ''}`, children: [_jsxs("div", { className: "kaart-kop", children: [_jsx("span", { className: `rol rol-${props.rol}`, children: ROL[props.rol] }), _jsx(Kenmerken, { o: o })] }), _jsx("div", { className: "kerncijfer", children: o.binnendozenPerDrager !== null ? (_jsxs(_Fragment, { children: [_jsx("strong", { children: n(o.binnendozenPerDrager, 0) }), " ", eenheid, " per drager"] })) : (_jsxs(_Fragment, { children: [_jsx("strong", { children: n(o.buitendozenPerDrager, 0) }), " buitendozen per drager"] })) }), _jsxs("dl", { className: "cijfers", children: [o.doos.geenBuitendoos ? (_jsxs(_Fragment, { children: [_jsx("dt", { children: "Buitendoos" }), _jsxs("dd", { children: ["geen; ", eenheid, " direct op de drager"] }), _jsx("dt", { children: props.zonderBinnendoos ? 'Artikelen per laag' : 'Binnendozen per laag' }), _jsxs("dd", { children: [o.lagen.map((l) => l.dozen.length).join(' / '), " per laag \u00D7 ", o.aantalLagen] })] })) : (_jsxs(_Fragment, { children: [_jsx("dt", { children: props.zonderBinnendoos ? 'Artikelen per buitendoos' : 'Binnendozen per buitendoos' }), _jsxs("dd", { children: [o.doos.binnendozenPerDoos === null ? '–' : n(o.doos.binnendozenPerDoos, 0), o.doos.indeling && o.doos.indeling.nL * o.doos.indeling.nB * o.doos.indeling.nH === o.doos.binnendozenPerDoos
                                        ? ` (${o.doos.indeling.nL} × ${o.doos.indeling.nB} × ${o.doos.indeling.nH})`
                                        : ''] }), _jsx("dt", { children: "Buitendozen per drager" }), _jsxs("dd", { children: [n(o.buitendozenPerDrager, 0), " (", o.lagen.map((l) => l.dozen.length).join(' / '), " per laag \u00D7 ", o.aantalLagen, ")"] })] })), _jsx("dt", { children: "Artikelen per drager" }), _jsx("dd", { children: o.artikelenPerDrager === null ? '–' : artikelenTekst(o.artikelenPerDrager) }), _jsx("dt", { children: o.doos.geenBuitendoos ? 'Maat op de drager' : 'Buitenmaat' }), _jsxs("dd", { children: [n(o.doos.L), " \u00D7 ", n(o.doos.B), " \u00D7 ", n(o.doos.H), " mm"] }), _jsx("dt", { children: o.doos.geenBuitendoos ? (props.zonderBinnendoos ? 'Gewicht artikel' : 'Gevulde binnendoos') : 'Gevulde buitendoos' }), _jsxs("dd", { children: [vast(o.doos.gevuldGewicht, 2), " kg"] }), _jsx("dt", { children: "Totale hoogte" }), _jsxs("dd", { children: [n(o.totaleHoogte), " mm"] }), _jsx("dt", { children: "Totaalgewicht" }), _jsxs("dd", { children: [vast(o.totaalGewicht, 1), " kg"] }), _jsx("dt", { children: "Overhang v/a/l/r" }), _jsxs("dd", { children: [n(o.overhang.voor), " / ", n(o.overhang.achter), " / ", n(o.overhang.links), " / ", n(o.overhang.rechts), " mm"] })] }), _jsx("ul", { className: "uitleg", children: props.uitleg.map((u, i) => (_jsx("li", { children: u }, i))) }), _jsx("button", { className: props.gekozen ? 'knop' : 'knop secundair', onClick: props.onKies, children: props.gekozen ? 'Gekozen' : 'Kies deze oplossing' })] }));
}
export function Detail(props) {
    const { o, invoer } = props;
    const tekeningen = useMemo(() => ({
        lading: ladingSvg(o, invoer),
        buiten: o.doos.geenBuitendoos ? null : buitendoosSvg(o.doos, invoer.binnendoos),
        binnen: invoer.binnendoos ? binnendoosSvg(invoer.binnendoos) : null,
        lagen: o.lagen.map((l, i) => bovenaanzichtSvg(l, invoer.drager, { voorTekst: 'VOOR', titel: `Laag ${i === 0 ? 'A' : 'B'}` })),
    }), [o, invoer]);
    const [taal, setTaal] = useState(props.standaardTaal);
    const tl = invoer.tussenlaag;
    return (_jsxs("section", { className: "detail", children: [_jsxs("div", { className: "detail-kop", children: [_jsx("h2", { children: "Gekozen oplossing" }), _jsxs("div", { className: "pdf-knoppen", children: [_jsxs("select", { value: taal, onChange: (e) => setTaal(e.target.value), "aria-label": "Taal PDF", children: [_jsx("option", { value: "nl", children: "Nederlands" }), _jsx("option", { value: "en", children: "English" })] }), _jsx("button", { className: "knop", disabled: props.bezig, onClick: () => props.onPdf(taal), children: props.bezig ? 'PDF maken…' : 'Exporteer PDF' }), props.onOverzicht && (_jsx("button", { className: "knop secundair", disabled: props.inOverzicht, onClick: () => props.onOverzicht?.(taal), children: props.inOverzicht ? 'Staat in overzicht' : 'Opslaan in overzicht' }))] })] }), _jsxs("div", { className: "tekeningen", children: [_jsxs("figure", { children: [_jsx(Svg, { svg: tekeningen.lading }), _jsx("figcaption", { children: "Lading op de drager" })] }), tekeningen.buiten && (_jsxs("figure", { children: [_jsx(Svg, { svg: tekeningen.buiten }), _jsxs("figcaption", { children: ["Buitendoos", ' ', o.doos.indeling
                                        ? `(${o.doos.indeling.nL} × ${o.doos.indeling.nB} × ${o.doos.indeling.nH} ${inhoudEenheid(invoer)})`
                                        : o.doos.staandeAs
                                            ? `(gekanteld, ${o.doos.staandeAs === 'L' ? 'lengte' : 'breedte'} ${n(o.doos.H, 0)} mm verticaal)`
                                            : ''] })] })), tekeningen.binnen && (_jsxs("figure", { children: [_jsx(Svg, { svg: tekeningen.binnen }), _jsx("figcaption", { children: invoer.zonderBinnendoos ? 'Artikel' : 'Binnendoos' })] }))] }), _jsx("h3", { children: "Laagopbouw" }), _jsxs("div", { className: "lagen", children: [tekeningen.lagen.map((s, i) => (_jsxs("figure", { className: "laag", children: [_jsx(Svg, { svg: s }), _jsxs("figcaption", { children: ["Laag ", i === 0 ? 'A' : 'B', ": lagen", ' ', o.laagVolgorde
                                        .map((v, k) => (v === i ? k + 1 : 0))
                                        .filter(Boolean)
                                        .join(', ')] })] }, i))), _jsxs("div", { className: "laaginfo", children: [_jsxs("p", { children: [_jsx("strong", { children: "Stapelwijze:" }), " ", o.stapelwijze === 'verband' ? 'in verband (lagen A en B wisselen af)' : 'recht (alle lagen gelijk)'] }), _jsxs("p", { children: [_jsx("strong", { children: "Tussenlagen:" }), ' ', tl.soort === 'geen' || o.tussenlaagNa.length === 0
                                        ? 'geen'
                                        : `${tl.soort}, ${n(tl.dikte)} mm, na laag ${o.tussenlaagNa.join(', ')} (${tl.maat === 'drager' ? 'dragermaat' : 'ladingmaat'})`] }), _jsxs("p", { children: [_jsx("strong", { children: "Omhullende:" }), " ", n(o.omhullende.lengte), " \u00D7 ", n(o.omhullende.breedte), " \u00D7 ", n(o.totaleHoogte), " mm (lengte \u00D7 breedte \u00D7 hoogte, inclusief overhang)"] }), _jsx("p", { className: "klein", children: "Nummers in het bovenaanzicht geven de plaatsingsvolgorde; de voorzijde ligt onderaan." })] })] })] }));
}
export function Overzicht(props) {
    const r = props.resultaat;
    if (r.top.length === 0)
        return (_jsxs("div", { className: "melding fout", role: "alert", children: [_jsx("strong", { children: "Geen geldige oplossing." }), _jsx("ul", { children: r.geenOplossing.map((m, i) => (_jsx("li", { children: m }, i))) })] }));
    return (_jsxs(_Fragment, { children: [props.nummer && _jsxs("p", { className: "klein", children: ["Berekening ", props.nummer, " is bewaard in de geschiedenis."] }), r.log.laagNietBewezen && !r.log.afgekapt && (_jsxs("div", { className: "melding waarschuwing", children: ["Het aantal dozen per laag van de voorkeursoptie is niet bewezen maximaal. De uitkomst is de ", _jsx("strong", { children: "beste gevonden oplossing" }), "."] })), r.log.afgekapt && (_jsxs("div", { className: "melding waarschuwing", children: ["De zoekruimte is afgekapt na ", r.log.voetafdrukken, " voetafdrukken. De uitkomst is de ", _jsx("strong", { children: "beste gevonden oplossing" }), ", geen bewezen optimum."] })), _jsx("div", { className: "kaarten", children: r.top.map((t) => (_jsx(Kaart, { o: t.oplossing, rol: t.rol, uitleg: t.uitleg, gekozen: props.gekozen?.id === t.oplossing.id, onKies: () => props.onKies(t.oplossing), zonderBinnendoos: !!r.invoer.zonderBinnendoos }, t.oplossing.id))) }), _jsxs("p", { className: "klein", children: [r.log.kandidaten, " ", r.log.kandidaten === 1 ? 'doosmaat' : 'doosmaten', " en ", r.log.voetafdrukken, " voetafdrukken getest; ", r.oplossingen.length, " geldige oplossingen.", Object.keys(r.log.afgewezen).length > 0 &&
                        ' Afgewezen: ' +
                            Object.entries(r.log.afgewezen)
                                .map(([k, v]) => `${AFWIJZING[k] ?? k} ${v}×`)
                                .join(', ') +
                            '.'] })] }));
}
const AFWIJZING = {
    voetafdruk: 'te groot voor de drager',
    gewichtDoos: 'buitendoos te zwaar',
    buitenmaat: 'buiten min./max. buitenmaat',
    hoogte: 'te hoog',
    gewichtDrager: 'drager te zwaar',
    pastNietOpDrager: 'past niet op de drager',
    overhang: 'overhang niet toegestaan',
    minBinnendozen: 'minder binnendozen per doos dan het minimum',
    minPerLaag: 'minder dozen per laag dan het minimum',
    vorm: 'hoger dan de vormregel toestaat',
};
