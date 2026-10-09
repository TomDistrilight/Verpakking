// Gegevenstypen van de rekenmodule. Alle lengtes in mm, massa's in kg.
//
// Assenstelsel op de drager (ontwerp §4.2): "voor" is een korte zijde van de drager.
// x loopt van links naar rechts over de breedte, y van voor naar achter over de lengte.
// De oorsprong ligt linksvoor.

export type As = 'L' | 'B' | 'H';

export interface Binnendoos {
  L: number;
  B: number;
  /** Hoogte als de doos rechtop staat. */
  H: number;
  /** Gevuld gewicht in kg. */
  gewicht: number;
  kantelbaar: boolean;
  /** Alleen van belang als kantelbaar: welke andere as verticaal mag staan. H mag altijd. */
  magVerticaal: { L: boolean; B: boolean };
}

export type Doostype =
  | { soort: '0201' }
  | { soort: 'custom'; toeslagL: number; toeslagB: number; toeslagH: number; kartonmassa: number };

export interface BestaandeBuitendoos {
  /** Buitenmaat. */
  L: number;
  B: number;
  H: number;
  /** Gevuld gewicht; als het ontbreekt, berekend uit eigen gewicht en inhoud. */
  gevuldGewicht?: number;
  binnendozenPerDoos?: number;
  /** Binnenmaat, om te berekenen hoeveel binnendozen erin passen. */
  binnenmaat?: { L: number; B: number; H: number };
  eigenGewicht?: number;
}

export interface Overhang {
  voor: number;
  achter: number;
  links: number;
  rechts: number;
}

export interface Drager {
  id: string;
  naam: string;
  type: 'pallet' | 'kar';
  /** Ladingvlak van voor naar achter (bij een kar: binnenmaat). */
  lengte: number;
  /** Ladingvlak van links naar rechts (bij een kar: binnenmaat). */
  breedte: number;
  /** Eigen hoogte; bij een kar de vloerhoogte. */
  hoogte: number;
  gewicht: number;
  maxTotaalGewicht: number;
  maxTotaleHoogte: number;
  overhangToegestaan: boolean;
  overhang: Overhang;
  asymmetrieToegestaan: boolean;
}

export interface Tussenlaag {
  soort: 'geen' | 'karton' | 'hout';
  naElkeN: number;
  dikte: number;
  gewicht: number;
  maat: 'drager' | 'lading';
}

export interface Vel {
  aan: boolean;
  dikte: number;
  gewicht: number;
}

export interface Materiaal {
  bodemvel: Vel;
  topvel: Vel;
  hoekprofielen: { aan: boolean; gewicht: number };
  folie: { aan: boolean; gewicht: number };
}

export interface MaatGrens {
  L?: number;
  B?: number;
  H?: number;
}

/**
 * Vormregel voor een ontworpen buitendoos: niet hoger dan zijn breedte (korte zijde) of zijn lengte
 * (lange zijde). Een doos met één laag binnendozen mag altijd, want dan bepaalt de binnendoos de hoogte.
 */
export type Vormregel = 'breedte' | 'lengte' | 'uit';

export interface Invoer {
  instap: 'binnendoos' | 'bestaandeBuitendoos';
  artikelcode: string;
  omschrijving?: string;
  artikelenPerBinnendoos: number;
  /** Verplicht bij instap binnendoos; bij een bestaande buitendoos alleen nodig om de inhoud te berekenen. */
  binnendoos?: Binnendoos;
  bestaandeBuitendoos?: BestaandeBuitendoos;
  doostype: Doostype;
  maxGevuldGewicht: number;
  minBuitenmaat?: MaatGrens;
  maxBuitenmaat?: MaatGrens;
  /** Minimaal aantal binnendozen per ontworpen buitendoos; ontbreekt = 1. Geldt niet voor een bestaande buitendoos. */
  minBinnendozenPerDoos?: number;
  /** Minimaal aantal buitendozen in elke laag op de drager; ontbreekt = 1. */
  minBuitendozenPerLaag?: number;
  /** Vormregel voor ontworpen buitendozen; ontbreekt = uit. */
  vormregel?: Vormregel;
  /**
   * Geen buitendoos: de binnendoos gaat zelf op de drager (bijvoorbeeld bij een groot of zwaar artikel).
   * Alleen bij instap binnendoos. Doostype, max. gevulde buitendoos, min. per doos en vormregel gelden dan niet.
   */
  zonderBuitendoos?: boolean;
  /** Minimale ondersteuning (0–1) van een doos bij het uitlijnen tegen de rand van de drager; ontbreekt = 0,75. */
  minSteun?: number;
  drager: Drager;
  tussenlaag: Tussenlaag;
  materiaal: Materiaal;
  /** Maximaal aantal te testen voetafdrukken (afkappen op aantal, niet op tijd). */
  zoeklimiet?: number;
}

/** Een doos in een laag. w loopt langs x (breedte), d langs y (lengte). */
export interface Rechthoek {
  x: number;
  y: number;
  w: number;
  d: number;
}

export interface Stand {
  /** Welke as van de binnendoos verticaal staat. */
  verticaal: As;
  /** Welke as van de binnendoos langs de lengte (L) van de buitendoos ligt. */
  langsL: As;
  langsB: As;
}

export interface Buitendoos {
  /** Buitenmaat, altijd L ≥ B. */
  L: number;
  B: number;
  H: number;
  binnenmaat: { L: number; B: number; H: number } | null;
  indeling: { nL: number; nB: number; nH: number; stand: Stand } | null;
  binnendozenPerDoos: number | null;
  eigenGewicht: number | null;
  kartonOppervlak: number | null;
  gevuldGewicht: number;
  gekanteld: boolean;
  bestaand: boolean;
  /** Geen buitendoos: dit is de binnendoos zelf, direct op de drager. */
  geenBuitendoos?: boolean;
  /** Collimodule-voetafdruk, bijvoorbeeld "600 × 400", of null. */
  module: string | null;
}

export interface Laag {
  /** Dozen in dragercoördinaten na plaatsing (kan negatief zijn bij overhang). */
  dozen: Rechthoek[];
}

export type Stapelwijze = 'recht' | 'verband';

export interface Oplossing {
  id: string;
  doos: Buitendoos;
  stapelwijze: Stapelwijze;
  /** Unieke laagpatronen: [A] bij recht, [A, B] bij verband. */
  lagen: Laag[];
  /** Per laag (van onder naar boven) de index in `lagen`. */
  laagVolgorde: number[];
  aantalLagen: number;
  buitendozenPerDrager: number;
  binnendozenPerDrager: number | null;
  artikelenPerDrager: number | null;
  /** Na welke lagen (1-gebaseerd) een tussenlaag ligt. */
  tussenlaagNa: number[];
  totaleHoogte: number;
  totaalGewicht: number;
  overhang: Overhang;
  /** Omhullende van drager en lading samen, inclusief overhang. */
  omhullende: { breedte: number; lengte: number };
  moduleAfstand: number | null;
  /** Het aantal dozen per laag is bewezen maximaal; anders is het de beste gevonden indeling. */
  laagBewezen: boolean;
}

export type Rol = 'winnaar' | 'verband' | 'nietGekanteld' | 'alternatief';

export interface TopOplossing {
  oplossing: Oplossing;
  rol: Rol;
  uitleg: string[];
}

export interface Resultaat {
  invoer: Invoer;
  /** Alle geldige oplossingen, in rangorde. */
  oplossingen: Oplossing[];
  top: TopOplossing[];
  geenOplossing: string[];
  log: {
    kandidaten: number;
    voetafdrukken: number;
    afgekapt: boolean;
    afgewezen: Record<string, number>;
    /** De laagindeling van de voorkeursoptie is niet bewezen maximaal. */
    laagNietBewezen: boolean;
  };
}
