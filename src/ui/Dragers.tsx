import { useState } from 'react';
import type { Drager } from '../engine/types';
import { STANDAARD_DRAGERS, kopieDrager } from '../engine/standaard';
import { getal } from '../engine/format';
import { g } from './formulier';
import { Getal, Keuze, Rij, Tekst, Vink } from './velden';

type Velden = Record<'naam' | 'lengte' | 'breedte' | 'hoogte' | 'gewicht' | 'maxGewicht' | 'maxHoogte' | 'voor' | 'achter' | 'links' | 'rechts', string>;

const t = (v: number) => (Number.isNaN(v) ? '' : String(v).replace('.', ','));

function naarVelden(d: Drager): Velden {
  return {
    naam: d.naam,
    lengte: t(d.lengte),
    breedte: t(d.breedte),
    hoogte: t(d.hoogte),
    gewicht: t(d.gewicht),
    maxGewicht: t(d.maxTotaalGewicht),
    maxHoogte: t(d.maxTotaleHoogte),
    voor: t(d.overhang.voor),
    achter: t(d.overhang.achter),
    links: t(d.overhang.links),
    rechts: t(d.overhang.rechts),
  };
}

export function Dragers(props: { dragers: Drager[]; onOpslaan: (d: Drager[]) => Promise<void> }) {
  const [bewerk, setBewerk] = useState<{ d: Drager; v: Velden; nieuw: boolean } | null>(null);
  const [fout, setFout] = useState('');

  function start(d: Drager, nieuw: boolean) {
    setBewerk({ d: kopieDrager(d), v: naarVelden(d), nieuw });
    setFout('');
  }

  async function opslaan() {
    if (!bewerk) return;
    const { v, d } = bewerk;
    const nieuw: Drager = {
      ...d,
      naam: v.naam.trim(),
      lengte: g(v.lengte),
      breedte: g(v.breedte),
      hoogte: g(v.hoogte),
      gewicht: g(v.gewicht),
      maxTotaalGewicht: g(v.maxGewicht),
      maxTotaleHoogte: g(v.maxHoogte),
      overhang: { voor: g(v.voor) || 0, achter: g(v.achter) || 0, links: g(v.links) || 0, rechts: g(v.rechts) || 0 },
      overhangToegestaan: d.type === 'kar' ? false : d.overhangToegestaan,
    };
    if (!nieuw.naam) return setFout('Geef de drager een naam.');
    if (![nieuw.lengte, nieuw.breedte, nieuw.maxTotaalGewicht, nieuw.maxTotaleHoogte].every((x) => x > 0)) return setFout('Lengte, breedte en de maxima moeten groter dan 0 zijn.');
    if (!(nieuw.hoogte >= 0) || !(nieuw.gewicht >= 0)) return setFout('Hoogte en gewicht mogen niet negatief zijn; vul ze expliciet in.');
    if (nieuw.maxTotaleHoogte <= nieuw.hoogte) return setFout('De maximale totale hoogte moet groter zijn dan de hoogte van de drager.');
    const lijst = bewerk.nieuw ? [...props.dragers, nieuw] : props.dragers.map((x) => (x.id === nieuw.id ? nieuw : x));
    await props.onOpslaan(lijst);
    setBewerk(null);
  }

  const b = bewerk;
  const zet = (w: Partial<Velden>) => b && setBewerk({ ...b, v: { ...b.v, ...w } });
  return (
    <div className="pagina">
      <div className="pagina-kop">
        <h2>Ladingdragers</h2>
        <div className="acties">
          <button
            className="knop"
            onClick={() =>
              start(
                {
                  ...kopieDrager(STANDAARD_DRAGERS[0]),
                  id: `drager-${Date.now()}`,
                  naam: '',
                  type: 'pallet',
                },
                true,
              )
            }
          >
            Nieuwe drager
          </button>
          <button
            className="knop secundair"
            onClick={() =>
              start(
                {
                  ...kopieDrager(STANDAARD_DRAGERS[0]),
                  id: `kar-${Date.now()}`,
                  naam: '',
                  type: 'kar',
                  hoogte: Number.NaN,
                  gewicht: Number.NaN,
                  overhangToegestaan: false,
                },
                true,
              )
            }
          >
            Nieuwe kar
          </button>
        </div>
      </div>
      {b && (
        <div className="paneel">
          <h3>{b.nieuw ? (b.d.type === 'kar' ? 'Nieuwe kar' : 'Nieuwe drager') : `${b.d.naam} bewerken`}</h3>
          <Rij>
            <Tekst label="Naam" waarde={b.v.naam} onChange={(x) => zet({ naam: x })} />
            <Keuze
              label="Type"
              waarde={b.d.type}
              opties={[
                { waarde: 'pallet', tekst: 'Pallet' },
                { waarde: 'kar', tekst: 'Kar / rolcontainer' },
              ]}
              onChange={(x) => setBewerk({ ...b, d: { ...b.d, type: x, overhangToegestaan: x === 'kar' ? false : b.d.overhangToegestaan } })}
            />
          </Rij>
          <Rij>
            <Getal label={b.d.type === 'kar' ? 'Binnenlengte (voor → achter)' : 'Lengte (voor → achter)'} eenheid="mm" waarde={b.v.lengte} onChange={(x) => zet({ lengte: x })} />
            <Getal label={b.d.type === 'kar' ? 'Binnenbreedte' : 'Breedte (voorzijde)'} eenheid="mm" waarde={b.v.breedte} onChange={(x) => zet({ breedte: x })} />
            <Getal label={b.d.type === 'kar' ? 'Vloerhoogte' : 'Eigen hoogte'} eenheid="mm" waarde={b.v.hoogte} onChange={(x) => zet({ hoogte: x })} />
            <Getal
              label="Eigen gewicht"
              eenheid="kg"
              waarde={b.v.gewicht}
              hint={b.d.type === 'kar' ? 'Expliciet invullen; 25 kg/m² is hoogstens een startwaarde.' : undefined}
              onChange={(x) => zet({ gewicht: x })}
            />
          </Rij>
          <Rij>
            <Getal label="Max. totaalgewicht incl. drager" eenheid="kg" waarde={b.v.maxGewicht} onChange={(x) => zet({ maxGewicht: x })} />
            <Getal label="Max. totale hoogte incl. drager" eenheid="mm" waarde={b.v.maxHoogte} onChange={(x) => zet({ maxHoogte: x })} />
          </Rij>
          {b.d.type === 'pallet' && (
            <>
              <div className="vinken">
                <Vink label="Overhang toegestaan" aan={b.d.overhangToegestaan} onChange={(x) => setBewerk({ ...b, d: { ...b.d, overhangToegestaan: x } })} />
                <Vink label="Asymmetrische overhang toegestaan" aan={b.d.asymmetrieToegestaan} onChange={(x) => setBewerk({ ...b, d: { ...b.d, asymmetrieToegestaan: x } })} />
              </div>
              <Rij>
                <Getal label="Max. voor" eenheid="mm" waarde={b.v.voor} uit={!b.d.overhangToegestaan} onChange={(x) => zet({ voor: x })} />
                <Getal label="Max. achter" eenheid="mm" waarde={b.v.achter} uit={!b.d.overhangToegestaan} onChange={(x) => zet({ achter: x })} />
                <Getal label="Max. links" eenheid="mm" waarde={b.v.links} uit={!b.d.overhangToegestaan} onChange={(x) => zet({ links: x })} />
                <Getal label="Max. rechts" eenheid="mm" waarde={b.v.rechts} uit={!b.d.overhangToegestaan} onChange={(x) => zet({ rechts: x })} />
              </Rij>
            </>
          )}
          {fout && <div className="melding fout">{fout}</div>}
          <div className="acties">
            <button className="knop" onClick={opslaan}>
              Opslaan
            </button>
            <button className="knop secundair" onClick={() => setBewerk(null)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
      <table className="tabel">
        <thead>
          <tr>
            <th>Naam</th>
            <th>Type</th>
            <th>Ladingvlak (mm)</th>
            <th>Hoogte (mm)</th>
            <th>Gewicht (kg)</th>
            <th>Max. hoogte (mm)</th>
            <th>Max. gewicht (kg)</th>
            <th>Overhang v/a/l/r (mm)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {props.dragers.map((d) => (
            <tr key={d.id}>
              <td>{d.naam}</td>
              <td>{d.type === 'kar' ? 'kar' : 'pallet'}</td>
              <td>
                {getal(d.lengte, 1)} × {getal(d.breedte, 1)}
              </td>
              <td>{getal(d.hoogte, 1)}</td>
              <td>{getal(d.gewicht, 1)}</td>
              <td>{getal(d.maxTotaleHoogte, 1)}</td>
              <td>{getal(d.maxTotaalGewicht, 1)}</td>
              <td>{d.overhangToegestaan ? `${d.overhang.voor} / ${d.overhang.achter} / ${d.overhang.links} / ${d.overhang.rechts}` : 'geen'}</td>
              <td className="rij-acties">
                <button className="knop klein secundair" onClick={() => start(d, false)}>
                  Bewerk
                </button>
                <button
                  className="knop klein gevaar"
                  disabled={props.dragers.length <= 1}
                  onClick={() => {
                    if (confirm(`${d.naam} verwijderen?`)) void props.onOpslaan(props.dragers.filter((x) => x.id !== d.id));
                  }}
                >
                  Verwijder
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="klein">"Voor" is de korte zijde van de drager; de lengte loopt van voor naar achter. Een pallet met ladingvlak 1200 × 800 mm telt als europallet (collimoduleregel).</p>
    </div>
  );
}
