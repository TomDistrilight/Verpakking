# Functioneel ontwerp verpakkingsapp — versie 1

**Status:** ontwerp voor bouw en bespreking · **Datum:** 24 september 2026

## 1. Doel en afbakening

De app berekent hoeveel eenheden van één artikel op één ladingdrager passen. De gebruikelijke route is **gevulde binnendoos → nieuw ontworpen buitendoos → ladingdrager**. De gebruiker kan ook beginnen bij een artikel of een bestaande buitendoos. De app genereert meerdere geldige verpakkingscombinaties, test die op de gekozen ladingdrager en toont drie bruikbare oplossingen met een vaste afbeelding in 3D-aanzicht en een printbaar PDF-rapport.

V1 rekent met rechthoekige producten en dozen, één artikelsoort en één maat buitendoos per ladingdrager. Er is geen orderaantal, mengpallet, voorspelling van doossterkte of fysieke stabiliteitsgarantie. Er is geen draaibare 3D-viewer nodig.

## 2. Schermen en gebruikersverloop

1. **Start / gegevensbeheer:** kies een opgeslagen artikel en bijbehorende binnendoos, een bestaande buitendoos of handmatige invoer; beheer artikelrecords, binnendozen en ladingdragers. De standaarddragers zijn europallet 1200 × 800 × 140 mm, 25 kg, en blokpallet 1200 × 1000 × 140 mm, 30 kg. Afmetingen, gewicht en capaciteit zijn aanpasbaar; nieuwe pallets en karren zijn toe te voegen.
2. **Invoer:** selecteer instapniveau en drager; vul afmetingen, gewichten, oriëntatieregels, maximale totale hoogte inclusief drager, maximale belading, overhang per zijde, eventuele tussenlagen en tolerantie in. Toon direct welke waarden nog ontbreken of onmogelijk zijn.
3. **Berekenen:** toon voortgang en de gehanteerde invoer. Als geen geldige oplossing bestaat, toon welke limiet of regel de kandidaten uitsluit.
4. **Resultaten:** drie kaarten met aantallen binnendozen per buitendoos, buitendozen en binnendozen per drager, artikelen per drager, gevulde doosgewichten, totale hoogte/gewicht, buitenmaten, overhang en stapelwijze. Leg uit waarom de voorkeursoptie bovenaan staat. Laat de gebruiker een alternatief kiezen.
5. **Instructie / export:** toon een bovenaanzicht van iedere unieke laag, het aantal lagen, de richting en positie van elke doos, plaatsing van tussenlagen en een vaste isometrische afbeelding van de complete lading. Exporteer de gekozen oplossing als PDF. Een afzonderlijke PDF-export van artikelgegevens is beschikbaar.
6. **Excel-import:** importeer artikelen plus bijbehorende binnendoosmaten, gewicht inclusief inhoud en aantal artikelen per binnendoos. Toon een kolomkoppeling, validatiefouten per rij en een voorbeeld vóór opslaan; herhaald importeren mag geen ongemerkte dubbele artikelen opleveren.

## 3. Invoervelden en gegevensmodel

Alle lengtes in mm, massa's in kg. De opslag bewaart de eenheid, invoerwaarden en gebruikte instellingen bij ieder berekend resultaat, zodat een PDF later te reproduceren is.

| Entiteit | Verplichte velden / relevante opties |
|---|---|
| Artikel | Unieke artikelcode, omschrijving, eventueel buitenmaat L×B×H en gewicht; toegestane rotatie in liggend vlak en kantelen; aantal artikelen per binnendoos indien een binnendoos bestaat. |
| Binnendoos | Buitenmaat L×B×H, **gevuld** gewicht, artikelcode en artikelen per binnendoos; toegestane rotatie en kanteling in buitendoos. Het aantal artikelen is apart zichtbaar, maar binnendozen per buitendoos is de hoofdmaat. |
| Buitendoos | Berekende binnen- en buitenmaat of bestaande maat, wanddikte, eigen gewicht, gevuld gewicht, binnendozen per doos; toegestane rotatie en kanteling op de drager. |
| Ladingdrager | Type, voetafdruk, eigen hoogte/gewicht, maximaal totaalgewicht, maximaal totale hoogte inclusief drager; overhang toegestaan, maxima links/rechts/voor/achter en asymmetrisch toegestaan. |
| Tussenlaag | Geen/karton/hout, na iedere N volledige lagen, afmetingen gelijk aan drager; standaard karton 5 mm/2 kg, hout 15 mm/5 kg, aanpasbaar. |
| Berekening | Instapniveau, bronrecord, alle gekozen instellingen, kandidatuitslagen, gekozen optie en tijdstip. |

**Standaarden:** maximale gevulde buitendoos 23 kg (aanpasbaar); wanddikte 7 mm per zijde; kartonmassa 0,750 kg/m²; productieruimte maximaal 3 mm per binnendimensie (aanpasbaar); voorkeursmaat buitendoos circa 600 × 400 × 500 mm. Die voorkeursmaat is geen maximum. Eigen gewicht van een niet-standaard ladingdrager wordt expliciet ingevoerd; 25 kg/m² is hoogstens een voorgestelde startwaarde, geen fysieke eigenschap van iedere kar.

Bij invoer op artikelniveau moet de gebruiker de binnendoos kunnen vastleggen of laten ontwerpen; zonder aantal artikelen per binnendoos en diens gevulde gewicht kan de app de volledige keten niet betrouwbaar berekenen. Bij invoer van een bestaande buitendoos kunnen aantallen per pallet worden berekend; aantallen binnendozen en artikelen verschijnen alleen als hun inhoud is opgegeven.

## 4. Rekenregels en afwijzingen

### 4.1 Buitendooskandidaten

- Genereer geldige 90°-oriëntaties van de binnendoos volgens de afzonderlijke rechten voor draaien in het vlak en kantelen. Een vrije buitendoos wordt opgebouwd uit gehele aantallen binnendozen in lengte, breedte en hoogte. De binnenmaat sluit op die blokindeling aan, met 0 tot maximaal de ingestelde productieruimte per dimensie; er is geen ontworpen lege vakruimte.
- Bereken buitenmaat per as als binnenmaat + tweemaal 7 mm (of ingestelde wanddikte). Bereken kartonoppervlak zonder flappen als `2 × (L×B + L×H + B×H)` op basis van **buitenmaten in m**; eigen gewicht = oppervlak × 0,750 kg/m². Dit is een schatting, geen productiegewicht.
- Gevuld doosgewicht = aantal binnendozen × gevuld gewicht per binnendoos + geschat eigen gewicht buitendoos. Verwerp een kandidaat boven het ingestelde maximale gevulde doosgewicht. Er is geen vaste grens aan binnendozen of buitenmaat; de gewichtslimiet en de maximaal bruikbare ruimte/hoogte van de gekozen drager begrenzen de zoekruimte.
- Test **iedere** overblijvende kandidaat op de ladingdrager. Selecteer dus niet eerst één 'beste' buitendoos. De maat 600 × 400 × 500 mm is alleen een late voorkeur bij gelijke operationele uitkomst.
- Bij een bestaande buitendoos gelden diens werkelijke binnen- en buitenmaten en opgegeven eigen gewicht; ontbrekende waarden moeten eerst worden aangevuld. Dezelfde geometrische en gewichtscontrole geldt.

### 4.2 Laag- en palletpatronen

- Probeer per buitendoos alle toegestane palletoriëntaties, rechte lagen en verspringende/gedraaide opeenvolgende lagen (verband), met een herhaalbaar laagpatroon. Verschillende oriëntaties binnen één laag worden apart onderzocht. Een gemengde laag met kanteling van dozen ten opzichte van uitsluitend vlak draaien wordt slechts als voorkeursalternatief toegelaten als dit ten minste **10% meer buitendozen per drager** oplevert; toon daarnaast een optie met alleen vlak draaien wanneer die geldig is.
- Bepaal posities als rechthoeken in het horizontale vlak. Een doos mag deels buiten het draagvlak liggen; voor **iedere** doos afzonderlijk mogen de uiterste randen de vier ingestelde overhangmaxima niet overschrijden. Bij verboden overhang liggen alle dozen binnen het draagvlak. Bij verboden asymmetrie moet de overhang links/rechts respectievelijk voor/achter gelijk zijn (binnen geometrische afronding).
- Bereken het aantal **volledige** lagen dat past. Tussenlagen komen na elke N lagen, behalve na de laatste laag. Hun dikte en massa tellen mee. `totale hoogte = hoogte drager + som laaghoogtes + som diktes tussenlagen`; `totaalgewicht = gewicht drager + aantal buitendozen × gevuld doosgewicht + som massa tussenlagen`. Beide moeten op of onder het maximum liggen. Tussenlagen hebben de dragerafmeting.
- Een kandidaat valt af als doosinhoud, plaatsing, hoogte, gewicht, oriëntatie, overhang of een andere harde grens niet klopt. Er wordt in V1 geen draagvlakpercentage, druksterkte of kantelrisico als veiligheidsoordeel berekend. De instructie mag daarom geen 'stabiel' of 'veilig voor transport' garanderen.

### 4.3 Rangschikking en top drie

1. Bereken per oplossing `binnendozen per drager = binnendozen per buitendoos × buitendozen per drager`; het aantal artikelen is daarvan een afgeleid veld. Meer binnendozen is de hoofdmaat.
2. Vergelijk de beste geldige verbandoplossing met de beste rechte oplossing: als recht **minstens 10% meer binnendozen per drager** oplevert, krijgt recht de eerste voorkeur. Anders krijgt verband de eerste voorkeur. Gebruik de breuk `(recht − verband) / verband`; bij precies 10% wint recht. Als slechts één soort geldig is, kies die.
3. Sorteer overige oplossingen op meer binnendozen per drager, daarna meer binnendozen per buitendoos, daarna lagere totale hoogte, daarna dichter bij de voorkeursmaat en vervolgens lager totaalgewicht. Een hogere pallet is geen voordeel op zichzelf. Bij gelijke capaciteit heeft een grotere doosinhoud voorrang; verband kan volgens stap 2 ook winnen met een beperkte capaciteitsvermindering.
4. Neem de beste geldige verbandoplossing altijd op in de drie getoonde resultaten, ook wanneer recht door de 10%-regel wint. Vul overige plaatsen met de hoogst gerangschikte **verschillende** verpakkings- of stapelconfiguraties. Toon minder dan drie als er minder unieke geldige opties zijn. Benoem de capaciteitsafweging zichtbaar.

Een variant met hetzelfde aantal binnendozen maar meer artikelen per binnendoos is bij eenzelfde artikel geen verschillende optimalisatie: artikelen per binnendoos is één vaste invoerwaarde.

## 5. Visuele output en PDF

De 3D-afbeelding toont de volledige drager, stapelhoogte, dozen en eventuele tussenlagen. Een ingekleurd referentievlak maakt overhang zichtbaar. Het bovenaanzicht specificeert coördinaten/richtingen per unieke laag en welke laagvolgorde zich herhaalt; bij verschillende laagpatronen zijn meerdere tekeningen nodig. Het PDF-rapport bevat invoer en datum, buiten- en binnenmaten, gewichten, aantallen per niveau, hoogte, overhang per zijde, laagvolgorde, tussenlagen, bovenaanzichten en 3D-afbeelding. Het labelt geschat kartongewicht als schatting.

## 6. Technische opzet en acceptatievoorbeelden

Een webapp kan een opslaglaag voor stamgegevens, een aparte deterministische rekenmodule en een tekenmodule voor isometrische afbeeldingen gebruiken. Bewaar berekening en gekozen resultaat als snapshots; laat PDF en beeld uit dezelfde coördinaten komen als de rekenmodule. Log hoeveel kandidaten zijn getest en waarom ze afvallen. Gebruik een begrensde zoekstrategie voor grote maten en meld wanneer de zoekruimte is afgekapt; presenteer de uitkomst dan als **beste gevonden oplossing**, niet als bewezen wiskundig optimum.

| Controle | Verwacht resultaat |
|---|---|
| Binnendoos 300 × 200 × 150 mm; kandidaat 2 × 2 × 2 | Binnenmaat 600 × 400 × 300 mm bij nul speling; buitenmaat 614 × 414 × 314 mm bij 7 mm wanddikte. |
| Gevulde binnendoos 2 kg; acht per buitendoos | Inhoud 16 kg, plus berekend kartongewicht; alleen geldig zolang gevuld gewicht ≤ ingestelde grens. |
| Drager 1200 × 800 × 140 mm; hoogte 1800 mm | Beschikbare ladinghoogte 1660 mm; tussenlagen verminderen die hoogte. |
| Verband 100, recht 109 binnendozen | Verband heeft voorkeur; recht kan in top drie staan. |
| Verband 100, recht 110 binnendozen | Recht heeft voorkeur; verband staat, indien geldig, ook in top drie. |
| Een doos steekt voorbij ingestelde rechtergrens | Hele kandidaat afgewezen, ook als het totale ladingmiddelpunt binnen de pallet ligt. |

## 7. Nog te valideren bij bouw

Deze keuzes blokkeren het functionele ontwerp niet, maar vragen een expliciete productspecificatie tijdens de uitwerking:

- **Exacte geometrie van verband:** welke verspringing is toegestaan en wanneer heet een laagpatroon 'verband'? Het ontwerp gebruikt afwisselende volledige laagpatronen zonder ongeoorloofde overlap; het precieze zoekpatroon moet met echte dozen worden gevalideerd.
- **Artikelinstap:** mag de app een nieuwe binnendoos ontwerpen of levert de gebruiker altijd een bestaande binnendoosmaat? De gebruikelijke route met bekende binnendoos werkt zonder deze keuze.
- **Overhang in één of twee richtingen:** de opgegeven vier afzonderlijke grenzen gelden, ook wanneer in twee richtingen tegelijk uitsteken is toegestaan; voor asymmetrie wordt hier gelijkheid per tegenoverliggend paar aangenomen.
- **Productieruimte:** het ontwerp interpreteert 3 mm als maximaal extra binnenmaat per as, niet per zijde. Bevestig dit met een kartonleverancier vóór productie.
- **Hantering:** fysieke ondersteuning, druksterkte, verbinding van lagen en gewicht van werkelijk karton zijn niet beoordeeld; laat een medewerker de uiteindelijke verpakking controleren.

**Bouwvolgorde:** eerst invoer en stamgegevens, vervolgens kandidaatgeneratie en harde checks, daarna laagpatronen en rangschikking, ten slotte afbeelding, PDF en Excel-import. Gebruik reële cases met lange armaturen en toegestane overhang als acceptatiegegevens.
