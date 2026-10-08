# Besluiten ronde 1 — open vragen verpakkingsapp V1

**Bron:** vragenlijst "Open vragen verpakkingsapp V1" (Claude Docs), beantwoord op 8 oktober 2026. Vraag en voorstel zijn zoals ze in de lijst stonden; het antwoord is letterlijk overgenomen. Kolom **Gevolg** zegt hoe het antwoord in versie 1.2 van het functioneel ontwerp is verwerkt.

## 1. Tegenstrijdigheden in het ontwerp

| Nr | Onderwerp | Voorstel | Antwoord | Gevolg in V1.2 |
|---|---|---|---|---|
| 1 | Belading of totaalgewicht | Eén veld 'max. totaalgewicht incl. drager'; de belading volgt daaruit. | Ja, voorstel klopt. Het totaalgewicht moet in te vullen zijn. | Eén invulbaar veld "max. totaalgewicht incl. drager". |
| 2 | Maat voor de 10%-regel | Beide regels in binnendozen per drager. De kantelregel geldt voor elke oplossing met een gekantelde buitendoos op de drager. Onder 10% meer staat zo'n oplossing niet bovenaan, wel lager in de lijst. | Het moet aan te vinken zijn of een product kantelbaar is of niet. Dit heeft er mee te maken of een product dat aan kan of niet. Dit gaat altijd over de binnendoos. De buitendoos mag in het voorstel niet gekanteld worden. | Buitendoos staat altijd rechtop. Kantelen is een eigenschap van de binnendoos: vinkje "kantelbaar", standaard uit. Beide 10%-regels tellen binnendozen per drager. |
| 3 | Tolerantie | Speling tussen dozen op de drager, standaard 0 mm. | Tolerantie mag genegeerd worden. Er mag vanuit gegaan worden dat de ingevulde maten correct zijn. | Veld tolerantie vervalt. |
| 4 | Productieruimte | Altijd de ingestelde waarde, standaard 3 mm per as. | Er hoeft geen rekening gehouden te worden met productieruimte. | Productieruimte vervalt (0 mm). |
| 5 | Vaste plaatsen in de top drie | Verplichte opties gaan voor. Volgorde: winnaar, beste verband, beste alleen-vlak. | Ja eens met het voorstel. De absolute winnaar is als de doos collomoduul is voor een europallet. Dan mag verband genegeerd worden. | Top drie: winnaar, beste verband, beste niet-gekantelde binnendoos. Nieuwe regel: een collimodule-doos op een europallet wint altijd; de 10%-vergelijking met verband vervalt dan. Definitie collimodule: vervolgvraag 31–32. |

## 2. Definities voor de rekenmodule

| Nr | Onderwerp | Voorstel | Antwoord | Gevolg in V1.2 |
|---|---|---|---|---|
| 6 | Recht, verband en gemengde laag | Recht: elke laag gelijk. Verband: elke volgende laag 180° gedraaid, gespiegeld of verschoven, zodat dozen de naden eronder overbruggen. | Ja eens met het voorstel | Overgenomen; toetsbare regel voor verband: vervolgvraag 34. |
| 7 | Kantelen per as | Per artikel, binnendoos en buitendoos aangeven welke van L, B en H verticaal mag staan. | De software is voor een artikel per ladingdrager. Er zitten dus niet meerdere verschillende artikelen in een doos of ladingdrager. Bij de binnendoos aangeven welke vlakken gekanteld mogen worden. De buitendoos moet altijd rechtop voorgesteld worden. | Alleen de binnendoos krijgt kantelrechten per as. Buitendoos altijd rechtop. |
| 8 | Doostype en wanddikte | FEFCO 0201, dubbele golf 7 mm, 0,750 kg/m². Toeslag L/B +14 mm, H +28 mm. Karton inclusief flappen. | Ja fefco 0201 dubbele golf 7mm is de standaard. Daarnaast de optie om dit zelf handmatig in te vullen. Je kunt dus kiezen uit FEFCO 0201 en custom, waarbij je custom zelf kan invullen. | Doostype kiezen: FEFCO 0201 (standaard, vaste waarden +14 / +14 / +28 mm) of custom met eigen toeslag en kartonmassa. |
| 9 | Voorkeursmaat 600 × 400 × 500 | Buitenmaat; afstand per as tot 600/400/500. | De voorkeur gaat naar collomoduul maten voor een europallet. Hoogte is daarbij niet belangrijk. | Voorkeursmaat = collimodule-voetafdruk; hoogte telt niet mee. |
| 10 | Verschillende configuratie | Anders = andere buitenmaat, recht tegenover verband, of gekanteld tegenover alleen vlak. | Eens met het voorstel | Overgenomen; "gekanteld" slaat nu op de stand van de binnendoos in de buitendoos. |
| 11 | Referentiestelsel | Voor = korte zijde; oorsprong linksvoor; gecentreerd tenzij asymmetrische overhang nodig is. | Eens met het voorstel | Overgenomen. |
| 12 | Tussenlagen en verpakkingsmateriaal | Tussenlaag op ladingmaat. Bodemvel en topvel met dikte en gewicht; hoekprofielen en folie alleen gewicht. | Tussenlaag ook op dragermaat. Voor de rest eens met het voorstel | Tussenlaagmaat naar keuze: dragermaat (standaard) of ladingmaat. Bodemvel, topvel, hoekprofielen en folie toegevoegd. |
| 13 | Karren en rolcontainers | Kar als dragertype met binnenmaat en vloerhoogte; overhang 0. | Eens met het voorstel. Het is nu nog onbekend welke karren gebruikt gaan worden. Dit moet daarom handmatig in te vullen zijn. | Overgenomen; geen standaardkarren. |
| 14 | Grenzen aan de buitendoos | Min-/max-buitenmaat als instelling, standaard geen grens. Zonder buitendoos via "bestaande buitendoos". | Eens met het voorstel | Overgenomen. |
| 15 | Artikelinstap zonder binnendoos | V1 ontwerpt geen binnendoos; artikel telt als binnendoos met 1 stuk. | Eens met het voorstel. De app hoeft geen binnendoos te ontwerpen. | Overgenomen. |

## 3. Stamgegevens en Excel-import

| Nr | Onderwerp | Voorstel | Antwoord | Gevolg in V1.2 |
|---|---|---|---|---|
| 16 | Standaardwaarden dragers | Max. 1800 mm en 1000 kg incl. drager, geen overhang. | Standaard max gewicht buitendoos is 23 kg. standaard hoogte voor de drager is 210cm. Standaard max overhang 0 en max gewicht ladingdrager is 1000kg. | Standaard: buitendoos max. 23 kg; max. totale hoogte 2100 mm incl. drager; overhang 0; max. 1000 kg incl. drager. |
| 17 | Voorbeeld-Excel | Eenheid per kolom kiezen in de kolomkoppeling. | Er wordt in een excel het volgende aangeleverd. Artikelnummer voor bestandnaam; lengte, breedte en hoogte binnendoos en het gewicht van de binnendoos. | Importkolommen: artikelnummer, L, B, H en gewicht binnendoos. Betekenis "voor bestandnaam", eenheden en artikelen per binnendoos: vervolgvraag 35. |
| 18 | Artikel en binnendoos | Meerdere varianten; gebruiker kiest er één per berekening. | De binnendoos wordt niet berekend door de software. Deze afmeting wordt gegeven. | Aangenomen: één binnendoos per artikel (vervolgvraag 36). |
| 19 | Opnieuw importeren | Per rij tonen wat verandert; na bevestiging overschrijven, anders overslaan; eerdere berekeningen houden hun snapshot. | Eens met het voorbeeld | Overgenomen, behalve "extra variant" zolang er één binnendoos per artikel is (vervolgvraag 36). |
| 20 | Bibliotheek bestaande buitendozen | Dozenbibliotheek in het gegevensbeheer. | Nee er zijn geen standaard buitendozen. | Geen dozenbibliotheek. |

## 4. Output en PDF

| Nr | Onderwerp | Voorstel | Antwoord | Gevolg in V1.2 |
|---|---|---|---|---|
| 21 | Lezers van het PDF | Intern, Nederlands, A4 staand; logo, berekeningsnummer en datum in de kop. | Deze gaat voornamelijk intern naar het magazijn, maar ook naar leveranciers. Er moet een optie zijn om het in het Engels of Nederlands op A4-formaat staand uit te draaien. In de kop het logo van het bedrijf. Ook moet groot het artikelnummer zichtbaar zijn op de PDF. | PDF in NL of EN, A4 staand, logo in de kop, artikelnummer groot. |
| 22 | Huidige pakinstructie | — | Momenteel is er nog geen pakinstructie. | Geen bestaand voorbeeld. |
| 23 | PDF artikelgegevens | Artikel- en binnendoosgegevens plus buitendoos uit de gekozen oplossing op één A4. | Afbeelding (zie `afbeeldingen/pdf-voorbeeld.png`): "Zo moet de pdf er ongeveer uit zien en deze gegevens moet het bevatten." | Pagina-indeling volgens het voorbeeld (§5 van V1.2). Vervolgpagina's: vervolgvraag 37. |

## 5. Organisatie en techniek

| Nr | Onderwerp | Voorstel | Antwoord | Gevolg in V1.2 |
|---|---|---|---|---|
| 24 | Gebruikers en rechten | Inloggen met bedrijfsaccount; rollen beheerder en gebruiker. | Iedere gebruiker mag alles. Voor nu 1 master user. | Eén account met alle rechten; geen rollen. |
| 25 | Hosting en koppelingen | Cloud; in V1 alleen Excel-import. | Dit is niet iets voor V1 | Geen ERP-koppeling in V1. Hosting: vervolgvraag 38. |
| 26 | Apparaten | Invoer op desktop; resultaat en PDF leesbaar op tablet. | Eens met voorstel | Overgenomen. |
| 27 | Rekentijd | Doel onder 10 s; afkappen op een vast aantal kandidaten. | Eens met voorstel | Overgenomen. |

## 6. Testgegevens

| Nr | Onderwerp | Voorstel | Antwoord | Gevolg in V1.2 |
|---|---|---|---|---|
| 28 | Echte cases | Per case: maten, aantallen, drager, overhang, foto. | Zes praktijkcases met foto (zie bijlage A van V1.2 en map `praktijkcases/`). | Opgenomen als acceptatiecases; twee tikfouten gecorrigeerd volgens de doosetiketten. Artikelcode en gewicht van 1042794: vervolgvraag 40. |
| 29 | Verwachte getallen | Aanvullen in §6; bij akkoord op punt 8 opnieuw berekenen. | Hiervoor mag punt 8 aangehouden worden. | Acceptatievoorbeelden herberekend met FEFCO 0201. |

## 7. Nieuw na controle

| Nr | Onderwerp | Voorstel | Antwoord | Gevolg in V1.2 |
|---|---|---|---|---|
| 30 | Volgorde van de twee 10%-regels | Eerst de kantelregel, daarna recht tegen verband. | Eens met voorstel. | Kantelregel geldt nu voor de binnendoos (antwoord 2 en 7): volgorde collimodule, kantelregel, recht/verband. Ter bevestiging: vervolgvraag 33. |

## Praktijkcases zoals aangeleverd (antwoord 28)

| Artikelcode | Binnendoos L × B × H (mm) | Gewicht buitendoos (kg) | Buitendoos L × B × H | Buitendozen per laag | Overhang |
|---|---|---|---|---|---|
| 1042794 | 1230 × 74 × 83 | 18,8 | 1245 × 380 × 180 | 2 | lichte overhang achterzijde |
| 1037172 | 354 × 92 × 115 | 6,5 | 385 × 362 × 25 | 6 | |
| 2029248 | 1610 × 75 × 76 | 16,8 | 1625 × 240 × 242 | 3 | overhang achterzijde |
| 1000466 | 745 × 93 × 85 | 13,5 | 790 × 380 × 275 | 3 | |
| 2013186 | 250 × 251 × 157 | 17,2 | 515 × 26 × 49 | 6 | |
| 2028463 | 120 × 142 × 122 | 16,6 | 500 × 295 × 385 | 6 | |
