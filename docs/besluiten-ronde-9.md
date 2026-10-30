# Besluiten ronde 9 — import overschrijven, kantelen bij een vierkante doos en verband in de buurt van een blok

**Bron:** het bericht van de gebruiker van 28 oktober 2026, na versie 1.9 van het functioneel ontwerp, met vier schermafdrukken. Het bericht is letterlijk overgenomen. De besluiten 69, 70 en 71 zeggen hoe de punten in versie 1.10 van het functioneel ontwerp zijn verwerkt.

## 1. Het bericht (letterlijk)

**Punt 1**

> Bij het overschrijven van artikelen bij importeren van excle word niet alles meegenomen. Zo wordt de omschrijving niet overschreven of toegevoegd als deze leeg is. Ook wordt niet meegenomen of het kantelbaar is. Ook worden de afmetingen en gewichten niet overschreven.

**Punt 2**

> In het geval van een vierkante doos is de doos kantelen geen geldig alternatief. afbeelding 1 hoort hierbij.

**Punt 3**

> Dit soort verband stapeling tellen niet. Dit is niet goed. Dit is verband stapelen omdat het verband stapelen is. Deze manier van verband stapelen zal nooit gekozen worden. afbeelding 2,3 en 4 horen hierbij. Verband stapelen is geldig als het in de buurt zit van een blok.

**De afbeeldingen.** Afbeelding 1: binnendoos 134 × 550 × 550 mm, kantelbaar; in de top drie staat een kaart "gekanteld" met precies dezelfde buitendoos als de winnaar. Afbeelding 2: binnendoos 600 × 400 × 200 mm; buitendoos 614 × 414 × 828 mm, twee dozen per laag, waarbij de tweede laag een L vormt (een doos dwars, een doos langs). Afbeelding 3: binnendoos 600 × 250 × 200 mm; een verband waarin de lagen een zigzag vormen met grote open stukken aan de rand. Afbeelding 4: binnendoos 400 × 250 × 150 mm, 5 kg; zeven dozen per laag met een open hoek.

Er zijn geen verduidelijkende vragen gesteld. De keuzes die het bericht openlaat (vooral wat "in de buurt van een blok" precies betekent) zijn hieronder gemaakt, gemeten (§6) en in Instellingen aan te passen.

## 2. Besluiten

| Nr | Onderwerp | Bron | Gevolg in V1.10 |
|---|---|---|---|
| 69 | Import: een rij met Kantelbaar ja en lege askolommen overschrijft alles | Punt 1 | De oorzaak was geen fout in het overschrijven zelf: in het voorbeeldbestand staan de kolommen Kantelbaar, L mag verticaal en B mag verticaal. Kantelbaar ja met lege askolommen gaf in V1.9 de fout "Kantelbaar is ja, maar L en B mogen geen van beide verticaal staan.", en een rij met een fout wordt helemaal niet geïmporteerd. Daardoor bleven omschrijving, maten, gewicht en kantelrechten van het bestaande artikel staan. Nu: bij **Kantelbaar ja** mag een as verticaal, behalve als er bij die as uitdrukkelijk nee staat; een lege cel of een ontbrekende kolom is dan ja. Is **Kantelbaar leeg**, dan maakt ja bij L of B de doos kantelbaar voor alleen die as(sen); anders is de doos niet kantelbaar. Bij **Kantelbaar nee** blijft ja bij een as een fout. Een uitdrukkelijke tegenspraak (Kantelbaar ja met nee bij L en bij B) blijft ook een fout. Het importscherm waarschuwt boven de samenvatting als er rijen met een fout zijn: "1 rij heeft een fout en wordt niet geïmporteerd, ook niet als het artikel al bestaat. De fout staat bij Details." |
| 70 | Kantelen bij een "vierkante" doos is geen alternatief | Punt 2 | Een gekantelde stand met precies dezelfde maten als rechtop, of als een eerder gekantelde stand, telt niet. Bij een binnendoos met twee gelijke maten (134 × 550 × 550 mm) is "B verticaal" dezelfde doos als rechtop; bij L = B zijn "L verticaal" en "B verticaal" dezelfde gekantelde doos; een kubus heeft maar één stand. Zo komt er geen kaart "gekanteld" meer met dezelfde doos als de winnaar, en noemt de uitleg geen kantelkeuze die er niet is. |
| 71 | Verband telt alleen als het in de buurt van een blok zit | Punt 3 | Bovenop de regel van #34 (minstens de helft van de dozen op twee of meer dozen eronder) geldt voor elk verbandpaar: (a) **elke doos** rust voor minstens de min. ondersteuning (standaard 75%) van zijn grondvlak op de laag eronder, in elk laagpaar van de stapel; (b) **geen laag laat aan de rand van het blok meer dan de max. inham leeg** (standaard 5% van het blok). Het blok is de buitenomtrek van beide lagen samen. Lege ruimte die aan de rand van het blok uitkomt, telt als inham; een holte binnenin, helemaal omsloten door dozen, telt niet. Een paar dat niet aan (a) en (b) voldoet, doet niet mee; staat er dan geen verband meer, dan staat de lading recht met de uitleg "Geen verband gevonden dat in de buurt van een blok zit; de lading staat recht." Nieuwe instelling "Max. inham per laag bij verband" (standaard 5%, 0 tot 100%). |

## 3. Uitwerking van besluit 69

**Wat er misging.** Het voorbeeldbestand `voorbeeld-artikelen.xlsx` heeft sinds ronde 8 de kolommen H (Kantelbaar), I (L mag verticaal) en J (B mag verticaal). Wie alleen Kantelbaar invulde, kreeg in V1.9 een fout op die rij, want een lege askolom telde als nee. Een rij met een fout wordt niet geïmporteerd (zo verandert er nooit iets stilzwijgend), dus ook omschrijving, maten, gewicht en aantal van een bestaand artikel bleven ongewijzigd. De fout stond alleen bij Details van de rij; de samenvatting telde de rij wel als fout, maar zei niet wat dat betekende.

**De nieuwe regels.**

| Kantelbaar | L mag verticaal | B mag verticaal | Uitkomst |
|---|---|---|---|
| ja | leeg of geen kolom | leeg of geen kolom | kantelbaar, L en B verticaal |
| ja | ja of leeg | nee | kantelbaar, alleen L verticaal |
| ja | nee | ja of leeg | kantelbaar, alleen B verticaal |
| ja | nee | nee | fout: "Kantelbaar is ja, maar L en B mogen geen van beide verticaal staan." |
| nee | ja (bij L of B) | | fout: "L mag verticaal is ja, maar Kantelbaar is nee." (of B) |
| nee | nee of leeg | nee of leeg | niet kantelbaar |
| leeg | ja | leeg of nee | kantelbaar, alleen L verticaal |
| leeg | leeg of nee | ja | kantelbaar, alleen B verticaal |
| leeg | ja | ja | kantelbaar, L en B verticaal |
| leeg | leeg of nee | leeg of nee | niet kantelbaar |

Zonder kolom Kantelbaar verandert er niets ten opzichte van V1.9: een nieuw artikel is niet kantelbaar, een bestaand artikel houdt zijn kantelrechten, en het scherm waarschuwt dat de askolommen niet meetellen. Een andere waarde dan ja of nee blijft een fout.

**Overschrijven.** Met de rij uit het voorbeeldbestand (Kantelbaar ja, askolommen leeg) is een bestaand artikel nu "gewijzigd", met in het voorbeeld onder andere "Lengte: 300 → 310 mm", "Gewicht: 2 → 2.5 kg", "Omschrijving: "" → "Nieuw"" en "Kantelbaar: nee → ja (L en B verticaal)". Na bevestiging worden omschrijving, maten, gewicht, aantal en kantelrechten overschreven (#19). Een lege cel bij Omschrijving in een Excel-bestand laat een bestaande omschrijving staan, zoals in V1.9. In de lijst met wijzigingen staat achter een aantal zonder eenheid geen losse spatie meer ("Artikelen per binnendoos: 2 → 3").

**Scherm en voorbeeldbestand.** De hint onder de kolomkoppeling legt de nieuwe regels uit. Boven de samenvatting staat de waarschuwing over rijen met een fout (besluit 69). Het werkblad Uitleg van `voorbeeld-artikelen.xlsx` beschrijft de kolommen H, I en J opnieuw.

## 4. Uitwerking van besluit 70

De app maakt per binnendoos de toegestane standen: rechtop, en L of B verticaal als de doos kantelbaar is en die as mag (#2, #7). Een stand bestaat uit de verticale maat en de twee horizontale maten; draaien in het vlak mag altijd. Een gekantelde stand waarvan de hoogte en de twee horizontale maten (los van de volgorde) gelijk zijn aan die van rechtop of van een eerder gemaakte stand, valt weg. Bij een bestaande buitendoos zonder binnendoos deed de app dit al (#64); nu ook bij de binnendoos.

Afbeelding 1 (134 × 550 × 550 mm, L en B verticaal toegestaan): rechtop staat 550 mm verticaal met 134 × 550 mm in het vlak; met B verticaal precies hetzelfde. Die stand valt weg; L verticaal (134 mm hoog, 550 × 550 mm in het vlak) blijft. Met alleen B verticaal toegestaan is er geen gekantelde stand meer: geen kaart "niet gekanteld" en geen uitleg over de kantelregel.

## 5. Uitwerking van besluit 71

**Waarom een extra regel.** De regel van #34 kijkt alleen of genoeg dozen een naad overbruggen. Afbeelding 2 haalt die regel: in een laag van twee dozen staat één doos dwars over de twee dozen eronder. Maar de lagen vormen geen blok: de tweede laag is een L met een open hoek van ruim 29% van het blok, en de dwarse doos rust maar voor een deel op de laag eronder. Afbeelding 3 en 4 laten hetzelfde zien met meer dozen: zigzaglagen en open hoeken aan de rand. Zulk verband koos de app omdat het evenveel of bijna evenveel dozen gaf als recht (verband wint tot 10% minder, §4.3 stap 4).

**De regel.** Een paar van laag A en laag B is pas een geldig verbandpaar als, naast #34:

- **(a) Elke doos genoeg steun.** Elke doos van laag B rust voor minstens de min. ondersteuning van zijn grondvlak op de dozen van laag A; vanaf drie lagen ook elke doos van A op B. Tot V1.9 was de min. ondersteuning bij de keuze van het verbandpaar alleen een voorkeur (#60, stap 4): een paar waarin een doos minder steun had, kon nog winnen als er geen beter paar was. Nu is het een harde grens. De instelling heet "Min. ondersteuning bij verband" (was "Min. ondersteuning bij uitlijnen") en geldt ook bij het uitlijnen (#51). Bij 0% vervalt deze toets.
- **(b) Weinig inham.** Het blok is de buitenomtrek van laag A en laag B samen, zoals ze op de drager staan. Per laag telt de app de lege ruimte in het blok die met de rand van het blok verbonden is: de inham. Is die bij een van beide lagen groter dan de max. inham (standaard 5% van de oppervlakte van het blok), dan valt het paar af. Een holte binnenin die helemaal door dozen is omsloten, telt niet: dan is de buitenkant van de laag dicht. Bij 100% vervalt deze toets.

Zo blijft verband "in de buurt van een blok": van buiten een gesloten blok, of een blok met hoogstens een kleine inham, en elke doos goed ondersteund. Gespiegelde lagen, het vijfblokspatroon en de rangorde van #60 en #63 blijven; ze kiezen nu alleen uit paren die aan de regel voldoen. Omdat elke doos de min. ondersteuning haalt, beslist stap 4 van die rangorde (de steun van de slechtst gesteunde doos tot de min. ondersteuning) niet meer.

**Waarom deze maten.** De standaard van 5% kwam uit het nameten van de afbeeldingen en een reeks andere verbandpatronen. Verbandpatronen die als goed gelden, hebben geen inham of alleen een smalle strook langs de rand (de restruimte van het patroon): 1046693 1,0%, 1000466 2,6%, 414 × 314 mm en 592 × 295 mm op de europallet 0% en 0,2%; daarin rust elke doos voor minstens 94% op de laag eronder. De verbandpatronen van de afbeeldingen hadden in V1.9 een inham van 19,5% (afbeelding 2), 10,4% (afbeelding 3) en 11,5% (afbeelding 4), en een doos die maar voor 67%, 42% en 36% op de laag eronder rustte. Een lagere max. inham wijst ook smalle restranden af, een hogere laat weer open hoeken toe. Wie strenger of ruimer wil, past de waarde in Instellingen aan.

**Wanneer de toets plaatsvindt.** De app toetst de paren bij het zoeken naar verband, vóór de rangschikking en vóór het uitlijnen. Het uitlijnen (#50, #51) houdt elke doos op minstens de min. ondersteuning en houdt een paar in verband, maar schuift dozen tegen de rand van het blok. Daarbij kan een holte binnenin via een smalle spleet met de rand verbonden raken. Gemeten (§6) gebeurde dat alleen bij buitendozen van 464 × 214 mm op de europallet (7 + 7 dozen): het uitlijnen vult daar een strook van 36 mm aan de rand op en zet die strook binnen in het blok, tegen een holte van 250 × 286 mm. De buitenkant van het blok wordt daar niet slechter van; de app laat dit zo.

**Uitleg.** Staat de lading recht omdat er geen verband meedoet, en lag er bij het zoeken wel een paar in verband (#34) dat niet aan (a) of (b) voldeed, dan zegt de uitleg bij de winnaar: "Geen verband gevonden dat in de buurt van een blok zit; de lading staat recht." Anders blijft het "Geen geldig verband gevonden; de lading staat recht."

**Instellingen.** In Instellingen staan de twee waarden samen onder "Verband: in de buurt van een blok": "Min. ondersteuning bij verband" (standaard 75%) en "Max. inham per laag bij verband" (standaard 5%, met de hint dat het blok de buitenomtrek van de lading is en een holte binnenin niet telt). Een waarde buiten 0 tot 100% geeft de melding "De max. inham per laag bij verband moet tussen 0 en 100% liggen." Opgeslagen instellingen zonder deze waarde krijgen 5%. Een opgeslagen berekening bewaart de waarde bij de invoer, met de gekozen oplossing; een berekening van vóór V1.10 houdt haar opgeslagen oplossing.

**De voorbeelden van de gebruiker.**

| Binnendoos | V1.9 | V1.10 |
|---|---|---|
| 600 × 400 × 200 mm, 2 kg (afbeelding 2) | verband, buitendoos 614 × 414 × 828 mm, tweede laag een L | recht, buitendoos 614 × 414 × 628 mm, 18 binnendozen per drager |
| 600 × 250 × 200 mm, 2 kg (afbeelding 3) | verband in zigzag | recht, buitendoos 614 × 264 × 428 mm, 40 binnendozen per drager |
| 400 × 250 × 150 mm, 5 kg (afbeelding 4) | verband, zeven dozen per laag met een open hoek | recht, buitendoos 414 × 264 × 478 mm, 84 binnendozen per drager |
| 134 × 550 × 550 mm, 2,2 kg, L en B verticaal (afbeelding 1) | kaart "gekanteld" met dezelfde doos | recht, buitendoos 684 × 564 × 578 mm, 30 binnendozen per drager; geen kaart met dezelfde doos |

Bij de eerste drie zegt de uitleg nu "Geen verband gevonden dat in de buurt van een blok zit; de lading staat recht."

## 6. Metingen bij besluit 71

**Opzet.** De rekenmodule van V1.9 en die van V1.10 zijn naast elkaar gedraaid, met de standaardinstellingen van de app (vormregel zacht, min. 2 per doos en per laag, min. ondersteuning 75%, max. inham 5%). Binnendozen: lengte 100, 150, 200, 250, 300 en 400 mm, breedte 80, 100, 150, 200 en 250 mm (niet langer dan de lengte), hoogte 50, 75, 100, 150, 200 en 300 mm, niet kantelbaar. Op de europallet bij 0,3, 1, 2,5 en 5 kg: 576 invoeren; op de blokpallet bij 1 en 2,5 kg: 288 invoeren. Daarnaast kantelbaar (L en B verticaal) op de europallet: lengte 150 tot 400 mm, breedte 100 tot 250 mm, hoogte 50, 100, 150 en 250 mm, bij 0,5, 2 en 5 kg: 204 invoeren.

| | Europallet (576) | Blokpallet (288) | Europallet, kantelbaar (204) |
|---|---|---|---|
| Winnaar verband in V1.9 | 544 | 283 | 185 |
| Waarvan niet in de buurt van een blok | 248 (46%) | 121 (43%) | 73 (39%) |
| Winnaar verband / recht in V1.10 | 451 / 125 | 254 / 34 | 166 / 38 |
| Minder / meer / gelijk per drager | 87 / 35 / 454 | 38 / 11 / 239 | 33 / 0 / 171 |
| Verlies waar minder | gem. 3,3%, max. 6,7% | gem. 2,1%, max. 6,2% | gem. 4,2%, max. 6,7% |
| Hetzelfde aantal, andere oplossing | 109 | 69 | 37 |
| Alle binnendozen samen | 193.726 → 193.757 (+0,02%) | 110.361 → 109.982 (−0,34%) | 55.433 → 55.175 (−0,47%) |

**Lezen.** Bijna de helft van de verbandwinnaars van V1.9 zat niet in de buurt van een blok. Waar de app nu een ander verband kiest of recht, kost dat hoogstens 6,7% binnendozen per drager, gemiddeld 2 tot 4%; dat kan niet meer zijn dan 10%, want bij meer verschil won recht al (§4.3 stap 4). Waar het meer geeft, won in V1.9 verband met minder dozen dan recht (binnen 10%); valt dat verband weg, dan wint recht met meer. Over alle invoeren samen blijft het aantal binnendozen nagenoeg gelijk.

**Grootste verschillen.** Binnendoos 250 × 200 × 200 mm op de europallet: V1.9 verband 614 × 264 × 228 mm, 5 + 5 dozen per laag, 120 binnendozen; V1.10 verband 514 × 214 × 228 mm, 7 + 7, 112 (−6,7%). Op de blokpallet 200 × 100 × 100 mm, 1 kg: V1.9 verband 414 × 314 × 228 mm, 768; V1.10 verband 814 × 314 × 128 mm, 720 (−6,2%).

**Rekentijd.** De bloktoets kost per paar een kleine rekensom, maar er blijven minder paren over om te vergelijken. Gemeten met vier berekeningen tegelijk: europallet gemiddeld 80 → 63 ms (langste 1,1 → 0,9 s), blokpallet 175 → 133 ms (langste 1,5 → 1,2 s), kantelbaar 97 → 76 ms. De app wordt dus niet trager.

**Na het uitlijnen.** In 15 van de 1068 invoeren (alle met een buitendoos van 464 × 214 mm, §5) heeft een getoonde verbandoplossing na het uitlijnen een inham boven 5%, door de spleet van 36 mm naar een holte binnenin. Vóór het uitlijnen voldoen alle getoonde verbandoplossingen aan de regel.

## 7. Gevolgen voor eerdere besluiten

- **#34 (regel voor verband):** blijft, met de twee extra voorwaarden van besluit 71.
- **#51 (min. ondersteuning bij uitlijnen):** dezelfde instelling, nu "Min. ondersteuning bij verband"; bij het uitlijnen verandert er niets.
- **#60 (keuze van het verbandpaar):** de rangorde blijft; stap 4 (steun tot de min. ondersteuning) beslist niet meer, omdat elk paar die haalt. Het paar voor precies twee lagen moet alleen voor B op A aan (a) voldoen, en aan (b).
- **#63 (gespiegeld):** blijft. Gemeten op 375 voorraden laagpatronen is van de 195 gekozen tweezijdige paren er nu 193 gespiegeld (in V1.9: 242 van 350): veel niet-gespiegelde paren hadden een inham.
- **#65 (vijfblokspatroon):** blijft; de varianten doen mee als ze aan de regel voldoen.
- **#68 (kantelbaar in de import):** aangepast door besluit 69: een lege askolom is bij Kantelbaar ja niet meer nee, maar ja.
- **Tests:** waar een test een voorbeeld gebruikte dat niet meer in de buurt van een blok zit, staat nu een ander voorbeeld met dezelfde bedoeling, met in de test de reden ("Ronde 9: …"). Tests die alleen de rangorde toetsen met kunstmatige stroken, rekenen met de toets uit (max. inham 100%) of met een lagere min. ondersteuning, omdat ze over de volgorde gaan en niet over de vorm.
