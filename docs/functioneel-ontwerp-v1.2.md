# Functioneel ontwerp verpakkingsapp — versie 1.2

**Status:** bijgewerkt na ronde 1 van de open vragen · **Datum:** 8 oktober 2026 · **Vorige versie:** 1.1 van 24 september 2026 (`functioneel-ontwerp-v1.1.md`)

Deze versie verwerkt de antwoorden uit de vragenlijst "Open vragen verpakkingsapp V1". Verwijzingen als (#7) slaan op het puntnummer in `besluiten-ronde-1.md`. Punten die nog een antwoord nodig hebben staan in §8 (nummers 31–39). Tot dat antwoord er is, geldt de voorlopige keuze die daar staat.

## 1. Doel en afbakening

De app berekent hoeveel eenheden van één artikel op één ladingdrager passen. De gebruikelijke route is **gevulde binnendoos → nieuw ontworpen buitendoos → ladingdrager**. De gebruiker kan ook beginnen bij een artikel zonder binnendoos (dat telt dan als binnendoos met 1 stuk, #15) of bij een bestaande buitendoos. De app genereert meerdere geldige verpakkingscombinaties, test die op de gekozen ladingdrager en toont maximaal drie oplossingen, met een vaste 3D-afbeelding en een printbaar PDF-rapport.

V1 rekent met rechthoekige dozen. Er zit één artikelsoort in een buitendoos en op een ladingdrager (#7), en één maat buitendoos per ladingdrager. De buitendoos staat altijd rechtop; op de drager mag hij alleen in het horizontale vlak draaien (#2, #7). De app ontwerpt geen binnendoos: de binnendoosmaat wordt altijd opgegeven (#15, #18).

Buiten V1 vallen: orderaantallen, mengpallets, voorspelling van doossterkte, stabiliteitsgarantie, een draaibare 3D-viewer, een ERP-koppeling (#25), een bibliotheek van standaardbuitendozen (#20) en gebruikersrollen (#24).

## 2. Schermen en gebruikersverloop

1. **Start / gegevensbeheer:** kies een opgeslagen artikel met zijn binnendoos, voer een bestaande buitendoos in, of voer alles handmatig in. Beheer artikelen (met binnendoos) en ladingdragers. Standaarddragers: europallet 1200 × 800 × 140 mm, 25 kg, en blokpallet 1200 × 1000 × 140 mm, 30 kg (hoogte europallet: zie vraag 38). Standaardgrenzen per drager (#16): max. totale hoogte 2100 mm incl. drager, max. totaalgewicht 1000 kg incl. drager, overhang 0 mm per zijde. Alles is aanpasbaar. Nieuwe pallets en karren voegt de gebruiker zelf toe; er zijn geen standaardkarren (#13).
2. **Invoer:** kies instapniveau en drager. Vul afmetingen en gewichten in, de kantelrechten van de binnendoos (#2, #7), het doostype (FEFCO 0201 of custom, #8), de max. totale hoogte incl. drager, het max. totaalgewicht incl. drager (#1), de overhang per zijde, tussenlagen en verpakkingsmateriaal (#12). Er is geen veld voor tolerantie (#3) of productieruimte (#4). Toon direct welke waarden ontbreken of onmogelijk zijn.
3. **Berekenen:** toon voortgang en de gehanteerde invoer. Als geen geldige oplossing bestaat, toon welke limiet of regel de kandidaten uitsluit, met de waarde die nodig zou zijn. Voorbeeld: "Doos 1245 mm lang past alleen met minstens 45 mm overhang achter."
4. **Resultaten:** maximaal drie kaarten met binnendozen per buitendoos, buitendozen en binnendozen per drager, artikelen per drager, gevulde doosgewichten, totale hoogte en totaalgewicht, buitenmaten, overhang per zijde en stapelwijze. Leg uit waarom de voorkeursoptie bovenaan staat (collimodule, 10%-regel of aantal). De gebruiker kan een alternatief kiezen.
5. **Instructie / export:** exporteer de gekozen oplossing als PDF volgens §5. Bij het exporteren kiest de gebruiker Nederlands of Engels (#21).
6. **Excel-import:** importeer per artikel het artikelnummer en lengte, breedte, hoogte en gewicht van de binnendoos (#17). Toon een kolomkoppeling met eenheid per kolom, validatiefouten per rij en een voorbeeld vóór opslaan. Bestaat een artikelnummer al, dan toont het voorbeeld per rij wat verandert; na bevestiging wordt overschreven, anders overgeslagen (#19). Herhaald importeren levert nooit ongemerkt dubbele artikelen op.

**Gebruikers (#24):** V1 heeft één master-account dat alles mag. Er zijn geen rollen.

## 3. Invoervelden en gegevensmodel

Alle lengtes in mm, massa's in kg. Bij ieder berekend resultaat worden de invoerwaarden en gebruikte instellingen als snapshot bewaard, zodat een PDF later te reproduceren is.

| Entiteit | Velden en opties |
|---|---|
| Artikel | Unieke artikelcode, omschrijving (optioneel), aantal artikelen per binnendoos (standaard 1, zie vraag 34). Zonder binnendoos: maat L × B × H en gewicht van het artikel zijn verplicht; het artikel telt als binnendoos met 1 stuk (#15). |
| Binnendoos | Precies één per artikel (vraag 35). Buitenmaat L × B × H en **gevuld** gewicht. Vinkje "kantelbaar" (#2). Niet kantelbaar: alleen H staat verticaal. Kantelbaar: per as aangeven of L, B en/of H verticaal mag staan (#7). Draaien in het horizontale vlak mag altijd. |
| Buitendoos | Doostype FEFCO 0201 of custom (#8). Indeling nL × nB × nH en stand van de binnendoos, binnenmaat, buitenmaat, geschat eigen gewicht, gevuld gewicht, binnendozen per buitendoos. Staat altijd rechtop op de drager. |
| Bestaande buitendoos | Buitenmaat L × B × H en gevuld gewicht; optioneel binnendozen per buitendoos. Of: binnen- en buitenmaat plus eigen gewicht, waarna de app berekent hoeveel binnendozen erin passen. Ook te gebruiken voor binnendozen zonder buitendoos: voer de binnendoos in als bestaande buitendoos (#14). |
| Ladingdrager | Type (pallet of kar), naam, ladingvlak L × B, eigen hoogte, eigen gewicht, max. totaalgewicht incl. drager (#1), max. totale hoogte incl. drager, overhang toegestaan (ja/nee), max. overhang voor/achter/links/rechts, asymmetrie toegestaan (ja/nee). Bij een kar: ladingvlak = binnenmaat, eigen hoogte = vloerhoogte, overhang altijd 0 (#13). |
| Tussenlaag | Geen, karton of hout, na iedere N volledige lagen, afmeting gelijk aan de drager (#12). Standaard karton 5 mm / 2 kg, hout 15 mm / 5 kg, aanpasbaar. |
| Verpakkingsmateriaal | Bodemvel en topvel: optioneel, met dikte en gewicht; tellen mee in hoogte en gewicht. Hoekprofielen en stretchfolie: optioneel, alleen gewicht (#12). |
| Berekening | Instapniveau, bronrecord, alle gekozen instellingen, kandidaatuitslagen, gekozen optie, tijdstip en berekeningsnummer. |

**Standaarden (alle aanpasbaar):**

- Max. gevuld gewicht buitendoos 23 kg (#16).
- Doostype FEFCO 0201, dubbele golf 7 mm, 0,750 kg/m² (#8). Toeslag van binnen- naar buitenmaat: lengte +14 mm, breedte +14 mm, hoogte +28 mm (zie vraag 33).
- Doostype custom: de gebruiker vult de toeslag per as (mm) en de kartonmassa (kg/m²) in (#8).
- Productieruimte 0 mm: de binnenmaat is exact het blok binnendozen (#4).
- Min. en max. buitenmaat: standaard geen grens (#14).
- Voorkeur voor een collimodule-voetafdruk op de europallet; de hoogte telt daarbij niet (#9). Voorlopige definitie in §4.3, vraag 31.
- Eigen gewicht van een niet-standaard drager wordt expliciet ingevoerd.

Bij een bestaande buitendoos verschijnen aantallen binnendozen en artikelen alleen als de inhoud is opgegeven of berekend.

## 4. Rekenregels en afwijzingen

### 4.1 Buitendooskandidaten

- Genereer de toegestane standen van de binnendoos: draaien in het vlak altijd, een andere verticale as alleen volgens de kantelrechten (#2, #7). Een ontworpen buitendoos bevat een blok nL × nB × nH binnendozen in één stand. Er zitten nooit verschillende artikelen in één doos (#7).
- Binnenmaat = exact het blok (productieruimte 0, #4). Buitenmaat = binnenmaat + toeslag per as van het doostype (0201: +14 / +14 / +28 mm).
- Kartonoppervlak FEFCO 0201, op buitenmaten in m: `(2L + 2B + 0,035) × (H + B)`, inclusief flappen en lijmlap. Eigen gewicht = oppervlak × kartonmassa. Dit is een schatting, geen productiegewicht. Voor custom geldt dezelfde formule met de ingevulde kartonmassa.
- Gevuld doosgewicht = binnendozen per doos × gevuld gewicht per binnendoos + geschat eigen gewicht. Verwerp een kandidaat boven het max. gevulde doosgewicht of buiten een ingestelde min./max. buitenmaat.
- Er is geen vaste grens aan het aantal binnendozen; de gewichtslimiet en de ruimte op de drager begrenzen de zoekruimte. 1 × 1 × 1 is een geldige kandidaat.
- Test **iedere** overgebleven kandidaat op de drager. Selecteer niet eerst één "beste" buitendoos.
- Bij een bestaande buitendoos gelden de opgegeven maten en het opgegeven (of berekende) gevulde gewicht. Dezelfde geometrische en gewichtscontrole geldt.

### 4.2 Laag- en palletpatronen

- De buitendoos staat altijd rechtop: zijn voetafdruk is L × B, zijn hoogte H (#2, #7). Probeer per buitendoos beide standen in het vlak en gemengde standen binnen één laag.
- **Recht:** elke laag gelijk, ook bij gemengde standen binnen de laag. **Verband:** elke volgende laag 180° gedraaid, gespiegeld of verschoven, zodat dozen de naden eronder overbruggen (#6). Kan verband niet, dan meldt het resultaat dat.
- **Assenstelsel (#11):** "voor" is een korte zijde van de drager (de 800 mm-zijde bij een europallet); de lengte loopt van voor naar achter. De oorsprong ligt linksvoor.
- **Overhang:** voor iedere doos afzonderlijk blijven de uiterste randen binnen de vier ingestelde maxima. Standaard is de overhang 0 (#16). De lading wordt gecentreerd. Lukt dat niet binnen de maxima en is asymmetrie toegestaan, dan schuift de lading tot elke zijde binnen zijn maximum blijft, bijvoorbeeld voorzijde gelijk en overhang alleen achter. Bij verboden asymmetrie is de overhang links/rechts en voor/achter paarsgewijs gelijk.
- Bereken het aantal **volledige** lagen. Tussenlagen komen na elke N lagen, behalve na de laatste laag. Een topvel komt boven de laatste laag.
- `totale hoogte = hoogte drager + bodemvel + som laaghoogtes + som tussenlagen + topvel`
- `totaalgewicht = gewicht drager + buitendozen × gevuld doosgewicht + tussenlagen + bodemvel + topvel + hoekprofielen + stretchfolie`
- Beide moeten op of onder het maximum liggen (grens inbegrepen).
- Een kandidaat valt af als doosinhoud, plaatsing, hoogte, gewicht, stand of overhang een harde grens overschrijdt. V1 berekent geen draagvlakpercentage, druksterkte of kantelrisico. De instructie garandeert dus niet dat de lading "stabiel" of "veilig voor transport" is.

### 4.3 Rangschikking en top drie

1. **Hoofdmaat:** binnendozen per drager = binnendozen per buitendoos × buitendozen per drager. Artikelen per drager is daarvan afgeleid.
2. **Collimodule (#5, #9), alleen op een europallet:** heeft een geldige oplossing een buitendoos met een collimodule-voetafdruk, dan is de beste modulaire oplossing de winnaar. Dat geldt ook als een niet-modulaire oplossing meer binnendozen per drager geeft. Verband mag dan genegeerd worden: rechte stapeling volstaat en stap 3 vervalt. Voorlopige definitie (vraag 31): buitenmaat L × B gelijk aan 600 × 400, 400 × 300, 300 × 200 of 200 × 150 mm, in beide richtingen, per as hoogstens 10 mm kleiner. De app vult een doos voorlopig niet op tot een modulemaat (vraag 32).
3. **Recht of verband:** zonder modulaire winnaar wordt de beste rechte oplossing vergeleken met de beste verbandoplossing. Levert recht **minstens 10% meer binnendozen per drager** op, dan wint recht; anders wint verband. Formule: `(recht − verband) / verband`; bij precies 10% wint recht. Is maar één soort geldig, dan wint die.
4. **Volgorde van de overige oplossingen:** meer binnendozen per drager, dan meer binnendozen per buitendoos, dan lagere totale hoogte, dan een voetafdruk dichter bij een collimodule (som van de absolute verschillen in L en B tot de dichtstbijzijnde module; hoogte telt niet, #9), dan lager totaalgewicht. Een hogere pallet is geen voordeel op zichzelf.
5. **Top drie:** de winnaar; de beste geldige verbandoplossing, ook als die niet wint; daarna de hoogst gerangschikte **verschillende** configuraties. Verschillend betekent een andere buitenmaat, recht tegenover verband, of een andere stand van de binnendoos. Een ander laagpatroon met dezelfde doos en stapelwijze telt niet als verschillend, ook niet gespiegeld of gedraaid (#10). Toon minder dan drie als er minder unieke geldige opties zijn. Benoem de capaciteitsafweging zichtbaar.

Artikelen per binnendoos is één vaste invoerwaarde. Een variant met hetzelfde aantal binnendozen is daarom geen andere optimalisatie.

## 5. Visuele output en PDF

Het PDF is A4 staand, in het Nederlands of Engels naar keuze (#21). Het gaat vooral naar het eigen magazijn, maar ook naar leveranciers. Het logo van het bedrijf staat in de kop en het artikelnummer staat groot bovenaan. Bestandsnaam voorlopig `<artikelnummer>.pdf` (vraag 34).

**Pagina 1** volgt het aangeleverde voorbeeld (`afbeeldingen/pdf-voorbeeld.png`, #23): drie rijen met links een afbeelding en rechts de gegevens.

| Blok | Afbeelding | Gegevens |
|---|---|---|
| Binnendoos | Getekende binnendoos met maten | Aantal per doos (artikelen per binnendoos), afmeting L × B × H, totaalgewicht (gevuld) |
| Buitendoos | Getekende buitendoos met de binnendozen erin | Totaal aantal dozen (binnendozen per buitendoos), dozen per laag, aantal lagen, afmeting (buitenmaat), totaalgewicht (gevuld) |
| Ladingdrager | Isometrische afbeelding van de complete lading | Totaal aantal dozen (buitendozen per drager), dozen per laag, aantal lagen, afmeting ladingdrager (L × B × totale hoogte), totaalgewicht incl. drager |

**Vervolgpagina's** (voorlopig, vraag 36): een bovenaanzicht van iedere unieke laag met positie en richting van elke doos, welke laagvolgorde zich herhaalt, plaatsing van tussenlagen, bodemvel en topvel, overhang per zijde, de invoer, datum en berekeningsnummer. De 3D-afbeelding toont de volledige drager, dozen en tussenlagen; een ingekleurd referentievlak maakt overhang zichtbaar.

Het geschatte kartongewicht is in het PDF gelabeld als schatting. Alle afbeeldingen komen uit dezelfde coördinaten als de rekenmodule.

## 6. Technische opzet en acceptatievoorbeelden

Een webapp met een opslaglaag voor stamgegevens, een aparte deterministische rekenmodule, een tekenmodule voor isometrische afbeeldingen en een PDF-generator met teksten in NL en EN. Invoer gebeurt op desktop; resultaat en PDF zijn leesbaar op een tablet (#26). Hosting voorlopig in de cloud (vraag 37). Bewaar berekening en gekozen resultaat als snapshots. Log hoeveel kandidaten zijn getest en waarom ze afvallen.

Rekentijd: doel onder 10 seconden (#27). Afkappen gebeurt op een vast aantal kandidaten, niet op kloktijd, zodat dezelfde invoer altijd hetzelfde resultaat geeft. Is de zoekruimte afgekapt, dan meldt de app dat en presenteert de uitkomst als **beste gevonden oplossing**, niet als bewezen optimum.

| Controle | Verwacht resultaat |
|---|---|
| Binnendoos 300 × 200 × 150 mm, H verticaal; kandidaat 2 × 2 × 2; FEFCO 0201 | Binnenmaat 600 × 400 × 300 mm; buitenmaat 614 × 414 × 328 mm. Geen collimodule: 614 × 414 is groter dan 600 × 400. |
| Dezelfde doos; gevulde binnendoos 2 kg | Kartonoppervlak (2 × 0,614 + 2 × 0,414 + 0,035) × (0,328 + 0,414) = 1,552 m²; eigen gewicht 1,164 kg; gevuld 17,16 kg ≤ 23 kg, dus geldig. |
| Drager 1200 × 800 × 140 mm; max. hoogte 2100 mm | Beschikbare ladinghoogte 1960 mm zonder bodemvel, topvel of tussenlagen. |
| Dozen 326 mm hoog; kartonnen tussenlaag (5 mm, 2 kg) na elke 2 lagen | Zonder tussenlagen 6 lagen (1956 mm). Met tussenlagen 5 lagen en 2 tussenlagen: 1640 mm, totale hoogte 1780 mm, 4 kg extra. |
| Verband 100, recht 109 binnendozen | Verband heeft voorkeur; recht kan in de top drie staan. |
| Verband 100, recht 110 binnendozen | Recht heeft voorkeur; verband staat, indien geldig, ook in de top drie. |
| Europallet: modulaire doos 90 binnendozen per drager, niet-modulaire doos 100 | Modulaire doos wint. Op een blokpallet wint de doos met 100. |
| Een doos steekt 1 mm voorbij de ingestelde rechtergrens | Hele kandidaat afgewezen, ook als het totale ladingmiddelpunt binnen de pallet ligt. |
| Artikel 1042794 met standaardinstellingen (overhang 0) | Geen oplossing. Melding: doos van 1245 mm past alleen met minstens 45 mm overhang achter. |
| Praktijkcases (bijlage A) | Per laag exact het aantal uit de praktijk; lagen en totalen volgens bijlage A. |

## 7. Bewust niet in V1

- Fysieke ondersteuning, druksterkte, verbinding van lagen en werkelijk kartongewicht worden niet beoordeeld. Laat een medewerker de uiteindelijke verpakking controleren.
- Geen ERP-koppeling (#25), geen dozenbibliotheek (#20), geen gebruikersrollen (#24), geen binnendoosontwerp (#15).
- Buitendozen worden nooit gekanteld op de drager (#2, #7).

**Bouwvolgorde:** eerst invoer en stamgegevens, dan kandidaatgeneratie en harde checks, daarna laagpatronen en rangschikking, ten slotte afbeeldingen, PDF en Excel-import. De praktijkcases uit bijlage A zijn de acceptatieset.

## 8. Vervolgvragen (ronde 2)

Deze vragen staan ook in de vragenlijst, tabel 8. Tot er een antwoord is, geldt de voorlopige keuze.

| Nr | Onderwerp | Vraag | Voorlopige keuze |
|---|---|---|---|
| 31 | Collimodule-maten | Welke voetafdrukken tellen als collimodule, en hoeveel mag een doos kleiner zijn? Blijft de beste verbandoplossing zichtbaar als alternatief? | 600 × 400, 400 × 300, 300 × 200 en 200 × 150 mm buitenmaat, per as hoogstens 10 mm kleiner, alleen op de europallet. Verband blijft als alternatief zichtbaar. |
| 32 | Opvullen tot modulemaat | Een ontworpen doos komt zelden precies op een modulemaat uit. Mag de app de binnenmaat vergroten (lege ruimte) om een modulemaat te halen? | Nee. |
| 33 | Hoogtetoeslag FEFCO 0201 | In de praktijkcases groeit de hoogte van binnen- naar buitenmaat met 14–20 mm, niet met 28 mm. Blijft +28 mm de standaard? | +28 mm, zoals besloten bij #8. |
| 34 | Excel-kolommen | Wat betekent "artikelnummer voor bestandnaam"? In welke eenheden staan maten en gewicht? Is het gewicht inclusief inhoud? Het aantal artikelen per binnendoos staat niet in de Excel. | Artikelnummer wordt ook de PDF-bestandsnaam. Maten in mm, gewicht in kg, inclusief inhoud. Artikelen per binnendoos standaard 1, handmatig aan te passen. |
| 35 | Eén binnendoos per artikel | Heeft elk artikel precies één binnendoos? | Ja. Een herimport met een andere maat overschrijft na bevestiging. |
| 36 | PDF-opbouw | Is pagina 1 volgens het voorbeeld genoeg, of komen er vervolgpagina's met de opbouw per laag? Zijn de afbeeldingen getekend of foto's? | Pagina 1 volgens het voorbeeld plus vervolgpagina's per laag. Afbeeldingen getekend door de app. |
| 37 | Hosting | Draait de app in de cloud of op het eigen netwerk? | Cloud. |
| 38 | Hoogte europallet | V1.1 rekent met 140 mm; een EPAL-pallet is 144 mm. Bij 2013186 passen 4 lagen precies bij 140 mm (2100 mm), maar niet bij 144 mm. | 140 mm tot er antwoord is. |
| 39 | Praktijkcases | Klopt het dat QTY op het etiket het aantal binnendozen per buitendoos is? Bij 2028463 is dat niet zichtbaar; rekenkundig zijn het er 24. Twee tikfouten zijn gecorrigeerd volgens de etiketten. | QTY = binnendozen per buitendoos; 2028463 = 24. |

## Bijlage A: praktijkcases

Zes pallets uit het magazijn (#28), foto's in `praktijkcases/`. Twee waarden zijn gecorrigeerd volgens het doosetiket (MEAS in cm): bij 1037172 is de hoogte 250 mm (ingevuld: 25), bij 2013186 is de buitendoos 515 × 260 × 490 mm (ingevuld: 515 × 26 × 49).

| Artikel | Binnendoos L × B × H (mm) | Binnendozen per buitendoos (etiket QTY) | Buitendoos L × B × H (mm) | Gevuld gewicht (kg) | Per laag in praktijk | Overhang in praktijk |
|---|---|---|---|---|---|---|
| 1042794 | 1230 × 74 × 83 | 10 | 1245 × 380 × 180 | 18,8 | 2 | Licht, achter |
| 1037172 | 354 × 92 × 115 | 8 | 385 × 362 × 250 | 6,5 | 6 | Geen |
| 2029248 | 1610 × 75 × 76 | 9 | 1625 × 240 × 242 | 16,8 | 3 | Achter |
| 1000466 | 745 × 93 × 85 | 12 | 790 × 380 × 275 | 13,5 | 3 (lagen in verband) | Geen |
| 2013186 | 250 × 251 × 157 | 6 | 515 × 260 × 490 | 17,2 | 6 | Geen |
| 2028463 | 120 × 142 × 122 | niet zichtbaar (24?) | 500 × 295 × 385 | 16,6 | 6 (gemengde laag 4 + 2) | Geen |

**Verwachte uitkomst** via de instap "bestaande buitendoos", europallet 1200 × 800 mm, 25 kg, max. 2100 mm en 1000 kg, geen tussenlagen. Het aantal per laag is met een volledige zoektocht nagerekend en is het maximum.

| Artikel | Benodigde overhang | Per laag | Lagen (pallet 140 mm) | Buitendozen per drager | Totale hoogte | Totaalgewicht | Lagen bij 144 mm |
|---|---|---|---|---|---|---|---|
| 1042794 | 45 mm achter | 2 | 10 | 20 | 1940 mm | 401,0 kg | 10 |
| 1037172 | 0 | 6 | 7 | 42 | 1890 mm | 298,0 kg | 7 |
| 2029248 | 425 mm achter | 3 | 8 | 24 | 2076 mm | 428,2 kg | 8 |
| 1000466 | 0 | 3 | 7 | 21 | 2065 mm | 308,5 kg | 7 |
| 2013186 | 0 | 6 | 4 | 24 | 2100 mm | 437,8 kg | 3 (18 dozen) |
| 2028463 | 0 | 6 (gemengd) | 5 | 30 | 2065 mm | 523,0 kg | 5 |

**Toeslag binnen → buiten in de praktijk** (bij de stand van de binnendozen die het etiketaantal oplevert), als onderbouwing van vraag 33:

| Artikel | Indeling | Blok (mm) | Buitendoos (mm) | Toeslag L / B / H (mm) |
|---|---|---|---|---|
| 1042794 | 1 × 5 × 2 | 1230 × 370 × 166 | 1245 × 380 × 180 | 15 / 10 / 14 |
| 1037172 | 4 × 1 × 2 | 368 × 354 × 230 | 385 × 362 × 250 | 17 / 8 / 20 |
| 2029248 | 1 × 3 × 3 | 1610 × 225 × 228 | 1625 × 240 × 242 | 15 / 15 / 14 |
| 1000466 | 1 × 4 × 3 | 745 × 372 × 255 | 790 × 380 × 275 | 45 / 8 / 20 |
| 2013186 | 2 × 1 × 3 | 500 × 251 × 471 | 515 × 260 × 490 | 15 / 9 / 19 |
| 2028463 | 4 × 2 × 3 | 480 × 284 × 366 | 500 × 295 × 385 | 20 / 11 / 19 |

## Bijlage B: wijzigingen ten opzichte van V1.1

| Onderwerp | V1.1 | V1.2 |
|---|---|---|
| Kantelen | Rechten per niveau, ook voor de buitendoos op de drager; 10%-regel voor gekantelde lagen | Alleen de binnendoos kantelt, per as instelbaar; buitendoos altijd rechtop; kantelregel vervalt |
| Rangschikking | 10%-regel recht/verband; voorkeursmaat 600 × 400 × 500 | Collimodule op europallet wint altijd; daarna 10%-regel; voorkeur voetafdruk, hoogte telt niet |
| Top drie | Winnaar, beste verband, optie met alleen vlak draaien | Winnaar, beste verband, overige verschillende configuraties |
| Buitendoosmaat | Binnenmaat + 0–3 mm productieruimte; +2 × 7 mm per as | Productieruimte 0; FEFCO 0201: +14 / +14 / +28 mm; custom instelbaar |
| Kartongewicht | `2 × (LB + LH + BH)` zonder flappen | FEFCO 0201-vel inclusief flappen en lijmlap |
| Tolerantie | Invoerveld zonder rekenregel | Vervallen |
| Standaardgrenzen | Niet vastgelegd | 2100 mm, 1000 kg, overhang 0, buitendoos 23 kg |
| Assenstelsel en plaatsing | Niet vastgelegd | Voor = korte zijde, oorsprong linksvoor, centreren of verschuiven binnen de overhangmaxima |
| Verpakkingsmateriaal | Alleen tussenlagen | Plus bodemvel, topvel, hoekprofielen en folie |
| Karren | Toe te voegen | Eigen dragertype met binnenmaat en vloerhoogte, overhang 0 |
| Excel-import | Artikel, binnendoosmaten, gewicht, artikelen per binnendoos | Artikelnummer, L, B, H en gewicht binnendoos; overschrijven na bevestiging |
| PDF | Eén rapport met alle gegevens | Pagina 1 volgens voorbeeld, NL/EN, logo en groot artikelnummer; vervolgpagina's per laag |
| Gebruikers en hosting | Niet vastgelegd | Eén master-account; ERP buiten V1 |
| Acceptatie | Zes rekenvoorbeelden | Herberekend met FEFCO 0201, plus zes praktijkcases |
