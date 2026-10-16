// Rangschikking en top drie (ontwerp §4.3).
import { isEuropallet } from './module';
import { gekanteldWat, getal, inhoudEenheid, procent } from './format';
/** Hoofdmaat: binnendozen per drager; zonder bekende inhoud buitendozen per drager (§4.3 stap 1). */
export function hoofdmaat(o) {
    return o.binnendozenPerDrager ?? o.buitendozenPerDrager;
}
/** Minstens 10% meer: a ≥ 1,1 × b, exact in gehele getallen. */
function minstens10ProcentMeer(a, b) {
    return a * 10 >= b * 11;
}
function vergelijker(europallet, rechtEerst) {
    return (a, b) => {
        const ha = hoofdmaat(a);
        const hb = hoofdmaat(b);
        if (ha !== hb)
            return hb - ha;
        const pa = a.doos.binnendozenPerDoos ?? 0;
        const pb = b.doos.binnendozenPerDoos ?? 0;
        if (pa !== pb)
            return pb - pa;
        // Breder en langer gaat voor hoger: bij dezelfde inhoud de doos met de laagste hoogte ten opzichte van zijn breedte.
        const v = vormVergelijking(a, b);
        if (v !== 0)
            return v;
        if (a.totaleHoogte !== b.totaleHoogte)
            return a.totaleHoogte - b.totaleHoogte;
        if (europallet) {
            const ma = a.moduleAfstand ?? Infinity;
            const mb = b.moduleAfstand ?? Infinity;
            if (ma !== mb)
                return ma - mb;
        }
        if (a.totaalGewicht !== b.totaalGewicht)
            return a.totaalGewicht - b.totaalGewicht;
        if (a.doos.L !== b.doos.L)
            return a.doos.L - b.doos.L;
        if (a.doos.B !== b.doos.B)
            return a.doos.B - b.doos.B;
        if (a.doos.H !== b.doos.H)
            return a.doos.H - b.doos.H;
        if (a.doos.gekanteld !== b.doos.gekanteld)
            return a.doos.gekanteld ? 1 : -1;
        if (a.stapelwijze !== b.stapelwijze) {
            const eerste = rechtEerst ? 'recht' : 'verband';
            return a.stapelwijze === eerste ? -1 : 1;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    };
}
/** Negatief als a platter is dan b (lagere hoogte / breedte), positief als b platter is. */
function vormVergelijking(a, b) {
    const va = a.doos.H * b.doos.B;
    const vb = b.doos.H * a.doos.B;
    return Math.abs(va - vb) > 1e-6 ? va - vb : 0;
}
function maxHoofd(lijst) {
    return lijst.reduce((m, o) => Math.max(m, hoofdmaat(o)), 0);
}
/** Eenheid van de hoofdmaat; zonder binnendoos (artikel, of bestaande buitendoos zonder binnendoos) zijn het artikelen. */
const eenheid = (o, invoer) => (o.binnendozenPerDrager === null ? 'buitendozen' : inhoudEenheid(invoer));
export function sleutel(o) {
    return `${o.doos.L}|${o.doos.B}|${o.doos.H}|${o.stapelwijze}|${o.doos.gekanteld}`;
}
export function rangschik(oplossingen, invoer) {
    if (oplossingen.length === 0)
        return { gesorteerd: [], top: [] };
    const euro = isEuropallet(invoer.drager);
    let pool = oplossingen;
    const uitleg = [];
    let modulair = false;
    // Stap 2 begint met de vormregel zacht (#66). Een doos die hoger is dan breed doet alleen mee als ze minstens 10% meer
    // per drager geeft dan de platte voorkeursoptie: de oplossing die dezelfde rangschikking kiest uit alleen de dozen die
    // niet hoger zijn dan breed, dus de uitkomst van "niet hoger dan de breedte" (met kantelregel, collimodule en recht of
    // verband). Zo geeft een hoge doos nooit minder dan die uitkomst en wint ze nooit bij hetzelfde aantal. Daarna volgt de
    // kantelregel zoals altijd.
    const plat = pool.filter((o) => !o.doos.hoog);
    const hoog = pool.filter((o) => o.doos.hoog);
    const platWinnaar = plat.length > 0 && hoog.length > 0 ? rangschik(plat, invoer).gesorteerd[0] : undefined;
    const bestePlat = platWinnaar ? hoofdmaat(platWinnaar) : 0;
    const besteHoog = maxHoofd(hoog);
    const hoogLoont = new Set(plat.length === 0 ? hoog : hoog.filter((o) => minstens10ProcentMeer(hoofdmaat(o), bestePlat)));
    pool = pool.filter((o) => !o.doos.hoog || hoogLoont.has(o));
    // Stap 2: kantelen mag, maar is niet verplicht (#33, ronde 4 punt 5). Een gekantelde oplossing doet
    // alleen mee als ze minstens 10% meer binnendozen per drager geeft dan de beste rechtopstaande
    // oplossing, ook als die geen collimodule heeft. Zo dwingt de collimodule nooit kantelen af.
    const rechtop = pool.filter((o) => !o.doos.gekanteld);
    const gekanteld = pool.filter((o) => o.doos.gekanteld);
    const besteRechtop = maxHoofd(rechtop);
    const besteGekanteld = maxHoofd(gekanteld);
    const loont = new Set(rechtop.length === 0 ? gekanteld : gekanteld.filter((o) => minstens10ProcentMeer(hoofdmaat(o), besteRechtop)));
    pool = pool.filter((o) => !o.doos.gekanteld || loont.has(o));
    // Stap 3: collimodule op de europallet, binnen de oplossingen die nog meedoen (#5, #9).
    let zonderModule = 0;
    if (euro) {
        const mod = pool.filter((o) => o.doos.module !== null);
        if (mod.length > 0) {
            zonderModule = maxHoofd(pool.filter((o) => o.doos.module === null));
            pool = mod;
            modulair = true;
        }
    }
    // Doet er nog een gekantelde oplossing mee, dan geeft die minstens 10% meer dan elke rechtopstaande: gekanteld.
    if (pool.some((o) => o.doos.gekanteld))
        pool = pool.filter((o) => o.doos.gekanteld);
    // Net zo: doet er nog een doos mee die hoger is dan breed, dan geeft die minstens 10% meer dan elke doos die dat niet is.
    if (pool.some((o) => o.doos.hoog))
        pool = pool.filter((o) => o.doos.hoog);
    // Stap 4: recht of verband (niet bij een modulaire winnaar).
    if (!modulair) {
        const recht = pool.filter((o) => o.stapelwijze === 'recht');
        const verband = pool.filter((o) => o.stapelwijze === 'verband');
        if (recht.length > 0 && verband.length > 0) {
            const r = maxHoofd(recht);
            const v = maxHoofd(verband);
            if (minstens10ProcentMeer(r, v)) {
                pool = recht;
                uitleg.push(`Recht geeft ${getal(r)} tegen ${getal(v)} bij verband (+${procent((r - v) / v)}, minstens 10%), dus recht.`);
            }
            else {
                pool = verband;
                uitleg.push(r > v
                    ? `Recht geeft ${getal(r)} tegen ${getal(v)} bij verband; minder dan 10% meer, dus verband.`
                    : `Verband geeft evenveel of meer (${getal(v)} tegen ${getal(r)} recht), dus verband.`);
            }
        }
        else if (recht.length > 0 && pool.length > 0) {
            uitleg.push('Geen geldig verband gevonden; de lading staat recht.');
        }
    }
    const poolGesorteerd = [...pool].sort(vergelijker(euro, modulair));
    const winnaar = poolGesorteerd[0];
    // De uitleg volgt de stappen: eerst de vorm, dan kantelen, dan de collimodule, dan recht of verband.
    const voor = [];
    // Bij een bestaande buitendoos zonder binnendoos kantelt de buitendoos zelf (#64), anders de binnendoos.
    const wat = gekanteld.length > 0 ? gekanteldWat(gekanteld[0].doos) : 'binnendoos';
    // Vormregel zacht: alleen noemen als een doos die hoger is dan breed wint, of meer zou geven maar minder dan 10%.
    if (plat.length > 0 && hoog.length > 0) {
        const plattekst = `${eenheid(winnaar, invoer)} met een doos die niet hoger is dan breed`;
        if (winnaar.doos.hoog)
            voor.push(`Hogere doos (hoger dan breed) geeft ${getal(hoofdmaat(winnaar))} tegen ${getal(bestePlat)} ${plattekst} (+${procent((hoofdmaat(winnaar) - bestePlat) / bestePlat)}, minstens 10%), dus hoger dan breed.`);
        else if (hoogLoont.size === 0 && besteHoog > bestePlat)
            voor.push(`Hogere doos (hoger dan breed) geeft ${getal(besteHoog)} tegen ${getal(bestePlat)} ${plattekst}; minder dan 10% meer, dus niet hoger dan breed.`);
    }
    if (rechtop.length > 0 && gekanteld.length > 0) {
        if (winnaar.doos.gekanteld)
            voor.push(`Gekantelde ${wat} geeft ${getal(hoofdmaat(winnaar))} tegen ${getal(besteRechtop)} ${eenheid(winnaar, invoer)} rechtop (+${procent((hoofdmaat(winnaar) - besteRechtop) / besteRechtop)}, minstens 10%), dus gekanteld.`);
        else if (loont.size === 0)
            voor.push(`Gekantelde ${wat} geeft ${getal(besteGekanteld)} tegen ${getal(besteRechtop)} ${eenheid(winnaar, invoer)} rechtop; minder dan 10% meer, dus niet gekanteld.`);
    }
    if (modulair)
        voor.push(zonderModule > hoofdmaat(winnaar)
            ? `Collimodule ${winnaar.doos.module} op de europallet gaat voor, ook al geeft een doos zonder collimodule meer (${getal(zonderModule)} tegen ${getal(hoofdmaat(winnaar))} ${eenheid(winnaar, invoer)}); verband mag dan genegeerd worden.`
            : `Collimodule ${winnaar.doos.module} op de europallet: een modulaire doos gaat voor; verband mag dan genegeerd worden.`);
    uitleg.unshift(...voor);
    uitleg.push(`${getal(hoofdmaat(winnaar))} ${eenheid(winnaar, invoer)} per drager.`);
    // Beslist de vorm tussen twee dozen met hetzelfde aantal per drager en per doos, zeg dat dan.
    const tweede = poolGesorteerd.find((o) => sleutel(o) !== sleutel(winnaar) && (o.doos.L !== winnaar.doos.L || o.doos.B !== winnaar.doos.B || o.doos.H !== winnaar.doos.H));
    if (tweede &&
        hoofdmaat(tweede) === hoofdmaat(winnaar) &&
        (tweede.doos.binnendozenPerDoos ?? 0) === (winnaar.doos.binnendozenPerDoos ?? 0) &&
        vormVergelijking(winnaar, tweede) < 0)
        uitleg.push(`Evenveel per drager en per doos als ${getal(tweede.doos.L)} × ${getal(tweede.doos.B)} × ${getal(tweede.doos.H)} mm; de plattere doos gaat voor (hoogte gedeeld door breedte ${getal(winnaar.doos.H / winnaar.doos.B, 2)} tegen ${getal(tweede.doos.H / tweede.doos.B, 2)}).`);
    const rest = oplossingen.filter((o) => o !== winnaar).sort(vergelijker(euro, false));
    const gesorteerd = [winnaar, ...rest];
    const top = [{ oplossing: winnaar, rol: 'winnaar', uitleg }];
    const getoond = new Set([sleutel(winnaar)]);
    const verschilTekst = (o) => {
        const w = hoofdmaat(winnaar);
        const h = hoofdmaat(o);
        const kenmerken = [
            o.stapelwijze,
            o.doos.gekanteld ? `${gekanteldWat(o.doos)} gekanteld` : '',
            o.doos.hoog ? 'hoger dan breed' : '',
            o.doos.module ? `collimodule ${o.doos.module}` : '',
        ]
            .filter(Boolean)
            .join(', ');
        if (h === w)
            return `evenveel ${eenheid(o, invoer)} als de voorkeursoptie (${kenmerken})`;
        return `${getal(h)} ${eenheid(o, invoer)} per drager, ${procent(Math.abs(h - w) / w)} ${h < w ? 'minder' : 'meer'} dan de voorkeursoptie (${kenmerken})`;
    };
    const besteVerband = gesorteerd.find((o) => o.stapelwijze === 'verband');
    if (besteVerband && !getoond.has(sleutel(besteVerband))) {
        getoond.add(sleutel(besteVerband));
        top.push({ oplossing: besteVerband, rol: 'verband', uitleg: [`Beste verbandoplossing: ${verschilTekst(besteVerband)}.`] });
    }
    const besteNiet = gesorteerd.find((o) => !o.doos.gekanteld);
    if (besteNiet && !getoond.has(sleutel(besteNiet))) {
        getoond.add(sleutel(besteNiet));
        top.push({ oplossing: besteNiet, rol: 'nietGekanteld', uitleg: [`Beste oplossing zonder gekantelde ${wat}: ${verschilTekst(besteNiet)}.`] });
    }
    // Vormregel zacht (#66): wint een doos die hoger is dan breed, dan staat de platte voorkeursoptie (de uitkomst van "niet
    // hoger dan de breedte") ook in de top drie, zodat de gebruiker per geval plat kan kiezen. Die kaart gaat voor de gewone
    // alternatieven. Staan er al drie kaarten (winnaar, beste verband en niet gekanteld), dan neemt ze de plaats in van de
    // kaart "niet gekanteld" als die doos ook hoger is dan breed; zo staat er altijd een platte doos in de top drie.
    const besteNietHoog = winnaar.doos.hoog ? platWinnaar : undefined;
    if (besteNietHoog && !getoond.has(sleutel(besteNietHoog))) {
        const kaart = {
            oplossing: besteNietHoog,
            rol: 'nietHoog',
            uitleg: [`Beste oplossing met een doos die niet hoger is dan breed: ${verschilTekst(besteNietHoog)}.`],
        };
        const plek = top.length < 3 ? top.length : top.findIndex((t) => t.rol === 'nietGekanteld' && t.oplossing.doos.hoog);
        if (plek >= 0) {
            if (plek < top.length)
                getoond.delete(sleutel(top[plek].oplossing));
            getoond.add(sleutel(besteNietHoog));
            top[plek] = kaart;
        }
    }
    for (const o of gesorteerd) {
        if (top.length >= 3)
            break;
        const k = sleutel(o);
        if (getoond.has(k))
            continue;
        getoond.add(k);
        top.push({ oplossing: o, rol: 'alternatief', uitleg: [`Alternatief: ${verschilTekst(o)}.`] });
    }
    return { gesorteerd, top };
}
