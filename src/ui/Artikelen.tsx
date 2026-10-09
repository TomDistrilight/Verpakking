import { useMemo, useState } from 'react';
import type { Artikel } from '../data/opslag';
import { getal } from '../engine/format';
import { g } from './formulier';
import { Getal, Rij, Tekst, Vink } from './velden';

interface Bewerk {
  artikelcode: string;
  omschrijving: string;
  aantal: string;
  zonder: boolean;
  zonderBuitendoos: boolean;
  L: string;
  B: string;
  H: string;
  gewicht: string;
  kantelbaar: boolean;
  magL: boolean;
  magB: boolean;
  nieuw: boolean;
}

const tekst = (v: number) => String(v).replace('.', ',');

function naarBewerk(a?: Artikel): Bewerk {
  if (!a)
    return {
      artikelcode: '',
      omschrijving: '',
      aantal: '1',
      zonder: false,
      zonderBuitendoos: false,
      L: '',
      B: '',
      H: '',
      gewicht: '',
      kantelbaar: false,
      magL: false,
      magB: false,
      nieuw: true,
    };
  return {
    artikelcode: a.artikelcode,
    omschrijving: a.omschrijving,
    aantal: tekst(a.artikelenPerBinnendoos),
    zonder: a.zonderBinnendoos,
    zonderBuitendoos: !!a.zonderBuitendoos,
    L: tekst(a.binnendoos.L),
    B: tekst(a.binnendoos.B),
    H: tekst(a.binnendoos.H),
    gewicht: tekst(a.binnendoos.gewicht),
    kantelbaar: a.binnendoos.kantelbaar,
    magL: a.binnendoos.magVerticaal.L,
    magB: a.binnendoos.magVerticaal.B,
    nieuw: false,
  };
}

export function Artikelen(props: {
  artikelen: Record<string, Artikel>;
  onOpslaan: (a: Artikel, oudeCode?: string) => Promise<void>;
  onVerwijder: (code: string) => Promise<void>;
  onBereken: (a: Artikel) => void;
}) {
  const [zoek, setZoek] = useState('');
  const [bewerk, setBewerk] = useState<Bewerk | null>(null);
  const [oudeCode, setOudeCode] = useState<string | undefined>();
  const [fout, setFout] = useState('');
  const lijst = useMemo(() => {
    const z = zoek.trim().toLowerCase();
    return Object.values(props.artikelen)
      .filter((a) => !z || a.artikelcode.toLowerCase().includes(z) || a.omschrijving.toLowerCase().includes(z))
      .sort((a, b) => a.artikelcode.localeCompare(b.artikelcode, 'nl', { numeric: true }));
  }, [props.artikelen, zoek]);

  async function opslaan() {
    if (!bewerk) return;
    const code = bewerk.artikelcode.trim();
    const maten = [g(bewerk.L), g(bewerk.B), g(bewerk.H), g(bewerk.gewicht)];
    const aantal = bewerk.zonder ? 1 : g(bewerk.aantal);
    if (!code) return setFout('Vul een artikelnummer in.');
    if (maten.some((m) => !(m > 0))) return setFout('Lengte, breedte, hoogte en gewicht moeten groter dan 0 zijn.');
    if (!Number.isInteger(aantal) || aantal < 1) return setFout('Aantal artikelen per binnendoos moet een geheel getal van minstens 1 zijn.');
    if (bewerk.kantelbaar && !bewerk.magL && !bewerk.magB) return setFout('Kies bij kantelbaar welke as verticaal mag staan.');
    if (code !== oudeCode && props.artikelen[code]) return setFout(`Artikelnummer ${code} bestaat al.`);
    await props.onOpslaan(
      {
        artikelcode: code,
        omschrijving: bewerk.omschrijving.trim(),
        artikelenPerBinnendoos: aantal,
        zonderBinnendoos: bewerk.zonder,
        ...(bewerk.zonderBuitendoos ? { zonderBuitendoos: true } : {}),
        binnendoos: {
          L: maten[0],
          B: maten[1],
          H: maten[2],
          gewicht: maten[3],
          kantelbaar: bewerk.kantelbaar,
          magVerticaal: { L: bewerk.kantelbaar && bewerk.magL, B: bewerk.kantelbaar && bewerk.magB },
        },
        bijgewerkt: new Date().toISOString(),
      },
      oudeCode,
    );
    setBewerk(null);
    setFout('');
  }

  const b = bewerk;
  return (
    <div className="pagina">
      <div className="pagina-kop">
        <h2>Artikelen</h2>
        <div className="acties">
          <input className="zoek" placeholder="Zoek op nummer of omschrijving" value={zoek} onChange={(e) => setZoek(e.target.value)} aria-label="Zoeken" />
          <button
            className="knop"
            onClick={() => {
              setBewerk(naarBewerk());
              setOudeCode(undefined);
              setFout('');
            }}
          >
            Nieuw artikel
          </button>
        </div>
      </div>
      {b && (
        <div className="paneel">
          <h3>{b.nieuw ? 'Nieuw artikel' : `Artikel ${oudeCode} bewerken`}</h3>
          <Rij>
            <Tekst label="Artikelnummer" waarde={b.artikelcode} onChange={(v) => setBewerk({ ...b, artikelcode: v })} />
            <Tekst label="Omschrijving" waarde={b.omschrijving} onChange={(v) => setBewerk({ ...b, omschrijving: v })} />
            <Getal label="Artikelen per binnendoos" waarde={b.aantal} uit={b.zonder} onChange={(v) => setBewerk({ ...b, aantal: v })} />
          </Rij>
          <Vink label="Artikel zonder binnendoos (telt als binnendoos met 1 stuk)" aan={b.zonder} onChange={(v) => setBewerk({ ...b, zonder: v })} />
          <Vink
            label={`Geen buitendoos: ${b.zonder ? 'het artikel' : 'de binnendoos'} gaat direct op de drager`}
            aan={b.zonderBuitendoos}
            onChange={(v) => setBewerk({ ...b, zonderBuitendoos: v })}
          />
          <Rij>
            <Getal label="Lengte" eenheid="mm" waarde={b.L} onChange={(v) => setBewerk({ ...b, L: v })} />
            <Getal label="Breedte" eenheid="mm" waarde={b.B} onChange={(v) => setBewerk({ ...b, B: v })} />
            <Getal label="Hoogte (rechtop)" eenheid="mm" waarde={b.H} onChange={(v) => setBewerk({ ...b, H: v })} />
            <Getal label={b.zonder ? 'Gewicht' : 'Gewicht gevuld'} eenheid="kg" waarde={b.gewicht} onChange={(v) => setBewerk({ ...b, gewicht: v })} />
          </Rij>
          <div className="vinken">
            <Vink label="Kantelbaar" aan={b.kantelbaar} onChange={(v) => setBewerk({ ...b, kantelbaar: v })} />
            <Vink label="L mag verticaal" aan={b.magL} uit={!b.kantelbaar} onChange={(v) => setBewerk({ ...b, magL: v })} />
            <Vink label="B mag verticaal" aan={b.magB} uit={!b.kantelbaar} onChange={(v) => setBewerk({ ...b, magB: v })} />
          </div>
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
      {lijst.length === 0 ? (
        <p className="leeg">Nog geen artikelen. Voeg er een toe, importeer een Excel-bestand of sla een artikel op vanuit het rekenscherm.</p>
      ) : (
        <table className="tabel">
          <thead>
            <tr>
              <th>Artikelnummer</th>
              <th>Omschrijving</th>
              <th>Binnendoos L × B × H (mm)</th>
              <th>Gewicht (kg)</th>
              <th>Per binnendoos</th>
              <th>Kantelbaar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lijst.map((a) => (
              <tr key={a.artikelcode}>
                <td>{a.artikelcode}</td>
                <td>{a.omschrijving}</td>
                <td>
                  {getal(a.binnendoos.L, 1)} × {getal(a.binnendoos.B, 1)} × {getal(a.binnendoos.H, 1)}
                  {a.zonderBinnendoos && <span className="label">artikel</span>}
                  {a.zonderBuitendoos && <span className="label">geen buitendoos</span>}
                </td>
                <td>{getal(a.binnendoos.gewicht, 3)}</td>
                <td>{a.artikelenPerBinnendoos}</td>
                <td>{a.binnendoos.kantelbaar ? `ja (${[a.binnendoos.magVerticaal.L && 'L', a.binnendoos.magVerticaal.B && 'B'].filter(Boolean).join(', ')})` : 'nee'}</td>
                <td className="rij-acties">
                  <button className="knop klein" onClick={() => props.onBereken(a)}>
                    Bereken
                  </button>
                  <button
                    className="knop klein secundair"
                    onClick={() => {
                      setBewerk(naarBewerk(a));
                      setOudeCode(a.artikelcode);
                      setFout('');
                    }}
                  >
                    Bewerk
                  </button>
                  <button
                    className="knop klein gevaar"
                    onClick={() => {
                      if (confirm(`Artikel ${a.artikelcode} verwijderen?`)) void props.onVerwijder(a.artikelcode);
                    }}
                  >
                    Verwijder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="klein">{Object.keys(props.artikelen).length} artikelen opgeslagen in deze browser.</p>
    </div>
  );
}
