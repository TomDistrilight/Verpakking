# Verpakkingsapp

Webapp die berekent hoeveel eenheden van één artikel op één ladingdrager passen: **binnendoos → nieuw ontworpen buitendoos → ladingdrager**. De app toont maximaal drie oplossingen met uitleg, tekeningen en een PDF van één A4-pagina in het Nederlands of Engels.

Het functioneel ontwerp staat in [`docs/functioneel-ontwerp-v1.5.md`](docs/functioneel-ontwerp-v1.5.md). De beslissingen staan in [`docs/besluiten-ronde-1.md`](docs/besluiten-ronde-1.md), [`docs/besluiten-ronde-2.md`](docs/besluiten-ronde-2.md), [`docs/besluiten-ronde-3.md`](docs/besluiten-ronde-3.md) en [`docs/besluiten-ronde-4.md`](docs/besluiten-ronde-4.md).

## Wat de app doet

- **Berekenen:** begin bij een artikel of binnendoos, of bij een bestaande buitendoos. De app ontwerpt buitendozen uit hele blokken binnendozen (FEFCO 0201 of custom), zoekt per doos het beste laagpatroon (ook gemengde lagen en verband), controleert overhang, hoogte en gewicht, en rangschikt volgens het ontwerp: eerst de kantelregel (kantelen mag, maar wint alleen bij minstens 10% meer), dan collimodule op de europallet en dan recht tegenover verband. Bij een gelijk aantal per drager en per doos gaat de plattere doos voor. Bij verband zet de app daarna de dozen waar mogelijk tegen de rand van de drager, zolang elke doos minstens 75% steun houdt (instelbaar); een rechte stapeling blijft gecentreerd.
- **Minimumaantallen en vormregel:** per berekening vul je het minimaal aantal binnendozen per buitendoos en het minimaal aantal buitendozen per laag in (standaard 2). Een ontworpen buitendoos is standaard niet hoger dan breed, behalve bij één laag binnendozen rechtop (of gekanteld, als die stand niet hoger is).
- **Geen buitendoos:** voor een groot of zwaar artikel zet je de binnendoos zelf op de drager. Doostype, max. gevulde buitendoos, minimum per doos en vormregel gelden dan niet; de keuze wordt per artikel bewaard.
- **Geen oplossing:** de app meldt per overschreden grens wat er minimaal nodig is, bijvoorbeeld "minstens 45 mm overhang in de lengte".
- **PDF:** één pagina met logo, groot artikelnummer, tekeningen met maatvoering en de laagopbouw, standaard in het Nederlands (Engels kies je bij het exporteren). Hoekprofielen en stretchfolie staan in de tekening van de lading. De bestandsnaam is het artikelnummer.
- **Beheer:** artikelen, ladingdragers en karren, en een Excel- of CSV-import met kolomkoppeling, eenheden, controle per rij en bevestiging bij overschrijven. Op het importscherm download je een voorbeeldbestand met de juiste kolomkoppen.
- **Geschiedenis:** elke geëxporteerde oplossing wordt met alle invoer bewaard, zodat het PDF later precies opnieuw te maken is. Met **Naar overzicht** zet je een oplossing in het overzicht.
- **Overzicht:** tabblad met alle gekozen oplossingen (via **Opslaan in overzicht** op het rekenscherm), één regel per oplossing. Per regel: verwachte leverdatum, vinkje fysiek gecontroleerd, taal en PDF-export. Zoeken op artikelnummer of omschrijving; sorteren op leverdatum (vroeg naar laat), artikelnummer of laatst gekozen; gecontroleerde regels kun je verbergen. Leverdata lees je in uit Excel of CSV (kolom A artikelnummer, kolom B datum; er is een voorbeeldbestand); dat werkt alleen nog niet gecontroleerde regels bij en maakt niets aan. Kies je opnieuw voor een artikel met een open regel, dan wordt die regel vervangen en blijft de leverdatum staan.
- **Instellingen:** standaardwaarden, waaronder de standaard voor beide minimumaantallen, de vormregel (breedte, lengte of uit) en de minimale ondersteuning bij het uitlijnen (standaard 75%), plus logo en back-up.

## Gegevens

De app heeft geen server en geen inlog. Artikelen, dragers, instellingen, berekeningen en het overzicht van gekozen oplossingen staan in de browser van de gebruiker (IndexedDB). Ze staan dus niet in deze repository en niet op GitHub. Via **Instellingen → Back-up downloaden** maak je een back-upbestand. Met dat bestand zet je alles terug, ook op een andere computer.

Een GitHub Pages-adres is openbaar bereikbaar, maar iedere bezoeker ziet alleen de gegevens in de eigen browser.

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
| `src/engine/` | Rekenmodule: dooskandidaten, laagpatronen, plaatsing en overhang, verband, stapelen, rangschikking en uitlijnen tegen de rand (bij verband). Deterministisch en zonder afhankelijkheden van de browser. |
| `src/draw/` | Isometrische tekeningen en bovenaanzichten als SVG, uit dezelfde coördinaten als de rekenmodule. |
| `src/pdf/` | PDF-rapport van één pagina (jsPDF en svg2pdf.js). |
| `src/import/` | Excel- en CSV-import van artikelen en van leverdata voor het overzicht. |
| `src/data/` | Opslag in de browser en back-up. |
| `src/ui/` | Schermen (React). |
| `tests/` | Acceptatietests (§6 en bijlage A van het ontwerp), tests voor de regels van ronde 3 en 4, het uitlijnen, het overzicht, de tekening en de voorbeeldbestanden, en importtests. |
| `public/` | Logo, favicon en de voorbeeldbestanden voor de import (`voorbeeld-artikelen.xlsx`, `voorbeeld-leverdata.xlsx`). |
| `scripts/` | `maak_voorbeelden.py` maakt de voorbeeldbestanden opnieuw (`python3 scripts/maak_voorbeelden.py public`, vereist openpyxl). |
| `docs/` | Ontwerp, besluiten, PDF-voorbeeld en foto's van de praktijkcases. |
