import { useState } from 'react';
import type { Berekening, GekozenOplossing, Instellingen } from '../data/opslag';
import { regelUitBerekening } from '../data/opslag';
import { getal } from '../engine/format';
import { downloadRapport } from '../pdf/rapport';
import { logoVoorPdf } from './logo';

export function Geschiedenis(props: {
  berekeningen: Berekening[];
  instellingen: Instellingen;
  onOpenen: (b: Berekening) => void;
  onNaarOverzicht: (regel: GekozenOplossing) => Promise<boolean>;
  onVerwijder: (nummer: string) => Promise<void>;
}) {
  const [fout, setFout] = useState('');
  const [melding, setMelding] = useState('');

  async function naarOverzicht(b: Berekening) {
    setFout('');
    const vervangen = await props.onNaarOverzicht(regelUitBerekening(b, b.oplossing, 'nl'));
    setMelding(
      vervangen
        ? `Berekening ${b.nummer} staat in het overzicht; de open regel van artikel ${b.artikelcode} is vervangen (verwachte leverdatum en taal blijven staan).`
        : `Berekening ${b.nummer} staat in het overzicht.`,
    );
  }
  const lijst = [...props.berekeningen].sort((a, b) => (a.datum < b.datum ? 1 : -1));

  async function pdf(b: Berekening, taal: 'nl' | 'en') {
    setFout('');
    try {
      // Het logo van de eerdere export, zodat het PDF hetzelfde blijft; anders het huidige logo.
      const logo = b.logo !== undefined ? b.logo : await logoVoorPdf(props.instellingen);
      await downloadRapport({ invoer: b.invoer, oplossing: b.oplossing, berekeningsnummer: b.nummer, datum: new Date(b.datum), logo }, taal);
    } catch (e) {
      setFout(`PDF maken mislukt: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="pagina">
      <div className="pagina-kop">
        <h2>Geschiedenis</h2>
      </div>
      <p>Elke berekening met een oplossing wordt hier met al zijn invoer, de top drie en het zoeklog bewaard, zodat het PDF later precies opnieuw te maken is.</p>
      {fout && <div className="melding fout">{fout}</div>}
      {melding && (
        <div className="melding ok" role="status">
          {melding}
        </div>
      )}
      {lijst.length === 0 ? (
        <p className="leeg">Nog geen berekeningen bewaard. Reken een artikel door op het rekenscherm.</p>
      ) : (
        <table className="tabel">
          <thead>
            <tr>
              <th>Nummer</th>
              <th>Datum</th>
              <th>Artikel</th>
              <th>Buitendoos (mm)</th>
              <th>Per drager</th>
              <th>Drager</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lijst.map((b) => {
              const o = b.oplossing;
              return (
                <tr key={b.nummer}>
                  <td>{b.nummer}</td>
                  <td>{new Date(b.datum).toLocaleString('nl-NL')}</td>
                  <td>{b.artikelcode}</td>
                  <td>
                    {getal(o.doos.L, 1)} × {getal(o.doos.B, 1)} × {getal(o.doos.H, 1)}
                    {o.doos.geenBuitendoos && <div className="klein">geen buitendoos</div>}
                  </td>
                  <td>
                    {o.binnendozenPerDrager !== null ? `${o.binnendozenPerDrager} binnendozen` : `${o.buitendozenPerDrager} buitendozen`} ({o.stapelwijze})
                  </td>
                  <td>{b.invoer.drager.naam}</td>
                  <td className="rij-acties">
                    <button className="knop klein" onClick={() => void pdf(b, 'nl')}>
                      PDF NL
                    </button>
                    <button className="knop klein" onClick={() => void pdf(b, 'en')}>
                      PDF EN
                    </button>
                    <button className="knop klein secundair" onClick={() => void naarOverzicht(b)}>
                      Naar overzicht
                    </button>
                    <button className="knop klein secundair" onClick={() => props.onOpenen(b)}>
                      Open invoer
                    </button>
                    <button
                      className="knop klein gevaar"
                      onClick={() => {
                        if (confirm(`Berekening ${b.nummer} verwijderen?`)) void props.onVerwijder(b.nummer);
                      }}
                    >
                      Verwijder
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
