# Verpakkingsapp

Webapp die berekent hoeveel eenheden van één artikel op één ladingdrager passen: **binnendoos → nieuw ontworpen buitendoos → ladingdrager**. De app toont maximaal drie oplossingen met uitleg, tekeningen en een PDF van één A4-pagina in het Nederlands of Engels.

Het functioneel ontwerp staat in [`docs/functioneel-ontwerp-v1.3.md`](docs/functioneel-ontwerp-v1.3.md). De beslissingen staan in [`docs/besluiten-ronde-1.md`](docs/besluiten-ronde-1.md) en [`docs/besluiten-ronde-2.md`](docs/besluiten-ronde-2.md).

## Wat de app doet

- **Berekenen:** begin bij een artikel of binnendoos, of bij een bestaande buitendoos. De app ontwerpt buitendozen uit hele blokken binnendozen (FEFCO 0201 of custom), zoekt per doos het beste laagpatroon (ook gemengde lagen en verband), controleert overhang, hoogte en gewicht, en rangschikt volgens het ontwerp: eerst collimodule op de europallet, dan de kantelregel en dan recht tegenover verband.
- **Geen oplossing:** de app meldt per overschreden grens wat er minimaal nodig is, bijvoorbeeld "minstens 45 mm overhang in de lengte".
- **PDF:** één pagina met logo, groot artikelnummer, tekeningen met maatvoering en de laagopbouw. De bestandsnaam is het artikelnummer.
- **Beheer:** artikelen, ladingdragers en karren, en een Excel- of CSV-import met kolomkoppeling, eenheden, controle per rij en bevestiging bij overschrijven.
- **Geschiedenis:** elke geëxporteerde oplossing wordt met alle invoer bewaard, zodat het PDF later precies opnieuw te maken is.

## Gegevens

De app heeft geen server en geen inlog. Artikelen, dragers, instellingen en berekeningen staan in de browser van de gebruiker (IndexedDB). Ze staan dus niet in deze repository en niet op GitHub. Via **Instellingen → Back-up downloaden** maak je een back-upbestand. Met dat bestand zet je alles terug, ook op een andere computer.

Een GitHub Pages-adres is openbaar bereikbaar, maar iedere bezoeker ziet alleen de gegevens in zijn eigen browser.

## Publiceren op GitHub Pages

1. Zet in de repository onder **Settings → Pages** de bron (**Source**) op **GitHub Actions**.
2. Merge naar `main`. De workflow [`pages.yml`](.github/workflows/pages.yml) test, bouwt en publiceert de app.
3. De app staat daarna op `https://<organisatie>.github.io/Verpakking/`.

Bij een pull request draait de workflow alleen de tests en de build.

## Ontwikkelen

Nodig: Node.js 22.

```bash
npm install
npm run dev        # ontwikkelserver op http://localhost:5173
npm test           # rekenmodule en import, inclusief de acceptatievoorbeelden uit het ontwerp
npm run build      # typecheck en productiebuild in dist/
```

## Opbouw

| Map | Inhoud |
|---|---|
| `src/engine/` | Rekenmodule: dooskandidaten, laagpatronen, plaatsing en overhang, verband, stapelen, rangschikking. Deterministisch en zonder afhankelijkheden van de browser. |
| `src/draw/` | Isometrische tekeningen en bovenaanzichten als SVG, uit dezelfde coördinaten als de rekenmodule. |
| `src/pdf/` | PDF-rapport van één pagina (jsPDF en svg2pdf.js). |
| `src/import/` | Excel- en CSV-import. |
| `src/data/` | Opslag in de browser en back-up. |
| `src/ui/` | Schermen (React). |
| `tests/` | Acceptatietests (§6 en bijlage A van het ontwerp) en importtests. |
| `docs/` | Ontwerp, besluiten, PDF-voorbeeld en foto's van de praktijkcases. |
