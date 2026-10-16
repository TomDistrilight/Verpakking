const cache = new Map();
/** Getal in Nederlandse notatie, met hoogstens `decimalen` cijfers achter de komma. */
export function getal(v, decimalen = 0, taal = 'nl') {
    const k = `${taal}|${decimalen}`;
    let f = cache.get(k);
    if (!f) {
        f = new Intl.NumberFormat(taal === 'nl' ? 'nl-NL' : 'en-GB', { maximumFractionDigits: decimalen, minimumFractionDigits: 0, useGrouping: false });
        cache.set(k, f);
    }
    return f.format(v);
}
/** Getal met precies `decimalen` cijfers achter de komma. */
export function vast(v, decimalen, taal = 'nl') {
    return new Intl.NumberFormat(taal === 'nl' ? 'nl-NL' : 'en-GB', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen, useGrouping: false }).format(v);
}
export function mm(v) {
    return getal(v, 1);
}
export function maat(a, b, c) {
    return c === undefined ? `${mm(a)} × ${mm(b)}` : `${mm(a)} × ${mm(b)} × ${mm(c)}`;
}
export function procent(v) {
    return `${getal(v * 100, 1)}%`;
}
/**
 * Eenheid van de inhoud: zonder binnendoos (een artikel dat als binnendoos met 1 stuk telt, of een bestaande
 * buitendoos zonder binnendoos) zijn het artikelen, anders binnendozen.
 */
export function inhoudEenheid(invoer) {
    return invoer.zonderBinnendoos ? 'artikelen' : 'binnendozen';
}
/**
 * Aantal artikelen per drager voor de weergave, bijvoorbeeld "240". Het aantal artikelen per binnendoos is een vast
 * aantal (ronde 8, #67), dus ook het aantal per drager is exact: zonder "min." ervoor.
 */
export function artikelenTekst(aantal, taal = 'nl') {
    return getal(aantal, 0, taal);
}
/**
 * Wat er bij een gekantelde oplossing gekanteld is (ronde 6, #64): bij een bestaande buitendoos zonder binnendoos de
 * buitendoos zelf (die heeft dan een staande as), anders de binnendoos.
 */
export function gekanteldWat(doos) {
    return doos.staandeAs ? 'buitendoos' : 'binnendoos';
}
