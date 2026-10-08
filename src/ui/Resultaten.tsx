import { useMemo, useState } from 'react';
import type { Invoer, Oplossing, Resultaat, Rol } from '../engine/types';
import { getal, vast } from '../engine/format';
import { binnendoosSvg, bovenaanzichtSvg, buitendoosSvg, ladingSvg } from '../draw/tekeningen';
import { Svg } from './velden';

const ROL: Record<Rol, string> = {
  winnaar: 'Voorkeur',
  verband: 'Beste verband',
  nietGekanteld: 'Niet gekanteld',
  alternatief: 'Alternatief',
};

const n = (v: number, d = 1) => getal(v, d);

function Kenmerken({ o }: { o: Oplossing }) {
  return (
    <div className="labels">
      <span className="label">{o.stapelwijze === 'verband' ? 'Verband' : 'Recht'}</span>
      {o.doos.gekanteld && <span className="label oranje">Binnendoos gekanteld</span>}
      {o.doos.module && <span className="label groen">Collimodule {o.doos.module}</span>}
      {(o.overhang.voor > 0 || o.overhang.achter > 0 || o.overhang.links > 0 || o.overhang.rechts > 0) && <span className="label oranje">Overhang</span>}
    </div>
  );
}

export function Kaart(props: { o: Oplossing; rol: Rol; uitleg: string[]; gekozen: boolean; onKies: () => void }) {
  const { o } = props;
  return (
    <article className={`kaart${props.gekozen ? ' gekozen' : ''}`}>
      <div className="kaart-kop">
        <span className={`rol rol-${props.rol}`}>{ROL[props.rol]}</span>
        <Kenmerken o={o} />
      </div>
      <div className="kerncijfer">
        {o.binnendozenPerDrager !== null ? (
          <>
            <strong>{n(o.binnendozenPerDrager, 0)}</strong> binnendozen per drager
          </>
        ) : (
          <>
            <strong>{n(o.buitendozenPerDrager, 0)}</strong> buitendozen per drager
          </>
        )}
      </div>
      <dl className="cijfers">
        <dt>Binnendozen per buitendoos</dt>
        <dd>{o.doos.binnendozenPerDoos === null ? '–' : n(o.doos.binnendozenPerDoos, 0)}</dd>
        <dt>Buitendozen per drager</dt>
        <dd>
          {n(o.buitendozenPerDrager, 0)} ({o.lagen.map((l) => l.dozen.length).join(' / ')} per laag × {o.aantalLagen})
        </dd>
        <dt>Artikelen per drager</dt>
        <dd>{o.artikelenPerDrager === null ? '–' : n(o.artikelenPerDrager, 0)}</dd>
        <dt>Buitenmaat</dt>
        <dd>
          {n(o.doos.L)} × {n(o.doos.B)} × {n(o.doos.H)} mm
        </dd>
        <dt>Gevulde buitendoos</dt>
        <dd>{vast(o.doos.gevuldGewicht, 2)} kg</dd>
        <dt>Totale hoogte</dt>
        <dd>{n(o.totaleHoogte)} mm</dd>
        <dt>Totaalgewicht</dt>
        <dd>{vast(o.totaalGewicht, 1)} kg</dd>
        <dt>Overhang v/a/l/r</dt>
        <dd>
          {n(o.overhang.voor)} / {n(o.overhang.achter)} / {n(o.overhang.links)} / {n(o.overhang.rechts)} mm
        </dd>
      </dl>
      <ul className="uitleg">
        {props.uitleg.map((u, i) => (
          <li key={i}>{u}</li>
        ))}
      </ul>
      <button className={props.gekozen ? 'knop' : 'knop secundair'} onClick={props.onKies}>
        {props.gekozen ? 'Gekozen' : 'Kies deze oplossing'}
      </button>
    </article>
  );
}

export function Detail(props: { o: Oplossing; invoer: Invoer; onPdf: (taal: 'nl' | 'en') => void; bezig: boolean; standaardTaal: 'nl' | 'en' }) {
  const { o, invoer } = props;
  const tekeningen = useMemo(
    () => ({
      lading: ladingSvg(o, invoer),
      buiten: buitendoosSvg(o.doos, invoer.binnendoos),
      binnen: invoer.binnendoos ? binnendoosSvg(invoer.binnendoos) : null,
      lagen: o.lagen.map((l, i) => bovenaanzichtSvg(l, invoer.drager, { voorTekst: 'VOOR', titel: `Laag ${i === 0 ? 'A' : 'B'}` })),
    }),
    [o, invoer],
  );
  const [taal, setTaal] = useState<'nl' | 'en'>(props.standaardTaal);
  const tl = invoer.tussenlaag;
  return (
    <section className="detail">
      <div className="detail-kop">
        <h2>Gekozen oplossing</h2>
        <div className="pdf-knoppen">
          <select value={taal} onChange={(e) => setTaal(e.target.value as 'nl' | 'en')} aria-label="Taal PDF">
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
          </select>
          <button className="knop" disabled={props.bezig} onClick={() => props.onPdf(taal)}>
            {props.bezig ? 'PDF maken…' : 'Exporteer PDF'}
          </button>
        </div>
      </div>
      <div className="tekeningen">
        <figure>
          <Svg svg={tekeningen.lading} />
          <figcaption>Lading op de drager</figcaption>
        </figure>
        <figure>
          <Svg svg={tekeningen.buiten} />
          <figcaption>Buitendoos {o.doos.indeling ? `(${o.doos.indeling.nL} × ${o.doos.indeling.nB} × ${o.doos.indeling.nH} binnendozen)` : ''}</figcaption>
        </figure>
        {tekeningen.binnen && (
          <figure>
            <Svg svg={tekeningen.binnen} />
            <figcaption>Binnendoos</figcaption>
          </figure>
        )}
      </div>
      <h3>Laagopbouw</h3>
      <div className="lagen">
        {tekeningen.lagen.map((s, i) => (
          <figure key={i} className="laag">
            <Svg svg={s} />
            <figcaption>
              Laag {i === 0 ? 'A' : 'B'}: lagen{' '}
              {o.laagVolgorde
                .map((v, k) => (v === i ? k + 1 : 0))
                .filter(Boolean)
                .join(', ')}
            </figcaption>
          </figure>
        ))}
        <div className="laaginfo">
          <p>
            <strong>Stapelwijze:</strong> {o.stapelwijze === 'verband' ? 'in verband (lagen A en B wisselen af)' : 'recht (alle lagen gelijk)'}
          </p>
          <p>
            <strong>Tussenlagen:</strong>{' '}
            {tl.soort === 'geen' || o.tussenlaagNa.length === 0
              ? 'geen'
              : `${tl.soort}, ${n(tl.dikte)} mm, na laag ${o.tussenlaagNa.join(', ')} (${tl.maat === 'drager' ? 'dragermaat' : 'ladingmaat'})`}
          </p>
          <p>
            <strong>Omhullende:</strong> {n(o.omhullende.lengte)} × {n(o.omhullende.breedte)} × {n(o.totaleHoogte)} mm (lengte × breedte × hoogte, inclusief overhang)
          </p>
          <p className="klein">Nummers in het bovenaanzicht geven de plaatsingsvolgorde; de voorzijde ligt onderaan.</p>
        </div>
      </div>
    </section>
  );
}

export function Overzicht(props: {
  resultaat: Resultaat;
  gekozen: Oplossing | null;
  onKies: (o: Oplossing) => void;
}) {
  const r = props.resultaat;
  if (r.top.length === 0)
    return (
      <div className="melding fout" role="alert">
        <strong>Geen geldige oplossing.</strong>
        <ul>
          {r.geenOplossing.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>
    );
  return (
    <>
      {r.log.afgekapt && (
        <div className="melding waarschuwing">
          De zoekruimte is afgekapt na {r.log.voetafdrukken} voetafdrukken. De uitkomst is de <strong>beste gevonden oplossing</strong>, geen bewezen optimum.
        </div>
      )}
      <div className="kaarten">
        {r.top.map((t) => (
          <Kaart key={t.oplossing.id} o={t.oplossing} rol={t.rol} uitleg={t.uitleg} gekozen={props.gekozen?.id === t.oplossing.id} onKies={() => props.onKies(t.oplossing)} />
        ))}
      </div>
      <p className="klein">
        {r.log.kandidaten} buitendozen en {r.log.voetafdrukken} voetafdrukken getest; {r.oplossingen.length} geldige oplossingen.
        {Object.keys(r.log.afgewezen).length > 0 &&
          ' Afgewezen: ' +
            Object.entries(r.log.afgewezen)
              .map(([k, v]) => `${AFWIJZING[k] ?? k} ${v}×`)
              .join(', ') +
            '.'}
      </p>
    </>
  );
}

const AFWIJZING: Record<string, string> = {
  voetafdruk: 'te groot voor de drager',
  gewichtDoos: 'buitendoos te zwaar',
  buitenmaat: 'buiten min./max. buitenmaat',
  hoogte: 'te hoog',
  gewichtDrager: 'drager te zwaar',
  pastNietOpDrager: 'past niet op de drager',
  overhang: 'overhang niet toegestaan',
};
