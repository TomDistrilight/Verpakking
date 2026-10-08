// Isometrische projectie en tekenhulpen. De kijker staat rechtsvoor-boven:
// x loopt naar rechts (breedte), y naar achter (lengte), z omhoog.

export interface Blok {
  x: number;
  y: number;
  z: number;
  w: number; // langs x
  d: number; // langs y
  h: number; // langs z
  kleur: string;
  /** Alleen omtrek, geen vulling (bijvoorbeeld een doorzichtige doos). */
  open?: boolean;
  lijn?: string;
}

const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);

export function proj(x: number, y: number, z: number): [number, number] {
  return [(x + y) * C, (x - y) * S - z];
}

export function mengKleur(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(factor >= 1 ? c + (255 - c) * (factor - 1) : c * factor)));
  return `#${((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0')}`;
}

const p2 = (v: number) => Math.round(v * 100) / 100;

function poly(punten: [number, number][], vulling: string, lijn: string, dikte: number): string {
  const pts = punten.map(([a, b]) => `${p2(a)},${p2(b)}`).join(' ');
  return `<polygon points="${pts}" fill="${vulling}" stroke="${lijn}" stroke-width="${p2(dikte)}" stroke-linejoin="round"/>`;
}

/** Tekent de drie zichtbare vlakken van een blok: boven, voor (y = y0) en rechts (x = x1). */
export function blokSvg(b: Blok, dikte: number): string {
  const { x, y, z, w, d, h } = b;
  const x1 = x + w;
  const y1 = y + d;
  const z1 = z + h;
  const lijn = b.lijn ?? '#1d2a3a';
  const boven = [proj(x, y, z1), proj(x1, y, z1), proj(x1, y1, z1), proj(x, y1, z1)];
  const voor = [proj(x, y, z), proj(x1, y, z), proj(x1, y, z1), proj(x, y, z1)];
  const rechts = [proj(x1, y, z), proj(x1, y1, z), proj(x1, y1, z1), proj(x1, y, z1)];
  if (b.open) {
    return [poly(boven, 'none', lijn, dikte), poly(voor, 'none', lijn, dikte), poly(rechts, 'none', lijn, dikte)].join('');
  }
  return [
    poly(voor, b.kleur, lijn, dikte),
    poly(rechts, mengKleur(b.kleur, 0.78), lijn, dikte),
    poly(boven, mengKleur(b.kleur, 1.25), lijn, dikte),
  ].join('');
}

/** Ligt b dichter bij de kijker dan a? (alleen zinvol als ze een scheidende as hebben) */
function dichterbij(a: Blok, b: Blok): number {
  const E = 1e-6;
  if (a.x + a.w <= b.x + E) return 1; // b rechts van a: b dichterbij
  if (b.x + b.w <= a.x + E) return -1;
  if (a.y >= b.y + b.d - E) return 1; // a achter b: b dichterbij
  if (b.y >= a.y + a.d - E) return -1;
  if (a.z + a.h <= b.z + E) return 1; // b boven a
  if (b.z + b.h <= a.z + E) return -1;
  return 0;
}

/**
 * Overlappen de projecties van twee blokken? Een isometrische zeshoek wordt begrensd door de
 * grootheden y + z, x − z en x + y; de zeshoeken overlappen alleen als alle drie de bereiken overlappen.
 */
function projectiesOverlappen(a: Blok, b: Blok): boolean {
  const E = 1e-6;
  const bereik = (k: Blok, f: (x: number, y: number, z: number) => number): [number, number] => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const x of [k.x, k.x + k.w]) for (const y of [k.y, k.y + k.d]) for (const z of [k.z, k.z + k.h]) {
      const v = f(x, y, z);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return [lo, hi];
  };
  for (const f of [(_x: number, y: number, z: number) => y + z, (x: number, _y: number, z: number) => x - z, (x: number, y: number) => x + y]) {
    const [a0, a1] = bereik(a, f);
    const [b0, b1] = bereik(b, f);
    if (a1 <= b0 + E || b1 <= a0 + E) return false;
  }
  return true;
}

/** Tekenvolgorde van ver naar dichtbij (topologisch, met terugval op een dieptesleutel). */
export function sorteer(blokken: Blok[]): Blok[] {
  const n = blokken.length;
  const sleutel = (b: Blok) => b.x + b.w / 2 - (b.y + b.d / 2) + (b.z + b.h / 2);
  if (n > 1500) return [...blokken].sort((a, b) => sleutel(a) - sleutel(b));
  const na: number[][] = Array.from({ length: n }, () => []);
  const inGraad = new Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (!projectiesOverlappen(blokken[i], blokken[j])) continue;
      const r = dichterbij(blokken[i], blokken[j]);
      if (r > 0) {
        na[i].push(j);
        inGraad[j]++;
      } else if (r < 0) {
        na[j].push(i);
        inGraad[i]++;
      }
    }
  const klaar: number[] = [];
  const rij = blokken.map((_, i) => i).filter((i) => inGraad[i] === 0);
  rij.sort((a, b) => sleutel(blokken[a]) - sleutel(blokken[b]));
  while (rij.length) {
    const i = rij.shift()!;
    klaar.push(i);
    for (const j of na[i]) if (--inGraad[j] === 0) rij.push(j);
  }
  if (klaar.length < n) return [...blokken].sort((a, b) => sleutel(a) - sleutel(b));
  return klaar.map((i) => blokken[i]);
}

export interface Grenzen {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function grenzenVan(punten: [number, number][]): Grenzen {
  const g = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [a, b] of punten) {
    g.minX = Math.min(g.minX, a);
    g.minY = Math.min(g.minY, b);
    g.maxX = Math.max(g.maxX, a);
    g.maxY = Math.max(g.maxY, b);
  }
  return g;
}

export function hoeken(b: Blok): [number, number][] {
  const uit: [number, number][] = [];
  for (const x of [b.x, b.x + b.w]) for (const y of [b.y, b.y + b.d]) for (const z of [b.z, b.z + b.h]) uit.push(proj(x, y, z));
  return uit;
}

export function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Maatlijn tussen twee 3D-punten, verschoven in schermrichting (dx, dy), met tekst in het midden. */
export function maatlijn(
  a: [number, number, number],
  b: [number, number, number],
  verschuiving: [number, number],
  tekst: string,
  opmaak: { lijn: number; letter: number; kleur?: string },
): string {
  const [ax, ay] = proj(...a);
  const [bx, by] = proj(...b);
  const [dx, dy] = verschuiving;
  const k = opmaak.kleur ?? '#334155';
  const x1 = ax + dx;
  const y1 = ay + dy;
  const x2 = bx + dx;
  const y2 = by + dy;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const lengte = Math.hypot(dx, dy) || 1;
  const tx = mx + (dx / lengte) * opmaak.letter * 0.9;
  const ty = my + (dy / lengte) * opmaak.letter * 0.9 + opmaak.letter * 0.35;
  return [
    `<line x1="${p2(ax)}" y1="${p2(ay)}" x2="${p2(x1)}" y2="${p2(y1)}" stroke="${k}" stroke-width="${p2(opmaak.lijn * 0.6)}" stroke-dasharray="${p2(opmaak.lijn * 3)},${p2(opmaak.lijn * 2)}"/>`,
    `<line x1="${p2(bx)}" y1="${p2(by)}" x2="${p2(x2)}" y2="${p2(y2)}" stroke="${k}" stroke-width="${p2(opmaak.lijn * 0.6)}" stroke-dasharray="${p2(opmaak.lijn * 3)},${p2(opmaak.lijn * 2)}"/>`,
    `<line x1="${p2(x1)}" y1="${p2(y1)}" x2="${p2(x2)}" y2="${p2(y2)}" stroke="${k}" stroke-width="${p2(opmaak.lijn)}"/>`,
    `<circle cx="${p2(x1)}" cy="${p2(y1)}" r="${p2(opmaak.lijn * 1.6)}" fill="${k}"/>`,
    `<circle cx="${p2(x2)}" cy="${p2(y2)}" r="${p2(opmaak.lijn * 1.6)}" fill="${k}"/>`,
    `<text x="${p2(tx)}" y="${p2(ty)}" font-family="Helvetica, Arial, sans-serif" font-size="${p2(opmaak.letter)}" fill="${k}" text-anchor="middle">${esc(tekst)}</text>`,
  ].join('');
}

export function svgOmhulsel(inhoud: string, g: Grenzen, marge: number, titel: string): string {
  const x = g.minX - marge;
  const y = g.minY - marge;
  const w = g.maxX - g.minX + 2 * marge;
  const h = g.maxY - g.minY + 2 * marge;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${p2(x)} ${p2(y)} ${p2(w)} ${p2(h)}" width="${p2(w)}" height="${p2(h)}" role="img" aria-label="${esc(titel)}">${inhoud}</svg>`;
}
