# Besluiten ronde 2 — vervolgvragen verpakkingsapp V1

**Bron:** tabel 8 van de vragenlijst "Open vragen verpakkingsapp V1" (Claude Docs), beantwoord op 8 oktober 2026. Het antwoord is letterlijk overgenomen. Kolom **Gevolg** zegt hoe het in versie 1.3 van het functioneel ontwerp is verwerkt.

| Nr | Onderwerp | Voorstel | Antwoord | Gevolg in V1.3 |
|---|---|---|---|---|
| 31 | Collimodule-maten | 600 × 400, 400 × 300, 300 × 200 en 200 × 150 mm buitenmaat, per as hoogstens 10 mm kleiner, alleen op de europallet. Verband blijft als alternatief zichtbaar. | Akkoord met het voorstel | Overgenomen. |
| 32 | Opvullen tot modulemaat | Nee. | Akkoord met het voorstel | De app vult geen dozen op tot een modulemaat. |
| 33 | Kantelregel voor de binnendoos | Een oplossing met gekantelde binnendozen wint alleen bij minstens 10% meer binnendozen per drager. De beste niet-gekantelde blijft in de top drie. | Akkoord met het voorstel | Overgenomen. |
| 34 | Verband meetbaar maken | Minstens de helft van de dozen steunt op twee of meer dozen eronder, met minstens 50 mm overlap. | Akkoord met het voorstel | Overgenomen. |
| 35 | Excel-kolommen | (a) Kolom artikelnummer; dat nummer wordt de PDF-bestandsnaam. Maten in mm, gewicht in kg inclusief inhoud, H is de hoogte rechtop. Artikelen per binnendoos standaard 1, handmatig aan te passen. | Akkoord met het voorstel. Toevoeging, aantal artikelen per binnendoos staat ook in de excel. Standaard is dit 1 maar is handmatig aan te passen. | Importkolom "aantal artikelen per binnendoos" toegevoegd; leeg = 1. |
| 36 | Eén binnendoos per artikel | Ja. Een herimport met een andere maat overschrijft na bevestiging. | Akkoord met het voorstel | Overgenomen. |
| 37 | PDF-opbouw | Pagina 1 plus vervolgpagina's per laag. Geen eigen foto's in V1. | Alle informatie mag op 1 pagina. Er moet gekozen kunnen worden tussen nederlandse of engelse uitdraai. Visuele tekening van de verpakkingen en ladingdragers zoals hieronder. (afbeelding: `afbeeldingen/tekening-voorbeeld.png`) | PDF is één pagina, NL of EN. Tekeningen zoals het voorbeeld: open buitendoos met binnendozen, lading met lagen en maatvoering. |
| 38 | Hosting | Cloud. | Hij draait op github | Statische webapp op GitHub Pages; berekeningen en gegevens in de browser, met export/import als back-up. |
| 39 | Hoogte europallet | 144 mm, de EPAL-maat. | Akkoord met het voorstel | Europallet 1200 × 800 × 144 mm; acceptatiewaarden herberekend. |
| 40 | Praktijkcases | Maten blijven; artikelcode en gewicht volgens antwoord. QTY 2028463 = 24. | Articelcode en maten aanhouden en qty = 10 | Case 1042794 houdt artikelcode, maten en gewicht 18,8 kg; QTY = 10 binnendozen per buitendoos. QTY 2028463 blijft 24. |
