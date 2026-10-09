// Plaatsing van een laag op de drager (ontwerp §4.2): centreren, of bij toegestane asymmetrie
// verschuiven tot elke zijde binnen zijn overhangmaximum blijft.

import type { Drager, Overhang, Rechthoek } from './types';
import { naarOorsprong, omhullende } from './laagpatroon';

const EPS = 1e-6;
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** Werkelijk toegestane overhang: 0 bij een kar of als overhang niet is toegestaan. */
export function effectieveOverhang(drager: Drager): Overhang {
  if (drager.type === 'kar' || !drager.overhangToegestaan) return { voor: 0, achter: 0, links: 0, rechts: 0 };
  const o = drager.overhang;
  return { voor: Math.max(0, o.voor), achter: Math.max(0, o.achter), links: Math.max(0, o.links), rechts: Math.max(0, o.rechts) };
}

/** Vlakken waarin een laag gezocht wordt: eerst zonder overhang, dan met de maximale overhang. */
export function zoekvlakken(drager: Drager): { W: number; D: number; metOverhang: boolean }[] {
  const vlakken = [{ W: drager.breedte, D: drager.lengte, metOverhang: false }];
  const o = effectieveOverhang(drager);
  const W = drager.asymmetrieToegestaan ? drager.breedte + o.links + o.rechts : drager.breedte + 2 * Math.min(o.links, o.rechts);
  const D = drager.asymmetrieToegestaan ? drager.lengte + o.voor + o.achter : drager.lengte + 2 * Math.min(o.voor, o.achter);
  if (W > drager.breedte + EPS || D > drager.lengte + EPS) vlakken.push({ W, D, metOverhang: true });
  return vlakken;
}

function as(len: number, maat: number, minZijde: number, maxZijde: number, asym: boolean): number | null {
  // offset = positie van de linker (of voorste) rand van de lading ten opzichte van de drager
  const lo = -minZijde;
  const hi = len + maxZijde - maat;
  if (lo > hi + EPS) return null;
  const midden = (len - maat) / 2;
  if (midden >= lo - EPS && midden <= hi + EPS) return midden;
  if (!asym) return null;
  return Math.min(Math.max(midden, lo), hi);
}

export interface GeplaatsteLaag {
  dozen: Rechthoek[];
  overhang: Overhang;
}

/** Plaatst een patroon op de drager; null als dat niet binnen de overhangregels kan. */
export function plaats(patroon: Rechthoek[], drager: Drager): GeplaatsteLaag | null {
  const rel = naarOorsprong(patroon);
  const o = omhullende(rel);
  const oh = effectieveOverhang(drager);
  const asym = drager.asymmetrieToegestaan;
  const ox = as(drager.breedte, o.w, oh.links, oh.rechts, asym);
  const oy = as(drager.lengte, o.d, oh.voor, oh.achter, asym);
  if (ox === null || oy === null) return null;
  const dozen = rel.map((r) => ({ x: r6(r.x + ox), y: r6(r.y + oy), w: r.w, d: r.d }));
  return { dozen, overhang: overhangVan(dozen, drager) };
}

export function overhangVan(dozen: Rechthoek[], drager: Drager): Overhang {
  const o = omhullende(dozen);
  return {
    links: r6(Math.max(0, -o.x)),
    rechts: r6(Math.max(0, o.x + o.w - drager.breedte)),
    voor: r6(Math.max(0, -o.y)),
    achter: r6(Math.max(0, o.y + o.d - drager.lengte)),
  };
}

/** Controle per doos (§4.2): geen doos voorbij een ingesteld maximum. */
export function binnenGrenzen(dozen: Rechthoek[], drager: Drager): boolean {
  const oh = effectieveOverhang(drager);
  for (const r of dozen) {
    if (r.x < -oh.links - EPS) return false;
    if (r.x + r.w > drager.breedte + oh.rechts + EPS) return false;
    if (r.y < -oh.voor - EPS) return false;
    if (r.y + r.d > drager.lengte + oh.achter + EPS) return false;
  }
  return true;
}
