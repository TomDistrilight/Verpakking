import { useEffect, useMemo, useState } from 'react';
import type { Drager, Oplossing, Resultaat } from '../engine/types';
import { valideer } from '../engine/bereken';
import { FEFCO_0201 } from '../engine/karton';
import { TUSSENLAAG_STANDAARD } from '../engine/standaard';
import type { Artikel, Berekening, Instellingen } from '../data/opslag';
import { volgendNummer } from '../data/opslag';
import { downloadRapport } from '../pdf/rapport';
import { rekenAsync } from '../rekenen';
import { dragerVelden, metArtikel, naarInvoer, type Formulier } from './formulier';
import { logoVoorPdf } from './logo';
import { Detail, Overzicht } from './Resultaten';
import { Getal, Keuze, Rij, Sectie, Tekst, Vink } from './velden';

export interface BerekenenProps {
  formulier: Formulier;
  setFormulier: (f: Formulier) => void;
  artikelen: Record<string, Artikel>;
  dragers: Drager[];
  instellingen: Instellingen;
  onArtikelOpslaan: (a: Artikel) => Promise<void>;
  onBerekeningOpslaan: (b: Berekening) => Promise<void>;
}

export function Berekenen(p: BerekenenProps) {
  const f = p.formulier;
  const zet = (wijziging: Partial<Formulier>) => p.setFormulier({ ...f, ...wijziging });
  const [resultaat, setResultaat] = useState<Resultaat | null>(null);
  const [gekozen, setGekozen] = useState<Oplossing | null>(null);
  const [bezig, setBezig] = useState(false);
  const [pdfBezig, setPdfBezig] = useState(false);
  const [melding, setMelding] = useState<{ soort: 'ok' | 'fout'; tekst: string } | null>(null);

  const invoer = useMemo(() => naarInvoer(f, p.dragers, p.instellingen), [f, p.dragers, p.instellingen]);
  const fouten = useMemo(() => valideer(invoer), [invoer]);
  const drager = p.dragers.find((d) => d.id === f.dragerId) ?? p.dragers[0];
  const isKar = drager?.type === 'kar';

  // Een nieuwe invoer maakt een oud resultaat ongeldig.
  useEffect(() => {
    setResultaat(null);
    setGekozen(null);
  }, [invoer]);

  const codes = useMemo(() => Object.keys(p.artikelen).sort(), [p.artikelen]);

  function kiesArtikel(code: string) {
    const a = p.artikelen[code];
    if (a) p.setFormulier(metArtikel(f, a));
    else zet({ artikelcode: code });
  }

  function kiesDrager(id: string) {
    const d = p.dragers.find((x) => x.id === id);
    if (d) zet({ dragerId: id, drager: dragerVelden(d) });
  }

  async function reken() {
    setMelding(null);
    setBezig(true);
    try {
      const r = await rekenAsync(invoer);
      setResultaat(r);
      setGekozen(r.top[0]?.oplossing ?? null);
    } catch (e) {
      setMelding({ soort: 'fout', tekst: e instanceof Error ? e.message : String(e) });
    } finally {
      setBezig(false);
    }
  }

  async function pdf(taal: 'nl' | 'en') {
    if (!resultaat || !gekozen) return;
    setPdfBezig(true);
    try {
      const datum = new Date();
      const nummer = await volgendNummer(datum);
      const b: Berekening = { nummer, datum: datum.toISOString(), artikelcode: resultaat.invoer.artikelcode, invoer: resultaat.invoer, oplossing: gekozen };
      await downloadRapport({ invoer: resultaat.invoer, oplossing: gekozen, berekeningsnummer: nummer, datum, logo: await logoVoorPdf(p.instellingen) }, taal);
      await p.onBerekeningOpslaan(b);
      setMelding({ soort: 'ok', tekst: `PDF gemaakt en berekening ${nummer} bewaard in de geschiedenis.` });
    } catch (e) {
      setMelding({ soort: 'fout', tekst: `PDF maken mislukt: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setPdfBezig(false);
    }
  }

  async function artikelOpslaan() {
    const i = invoer;
    if (!i.artikelcode || !i.binnendoos) return;
    await p.onArtikelOpslaan({
      artikelcode: i.artikelcode,
      omschrijving: f.omschrijving.trim(),
      artikelenPerBinnendoos: i.artikelenPerBinnendoos,
      zonderBinnendoos: f.zonderBinnendoos,
      binnendoos: i.binnendoos,
      bijgewerkt: new Date().toISOString(),
    });
    setMelding({ soort: 'ok', tekst: `Artikel ${i.artikelcode} opgeslagen.` });
  }

  const bdLabel = f.zonderBinnendoos ? 'artikel' : 'binnendoos';
  const binnendoosFouten = !invoer.binnendoos || [invoer.binnendoos.L, invoer.binnendoos.B, invoer.binnendoos.H, invoer.binnendoos.gewicht].some((v) => !(v > 0));

  return (
    <div className="berekenen">
      <div className="formulier">
        <Sectie titel="1. Instap">
          <div className="tabs-klein" role="radiogroup" aria-label="Instap">
            <button className={f.instap === 'binnendoos' ? 'actief' : ''} onClick={() => zet({ instap: 'binnendoos' })} role="radio" aria-checked={f.instap === 'binnendoos'}>
              Artikel of binnendoos
            </button>
            <button
              className={f.instap === 'bestaandeBuitendoos' ? 'actief' : ''}
              onClick={() => zet({ instap: 'bestaandeBuitendoos' })}
              role="radio"
              aria-checked={f.instap === 'bestaandeBuitendoos'}
            >
              Bestaande buitendoos
            </button>
          </div>
        </Sectie>

        <Sectie
          titel={f.zonderBinnendoos ? '2. Artikel' : '2. Artikel en binnendoos'}
          rechts={
            f.instap === 'binnendoos' ? (
              <button className="knop klein secundair" disabled={!invoer.artikelcode || binnendoosFouten} onClick={artikelOpslaan}>
                Opslaan als artikel
              </button>
            ) : undefined
          }
        >
          <Rij>
            <Tekst label="Artikelnummer" waarde={f.artikelcode} onChange={kiesArtikel} lijst="artikelcodes" placeholder="Typ of kies" />
            <Tekst label="Omschrijving" waarde={f.omschrijving} onChange={(v) => zet({ omschrijving: v })} />
          </Rij>
          <datalist id="artikelcodes">
            {codes.map((c) => (
              <option key={c} value={c}>
                {p.artikelen[c].omschrijving}
              </option>
            ))}
          </datalist>
          {f.instap === 'binnendoos' && (
            <Vink
              label="Artikel zonder binnendoos (telt als binnendoos met 1 stuk)"
              aan={f.zonderBinnendoos}
              onChange={(v) => zet({ zonderBinnendoos: v, artikelenPerBinnendoos: v ? '1' : f.artikelenPerBinnendoos })}
            />
          )}
          <Rij>
            <Getal label={`Lengte ${bdLabel}`} eenheid="mm" waarde={f.bd.L} onChange={(v) => zet({ bd: { ...f.bd, L: v } })} />
            <Getal label={`Breedte ${bdLabel}`} eenheid="mm" waarde={f.bd.B} onChange={(v) => zet({ bd: { ...f.bd, B: v } })} />
            <Getal label={`Hoogte ${bdLabel} (rechtop)`} eenheid="mm" waarde={f.bd.H} onChange={(v) => zet({ bd: { ...f.bd, H: v } })} />
            <Getal
              label={f.zonderBinnendoos ? 'Gewicht artikel' : 'Gewicht gevulde binnendoos'}
              eenheid="kg"
              waarde={f.bd.gewicht}
              onChange={(v) => zet({ bd: { ...f.bd, gewicht: v } })}
            />
          </Rij>
          <Rij>
            <Getal
              label="Artikelen per binnendoos"
              waarde={f.artikelenPerBinnendoos}
              uit={f.zonderBinnendoos}
              onChange={(v) => zet({ artikelenPerBinnendoos: v })}
            />
            <div className="vinken">
              <Vink label="Kantelbaar" aan={f.bd.kantelbaar} onChange={(v) => zet({ bd: { ...f.bd, kantelbaar: v } })} />
              <Vink label="L mag verticaal" aan={f.bd.magL} uit={!f.bd.kantelbaar} onChange={(v) => zet({ bd: { ...f.bd, magL: v } })} />
              <Vink label="B mag verticaal" aan={f.bd.magB} uit={!f.bd.kantelbaar} onChange={(v) => zet({ bd: { ...f.bd, magB: v } })} />
            </div>
          </Rij>
          {f.instap === 'bestaandeBuitendoos' && <p className="hint">Bij een bestaande buitendoos is de binnendoos optioneel; nodig om de inhoud te berekenen.</p>}
        </Sectie>

        {f.instap === 'bestaandeBuitendoos' ? (
          <Sectie titel="3. Bestaande buitendoos">
            <Rij>
              <Getal label="Lengte (buitenmaat)" eenheid="mm" waarde={f.bestaand.L} onChange={(v) => zet({ bestaand: { ...f.bestaand, L: v } })} />
              <Getal label="Breedte (buitenmaat)" eenheid="mm" waarde={f.bestaand.B} onChange={(v) => zet({ bestaand: { ...f.bestaand, B: v } })} />
              <Getal label="Hoogte (buitenmaat)" eenheid="mm" waarde={f.bestaand.H} onChange={(v) => zet({ bestaand: { ...f.bestaand, H: v } })} />
            </Rij>
            <Rij>
              <Getal label="Gevuld gewicht" eenheid="kg" waarde={f.bestaand.gevuld} onChange={(v) => zet({ bestaand: { ...f.bestaand, gevuld: v } })} />
              <Getal
                label="Binnendozen per buitendoos"
                hint="Optioneel"
                waarde={f.bestaand.aantal}
                onChange={(v) => zet({ bestaand: { ...f.bestaand, aantal: v } })}
              />
              <Getal label="Max. gevulde buitendoos" eenheid="kg" waarde={f.maxGevuld} onChange={(v) => zet({ maxGevuld: v })} />
            </Rij>
            <Vink
              label="Binnenmaat en eigen gewicht opgeven (de app berekent de inhoud)"
              aan={f.bestaand.metBinnenmaat}
              onChange={(v) => zet({ bestaand: { ...f.bestaand, metBinnenmaat: v } })}
            />
            {f.bestaand.metBinnenmaat && (
              <Rij>
                <Getal label="Binnenlengte" eenheid="mm" waarde={f.bestaand.binnenL} onChange={(v) => zet({ bestaand: { ...f.bestaand, binnenL: v } })} />
                <Getal label="Binnenbreedte" eenheid="mm" waarde={f.bestaand.binnenB} onChange={(v) => zet({ bestaand: { ...f.bestaand, binnenB: v } })} />
                <Getal label="Binnenhoogte" eenheid="mm" waarde={f.bestaand.binnenH} onChange={(v) => zet({ bestaand: { ...f.bestaand, binnenH: v } })} />
                <Getal label="Eigen gewicht" eenheid="kg" waarde={f.bestaand.eigen} onChange={(v) => zet({ bestaand: { ...f.bestaand, eigen: v } })} />
              </Rij>
            )}
          </Sectie>
        ) : (
          <Sectie titel="3. Buitendoos">
            <Rij>
              <Keuze
                label="Doostype"
                waarde={f.doostype}
                opties={[
                  { waarde: '0201', tekst: 'FEFCO 0201, dubbele golf 7 mm' },
                  { waarde: 'custom', tekst: 'Custom' },
                ]}
                onChange={(v) => zet({ doostype: v })}
              />
              <Getal label="Max. gevulde buitendoos" eenheid="kg" waarde={f.maxGevuld} onChange={(v) => zet({ maxGevuld: v })} />
            </Rij>
            {f.doostype === '0201' ? (
              <p className="hint">
                Toeslag binnen → buiten: lengte +{FEFCO_0201.toeslagL}, breedte +{FEFCO_0201.toeslagB}, hoogte +{FEFCO_0201.toeslagH} mm; karton{' '}
                {String(FEFCO_0201.kartonmassa).replace('.', ',')} kg/m².
              </p>
            ) : (
              <Rij>
                <Getal label="Toeslag lengte" eenheid="mm" waarde={f.custom.tL} onChange={(v) => zet({ custom: { ...f.custom, tL: v } })} />
                <Getal label="Toeslag breedte" eenheid="mm" waarde={f.custom.tB} onChange={(v) => zet({ custom: { ...f.custom, tB: v } })} />
                <Getal label="Toeslag hoogte" eenheid="mm" waarde={f.custom.tH} onChange={(v) => zet({ custom: { ...f.custom, tH: v } })} />
                <Getal label="Kartonmassa" eenheid="kg/m²" waarde={f.custom.massa} onChange={(v) => zet({ custom: { ...f.custom, massa: v } })} />
              </Rij>
            )}
          </Sectie>
        )}

        <Sectie titel="4. Ladingdrager">
          <Rij>
            <Keuze
              label="Drager"
              waarde={f.dragerId}
              opties={p.dragers.map((d) => ({ waarde: d.id, tekst: `${d.naam} (${d.lengte} × ${d.breedte} × ${d.hoogte} mm)` }))}
              onChange={kiesDrager}
            />
            <Getal label="Max. totale hoogte incl. drager" eenheid="mm" waarde={f.drager.maxHoogte} onChange={(v) => zet({ drager: { ...f.drager, maxHoogte: v } })} />
            <Getal label="Max. totaalgewicht incl. drager" eenheid="kg" waarde={f.drager.maxGewicht} onChange={(v) => zet({ drager: { ...f.drager, maxGewicht: v } })} />
          </Rij>
          {isKar ? (
            <p className="hint">Kar: geen overhang; het ladingvlak is de binnenmaat.</p>
          ) : (
            <>
              <div className="vinken">
                <Vink label="Overhang toegestaan" aan={f.drager.overhangToegestaan} onChange={(v) => zet({ drager: { ...f.drager, overhangToegestaan: v } })} />
                <Vink label="Asymmetrische overhang toegestaan" aan={f.drager.asym} onChange={(v) => zet({ drager: { ...f.drager, asym: v } })} />
              </div>
              {f.drager.overhangToegestaan && (
                <Rij>
                  <Getal label="Max. voor" eenheid="mm" waarde={f.drager.voor} onChange={(v) => zet({ drager: { ...f.drager, voor: v } })} />
                  <Getal label="Max. achter" eenheid="mm" waarde={f.drager.achter} onChange={(v) => zet({ drager: { ...f.drager, achter: v } })} />
                  <Getal label="Max. links" eenheid="mm" waarde={f.drager.links} onChange={(v) => zet({ drager: { ...f.drager, links: v } })} />
                  <Getal label="Max. rechts" eenheid="mm" waarde={f.drager.rechts} onChange={(v) => zet({ drager: { ...f.drager, rechts: v } })} />
                </Rij>
              )}
            </>
          )}
        </Sectie>

        <Sectie titel="5. Tussenlagen en materiaal">
          <Rij>
            <Keuze
              label="Tussenlaag"
              waarde={f.tussenlaag.soort}
              opties={[
                { waarde: 'geen', tekst: 'Geen' },
                { waarde: 'karton', tekst: 'Karton' },
                { waarde: 'hout', tekst: 'Hout' },
              ]}
              onChange={(v) =>
                zet({
                  tussenlaag:
                    v === 'geen'
                      ? { ...f.tussenlaag, soort: v }
                      : { ...f.tussenlaag, soort: v, dikte: String(TUSSENLAAG_STANDAARD[v].dikte), gewicht: String(TUSSENLAAG_STANDAARD[v].gewicht) },
                })
              }
            />
            {f.tussenlaag.soort !== 'geen' && (
              <>
                <Getal label="Na elke N lagen" waarde={f.tussenlaag.naElkeN} onChange={(v) => zet({ tussenlaag: { ...f.tussenlaag, naElkeN: v } })} />
                <Getal label="Dikte" eenheid="mm" waarde={f.tussenlaag.dikte} onChange={(v) => zet({ tussenlaag: { ...f.tussenlaag, dikte: v } })} />
                <Getal label="Gewicht per stuk" eenheid="kg" waarde={f.tussenlaag.gewicht} onChange={(v) => zet({ tussenlaag: { ...f.tussenlaag, gewicht: v } })} />
                <Keuze
                  label="Maat"
                  waarde={f.tussenlaag.maat}
                  opties={[
                    { waarde: 'drager', tekst: 'Dragermaat' },
                    { waarde: 'lading', tekst: 'Ladingmaat' },
                  ]}
                  onChange={(v) => zet({ tussenlaag: { ...f.tussenlaag, maat: v } })}
                />
              </>
            )}
          </Rij>
          <div className="materiaal">
            <div>
              <Vink label="Bodemvel" aan={f.materiaal.bodemvel} onChange={(v) => zet({ materiaal: { ...f.materiaal, bodemvel: v } })} />
              {f.materiaal.bodemvel && (
                <Rij>
                  <Getal label="Dikte" eenheid="mm" waarde={f.materiaal.bodemDikte} onChange={(v) => zet({ materiaal: { ...f.materiaal, bodemDikte: v } })} />
                  <Getal label="Gewicht" eenheid="kg" waarde={f.materiaal.bodemGewicht} onChange={(v) => zet({ materiaal: { ...f.materiaal, bodemGewicht: v } })} />
                </Rij>
              )}
            </div>
            <div>
              <Vink label="Topvel" aan={f.materiaal.topvel} onChange={(v) => zet({ materiaal: { ...f.materiaal, topvel: v } })} />
              {f.materiaal.topvel && (
                <Rij>
                  <Getal label="Dikte" eenheid="mm" waarde={f.materiaal.topDikte} onChange={(v) => zet({ materiaal: { ...f.materiaal, topDikte: v } })} />
                  <Getal label="Gewicht" eenheid="kg" waarde={f.materiaal.topGewicht} onChange={(v) => zet({ materiaal: { ...f.materiaal, topGewicht: v } })} />
                </Rij>
              )}
            </div>
            <div>
              <Vink label="Hoekprofielen" aan={f.materiaal.hoek} onChange={(v) => zet({ materiaal: { ...f.materiaal, hoek: v } })} />
              {f.materiaal.hoek && (
                <Getal label="Gewicht" eenheid="kg" waarde={f.materiaal.hoekGewicht} onChange={(v) => zet({ materiaal: { ...f.materiaal, hoekGewicht: v } })} />
              )}
            </div>
            <div>
              <Vink label="Stretchfolie" aan={f.materiaal.folie} onChange={(v) => zet({ materiaal: { ...f.materiaal, folie: v } })} />
              {f.materiaal.folie && (
                <Getal label="Gewicht" eenheid="kg" waarde={f.materiaal.folieGewicht} onChange={(v) => zet({ materiaal: { ...f.materiaal, folieGewicht: v } })} />
              )}
            </div>
          </div>
        </Sectie>

        {fouten.length > 0 && (
          <div className="melding waarschuwing" aria-live="polite">
            <strong>Nog in te vullen of te corrigeren:</strong>
            <ul>
              {fouten.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="acties">
          <button className="knop groot" disabled={fouten.length > 0 || bezig} onClick={reken}>
            {bezig ? 'Bezig met rekenen…' : 'Bereken'}
          </button>
        </div>
      </div>

      <div className="uitkomst">
        {melding && (
          <div className={`melding ${melding.soort === 'ok' ? 'ok' : 'fout'}`} role="status">
            {melding.tekst}
          </div>
        )}
        {bezig && <div className="laden">Kandidaten genereren en testen…</div>}
        {!bezig && !resultaat && (
          <div className="leeg">
            <h2>Resultaten</h2>
            <p>Vul de gegevens in en kies <strong>Bereken</strong>. De app toont tot drie oplossingen en legt uit waarom de voorkeursoptie bovenaan staat.</p>
          </div>
        )}
        {resultaat && <Overzicht resultaat={resultaat} gekozen={gekozen} onKies={setGekozen} />}
        {resultaat && gekozen && <Detail o={gekozen} invoer={resultaat.invoer} onPdf={pdf} bezig={pdfBezig} standaardTaal={p.instellingen.taal} />}
      </div>
    </div>
  );
}
