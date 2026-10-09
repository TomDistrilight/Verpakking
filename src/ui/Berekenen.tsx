import { useEffect, useMemo, useRef, useState } from 'react';
import type { Drager, Oplossing, Resultaat, Vormregel } from '../engine/types';
import { valideer } from '../engine/bereken';
import { FEFCO_0201 } from '../engine/karton';
import { TUSSENLAAG_STANDAARD } from '../engine/standaard';
import type { Artikel, Berekening, GekozenOplossing, Instellingen } from '../data/opslag';
import { regelUitBerekening, volgendNummer } from '../data/opslag';
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
  /** Zet de gekozen oplossing in het overzicht; true als een open regel van het artikel is vervangen. */
  onNaarOverzicht: (regel: GekozenOplossing) => Promise<boolean>;
}

/** Waarde in de dragerkeuze voor de drager uit een geopende berekening. */
const SNAPSHOT = '__uit-berekening__';

const VORMREGEL_TEKST: Record<Vormregel, string> = {
  breedte: 'Vormregel: een buitendoos is niet hoger dan zijn breedte, behalve bij één laag binnendozen. Aan te passen onder Instellingen.',
  lengte: 'Vormregel: een buitendoos is niet hoger dan zijn lengte, behalve bij één laag binnendozen. Aan te passen onder Instellingen.',
  uit: 'Vormregel staat uit: de buitendoos mag hoger zijn dan breed. Aan te passen onder Instellingen.',
};

export function Berekenen(p: BerekenenProps) {
  const f = p.formulier;
  const zet = (wijziging: Partial<Formulier>) => p.setFormulier({ ...f, ...wijziging });
  const [resultaat, setResultaat] = useState<Resultaat | null>(null);
  const [gekozen, setGekozen] = useState<Oplossing | null>(null);
  const [huidig, setHuidig] = useState<Berekening | null>(null);
  const [bezig, setBezig] = useState(false);
  const [pdfBezig, setPdfBezig] = useState(false);
  /** Id van de oplossing die vanuit dit resultaat in het overzicht is gezet. */
  const [inOverzicht, setInOverzicht] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ soort: 'ok' | 'fout'; tekst: string } | null>(null);

  const invoer = useMemo(() => naarInvoer(f, p.dragers, p.instellingen), [f, p.dragers, p.instellingen]);
  const fouten = useMemo(() => valideer(invoer), [invoer]);
  const drager = f.dragerSnapshot ?? p.dragers.find((d) => d.id === f.dragerId) ?? p.dragers[0];
  const isKar = drager?.type === 'kar';
  const actueleInvoer = useRef(invoer);
  actueleInvoer.current = invoer;

  // Een nieuwe invoer maakt een oud resultaat ongeldig.
  useEffect(() => {
    setResultaat(null);
    setGekozen(null);
    setHuidig(null);
    setInOverzicht(null);
  }, [invoer]);

  const codes = useMemo(() => Object.keys(p.artikelen).sort(), [p.artikelen]);
  const gevonden = p.artikelen[f.artikelcode.trim()];
  const binnendoosLeeg = [f.bd.L, f.bd.B, f.bd.H, f.bd.gewicht].every((v) => v.trim() === '');

  // Artikel dat automatisch is geladen tijdens het typen; zolang de gebruiker die gegevens niet
  // aanpast, mogen ze bij verder typen worden vervangen of weer leeggemaakt (bijv. 100 → 1002).
  const [autoGeladen, setAutoGeladen] = useState<string | null>(null);
  const autoOngewijzigd = (() => {
    const a = autoGeladen ? p.artikelen[autoGeladen] : undefined;
    if (!a) return false;
    const m = metArtikel(f, a);
    return JSON.stringify([m.bd, m.omschrijving, m.artikelenPerBinnendoos, m.zonderBinnendoos]) === JSON.stringify([f.bd, f.omschrijving, f.artikelenPerBinnendoos, f.zonderBinnendoos]);
  })();

  /** Typen laadt een artikel alleen als dat geen gegevens van de gebruiker overschrijft. */
  function typArtikel(code: string) {
    const a = p.artikelen[code.trim()];
    if (a && (binnendoosLeeg || autoOngewijzigd)) {
      p.setFormulier(metArtikel({ ...f, artikelcode: code }, a));
      setAutoGeladen(a.artikelcode);
    } else if (!a && autoOngewijzigd) {
      p.setFormulier({
        ...f,
        artikelcode: code,
        omschrijving: '',
        artikelenPerBinnendoos: '1',
        zonderBinnendoos: false,
        bd: { L: '', B: '', H: '', gewicht: '', kantelbaar: false, magL: false, magB: false },
      });
      setAutoGeladen(null);
    } else zet({ artikelcode: code });
  }

  function kiesDrager(id: string) {
    if (id === SNAPSHOT) return;
    const d = p.dragers.find((x) => x.id === id);
    if (d) zet({ dragerId: id, dragerSnapshot: null, drager: dragerVelden(d) });
  }

  async function reken() {
    setMelding(null);
    setBezig(true);
    const verzonden = invoer;
    try {
      const r = await rekenAsync(verzonden);
      // Alleen tonen als de invoer intussen niet is gewijzigd.
      if (actueleInvoer.current !== verzonden) return;
      setResultaat(r);
      setInOverzicht(null);
      const winnaar = r.top[0]?.oplossing ?? null;
      setGekozen(winnaar);
      if (winnaar) {
        const datum = new Date();
        const b: Berekening = {
          nummer: await volgendNummer(datum),
          datum: datum.toISOString(),
          artikelcode: r.invoer.artikelcode,
          invoer: r.invoer,
          oplossing: winnaar,
          top: r.top,
          log: r.log,
        };
        await p.onBerekeningOpslaan(b);
        if (actueleInvoer.current === verzonden) setHuidig(b);
      }
    } catch (e) {
      setMelding({ soort: 'fout', tekst: e instanceof Error ? e.message : String(e) });
    } finally {
      setBezig(false);
    }
  }

  async function kies(o: Oplossing) {
    setGekozen(o);
    if (huidig) {
      const b = { ...huidig, oplossing: o };
      setHuidig(b);
      await p.onBerekeningOpslaan(b);
    }
  }

  async function pdf(taal: 'nl' | 'en') {
    if (!resultaat || !gekozen || !huidig) return;
    setPdfBezig(true);
    try {
      const logo = await logoVoorPdf(p.instellingen);
      await downloadRapport(
        { invoer: resultaat.invoer, oplossing: gekozen, berekeningsnummer: huidig.nummer, datum: new Date(huidig.datum), logo },
        taal,
      );
      const b = { ...huidig, oplossing: gekozen, logo };
      setHuidig(b);
      await p.onBerekeningOpslaan(b);
      setMelding({ soort: 'ok', tekst: `PDF gemaakt voor berekening ${huidig.nummer}.` });
    } catch (e) {
      setMelding({ soort: 'fout', tekst: `PDF maken mislukt: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setPdfBezig(false);
    }
  }

  async function naarOverzicht() {
    if (!resultaat || !gekozen || !huidig) return;
    const b = { ...huidig, oplossing: gekozen };
    const vervangen = await p.onNaarOverzicht(regelUitBerekening(b, gekozen, p.instellingen.taal));
    setInOverzicht(gekozen.id);
    setMelding({
      soort: 'ok',
      tekst: vervangen
        ? `Oplossing voor artikel ${b.artikelcode} staat in het overzicht; de open regel van dit artikel is vervangen (verwachte leverdatum behouden).`
        : `Oplossing voor artikel ${b.artikelcode} staat in het overzicht.`,
    });
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
  const binnendoosFouten =
    !invoer.binnendoos ||
    [invoer.binnendoos.L, invoer.binnendoos.B, invoer.binnendoos.H, invoer.binnendoos.gewicht].some((v) => !(v > 0)) ||
    !Number.isInteger(invoer.artikelenPerBinnendoos) ||
    invoer.artikelenPerBinnendoos < 1 ||
    (invoer.binnendoos.kantelbaar && !invoer.binnendoos.magVerticaal.L && !invoer.binnendoos.magVerticaal.B);

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
            <Tekst label="Artikelnummer" waarde={f.artikelcode} onChange={typArtikel} lijst="artikelcodes" placeholder="Typ of kies" />
            <Tekst label="Omschrijving" waarde={f.omschrijving} onChange={(v) => zet({ omschrijving: v })} />
          </Rij>
          {gevonden && !binnendoosLeeg && !autoOngewijzigd && (
            <button className="knop klein secundair" onClick={() => p.setFormulier(metArtikel(f, gevonden))}>
              Gegevens van artikel {gevonden.artikelcode} laden
            </button>
          )}
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
              <Getal
                label={f.zonderBinnendoos ? 'Min. artikelen per buitendoos' : 'Min. binnendozen per buitendoos'}
                waarde={f.minPerDoos}
                onChange={(v) => zet({ minPerDoos: v })}
              />
            </Rij>
            <p className="hint">{VORMREGEL_TEKST[p.instellingen.vormregel]}</p>
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
              waarde={f.dragerSnapshot ? SNAPSHOT : f.dragerId}
              opties={[
                ...(f.dragerSnapshot ? [{ waarde: SNAPSHOT, tekst: `${f.dragerSnapshot.naam} (uit de geopende berekening)` }] : []),
                ...p.dragers.map((d) => ({ waarde: d.id, tekst: `${d.naam} (${d.lengte} × ${d.breedte} × ${d.hoogte} mm)` })),
              ]}
              onChange={kiesDrager}
            />
            <Getal label="Max. totale hoogte incl. drager" eenheid="mm" waarde={f.drager.maxHoogte} onChange={(v) => zet({ drager: { ...f.drager, maxHoogte: v } })} />
            <Getal label="Max. totaalgewicht incl. drager" eenheid="kg" waarde={f.drager.maxGewicht} onChange={(v) => zet({ drager: { ...f.drager, maxGewicht: v } })} />
            <Getal label="Min. buitendozen per laag" waarde={f.minPerLaag} onChange={(v) => zet({ minPerLaag: v })} />
          </Rij>
          {f.dragerSnapshot && (
            <p className="hint">
              Drager zoals vastgelegd in de geopende berekening: {f.dragerSnapshot.naam}, {f.dragerSnapshot.lengte} × {f.dragerSnapshot.breedte} ×{' '}
              {f.dragerSnapshot.hoogte} mm, {f.dragerSnapshot.gewicht} kg. Kies een drager uit de lijst om de huidige gegevens te gebruiken.
            </p>
          )}
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
        {resultaat && <Overzicht resultaat={resultaat} gekozen={gekozen} onKies={(o) => void kies(o)} nummer={huidig?.nummer} />}
        {resultaat && gekozen && (
          <Detail
            o={gekozen}
            invoer={resultaat.invoer}
            onPdf={pdf}
            bezig={pdfBezig}
            standaardTaal={p.instellingen.taal}
            onOverzicht={huidig ? () => void naarOverzicht() : undefined}
            inOverzicht={inOverzicht === gekozen.id}
          />
        )}
      </div>
    </div>
  );
}
