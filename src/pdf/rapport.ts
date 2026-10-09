// PDF-rapport (ontwerp §5, #21, #23, #37): één A4-pagina staand, in het Nederlands of Engels,
// met logo, groot artikelnummer, drie blokken (binnendoos, buitendoos, ladingdrager) met
// tekening en gegevens, een strook laagopbouw en een voettekst met datum en berekeningsnummer.

import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import type { Invoer, Oplossing } from '../engine/types';
import { getal, vast } from '../engine/format';
import { binnendoosSvg, bovenaanzichtSvg, buitendoosSvg, ladingSvg } from '../draw/tekeningen';

export type Taal = 'nl' | 'en';

export interface Logo {
  dataUrl: string;
  breedte: number;
  hoogte: number;
}

export interface RapportGegevens {
  invoer: Invoer;
  oplossing: Oplossing;
  berekeningsnummer: string;
  datum: Date;
  logo?: Logo | null;
}

const T = {
  nl: {
    binnendoos: 'Binnendoos',
    buitendoos: 'Buitendoos',
    ladingdrager: 'Ladingdrager',
    laagopbouw: 'Laagopbouw',
    aantalPerDoos: 'Aantal per doos',
    afmeting: 'Afmeting',
    totaalgewicht: 'Totaalgewicht',
    stand: 'Stand',
    rechtop: 'rechtop',
    gekanteld: (as: string) => `gekanteld (${as} verticaal)`,
    totaalDozen: 'Totaal aantal dozen',
    dozenPerLaag: 'Dozen per laag',
    aantalLagen: 'Aantal lagen',
    doostype: 'Doostype',
    bestaand: 'bestaande doos',
    custom: 'custom',
    karton: 'Kartongewicht (schatting)',
    drager: 'Drager',
    afmetingDrager: 'Afmeting ladingdrager',
    artikelenPerDrager: 'Artikelen per drager',
    stapelwijze: 'Stapelwijze',
    recht: 'recht (kolommen)',
    verband: 'in verband',
    laagvolgorde: 'Laagvolgorde',
    tussenlagen: 'Tussenlagen',
    geen: 'geen',
    na: 'na laag',
    maatDrager: 'dragermaat',
    maatLading: 'ladingmaat',
    bodemvel: 'Bodemvel',
    topvel: 'Topvel',
    ja: 'ja',
    overhang: 'Overhang',
    voor: 'voor',
    achter: 'achter',
    links: 'links',
    rechts: 'rechts',
    laag: 'Laag',
    voorTekst: 'VOOR',
    datum: 'Datum',
    berekening: 'Berekening',
    schatting: 'Kartongewicht is een schatting. Stabiliteit en druksterkte zijn niet beoordeeld; controleer de verpakking.',
    LBH: 'L × B × H',
    onbekend: '–',
    geenBuitendoos: 'Geen buitendoos',
    geenBuitendoosUitleg: 'De binnendozen gaan zonder buitendoos direct op de drager.',
  },
  en: {
    binnendoos: 'Inner box',
    buitendoos: 'Outer box',
    ladingdrager: 'Load carrier',
    laagopbouw: 'Layer build-up',
    aantalPerDoos: 'Quantity per box',
    afmeting: 'Dimensions',
    totaalgewicht: 'Total weight',
    stand: 'Orientation',
    rechtop: 'upright',
    gekanteld: (as: string) => `tilted (${as === 'B' ? 'W' : as} vertical)`,
    totaalDozen: 'Total number of boxes',
    dozenPerLaag: 'Boxes per layer',
    aantalLagen: 'Number of layers',
    doostype: 'Box type',
    bestaand: 'existing box',
    custom: 'custom',
    karton: 'Carton weight (estimate)',
    drager: 'Carrier',
    afmetingDrager: 'Load carrier dimensions',
    artikelenPerDrager: 'Articles per carrier',
    stapelwijze: 'Stacking',
    recht: 'column stacked',
    verband: 'interlocked',
    laagvolgorde: 'Layer sequence',
    tussenlagen: 'Tier sheets',
    geen: 'none',
    na: 'after layer',
    maatDrager: 'carrier size',
    maatLading: 'load size',
    bodemvel: 'Bottom sheet',
    topvel: 'Top sheet',
    ja: 'yes',
    overhang: 'Overhang',
    voor: 'front',
    achter: 'back',
    links: 'left',
    rechts: 'right',
    laag: 'Layer',
    voorTekst: 'FRONT',
    datum: 'Date',
    berekening: 'Calculation',
    schatting: 'Carton weight is an estimate. Stability and compression strength have not been assessed; check the packaging.',
    LBH: 'L × W × H',
    onbekend: '–',
    geenBuitendoos: 'No outer box',
    geenBuitendoosUitleg: 'The inner boxes are stacked directly on the carrier without an outer box.',
  },
};

const PAGINA = { breedte: 210, hoogte: 297, marge: 15 };

function datumTekst(d: Date, taal: Taal): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return taal === 'nl' ? `${dd}-${mm}-${d.getFullYear()}` : `${d.getFullYear()}-${mm}-${dd}`;
}

async function tekening(doc: jsPDF, svg: string, x: number, y: number, w: number, h: number) {
  const el = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement as unknown as SVGSVGElement;
  const vb = (el.getAttribute('viewBox') ?? '0 0 1 1').split(/\s+/).map(Number);
  const ratio = vb[2] / vb[3];
  let dw = w;
  let dh = w / ratio;
  if (dh > h) {
    dh = h;
    dw = h * ratio;
  }
  const houder = document.createElement('div');
  houder.style.position = 'absolute';
  houder.style.left = '-10000px';
  houder.appendChild(el);
  document.body.appendChild(houder);
  try {
    await doc.svg(el, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh });
  } finally {
    houder.remove();
  }
}

function kader(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h);
}

function regels(doc: jsPDF, x: number, y: number, w: number, titel: string, rijen: [string, string][]) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(titel, x + 4, y + 7);
  doc.setFontSize(9);
  let yy = y + 14;
  for (const [label, waarde] of rijen) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    doc.text(`${label}:`, x + 4, yy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    const regelsWaarde = doc.splitTextToSize(waarde, w - 52) as string[];
    doc.text(regelsWaarde, x + 50, yy);
    yy += 5.6 * Math.max(1, regelsWaarde.length);
  }
}

export async function maakRapport(g: RapportGegevens, taal: Taal): Promise<jsPDF> {
  const t = T[taal];
  const { invoer, oplossing: o } = g;
  const doos = o.doos;
  const bd = invoer.binnendoos;
  const n = (v: number, d = 1) => getal(v, d, taal);
  const kg = (v: number) => `${vast(v, 1, taal)} kg`;
  const maat3 = (a: number, b: number, c: number) => `${n(a)} × ${n(b)} × ${n(c)} mm`;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const { breedte: PB, marge: M } = PAGINA;

  // Kop: logo en groot artikelnummer.
  if (g.logo) {
    const maxW = 55;
    const maxH = 16;
    const s = Math.min(maxW / g.logo.breedte, maxH / g.logo.hoogte);
    const fmt = g.logo.dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(g.logo.dataUrl, fmt, M, 9, g.logo.breedte * s, g.logo.hoogte * s);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(10, 10, 10);
  doc.text(invoer.artikelcode, PB / 2, 34, { align: 'center' });
  if (invoer.omschrijving) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(invoer.omschrijving, PB / 2, 40, { align: 'center', maxWidth: PB - 2 * M });
  }

  const tekW = 68;
  const gat = 6;
  const datW = PB - 2 * M - tekW - gat;
  const rijH = 50;
  const rijGat = 5;
  let y = 45;

  // Binnendoos.
  const indBekend = doos.indeling && doos.indeling.nL * doos.indeling.nB * doos.indeling.nH === doos.binnendozenPerDoos ? doos.indeling : null;
  const standTekst = indBekend && indBekend.stand.verticaal !== 'H' ? t.gekanteld(indBekend.stand.verticaal) : indBekend ? t.rechtop : t.onbekend;
  kader(doc, M, y, tekW, rijH);
  kader(doc, M + tekW + gat, y, datW, rijH);
  if (bd) await tekening(doc, binnendoosSvg(bd, taal), M + 3, y + 3, tekW - 6, rijH - 6);
  regels(doc, M + tekW + gat, y, datW, t.binnendoos, [
    [t.aantalPerDoos, n(invoer.artikelenPerBinnendoos, 0)],
    [t.afmeting, bd ? `${maat3(bd.L, bd.B, bd.H)} (${t.LBH})` : t.onbekend],
    [t.totaalgewicht, bd ? `${getal(bd.gewicht, 3, taal)} kg` : t.onbekend],
    [t.stand, standTekst],
  ]);

  // Buitendoos.
  y += rijH + rijGat;
  // De indeling alleen tonen als die bij het aantal binnendozen hoort (§5).
  const ind = doos.indeling && doos.indeling.nL * doos.indeling.nB * doos.indeling.nH === doos.binnendozenPerDoos ? doos.indeling : null;
  kader(doc, M, y, tekW, rijH);
  kader(doc, M + tekW + gat, y, datW, rijH);
  if (doos.geenBuitendoos) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(t.geenBuitendoos, M + tekW / 2, y + rijH / 2, { align: 'center' });
    regels(doc, M + tekW + gat, y, datW, t.buitendoos, [[t.geenBuitendoos, t.geenBuitendoosUitleg]]);
  } else {
    await tekening(doc, buitendoosSvg(doos, bd, taal), M + 3, y + 3, tekW - 6, rijH - 6);
    const doostype = doos.bestaand ? t.bestaand : invoer.doostype.soort === '0201' ? 'FEFCO 0201' : t.custom;
    const rijenBuiten: [string, string][] = [
      [t.totaalDozen, doos.binnendozenPerDoos === null ? t.onbekend : n(doos.binnendozenPerDoos, 0)],
      [t.dozenPerLaag, ind ? `${n(ind.nL * ind.nB, 0)} (${n(ind.nL, 0)} × ${n(ind.nB, 0)})` : t.onbekend],
      [t.aantalLagen, ind ? n(ind.nH, 0) : t.onbekend],
      [t.afmeting, `${maat3(doos.L, doos.B, doos.H)} (${t.LBH})`],
      [t.totaalgewicht, kg(doos.gevuldGewicht)],
      [t.doostype, doostype],
    ];
    if (doos.eigenGewicht !== null && !doos.bestaand) rijenBuiten.push([t.karton, kg(doos.eigenGewicht)]);
    regels(doc, M + tekW + gat, y, datW, t.buitendoos, rijenBuiten);
  }

  // Ladingdrager.
  y += rijH + rijGat;
  kader(doc, M, y, tekW, rijH);
  kader(doc, M + tekW + gat, y, datW, rijH);
  await tekening(doc, ladingSvg(o, invoer, taal), M + 3, y + 3, tekW - 6, rijH - 6);
  const perLaag = o.lagen.map((l) => n(l.dozen.length, 0));
  const d = invoer.drager;
  const rijenDrager: [string, string][] = [
    [t.totaalDozen, n(o.buitendozenPerDrager, 0)],
    [t.dozenPerLaag, perLaag.length === 2 && perLaag[0] !== perLaag[1] ? perLaag.join(' / ') : perLaag[0]],
    [t.aantalLagen, n(o.aantalLagen, 0)],
    [t.afmetingDrager, `${n(o.omhullende.lengte)} × ${n(o.omhullende.breedte)} × ${n(o.totaleHoogte)} mm`],
    [t.totaalgewicht, kg(o.totaalGewicht)],
    [t.drager, `${d.naam} ${n(d.lengte)} × ${n(d.breedte)} × ${n(d.hoogte)} mm`],
  ];
  if (o.artikelenPerDrager !== null) rijenDrager.push([t.artikelenPerDrager, n(o.artikelenPerDrager, 0)]);
  regels(doc, M + tekW + gat, y, datW, t.ladingdrager, rijenDrager);

  // Laagopbouw: bovenaanzichten en stapelinformatie.
  y += rijH + rijGat;
  const opbouwH = 297 - 18 - y;
  kader(doc, M, y, PB - 2 * M, opbouwH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(t.laagopbouw, M + 4, y + 7);
  const lagenNr = o.lagen.map((_, idx) =>
    o.laagVolgorde
      .map((v, i) => (v === idx ? i + 1 : 0))
      .filter((v) => v > 0)
      .join(', '),
  );
  const aanzichtW = 42;
  o.lagen.forEach((_laag, idx) => {
    const ax = M + 4 + idx * (aanzichtW + 4);
    const titel = o.lagen.length > 1 ? `${t.laag} ${idx === 0 ? 'A' : 'B'}` : t.laag;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(titel, ax + aanzichtW / 2, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const nrs = doc.splitTextToSize(`(${lagenNr[idx]})`, aanzichtW) as string[];
    doc.text(nrs[0] + (nrs.length > 1 ? ' …' : ''), ax + aanzichtW / 2, y + 15.5, { align: 'center' });
  });
  for (let idx = 0; idx < o.lagen.length; idx++) {
    const ax = M + 4 + idx * (aanzichtW + 4);
    await tekening(doc, bovenaanzichtSvg(o.lagen[idx], d, { voorTekst: t.voorTekst, titel: `${t.laag} ${idx}` }), ax, y + 17, aanzichtW, opbouwH - 20);
  }
  const tx = M + 4 + o.lagen.length * (aanzichtW + 4) + 2;
  const tl = invoer.tussenlaag;
  const tussen =
    tl.soort === 'geen' || o.tussenlaagNa.length === 0
      ? t.geen
      : `${taal === 'nl' ? tl.soort : tl.soort === 'karton' ? 'cardboard' : 'wood'} ${n(tl.dikte)} mm, ${t.na} ${o.tussenlaagNa.join(', ')} (${tl.maat === 'drager' ? t.maatDrager : t.maatLading})`;
  const oh = o.overhang;
  const info: [string, string][] = [
    [t.stapelwijze, o.stapelwijze === 'verband' ? t.verband : t.recht],
    [t.laagvolgorde, o.lagen.length > 1 ? 'A, B, A, B, …' : 'A, A, A, …'],
    [t.tussenlagen, tussen],
    [t.overhang, `${t.voor} ${n(oh.voor)}, ${t.achter} ${n(oh.achter)}, ${t.links} ${n(oh.links)}, ${t.rechts} ${n(oh.rechts)} mm`],
  ];
  if (invoer.materiaal.bodemvel.aan) info.push([t.bodemvel, `${n(invoer.materiaal.bodemvel.dikte)} mm`]);
  if (invoer.materiaal.topvel.aan) info.push([t.topvel, `${n(invoer.materiaal.topvel.dikte)} mm`]);
  let iy = y + 14;
  doc.setFontSize(9);
  for (const [label, waarde] of info) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    doc.text(`${label}:`, tx, iy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    const w = doc.splitTextToSize(waarde, PB - M - 4 - (tx + 28)) as string[];
    doc.text(w, tx + 28, iy);
    iy += 5.6 * Math.max(1, w.length);
  }

  // Voettekst.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`${t.datum}: ${datumTekst(g.datum, taal)}   ·   ${t.berekening}: ${g.berekeningsnummer}`, M, 289);
  doc.text(t.schatting, PB - M, 289, { align: 'right', maxWidth: 110 });
  return doc;
}

export function bestandsnaam(artikelcode: string): string {
  const veilig = artikelcode.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'verpakking';
  return `${veilig}.pdf`;
}

export async function downloadRapport(g: RapportGegevens, taal: Taal): Promise<void> {
  const doc = await maakRapport(g, taal);
  doc.save(bestandsnaam(g.invoer.artikelcode));
}
