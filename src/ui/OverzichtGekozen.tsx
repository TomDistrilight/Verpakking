// Overzicht van gekozen oplossingen: status van de levering, fysieke controle en PDF per regel.

import { useEffect, useMemo, useState } from 'react';
import { sorteerOverzicht, type GekozenOplossing, type Instellingen, type OverzichtWeergave } from '../data/opslag';
import { getal } from '../engine/format';
import { leesCsv, type Rij } from '../import/excel';
import { datumTekst, pasLeverdataToe, verwerkLeverdata, type LeverRij } from '../import/leverdata';
import { downloadRapport, type Taal } from '../pdf/rapport';
import { logoVoorPdf } from './logo';
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

/** Een volledige datum met een plausibel jaartal (zoals de import), of leeg. */
const bruikbareDatum = (v: string) => v === '' || /^2[01]\d\d-\d\d-\d\d$/.test(v);

/**
 * Datumveld dat pas opslaat bij een volledige datum. Tijdens het typen geeft de browser tussenwaarden
 * zoals 0002-11-15; die worden niet bewaard, zodat de regel niet verspringt in de sortering.
 */
function DatumVeld(props: { waarde: string | null; label: string; onChange: (v: string | null) => void }) {
  const [concept, setConcept] = useState(props.waarde ?? '');
  useEffect(() => setConcept(props.waarde ?? ''), [props.waarde]);
  return (
    <input
      type="date"
      value={concept}
      aria-label={props.label}
      onChange={(e) => {
        const v = e.target.value;
        setConcept(v);
        if (bruikbareDatum(v) && v !== (props.waarde ?? '')) props.onChange(v || null);
      }}
      onBlur={() => {
        if (!bruikbareDatum(concept)) setConcept(props.waarde ?? '');
      }}
    />
  );
}

const STATUS_TEKST: Record<LeverRij['status'], string> = {
  bijwerken: 'bijwerken',
  ongewijzigd: 'ongewijzigd',
  gecontroleerd: 'al gecontroleerd',
  onbekend: 'niet in overzicht',
  fout: 'fout',
};

export function OverzichtGekozen(props: {
  gekozen: GekozenOplossing[];
  instellingen: Instellingen;
  /** Wijzigt het overzicht; de functie krijgt de actuele lijst, zodat snelle wijzigingen elkaar niet overschrijven. */
  onWijzig: (wijziging: (lijst: GekozenOplossing[]) => GekozenOplossing[]) => Promise<void>;
  onWeergave: (w: OverzichtWeergave) => Promise<void>;
  onOpenen: (r: GekozenOplossing) => void;
}) {
  const weergave = props.instellingen.overzicht;
  const [melding, setMelding] = useState<{ soort: 'ok' | 'fout'; tekst: string } | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [bladen, setBladen] = useState<Blad[]>([]);
  const [bladIdx, setBladIdx] = useState(0);
  const [bestandsnaam, setBestandsnaam] = useState('');
  const [zoek, setZoek] = useState('');

  const zichtbaar = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    const gevonden = term ? props.gekozen.filter((r) => r.artikelcode.toLowerCase().includes(term) || (r.invoer.omschrijving ?? '').toLowerCase().includes(term)) : props.gekozen;
    return sorteerOverzicht(weergave.verbergGecontroleerd ? gevonden.filter((r) => !r.gecontroleerd) : gevonden, weergave.sortering);
  }, [props.gekozen, weergave, zoek]);
  const verborgenGecontroleerd = weergave.verbergGecontroleerd ? props.gekozen.filter((r) => r.gecontroleerd).length : 0;
  const import_ = useMemo(() => (bladen[bladIdx] ? verwerkLeverdata(bladen[bladIdx].data, props.gekozen) : null), [bladen, bladIdx, props.gekozen]);
  const teller = (s: LeverRij['status']) => import_?.rijen.filter((r) => r.status === s).length ?? 0;
  const aantalBijwerken = import_?.rijen.filter((r) => r.status === 'bijwerken').reduce((n, r) => n + r.regels.length, 0) ?? 0;

  async function wijzig(id: string, w: Partial<GekozenOplossing>) {
    await props.onWijzig((lijst) => lijst.map((r) => (r.id === id ? { ...r, ...w } : r)));
  }

  async function pdf(r: GekozenOplossing) {
    setMelding(null);
    setBezig(r.id);
    try {
      // Het logo van de eerdere export, zodat het PDF gelijk blijft; anders het huidige logo.
      const logo = r.logo !== undefined ? r.logo : await logoVoorPdf(props.instellingen);
      await downloadRapport({ invoer: r.invoer, oplossing: r.oplossing, berekeningsnummer: r.nummer, datum: new Date(r.datum), logo }, r.taal);
      if (r.logo === undefined) await wijzig(r.id, { logo });
    } catch (e) {
      setMelding({ soort: 'fout', tekst: `PDF maken mislukt: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBezig(null);
    }
  }

  async function kiesBestand(bestand: File | undefined) {
    if (!bestand) return;
    setMelding(null);
    try {
      const b = await leesBestand(bestand);
      if (b.length === 0 || b.every((x) => x.data.length === 0)) throw new Error('Het bestand is leeg.');
      setBestandsnaam(bestand.name);
      setBladen(b);
      setBladIdx(0);
    } catch (e) {
      setMelding({ soort: 'fout', tekst: `Bestand niet gelezen: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  async function toepassen() {
    if (!import_) return;
    const rijen = import_.rijen;
    await props.onWijzig((lijst) => pasLeverdataToe(lijst, rijen));
    const overgeslagen = [
      teller('onbekend') > 0 ? `${teller('onbekend')} niet in het overzicht` : '',
      teller('gecontroleerd') > 0 ? `${teller('gecontroleerd')} al gecontroleerd` : '',
      teller('fout') > 0 ? `${teller('fout')} met een fout` : '',
    ].filter(Boolean);
    setMelding({
      soort: 'ok',
      tekst: `Verwachte leverdatum bijgewerkt bij ${aantalBijwerken} ${aantalBijwerken === 1 ? 'regel' : 'regels'}.${overgeslagen.length > 0 ? ` Overgeslagen: ${overgeslagen.join(', ')}.` : ''}`,
    });
    setBladen([]);
    setBestandsnaam('');
  }

  return (
    <div className="pagina">
      <div className="pagina-kop">
        <h2>Overzicht gekozen oplossingen</h2>
      </div>
      <p>
        Een oplossing komt hier via <strong>Opslaan in overzicht</strong> op het rekenscherm of via <strong>Naar overzicht</strong> in de geschiedenis. Kies je opnieuw een
        oplossing voor een artikel dat nog niet fysiek gecontroleerd is, dan vervangt die de open regel; de verwachte leverdatum en de taal blijven staan.
      </p>
      {melding && (
        <div className={`melding ${melding.soort}`} role="status">
          {melding.tekst}
        </div>
      )}

      <div className="overzicht-balk">
        <label className="veld zoek">
          <span className="veld-label">Zoeken</span>
          <input
            type="search"
            value={zoek}
            placeholder="Artikelnummer of omschrijving"
            aria-label="Zoeken op artikelnummer of omschrijving"
            onChange={(e) => setZoek(e.target.value)}
          />
        </label>
        <Keuze<OverzichtWeergave['sortering']>
          label="Sorteren op"
          waarde={weergave.sortering}
          opties={[
            { waarde: 'levering', tekst: 'Verwachte levering (vroeg → laat)' },
            { waarde: 'artikel', tekst: 'Artikelnummer' },
            { waarde: 'gekozen', tekst: 'Laatst gekozen eerst' },
          ]}
          onChange={(v) => void props.onWeergave({ ...weergave, sortering: v })}
        />
        <Vink label="Gecontroleerde oplossingen verbergen" aan={weergave.verbergGecontroleerd} onChange={(v) => void props.onWeergave({ ...weergave, verbergGecontroleerd: v })} />
        <label className="bestand">
          <input
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const bestand = e.target.files?.[0];
              // Leegmaken, zodat hetzelfde (verbeterde) bestand opnieuw gekozen kan worden.
              e.target.value = '';
              void kiesBestand(bestand);
            }}
          />
          <span>{bestandsnaam ? `Gekozen: ${bestandsnaam}` : 'Leverdata importeren (Excel: kolom A artikelnummer, kolom B datum)'}</span>
        </label>
        <a className="knop secundair" href="./voorbeeld-leverdata.xlsx" download>
          Voorbeeldbestand leverdata
        </a>
      </div>

      {import_ && (
        <div className="paneel">
          <h3>Leverdata uit {bestandsnaam}</h3>
          {bladen.length > 1 && (
            <Keuze label="Werkblad" waarde={String(bladIdx)} opties={bladen.map((b, i) => ({ waarde: String(i), tekst: b.naam }))} onChange={(v) => setBladIdx(Number(v))} />
          )}
          <p className="klein">
            {import_.kopRij ? 'De eerste rij is als kopregel overgeslagen. ' : ''}Alleen regels die nog niet fysiek gecontroleerd zijn krijgen de nieuwe datum. Artikelnummers die
            niet in het overzicht staan worden overgeslagen; er worden geen artikelen aangemaakt.
          </p>
          <div className="samenvatting">
            <span className="label groen">{teller('bijwerken')} bijwerken</span>
            <span className="label">{teller('ongewijzigd')} ongewijzigd</span>
            <span className="label oranje">{teller('gecontroleerd')} al gecontroleerd</span>
            <span className="label">{teller('onbekend')} niet in overzicht</span>
            <span className="label rood">{teller('fout')} fout</span>
          </div>
          {import_.rijen.length > 0 && (
            <table className="tabel">
              <thead>
                <tr>
                  <th>Rij</th>
                  <th>Artikelnummer</th>
                  <th>Verwachte levering</th>
                  <th>Status</th>
                  <th>Toelichting</th>
                </tr>
              </thead>
              <tbody>
                {import_.rijen.map((r) => (
                  <tr key={r.rij} className={r.status === 'fout' ? 'status-fout' : r.status === 'bijwerken' ? 'status-nieuw' : ''}>
                    <td>{r.rij}</td>
                    <td>{r.artikelcode}</td>
                    <td>{datumTekst(r.datum)}</td>
                    <td>{STATUS_TEKST[r.status]}</td>
                    <td>{r.melding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="acties">
            <button className="knop" disabled={aantalBijwerken === 0} onClick={() => void toepassen()}>
              Toepassen ({aantalBijwerken} {aantalBijwerken === 1 ? 'regel' : 'regels'} bijwerken)
            </button>
            <button
              className="knop secundair"
              onClick={() => {
                setBladen([]);
                setBestandsnaam('');
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {props.gekozen.length === 0 ? (
        <p className="leeg">Nog geen gekozen oplossingen. Reken een artikel door en kies Opslaan in overzicht.</p>
      ) : (
        <>
          {(verborgenGecontroleerd > 0 || zoek.trim() !== '') && (
            <p className="klein">
              {zichtbaar.length} van {props.gekozen.length} {props.gekozen.length === 1 ? 'regel' : 'regels'} zichtbaar
              {verborgenGecontroleerd > 0 ? `; ${verborgenGecontroleerd} gecontroleerde ${verborgenGecontroleerd === 1 ? 'oplossing' : 'oplossingen'} verborgen` : ''}
              {zoek.trim() !== '' ? `; zoekterm "${zoek.trim()}"` : ''}.
            </p>
          )}
          {zichtbaar.length === 0 && <p className="leeg">Geen regels gevonden.</p>}
          <table className="tabel overzicht">
            <thead>
              <tr>
                <th>Artikel</th>
                <th>Buitendoos (mm)</th>
                <th>Per drager</th>
                <th>Berekening</th>
                <th>Verwachte levering</th>
                <th>Fysiek gecontroleerd</th>
                <th>PDF</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {zichtbaar.map((r) => {
                const o = r.oplossing;
                return (
                  <tr key={r.id} className={r.gecontroleerd ? 'gecontroleerd' : ''}>
                    <td>
                      <strong>{r.artikelcode}</strong>
                      {r.invoer.omschrijving && <div className="klein">{r.invoer.omschrijving}</div>}
                    </td>
                    <td>
                      {getal(o.doos.L, 1)} × {getal(o.doos.B, 1)} × {getal(o.doos.H, 1)}
                      <div className="klein">
                        {o.doos.geenBuitendoos ? 'geen buitendoos' : o.doos.binnendozenPerDoos === null ? 'inhoud onbekend' : `${o.doos.binnendozenPerDoos} binnendozen per doos`}
                      </div>
                    </td>
                    <td>
                      {o.binnendozenPerDrager !== null ? `${o.binnendozenPerDrager} binnendozen` : `${o.buitendozenPerDrager} buitendozen`}
                      <div className="klein">
                        {o.buitendozenPerDrager} dozen op {r.invoer.drager.naam.toLowerCase()}, {o.stapelwijze}
                      </div>
                    </td>
                    <td>
                      {r.nummer}
                      <div className="klein">gekozen {new Date(r.gekozenOp).toLocaleDateString('nl-NL')}</div>
                    </td>
                    <td>
                      <DatumVeld waarde={r.verwachteLevering} label={`Verwachte levering ${r.artikelcode}`} onChange={(v) => void wijzig(r.id, { verwachteLevering: v })} />
                    </td>
                    <td className="midden">
                      <input
                        type="checkbox"
                        checked={r.gecontroleerd}
                        aria-label={`Fysiek gecontroleerd ${r.artikelcode}`}
                        title="Dozen en artikelen zijn geleverd zoals afgesproken met de leverancier en inkoop"
                        onChange={(e) => void wijzig(r.id, { gecontroleerd: e.target.checked })}
                      />
                    </td>
                    <td className="rij-acties">
                      <select value={r.taal} aria-label={`Taal PDF ${r.artikelcode}`} onChange={(e) => void wijzig(r.id, { taal: e.target.value as Taal })}>
                        <option value="nl">NL</option>
                        <option value="en">EN</option>
                      </select>
                      <button className="knop klein" disabled={bezig === r.id} onClick={() => void pdf(r)}>
                        {bezig === r.id ? 'PDF…' : 'PDF'}
                      </button>
                    </td>
                    <td className="rij-acties">
                      <button className="knop klein secundair" onClick={() => props.onOpenen(r)}>
                        Open invoer
                      </button>
                      <button
                        className="knop klein gevaar"
                        onClick={() => {
                          if (confirm(`Regel van artikel ${r.artikelcode} uit het overzicht verwijderen?`)) void props.onWijzig((lijst) => lijst.filter((x) => x.id !== r.id));
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
        </>
      )}
    </div>
  );
}
