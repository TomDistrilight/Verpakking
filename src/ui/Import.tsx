import { useMemo, useState } from 'react';
import type { Artikel } from '../data/opslag';
import { leesCsv, raadKoppeling, verwerk, VELDEN, type GewichtEenheid, type Koppeling, type LengteEenheid, type Rij, type Veld } from '../import/excel';
import { Keuze, Vink } from './velden';

interface Blad {
  naam: string;
  data: Rij[];
}

async function leesBestand(bestand: File): Promise<Blad[]> {
  if (/\.csv$/i.test(bestand.name) || bestand.type === 'text/csv') return [{ naam: bestand.name, data: leesCsv(await bestand.text()) }];
  const { default: readXlsxFile } = await import('read-excel-file/browser');
  const bladen = await readXlsxFile(bestand);
  return bladen.map((b) => ({ naam: b.sheet, data: b.data as Rij[] }));
}

export function Import(props: { artikelen: Record<string, Artikel>; onOpslaan: (a: Artikel[]) => Promise<void> }) {
  const [bladen, setBladen] = useState<Blad[]>([]);
  const [bladIdx, setBladIdx] = useState(0);
  const [koppeling, setKoppeling] = useState<Koppeling | null>(null);
  const [bevestigd, setBevestigd] = useState<Set<string>>(new Set());
  const [melding, setMelding] = useState<{ soort: 'ok' | 'fout'; tekst: string } | null>(null);
  const [bestandsnaam, setBestandsnaam] = useState('');

  const data = bladen[bladIdx]?.data ?? [];
  const rijen = useMemo(() => (koppeling ? verwerk(data, koppeling, props.artikelen) : []), [data, koppeling, props.artikelen]);
  const ontbrekend = koppeling ? VELDEN.filter((v) => v.verplicht && koppeling.kolommen[v.veld] === undefined) : [];
  const kolomNamen = useMemo(() => {
    const breedte = data.reduce((m, r) => Math.max(m, r.length), 0);
    return Array.from({ length: breedte }, (_, i) => {
      const kop = koppeling?.kopRij ? data[0]?.[i] : undefined;
      const letter = String.fromCharCode(65 + (i % 26));
      return kop !== undefined && kop !== null && String(kop).trim() !== '' ? `${letter}: ${String(kop)}` : `Kolom ${letter}`;
    });
  }, [data, koppeling?.kopRij]);

  async function kies(bestand: File | undefined) {
    if (!bestand) return;
    setMelding(null);
    try {
      const b = await leesBestand(bestand);
      if (b.length === 0 || b.every((x) => x.data.length === 0)) throw new Error('Het bestand is leeg.');
      setBestandsnaam(bestand.name);
      setBladen(b);
      setBladIdx(0);
      setKoppeling(raadKoppeling(b[0].data[0] ?? []));
      setBevestigd(new Set());
    } catch (e) {
      setMelding({ soort: 'fout', tekst: `Bestand niet gelezen: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  function kiesBlad(i: number) {
    setBladIdx(i);
    setKoppeling(raadKoppeling(bladen[i].data[0] ?? []));
    setBevestigd(new Set());
  }

  const tellingen = {
    nieuw: rijen.filter((r) => r.status === 'nieuw').length,
    gewijzigd: rijen.filter((r) => r.status === 'gewijzigd').length,
    ongewijzigd: rijen.filter((r) => r.status === 'ongewijzigd').length,
    fout: rijen.filter((r) => r.status === 'fout').length,
  };

  async function opslaan() {
    const op = rijen.filter((r) => r.artikel && (r.status === 'nieuw' || (r.status === 'gewijzigd' && bevestigd.has(r.artikelcode)))).map((r) => r.artikel!);
    await props.onOpslaan(op);
    const overgeslagen = tellingen.gewijzigd - op.filter((a) => props.artikelen[a.artikelcode]).length;
    setMelding({
      soort: 'ok',
      tekst: `${op.length} artikelen opgeslagen (${tellingen.nieuw} nieuw, ${op.length - tellingen.nieuw} overschreven). ${overgeslagen} gewijzigde en ${tellingen.fout} foute rijen overgeslagen.`,
    });
    setBladen([]);
    setKoppeling(null);
  }

  const k = koppeling;
  return (
    <div className="pagina">
      <div className="pagina-kop">
        <h2>Excel-import</h2>
      </div>
      <p>
        Importeer artikelnummer, lengte, breedte, hoogte en gewicht (inclusief inhoud) van de binnendoos, en eventueel het aantal artikelen per binnendoos (leeg = 1). Bestanden:
        .xlsx of .csv.
      </p>
      <div className="acties">
        <label className="bestand">
          <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => void kies(e.target.files?.[0])} />
          <span>{bestandsnaam ? `Gekozen: ${bestandsnaam}` : 'Kies een bestand'}</span>
        </label>
        <a className="knop secundair" href="./voorbeeld-artikelen.xlsx" download>
          Voorbeeldbestand downloaden
        </a>
      </div>
      {melding && <div className={`melding ${melding.soort}`}>{melding.tekst}</div>}
      {k && (
        <>
          <div className="paneel">
            <h3>Kolomkoppeling</h3>
            {bladen.length > 1 && (
              <Keuze label="Werkblad" waarde={String(bladIdx)} opties={bladen.map((b, i) => ({ waarde: String(i), tekst: b.naam }))} onChange={(v) => kiesBlad(Number(v))} />
            )}
            <Vink label="Eerste rij bevat kolomnamen" aan={k.kopRij} onChange={(v) => setKoppeling({ ...k, kopRij: v })} />
            <div className="koppeling">
              {VELDEN.map((v) => (
                <Keuze
                  key={v.veld}
                  label={`${v.naam}${v.verplicht ? ' *' : ''}`}
                  waarde={k.kolommen[v.veld] === undefined ? '' : String(k.kolommen[v.veld])}
                  opties={[{ waarde: '', tekst: '(niet gebruiken)' }, ...kolomNamen.map((n, i) => ({ waarde: String(i), tekst: n }))]}
                  onChange={(x) => {
                    const kolommen = { ...k.kolommen };
                    if (x === '') delete kolommen[v.veld as Veld];
                    else kolommen[v.veld as Veld] = Number(x);
                    setKoppeling({ ...k, kolommen });
                  }}
                />
              ))}
              <Keuze<LengteEenheid>
                label="Eenheid maten"
                waarde={k.eenheidLengte}
                opties={[
                  { waarde: 'mm', tekst: 'mm' },
                  { waarde: 'cm', tekst: 'cm' },
                  { waarde: 'm', tekst: 'm' },
                ]}
                onChange={(x) => setKoppeling({ ...k, eenheidLengte: x })}
              />
              <Keuze<GewichtEenheid>
                label="Eenheid gewicht"
                waarde={k.eenheidGewicht}
                opties={[
                  { waarde: 'kg', tekst: 'kg' },
                  { waarde: 'g', tekst: 'gram' },
                ]}
                onChange={(x) => setKoppeling({ ...k, eenheidGewicht: x })}
              />
            </div>
            {ontbrekend.length > 0 && <div className="melding waarschuwing">Koppel nog: {ontbrekend.map((v) => v.naam).join(', ')}.</div>}
            <p className="klein">
              Geïmporteerde binnendozen zijn standaard niet kantelbaar; H is de hoogte als de doos rechtop staat. Kantelrechten van bestaande artikelen blijven behouden.
            </p>
          </div>
          {ontbrekend.length === 0 && (
            <>
              <div className="samenvatting">
                <span className="label groen">{tellingen.nieuw} nieuw</span>
                <span className="label oranje">{tellingen.gewijzigd} gewijzigd</span>
                <span className="label">{tellingen.ongewijzigd} ongewijzigd</span>
                <span className="label rood">{tellingen.fout} fout</span>
                {tellingen.gewijzigd > 0 && (
                  <button className="knop klein secundair" onClick={() => setBevestigd(new Set(rijen.filter((r) => r.status === 'gewijzigd').map((r) => r.artikelcode)))}>
                    Alle wijzigingen bevestigen
                  </button>
                )}
              </div>
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Rij</th>
                    <th>Artikelnummer</th>
                    <th>Status</th>
                    <th>Binnendoos (mm, kg)</th>
                    <th>Details</th>
                    <th>Overschrijven</th>
                  </tr>
                </thead>
                <tbody>
                  {rijen.map((r) => (
                    <tr key={`${r.rij}`} className={`status-${r.status}`}>
                      <td>{r.rij}</td>
                      <td>{r.artikelcode}</td>
                      <td>{r.status}</td>
                      <td>
                        {r.artikel
                          ? `${r.artikel.binnendoos.L} × ${r.artikel.binnendoos.B} × ${r.artikel.binnendoos.H}, ${r.artikel.binnendoos.gewicht} kg, ${r.artikel.artikelenPerBinnendoos} st.`
                          : ''}
                      </td>
                      <td>{r.status === 'fout' ? r.fouten.join(' ') : r.wijzigingen.join('; ')}</td>
                      <td>
                        {r.status === 'gewijzigd' && (
                          <input
                            type="checkbox"
                            aria-label={`Overschrijf ${r.artikelcode}`}
                            checked={bevestigd.has(r.artikelcode)}
                            onChange={(e) => {
                              const s = new Set(bevestigd);
                              if (e.target.checked) s.add(r.artikelcode);
                              else s.delete(r.artikelcode);
                              setBevestigd(s);
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="acties">
                <button className="knop" disabled={tellingen.nieuw + bevestigd.size === 0} onClick={opslaan}>
                  Opslaan ({tellingen.nieuw} nieuw, {bevestigd.size} overschrijven)
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
