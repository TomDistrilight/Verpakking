# Besluiten ronde 3 — wensen na de eerste versie van de app

**Bron:** drie punten die de gebruiker na het werken met de eerste versie van de app heeft aangeleverd, plus twee verduidelijkende vragen, beantwoord op 9 oktober 2026. De punten en de antwoorden zijn letterlijk overgenomen. De besluiten 41–48 zeggen hoe ze in versie 1.4 van het functioneel ontwerp zijn verwerkt.

## 1. De punten (letterlijk)

> Ik heb nog 3 punten die ik graag anders zie of nog wil toevoegen.

**Punt 1**

> Er moet een veld bij komen waarbij je minimaal aantal binnendozen in buitendozen kan invullen. En een minimaal aantal buitendozen per laag op de drager. Standaard is dit veld ingevuld met 1.
>
> Momenteel worden er dozen voorgesteld waarbij er 1 binnendoos in de buitenverpakking zit of waarbij de buitenverpakking de grootte van de hele europallet hebben. Dit is echter niet wenselijk.

**Punt 2**

> Daarnaast heb ik nog een voorkeursregel. Bredere en langere dozen hebben de voorkeur tegenover hogere dozen.
>
> Er zijn nu heel veel voorstellen waarbij er 1 laag breed is en vervolgens 14 lagen hoog. Dit Zal nooit een gekozen oplossing worden.

**Punt 3**

> Gekozen oplossingen moeten opgeslagen worden op een tabblad Dit wordt een overzicht van alle gemaakte oplossingen en ook om de status bij te houden. Dan heeft iedere oplossing zijn eigen regel met daarin een vakje voor verwachte levertijd, fysiek gecontroleerd en je moet vanuit daar de taal voor de pdf gekozen kunnen worden en de PDF geëxporteerd kunnen worden.
>
> In dat overzicht moet een vakje zijn om aan te vinken of het fysiek gecontroleerd is. Deze kan aangevinkt worden om te controleren of de dozen en artikelen geleverd zijn zoals afgesproken met de leverancier en afdeling inkoop.
>
> Er moet hier een vakje zijn waar je de verwachte leverdatum. Je moet hierop kunnen sorteren van vroeg naar laat en aan of uit kunnen vinken dat oplossingen die al gecontroleerd zijn verborgen worden.
>
> Om de leverdatum aan te leveren kan dit handmatig ingevoerd worden per regel. Of via een excel wordt een lijst ingeladen met in kolom A de articelcode en kolom B de verwachte leverdatum. Vanuit daar wordt de verwachte leverdatum ingevuld of overschreven van nog niet gecontroleerde oplossingen. De informatie wordt aangevuld, maar er worden geen nieuwe artikelen aangemaakt vanuit die import.

## 2. Verduidelijkende vragen

Vraag en antwoord zijn letterlijk overgenomen. De toelichting bij de aanbevolen opties is samengevat.

| Nr | Onderwerp | Vraag | Voorgestelde opties | Antwoord |
|---|---|---|---|---|
| V1 | Vormregel | Hoe sterk moet de voorkeur breder en langer gaat voor hoger werken? | **Niet hoger dan breed (Aanbevolen):** winnaar en top drie alleen uit dozen die niet hoger zijn dan hun korte zijde; aan te passen in de instellingen; bij een gelijk aantal gaat de plattere doos voor. **Niet hoger dan lang.** **Alleen bij gelijk aantal.** | Eigen antwoord: "Het mag niet hoger zijn dan dat het breed of lang is, Tenzij dit niet gaat door de hoogte van de binnendoos" |
| V2 | Overzicht | Wat gebeurt er in het overzicht als je voor een artikel opnieuw een oplossing kiest? | **Open regel vervangen (Aanbevolen):** heeft het artikel al een regel die nog niet fysiek gecontroleerd is, dan vervangt de nieuwe oplossing die regel en blijft de verwachte leverdatum staan; is de oude regel al gecontroleerd, dan komt er een nieuwe regel bij. | Gekozen: "Open regel vervangen (Aanbevolen)" |

## 3. Besluiten

| Nr | Onderwerp | Bron | Gevolg in V1.4 |
|---|---|---|---|
| 41 | Min. binnendozen per buitendoos | Punt 1 | Nieuw invoerveld "min. binnendozen per buitendoos", per berekening in te vullen, standaard 1; de standaardwaarde staat in Instellingen. Een nieuw ontworpen buitendoos met minder binnendozen valt af. Geldt niet voor een bestaande buitendoos: die ligt vast. Past het minimum niet binnen het max. gevulde doosgewicht, dan zegt de melding dat, bijvoorbeeld "12 binnendozen wegen samen al 24 kg; het maximum per buitendoos is 23 kg." |
| 42 | Min. buitendozen per laag | Punt 1 | Nieuw invoerveld "min. buitendozen per laag", per berekening in te vullen, standaard 1; de standaardwaarde staat in Instellingen. Geldt voor elke laag, ook bij verband en ook bij een bestaande buitendoos. Bij een minimum van 2 of meer valt een doos zo groot als de hele europallet dus af. |
| 43 | Vormregel: breder en langer gaat voor hoger | Punt 2, vraag V1 | Een ontworpen buitendoos mag niet hoger zijn dan zijn breedte (de korte zijde). Het antwoord noemt breed én lang: standaard geldt de strengste grens, de breedte; dan is de doos ook niet hoger dan lang. Instelling "vormregel" in Instellingen: breedte (standaard), lengte of uit. Uitzondering ("tenzij dit niet gaat door de hoogte van de binnendoos"): een doos met precies één laag binnendozen mag altijd, want dan bepaalt de binnendoos de hoogte. De regel streept kandidaten weg, dus de winnaar en de hele top drie voldoen eraan. Geldt niet voor een bestaande buitendoos. |
| 44 | Plattere doos eerst | Punt 2, vraag V1 | Nieuwe eerste sleutel in de volgorde bij gelijke stand, direct na het aantal per drager: de doos met de laagste hoogte ten opzichte van zijn breedte gaat voor. Geldt ook als de vormregel uit staat. |
| 45 | Tabblad Overzicht | Punt 3 | Nieuw tabblad **Overzicht** met alle gekozen oplossingen, één regel per oplossing. Een oplossing komt erin met **Opslaan in overzicht** op het rekenscherm of **Naar overzicht** in de geschiedenis. Per regel kiest de gebruiker de taal (NL of EN) en exporteert hij het PDF. Het overzicht zit in back-up, terugzetten en wissen. |
| 46 | Status: fysiek gecontroleerd en verwachte leverdatum | Punt 3 | Per regel een vinkje "fysiek gecontroleerd" (dozen en artikelen geleverd zoals afgesproken met de leverancier en de afdeling inkoop) en een datumveld "verwachte levering", per regel handmatig te wijzigen. "Levertijd" en "leverdatum" zijn hetzelfde veld: een datum. Sorteren op verwachte levering van vroeg naar laat (regels zonder datum achteraan), op artikelnummer of laatst gekozen eerst. Een schakelaar verbergt de gecontroleerde oplossingen. Sortering en schakelaar worden onthouden. |
| 47 | Leverdata importeren | Punt 3 | Excel of CSV met in kolom A het artikelnummer en in kolom B de verwachte leverdatum. De import vult de datum in of overschrijft die, alleen bij regels die nog niet gecontroleerd zijn. Onbekende artikelnummers worden overgeslagen; de import maakt geen artikelen en geen regels aan. Een eerste rij zonder geldige datum geldt als kopregel. Vóór het toepassen toont de app per rij wat er gebeurt. |
| 48 | Opnieuw kiezen voor een artikel | Vraag V2 | Heeft het artikel een open regel (nog niet fysiek gecontroleerd), dan vervangt de nieuwe oplossing die regel; verwachte leverdatum en taal blijven staan. Is de regel al gecontroleerd, dan blijft die staan en komt er een nieuwe regel bij. |
