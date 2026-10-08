import type { Drager } from './types';

/** Collimodule-voetafdrukken voor de europallet (#31), L × B in mm. */
export const MODULES: [number, number][] = [
  [600, 400],
  [400, 300],
  [300, 200],
  [200, 150],
];

/** Per as mag de doos hoogstens zoveel kleiner zijn dan de modulemaat (#31). */
export const MODULE_MARGE = 10;

const EPS = 1e-6;

/** Europallet = type pallet met ladingvlak 1200 × 800 mm, ongeacht naam of hoogte (§3). */
export function isEuropallet(d: Drager): boolean {
  return d.type === 'pallet' && Math.max(d.lengte, d.breedte) === 1200 && Math.min(d.lengte, d.breedte) === 800;
}

/** Geeft "600 × 400" als de voetafdruk een collimodule is, anders null. */
export function moduleVan(L: number, B: number): string | null {
  const l = Math.max(L, B);
  const b = Math.min(L, B);
  for (const [m1, m2] of MODULES) {
    if (l <= m1 + EPS && l >= m1 - MODULE_MARGE - EPS && b <= m2 + EPS && b >= m2 - MODULE_MARGE - EPS) return `${m1} × ${m2}`;
  }
  return null;
}

/** Som van de absolute verschillen in L en B tot de dichtstbijzijnde module (hoogte telt niet, #9). */
export function moduleAfstand(L: number, B: number): number {
  const l = Math.max(L, B);
  const b = Math.min(L, B);
  let best = Infinity;
  for (const [m1, m2] of MODULES) best = Math.min(best, Math.abs(l - m1) + Math.abs(b - m2));
  return Math.round(best * 1e6) / 1e6;
}
