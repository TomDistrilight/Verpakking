import { useEffect, useState } from 'react';
import type { Instellingen as Inst } from '../data/opslag';
import type { Vormregel } from '../engine/types';
import { maakBackup, zetBackupTerug, wisAlles } from '../data/opslag';
import { g } from './formulier';
import { logoUitBestand, logoVoorPdf } from './logo';
import { Getal, Keuze, Rij } from './velden';

const t = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? '' : String(v).replace('.', ','));
const opt = (v: string) => (v.trim() === '' ? undefined : g(v));

export function Instellingen(props: { instellingen: Inst; onOpslaan: (i: Inst) => Promise<void>; onHerladen: () => Promise<void> }) {
  const i = props.instellingen;
  const [velden, setVelden] = useState({
    maxGevuld: t(i.maxGevuldGewicht),
    minL: t(i.minBuitenmaat.L),
    minB: t(i.minBuitenmaat.B),
    minH: t(i.minBuitenmaat.H),
    maxL: t(i.maxBuitenmaat.L),
    maxB: t(i.maxBuitenmaat.B),
    maxH: t(i.maxBuitenmaat.H),
    tL: t(i.customDoostype.toeslagL),
    tB: t(i.customDoostype.toeslagB),
    tH: t(i.customDoostype.toeslagH),
    massa: t(i.customDoostype.kartonmassa),
    zoeklimiet: t(i.zoeklimiet),
    minPerDoos: t(i.minBinnendozenPerDoos),
    minPerLaag: t(i.minBuitendozenPerLaag),
    vormregel: i.vormregel,
    minSteun: t(i.minSteun),
  });
  const [melding, setMelding] = useState<{ soort: 'ok' | 'fout'; tekst: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    void logoVoorPdf(i).then((l) => setLogoUrl(l?.dataUrl ?? null));
  }, [i]);

  const zet = (w: Partial<typeof velden>) => setVelden({ ...velden, ...w });

  async function opslaan() {
    const nieuw: Inst = {
      ...i,
      maxGevuldGewicht: g(velden.maxGevuld),
      minBuitenmaat: { L: opt(velden.minL), B: opt(velden.minB), H: opt(velden.minH) },
      maxBuitenmaat: { L: opt(velden.maxL), B: opt(velden.maxB), H: opt(velden.maxH) },
      customDoostype: { soort: 'custom', toeslagL: g(velden.tL), toeslagB: g(velden.tB), toeslagH: g(velden.tH), kartonmassa: g(velden.massa) },
      zoeklimiet: Math.round(g(velden.zoeklimiet)),
      minBinnendozenPerDoos: g(velden.minPerDoos),
      minBuitendozenPerLaag: g(velden.minPerLaag),
      vormregel: velden.vormregel,
      minSteun: g(velden.minSteun),
    };
    const getallen = [nieuw.maxGevuldGewicht, nieuw.customDoostype.toeslagL, nieuw.customDoostype.toeslagB, nieuw.customDoostype.toeslagH, nieuw.customDoostype.kartonmassa];
    if (getallen.some((x) => !(x >= 0)) || !(nieuw.maxGevuldGewicht > 0))
      return setMelding({ soort: 'fout', tekst: 'Controleer de getallen; ze moeten ingevuld en niet negatief zijn.' });
    if (!(nieuw.zoeklimiet >= 50)) return setMelding({ soort: 'fout', tekst: 'De zoeklimiet moet minstens 50 voetafdrukken zijn.' });
    if (![nieuw.minBinnendozenPerDoos, nieuw.minBuitendozenPerLaag].every((x) => Number.isInteger(x) && x >= 1))
      return setMelding({ soort: 'fout', tekst: 'De minimumaantallen moeten gehele getallen van minstens 1 zijn.' });
    if (!(nieuw.minSteun >= 0 && nieuw.minSteun <= 100)) return setMelding({ soort: 'fout', tekst: 'De minimale ondersteuning moet tussen 0 en 100% liggen.' });
    const grenzen = [...Object.values(nieuw.minBuitenmaat), ...Object.values(nieuw.maxBuitenmaat)].filter((x) => x !== undefined);
    if (grenzen.some((x) => !(x! > 0))) return setMelding({ soort: 'fout', tekst: 'Min./max. buitenmaat moet leeg zijn of groter dan 0.' });
    await props.onOpslaan(nieuw);
    setMelding({ soort: 'ok', tekst: 'Instellingen opgeslagen. Ze gelden voor nieuwe berekeningen.' });
  }

  async function exporteer() {
    const b = await maakBackup();
    const blob = new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `verpakkingsapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importeer(bestand?: File) {
    if (!bestand) return;
    try {
      const b = JSON.parse(await bestand.text());
      if (!confirm('Alle huidige gegevens in deze browser worden vervangen door de back-up. Doorgaan?')) return;
      await zetBackupTerug(b);
      await props.onHerladen();
      setMelding({ soort: 'ok', tekst: 'Back-up teruggezet.' });
    } catch (e) {
      setMelding({ soort: 'fout', tekst: `Back-up niet teruggezet: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  return (
    <div className="pagina">
      <div className="pagina-kop">
        <h2>Instellingen</h2>
      </div>
      {melding && <div className={`melding ${melding.soort}`}>{melding.tekst}</div>}
      <div className="paneel">
        <h3>Standaarden voor nieuwe berekeningen</h3>
        <Rij>
          <Getal label="Max. gevulde buitendoos" eenheid="kg" waarde={velden.maxGevuld} onChange={(v) => zet({ maxGevuld: v })} />
          <Getal label="Zoeklimiet (voetafdrukken)" waarde={velden.zoeklimiet} hint="Afkappen op aantal, niet op tijd" onChange={(v) => zet({ zoeklimiet: v })} />
        </Rij>
        <Rij>
          <Getal label="Min. binnendozen per buitendoos" waarde={velden.minPerDoos} hint="Geldt voor een nieuw ontworpen buitendoos" onChange={(v) => zet({ minPerDoos: v })} />
          <Getal label="Min. buitendozen per laag" waarde={velden.minPerLaag} onChange={(v) => zet({ minPerLaag: v })} />
          <Keuze<Vormregel>
            label="Vormregel buitendoos"
            waarde={velden.vormregel}
            opties={[
              { waarde: 'breedte', tekst: 'Niet hoger dan de breedte' },
              { waarde: 'lengte', tekst: 'Niet hoger dan de lengte' },
              { waarde: 'uit', tekst: 'Uit' },
            ]}
            onChange={(v) => zet({ vormregel: v })}
          />
        </Rij>
        <p className="hint">Vormregel: breder en langer gaat voor hoger. Een doos met één laag binnendozen mag altijd, want dan bepaalt de binnendoos de hoogte.</p>
        <h4>Uitlijnen tegen de rand van de drager (bij verband)</h4>
        <Rij>
          <Getal
            label="Min. ondersteuning bij uitlijnen"
            eenheid="%"
            waarde={velden.minSteun}
            hint="Bij verband gaan dozen waar mogelijk tegen de rand van de drager, zolang elke doos minstens dit deel van zijn grondvlak op de laag eronder houdt. Een rechte stapeling blijft gecentreerd."
            onChange={(v) => zet({ minSteun: v })}
          />
        </Rij>
        <h4>Min. en max. buitenmaat (leeg = geen grens)</h4>
        <Rij>
          <Getal label="Min. lengte" eenheid="mm" waarde={velden.minL} onChange={(v) => zet({ minL: v })} />
          <Getal label="Min. breedte" eenheid="mm" waarde={velden.minB} onChange={(v) => zet({ minB: v })} />
          <Getal label="Min. hoogte" eenheid="mm" waarde={velden.minH} onChange={(v) => zet({ minH: v })} />
        </Rij>
        <Rij>
          <Getal label="Max. lengte" eenheid="mm" waarde={velden.maxL} onChange={(v) => zet({ maxL: v })} />
          <Getal label="Max. breedte" eenheid="mm" waarde={velden.maxB} onChange={(v) => zet({ maxB: v })} />
          <Getal label="Max. hoogte" eenheid="mm" waarde={velden.maxH} onChange={(v) => zet({ maxH: v })} />
        </Rij>
        <h4>Standaardwaarden doostype custom</h4>
        <Rij>
          <Getal label="Toeslag lengte" eenheid="mm" waarde={velden.tL} onChange={(v) => zet({ tL: v })} />
          <Getal label="Toeslag breedte" eenheid="mm" waarde={velden.tB} onChange={(v) => zet({ tB: v })} />
          <Getal label="Toeslag hoogte" eenheid="mm" waarde={velden.tH} onChange={(v) => zet({ tH: v })} />
          <Getal label="Kartonmassa" eenheid="kg/m²" waarde={velden.massa} onChange={(v) => zet({ massa: v })} />
        </Rij>
        <div className="acties">
          <button className="knop" onClick={opslaan}>
            Opslaan
          </button>
        </div>
      </div>

      <div className="paneel">
        <h3>PDF</h3>
        <p className="hint">Het PDF is standaard in het Nederlands; Engels kies je bij het exporteren.</p>
        <div className="logo-rij">
          <div className="logo-voorbeeld">{logoUrl ? <img src={logoUrl} alt="Logo" /> : <span className="klein">Geen logo</span>}</div>
          <label className="bestand">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await props.onOpslaan({ ...i, logo: await logoUitBestand(f) });
                  setMelding({ soort: 'ok', tekst: 'Logo opgeslagen.' });
                } catch (err) {
                  setMelding({ soort: 'fout', tekst: err instanceof Error ? err.message : String(err) });
                }
              }}
            />
            <span>Eigen logo kiezen (PNG of JPG)</span>
          </label>
          <button className="knop secundair" onClick={() => void props.onOpslaan({ ...i, logo: null })}>
            Standaardlogo
          </button>
          <button className="knop secundair" onClick={() => void props.onOpslaan({ ...i, logo: '' })}>
            Geen logo
          </button>
        </div>
      </div>

      <div className="paneel">
        <h3>Gegevens</h3>
        <p>
          Artikelen, dragers, instellingen, berekeningen en het overzicht van gekozen oplossingen staan alleen in deze browser. Maak regelmatig een back-up; met het back-upbestand
          zet je alles terug, ook op een andere computer.
        </p>
        <div className="acties">
          <button className="knop" onClick={() => void exporteer()}>
            Back-up downloaden
          </button>
          <label className="bestand">
            <input type="file" accept="application/json,.json" onChange={(e) => void importeer(e.target.files?.[0])} />
            <span>Back-up terugzetten</span>
          </label>
          <button
            className="knop gevaar"
            onClick={async () => {
              if (!confirm('Alle artikelen, dragers, instellingen, berekeningen en het overzicht in deze browser wissen?')) return;
              await wisAlles();
              await props.onHerladen();
              setMelding({ soort: 'ok', tekst: 'Alle gegevens gewist.' });
            }}
          >
            Alles wissen
          </button>
        </div>
      </div>
    </div>
  );
}
