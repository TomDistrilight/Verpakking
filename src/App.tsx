import { useCallback, useEffect, useRef, useState } from 'react';
import type { Drager } from './engine/types';
import {
  leesArtikelen,
  leesBerekeningen,
  leesDragers,
  leesGekozen,
  leesInstellingen,
  schrijfArtikelen,
  schrijfBerekeningen,
  schrijfDragers,
  schrijfGekozen,
  schrijfInstellingen,
  zetInOverzicht,
  type Artikel,
  type Berekening,
  type GekozenOplossing,
  type Instellingen as Inst,
} from './data/opslag';
import { leegFormulier, metArtikel, vanInvoer, type Formulier } from './ui/formulier';
import { Berekenen } from './ui/Berekenen';
import { Artikelen } from './ui/Artikelen';
import { Dragers } from './ui/Dragers';
import { Import } from './ui/Import';
import { Geschiedenis } from './ui/Geschiedenis';
import { Instellingen } from './ui/Instellingen';
import { OverzichtGekozen } from './ui/OverzichtGekozen';

type Tab = 'berekenen' | 'overzicht' | 'artikelen' | 'dragers' | 'import' | 'geschiedenis' | 'instellingen';

const TABS: { id: Tab; naam: string }[] = [
  { id: 'berekenen', naam: 'Berekenen' },
  { id: 'overzicht', naam: 'Overzicht' },
  { id: 'artikelen', naam: 'Artikelen' },
  { id: 'dragers', naam: 'Dragers' },
  { id: 'import', naam: 'Excel-import' },
  { id: 'geschiedenis', naam: 'Geschiedenis' },
  { id: 'instellingen', naam: 'Instellingen' },
];

interface Gegevens {
  artikelen: Record<string, Artikel>;
  dragers: Drager[];
  instellingen: Inst;
  berekeningen: Berekening[];
  gekozen: GekozenOplossing[];
}

export function App() {
  const [tab, setTab] = useState<Tab>('berekenen');
  const [gegevens, setGegevens] = useState<Gegevens | null>(null);
  const [formulier, setFormulier] = useState<Formulier | null>(null);
  const [versie, setVersie] = useState(0);
  // Het overzicht wordt direct in het geheugen bijgewerkt (het scherm reageert meteen) en daarna in
  // volgorde opgeslagen, zodat snelle wijzigingen elkaar niet overschrijven.
  const gekozenNu = useRef<GekozenOplossing[]>([]);
  const wachtrij = useRef<Promise<unknown>>(Promise.resolve());

  const laad = useCallback(async () => {
    const [artikelen, dragers, instellingen, berekeningen, gekozen] = await Promise.all([
      leesArtikelen(),
      leesDragers(),
      leesInstellingen(),
      leesBerekeningen(),
      leesGekozen(),
    ]);
    gekozenNu.current = gekozen;
    setGegevens({ artikelen, dragers, instellingen, berekeningen, gekozen });
    setFormulier(leegFormulier(instellingen, dragers));
    setVersie((v) => v + 1);
  }, []);

  useEffect(() => {
    void laad();
  }, [laad]);

  if (!gegevens || !formulier) return <div className="laden">Laden…</div>;
  const { artikelen, dragers, instellingen, berekeningen, gekozen } = gegevens;

  async function bewaarArtikelen(a: Record<string, Artikel>) {
    await schrijfArtikelen(a);
    setGegevens((g) => g && { ...g, artikelen: a });
  }

  function wijzigGekozen<T>(wijziging: (lijst: GekozenOplossing[]) => { lijst: GekozenOplossing[]; uit: T }): Promise<T> {
    const { lijst, uit } = wijziging(gekozenNu.current);
    gekozenNu.current = lijst;
    setGegevens((g) => g && { ...g, gekozen: lijst });
    const stap = wachtrij.current.then(() => schrijfGekozen(lijst));
    wachtrij.current = stap.catch(() => undefined);
    return stap.then(() => uit);
  }

  /** Zet een gekozen oplossing in het overzicht; geeft true als een open regel is vervangen. */
  function naarOverzicht(regel: GekozenOplossing): Promise<boolean> {
    return wijzigGekozen((lijst) => {
      const r = zetInOverzicht(lijst, regel);
      return { lijst: r.lijst, uit: r.vervangen };
    });
  }

  async function bewaarInstellingen(i: Inst) {
    const oud = instellingen;
    setGegevens((g) => g && { ...g, instellingen: i });
    // Velden van het rekenformulier die nog de oude standaard hebben, krijgen de nieuwe standaard.
    setFormulier((f) => {
      if (!f) return f;
      const tekst = (v: number) => String(v).replace('.', ',');
      const volg = (veld: string, vorig: number, nieuw: number) => (veld === tekst(vorig) ? tekst(nieuw) : veld);
      return {
        ...f,
        maxGevuld: volg(f.maxGevuld, oud.maxGevuldGewicht, i.maxGevuldGewicht),
        minPerDoos: volg(f.minPerDoos, oud.minBinnendozenPerDoos, i.minBinnendozenPerDoos),
        minPerLaag: volg(f.minPerLaag, oud.minBuitendozenPerLaag, i.minBuitendozenPerLaag),
      };
    });
    await schrijfInstellingen(i);
  }

  return (
    <div className="app">
      <header className="kop">
        <div className="merk">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
            <path d="M16 3 28 9v14l-12 6L4 23V9z" fill="#2F6DB5" />
            <path d="M16 3 28 9l-12 6L4 9z" fill="#6FA8DC" />
            <path d="M16 15v14L4 23V9z" fill="#245a99" />
          </svg>
          <span>Verpakkingsapp</span>
        </div>
        <nav aria-label="Hoofdmenu">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'actief' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              {t.naam}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'berekenen' && (
          <Berekenen
            formulier={formulier}
            setFormulier={setFormulier}
            artikelen={artikelen}
            dragers={dragers}
            instellingen={instellingen}
            onArtikelOpslaan={(a) => bewaarArtikelen({ ...artikelen, [a.artikelcode]: a })}
            onNaarOverzicht={naarOverzicht}
            onBerekeningOpslaan={async (b) => {
              // Opslaan of bijwerken op nummer; het nummer is uniek (zie volgendNummer).
              const huidige = await leesBerekeningen();
              const lijst = huidige.some((x) => x.nummer === b.nummer) ? huidige.map((x) => (x.nummer === b.nummer ? b : x)) : [...huidige, b];
              await schrijfBerekeningen(lijst);
              setGegevens((g) => g && { ...g, berekeningen: lijst });
            }}
          />
        )}
        {tab === 'overzicht' && (
          <OverzichtGekozen
            gekozen={gekozen}
            instellingen={instellingen}
            onWijzig={(w) => wijzigGekozen((lijst) => ({ lijst: w(lijst), uit: undefined }))}
            onWeergave={(w) => bewaarInstellingen({ ...instellingen, overzicht: w })}
            onOpenen={(r) => {
              setFormulier(vanInvoer(r.invoer, formulier));
              setTab('berekenen');
            }}
          />
        )}
        {tab === 'artikelen' && (
          <Artikelen
            artikelen={artikelen}
            onOpslaan={async (a, oud) => {
              const nieuw = { ...artikelen };
              if (oud && oud !== a.artikelcode) delete nieuw[oud];
              nieuw[a.artikelcode] = a;
              await bewaarArtikelen(nieuw);
            }}
            onVerwijder={async (code) => {
              const nieuw = { ...artikelen };
              delete nieuw[code];
              await bewaarArtikelen(nieuw);
            }}
            onBereken={(a) => {
              setFormulier(metArtikel({ ...formulier, instap: 'binnendoos' }, a));
              setTab('berekenen');
            }}
          />
        )}
        {tab === 'dragers' && (
          <Dragers
            dragers={dragers}
            onOpslaan={async (d) => {
              await schrijfDragers(d);
              setGegevens((g) => g && { ...g, dragers: d });
              if (!d.some((x) => x.id === formulier.dragerId)) setFormulier(leegFormulier(instellingen, d));
            }}
          />
        )}
        {tab === 'import' && (
          <Import
            artikelen={artikelen}
            onOpslaan={async (lijst) => {
              const nieuw = { ...artikelen };
              for (const a of lijst) nieuw[a.artikelcode] = a;
              await bewaarArtikelen(nieuw);
            }}
          />
        )}
        {tab === 'geschiedenis' && (
          <Geschiedenis
            berekeningen={berekeningen}
            instellingen={instellingen}
            onOpenen={(b) => {
              setFormulier(vanInvoer(b.invoer, formulier));
              setTab('berekenen');
            }}
            onNaarOverzicht={naarOverzicht}
            onVerwijder={async (nummer) => {
              const lijst = berekeningen.filter((b) => b.nummer !== nummer);
              await schrijfBerekeningen(lijst);
              setGegevens((g) => g && { ...g, berekeningen: lijst });
            }}
          />
        )}
        {tab === 'instellingen' && (
          <Instellingen
            key={versie}
            instellingen={instellingen}
            onOpslaan={bewaarInstellingen}
            onHerladen={laad}
          />
        )}
      </main>
      <footer className="voet">Gegevens blijven in deze browser. Maak via Instellingen regelmatig een back-up.</footer>
    </div>
  );
}
