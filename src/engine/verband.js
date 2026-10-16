// Verband (ontwerp §4.2, #34): een laag ligt in verband op de laag eronder als minstens de helft
// van zijn dozen op twee of meer dozen eronder steunt. Een doos steunt op een doos eronder als
// hun overlap in beide richtingen minstens 50 mm is. Van de paren met de meeste dozen kiest de app het
// paar met de meeste dozen in laag A, dan het paar met de minste overhang, dan het paar met de minste
// torens (dozen die voor minstens 90% op één doos eronder staan), dan het paar waarin de slechtst
// gesteunde doos de meeste steun heeft (tot de min. ondersteuning), dan het paar waarin laag B laag A gespiegeld is
// (#63), en dan het paar waarin de meeste dozen op twee of meer dozen steunen (#60).
import { omhullende, transformeer } from './laagpatroon';
import { plaats } from './plaatsing';
export const MIN_OVERLAP = 50;
/** Een doos die voor minstens dit deel van zijn grondvlak op één doos eronder staat, vormt daarmee een toren. */
export const TOREN = 0.9;
const EPS = 1e-6;
function overlap(a0, a1, b0, b1) {
    return Math.min(a1, b1) - Math.max(a0, b0);
}
/** Steunt `u` op twee of meer dozen van `onder`? */
function opTweeOfMeer(u, onder, minOverlap) {
    let n = 0;
    for (let j = 0; j < onder.length && n < 2; j++) {
        const l = onder[j];
        if (overlap(u.x, u.x + u.w, l.x, l.x + l.w) >= minOverlap - EPS && overlap(u.y, u.y + u.d, l.y, l.y + l.d) >= minOverlap - EPS)
            n++;
    }
    return n >= 2;
}
/** Ligt `boven` in verband op `onder` (beide in dragercoördinaten)? */
export function inVerband(boven, onder, minOverlap = MIN_OVERLAP) {
    if (boven.length === 0)
        return false;
    let steunend = 0;
    for (let i = 0; i < boven.length; i++) {
        if (opTweeOfMeer(boven[i], onder, minOverlap))
            steunend++;
        // Vroeg stoppen als de helft niet meer haalbaar is.
        if ((steunend + (boven.length - 1 - i)) * 2 < boven.length)
            return false;
    }
    return steunend * 2 >= boven.length;
}
/** Aantal dozen van `boven` dat op twee of meer dozen van `onder` steunt. */
export function steunendeDozen(boven, onder, minOverlap = MIN_OVERLAP) {
    let n = 0;
    for (const u of boven)
        if (opTweeOfMeer(u, onder, minOverlap))
            n++;
    return n;
}
/** Kleinste deel van het grondvlak waarmee een doos van `boven` op de dozen van `onder` rust (0–1). */
export function kleinsteSteun(boven, onder) {
    let min = 1;
    for (const u of boven) {
        let opp = 0;
        for (const l of onder) {
            const ox = overlap(u.x, u.x + u.w, l.x, l.x + l.w);
            const oy = overlap(u.y, u.y + u.d, l.y, l.y + l.d);
            if (ox > EPS && oy > EPS)
                opp += ox * oy;
        }
        min = Math.min(min, opp / (u.w * u.d));
    }
    return min;
}
/** Aantal dozen van `boven` dat voor minstens TOREN van zijn grondvlak op één doos van `onder` staat (torens). */
export function torens(boven, onder) {
    let n = 0;
    for (const u of boven)
        if (onder.some((l) => Math.max(0, overlap(u.x, u.x + u.w, l.x, l.x + l.w)) * Math.max(0, overlap(u.y, u.y + u.d, l.y, l.y + l.d)) >= TOREN * u.w * u.d - EPS))
            n++;
    return n;
}
/**
 * Staat elke doos van `boven` zonder toren (minder dan TOREN op één doos) en met minstens `minSteun` van zijn grondvlak op
 * `onder`? Hetzelfde als torens() 0 en kleinsteSteun() ≥ minSteun, maar stopt bij de eerste doos die niet voldoet.
 */
function zonderTorensGesteund(boven, onder, minSteun) {
    for (const u of boven) {
        const grondvlak = u.w * u.d;
        let opp = 0;
        for (const l of onder) {
            const ox = overlap(u.x, u.x + u.w, l.x, l.x + l.w);
            const oy = overlap(u.y, u.y + u.d, l.y, l.y + l.d);
            if (ox <= EPS || oy <= EPS)
                continue;
            if (ox * oy >= TOREN * grondvlak - EPS)
                return false;
            opp += ox * oy;
        }
        if (opp / grondvlak < minSteun - STEUN_EPS)
            return false;
    }
    return true;
}
/** Zoveel mm mag een doos van laag B afwijken van het spiegelbeeld van laag A (#63). */
export const SPIEGEL_MARGE = 0.5;
/** Sleutel van een vak van 1 mm in het raster van rasterVan. */
const vak = (x, y) => x * 1_000_000 + y;
/** Raster van 1 mm op de hoek linksvoor van elke doos: een doos binnen SPIEGEL_MARGE ligt in hetzelfde of een buurvak. */
function rasterVan(dozen) {
    const raster = new Map();
    dozen.forEach((r, j) => {
        const k = vak(Math.round(r.x), Math.round(r.y));
        const lijst = raster.get(k);
        if (lijst)
            lijst.push(j);
        else
            raster.set(k, [j]);
    });
    return raster;
}
function kenmerkVan(dozen) {
    let cx = 0;
    let cy = 0;
    for (const r of dozen) {
        cx += r.x + r.w / 2;
        cy += r.y + r.d / 2;
    }
    return { om: omhullende(dozen), cx, cy };
}
/**
 * Zijn de dozen van `a`, gespiegeld volgens `s` om (sx / 2, sy / 2), dezelfde als die van `b`, los van de volgorde en elke
 * maat binnen SPIEGEL_MARGE? `raster` is het raster van `b`.
 */
function gespiegeldGelijk(a, s, sx, sy, b, raster) {
    const gebruikt = new Uint8Array(b.length);
    for (const u of a) {
        const x = s === 'y' ? u.x : sx - u.x - u.w;
        const y = s === 'x' ? u.y : sy - u.y - u.d;
        const vx = Math.round(x);
        const vy = Math.round(y);
        let gevonden = -1;
        for (let dx = -1; dx <= 1 && gevonden < 0; dx++)
            for (let dy = -1; dy <= 1 && gevonden < 0; dy++)
                for (const j of raster.get(vak(vx + dx, vy + dy)) ?? []) {
                    const v = b[j];
                    if (!gebruikt[j] &&
                        Math.abs(v.x - x) <= SPIEGEL_MARGE &&
                        Math.abs(v.y - y) <= SPIEGEL_MARGE &&
                        Math.abs(v.w - u.w) <= SPIEGEL_MARGE &&
                        Math.abs(v.d - u.d) <= SPIEGEL_MARGE) {
                        gevonden = j;
                        break;
                    }
                }
        if (gevonden < 0)
            return false;
        gebruikt[gevonden] = 1;
    }
    return true;
}
/** isGespiegeld met de kenmerken van beide lagen al berekend (zoekVerband rekent ze één keer per laag uit). */
function spiegeling(a, ka, b, kb) {
    const n = a.length;
    if (n === 0 || n !== b.length)
        return null;
    const { om } = ka;
    const ob = kb.om;
    // Gespiegeld om het midden van het eigen blok: beide lagen hebben dezelfde omhullende.
    if (Math.abs(om.x - ob.x) > SPIEGEL_MARGE || Math.abs(om.y - ob.y) > SPIEGEL_MARGE || Math.abs(om.w - ob.w) > SPIEGEL_MARGE || Math.abs(om.d - ob.d) > SPIEGEL_MARGE)
        return null;
    const sx = 2 * om.x + om.w;
    const sy = 2 * om.y + om.d;
    // Snelle toets vooraf: de som van de middens van de gespiegelde dozen van A moet die van B zijn (gespiegeld wordt een
    // midden c in die richting sx − c of sy − c).
    const marge = SPIEGEL_MARGE * n;
    const x = { zelfde: Math.abs(ka.cx - kb.cx) <= marge, gespiegeld: Math.abs(n * sx - ka.cx - kb.cx) <= marge };
    const y = { zelfde: Math.abs(ka.cy - kb.cy) <= marge, gespiegeld: Math.abs(n * sy - ka.cy - kb.cy) <= marge };
    for (const s of ['x', 'y', 'xy']) {
        if (!(s === 'y' ? x.zelfde : x.gespiegeld) || !(s === 'x' ? y.zelfde : y.gespiegeld))
            continue;
        kb.raster ??= rasterVan(b);
        if (gespiegeldGelijk(a, s, sx, sy, b, kb.raster))
            return s;
    }
    return null;
}
/**
 * Is laag `b` laag `a` gespiegeld (#63)? Dat is zo als de dozen van `b`, zoals ze liggen, gelijk zijn aan de dozen van `a`
 * gespiegeld om het midden van de omhullende van `a`: links-rechts ('x'), voor-achter ('y') of beide ('xy', een halve
 * slag gedraaid), elke maat binnen SPIEGEL_MARGE. Geeft de spiegeling, of null.
 */
export function isGespiegeld(a, b) {
    if (a.length === 0 || a.length !== b.length)
        return null;
    return spiegeling(a, kenmerkVan(a), b, kenmerkVan(b));
}
/** Overhang van een paar lagen: per zijde de grootste van beide, opgeteld. */
function paarOverhang(a, b) {
    const zijde = (k) => Math.max(a.overhang[k], b.overhang[k]);
    return zijde('voor') + zijde('achter') + zijde('links') + zijde('rechts');
}
const TRANSFORMATIES = ['geen', 'spiegelY', 'spiegelX', 'draai180'];
const STEUN_EPS = 1e-9;
/**
 * Is `n` beter dan `b`? Eerst de meeste dozen in laag A (alleen met `metA`), dan de minste overhang, de minste torens,
 * de meeste steun voor de slechtst gesteunde doos (tot minSteun; daarboven telt het verschil niet), dan een paar waarin
 * laag B laag A gespiegeld is (#63) en dan de meeste dozen op twee of meer dozen eronder.
 */
function beterStand(n, b, metA = true) {
    if (metA && n.a !== b.a)
        return n.a > b.a;
    if (Math.abs(n.oh - b.oh) > EPS)
        return n.oh < b.oh;
    if (n.torens !== b.torens)
        return n.torens < b.torens;
    if (Math.abs(n.steun - b.steun) > STEUN_EPS)
        return n.steun > b.steun;
    if (n.gespiegeld !== b.gespiegeld)
        return n.gespiegeld;
    return n.score > b.score;
}
/** De maat met alleen laag B op laag A geteld. */
function standBOpA(a, b, minSteun, gespiegeld = isGespiegeld(a.dozen, b.dozen) !== null) {
    return {
        a: a.dozen.length,
        oh: paarOverhang(a, b),
        torens: torens(b.dozen, a.dozen),
        steun: Math.min(minSteun, kleinsteSteun(b.dozen, a.dozen)),
        gespiegeld,
        score: steunendeDozen(b.dozen, a.dozen),
    };
}
/** De maat met ook laag A op laag B geteld (tweezijdig verband); gespiegeld blijft gespiegeld. */
function plusAOpB(s, a, b, minSteun) {
    return {
        ...s,
        torens: s.torens + torens(a.dozen, b.dozen),
        steun: Math.min(s.steun, minSteun, kleinsteSteun(a.dozen, b.dozen)),
        score: s.score + steunendeDozen(a.dozen, b.dozen),
    };
}
/**
 * Bij precies twee lagen telt alleen B op A: ligt laag B van `p` volgens dezelfde rangorde beter op laag A dan bij `q`
 * (minste overhang, minste torens, meeste steun tot minSteun, laag B laag A gespiegeld, meeste dozen op twee of meer)?
 */
export function beterVoorTweeLagen(p, q, minSteun = 0.75) {
    return beterStand(standBOpA(p.a, p.b, minSteun), standBOpA(q.a, q.b, minSteun), false);
}
/**
 * Zoekt het verbandpaar met de meeste dozen per twee lagen. `voorraad` zijn relatieve patronen,
 * aflopend op aantal. Bij gelijke aantallen wint het paar met de meeste dozen in laag A, dan het paar
 * met de minste overhang, dan het paar met de minste torens, dan het paar waarin de slechtst gesteunde doos
 * de meeste steun heeft (tot `minSteun`), dan het paar waarin laag B laag A gespiegeld is (#63), dan het paar
 * waarin de meeste dozen op twee of meer dozen eronder steunen, en daarna het eerst gevonden paar. Bij tweezijdig
 * verband telt B op A plus A op B, bij het eenzijdige paar (precies twee lagen) alleen B op A.
 */
export function zoekVerband(voorraad, drager, maxPatronen = 24, minSteun = 0.75) {
    const basis = voorraad.slice(0, maxPatronen);
    // Alle varianten (patroon × transformatie), geplaatst op de drager.
    const varianten = [];
    const gezien = new Set();
    for (const p of basis) {
        for (const t of TRANSFORMATIES) {
            const g = plaats(transformeer(p, t), drager);
            if (!g)
                continue;
            const k = g.dozen
                .map((r) => `${r.x},${r.y},${r.w},${r.d}`)
                .sort()
                .join(';');
            if (gezien.has(k))
                continue;
            gezien.add(k);
            varianten.push(g);
        }
    }
    // Per laag één keer de kenmerken voor de spiegeltoets (#63).
    const kenmerken = varianten.map((v) => kenmerkVan(v.dozen));
    const gespiegeld = (i, j) => spiegeling(varianten[i].dozen, kenmerken[i], varianten[j].dozen, kenmerken[j]) !== null;
    // Paren aflopend op totaal, daarbinnen in voorraadvolgorde (dus aflopend op het aantal in A); binnen het
    // hoogste totaal kiest de rangorde hieronder het beste paar (#60).
    const paren = [];
    for (let i = 0; i < varianten.length; i++)
        for (let j = 0; j < varianten.length; j++)
            if (i !== j && varianten[i].dozen.length >= varianten[j].dozen.length)
                paren.push([i, j]);
    paren.sort((p, q) => {
        const sp = varianten[p[0]].dozen.length + varianten[p[1]].dozen.length;
        const sq = varianten[q[0]].dozen.length + varianten[q[1]].dozen.length;
        return sq - sp || p[0] - q[0] || p[1] - q[1];
    });
    // Per soort het beste paar: eerst het totaal, dan de rangorde van beterStand (#60).
    let eenzijdig = null;
    let eenTotaal = 0;
    // De beginstand wordt nooit vergeleken: het eerste geldige paar wint altijd.
    const leeg = { a: 0, oh: 0, torens: 0, steun: 0, gespiegeld: false, score: -1 };
    let eenStand = leeg;
    let tweezijdig = null;
    let tweeTotaal = 0;
    let tweeStand = leeg;
    /** Alleen een gespiegeld paar kan het gekozen paar nog verbeteren (zie onderaan de lus). */
    let alleenGespiegeld = false;
    for (const [i, j] of paren) {
        const a = varianten[i];
        const b = varianten[j];
        const totaal = a.dozen.length + b.dozen.length;
        // De paren staan aflopend op totaal en daarbinnen op het aantal in A; een tweezijdig paar is ook
        // eenzijdig, dus eenTotaal ≥ tweeTotaal.
        if (tweezijdig && totaal < tweeTotaal)
            break;
        let spiegel = null;
        if (alleenGespiegeld) {
            // Alleen een gespiegeld paar met evenveel dozen in laag A en zonder overhang kan nog winnen. Binnen een totaal
            // staan de paren aflopend op het aantal in A, dus bij minder dozen in A kan geen later paar meer winnen. Een
            // gespiegeld paar heeft evenveel dozen in beide lagen; de spiegeltoets is goedkoper dan de verbandtoets.
            if (a.dozen.length < tweeStand.a)
                break;
            if (a.dozen.length !== b.dozen.length || paarOverhang(a, b) > EPS)
                continue;
            spiegel = gespiegeld(i, j);
            // Het gekozen paar heeft (met alleen B op A) geen torens en genoeg steun; een gespiegeld paar moet dat ook hebben.
            if (!spiegel || !zonderTorensGesteund(b.dozen, a.dozen, minSteun))
                continue;
        }
        if (!inVerband(b.dozen, a.dozen))
            continue;
        const een = standBOpA(a, b, minSteun, spiegel ?? gespiegeld(i, j));
        if (!eenzijdig || (totaal === eenTotaal && beterStand(een, eenStand))) {
            eenzijdig = { a, b };
            eenTotaal = totaal;
            eenStand = een;
        }
        if (tweezijdig && a.dozen.length < tweeStand.a)
            continue;
        if (!inVerband(a.dozen, b.dozen))
            continue;
        const twee = plusAOpB(een, a, b, minSteun);
        if (!tweezijdig || beterStand(twee, tweeStand)) {
            tweezijdig = { a, b };
            tweeTotaal = totaal;
            tweeStand = twee;
        }
        // Geen overhang, geen torens, genoeg steun en elke doos op twee of meer dozen: beter kan alleen nog een gespiegeld
        // paar (#63), en ook dat niet als dit paar al gespiegeld is. Latere paren hebben niet meer dozen in laag A; het
        // eenzijdige paar is dan minstens zo goed als dit paar met alleen B op A, dus ook daarvoor telt alleen nog een
        // gespiegeld paar.
        if (tweeStand.oh <= EPS && tweeStand.torens === 0 && tweeStand.steun >= minSteun - STEUN_EPS && tweeStand.score === totaal) {
            if (tweeStand.gespiegeld)
                break;
            alleenGespiegeld = true;
        }
    }
    return { tweezijdig, eenzijdig };
}
