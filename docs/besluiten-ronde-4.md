# Besluiten ronde 4 — wensen na het werken met versie 1.4

**Bron:** negen punten die de gebruiker na het werken met versie 1.4 van de app heeft aangeleverd, met drie afbeeldingen, plus twee verduidelijkende vragen, beantwoord op 9 oktober 2026. De punten en de antwoorden zijn letterlijk overgenomen. De besluiten 49–59 zeggen hoe ze in versie 1.5 van het functioneel ontwerp zijn verwerkt.

## 1. De punten (letterlijk)

**Punt 1**

> In het veld minimaal aantal binnendozen per buitendoos en minimaal buitendozen per laag is mag het standaard getal 2 zijn.

**Punt 2**

> Waar mogelijk de dozen tegen de rand van de pallet en het gewicht zo gelijk mogelijk verdeeld over de pallet. In onderstaande oplossing zou doos 3 verder naar rechts tegen de rand van de pallet aan. Dit kan echte alleen zolang de overige dozen nog genoeg ondersteund zijn.
>
> Afbeelding 1 en 2

**Punt 3**

> Bij de keuze voor de Nederlandse of engelse pdf is Nederlands de standaard keuze. Dit staat nu op Engels.

**Punt 4**

> Voor de excel import van leverdatum en artikelen met hun afmetingen moet er een voorbeeld excel uit te downloaden zijn. Daarin staan boven de titels van de informatie die nodig is dus bijvoorbeeld in kolom A: artikelcode en kolom B: lengte.

**Punt 5**

> Wanneer kantelbaar aangevinkt is wil dat niet zeggen dat hier gebuik van gemaakt moet worden. Als er niet gekanteld meer dozen op de ladingdrager passen heeft dat nog steeds de voorkeur.
> Dat dit aangevinkt is betekend dat het toegestaan is om daarmee te rekenen, maar niet dat het verplicht is.

**Punt 6**

> In overzicht moet de optie komen om te zoeken naar een artikel via een zoekbalk.

**Punt 7**

> Er moet een optie bij om buitendoos niet mee te nemen in de berekening. Standaard moet deze wel meegenomen worden.
> In sommige gevallen is een artikel groter of zwaarder waardoor er geen buitendoos is maar enkel een binnendoos. In deze gevallen vul je de binnendoos in en word daarmee berekend hoe deze het beste op de pallet gestapeld wordt.

**Punt 8**

> Plaats alle invul velden op gelijke hoogte. In het geval van de afbeelding mogen de eerste 2 velden dus naar beneden gezet worden om op gelijke hoogte te staan als de rechter 2 velden.
> Dit geld ook voor de velden bui buitendoos en ladingdrager

**Punt 9**

> Hoekprofielen en stretchfolie worden niet visueel meegenomen.

**Afbeeldingen** (beschrijving; de afbeeldingen zelf zijn niet in de repository opgenomen):

1. Isometrische tekening van een lading op een europallet 1200 × 800 mm, totale hoogte 1872 mm, lagen afwisselend gekleurd.
2. Bovenaanzicht "Laag B: lagen 2, 4, 6": doos 1 dwars over de voorkant, dozen 2 en 3 erachter tegen de linkerkant, rechts een vrije strook.
3. De invoerrij van de binnendoos: Lengte 134, Breedte 550, Hoogte (rechtop) 553, Gewicht 1,6. De labels van de laatste twee velden lopen over twee regels, waardoor hun invoervakken lager staan dan die van de eerste twee.

## 2. Verduidelijkende vragen

Vraag en antwoord zijn letterlijk overgenomen. Vraag V2 is ingekort.

| Nr | Onderwerp | Vraag | Voorgestelde opties | Antwoord |
|---|---|---|---|---|
| V1 | Kantelen | Punt 5: soms heeft alleen een gekantelde doos een collimodule-maat (bijv. 600 x 400). Volgens de afspraak uit ronde 1 wint een collimodule-doos altijd, ook als er rechtop meer dozen op de pallet passen. Wat moet voorgaan? | **Niet kantelen gaat voor (Aanbevolen).** **Collimodule gaat voor.** | Eigen antwoord: "Dit klopt niet helemaal In het voorbeeld van artikel 2003668 vullen beide voorstellen de halve pallet en dus zijn in de buurt van collomodule, maar de gene met de stand rechtop heeft meer dozen op de ladingdrager. Ik weet niet of hoogte nu ook wordt meegerekend, maar hoogte is onrelevant of een doos collomodule is" |
| V2 | Ondersteuning | Punt 2: hoeveel van het grondvlak van een doos moet minstens op de dozen eronder rusten als dozen naar de rand van de pallet worden geschoven? … | **75% (Aanbevolen).** | Gekozen: "75% (Aanbevolen)" |

## 3. Besluiten

| Nr | Onderwerp | Bron | Gevolg in V1.5 |
|---|---|---|---|
| 49 | Standaard minimaal 2 | Punt 1 | De standaard voor het min. aantal binnendozen per buitendoos (#41) en het min. aantal buitendozen per laag (#42) wordt 2 (was 1). Het invoerscherm wordt voorgevuld met die standaard uit Instellingen. Opgeslagen instellingen of een back-up van vóór V1.5 waarin nog de oude standaard 1 staat, krijgen eenmalig 2; een andere waarde blijft staan, en een 1 die de gebruiker daarna zelf kiest ook. Per berekening blijft 1 toegestaan. |
| 50 | Dozen tegen de rand van de drager | Punt 2 | Na de rangschikking schuift de app bij de getoonde oplossingen de dozen van elke laag naar de randen van de drager: een doos links van het midden naar links, een doos rechts van het midden naar rechts; een doos op het midden blijft gecentreerd. Eerst in de breedte, dan in de lengte. Dozen houden hun volgorde en schuiven tot de rand of tot de doos ernaast. Mag dat niet in beide richtingen (#51), dan alleen in de breedte, dan alleen in de lengte; anders blijft de lading zoals gevonden. Het zwaartepunt van de stapel mag daarbij niet verder uit het midden raken (hooguit 2 mm), zodat het gewicht zo gelijk mogelijk verdeeld blijft. Aantallen, hoogte en gewicht veranderen niet, dus de rangorde ook niet. Zo komt het gewicht gelijker over de drager. Bij een laag als in afbeelding 2, zoals in praktijkcase 1000466, staat doos 3 daarna tegen de rechterrand. |
| 51 | Ondersteuning bij uitlijnen | Punt 2, vraag V2 | Een verschuiving telt alleen als elke doos minstens 75% van zijn grondvlak op de dozen eronder houdt, of, als hij al minder steun had, er niet op achteruitgaat. Verder blijft het midden van een doos boven zijn steunvlak als het daar lag, blijft een laagpaar in verband in verband (#34) en wordt de overhang nooit groter. Het percentage staat in Instellingen: "Min. ondersteuning bij uitlijnen", standaard 75%, in te stellen van 0 tot 100%. Het is een vlaktoets, geen beoordeling van stabiliteit of druksterkte. |
| 52 | PDF standaard Nederlands | Punt 3 | Het PDF is standaard Nederlands: in het detailpaneel, bij **Naar overzicht** vanuit de geschiedenis en dus ook voor een nieuwe regel in het overzicht. Engels kies je bij het exporteren of per regel in het overzicht. De instelling "Standaardtaal" vervalt; een opgeslagen standaardtaal wordt genegeerd. Bestaande regels in het overzicht houden hun taal. |
| 53 | Voorbeeldbestanden voor de Excel-import | Punt 4 | Twee voorbeeldbestanden om te downloaden. `voorbeeld-artikelen.xlsx` (link op het scherm Excel-import) heeft in rij 1 de koppen: A Artikelcode, B Lengte binnendoos (mm), C Breedte binnendoos (mm), D Hoogte binnendoos (mm), E Gewicht binnendoos incl. inhoud (kg), F Aantal artikelen per binnendoos, G Omschrijving. `voorbeeld-leverdata.xlsx` (link in het overzicht) heeft A Artikelcode en B Verwachte leverdatum. Beide hebben een tweede werkblad Uitleg. De import herkent de koppen en eenheden zelf; een onaangeroerd voorbeeld levert geen rijen op. |
| 54 | Kantelen mag, maar hoeft niet | Punt 5, vraag V1 | Kantelbaar betekent dat de app met kantelen mag rekenen, niet dat het moet. Een gekantelde oplossing doet in de rangschikking alleen mee als ze minstens 10% meer binnendozen per drager geeft dan de beste rechtopstaande oplossing, ook als die geen collimodule heeft (#33). Daarna gaat binnen de overgebleven oplossingen de collimodule voor (#5). Een gekantelde collimodule-doos wint dus niet meer van een rechtopstaande doos met meer binnendozen per drager, en een rechtopstaande collimodule-doos gaat, zoals in V1.4, voor op een gekantelde doos zonder collimodule. De hoogte telt niet mee voor de collimodule (#9); dat was al zo en blijft zo. Een doos van een halve europallet, zoals 684 × 564 mm, is geen collimodule; de modulematen blijven die van #31. |
| 55 | Vormregel per stand | Punt 5, vraag V1 | De uitzondering op de vormregel (#43) gaat uit van de stand rechtop: een doos met één laag binnendozen mag altijd hoger zijn dan breed als de binnendoos rechtop staat, ook als hij kantelbaar is. In een gekantelde stand geldt de uitzondering alleen als die stand niet hoger is dan rechtop. Tot nu toe gold de uitzondering alleen voor de laagste stand. Bij een kantelbare binnendoos als 134 × 550 × 553 mm (liggend 134 mm hoog) viel daardoor elke rechtopstaande doos af, en won een gekantelde doos met 24 binnendozen per drager, terwijl rechtop 30 past. |
| 56 | Zoeken in het overzicht | Punt 6 | Zoekbalk boven het overzicht. Zoekt op (een deel van) het artikelnummer of de omschrijving; hoofdletters maken niet uit. Werkt samen met sorteren en verbergen. Het overzicht meldt hoeveel regels zichtbaar zijn. De zoekterm wordt niet onthouden. |
| 57 | Geen buitendoos | Punt 7 | Vinkje **Geen buitendoos** bij de buitendoos op het rekenscherm (instap binnendoos of artikel), standaard uit. Het wordt per artikel opgeslagen (tabblad Artikelen, of bij opslaan vanaf het rekenscherm); een herimport uit Excel laat het staan. Aan: de binnendoos zelf gaat op de drager, in elke toegestane stand (rechtop altijd, gekanteld alleen als dat mag). Doostype, max. gevulde buitendoos, min. per doos, vormregel en min./max. buitenmaat gelden dan niet. Het min. per laag, hoogte, totaalgewicht, overhang, collimodule, rangschikking en uitlijnen gelden wel. Resultaten, overzicht, geschiedenis en PDF tonen "geen buitendoos". |
| 58 | Invulvelden op gelijke hoogte | Punt 8 | In elke rij invulvelden staan de invoervakken op gelijke hoogte. Loopt een label over twee regels, zoals bij de binnendoos in afbeelding 3, dan zakken alle invoervakken in die rij even ver mee. Een hint onder één veld verschuift de buren niet; vinkjes in een rij staan op de hoogte van de invoervakken. Dit geldt voor binnendoos, buitendoos en ladingdrager en ook voor de andere invulschermen. |
| 59 | Hoekprofielen en stretchfolie in de tekening | Punt 9 | Staan hoekprofielen of stretchfolie aan, dan tekent de app ze in de 3D-tekening van de lading, op het scherm en in het PDF. Vier L-vormige hoekprofielen staan op de staande ribben van de lading, van bodemvel (of palletdek) tot de bovenkant. De folie is doorzichtig, met wikkellijnen, en loopt vanaf het palletdek om lading en hoekprofielen heen. Ze tellen zoals voorheen alleen mee in het gewicht (#12); hoogte, maatvoering en bovenaanzichten veranderen niet. |
