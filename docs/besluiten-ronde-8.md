# Besluiten ronde 8 — akkoord met het advies over de vormregel, plus twee punten

**Bron:** het bericht van de gebruiker van 16 oktober 2026, na versie 1.8 van het functioneel ontwerp. Het is het antwoord op een advies over de vormregel: de regel dat een ontworpen buitendoos niet hoger is dan breed (#43, #55). De gebruiker gaat akkoord met het voorstel uit dat advies en geeft twee extra punten. Het bericht is letterlijk overgenomen; het advies is samengevat. De besluiten 66, 67 en 68 zeggen hoe alles in versie 1.9 van het functioneel ontwerp is verwerkt.

## 1. Het bericht (letterlijk)

> Eens met het voorstel daarnaast nog 2 punten menemen.

**Punt 1**

> Ik heb een fout gemaakt.
>
> Ik had aangegeven dat min artikelen per binnendoos bij artikel en binnendoos moet staan maar dat klopt niet. Dat moet artikelen per binnendoos zijn.

**Punt 2**

> Kantelbaar toevoegen in de excel voor producten importeren

## 2. Verduidelijkende vragen

Na versie 1.8 kreeg de gebruiker een advies over de vormregel, met drie vragen. Vragen en voorstel zijn hieronder samengevat; het antwoord is letterlijk. Met de standaardvormregel van V1.8 (breedte) valt elke ontworpen buitendoos af die hoger is dan breed, behalve bij één laag binnendozen (#43, #55). Ook als een hogere doos duidelijk meer binnendozen op de drager geeft.

| Nr | Onderwerp | Vraag (samengevat) | Voorstel | Antwoord |
|---|---|---|---|---|
| V1 | Drempel | Wanneer mag een doos winnen die hoger is dan breed? | Alleen als die minstens 10% meer binnendozen per drager geeft dan de beste doos die niet hoger is dan breed, net als de kantelregel. Dit geldt voor dozen met meer dan één laag binnendozen. | "Eens met het voorstel": 10%. |
| V2 | Grens | Hoe hoog mag zo'n doos worden? | Nooit hoger dan 2 × de breedte. Eén laag binnendozen mag altijd, zoals nu. | "Eens met het voorstel": 2 × de breedte. |
| V3 | Top drie | Hoe kan de gebruiker toch een platte doos kiezen? | Wint een doos die hoger is dan breed, dan staat de beste doos die niet hoger is dan breed als vaste kaart in de top drie, zoals de kaart "niet gekanteld". | "Eens met het voorstel" |

Het advies gaf ook een meting: 576 binnendozen op een europallet, met de standaardinstellingen van de app. Met het voorstel kwam er in 32% van de invoeren meer op de drager, gemiddeld 16,5% meer waar het meer was. Nergens kwam er minder, en bij hetzelfde aantal koos de app nooit een hogere doos. Een gewone grens zonder drempel van 10% kiest bij hetzelfde aantal wel vaak een hogere doos, omdat de volgorde meer binnendozen per doos vóór de plattere doos zet (#44). Door de stap recht of verband (10%) kan zo'n grens zelfs minder geven.

Over punt 1 en punt 2 zijn geen vragen gesteld. De keuzes die ze openlaten, zijn in de besluiten 67 en 68 gemaakt.

## 3. Besluiten

| Nr | Onderwerp | Bron | Gevolg in V1.9 |
|---|---|---|---|
| 66 | Vormregel zacht: hoger dan breed alleen bij minstens 10% meer | Voorstel, V1–V3 | Nieuwe stand van de vormregel en de nieuwe standaard: **zacht**, in Instellingen "Hoger dan breed alleen bij minstens 10% meer". Een ontworpen buitendoos mag hoger zijn dan zijn breedte, maar nooit hoger dan de **max. hoogte**: 2 × de breedte, in Instellingen aan te passen (minstens 1). Zo'n doos is **hoger dan breed**. Ze doet alleen mee als ze minstens 10% meer binnendozen per drager geeft dan de **platte voorkeursoptie**: de oplossing die de app kiest als alleen de dozen meedoen die niet hoger zijn dan breed. Dat is de uitkomst van de oude instelling breedte (§4). Wint daarna toch geen hogere doos, bijvoorbeeld omdat een collimodule-doos voorgaat, dan blijft de platte voorkeursoptie. Zo geeft zacht precies de uitkomst van breedte, tenzij een hogere doos wint. Eén laag binnendozen rechtop, of gekanteld en niet hoger dan rechtop, mag altijd en is nooit hoger dan breed (#55). Wint een doos die hoger is dan breed, dan staat de platte voorkeursoptie in de top drie: als vaste kaart "Niet hoger dan breed", of al als andere kaart. Alleen als er al drie vaste kaarten staan, kan ze ontbreken (§4). Breedte, lengte en uit blijven bestaan en rekenen precies als in V1.8. Opgeslagen instellingen en back-ups van vóór V1.9 met breedte gaan eenmalig naar zacht; lengte en uit blijven staan. **Artikel 1047492** (binnendoos 200 × 200 × 75 mm, gerekend met 1 kg): de doos blijft 614 × 214 × 178 mm met 300 binnendozen per drager. Een hogere doos geeft 315, maar dat is maar 5% meer. **Gemeten:** meer per drager bij 32,8% van de invoeren op de europallet en 17,4% op de blokpallet, gemiddeld 16,4% en 16,1% meer waar het meer is. Nergens minder, en bij hetzelfde aantal nooit een andere doos. Uitwerking in §4, metingen in §5. |
| 67 | Artikelen per binnendoos weer een vast aantal | Punt 1 | Het veld heet overal weer **Artikelen per binnendoos**: op het rekenscherm, op het tabblad Artikelen, in de kolomkoppeling en het voorbeeld van de Excel-import, en in de foutmelding ("Artikelen per binnendoos moet een geheel getal van minstens 1 zijn."). Het is een vast aantal, geen minimum. Zo vervalt het minimumdeel van #61. De rest van #61 blijft: de app vult 2 in waar ze het aantal zelf invult, een artikel zonder binnendoos heeft vast 1, en opgeslagen artikelen houden hun aantal. Artikelen per drager staat in resultaten en PDF zonder "min.", ook in het Engelse PDF. In het blok Binnendoos van het PDF heet de regel weer "Aantal per doos" (Engels "Quantity per box"). In `voorbeeld-artikelen.xlsx` heet kolom F "Artikelen per binnendoos". De import herkent ook de oude koppen "Aantal artikelen per binnendoos", "Min. aantal artikelen per binnendoos" en "Min. artikelen per binnendoos". De echte minimums blijven minimums: min. binnendozen per buitendoos, min. buitendozen per laag en min. ondersteuning. Voorbeeld: een binnendoos van 300 × 200 × 150 mm, 2 kg, met 2 artikelen per binnendoos, op de europallet, met de vormregel breedte: 120 binnendozen en 240 artikelen per drager, was "min. 240". Met de nieuwe standaard zacht (#66) zijn het 144 binnendozen en 288 artikelen. |
| 68 | Kantelbaar in de Excel-import van artikelen | Punt 2 | De import krijgt drie kolommen, alle drie optioneel: **Kantelbaar**, **L mag verticaal** en **B mag verticaal**. In elke cel staat ja of nee; een lege cel is nee. Kantelbaar ja zonder kolommen voor L en B: L en B mogen allebei verticaal. Met die kolommen bepalen zij welke as verticaal mag. Ja bij een as terwijl Kantelbaar nee is, of Kantelbaar ja zonder enige as, is een fout in die rij. Zonder kolom Kantelbaar werkt de import zoals in V1.8: een nieuw artikel is niet kantelbaar en een bestaand artikel houdt zijn kantelrechten. Het voorbeeld vóór het opslaan toont per rij de kantelrechten, en bij een bestaand artikel de wijziging, bijvoorbeeld "Kantelbaar: nee → ja (L en B verticaal)". `voorbeeld-artikelen.xlsx` krijgt de kolommen H "Kantelbaar (ja/nee)", I "L mag verticaal (ja/nee)" en J "B mag verticaal (ja/nee)", en een werkblad Voorbeeld met drie ingevulde rijen. De precieze regels staan in §6. |

## 4. Uitwerking van besluit 66

**Welke doos hoger is dan breed.** B is de breedte van de buitendoos: de korte horizontale buitenmaat. H is de hoogte van de buitendoos. Bij zacht geldt H ≤ 2 × B (gelijk mag); een hogere doos valt af. Een doos met H > B is hoger dan breed. Een doos met H = B is dat niet. Een doos met één laag binnendozen (nH = 1) rechtop valt onder de uitzondering van #55: die mag altijd, ook boven 2 × de breedte, en is nooit hoger dan breed. Dat geldt ook voor één laag in een gekantelde stand die niet hoger is dan rechtop. Een gekantelde stand die hoger is dan rechtop viel nooit onder de uitzondering (#55). Bij zacht geldt voor zo'n doos daarom de max. hoogte, en is ze hoger dan breed als H > B, ook met één laag. Met een max. hoogte van 1 × de breedte zijn de dozen precies die van breedte. Bij breedte, lengte en uit is geen enkele doos hoger dan breed in deze betekenis.

**Rangschikking.** De vormregel komt vooraan in stap 2 van §4.3 van het ontwerp, vóór de kantelregel. Eerst bepaalt de app de platte voorkeursoptie: de oplossing die dezelfde rangschikking kiest uit alleen de dozen die niet hoger zijn dan breed, met de kantelregel, de collimodule, recht of verband en de volgorde bij gelijke stand. Omdat de app de platte dozen zoekt zoals bij breedte (hieronder bij Verband zoeken), is dat precies de winnaar van breedte. Een oplossing met een doos die hoger is dan breed doet alleen mee als ze minstens 10% meer binnendozen per drager geeft dan de platte voorkeursoptie; bij precies 10% doet ze mee. Een andere platte oplossing kan meer geven dan de platte voorkeursoptie, want verband wint ook met tot 10% minder dan recht. De drempel kijkt toch naar de voorkeursoptie: dat is de doos die de gebruiker tot nu toe kreeg (§5). Zijn er alleen dozen die hoger zijn dan breed, dan doen die allemaal mee. Daarna volgt de kantelregel zoals altijd, over alle oplossingen die nog meedoen. Dan de collimodule: een platte collimodule-doos gaat voor op een hogere doos zonder collimodule, zoals bij kantelen. Doet daarna nog een doos mee die hoger is dan breed, dan wint zo'n doos. Daarna komen recht of verband en de volgorde bij gelijke stand, zoals in V1.8. Wint er na al die stappen geen doos die hoger is dan breed, dan is de winnaar de platte voorkeursoptie zelf, met haar uitleg. Een hogere doos die de drempel haalt maar daarna afvalt, kan zo de keuze tussen de platte dozen niet veranderen. Zonder die terugval kon dat wel: zo'n hogere doos tilde de lat voor kantelen hoger, waarna de collimodule een platte doos met minder koos. Zo geeft zacht precies de uitkomst van breedte, tenzij een hogere doos wint, en die geeft minstens 10% meer. Zacht geeft dus nooit minder per drager dan breedte, en kiest bij evenveel nooit een hogere doos.

Het voorstel zette de vormregel na de kantelregel. Gemeten op kantelbare binnendozen gaf dat soms minder dan breedte, en soms een hogere doos bij hetzelfde aantal (§5). Daarom vergelijkt de app met de uitkomst van breedte, en staat de vormregel vóór de kantelregel.

**Uitleg bij de winnaar.** De uitleg noemt eerst de vormregel, dan de kantelregel, de collimodule en recht of verband. Wint een doos die hoger is dan breed: "Hogere doos (hoger dan breed) geeft 360 tegen 300 binnendozen met een doos die niet hoger is dan breed (+20%, minstens 10%), dus hoger dan breed." Wint een platte doos terwijl een hogere doos meer geeft, maar minder dan 10% meer: "Hogere doos (hoger dan breed) geeft 315 tegen 300 binnendozen met een doos die niet hoger is dan breed; minder dan 10% meer, dus niet hoger dan breed." Haalde een hogere doos de drempel, maar viel ze daarna af: "Hogere doos (hoger dan breed) geeft 480 tegen 432 binnendozen met een doos die niet hoger is dan breed (+11,1%), maar zonder collimodule; een collimodule-doos gaat voor, dus niet hoger dan breed.", of bij de kantelregel "…, maar valt af door de kantelregel, dus niet hoger dan breed." Geeft geen hogere doos meer, dan noemt de uitleg de vormregel niet; anders zou die zin bij bijna elke uitkomst staan. Haalt een hogere rechtopstaande doos de drempel niet terwijl ze meer geeft dan de rechtopstaande dozen die meedoen, dan zegt de kantelzin waarmee ze vergelijkt: "Gekantelde binnendoos geeft 84 tegen 60 binnendozen rechtop met een doos die niet hoger is dan breed (+40%, minstens 10%), dus gekanteld." De kaart "Niet gekanteld" kan dan een hogere doos met meer tonen. Staat de lading recht omdat er geen verband meer meedoet, terwijl er wel verband is, dan zegt de uitleg waarom: "Geen geldig verband met een doos die hoger is dan breed; de lading staat recht.", "Verband met een doos die hoger is dan breed geeft geen 10% meer dan de platte voorkeursoptie; de lading staat recht." of "Verband met een doos die hoger is dan breed valt af door de kantelregel; de lading staat recht." Wint de platte voorkeursoptie zonder enig plat verband: "Geen geldig verband met een doos die niet hoger is dan breed; de lading staat recht." In alle andere gevallen blijft "Geen geldig verband gevonden; de lading staat recht." Een kaart met een doos die hoger is dan breed noemt dat, bijvoorbeeld "Alternatief: 315 binnendozen per drager, 5% meer dan de voorkeursoptie (recht, hoger dan breed)."

**Top drie.** Wint een doos die hoger is dan breed, dan komt de platte voorkeursoptie in de top drie, als die nog niet getoond is. Dat is de oplossing waarmee de drempel vergeleek, dus de uitkomst van breedte. De kaart heet "Niet hoger dan breed", met de uitleg "Beste oplossing met een doos die niet hoger is dan breed: 60 binnendozen per drager, 28,6% minder dan de voorkeursoptie (verband)." De kaart gaat voor op een gewoon alternatief. Zijn er al drie vaste kaarten (winnaar, beste verband en niet gekanteld), dan neemt ze de plaats in van een kaart waarvan ze de rol overneemt. Is de platte voorkeursoptie zelf niet gekanteld, dan neemt ze de plaats in van de kaart niet gekanteld; er blijft dan een niet-gekantelde oplossing in de top drie (#33). Anders neemt ze de plaats in van de kaart beste verband, als ze zelf verband is, of als beide kaarten een doos hebben die hoger is dan breed. In de overige gevallen heeft een van die twee kaarten al een platte doos, en blijven de drie kaarten staan. Zo staat er bij een winnaar die hoger is dan breed altijd een platte doos in de top drie, als er een oplossing met een platte doos is, en nooit meer dan drie kaarten.

**Verband zoeken.** De zoektocht naar verband slaat een voetafdruk over als die niet meer kan geven dan het beste verband dat al gevonden is in dezelfde soort: gekanteld of niet, en op de europallet collimodule of niet. Dozen die hoger zijn dan breed zijn nu een eigen soort. Anders sloeg de app soms het verband van een platte doos over omdat een hogere doos meer gaf, terwijl de kaart "Niet hoger dan breed" dat verband nodig heeft. Bij 400 × 250 × 150 mm, 5 kg (§5) toont de kaart zo 764 × 414 × 178 mm in verband, net als breedte; zonder deze soort toonde de app daar recht. Verder zoekt de app de platte dozen precies zoals bij breedte. Eerst komen de voetafdrukken met een doos die niet hoger is dan breed, in dezelfde volgorde als bij breedte, en daarna die met alleen hogere dozen. Ook verband zoekt ze eerst voor de platte dozen, in de volgorde en met de grenzen van breedte; een gevonden verband geldt ook voor de hogere dozen op dezelfde voetafdruk. Daarna zoekt ze verband op de voetafdrukken die alleen nog voor hogere dozen nodig zijn, en dat levert alleen hogere oplossingen. Zo zijn de platte oplossingen bij zacht precies die van breedte, ook als de zoekruimte wordt afgekapt of de grens voor varianten van het vijfblokspatroon (#65) wordt bereikt. Eerder kon een kleine zoeklimiet bij zacht minder platte voetafdrukken opleveren dan bij breedte, omdat hogere dozen voorgingen.

**Instellingen, scherm en opslag.** De vormregel in Instellingen heeft vier keuzes: "Hoger dan breed alleen bij minstens 10% meer" (standaard), "Niet hoger dan de breedte", "Niet hoger dan de lengte" en "Uit". Ernaast staat het veld "Max. hoogte (× de breedte)", standaard 2, alleen te gebruiken bij de eerste keuze. Kleiner dan 1 geeft de melding "De max. hoogte bij de vormregel moet minstens 1 × de breedte zijn." Bij een andere keuze blijft de opgeslagen max. hoogte bewaard. Het rekenscherm toont bij zacht de ingestelde max. hoogte, standaard: "Vormregel: een buitendoos hoger dan breed wint alleen bij minstens 10% meer per drager, en is nooit hoger dan 2 × de breedte; één laag binnendozen mag altijd. Aan te passen onder Instellingen." Met max. hoogte 2,5 staat er "2,5 × de breedte". Strepen de vormregel en andere grenzen alle dozen weg, dan noemt de melding de max. hoogte: "Geen buitendoos voldoet aan de vormregel (niet hoger dan 2 × de breedte, behalve bij één laag binnendozen). Pas de vormregel aan in de instellingen." De instellingen krijgen versie 3. Staat in opgeslagen instellingen of een back-up van een eerdere versie de vormregel breedte, de oude standaard, dan wordt die eenmalig zacht met max. hoogte 2. Lengte en uit blijven staan, en de bijwerking van #49 werkt nog. Wie daarna zelf breedte kiest, houdt breedte. Na het terugzetten van een back-up toont Instellingen "Back-up teruggezet.", en na Alles wissen "Alle gegevens gewist."; die meldingen gingen eerder verloren doordat de pagina na het herladen opnieuw werd opgebouwd. Een opgeslagen berekening, een regel in het overzicht en hun PDF veranderen niet: ze bewaren invoer en uitkomst als snapshot. Wie een berekening opnieuw laat rekenen, rekent met de vormregel uit Instellingen.

## 5. Metingen bij besluit 66

**Opzet.** De rekenmodule van V1.8 met vormregel breedte (de oude standaard) en die van V1.9 met zacht (max. 2 × de breedte) zijn naast elkaar gedraaid. Binnendozen: lengte 100, 150, 200, 250, 300 en 400 mm, breedte 80, 100, 150, 200 en 250 mm (niet langer dan de lengte), hoogte 50, 75, 100, 150, 200 en 300 mm, niet kantelbaar. Op de europallet bij 0,3, 1, 2,5 en 5 kg: 576 invoeren. Op de blokpallet bij 1 en 2,5 kg: 288 invoeren. Verder de standaardinstellingen van de app: min. 2 binnendozen per buitendoos en 2 buitendozen per laag, max. 23 kg per gevulde buitendoos, min. ondersteuning 75% en 2 artikelen per binnendoos. Geen berekening gaf een fout of werd afgekapt.

**Breedte, lengte en uit veranderen niet, en zacht zoekt de platte dozen zoals breedte.** In V1.9 geven breedte, lengte en uit bij alle 864 invoeren precies hetzelfde resultaat als in V1.8: alle oplossingen in dezelfde volgorde, de top drie met rollen en uitleg, en het zoeklog. Ook de meldingen bij geen oplossing zijn gelijk, in 18 extra invoeren die zo'n melding geven. De platte oplossingen bij zacht zijn bij alle 864 invoeren precies alle oplossingen van breedte in V1.8: dezelfde dozen, stapelwijzen en aantallen.

**Zacht tegen breedte.** De rijen vanaf "H / B" gaan alleen over de invoeren met meer per drager.

| | Europallet (576) | Blokpallet (288) |
|---|---|---|
| Meer / minder / gelijk per drager | 189 (32,8%) / 0 / 387 | 50 (17,4%) / 0 / 238 |
| Hetzelfde aantal, andere doos | 0 | 0 |
| Winst waar meer | gem. 16,4%, mediaan 14,3% | gem. 16,1%, mediaan 14,0% |
| Kleinste en grootste winst | 10,0% en 40,0% | 12,0% en 20,0% |
| Winst over alle invoeren | gem. 5,4% | gem. 2,8% |
| Alle binnendozen samen | 185.309 → 193.726 (+4,5%) | 109.108 → 110.361 (+1,1%) |
| H / B van de winnaar | 1,09 tot 2,00, mediaan 1,88 | 1,22 tot 2,00, mediaan 2,00 |
| Hoogte doos, mediaan | 228 → 628 mm | 328 → 628 mm |
| Gevulde doos, mediaan | 4,23 → 10,00 kg | 7,02 → 16,16 kg |
| Dozen boven 15 kg | 20 → 66 | 3 → 30 |
| Dozen boven 20 kg | 1 → 21 | 2 → 8 |
| Lagen op de drager, mediaan | 8 → 3 | 5 → 3 |
| Kaart "Niet hoger dan breed" | 186 van 189 | 49 van 50 |

- Elke invoer met meer heeft een winnaar die hoger is dan breed. Elke winnaar die hoger is dan breed geeft minstens 10% meer. Precies 10% kwam één keer voor (europallet), precies 20% 54 keer (europallet) en 23 keer (blokpallet).
- 43 invoeren op de europallet en 11 op de blokpallet hadden geen enkele oplossing met een doos die hoger is dan breed.
- De zin "minder dan 10% meer, dus niet hoger dan breed" stond 112 keer (europallet) en 83 keer (blokpallet) bij de winnaar. De hogere doos gaf daar mediaan 4,4% en 6,7% meer.
- Waar zacht meer geeft, is de doos vaak hoog en zwaar. Op de europallet zijn 106 van de 189 nieuwe winnaars hoger dan 600 mm, en heeft de lading in 169 gevallen 3 of 4 lagen. In 156 gevallen is de doos zwaarder dan de winnaar van breedte. De max. gevulde buitendoos (standaard 23 kg) blijft de grens.

**De kaart voor de platte doos.** Die stond op plek 2 (176 en 45 keer) of plek 3 (10 en 4 keer). In de vier gevallen zonder kaart staat de platte voorkeursoptie al als kaart "Beste verband" in de top drie: europallet 250 × 250 × 300 mm bij 0,3 en 1 kg, europallet 250 × 250 × 75 mm bij 2,5 kg en blokpallet 250 × 250 × 300 mm bij 1 kg. Nooit meer dan drie kaarten.

**De kaart is de winnaar van breedte.** Alle 186 kaarten (europallet) en 49 (blokpallet) tonen precies de winnaar van breedte: dezelfde doos, dezelfde stapelwijze en hetzelfde aantal. Bij elke winnaar die hoger is dan breed staat de winnaar van breedte dus in de top drie (189 van 189 en 50 van 50).

**De drempel kijkt naar de winnaar van breedte, niet naar het hoogste platte aantal.** Voorbeeld: europallet, 150 × 100 × 100 mm, 0,3 kg. Breedte kiest 414 × 314 × 228 mm in verband met 768; recht geeft 800, maar dat is minder dan 10% meer, dus verband. Een hogere doos, 414 × 314 × 628 mm, geeft 864: 12,5% meer dan 768. Die wint, en de kaart "Niet hoger dan breed" toont 768 in verband. Tegen het hoogste platte aantal (800) zou het maar 8% meer zijn.

**Voorbeelden.** Binnendozen per drager; doos in mm met de indeling nL × nB × nH.

| Invoer | Breedte | Zacht |
|---|---|---|
| 1047492: 200 × 200 × 75 mm, 1 kg, europallet | 614 × 214 × 178 (3 × 1 × 2), verband, 300 | Gelijk; hoger geeft 315 (+5%) |
| Idem, max. 2,5 × de breedte | 300 | 614 × 214 × 478 (3 × 1 × 6), verband, 360 (+20%) |
| 400 × 250 × 150 mm, 5 kg, europallet | 764 × 414 × 178 (3 × 1 × 1), verband, 60 | 414 × 264 × 478 (1 × 1 × 3), verband, 84 (+40%) |
| 200 × 100 × 150 mm, 1 kg, europallet | 414 × 114 × 178 (2 × 1 × 1), verband, 380 | 414 × 314 × 478 (2 × 3 × 3), verband, 432 (+13,7%) |
| 300 × 200 × 150 mm, 2 kg, europallet | 414 × 314 × 178 (2 × 1 × 1), verband, 120 | 414 × 314 × 628 (2 × 1 × 4), verband, 144 (+20%) |
| 200 × 100 × 300 mm, 1 kg, blokpallet | 814 × 314 × 328 (4 × 3 × 1), verband, 240 | 414 × 314 × 628 (2 × 3 × 2), verband, 288 (+20%) |
| 150 × 150 × 300 mm, 1 kg, blokpallet | 464 × 314 × 328 (3 × 2 × 1), verband, 210 | 464 × 314 × 628 (3 × 2 × 2), verband, 252 (+20%) |

- **1047492.** Zonder vormregel wint 614 × 214 × 478 mm (3 × 1 × 6) met 360. Die doos is 2,23 × zo hoog als breed en valt bij zacht af. De twee dozen met 315 (614 × 214 × 253 en 1014 × 214 × 253 mm, 1,18 × de breedte) staan als alternatief in de top drie. Met max. 2,5 × de breedte wint 3 × 1 × 6 wel; de kaart "Niet hoger dan breed" is dan de winnaar van breedte, 614 × 214 × 178 mm in verband met 300.
- **400 × 250 × 150 mm, 5 kg.** De doos is 1,81 × zo hoog als breed. De lading gaat van 10 naar 4 lagen; de gevulde doos weegt 15,77 kg in plaats van 16,06 kg. De kaart is de winnaar van breedte. Zonder vormregel wint 414 × 264 × 628 mm (1 × 1 × 4) met ook 84.
- **200 × 100 × 150 mm, 1 kg.** De gevulde doos weegt 18,89 kg in plaats van 2,24 kg; 4 lagen in plaats van 10.
- **300 × 200 × 150 mm, 2 kg** (het voorbeeld van #61 en #67). 2,00 × zo hoog als breed, 6 per laag × 3 lagen, gevulde doos 17,05 kg in plaats van 4,55 kg, totale hoogte 2028 mm in plaats van 1924 mm. De kaart is de winnaar van breedte.
- **150 × 150 × 300 mm, 1 kg, blokpallet.** De doos is 2,00 × zo hoog als breed. De kaart is de winnaar van breedte: 464 × 314 × 328 mm in verband, 6 binnendozen per doos van 6,77 kg.

**Kantelbare binnendozen en de volgorde van de stappen.** Een tweede reeks: binnendozen van 150 tot 400 × 100 tot 250 mm, 50, 100, 150 en 250 mm hoog, 0,5, 2 en 5 kg, op de europallet, met min. 2 per doos en per laag: 204 invoeren, elk een keer niet kantelbaar en een keer kantelbaar met L en B verticaal. Zacht gaf meer per drager bij 53 (26,0%, gemiddeld +17,4%) en 56 (27,5%, gemiddeld +15,5%) invoeren. Nergens minder, en nooit een hogere doos terwijl een platte oplossing evenveel of meer gaf. Bij elke winnaar die hoger is dan breed stond de winnaar van breedte in de top drie: als kaart "Niet hoger dan breed" (53 en 53 keer), of al als andere kaart (0 en 3 keer). Op dezelfde reeks zijn twee andere volgordes geprobeerd, allebei met het hoogste platte aantal als vergelijking:

- De vormregel na de kantelregel, zoals in het voorstel: bij de kantelbare binnendozen 2 keer minder per drager dan breedte, en 4 keer een hogere doos terwijl een platte oplossing evenveel of meer gaf. Voorbeeld: 400 × 250 × 150 mm, 5 kg: een hogere doos met 84 tegen een gekantelde platte doos met ook 84.
- De vormregel vooraan, maar vergeleken met alle platte dozen, ook gekantelde die de kantelregel niet halen: bij de kantelbare binnendozen bleef het 7 keer bij het aantal van breedte, waar de gebouwde volgorde een hogere doos met minstens 10% meer koos.

De gebouwde volgorde had geen van beide problemen. Geen volgorde is overal de beste: bij de kantelbare binnendozen gaf de eerste volgorde 5 keer meer dan de gebouwde en de tweede 3 keer, omdat de kantelregel daarna anders uitvalt. Bij de niet-kantelbare gaf de gebouwde volgorde 2 keer meer dan beide, bijvoorbeeld bij 250 × 100 × 50 mm, 0,5 kg: 1080 tegen 960. Daar kiest breedte verband, terwijl recht iets meer geeft, en de gebouwde volgorde vergelijkt met die verbandoplossing.

**Rekentijd.** Meer dozen mogen meedoen, dus het rekenen duurt langer, breedte tegen zacht. Gemeten op een machine met 4 processorkernen, zonder andere zware taken.

- Alle 864 invoeren van de eerste reeks, in één proces, oud en nieuw om en om, na het opwarmen: samen 69,1 s → 81,0 s (×1,17). Per invoer: mediaan 18,4 → 27,1 ms, p95 431 → 438 ms, max 1,20 → 1,20 s. Boven 1 s: 2 invoeren met breedte, 1 met zacht.
- Zware invoer, min. 2 per doos en per laag, de snelste van twee keer:
  - binnendoos 60 × 40 × 30 mm, 0,1 kg, kantelbaar met L en B verticaal, op de blokpallet: 4,2 → 5,5 s;
  - dezelfde binnendoos op de europallet: 1,9 → 3,0 s;
  - dezelfde binnendoos, niet kantelbaar, op de blokpallet: 3,6 → 3,9 s;
  - het zware geval van ronde 7, binnendoos 75 × 60 × 40 mm, 0,2 kg, kantelbaar, op een europallet met overhang (voor 2, achter 5, links 3 en rechts 22 mm, niet asymmetrisch): 2,7 → 4,2 s;
  - binnendoos 100 × 100 × 50 mm, 0,3 kg, kantelbaar, op de europallet: 0,1 → 0,7 s;
  - binnendoos 80 × 60 × 40 mm, 0,1 kg, niet kantelbaar, op de blokpallet: 0,8 → 1,1 s.

Bij de eerste vier is de zoekruimte afgekapt, in beide versies, met dezelfde winnaar. Alles blijft onder het doel van 10 seconden (#27). Met andere zware taken op de machine duurt het langer: zo duurde 60 × 40 × 30 mm kantelbaar op de blokpallet in eerdere metingen 9,2 tot 9,4 s, en één keer 10,5 s. De extra tijd komt van de extra dozen en van het verband dat alleen voor hogere dozen nodig is.

## 6. Regels van de import bij besluit 68

**Kolommen.** De kolomkoppeling krijgt drie velden, alle drie niet verplicht: "Kantelbaar", "L mag verticaal" en "B mag verticaal". De import herkent ze aan de kop:

- Kantelbaar: een kop met "kantel" of "tilt", bijvoorbeeld "Kantelbaar", "Kantelen" of "Kantelbaar (ja/nee)". Dit veld wordt als laatste gekoppeld, zodat een kop als "Hoogte (niet kantelen)" de hoogte blijft.
- L mag verticaal: een kop met L, Lengte of Length als los woord en daarna "verticaal" (of "vertical"), bijvoorbeeld "L mag verticaal" of "Lengte mag verticaal". B mag verticaal op dezelfde manier met B, W, Breedte of Width. Deze twee worden als eerste gekoppeld, zodat "L mag verticaal" niet de lengte wordt. "Lengte binnendoos" is geen askolom, want het woord verticaal ontbreekt.

**Waarden.** Ja: ja, j, yes, y, x, 1, true of waar. Nee: nee, n, no, 0, false of onwaar. Hoofdletters en spaties eromheen tellen niet. Een Excel-cel met WAAR of ONWAAR telt ook. Een lege cel is nee. Elke andere waarde is een fout.

**Regels per rij.**

1. Zonder kolom Kantelbaar werkt de import zoals in V1.8: een nieuw artikel is niet kantelbaar en een bestaand artikel houdt zijn kantelrechten. Kolommen voor L en B tellen dan niet mee, ook niet met een ongeldige waarde. Het importscherm waarschuwt: "Koppel ook Kantelbaar: zonder die kolom tellen L mag verticaal en B mag verticaal niet mee."
2. Kantelbaar nee of leeg: niet kantelbaar. Staat er bij L of B toch ja, dan is dat een fout: "L mag verticaal is ja, maar Kantelbaar is nee." of "B mag verticaal is ja, maar Kantelbaar is nee."
3. Kantelbaar ja zonder kolommen voor L en B: L en B mogen allebei verticaal.
4. Kantelbaar ja met kolommen voor L en B: die bepalen welke as verticaal mag. Is maar één van de twee gekoppeld, dan telt de andere as als nee. Mag geen enkele as verticaal, dan is dat een fout: "Kantelbaar is ja, maar L en B mogen geen van beide verticaal staan."
5. Een ongeldige waarde geeft een fout met die waarde, bijvoorbeeld: Kantelbaar moet ja of nee zijn, niet "misschien". Zo ook bij L en B. Er komen dan geen vervolgfouten over de combinatie bij.
6. Met kolom Kantelbaar gelden de kantelrechten uit het bestand ook voor een bestaand artikel; een lege cel is dan nee. Het voorbeeld toont de wijziging, bijvoorbeeld "Kantelbaar: ja (B verticaal) → nee", na de wijzigingen in maten, aantal en omschrijving. Pas na bevestiging wordt overschreven (#19).

Een rij met een fout wordt niet geïmporteerd. Het voorbeeld vóór het opslaan toont bij elke rij "kantelbaar: nee", "kantelbaar: ja (L verticaal)", "kantelbaar: ja (B verticaal)" of "kantelbaar: ja (L en B verticaal)". De hint op het importscherm zegt dat H de hoogte rechtop is, dat de drie kolommen ja of nee zijn en leeg nee, wat Kantelbaar ja zonder kolommen voor L en B doet, en wat er zonder kolom Kantelbaar gebeurt. Kantelrechten blijven per artikel aan te passen op het tabblad Artikelen.

**Voorbeeldbestand.** `voorbeeld-artikelen.xlsx` heeft op het werkblad Artikelen tien koppen: A Artikelcode, B Lengte binnendoos (mm), C Breedte binnendoos (mm), D Hoogte binnendoos (mm), E Gewicht binnendoos incl. inhoud (kg), F Artikelen per binnendoos, G Omschrijving, H Kantelbaar (ja/nee), I L mag verticaal (ja/nee) en J B mag verticaal (ja/nee). In H tot en met J staat een keuzelijst ja/nee; een andere waarde geeft alleen een waarschuwing. Het werkblad Artikelen heeft verder geen rijen: een onaangeroerd voorbeeld importeert niets (#53). Het werkblad Uitleg beschrijft de nieuwe kolommen, de andere vormen van ja en nee, en wat er zonder kolom Kantelbaar gebeurt. Een derde werkblad, Voorbeeld, heeft dezelfde koppen en drie ingevulde rijen, die zonder fouten importeren:

| Artikelcode | Binnendoos | Artikelen per binnendoos | Kantelbaar | L / B verticaal |
|---|---|---|---|---|
| VOORBEELD-1 | 300 × 200 × 150 mm, 2,5 kg | 4 | nee | nee / nee |
| VOORBEELD-2 | 400 × 250 × 120 mm, 1,25 kg | 6 | ja | ja / nee |
| VOORBEELD-3 | 350 × 300 × 200 mm, 3 kg | leeg, dus 2 | ja | ja / ja |

De import kiest standaard het eerste werkblad; wie wil proberen, kiest het werkblad Voorbeeld.
