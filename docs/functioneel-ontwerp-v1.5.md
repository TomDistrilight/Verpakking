# Functioneel ontwerp verpakkingsapp — versie 1.5

**Status:** basis voor de bouw van V1, inclusief de wensen van ronde 3 en 4 · **Datum:** 9 oktober 2026 · **Vorige versies:** 1.1 van 24 september 2026, 1.2 en 1.3 van 8 oktober 2026, 1.4 van 9 oktober 2026

Deze versie verwerkt beide rondes van de vragenlijst "Open vragen verpakkingsapp V1", de wensen van ronde 3 (minimumaantallen per doos en per laag, een vormregel en een overzicht van gekozen oplossingen) en de wensen van ronde 4: standaard minimaal 2 per doos en per laag, dozen tegen de rand van de drager, het PDF standaard in het Nederlands, voorbeeldbestanden voor de Excel-import, kantelen als mogelijkheid in plaats van verplichting, zoeken in het overzicht, rekenen zonder buitendoos, invulvelden op gelijke hoogte en hoekprofielen en stretchfolie in de tekening. Verwijzingen als (#7) slaan op het puntnummer in `besluiten-ronde-1.md` (1–30), `besluiten-ronde-2.md` (31–40), `besluiten-ronde-3.md` (41–48) of `besluiten-ronde-4.md` (49–59). Er staan geen vragen meer open. Bijlage C zet de wijzigingen ten opzichte van V1.4 op een rij.

## 1. Doel en afbakening

De app berekent hoeveel eenheden van één artikel op één ladingdrager passen. De gebruikelijke route is **gevulde binnendoos → nieuw ontworpen buitendoos → ladingdrager**. De gebruiker kan ook beginnen bij een artikel zonder binnendoos (dat telt dan als binnendoos met 1 stuk, #15) of bij een bestaande buitendoos, of de binnendoos zonder buitendoos op de drager zetten (#57). De app genereert meerdere geldige verpakkingscombinaties, test die op de gekozen ladingdrager en toont maximaal drie oplossingen, met een vaste 3D-afbeelding en een printbaar PDF-rapport. Gekozen oplossingen komen in een overzicht, waarin de gebruiker de verwachte levering en de fysieke controle bijhoudt (#45–#48).

V1 rekent met rechthoekige dozen. Er zit één artikelsoort in een buitendoos en op een ladingdrager (#7), en één maat buitendoos per ladingdrager. De buitendoos staat altijd rechtop; op de drager mag hij alleen in het horizontale vlak draaien (#2, #7). Kantelen is een eigenschap van de binnendoos. Kantelbaar betekent dat de app gekantelde standen mag gebruiken, niet dat het moet (#54). De app ontwerpt geen binnendoos: de binnendoosmaat wordt altijd opgegeven (#15, #18). Een ontworpen buitendoos is standaard niet hoger dan breed (#43, #55).

Buiten V1 vallen: orderaantallen, mengpallets, voorspelling van doossterkte, stabiliteitsgarantie, een draaibare 3D-viewer, een ERP-koppeling (#25), een bibliotheek van standaardbuitendozen (#20) en gebruikersrollen (#24).

## 2. Schermen en gebruikersverloop

1. **Start / gegevensbeheer:** kies een opgeslagen artikel met zijn binnendoos, voer een bestaande buitendoos in, of voer alles handmatig in. Beheer artikelen (met binnendoos) en ladingdragers. Standaarddragers: europallet 1200 × 800 × 144 mm, 25 kg (#39), en blokpallet 1200 × 1000 × 140 mm, 30 kg. Standaardgrenzen per drager (#16): max. totale hoogte 2100 mm incl. drager, max. totaalgewicht 1000 kg incl. drager, overhang 0 mm per zijde, asymmetrische overhang toegestaan (#11). Nieuwe pallets en karren voegt de gebruiker zelf toe; er zijn geen standaardkarren (#13).
2. **Invoer:** kies instapniveau en drager. Vul afmetingen en gewichten in, de kantelrechten van de binnendoos (#2, #7), het doostype (FEFCO 0201 of custom, #8), de max. totale hoogte incl. drager, het max. totaalgewicht incl. drager (#1), de overhang per zijde, het min. aantal binnendozen per buitendoos (alleen bij een nieuw ontworpen buitendoos, #41) en het min. aantal buitendozen per laag (#42), tussenlagen (maat: drager of lading, #12) en verpakkingsmateriaal. Beide minimumvelden zijn hele getallen van minstens 1, standaard 2 (#49), en worden voorgevuld met de standaard uit Instellingen. Bij instap binnendoos of artikel kan de gebruiker **Geen buitendoos** aanvinken (standaard uit, #57, §4.1); doostype, max. gevulde buitendoos en min. binnendozen per buitendoos verdwijnen dan van het scherm. Het scherm toont welke vormregel geldt (#43). Er is geen veld voor tolerantie (#3) of productieruimte (#4). Toon direct welke waarden ontbreken of onmogelijk zijn. Invulvelden in een rij staan op gelijke hoogte (#58): loopt een label over twee regels, dan zakken alle invoervakken van die rij even ver mee; een hint onder één veld verschuift de buren niet en vinkjes staan op de hoogte van de invoervakken. Dat geldt voor binnendoos, buitendoos en ladingdrager en ook voor de andere invulschermen.
3. **Berekenen:** toon voortgang en de gehanteerde invoer. Als geen geldige oplossing bestaat, toon per overschreden grens de kleinste aanpassing van alleen die grens waarmee minstens één kandidaat geldig wordt. Overhang wordt genoemd als totaal per richting. Voorbeeld: "Doos van 1245 mm past alleen met minstens 45 mm overhang in de lengte (voor en achter samen)." Strepen een minimumaantal of de vormregel alle kandidaten weg, dan noemt de melding die regel, bijvoorbeeld: "12 binnendozen wegen samen al 24 kg; het maximum per buitendoos is 23 kg." (#41–#43).
4. **Resultaten:** maximaal drie kaarten met binnendozen per buitendoos (met de indeling nL × nB × nH), buitendozen en binnendozen per drager, artikelen per drager, gevulde doosgewichten, totale hoogte en totaalgewicht, buitenmaten, overhang per zijde, stapelwijze en of de binnendoos gekanteld is. Bij geen buitendoos staat dat op de kaart, met binnendozen per laag, de maat op de drager en het gewicht van de gevulde binnendoos (#57). De dozen staan waar mogelijk tegen de rand van de drager (§4.2, #50). Leg uit waarom de voorkeursoptie bovenaan staat (kantelregel, collimodule, 10%-regel, aantal of plattere doos). De gebruiker kan een alternatief kiezen en met **Opslaan in overzicht** de gekozen oplossing in het overzicht zetten (§2.1, #45).
5. **Instructie / export:** exporteer de gekozen oplossing als PDF volgens §5. Het PDF is standaard Nederlands; bij het exporteren kan de gebruiker Engels kiezen (#21, #52). Dat kan ook per regel in het overzicht (§2.1).
6. **Excel-import:** importeer per rij het artikelnummer, lengte, breedte, hoogte en gewicht (inclusief inhoud) van de binnendoos, het aantal artikelen per binnendoos (#17, #35) en eventueel een omschrijving. Een leeg aantal wordt 1. Op dit scherm staat een link naar een voorbeeldbestand, `voorbeeld-artikelen.xlsx` (#53): in rij 1 de koppen A Artikelcode, B Lengte binnendoos (mm), C Breedte binnendoos (mm), D Hoogte binnendoos (mm), E Gewicht binnendoos incl. inhoud (kg), F Aantal artikelen per binnendoos en G Omschrijving, en een tweede werkblad Uitleg. De import herkent die koppen en eenheden zelf; een onaangeroerd voorbeeld levert geen rijen op. Toon een kolomkoppeling met eenheid per kolom, validatiefouten per rij en een voorbeeld vóór opslaan. Het voorbeeld toont ook dat "kantelbaar" uit staat en dat H de hoogte rechtop is. Bestaat een artikelnummer al, dan toont het voorbeeld per rij wat verandert; na bevestiging wordt overschreven, anders overgeslagen (#19). Een herimport verandert de keuze "geen buitendoos" van een bestaand artikel niet (#57). Herhaald importeren levert nooit ongemerkt dubbele artikelen op.
7. **Geschiedenis:** elke berekening met een oplossing staat er met invoer, top drie en zoeklog. Van daaruit maak je het PDF opnieuw, open je de invoer of zet je de oplossing met **Naar overzicht** in het overzicht, met Nederlands als taal (#45, #52).
8. **Overzicht:** alle gekozen oplossingen met hun status; zie §2.1.
9. **Instellingen:** standaardwaarden, waaronder het max. gevulde doosgewicht, de standaard voor beide minimumaantallen (standaard 2, #41, #42, #49), de vormregel (#43), de min. ondersteuning bij uitlijnen (standaard 75%, #51) en de min./max. buitenmaat, plus logo, back-up, terugzetten en wissen (§6). Er is geen standaardtaal voor het PDF meer: Nederlands is altijd de standaard (#52).

**Gebruikers (#24, #38):** V1 gaat uit van één gebruiker die alles mag. Er zijn geen rollen en geen inlog.

### 2.1 Tabblad Overzicht

Het tabblad **Overzicht** toont alle gekozen oplossingen en houdt hun status bij. Iedere gekozen oplossing heeft een eigen regel (#45).

- **Erin zetten (#45):** met **Opslaan in overzicht** op het rekenscherm (de oplossing die de gebruiker gekozen heeft) of met **Naar overzicht** bij een berekening in de geschiedenis. De regel bewaart het berekeningsnummer en een snapshot van invoer en oplossing, zodat het PDF gelijk is aan dat van de berekening. De taal van een nieuwe regel is de taal die bij het PDF in het detailpaneel gekozen is, standaard Nederlands; vanuit de geschiedenis is het Nederlands (#52).
- **Opnieuw kiezen (#48):** heeft het artikel al een open regel (nog niet fysiek gecontroleerd), dan vervangt de nieuwe oplossing die regel; de verwachte leverdatum en de taal blijven staan. Zijn er meer open regels van het artikel (bijvoorbeeld na het uitvinken van een gecontroleerde regel), dan wordt alleen de laatst gekozen open regel vervangen; de andere blijven ongewijzigd staan. Is de bestaande regel al gecontroleerd, dan blijft die staan en komt er een nieuwe regel bij. De app meldt welke van de twee is gebeurd.
- **Kolommen:** artikelnummer (met omschrijving), buitendoos L × B × H met binnendozen per doos (of "geen buitendoos", #57), aantal per drager (binnendozen, of buitendozen bij onbekende inhoud) met drager en stapelwijze, berekeningsnummer met datum van kiezen, verwachte levering, fysiek gecontroleerd, taal en PDF, en de acties invoer openen en regel verwijderen (na bevestiging).
- **Verwachte levering (#46):** een datum per regel, handmatig in te vullen, te wijzigen of te wissen, of in te lezen met de import hieronder. Een datum wordt pas opgeslagen als hij volledig is (jaartal 2000–2199), zodat een regel tijdens het typen niet verspringt in de sortering.
- **Fysiek gecontroleerd (#46):** vinkje, standaard uit. Aanvinken betekent dat de dozen en artikelen geleverd zijn zoals afgesproken met de leverancier en de afdeling inkoop. Een gecontroleerde regel blijft bewaard; opnieuw kiezen en de import veranderen hem niet.
- **Taal en PDF (#45, #52):** per regel kies je Nederlands (standaard) of Engels en exporteer je het PDF van die oplossing (§5). De taal wordt per regel onthouden.
- **Zoeken (#56):** een zoekbalk boven het overzicht toont alleen de regels waarvan het artikelnummer of de omschrijving de zoekterm bevat (ook een deel ervan; hoofdletters maken niet uit). Zoeken werkt samen met sorteren en verbergen. Is er een zoekterm of zijn regels verborgen, dan meldt het overzicht hoeveel regels zichtbaar zijn; zonder treffer staat er "Geen regels gevonden". De zoekterm wordt niet onthouden.
- **Sorteren (#46):** op verwachte levering van vroeg naar laat (standaard; regels zonder datum achteraan, bij gelijke datum op artikelnummer), op artikelnummer, of laatst gekozen eerst.
- **Verbergen (#46):** schakelaar "gecontroleerde oplossingen verbergen", standaard uit. Het overzicht meldt hoeveel regels verborgen zijn. Sortering en schakelaar worden onthouden.
- **Leverdata importeren (#47):** een Excel- (.xlsx) of CSV-bestand met in kolom A het artikelnummer en in kolom B de verwachte leverdatum; bij meer werkbladen kiest de gebruiker het werkblad. Kolom B mag een datumcel zijn (ook met een tijd; de dag in de cel telt), een Excel-serienummer of tekst als dd-mm-jjjj, dd/mm/jjjj, dd.mm.jj of jjjj-mm-dd. Alleen datums van 2000 tot en met 2199 tellen; een los getal als 42 (weeknummer of levertijd in dagen) is een fout, geen datum. Een eerste rij zonder geldige datum in kolom B geldt als kopregel. Na Annuleren of Toepassen kan hetzelfde (verbeterde) bestand opnieuw gekozen worden. De import vult de verwachte levering in of overschrijft die, alleen bij regels van dat artikel die nog niet gecontroleerd zijn. Onbekende artikelnummers worden overgeslagen. De import maakt niets aan: geen artikelen en geen regels. Staat een artikelnummer dubbel in het bestand, dan telt de eerste rij. Vóór het toepassen toont een voorbeeld per rij de status: bijwerken (oude → nieuwe datum), ongewijzigd, al gecontroleerd, niet in overzicht of fout (met reden). Pas na bevestiging wordt de import toegepast. Naast de importknop staat een link naar een voorbeeldbestand, `voorbeeld-leverdata.xlsx` (#53), met in rij 1 de koppen A Artikelcode en B Verwachte leverdatum (datumnotatie dd-mm-jjjj) en een tweede werkblad Uitleg.
- **Opslag:** het overzicht staat in de browser, net als de andere gegevens, en zit in back-up, terugzetten en wissen (§6).

## 3. Invoervelden en gegevensmodel

Alle lengtes in mm, massa's in kg. Bij ieder berekend resultaat worden de invoerwaarden en gebruikte instellingen als snapshot bewaard, zodat een PDF later te reproduceren is.

| Entiteit | Velden en opties |
|---|---|
| Artikel | Unieke artikelcode, omschrijving (optioneel), aantal artikelen per binnendoos (standaard 1; uit de Excel of handmatig, #35). Zonder binnendoos: maat L × B × H en gewicht van het artikel zijn verplicht; het artikel telt als binnendoos met 1 stuk en krijgt dezelfde kantelrechten (#15). Vinkje "geen buitendoos" (standaard uit, #57): de binnendoos, of het artikel zonder binnendoos, gaat zelf op de drager. |
| Binnendoos | Precies één per artikel (#36). Buitenmaat L × B × H, waarbij H de hoogte is als de doos rechtop staat, en **gevuld** gewicht. Vinkje "kantelbaar" (#2), **standaard uit**, ook na Excel-import. Uit: alleen H staat verticaal. Aan: per as aangeven of L en/of B ook verticaal mag staan (#7). Draaien in het horizontale vlak mag altijd. |
| Buitendoos | Doostype FEFCO 0201 of custom (#8). Indeling nL × nB × nH en stand van de binnendoos, binnenmaat, buitenmaat, geschat eigen gewicht, gevuld gewicht, binnendozen per buitendoos. Staat altijd rechtop op de drager. |
| Bestaande buitendoos | Buitenmaat L × B × H en gevuld gewicht; optioneel binnendozen per buitendoos. Of: binnen- en buitenmaat plus eigen gewicht, waarna de app berekent hoeveel binnendozen erin passen. Voor een binnendoos zonder buitendoos is er de optie "geen buitendoos" (#57), die met de kantelrechten van de binnendoos rekent. Invoeren als bestaande buitendoos (#14) kan ook nog; de doos staat dan altijd rechtop. |
| Ladingdrager | Type (pallet of kar), naam, ladingvlak L × B, eigen hoogte, eigen gewicht, max. totaalgewicht incl. drager (#1), max. totale hoogte incl. drager, overhang toegestaan (ja/nee), max. overhang voor/achter/links/rechts, asymmetrie toegestaan (ja/nee, standaard ja). Bij een kar: ladingvlak = binnenmaat, eigen hoogte = vloerhoogte, overhang altijd 0 (#13). Een drager geldt als **europallet** als het type pallet is en het ladingvlak 1200 × 800 mm; naam en eigen hoogte tellen niet mee. |
| Tussenlaag | Geen, karton of hout, na iedere N volledige lagen. Maat: dragermaat (standaard) of ladingmaat, de buitenomtrek van de laag eronder (#12). Standaard karton 5 mm / 2 kg, hout 15 mm / 5 kg, aanpasbaar. |
| Verpakkingsmateriaal | Bodemvel en topvel: optioneel, met dikte en gewicht; tellen mee in hoogte en gewicht. Hoekprofielen en stretchfolie: optioneel, alleen gewicht (#12); de tekening van de lading toont ze (#59, §5). |
| Berekening | Instapniveau, bronrecord, alle gekozen instellingen (ook min. binnendozen per buitendoos, min. buitendozen per laag, vormregel, geen buitendoos en min. ondersteuning bij uitlijnen, #41–#43, #51, #57), kandidaatuitslagen, gekozen optie, tijdstip en berekeningsnummer. |
| Overzichtsregel | Artikelnummer, berekeningsnummer en -datum, snapshot van invoer en gekozen oplossing, tijdstip van kiezen, verwachte leverdatum (optioneel), fysiek gecontroleerd (ja/nee, standaard nee) en taal van het PDF (NL/EN, standaard NL) (#45–#48, #52). |

**Standaarden:**

- Max. gevuld gewicht buitendoos 23 kg, aanpasbaar (#16).
- Doostype FEFCO 0201: dubbele golf 7 mm, 0,750 kg/m², toeslag van binnen- naar buitenmaat lengte +14 mm, breedte +14 mm, hoogte +28 mm (#8, #29). Deze waarden liggen vast; wie andere waarden wil, kiest custom.
- Doostype custom: de gebruiker vult de toeslag per as (mm) en de kartonmassa (kg/m²) in (#8).
- Productieruimte is altijd 0: de binnenmaat is exact het blok binnendozen (#4). Het is geen instelling.
- Min. en max. buitenmaat: aanpasbaar, standaard geen grens (#14).
- Min. binnendozen per buitendoos en min. buitendozen per laag: standaard 2 (#49), de standaard aanpasbaar in Instellingen; per berekening in te vullen op het invoerscherm (#41, #42). Opgeslagen instellingen of een back-up van vóór V1.5 waarin nog de oude standaard 1 staat, krijgen eenmalig 2; een andere waarde blijft staan, en een 1 die de gebruiker daarna zelf kiest ook.
- Vormregel: standaard **breedte**, in Instellingen te zetten op **lengte** of **uit** (#43). Definitie in §4.1.
- Geen buitendoos: standaard uit, per artikel opgeslagen (#57). Definitie in §4.1.
- Min. ondersteuning bij uitlijnen: 75%, in Instellingen in te stellen van 0 tot 100% (#51). Definitie in §4.2.
- Taal van het PDF: Nederlands; Engels per export of per regel in het overzicht (#52).
- Voorkeur voor een collimodule-voetafdruk, alleen op de europallet; de hoogte telt daarbij niet (#9). Definitie in §4.3 (#31).
- Eigen gewicht van een niet-standaard drager wordt expliciet ingevoerd.

Bij een bestaande buitendoos verschijnen aantallen binnendozen en artikelen alleen als de inhoud is opgegeven of berekend.

## 4. Rekenregels en afwijzingen

### 4.1 Buitendooskandidaten

- Genereer de toegestane standen van de binnendoos: rechtop (H verticaal) en draaien in het vlak altijd, L of B verticaal alleen als de binnendoos kantelbaar is en die as is aangevinkt (#2, #7). Een oplossing heet **gekanteld** als de binnendoos met L of B verticaal staat. Kantelbaar betekent dat gekantelde standen mogen meedoen, niet dat ze de voorkeur hebben (#54); de kantelregel in §4.3 beslist.
- Een ontworpen buitendoos bevat een blok nL × nB × nH binnendozen in één stand. Er zitten nooit verschillende artikelen in één doos (#7).
- Binnenmaat = exact het blok (#4). Buitenmaat = binnenmaat + toeslag per as van het doostype (0201: +14 / +14 / +28 mm).
- Kartonoppervlak FEFCO 0201, op buitenmaten in m: `(2L + 2B + 0,035) × (H + B)`, inclusief flappen (B/2 diep) en lijmlap. Hierin is L de langste en B de kortste horizontale buitenmaat; wissel ze zo nodig vóór de berekening. Eigen gewicht = oppervlak × kartonmassa. Dit is een schatting, geen productiegewicht. Voor custom geldt dezelfde formule met de ingevulde kartonmassa.
- Gevuld doosgewicht = binnendozen per doos × gevuld gewicht per binnendoos + geschat eigen gewicht. Verwerp een kandidaat boven het max. gevulde doosgewicht of buiten een ingestelde min./max. buitenmaat.
- **Minimum per doos (#41):** verwerp een ontworpen buitendoos met minder binnendozen (nL × nB × nH) dan het ingevulde min. aantal binnendozen per buitendoos. Bij een bestaande buitendoos geldt dit minimum niet: die doos ligt vast. Bij geen buitendoos geldt het ook niet (#57).
- Er is geen bovengrens aan het aantal binnendozen; de gewichtslimiet en de ruimte op de drager begrenzen de zoekruimte. 1 × 1 × 1 is een geldige kandidaat als het minimum per doos 1 is.
- **Vormregel (#43):** breder en langer gaat voor hoger. Bij de instelling **breedte** (standaard) is een ontworpen buitendoos niet hoger dan zijn breedte, de korte horizontale buitenmaat: H ≤ B. Bij **lengte** geldt H ≤ L, de lange zijde; bij **uit** geldt de regel niet. Gelijk mag. Uitzondering ("tenzij dit niet gaat door de hoogte van de binnendoos"): een doos met precies één laag binnendozen (nH = 1) mag altijd als de binnendoos rechtop staat, ook als hij kantelbaar is; dan komt de hoogte van de binnendoos zelf, en kantelen om de doos lager te maken is niet verplicht (#54, #55). In een gekantelde stand geldt de uitzondering alleen als die stand niet hoger is dan rechtop (de hoogte H van de binnendoos). Een binnendoos op zijn kant of kop die daardoor hoger wordt dan rechtop, valt niet onder de uitzondering; die doos moet dus wel aan de regel voldoen. De regel geldt niet voor een bestaande buitendoos en niet bij geen buitendoos. Omdat de regel kandidaten wegstreept, voldoen de winnaar en de hele top drie eraan.
- Test **iedere** overgebleven kandidaat op de drager. Selecteer niet eerst één "beste" buitendoos.
- Bij een bestaande buitendoos gelden de opgegeven maten en het opgegeven (of berekende) gevulde gewicht. Dezelfde geometrische en gewichtscontrole geldt, en het minimum per laag (§4.2); het minimum per doos en de vormregel gelden niet.
- **Geen buitendoos (#57):** alleen bij instap binnendoos of artikel. De binnendoos zelf is dan de doos op de drager, in elke toegestane stand: rechtop altijd, gekanteld alleen als dat mag. Per stand is er één kandidaat met de maat van de binnendoos (lange horizontale zijde als L), zonder toeslag en zonder karton; het gewicht is het gevulde gewicht van de binnendoos en er zit 1 binnendoos in. Doostype, max. gevulde buitendoos, min. per doos, vormregel en min./max. buitenmaat gelden niet. Het minimum per laag, hoogte, totaalgewicht, overhang, collimodule (op de voetafdruk van de binnendoos), rangschikking en uitlijnen gelden wel. Binnendozen per drager is dan gelijk aan dozen per drager.

### 4.2 Laag- en palletpatronen

- De buitendoos staat altijd rechtop: zijn voetafdruk is L × B, zijn hoogte H (#2, #7). Probeer per buitendoos beide standen in het vlak en gemengde standen binnen één laag.
- **Recht:** elke laag gelijk, ook bij gemengde standen binnen de laag (#6).
- **Verband:** elke volgende laag 180° gedraaid, gespiegeld of verschoven, zodat dozen de naden eronder overbruggen (#6). Toetsbare regel (#34): een laag ligt in verband op de laag eronder als minstens de helft van zijn dozen op twee of meer dozen eronder steunt. Een doos steunt op een doos eronder als hun overlap in beide richtingen minstens 50 mm is. Een laag die na draaien of spiegelen gelijk is aan de laag eronder, telt als recht. Een stapeling is verband als elk opeenvolgend laagpaar in verband ligt. Kan verband niet, dan meldt het resultaat dat.
- **Assenstelsel (#11):** "voor" is een korte zijde van de drager (de 800 mm-zijde bij een europallet); de lengte loopt van voor naar achter. De oorsprong ligt linksvoor.
- **Overhang:** voor iedere doos afzonderlijk blijven de uiterste randen binnen de vier ingestelde maxima. Standaard is de overhang 0 (#16). De lading wordt eerst gecentreerd; na de rangschikking volgt het uitlijnen tegen de rand (hieronder). Lukt centreren niet binnen de maxima en is asymmetrie toegestaan (standaard), dan schuift de lading tot elke zijde binnen zijn maximum blijft, bijvoorbeeld voorzijde gelijk en overhang alleen achter. Bij verboden asymmetrie is de overhang links/rechts en voor/achter paarsgewijs gelijk.
- **Minimum per laag (#42):** elke laag bevat minstens het ingevulde min. aantal buitendozen, ook bij verband, bij een bestaande buitendoos en bij geen buitendoos (dan telt het aantal binnendozen in de laag, #57). Een laagpatroon met minder dozen telt niet mee. Past een doos in geen enkel patroon vaak genoeg in een laag, dan valt hij af.
- Bereken het aantal **volledige** lagen. Tussenlagen komen na elke N lagen, behalve na de laatste laag. Een topvel komt boven de laatste laag.
- `totale hoogte = hoogte drager + bodemvel + som laaghoogtes + som tussenlagen + topvel`
- `totaalgewicht = gewicht drager + buitendozen × gevuld doosgewicht + tussenlagen + bodemvel + topvel + hoekprofielen + stretchfolie`
- Beide moeten op of onder het maximum liggen (grens inbegrepen).
- Een kandidaat valt af als doosinhoud, plaatsing, hoogte, gewicht, stand of overhang een harde grens overschrijdt, of als hij niet voldoet aan een minimumaantal of de vormregel. V1 berekent geen druksterkte of kantelrisico, en een draagvlakpercentage alleen bij het uitlijnen hieronder (#51). De instructie garandeert dus niet dat de lading "stabiel" of "veilig voor transport" is.

**Uitlijnen tegen de rand (#50, #51).** Na de rangschikking (§4.3) zet de app de dozen van de getoonde oplossingen waar mogelijk tegen de randen van de drager, zodat het gewicht gelijker over de drager komt.

- **Schuiven:** per laagpatroon gaat elke doos waarvan het midden links van het midden van de drager ligt (bij een lading die al overhangt: het midden van drager en lading samen) zo ver mogelijk naar links, en elke doos rechts van het midden zo ver mogelijk naar rechts. Een doos op het midden blijft gecentreerd. Zo ver mogelijk betekent: tot de rand, of tot de doos ernaast; dozen houden hun volgorde en overlappen niet. Eerst in de breedte (links/rechts), dan op dezelfde manier in de lengte (voor/achter).
- **Varianten:** de app probeert achtereenvolgens beide richtingen, alleen de breedte en alleen de lengte. De eerste variant die aan de voorwaarden voldoet, wordt gebruikt. Voldoet geen enkele, dan blijft de lading zoals gevonden.
- **Voorwaarden**, voor elke doos ten opzichte van de laag eronder, bij elk laagpaar in de stapeling: (a) de doos rust met minstens het ingestelde deel van zijn grondvlak op de dozen eronder ("Min. ondersteuning bij uitlijnen", standaard 75%), of, als hij vóór het schuiven al minder steun had, gaat hij er niet op achteruit; (b) lag het midden van de doos boven zijn steunvlak (binnen de omtrek van de vlakken waarop hij rust), dan blijft dat zo; (c) een laagpaar dat in verband lag, blijft in verband (#34); (d) de overhang wordt nooit groter: dozen gaan tot de rand van de drager, of tot de bestaande omvang van de lading als die al overhangt; (e) het zwaartepunt van de hele stapel (alle dozen even zwaar) komt niet verder dan 2 mm extra uit het midden van de drager. Zo blijft het gewicht zo gelijk mogelijk verdeeld, ook als een doos net over het midden ligt en daardoor naar één kant zou gaan.
- **Gevolg:** aantallen, totale hoogte en totaalgewicht veranderen niet, dus de rangorde en de top drie ook niet. Resultaten, tekeningen, PDF en de snapshot in geschiedenis en overzicht gebruiken de uitgelijnde posities; de overhang per zijde en de buitenmaat van drager en lading worden opnieuw bepaald.

### 4.3 Rangschikking en top drie

1. **Hoofdmaat:** binnendozen per drager = binnendozen per buitendoos × buitendozen per drager. Artikelen per drager is daarvan afgeleid. Bij een bestaande buitendoos zonder opgegeven of berekende inhoud telt buitendozen per drager als hoofdmaat; de sleutel "meer binnendozen per buitendoos" in stap 5 vervalt dan.
2. **Collimodule en kantelregel (#2, #5, #9, #30, #33, #54).** De **kantelregel** vergelijkt de beste gekantelde met de beste niet-gekantelde oplossing: gekanteld wint alleen bij **minstens 10% meer binnendozen per drager**: `(gekanteld − niet-gekanteld) / niet-gekanteld ≥ 0,10`; bij precies 10% wint gekanteld. Daarna gaan de stappen verder met alleen de gekozen soort; is maar één soort geldig, dan met die soort. De **collimodule** (alleen op een europallet) beperkt de keuze tot de oplossingen met een collimodule-voetafdruk, ook als een niet-modulaire oplossing meer binnendozen per drager geeft. De volgorde: bestaat er een rechtopstaande (niet-gekantelde) modulaire oplossing, dan eerst de collimodule en daarna de kantelregel binnen de modulaire oplossingen, zoals in V1.4. Zijn alle modulaire oplossingen gekanteld, dan eerst de kantelregel en daarna de collimodule binnen de gekozen stand: kantelen mag, maar hoeft niet, dus een gekantelde collimodule-doos wint alleen met minstens 10% meer dan rechtop. De uitleg volgt dezelfde volgorde.
3. **Collimodule, verder (#31, #32):** komt de winnaar uit modulaire oplossingen, dan mag verband genegeerd worden: stap 4 vervalt. Tussen modulaire oplossingen geldt de volgorde van stap 5; bij volledige gelijkheid wint recht. Definitie (#31): buitenmaat L × B gelijk aan 600 × 400, 400 × 300, 300 × 200 of 200 × 150 mm, in beide richtingen, per as hoogstens 10 mm kleiner; de hoogte telt niet (#9). De app vult een doos niet op tot een modulemaat (#32).
4. **Recht of verband:** zonder modulaire winnaar wordt de beste rechte oplossing vergeleken met de beste verbandoplossing. Levert recht **minstens 10% meer binnendozen per drager** op, dan wint recht; anders wint verband. Formule: `(recht − verband) / verband`; bij precies 10% wint recht. Is maar één soort geldig, dan wint die.
5. **Volgorde bij gelijke stand:** meer binnendozen per drager (de hoofdmaat van stap 1), dan meer binnendozen per buitendoos, dan bij dezelfde inhoud de **plattere doos** (#44): de laagste verhouding hoogte / breedte (H / B) van de buitendoos; beslist die, dan zegt de uitleg dat, dan lagere totale hoogte, dan (alleen op een europallet) een voetafdruk dichter bij een collimodule, gemeten als som van de absolute verschillen in L en B tot de dichtstbijzijnde module (hoogte telt niet, #9), dan lager totaalgewicht, dan de kleinste buitenmaat (met L ≥ B; eerst L, dan B, dan H), dan niet-gekanteld vóór gekanteld, dan verband vóór recht (bij een modulaire winnaar recht vóór verband, stap 3), en ten slotte het laagpatroon dat als eerste gevonden wordt in een vaste zoekvolgorde. Zo geeft dezelfde invoer altijd dezelfde volgorde. Een hogere pallet is geen voordeel op zichzelf.
6. **Top drie:** (a) de winnaar; (b) de beste geldige verbandoplossing, als die nog niet getoond is; (c) de beste geldige niet-gekantelde oplossing, als die nog niet getoond is (#5). Vul de overige plaatsen met de hoogst gerangschikte **verschillende** configuraties. Verschillend betekent: een andere buitenmaat, recht tegenover verband, of een gekantelde tegenover een niet-gekantelde binnendoos. Bij dezelfde buitenmaat telt een binnendoos die alleen in het vlak gedraaid is, of een ander laagpatroon met dezelfde stapelwijze, niet als verschillend (#10). Toon minder dan drie als er minder unieke geldige opties zijn. Benoem de capaciteitsafweging zichtbaar.

Artikelen per binnendoos is één vaste invoerwaarde. Een variant met hetzelfde aantal binnendozen is daarom geen andere optimalisatie.

Na de rangschikking worden de getoonde oplossingen uitgelijnd tegen de rand van de drager (§4.2, #50). Dat verandert geen aantallen, hoogte of gewicht, dus de volgorde en de top drie blijven gelijk.

## 5. Visuele output en PDF

Het PDF is één A4-pagina staand (#37), standaard in het Nederlands; Engels kiest de gebruiker bij het exporteren of per regel in het overzicht (#21, #37, #52). Het gaat vooral naar het eigen magazijn, maar ook naar leveranciers. Het logo van het bedrijf staat in de kop en het artikelnummer staat groot bovenaan. Op elke pagina staan klein in de voettekst de datum en het berekeningsnummer. Bestandsnaam `<artikelnummer>.pdf` (#35).

De indeling volgt het aangeleverde voorbeeld (`afbeeldingen/pdf-voorbeeld.png`, #23): drie rijen met links een tekening en rechts de gegevens. Alle tekeningen maakt de app zelf, in de stijl van `afbeeldingen/tekening-voorbeeld.png` (#37): isometrisch, met maatvoering, de buitendoos open met de binnendozen erboven, en de lading met afwisselende kleuren per laag.

| Blok | Afbeelding | Gegevens |
|---|---|---|
| Binnendoos | Getekende binnendoos met maten | Aantal per doos (artikelen per binnendoos), afmeting L × B × H, totaalgewicht (gevuld) |
| Buitendoos | Getekende buitendoos met de binnendozen erin | Totaal aantal dozen (binnendozen per buitendoos), dozen per laag (nL × nB binnendozen), aantal lagen (nH), afmeting (buitenmaat), totaalgewicht (gevuld). Is de indeling onbekend (bestaande buitendoos), dan tonen dozen per laag en aantal lagen een "–" en toont de tekening de doos zonder inhoud. Bij geen buitendoos (#57) staat in plaats van tekening en gegevens "Geen buitendoos: de binnendozen gaan zonder buitendoos direct op de drager." |
| Ladingdrager | Isometrische afbeelding van de complete lading | Totaal aantal dozen (buitendozen per drager), dozen per laag, aantal lagen, afmeting (buitenmaat van drager en lading samen, inclusief overhang, × totale hoogte; bijvoorbeeld 1245 × 800 × 1940 mm), totaalgewicht incl. drager. Bij overhang ook de overhang per zijde. |

**Laagopbouw** (#37: alle informatie op één pagina): onder de drie blokken staat een strook met een bovenaanzicht van iedere unieke laag (positie en richting van elke doos, voorzijde aangegeven), de laagvolgorde, stapelwijze, tussenlagen, bodemvel en topvel en de overhang per zijde. De 3D-tekening toont de volledige drager, dozen en tussenlagen; het palletdek is ingekleurd, zodat overhang zichtbaar is.

**Hoekprofielen en stretchfolie (#59):** staan ze aan, dan toont de 3D-tekening van de lading ze, op het scherm en in het PDF. Vier L-vormige hoekprofielen staan op de staande ribben van de lading, van bodemvel (of palletdek) tot de bovenkant van de lading. De stretchfolie is doorzichtig, zodat de dozen zichtbaar blijven, heeft wikkellijnen en loopt vanaf het palletdek om lading en hoekprofielen heen. Hoogte, maatvoering en bovenaanzichten veranderen niet; in de berekening tellen ze alleen mee in het gewicht (#12). Staan beide uit, dan is de tekening gelijk aan die zonder deze opties.

Het geschatte kartongewicht is in het PDF gelabeld als schatting. Alle afbeeldingen komen uit dezelfde coördinaten als de rekenmodule, na het uitlijnen tegen de rand (§4.2).

## 6. Technische opzet en acceptatievoorbeelden

Een webapp met een opslaglaag voor stamgegevens, een aparte deterministische rekenmodule, een tekenmodule voor isometrische afbeeldingen en een PDF-generator met teksten in NL en EN. Invoer gebeurt op desktop; resultaat en PDF zijn leesbaar op een tablet (#26). De app draait als statische website op GitHub Pages (#38). Alle berekeningen gebeuren in de browser. Stamgegevens, instellingen, berekeningen en het overzicht van gekozen oplossingen staan in de browser (IndexedDB) en zijn te exporteren en importeren als back-upbestand. Terugzetten vervangt ook het overzicht (een back-up van vóór V1.4 geeft een leeg overzicht); wissen wist ook het overzicht (#45). Opgeslagen instellingen en een back-up van vóór V1.5 worden bij het inlezen bijgewerkt: de oude standaard 1 voor de minimumaantallen wordt eenmalig 2 en een opgeslagen standaardtaal vervalt (#49, #52); de instellingen krijgen daarvoor een versienummer. De voorbeeldbestanden voor de import staan als vaste bestanden bij de app (`public/voorbeeld-artikelen.xlsx` en `public/voorbeeld-leverdata.xlsx`, #53). Er is geen inlog; de app gaat uit van één gebruiker (#24). Let op: een GitHub Pages-adres is openbaar bereikbaar, maar de gegevens staan niet in de repository en niet op de server. Bewaar berekening en gekozen resultaat als snapshots. Log hoeveel kandidaten zijn getest en waarom ze afvallen, ook door een minimumaantal of de vormregel.

Rekentijd: doel onder 10 seconden (#27). Afkappen gebeurt op een vast aantal kandidaten, niet op kloktijd, zodat dezelfde invoer altijd hetzelfde resultaat geeft. Is de zoekruimte afgekapt, dan meldt de app dat en presenteert de uitkomst als **beste gevonden oplossing**, niet als bewezen optimum.

| Controle | Verwacht resultaat |
|---|---|
| Binnendoos 300 × 200 × 150 mm, niet kantelbaar; kandidaat 2 × 2 × 2; FEFCO 0201 | Binnenmaat 600 × 400 × 300 mm; buitenmaat 614 × 414 × 328 mm. Geen collimodule: 614 × 414 is groter dan 600 × 400. |
| Dezelfde doos; gevulde binnendoos 2 kg | Kartonoppervlak (2 × 0,614 + 2 × 0,414 + 0,035) × (0,328 + 0,414) = 1,552 m²; eigen gewicht 1,164 kg; gevuld 17,16 kg ≤ 23 kg, dus geldig. |
| Dezelfde doos, ingevoerd als 414 × 614 × 328 mm | L en B worden eerst gewisseld; uitkomst gelijk: 1,552 m². |
| Europallet 1200 × 800 × 144 mm; max. hoogte 2100 mm | Beschikbare ladinghoogte 1956 mm zonder bodemvel, topvel of tussenlagen. |
| Dozen 326 mm hoog op de europallet; kartonnen tussenlaag (5 mm, 2 kg) na elke 2 lagen | Zonder tussenlagen 6 lagen (1956 mm, precies de grens). Met tussenlagen 5 lagen en 2 tussenlagen: 1640 mm, totale hoogte 1784 mm, 4 kg extra. |
| Niet-gekanteld 100, gekanteld 109 binnendozen | Niet-gekanteld wint; gekanteld kan in de top drie staan. |
| Niet-gekanteld 100, gekanteld 110 binnendozen | Gekanteld wint; de beste niet-gekantelde staat ook in de top drie. |
| Verband 100, recht 109 binnendozen | Verband heeft voorkeur; recht kan in de top drie staan. |
| Verband 100, recht 110 binnendozen | Recht heeft voorkeur; verband staat, indien geldig, ook in de top drie. |
| Europallet: modulaire doos 90 binnendozen per drager, niet-modulaire doos 100, beide niet gekanteld | Modulaire doos wint. Op een blokpallet (geen europallet) wint de doos met 100. |
| Europallet: gekantelde collimodule-doos 100 binnendozen per drager, niet-gekantelde niet-modulaire doos 105 | Niet-gekanteld wint: alle modulaire oplossingen zijn gekanteld, dus eerst de kantelregel, en gekanteld geeft geen 10% meer (#54). |
| Europallet: niet-gekantelde collimodule-doos 160 binnendozen per drager (400 × 300), gekantelde niet-modulaire doos 180 | De collimodule-doos wint: er is een rechtopstaande modulaire oplossing, dus eerst de collimodule (#5, #54). |
| Europallet: gekantelde collimodule-doos 111 binnendozen per drager, niet-gekantelde niet-modulaire doos 100 | Gekanteld wint (11% meer); binnen de gekantelde oplossingen gaat de collimodule voor en de uitleg noemt de collimodule (#54). |
| Eigen drager "Pallet 140", type pallet, ladingvlak 1200 × 800 mm, hoogte 140 mm | Telt als europallet; de collimoduleregel geldt. |
| Een doos steekt 1 mm voorbij de ingestelde rechtergrens | Hele kandidaat afgewezen, ook als het totale ladingmiddelpunt binnen de pallet ligt. |
| Praktijkcase 1042794 (bijlage A) via bestaande buitendoos 1245 × 380 × 180 mm, 18,8 kg, standaardinstellingen (overhang 0) | Geen oplossing. Melding: past alleen met minstens 45 mm overhang in de lengte (voor en achter samen). |
| Dezelfde case met max. overhang achter 45 mm, overige zijden 0, asymmetrie toegestaan | 2 per laag, voorzijde gelijk, 45 mm overhang achter. Met max. 44 mm achter: geen oplossing. |
| Praktijkcases (bijlage A) | Per laag exact het aantal uit de praktijk; lagen en totalen volgens bijlage A. |
| Binnendoos 100 × 100 × 50 mm, 0,3 kg, niet kantelbaar; europallet, standaardgrenzen; minimumaantallen 1; vormregel uit | Winnaar 214 × 114 × 978 mm (2 × 1 × 19), 2888 binnendozen per drager. |
| Dezelfde binnendoos, vormregel **breedte** (standaard) | Winnaar 414 × 314 × 278 mm (4 × 3 × 5), 2520 binnendozen per drager. Geen getoonde doos met meer dan één laag binnendozen is hoger dan breed (#43). |
| Dezelfde binnendoos, vormregel **lengte** | Winnaar 714 × 114 × 478 mm (7 × 1 × 9), 2772 binnendozen per drager. |
| Binnendoos 60 × 40 × 120 mm, niet kantelbaar; vormregel breedte; min. binnendozen per buitendoos 1 | Doos 74 × 54 × 148 mm (1 × 1 × 1) is een geldige kandidaat: met één laag binnendozen mag de doos hoger zijn dan breed. Geen kandidaat met twee of meer lagen is hoger dan breed. |
| Twee oplossingen met elk 1200 binnendozen per drager en elk 2 binnendozen per doos: 614 × 414 × 328 mm (1 × 1 × 2) en 814 × 614 × 178 mm (2 × 1 × 1) | 814 × 614 × 178 staat bovenaan: H / B is 0,29 tegen 0,79. Bij dezelfde inhoud gaat de plattere doos voor, en de uitleg zegt dat (#44). |
| Twee oplossingen met elk 1200 binnendozen per drager: 414 × 314 × 278 mm (60 per doos) en 614 × 414 × 128 mm (48 per doos) | 414 × 314 × 278 staat bovenaan: meer binnendozen per doos gaat vóór de vorm, zodat de vormvoorkeur geen kleinere dozen (tot één binnendoos per doos) voortrekt (#44). |
| Binnendoos 400 × 200 × 30 mm, kantelbaar (L en B mogen verticaal); vormregel breedte | Geen ontworpen doos is hoger dan breed, behalve een doos met één laag rechtopstaande binnendozen; een doos met binnendozen op hun kant (bijvoorbeeld 584 × 214 × 428 mm) valt af, want die stand is hoger dan rechtop (#43, #55). |
| Binnendoos 134 × 550 × 553 mm, 1,6 kg, kantelbaar (L en B mogen verticaal); europallet; min. 2 binnendozen per buitendoos en 2 buitendozen per laag; vormregel breedte | Beste rechtop: 684 × 564 × 581 mm (5 × 1 × 1), 2 per laag × 3 lagen = 30 binnendozen per drager. Die doos is hoger dan breed, maar mag: één laag rechtop valt altijd onder de uitzondering (#55). Beste gekanteld: ook 30 (684 × 567 × 578 mm, B verticaal; met alleen L verticaal hoogstens 24); geen 10% meer, dus de winnaar is rechtop, niet gekanteld (#54). Bovenaan staat 1114 × 148 × 581 mm (2 × 1 × 1) in verband met 28, omdat recht met 30 minder dan 10% meer geeft (stap 4); 684 × 564 × 581 staat in de top drie. In V1.4 viel elke rechtopstaande doos af en won een gekantelde doos van 567 × 564 × 564 mm met 24. |
| Binnendoos 300 × 200 × 150 mm, 2 kg, niet kantelbaar; europallet; min. 12 binnendozen per buitendoos | Geen oplossing. Melding: 12 binnendozen wegen samen al 24 kg; het maximum per buitendoos is 23 kg (#41). |
| Dezelfde binnendoos; min. 4 binnendozen per buitendoos, min. 2 buitendozen per laag, vormregel breedte | Winnaar 1014 × 314 × 178 mm (5 × 1 × 1, 5 binnendozen per doos), recht, 2 per laag × 10 lagen = 20 buitendozen en 100 binnendozen per drager. Elke getoonde doos heeft minstens 4 binnendozen en elke laag minstens 2 buitendozen (#41, #42). |
| Bestaande buitendoos 600 × 400 × 300 mm, 10 kg, op de europallet; min. 5 buitendozen per laag | Geen oplossing. Melding: de buitendoos past hoogstens 4 keer in een laag; het minimum is 5 buitendozen per laag (#42). |
| Binnendoos 600 × 400 × 300 mm, 40 kg, niet kantelbaar, **geen buitendoos**; europallet, standaardgrenzen; min. 5 binnendozen per buitendoos, min. 2 per laag, vormregel breedte | Doos op de drager 600 × 400 × 300 mm, collimodule 600 × 400; recht, 4 per laag × 6 lagen = 24 binnendozen per drager; totale hoogte 1944 mm, totaalgewicht 985 kg. 40 kg is meer dan de 23 kg van een gevulde buitendoos, maar die grens geldt hier niet; het minimum per doos en de vormregel ook niet (#57). |
| Dezelfde binnendoos, 10 kg, geen buitendoos; min. 5 per laag | Geen oplossing. Melding: de binnendoos past hoogstens 4 keer in een laag; het minimum is 5 dozen per laag (#42, #57). |
| Praktijkcase 1000466 (bijlage A): bestaande buitendoos 790 × 380 × 275 mm, 13,5 kg, 12 binnendozen per doos; europallet, standaardgrenzen | Verband, 3 per laag × 7 lagen. Laag B, als in afbeelding 2 van ronde 4: doos 1 dwars voorop, dozen 2 en 3 erachter. Vóór het uitlijnen staan dozen 2 en 3 op x 5–385 en 385–765; erna staat doos 2 tegen de linkerrand (x 0–380) en doos 3 tegen de rechterrand (x 420–800). Doos 1 (790 mm breed) blijft gecentreerd (x 5–795) en gaat naar voren (y 0); dozen 2 en 3 gaan naar achteren (y 410–1200). Aantallen (21 buitendozen), totale hoogte 2069 mm en totaalgewicht 308,5 kg blijven gelijk (#50). |
| Onderlaag van 2 × 2 dozen van 380 × 500 mm met vrije ruimte rondom; daarop één doos van 380 × 500 mm, midden over de vier | Uitgelijnd in beide richtingen zou de bovenste doos maar 54% steun houden. De app lijnt daarom alleen in de breedte uit: onderste dozen op x 0 en x 420; de bovenste doos blijft gecentreerd en houdt 89% steun (#51). Met een min. ondersteuning van 100% blijft alles staan. |
| Instellingen nieuw, of opgeslagen van vóór V1.5 met min. 1 binnendoos per buitendoos en 1 buitendoos per laag | Beide minimumaantallen worden 2. Een opgeslagen 3 of 4 blijft staan; een 1 die de gebruiker na de update kiest, blijft ook (#49). |
| Opgeslagen standaardtaal Engels van vóór V1.5 | Vervalt; het PDF staat standaard op Nederlands, ook bij **Naar overzicht** vanuit de geschiedenis (#52). |
| `voorbeeld-artikelen.xlsx` onaangeroerd importeren; daarna met de rijen "A1, 300, 200, 150, 2,5, 4, Kop en schotel" en "B2, 400, 250,5, 120, 1,25, (leeg), (leeg)" | Kolommen A–G worden herkend, in mm en kg; het lege voorbeeld levert geen rijen op. Ingevuld: twee nieuwe artikelen; B2 krijgt 1 artikel per binnendoos (#53). |
| Overzicht met regels voor 1000466 en 2013186; zoekterm "0466" | Alleen de regel van 1000466 is zichtbaar; het overzicht meldt "1 van 2 regels zichtbaar" (#56). |
| Hoekprofielen en stretchfolie aan | De tekening van de lading toont vier hoekprofielen en doorzichtige folie; totale hoogte en maatvoering blijven gelijk, het gewicht telt zoals ingevuld. Beide uit: de tekening is gelijk aan die zonder deze opties (#59). |
| Overzicht: artikel met een open regel (leverdatum 15-10-2026, taal EN); opnieuw een oplossing kiezen | De open regel wordt vervangen; leverdatum 15-10-2026 en taal EN blijven (#48). |
| Overzicht: artikel met alleen een gecontroleerde regel; opnieuw een oplossing kiezen | De gecontroleerde regel blijft; er komt een nieuwe open regel bij zonder leverdatum (#48). |
| Leverdata-import: rij 1 "Artikel, Leverdatum"; rij 2 een artikel met een open en een gecontroleerde regel, 15-10-2026; rij 3 een artikelnummer dat niet in het overzicht staat | Rij 1 is kopregel. De open regel krijgt 15-10-2026; de gecontroleerde regel houdt zijn datum. Rij 3 wordt overgeslagen; er komt geen artikel of regel bij (#47). |

## 7. Bewust niet in V1

- Fysieke ondersteuning, druksterkte, verbinding van lagen en werkelijk kartongewicht worden niet beoordeeld. Alleen bij het uitlijnen tegen de rand toetst de app hoeveel van het grondvlak van een doos op de laag eronder rust (#51); dat is een vlaktoets, geen stabiliteitsberekening. Laat een medewerker de uiteindelijke verpakking controleren.
- Uitlijnen verschuift alleen dozen binnen het gevonden laagpatroon. Het kiest geen ander patroon voor een betere gewichtsverdeling en verandert de aantallen niet (#50).
- Geen ERP-koppeling (#25), geen dozenbibliotheek (#20), geen gebruikersrollen (#24), geen binnendoosontwerp (#15).
- Buitendozen worden nooit gekanteld op de drager (#2, #7).
- Het overzicht bewaart geen historie van statuswijzigingen en is niet gedeeld tussen computers of gebruikers: het staat in de browser, net als de andere gegevens (#38). De leverdata-import maakt geen artikelen of regels aan (#47).

**Bouwvolgorde:** eerst invoer en stamgegevens, dan kandidaatgeneratie en harde checks, daarna laagpatronen en rangschikking, ten slotte afbeeldingen, PDF en Excel-import. Ronde 3 voegt daarna de minimumaantallen en de vormregel in de rekenmodule toe, en het overzicht met leverdata-import. Ronde 4 voegt de nieuwe standaarden, de volgorde kantelregel vóór collimodule, de vormregel per stand, rekenen zonder buitendoos en het uitlijnen tegen de rand toe, en verder het zoeken in het overzicht, de voorbeeldbestanden, de invulvelden op gelijke hoogte en de tekening van hoekprofielen en folie. De praktijkcases uit bijlage A zijn de acceptatieset.

## 8. Besluiten ronde 2

Alle vervolgvragen zijn beantwoord; zie `besluiten-ronde-2.md`. Kort: collimodule-maten zoals voorgesteld (#31), geen opvulling (#32), kantelregel voor de binnendoos (#33), toetsbare verbandregel (#34), Excel met aantal artikelen per binnendoos (#35), één binnendoos per artikel (#36), PDF op één pagina in NL of EN met tekeningen zoals het voorbeeld (#37), hosting op GitHub Pages (#38), europallet 144 mm (#39), praktijkcase 1042794 met QTY 10 (#40).

## 9. Besluiten ronde 3

Drie wensen na het werken met de eerste versie, plus twee verduidelijkende vragen; zie `besluiten-ronde-3.md`. Kort: min. binnendozen per buitendoos (#41) en min. buitendozen per laag (#42), beide standaard 1 (sinds ronde 4: 2, #49); vormregel, standaard niet hoger dan breed, behalve bij één laag binnendozen in de laagste stand (#43; sinds ronde 4 per stand, #55); bij een gelijk aantal per drager en per doos de plattere doos eerst (#44); tabblad Overzicht met taal en PDF per regel (#45); fysiek gecontroleerd, verwachte leverdatum, sorteren en verbergen (#46); leverdata-import uit Excel zonder iets aan te maken (#47); opnieuw kiezen vervangt de open regel (#48).

## 10. Besluiten ronde 4

Negen wensen na het werken met versie 1.4, plus twee verduidelijkende vragen; zie `besluiten-ronde-4.md`. Kort: beide minimumaantallen standaard 2, met eenmalige bijwerking van oude instellingen (#49); dozen na de rangschikking tegen de rand van de drager (#50), zolang elke doos minstens 75% steun houdt, verband verband blijft en de overhang niet groeit (#51); het PDF standaard in het Nederlands, de instelling standaardtaal vervalt (#52); voorbeeldbestanden voor de artikel- en leverdata-import (#53); kantelen mag maar hoeft niet: de kantelregel gaat vóór de collimodule (#54); de uitzondering op de vormregel geldt rechtop altijd en gekanteld alleen als die stand niet hoger is (#55); zoeken in het overzicht (#56); rekenen zonder buitendoos (#57); invulvelden op gelijke hoogte (#58); hoekprofielen en stretchfolie in de tekening (#59).

## Bijlage A: praktijkcases

Zes pallets uit het magazijn (#28), foto's in `praktijkcases/`. Twee waarden zijn gecorrigeerd volgens het doosetiket (MEAS in cm): bij 1037172 is de hoogte 250 mm (ingevuld: 25), bij 2013186 is de buitendoos 515 × 260 × 490 mm (ingevuld: 515 × 26 × 49). Bij 1042794 blijven artikelcode, maten en gewicht zoals opgegeven, met QTY 10 (#40). In vijf cases is het etiketaantal QTY precies nL × nB × nH binnendozen.

| Artikel | Binnendoos L × B × H (mm) | Binnendozen per buitendoos (etiket QTY) | Buitendoos L × B × H (mm) | Gevuld gewicht (kg) | Per laag in praktijk | Overhang in praktijk |
|---|---|---|---|---|---|---|
| 1042794 | 1230 × 74 × 83 | 10 | 1245 × 380 × 180 | 18,8 | 2 | Licht, achter |
| 1037172 | 354 × 92 × 115 | 8 | 385 × 362 × 250 | 6,5 | 6 | Geen |
| 2029248 | 1610 × 75 × 76 | 9 | 1625 × 240 × 242 | 16,8 | 3 | Achter |
| 1000466 | 745 × 93 × 85 | 12 | 790 × 380 × 275 | 13,5 | 3 (lagen in verband) | Geen |
| 2013186 | 250 × 251 × 157 | 6 | 515 × 260 × 490 | 17,2 | 6 | Geen |
| 2028463 | 120 × 142 × 122 | 24 (klein etiket, onscherp) | 500 × 295 × 385 | 16,6 | 6 (gemengde laag 4 + 2) | Geen |

**Verwachte uitkomst.** Instellingen: instap "bestaande buitendoos" met maat en gevuld gewicht uit de tabel; europallet 1200 × 800 × 144 mm, 25 kg; max. 2100 mm en 1000 kg; min. buitendozen per laag 1 (met de standaard 2 uit #49 blijven de uitkomsten gelijk, want elke case heeft minstens 2 per laag); geen tussenlagen, bodemvel, topvel, hoekprofielen of folie. Het minimum per doos en de vormregel gelden niet voor een bestaande buitendoos. Overhang: toegestaan, asymmetrie toegestaan, max. voor, links en rechts 0 mm, max. achter gelijk aan de kolom "Benodigde overhang". Het aantal per laag is met een volledige zoektocht nagerekend en is het maximum onder deze instellingen. Het uitlijnen tegen de rand (#50) verschuift alleen dozen; de getallen hieronder veranderen daardoor niet.

| Artikel | Benodigde overhang | Per laag | Lagen | Buitendozen per drager | Totale hoogte | Totaalgewicht |
|---|---|---|---|---|---|---|
| 1042794 | 45 mm achter | 2 | 10 | 20 | 1944 mm | 401,0 kg |
| 1037172 | 0 | 6 | 7 | 42 | 1894 mm | 298,0 kg |
| 2029248 | 425 mm achter | 3 | 8 | 24 | 2080 mm | 428,2 kg |
| 1000466 | 0 | 3 | 7 | 21 | 2069 mm | 308,5 kg |
| 2013186 | 0 | 6 | 3 | 18 | 1614 mm | 334,6 kg |
| 2028463 | 0 | 6 (gemengd) | 5 | 30 | 2069 mm | 523,0 kg |

Met 1 mm minder overhang achter dan in de tabel hebben 1042794 en 2029248 geen oplossing. Bij 2013186 passen 4 lagen niet: 144 + 4 × 490 = 2104 mm > 2100 mm.

**Toeslag binnen → buiten bij deze leveranciersdozen.** Dit zijn leveranciersdozen, geen FEFCO 0201 in 7 mm dubbele golf; voer zulke dozen in als bestaande buitendoos of als doostype custom. Vooral de hoogtetoeslag valt kleiner uit dan de 0201-regel (14–20 mm tegen +28 mm); in de lengte is de toeslag juist groter (15–45 mm tegen +14 mm). Gevolg: ontwerpt de app de doos van 2013186 zelf (blok 500 × 251 × 471 mm), dan wordt die met +28 mm 499 mm hoog.

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
| Kantelen | Rechten per niveau, ook voor de buitendoos op de drager; 10%-regel voor gekantelde lagen | Alleen de binnendoos kantelt (vinkje, standaard uit, per as instelbaar); buitendoos altijd rechtop; 10%-kantelregel geldt nu voor de binnendoos |
| Rangschikking | 10%-regel recht/verband; voorkeursmaat 600 × 400 × 500 | Collimodule op europallet, dan kantelregel, dan 10%-regel recht/verband; voorkeur voetafdruk, hoogte telt niet; vaste laatste tie-break |
| Top drie | Winnaar, beste verband, optie met alleen vlak draaien | Winnaar, beste verband, beste niet-gekantelde, overige verschillende configuraties |
| Verband | Open punt | Toetsbare regel (#34) |
| Buitendoosmaat | Binnenmaat + 0–3 mm productieruimte; +2 × 7 mm per as | Productieruimte 0; FEFCO 0201: +14 / +14 / +28 mm; custom instelbaar |
| Kartongewicht | `2 × (LB + LH + BH)` zonder flappen | FEFCO 0201-vel inclusief flappen en lijmlap, L ≥ B |
| Tolerantie | Invoerveld zonder rekenregel | Vervallen |
| Standaardgrenzen | Buitendoos 23 kg; verder niet vastgelegd | Plus 2100 mm, 1000 kg, overhang 0, asymmetrie toegestaan |
| Assenstelsel en plaatsing | Niet vastgelegd | Voor = korte zijde, oorsprong linksvoor, centreren of verschuiven binnen de overhangmaxima |
| Europallet | Naam | Type pallet met ladingvlak 1200 × 800 mm |
| Tussenlaag en materiaal | Tussenlaag op dragermaat | Dragermaat of ladingmaat; plus bodemvel, topvel, hoekprofielen en folie |
| Karren | Toe te voegen | Eigen dragertype met binnenmaat en vloerhoogte, overhang 0 |
| Excel-import | Artikel, binnendoosmaten, gewicht, artikelen per binnendoos | Artikelnummer, L, B, H, gewicht binnendoos en artikelen per binnendoos (leeg = 1); overschrijven na bevestiging |
| PDF | Eén rapport met alle gegevens | Eén pagina volgens voorbeeld, NL/EN, logo en groot artikelnummer, tekeningen met maatvoering, laagopbouw, datum en berekeningsnummer in de voettekst |
| Geen oplossing | Welke limiet uitsluit | Plus de kleinste aanpassing per grens |
| Gebruikers en hosting | Niet vastgelegd | Statische app op GitHub Pages, gegevens in de browser met back-up; geen inlog; ERP buiten V1 |
| Acceptatie | Zes rekenvoorbeelden | Herberekend met FEFCO 0201, plus kantel-, europallet- en overhangtests en zes praktijkcases |

## Bijlage C: wijzigingen ten opzichte van V1.4

| Onderwerp | V1.4 | V1.5 |
|---|---|---|
| Minimumaantallen | Min. binnendozen per buitendoos en min. buitendozen per laag standaard 1 | Beide standaard 2; opgeslagen instellingen en back-ups met de oude standaard 1 krijgen eenmalig 2 (#49) |
| Plaats van de dozen | Lading gecentreerd, of verschoven binnen de overhangmaxima | Na de rangschikking dozen van de getoonde oplossingen naar de randen van de drager, eerst in de breedte, dan in de lengte; varianten beide, alleen breedte, alleen lengte, geen (#50) |
| Ondersteuning | Geen draagvlakberekening | Bij het uitlijnen houdt elke doos minstens 75% steun (instelling "Min. ondersteuning bij uitlijnen") of gaat er niet op achteruit; midden blijft boven het steunvlak, verband blijft verband, overhang groeit niet (#51) |
| Taal van het PDF | Keuze bij het exporteren; instelling standaardtaal in Instellingen | Altijd standaard Nederlands; Engels bij het exporteren of per regel in het overzicht; instelling vervallen (#52) |
| Voorbeeldbestanden | Geen | `voorbeeld-artikelen.xlsx` op het scherm Excel-import en `voorbeeld-leverdata.xlsx` in het overzicht, met koppen in rij 1 en een werkblad Uitleg (#53) |
| Kantelregel en collimodule | Collimodule vóór kantelregel; een gekantelde collimodule-doos won altijd | Collimodule vóór kantelregel zolang er een rechtopstaande modulaire oplossing is; zijn alle modulaire oplossingen gekanteld, dan eerst de kantelregel (kantelen mag, maar hoeft niet, #54) |
| Uitzondering op de vormregel | Eén laag binnendozen in de laagste stand | Eén laag rechtop altijd; in een gekantelde stand alleen als die niet hoger is dan rechtop (#55) |
| Zoeken in het overzicht | Niet aanwezig | Zoekbalk op artikelnummer en omschrijving, samen met sorteren en verbergen (#56) |
| Zonder buitendoos | Alleen door de binnendoos als bestaande buitendoos in te voeren (altijd rechtop) | Optie "geen buitendoos" per berekening en per artikel: de binnendoos in elke toegestane stand op de drager; doostype, max. gevulde buitendoos, min. per doos, vormregel en min./max. buitenmaat gelden niet; getoond in resultaten, overzicht, geschiedenis en PDF (#57) |
| Invulvelden | Een label over twee regels duwde zijn invoervak omlaag | Alle invoervakken in een rij op gelijke hoogte (#58) |
| Hoekprofielen en stretchfolie | Alleen in het gewicht | Ook getekend in de 3D-tekening van de lading, op het scherm en in het PDF (#59) |
| Acceptatie | Plus voorbeelden voor minimumaantallen, vormregel, plattere doos, overzicht en leverdata-import | Plus voorbeelden voor de nieuwe standaarden, kantelen en collimodule, de vormregel per stand, geen buitendoos, uitlijnen (1000466), zoeken, voorbeeldbestanden en de tekening |
