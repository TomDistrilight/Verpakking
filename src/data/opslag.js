// Opslag in de browser (IndexedDB via idb-keyval), ontwerp §6 en #38: geen server, één gebruiker,
// back-up via export en import van een JSON-bestand.
import { createStore, get, set, del } from 'idb-keyval';
import { GEEN_MATERIAAL, GEEN_TUSSENLAAG, MAX_GEVULD_GEWICHT, STANDAARD_DRAGERS, kopieDrager } from '../engine/standaard';
import { STANDAARD_VORMFACTOR } from '../engine/kandidaten';
/**
 * Versie 2 (ronde 4): standaard minimaal 2 binnendozen per doos en 2 buitendozen per laag.
 * Versie 3 (ronde 8, #66): standaard vormregel zacht in plaats van breedte, met vormFactor 2.
 */
export const INSTELLINGEN_VERSIE = 3;
export const STANDAARD_INSTELLINGEN = {
    maxGevuldGewicht: MAX_GEVULD_GEWICHT,
    minBuitenmaat: {},
    maxBuitenmaat: {},
    minBinnendozenPerDoos: 2,
    minBuitendozenPerLaag: 2,
    vormregel: 'zacht',
    vormFactor: STANDAARD_VORMFACTOR,
    customDoostype: { soort: 'custom', toeslagL: 14, toeslagB: 14, toeslagH: 28, kartonmassa: 0.75 },
    tussenlaag: { ...GEEN_TUSSENLAAG },
    materiaal: structuredClone(GEEN_MATERIAAL),
    zoeklimiet: 1500,
    minSteun: 75,
    logo: null,
    overzicht: { sortering: 'levering', verbergGecontroleerd: false },
    versie: INSTELLINGEN_VERSIE,
};
const store = typeof indexedDB !== 'undefined' ? createStore('verpakking', 'gegevens') : undefined;
async function lees(sleutel, standaard) {
    if (!store)
        return standaard;
    const v = await get(sleutel, store);
    return v === undefined ? standaard : v;
}
async function schrijf(sleutel, waarde) {
    if (!store)
        return;
    await set(sleutel, waarde, store);
}
export async function leesArtikelen() {
    return lees('artikelen', {});
}
export async function schrijfArtikelen(a) {
    await schrijf('artikelen', a);
}
export async function leesDragers() {
    const d = await lees('dragers', null);
    return d && d.length > 0 ? d : STANDAARD_DRAGERS.map(kopieDrager);
}
export async function schrijfDragers(d) {
    await schrijf('dragers', d);
}
export async function leesInstellingen() {
    const i = await lees('instellingen', {});
    return metStandaard(i);
}
/**
 * Vult ontbrekende instellingen aan met de standaard (bijvoorbeeld uit een oudere versie of back-up).
 * Instellingen van vóór versie 2 met de oude standaard 1 voor de minimumaantallen krijgen de nieuwe standaard 2.
 * Instellingen van vóór versie 3 met de oude standaard vormregel breedte krijgen de nieuwe standaard zacht (#66);
 * lengte en uit blijven staan.
 */
export function metStandaard(i) {
    const { taal: _oudeTaal, ...rest } = i; // de standaardtaal is vervallen: Nederlands is altijd de standaard
    const uit = { ...STANDAARD_INSTELLINGEN, ...rest, overzicht: { ...STANDAARD_INSTELLINGEN.overzicht, ...(rest.overzicht ?? {}) } };
    if ((i.versie ?? 1) < 2) {
        if (uit.minBinnendozenPerDoos === 1)
            uit.minBinnendozenPerDoos = 2;
        if (uit.minBuitendozenPerLaag === 1)
            uit.minBuitendozenPerLaag = 2;
    }
    if ((i.versie ?? 1) < 3 && uit.vormregel === 'breedte')
        uit.vormregel = 'zacht';
    uit.versie = INSTELLINGEN_VERSIE;
    return uit;
}
export async function schrijfInstellingen(i) {
    await schrijf('instellingen', i);
}
export async function leesBerekeningen() {
    return lees('berekeningen', []);
}
export async function schrijfBerekeningen(b) {
    await schrijf('berekeningen', b);
}
export async function leesGekozen() {
    return lees('gekozen', []);
}
export async function schrijfGekozen(g) {
    await schrijf('gekozen', g);
}
/** Uniek nummer voor een regel in het overzicht. */
export function nieuwId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
/** Een nieuwe regel voor het overzicht uit een bewaarde berekening en de gekozen oplossing. */
export function regelUitBerekening(b, oplossing, taal, nu = new Date()) {
    return {
        id: nieuwId(),
        nummer: b.nummer,
        datum: b.datum,
        gekozenOp: nu.toISOString(),
        artikelcode: b.artikelcode,
        invoer: b.invoer,
        oplossing,
        // Logo van een eerdere PDF-export van deze berekening, zodat het PDF gelijk blijft.
        logo: b.logo,
        verwachteLevering: null,
        gecontroleerd: false,
        taal,
    };
}
/**
 * Zet een gekozen oplossing in het overzicht. Staat het artikel er al met een regel die nog niet
 * fysiek gecontroleerd is, dan vervangt de nieuwe oplossing die regel; de verwachte leverdatum en
 * de taal blijven staan. Anders komt er een nieuwe regel bij.
 */
export function zetInOverzicht(lijst, regel) {
    const open = lijst.filter((r) => r.artikelcode === regel.artikelcode && !r.gecontroleerd);
    if (open.length === 0)
        return { lijst: [...lijst, regel], vervangen: false };
    // Zijn er meer open regels (na het uitvinken van een gecontroleerde regel), dan alleen de laatst gekozen vervangen.
    const oud = open.reduce((a, b) => (b.gekozenOp > a.gekozenOp ? b : a));
    const nieuw = { ...regel, id: oud.id, verwachteLevering: oud.verwachteLevering, taal: oud.taal };
    return { lijst: lijst.map((r) => (r === oud ? nieuw : r)), vervangen: true };
}
const vergelijkCode = (a, b) => a.localeCompare(b, 'nl', { numeric: true });
/** Sorteert het overzicht; regels zonder verwachte leverdatum komen achteraan. */
export function sorteerOverzicht(lijst, sortering) {
    const laatstGekozen = (a, b) => (a.gekozenOp < b.gekozenOp ? 1 : a.gekozenOp > b.gekozenOp ? -1 : 0);
    const uit = [...lijst];
    if (sortering === 'levering')
        uit.sort((a, b) => {
            if (a.verwachteLevering !== b.verwachteLevering) {
                if (!a.verwachteLevering)
                    return 1;
                if (!b.verwachteLevering)
                    return -1;
                return a.verwachteLevering < b.verwachteLevering ? -1 : 1;
            }
            return vergelijkCode(a.artikelcode, b.artikelcode) || laatstGekozen(a, b);
        });
    else if (sortering === 'artikel')
        uit.sort((a, b) => vergelijkCode(a.artikelcode, b.artikelcode) || laatstGekozen(a, b));
    else
        uit.sort(laatstGekozen);
    return uit;
}
/**
 * Volgend berekeningsnummer: JJJJMMDD-NNN, oplopend per dag. Houdt ook rekening met nummers die
 * al in de geschiedenis staan (bijvoorbeeld na het terugzetten van een back-up), zodat een nummer
 * nooit twee keer voorkomt.
 */
export async function volgendNummer(datum = new Date()) {
    const dag = `${datum.getFullYear()}${String(datum.getMonth() + 1).padStart(2, '0')}${String(datum.getDate()).padStart(2, '0')}`;
    const teller = await lees('teller', { dag, n: 0 });
    const inGeschiedenis = (await leesBerekeningen())
        .map((b) => b.nummer)
        .filter((nr) => nr.startsWith(`${dag}-`))
        .map((nr) => Number(nr.slice(dag.length + 1)) || 0);
    const n = Math.max(teller.dag === dag ? teller.n : 0, ...inGeschiedenis, 0) + 1;
    await schrijf('teller', { dag, n });
    return `${dag}-${String(n).padStart(3, '0')}`;
}
export async function maakBackup() {
    return {
        type: 'verpakkingsapp-backup',
        versie: 1,
        gemaakt: new Date().toISOString(),
        artikelen: await leesArtikelen(),
        dragers: await leesDragers(),
        instellingen: await leesInstellingen(),
        berekeningen: await leesBerekeningen(),
        gekozen: await leesGekozen(),
        teller: await lees('teller', undefined),
    };
}
export async function zetBackupTerug(b) {
    if (b?.type !== 'verpakkingsapp-backup')
        throw new Error('Dit is geen back-upbestand van de verpakkingsapp.');
    await schrijfArtikelen(b.artikelen ?? {});
    await schrijfDragers(b.dragers ?? STANDAARD_DRAGERS.map(kopieDrager));
    await schrijfInstellingen(metStandaard(b.instellingen ?? {}));
    await schrijfBerekeningen(b.berekeningen ?? []);
    await schrijfGekozen(b.gekozen ?? []);
    // Nooit terug in de teller: nummers van na de back-up kunnen al op een PDF staan.
    const nu = await lees('teller', undefined);
    if (b.teller) {
        const n = nu && nu.dag === b.teller.dag ? Math.max(nu.n, b.teller.n) : nu && nu.dag > b.teller.dag ? nu.n : b.teller.n;
        const dag = nu && nu.dag > b.teller.dag ? nu.dag : b.teller.dag;
        await schrijf('teller', { dag, n });
    }
}
export async function wisAlles() {
    if (!store)
        return;
    // De teller blijft staan: eerder uitgegeven berekeningsnummers kunnen al op een PDF staan.
    for (const k of ['artikelen', 'dragers', 'instellingen', 'berekeningen', 'gekozen'])
        await del(k, store);
}
