# Verpakkingsapp

Webapp die berekent hoeveel eenheden van één artikel op één ladingdrager passen: **binnendoos → nieuw ontworpen buitendoos → ladingdrager**. De app toont maximaal drie oplossingen met uitleg, tekeningen en een PDF van één A4-pagina in het Nederlands of Engels.

Het functioneel ontwerp staat in [`docs/functioneel-ontwerp-v1.10.md`](docs/functioneel-ontwerp-v1.10.md). De beslissingen staan in [`docs/besluiten-ronde-1.md`](docs/besluiten-ronde-1.md), [`docs/besluiten-ronde-2.md`](docs/besluiten-ronde-2.md), [`docs/besluiten-ronde-3.md`](docs/besluiten-ronde-3.md), [`docs/besluiten-ronde-4.md`](docs/besluiten-ronde-4.md), [`docs/besluiten-ronde-5.md`](docs/besluiten-ronde-5.md), [`docs/besluiten-ronde-6.md`](docs/besluiten-ronde-6.md), [`docs/besluiten-ronde-7.md`](docs/besluiten-ronde-7.md), [`docs/besluiten-ronde-8.md`](docs/besluiten-ronde-8.md) en [`docs/besluiten-ronde-9.md`](docs/besluiten-ronde-9.md).

## Wat de app doet

- **Berekenen:** begin bij een artikel of binnendoos, of bij een bestaande buitendoos, met of zonder binnendoos. De app ontwerpt buitendozen uit hele blokken binnendozen (FEFCO 0201 of custom), zoekt per doos het beste laagpatroon (ook gemengde lagen en verband), controleert overhang, hoogte en gewicht, en rangschikt volgens het ontwerp: eerst de vormregel (een doos hoger dan breed wint alleen bij minstens 10% meer), dan de kantelregel (kantelen mag, maar wint alleen bij minstens 10% meer), dan collimodule op de europallet en dan recht tegenover verband. Bij een gelijk aantal per drager en per doos gaat de plattere doos voor. Verband telt alleen als het in de buurt van een blok zit: elke doos rust voor minstens 75% op de laag eronder, en geen laag laat aan de rand van het blok meer dan 5% leeg (beide instelbaar); een holte binnenin telt niet. Bij verband kiest de app bij voorkeur lagen die gespiegeld op elkaar liggen, zolang dat geen dozen, overhang, torens of steun kost. Ze probeert daarbij ook andere vijfblokspatronen (pinwheel) met evenveel dozen. Ligt zo'n patroon beter in verband, dan kan een laag één gesloten blok worden in plaats van twee losse blokken. Daarna maakt de app van de lading zo veel mogelijk een gesloten, symmetrisch blok: de dozen gaan tegen de rand van het blok (alle lagen samen), zonder gaten aan de zijkant en zonder extra overhang, zolang elke doos minstens 75% steun houdt (instelbaar). Een rechte stapeling blijft gecentreerd.
- **Minimumaantallen, artikelen per binnendoos en vormregel:** per berekening vul je het minimaal aantal binnendozen per buitendoos en het minimaal aantal buitendozen per laag in (standaard 2). Het aantal artikelen per binnendoos is een vast aantal ("Artikelen per binnendoos", standaard 2; bij een artikel zonder binnendoos 1); resultaten en PDF tonen het aantal artikelen per drager zonder "min.". Een ontworpen buitendoos mag standaard hoger zijn dan breed, maar alleen als dat minstens 10% meer binnendozen per drager geeft dan de doos die de app kiest als geen doos hoger mag zijn dan breed, en nooit hoger dan 2 × de breedte (instelbaar). Wint er toch geen hogere doos, dan is de uitkomst precies die van "niet hoger dan de breedte". Wint zo'n hogere doos wel, dan staat die platte doos in de top drie, als vaste kaart of al als andere kaart (alleen als er al drie vaste kaarten staan, kan ze ontbreken). Eén laag binnendozen rechtop (of gekanteld, als die stand niet hoger is) mag altijd.
- **Geen buitendoos:** voor een groot of zwaar artikel zet je de binnendoos zelf op de drager. Doostype, max. gevulde buitendoos, minimum per doos en vormregel gelden dan niet; de keuze wordt per artikel bewaard.
- **Bestaande buitendoos zonder binnendoos:** zonder het vinkje "Binnendoos opgeven" (standaard uit) vul je alleen de maten en het gevulde gewicht van de buitendoos in, en eventueel het aantal artikelen per buitendoos. Resultaten en PDF tellen dan artikelen; het PDF toont bij de binnendoos "Geen binnendoos". Zonder binnendoos kun je met **Kantelbaar** (en L en/of B mag verticaal) toestaan dat de buitendoos gekanteld op de drager staat; gekanteld wint alleen bij minstens 10% meer per drager. Met het vinkje geef je een binnendoos op, bijvoorbeeld om de inhoud van de buitendoos te laten berekenen; de buitendoos staat dan altijd rechtop.
- **Geen oplossing:** de app meldt per overschreden grens wat er minimaal nodig is, bijvoorbeeld "minstens 45 mm overhang in de lengte".
- **PDF:** één pagina met logo, groot artikelnummer, tekeningen met maatvoering en de laagopbouw, standaard in het Nederlands (Engels kies je bij het exporteren). Hoekprofielen en stretchfolie staan in de tekening van de lading. De bestandsnaam is het artikelnummer.
- **Beheer:** artikelen, ladingdragers en karren, en een Excel- of CSV-import met kolomkoppeling, eenheden, controle per rij en bevestiging bij overschrijven. De artikelimport leest ook of een binnendoos kantelbaar is (kolommen Kantelbaar, L mag verticaal en B mag verticaal, met ja of nee). Bij Kantelbaar ja mogen L en B verticaal, behalve een as met nee; is Kantelbaar leeg, dan maakt ja bij een as de doos kantelbaar voor die as. Een rij met een fout wordt niet geïmporteerd, ook niet over een bestaand artikel heen; het scherm waarschuwt daarvoor. Op het importscherm download je een voorbeeldbestand met de juiste kolomkoppen en een werkblad met ingevulde voorbeeldrijen; een leeg aantal artikelen per binnendoos wordt 2.
- **Geschiedenis:** elke geëxporteerde oplossing wordt met alle invoer bewaard, zodat het PDF later precies opnieuw te maken is. Met **Naar overzicht** zet je een oplossing in het overzicht.
- **Overzicht:** tabblad met alle gekozen oplossingen (via **Opslaan in overzicht** op het rekenscherm), één regel per oplossing. Per regel: verwachte leverdatum, vinkje fysiek gecontroleerd, taal en PDF-export. Zoeken op artikelnummer of omschrijving; sorteren op leverdatum (vroeg naar laat), artikelnummer of laatst gekozen; gecontroleerde regels kun je verbergen. Leverdata lees je in uit Excel of CSV (kolom A artikelnummer, kolom B datum; er is een voorbeeldbestand); dat werkt alleen nog niet gecontroleerde regels bij en maakt niets aan. Kies je opnieuw voor een artikel met een open regel, dan wordt die regel vervangen en blijft de leverdatum staan.
- **Instellingen:** standaardwaarden, waaronder de standaard voor beide minimumaantallen, de vormregel (hoger dan breed alleen bij minstens 10% meer, met de max. hoogte; of niet hoger dan de breedte, niet hoger dan de lengte, of uit) en verband in de buurt van een blok (min. ondersteuning bij verband, standaard 75%, en max. inham per laag, standaard 5%), plus logo en back-up.

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
| `src/engine/` | Rekenmodule: dooskandidaten, laagpatronen, plaatsing en overhang, verband, stapelen, rangschikking en uitlijnen tot één blok (bij verband). Deterministisch en zonder afhankelijkheden van de browser. |
| `src/draw/` | Isometrische tekeningen en bovenaanzichten als SVG, uit dezelfde coördinaten als de rekenmodule. |
| `src/pdf/` | PDF-rapport van één pagina (jsPDF en svg2pdf.js). |
| `src/import/` | Excel- en CSV-import van artikelen en van leverdata voor het overzicht. |
| `src/data/` | Opslag in de browser en back-up. |
| `src/ui/` | Schermen (React). |
| `tests/` | Acceptatietests (§6 en bijlage A van het ontwerp), tests voor de regels van ronde 3, 4, 5, 6, 7, 8 en 9, het uitlijnen, het overzicht, de tekening en de voorbeeldbestanden, en importtests. |
| `public/` | Logo, favicon en de voorbeeldbestanden voor de import (`voorbeeld-artikelen.xlsx`, `voorbeeld-leverdata.xlsx`). |
| `scripts/` | `maak_voorbeelden.py` maakt de voorbeeldbestanden opnieuw (`python3 scripts/maak_voorbeelden.py public`, vereist openpyxl). |
| `docs/` | Ontwerp, besluiten, PDF-voorbeeld en foto's van de praktijkcases. |
