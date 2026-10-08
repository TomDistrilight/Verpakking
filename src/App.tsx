import { useCallback, useEffect, useState } from 'react';
import type { Drager } from './engine/types';
import {
  leesArtikelen,
  leesBerekeningen,
  leesDragers,
  leesInstellingen,
  schrijfArtikelen,
  schrijfBerekeningen,
  schrijfDragers,
  schrijfInstellingen,
  type Artikel,
  type Berekening,
  type Instellingen as Inst,
} from './data/opslag';
import { leegFormulier, metArtikel, vanInvoer, type Formulier } from './ui/formulier';
import { Berekenen } from './ui/Berekenen';
import { Artikelen } from './ui/Artikelen';
import { Dragers } from './ui/Dragers';
import { Import } from './ui/Import';
import { Geschiedenis } from './ui/Geschiedenis';
import { Instellingen } from './ui/Instellingen';

type Tab = 'berekenen' | 'artikelen' | 'dragers' | 'import' | 'geschiedenis' | 'instellingen';

const TABS: { id: Tab; naam: string }[] = [
  { id: 'berekenen', naam: 'Berekenen' },
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
}

export function App() {
  const [tab, setTab] = useState<Tab>('berekenen');
  const [gegevens, setGegevens] = useState<Gegevens | null>(null);
  const [formulier, setFormulier] = useState<Formulier | null>(null);
  const [versie, setVersie] = useState(0);

  const laad = useCallback(async () => {
    const [artikelen, dragers, instellingen, berekeningen] = await Promise.all([leesArtikelen(), leesDragers(), leesInstellingen(), leesBerekeningen()]);
    setGegevens({ artikelen, dragers, instellingen, berekeningen });
    setFormulier(leegFormulier(instellingen, dragers));
    setVersie((v) => v + 1);
  }, []);

  useEffect(() => {
    void laad();
  }, [laad]);

  if (!gegevens || !formulier) return <div className="laden">Laden…</div>;
  const { artikelen, dragers, instellingen, berekeningen } = gegevens;

  async function bewaarArtikelen(a: Record<string, Artikel>) {
    await schrijfArtikelen(a);
    setGegevens((g) => g && { ...g, artikelen: a });
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
            onBerekeningOpslaan={async (b) => {
              // Opslaan of bijwerken op nummer; het nummer is uniek (zie volgendNummer).
              const huidige = await leesBerekeningen();
              const lijst = huidige.some((x) => x.nummer === b.nummer) ? huidige.map((x) => (x.nummer === b.nummer ? b : x)) : [...huidige, b];
              await schrijfBerekeningen(lijst);
              setGegevens((g) => g && { ...g, berekeningen: lijst });
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
            onOpslaan={async (i) => {
              await schrijfInstellingen(i);
              setGegevens((g) => g && { ...g, instellingen: i });
            }}
            onHerladen={laad}
          />
        )}
      </main>
      <footer className="voet">Gegevens blijven in deze browser. Maak via Instellingen regelmatig een back-up.</footer>
    </div>
  );
}
