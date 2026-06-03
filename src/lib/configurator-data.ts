// ═══════════════════════════════════════════════════════════════════════════════
// ORALIS — Configurateur Pergola & Grilles de Tarifs Multi-critères
// ═══════════════════════════════════════════════════════════════════════════════

import { uid } from "@/lib/quote-data";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Grille matricielle Largeur × Profondeur (ou Hauteur) */
export interface GrilleTarif {
  largeurs: number[];    // en mm
  profondeurs: number[]; // en mm (profondeur ou hauteur selon type_dim)
  prixAchatHT: number[][];
}

/** Surcharge toiture ou couleur */
export interface OptionConfigurable {
  id: string;
  nom: string;
  surchargeHT: number;
  surchargePct: number;
  modeCalcul?: "forfait" | "ml" | "m2";
}

/** Règle de calcul automatique du nombre de poteaux selon largeur & profondeur */
export interface ReglePoteau {
  largeurMinMm: number;
  largeurMaxMm: number;
  profondeurMinMm?: number;
  profondeurMaxMm?: number;
  nombrePoteaux: number;
}

/** Modèle de pergola ou screen configurable */
export interface ModelePergola {
  id: string;
  typeModele?: "pergola" | "screen" | "volet" | "paroi";
  nom: string;                    // nom catalogue ORALIS — visible client
  nomFournisseur: string;         // nom MB Aluminium — usage interne uniquement
  fournisseurId: string;
  fournisseurNom: string;
  typeDim: "largeur_profondeur" | "largeur_hauteur";
  margeDefaut: number;            // coefficient ex: 1.4
  grille: GrilleTarif;
  toitures: OptionConfigurable[];
  couleurs: OptionConfigurable[];
  optionsSupp?: OptionConfigurable[]; // options supplémentaires pour screens/volets
  reglesPoteau: ReglePoteau[];    // calcul automatique nb poteaux
  templateDescription: string;   // template avec {{variables}} pour le devis
  image?: string;                 // image optionnelle du modèle
  sectionPoteaux?: string;        // ex: "136x136 mm"
  tarifPoteauSuppHT?: number;     // prix d'achat par ml pour poteaux supp
  isMBPrime?: boolean;            // flag optionnel pour identifier le modèle MB PRIME
  isAdaptAir?: boolean;           // flag optionnel pour identifier le modèle Adapt AIR
}

export interface TarifPanneau {
  id: string;
  label: string;      // "Verre clair standard", "Verre teinté sur mesure"...
  prixHT: number;     // Prix d'achat HT par panneau (ex: 145)
  description: string; // Contenu inclus dans ce tarif
}

export interface ModeleCoulissant {
  id: string;
  typeModele: "coulissant";
  nom: string;            // Nom catalogue ORALIS (visible client)
  nomFournisseur: string; // "PAROIS COULISSANTES MB"
  fournisseurId: string;
  fournisseurNom: string;
  margeDefaut: number;
  vantauxMin: number;     // 2
  vantauxMax: number;     // 6
  tarifsPanneau: TarifPanneau[];  // Remplace la grille 2D
  options: OptionConfigurable[];  // Serrure, poignée supp, etc.
  couleurs: OptionConfigurable[]; // Couleurs / Finitions
  templateDescription: string;
  image?: string;                 // image optionnelle du modèle
}

export interface ModeleParoiFixe {
  id: string;
  typeModele: "paroi_fixe";
  nom: string;            // Nom catalogue ORALIS (visible client)
  nomFournisseur: string; // ex: "PAROIS FIXES MB"
  fournisseurId: string;
  fournisseurNom: string;
  margeDefaut: number;
  couleurs: OptionConfigurable[]; // Couleurs / Finitions
  templateDescription: string;
  image?: string;
}

export interface ModeleParoiGrille {
  id: string;
  typeModele: "paroi_avec_grille";
  nom: string;
  nomFournisseur: string;
  fournisseurId: string;
  fournisseurNom: string;
  margeDefaut: number;
  typesParoi: {
    id: string;
    nom: string;
    // largeurs en mm → prix achat HT
    largeurs: number[];
    prixAchatHT: number[];
  }[];
  couleurs: OptionConfigurable[];
  templateDescription: string;
  image?: string;
}

export type AnyModele = ModelePergola | ModeleCoulissant | ModeleParoiFixe | ModeleParoiGrille;


/** Résultat de calcul complet */
export interface ResultatCalcul {
  prixAchatBaseHT: number;
  surchargeToitureHT: number;
  surchargeCouleurHT: number;
  surchargePoteauxAchatHT?: number; // Surcharge poteaux pour ORIS SOLID
  surchargeOptionsSuppHT?: number;  // Surcharge options supplémentaires
  prixAchatTotalHT: number;
  coefficient: number;
  prixVenteHT: number;
  largeurGrille: number;
  profondeurGrille: number;
  nombrePoteaux: number;
  hauteurPoteaux?: number;   // en mm
  poteauxSupp?: number;      // quantité
  longueurPoteauxSupp?: number; // en mm
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "oralis_modeles_pergola";

/**
 * Migration auto : corrige les modèles enregistrés en cm (valeurs < 2000) → mm ×10.
 * S'exécute silencieusement au premier chargement après import cm.
 */
export function blankModeleMBPrime(): ModelePergola {
  return {
    id: uid(),
    typeModele: "pergola",
    nom: "MB PRIME",
    nomFournisseur: "PERGOLA BIOCLIMATIQUE MB PRIME",
    fournisseurId: "mb_partner",
    fournisseurNom: "MB Aluminium",
    typeDim: "largeur_profondeur",
    margeDefaut: 1.4,
    grille: {
      largeurs:    [3000, 4000, 5000, 6000],
      profondeurs: [2000, 2500, 3000, 3500, 4000],
      prixAchatHT: [
        [3200, 3800, 4400, 5000],
        [3500, 4200, 4900, 5600],
        [3800, 4600, 5400, 6200],
        [4100, 5000, 5900, 6800],
        [4400, 5400, 6400, 7400],
      ],
    },
    toitures: [
      { id: uid(), nom: "Lames aluminium plates", surchargeHT: 0, surchargePct: 0 },
    ],
    couleurs: [
      { id: uid(), nom: "RAL 9016 Blanc", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 7016 Anthracite", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 9005 Noir", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL Spécifique (sur demande)", surchargeHT: 250, surchargePct: 0 },
    ],
    reglesPoteau: [
      { largeurMinMm: 0,     largeurMaxMm: 6060,  nombrePoteaux: 2 },
      { largeurMinMm: 6061,  largeurMaxMm: 9060,  nombrePoteaux: 3 },
      { largeurMinMm: 9061,  largeurMaxMm: 12060, nombrePoteaux: 4 },
    ],
    templateDescription: `{{nom}} sur mesure
Configuration : Pergola {{type_pose}} — {{orientation_lames}}
Dimensions : Largeur {{largeur}} × Profondeur {{profondeur}} — {{poteaux}} poteaux (hauteur {{hauteur_poteaux}})
Couverture : {{toiture}}
Couleur structure : {{couleur}}
Couleur lames : {{couleur_lames}}
Motorisation : Piloté par SOMFY avec télécommande (compris)
Éclairage : Strip LED périphérique dimmable (compris)
Structure aluminium thermolaquée — résistance aux UV et aux intempéries
Fabrication entièrement sur mesure`,
    optionsSupp: [
      { id: "opt_eclairage_rgb", nom: "Éclairage RGB", surchargeHT: 550, surchargePct: 0 }
    ],
    image: "",
    sectionPoteaux: "",
    tarifPoteauSuppHT: 0,
    isMBPrime: true,
  };
}

export function blankModeleAdaptAir(): ModelePergola {
  return {
    id: uid(),
    typeModele: "pergola",
    nom: "Adapt AIR",
    nomFournisseur: "PERGOLA ADAPT AIR",
    fournisseurId: "mb_partner",
    fournisseurNom: "MB Aluminium",
    typeDim: "largeur_profondeur",
    margeDefaut: 1.4,
    grille: {
      largeurs:    [3000, 4000, 5000, 6000],
      profondeurs: [2000, 2500, 3000, 3500, 4000],
      prixAchatHT: [
        [3200, 3800, 4400, 5000],
        [3500, 4200, 4900, 5600],
        [3800, 4600, 5400, 6200],
        [4100, 5000, 5900, 6800],
        [4400, 5400, 6400, 7400],
      ],
    },
    toitures: [
      { id: uid(), nom: "B 8118 / 7500", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "B 8118 / 6028", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "B 8118 / 1622", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "B 8118 / 3017", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "B 8118 / 9002", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "B 8118 / 7999", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "B 8118 / 7024", surchargeHT: 0, surchargePct: 0 },
    ],
    couleurs: [
      { id: uid(), nom: "RAL 9010 Blanc (Zuiverblanc)", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 7016 Anthracite", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 9005 Noir", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL Spécifique (sur demande)", surchargeHT: 250, surchargePct: 0 },
    ],
    reglesPoteau: [
      { largeurMinMm: 0,     largeurMaxMm: 6060,  nombrePoteaux: 2 },
      { largeurMinMm: 6061,  largeurMaxMm: 9060,  nombrePoteaux: 3 },
      { largeurMinMm: 9061,  largeurMaxMm: 12060, nombrePoteaux: 4 },
    ],
    templateDescription: `{{nom}} sur mesure
Configuration : Pergola {{type_pose}}
Dimensions : Largeur {{largeur}} × Profondeur {{profondeur}} — {{poteaux}} poteaux (hauteur {{hauteur_poteaux}})
Couverture : Toile {{toiture}}
Couleur structure : {{couleur}}
Couleur toile : {{couleur_toile}}
Motorisation : Piloté par SOMFY avec télécommande (compris)
Éclairage : Strip LED périphérique dimmable (compris)
Structure aluminium thermolaquée — résistance aux UV et aux intempéries
Fabrication entièrement sur mesure`,
    optionsSupp: [],
    image: "",
    sectionPoteaux: "",
    tarifPoteauSuppHT: 0,
    isAdaptAir: true,
  };
}

function migrateModeles(modeles: AnyModele[]): AnyModele[] {
  let migrated = false;
  const fixed = modeles.map((m) => {
    if (m.typeModele === "coulissant") {
      let copy = { ...m } as ModeleCoulissant;
      if (!copy.couleurs || copy.couleurs.length === 0) {
        copy.couleurs = [
          { id: uid(), nom: "RAL 9016 Blanc", surchargeHT: 0, surchargePct: 0 },
          { id: uid(), nom: "RAL 7016 Anthracite FST", surchargeHT: 0, surchargePct: 0 },
          { id: uid(), nom: "RAL 9007 Gris métallique FST", surchargeHT: 0, surchargePct: 0 },
          { id: uid(), nom: "RAL 9005 Noir FST", surchargeHT: 0, surchargePct: 0 },
          { id: uid(), nom: "DB703 Gris pailleté", surchargeHT: 0, surchargePct: 0 },
        ];
        migrated = true;
      }
      return copy;
    }
    if (m.typeModele === "paroi_fixe") {
      let copy = { ...m } as ModeleParoiFixe;
      if (!copy.couleurs || copy.couleurs.length === 0) {
        copy.couleurs = [
          { id: uid(), nom: "Blanc RAL 9016", surchargeHT: 0, surchargePct: 0 },
          { id: uid(), nom: "Gris métallique RAL 9007", surchargeHT: 0, surchargePct: 0 },
          { id: uid(), nom: "IJzerglimmer DB703", surchargeHT: 0, surchargePct: 0 },
          { id: uid(), nom: "Anthracite RAL 7016", surchargeHT: 0, surchargePct: 0 },
          { id: uid(), nom: "Noir RAL 9005", surchargeHT: 0, surchargePct: 0 },
        ];
        migrated = true;
      }
      return copy;
    }
    if (m.typeModele === "paroi_avec_grille") {
      return m;
    }
    let copy = { ...m } as ModelePergola;
    if (!copy.typeModele) {
      copy.typeModele = "pergola";
      migrated = true;
    }
    if (!copy.optionsSupp) {
      copy.optionsSupp = [];
      migrated = true;
    }

    const isPrime = copy.isMBPrime || copy.nom.toLowerCase().includes("prime");
    if (isPrime) {
      if (copy.templateDescription && copy.templateDescription.includes("Toit en lames aluminium plates")) {
        copy.templateDescription = copy.templateDescription.replace("Toit en lames aluminium plates", "{{toiture}}");
        migrated = true;
      }
      const hasRGB = copy.optionsSupp.some((o) => o.nom.toLowerCase().includes("rgb") || o.id === "opt_eclairage_rgb");
      if (!hasRGB) {
        copy.optionsSupp = [
          ...copy.optionsSupp,
          { id: "opt_eclairage_rgb", nom: "Éclairage RGB", surchargeHT: 550, surchargePct: 0 }
        ];
        migrated = true;
      }
    }

    const maxLarg = Math.max(...(copy.grille?.largeurs ?? [0]));
    if (maxLarg > 0 && maxLarg < 2000) {
      migrated = true;
      copy = {
        ...copy,
        grille: {
          ...copy.grille,
          largeurs:    copy.grille.largeurs.map((v) => Math.round(v * 10)),
          profondeurs: copy.grille.profondeurs.map((v) => Math.round(v * 10)),
        },
        reglesPoteau: (copy.reglesPoteau ?? []).map((r) =>
          r.largeurMaxMm < 2000
            ? { ...r, largeurMinMm: r.largeurMinMm * 10, largeurMaxMm: r.largeurMaxMm * 10 }
            : r
        ),
      };
    }
    return copy;
  });
  if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(fixed));
  return fixed;
}

export function loadModeles(): AnyModele[] {
  try { return migrateModeles(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return []; }
}

export function saveModeles(modeles: AnyModele[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modeles));
}

// ── Blank helpers ─────────────────────────────────────────────────────────────

export function blankGrille(): GrilleTarif {
  return {
    largeurs:    [3000, 4000, 5000, 6000],
    profondeurs: [2000, 2500, 3000, 3500, 4000],
    prixAchatHT: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  };
}

export function blankOption(): OptionConfigurable {
  return { id: uid(), nom: "", surchargeHT: 0, surchargePct: 0 };
}

/** Template description par défaut — variables remplacées à l'injection */
export const TEMPLATE_DEFAUT = `{{nom}} sur mesure
Dimensions : Largeur {{largeur}} × Profondeur {{profondeur}} — {{poteaux}} poteaux (hauteur {{hauteur_poteaux}})
Couverture : {{toiture}}
Couleur structure : {{couleur}}
Structure aluminium thermolaquée — résistance aux UV et aux intempéries
Fabrication entièrement sur mesure`;

export const VARIABLES_DISPONIBLES = [
  "{{nom}}",
  "{{largeur}}",
  "{{profondeur}}",
  "{{hauteur}}",
  "{{toiture}}",
  "{{couleur}}",
  "{{couleur_lames}}",
  "{{type_pose}}",
  "{{orientation_lames}}",
  "{{poteaux}}",
  "{{hauteur_poteaux}}",
  "{{poteaux_supp}}",
  "{{longueur_poteaux_supp}}",
  "{{moteur}}",
  "{{options_supp}}",
];

export function blankModele(): ModelePergola {
  return {
    id: uid(),
    typeModele: "pergola",
    nom: "",
    nomFournisseur: "",
    fournisseurId: "",
    fournisseurNom: "",
    typeDim: "largeur_profondeur",
    margeDefaut: 1.4,
    grille: blankGrille(),
    toitures: [
      { id: uid(), nom: "Polycarbonate transparent", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Verre clair", surchargeHT: 0, surchargePct: 15 },
      { id: uid(), nom: "Verre opale", surchargeHT: 0, surchargePct: 12 },
    ],
    couleurs: [
      { id: uid(), nom: "RAL 9016 Blanc", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 7016 Anthracite", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 9005 Noir", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL Spécifique (sur demande)", surchargeHT: 250, surchargePct: 0 },
    ],
    reglesPoteau: [
      { largeurMinMm: 0,     largeurMaxMm: 6060,  nombrePoteaux: 2 },
      { largeurMinMm: 6061,  largeurMaxMm: 9060,  nombrePoteaux: 3 },
      { largeurMinMm: 9061,  largeurMaxMm: 12060, nombrePoteaux: 4 },
    ],
    templateDescription: TEMPLATE_DEFAUT,
    optionsSupp: [],
    image: "",
    sectionPoteaux: "",
    tarifPoteauSuppHT: 0,
  };
}

export function blankModeleScreen(): ModelePergola {
  return {
    id: uid(),
    typeModele: "screen",
    nom: "",
    nomFournisseur: "",
    fournisseurId: "",
    fournisseurNom: "",
    typeDim: "largeur_hauteur",
    margeDefaut: 1.5,
    grille: blankGrille(),
    toitures: [
      { id: uid(), nom: "Blanc 92-2044",      surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Alu 92-2048",        surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Beige 92-2135",      surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Anthracite 92-2047", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Shea 92-50843",      surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Boulder 92-2171",    surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Taupe 92-50850",     surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Noir 92-51176",      surchargeHT: 0, surchargePct: 0 },
    ],
    couleurs: [
      { id: uid(), nom: "RAL 9016 Blanc",      surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 9007 Gris Métal", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "DB703 Gris Ardoise",  surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 7016 Anthracite", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 9005 Noir",       surchargeHT: 0, surchargePct: 0 },
    ],
    optionsSupp: [],
    reglesPoteau: [],
    templateDescription: `Screen ZIP motorisé Somfy sur mesure
Dimensions : Largeur {{largeur}} × Hauteur {{hauteur}}
Toile : {{toiture}} (Soltis Perform 92 — Serge Ferrari)
Couleur structure : {{couleur}}
Motorisation : Moteur Somfy — commande électrique
Fermeture éclair YKK — tension constante
Résistante à l'eau, à la saleté et aux UV
Fabrication entièrement sur mesure`,
    image: "",
    sectionPoteaux: "",
    tarifPoteauSuppHT: 0,
  };
}

export interface LabelsModele {
  toituresLabel: string;
  dim2Label: string;
  showPoteaux: boolean;
}

export function getLabelsModele(type?: string): LabelsModele {
  if (type === "screen" || type === "volet") {
    return {
      toituresLabel: "Couleur de la toile",
      dim2Label: "Hauteur",
      showPoteaux: false,
    };
  }
  if (type === "paroi_fixe") {
    return {
      toituresLabel: "Type de paroi",
      dim2Label: "Dimensions",
      showPoteaux: false,
    };
  }
  if (type === "paroi_avec_grille") {
    return {
      toituresLabel: "Type de paroi",
      dim2Label: "Largeur",
      showPoteaux: false,
    };
  }
  return {
    toituresLabel: "Toitures / Couvertures",
    dim2Label: "Profondeur",
    showPoteaux: true,
  };
}

// ── Calcul poteaux ────────────────────────────────────────────────────────────

/**
 * Calcule le nombre de poteaux en fonction de la largeur, de la profondeur et des règles définies.
 * Retourne 2 par défaut si aucune règle ne correspond.
 */
export function calculerPoteaux(
  regles: ReglePoteau[],
  largeurMm: number,
  profondeurMm: number = 0
): number {
  const regle = regles.find(
    (r) =>
      largeurMm >= r.largeurMinMm &&
      largeurMm <= r.largeurMaxMm &&
      (r.profondeurMinMm === undefined || profondeurMm >= r.profondeurMinMm) &&
      (r.profondeurMaxMm === undefined || profondeurMm <= r.profondeurMaxMm)
  );
  return regle?.nombrePoteaux ?? 2;
}

// ── Lookup matriciel avec arrondi supérieur ───────────────────────────────────

export function determinerPrixBase(
  grille: GrilleTarif,
  largeur: number,
  profondeur: number
): { prix: number; largeurGrille: number; profondeurGrille: number } {
  const colIdx = grille.largeurs.findIndex((w) => w >= largeur);
  const rowIdx = grille.profondeurs.findIndex((d) => d >= profondeur);

  if (colIdx === -1)
    throw new Error(`Largeur ${formatMM(largeur)} hors grille (max: ${formatMM(Math.max(...grille.largeurs))})`);
  if (rowIdx === -1)
    throw new Error(`Profondeur ${formatMM(profondeur)} hors grille (max: ${formatMM(Math.max(...grille.profondeurs))})`);

  return {
    prix: grille.prixAchatHT[rowIdx][colIdx],
    largeurGrille: grille.largeurs[colIdx],
    profondeurGrille: grille.profondeurs[rowIdx],
  };
}

// ── Calcul prix complet ───────────────────────────────────────────────────────

export function calculerPrix(
  modele: ModelePergola,
  largeur: number,
  profondeur: number,
  toitureId: string,
  couleurId: string,
  coefficient: number,
  hauteurPoteaux: number = 2500,
  poteauxSupp: number = 0,
  longueurPoteauxSupp: number = 2500,
  optionsSuppIds: string[] = [],
  couleurLamesId?: string,
  typePose?: string
): ResultatCalcul {
  const { prix, largeurGrille, profondeurGrille } = determinerPrixBase(
    modele.grille, largeur, profondeur
  );

  const toiture = modele.toitures.find((t) => t.id === toitureId);
  const couleur = modele.couleurs.find((c) => c.id === couleurId);

  const calcOptionSurcharge = (opt: OptionConfigurable | undefined) => {
    if (!opt) return 0;
    const mode = opt.modeCalcul || "forfait";
    if (mode === "m2") {
      const area = (largeur / 1000) * (profondeur / 1000);
      return area * opt.surchargeHT;
    } else if (mode === "ml") {
      const length = poteauxSupp * (hauteurPoteaux / 1000);
      return length * opt.surchargeHT;
    } else {
      return opt.surchargeHT + prix * (opt.surchargePct / 100);
    }
  };

  const surchargeToitureHT = calcOptionSurcharge(toiture);
  
  const couleurLames = couleurLamesId ? modele.couleurs.find((c) => c.id === couleurLamesId) : undefined;
  const surchargeCouleurHT = calcOptionSurcharge(couleur) + (couleurLames ? calcOptionSurcharge(couleurLames) : 0);

  const isPrimeOrAdaptAir = modele.isMBPrime || modele.isAdaptAir || modele.nom.toLowerCase().includes("prime") || modele.nom.toLowerCase().includes("adapt air");
  const nombrePoteaux = isPrimeOrAdaptAir
    ? (typePose === "Autoportante" ? 4 : 2)
    : calculerPoteaux(modele.reglesPoteau, largeur, profondeur);

  // Calcule automatique surcharge poteaux (section/tarif configurable, achat par ml)
  // S'applique UNIQUEMENT aux poteaux supplémentaires avec leur propre longueur configurée
  let surchargePoteauxAchatHT = 0;
  let tarifSupp = modele.tarifPoteauSuppHT;
  if (tarifSupp === undefined && modele.nom.toLowerCase().includes("oris solid")) {
    tarifSupp = 32;
  }
  if (tarifSupp !== undefined && tarifSupp > 0) {
    if (poteauxSupp > 0) {
      surchargePoteauxAchatHT += poteauxSupp * (longueurPoteauxSupp / 1000) * tarifSupp;
    }
  }

  // Options supplémentaires (screens/volets)
  let surchargeOptionsSuppHT = 0;
  if (modele.optionsSupp && optionsSuppIds.length > 0) {
    optionsSuppIds.forEach((id) => {
      const opt = modele.optionsSupp?.find((o) => o.id === id);
      if (opt) {
        surchargeOptionsSuppHT += calcOptionSurcharge(opt);
      }
    });
  }

  const prixAchatTotalHT = prix + surchargeToitureHT + surchargeCouleurHT + surchargePoteauxAchatHT + surchargeOptionsSuppHT;
  const prixVenteHT = Math.round(prixAchatTotalHT * coefficient * 100) / 100;

  return {
    prixAchatBaseHT: prix,
    surchargeToitureHT,
    surchargeCouleurHT,
    surchargePoteauxAchatHT,
    surchargeOptionsSuppHT,
    prixAchatTotalHT,
    coefficient,
    prixVenteHT,
    largeurGrille,
    profondeurGrille,
    nombrePoteaux,
    hauteurPoteaux,
    poteauxSupp,
    longueurPoteauxSupp,
  };
}

// ── Génération description automatique ───────────────────────────────────────

export interface ContexteDescription {
  nom: string;
  largeurMm: number;
  profondeurMm: number;   // ou hauteur selon typeDim
  toiture: string;
  couleur: string;
  poteaux: number;
  moteur?: string;
  typeDim: "largeur_profondeur" | "largeur_hauteur";
  hauteurPoteauxMm?: number;
  poteauxSupp?: number;
  longueurPoteauxSuppMm?: number;
  sectionPoteaux?: string;
  optionsSupp?: string[];
  couleurLames?: string;
  typePose?: string;
  lamesOrientation?: string;
}

/**
 * Injecte les variables dans le template pour générer la description finale.
 * Toutes les occurrences de {{variable}} sont remplacées.
 */
export function genererDescription(
  template: string,
  ctx: ContexteDescription
): string {
  const largeurFormate = formatDimDevis(ctx.largeurMm);
  const dim2Formate    = formatDimDevis(ctx.profondeurMm);
  const dim2Label      = ctx.typeDim === "largeur_hauteur" ? "Hauteur" : "Profondeur";
  const hauteurPoteauxFormate = ctx.hauteurPoteauxMm ? formatDimDevis(ctx.hauteurPoteauxMm) : "2500 mm";
  const poteauxSuppText = String(ctx.poteauxSupp || 0);
  const longueurPoteauxSuppFormate = ctx.longueurPoteauxSuppMm ? formatDimDevis(ctx.longueurPoteauxSuppMm) : "2500 mm";
  const optionsSuppText = ctx.optionsSupp && ctx.optionsSupp.length > 0 ? ctx.optionsSupp.join(", ") : "";

  let resultTemplate = template || "";
  if (resultTemplate.trim() && !resultTemplate.includes("{{hauteur_poteaux}}")) {
    if (resultTemplate.includes("{{poteaux}} poteaux")) {
      resultTemplate = resultTemplate.replace("{{poteaux}} poteaux", "{{poteaux}} poteaux (hauteur {{hauteur_poteaux}})");
    } else if (resultTemplate.includes("{{poteaux}}")) {
      resultTemplate = resultTemplate.replace("{{poteaux}}", "{{poteaux}} (hauteur {{hauteur_poteaux}})");
    } else {
      resultTemplate = resultTemplate + "\nHauteur poteaux : {{hauteur_poteaux}}";
    }
  }

  const isAdaptAir = ctx.nom.toLowerCase().includes("adapt air");
  const labelSecondColor = isAdaptAir ? "Couleur toile" : "Couleur lames";
  const varSecondColor = isAdaptAir ? "{{couleur_toile}}" : "{{couleur_lames}}";

  if (ctx.couleurLames && !resultTemplate.includes("{{couleur_lames}}") && !resultTemplate.includes("{{couleur_toile}}")) {
    if (resultTemplate.includes("Couleur structure : {{couleur}}")) {
      resultTemplate = resultTemplate.replace("Couleur structure : {{couleur}}", `Couleur structure : {{couleur}}\n${labelSecondColor} : ${varSecondColor}`);
    } else if (resultTemplate.includes("Couleur : {{couleur}}")) {
      resultTemplate = resultTemplate.replace("Couleur : {{couleur}}", `Couleur structure : {{couleur}}\n${labelSecondColor} : ${varSecondColor}`);
    } else if (resultTemplate.includes("{{couleur}}")) {
      resultTemplate = resultTemplate.replace("{{couleur}}", `{{couleur}} (${isAdaptAir ? "Toile" : "Lames"} : ${varSecondColor})`);
    } else {
      resultTemplate = resultTemplate + `\n${labelSecondColor} : ${varSecondColor}`;
    }
  }

  if (ctx.typePose && !resultTemplate.includes("{{type_pose}}")) {
    if (resultTemplate.includes("sur mesure")) {
      resultTemplate = resultTemplate.replace("sur mesure", "sur mesure ({{type_pose}})");
    } else {
      resultTemplate = resultTemplate + "\nPose : {{type_pose}}";
    }
  }

  if (!isAdaptAir && ctx.lamesOrientation && !resultTemplate.includes("{{orientation_lames}}")) {
    resultTemplate = resultTemplate + "\nOrientation des lames : {{orientation_lames}}";
  }

  let desc = resultTemplate
    .replace(/\{\{nom\}\}/g,        ctx.nom)
    .replace(/\{\{largeur\}\}/g,    largeurFormate)
    .replace(/\{\{profondeur\}\}/g, dim2Formate)
    .replace(/\{\{hauteur\}\}/g,    dim2Formate)
    .replace(/\{\{dim2_label\}\}/g, dim2Label)
    .replace(/\{\{toiture\}\}/g,    ctx.toiture)
    .replace(/\{\{couleur\}\}/g,    ctx.couleur)
    .replace(/\{\{couleur_lames\}\}/g, ctx.couleurLames || "—")
    .replace(/\{\{couleur_toile\}\}/g, ctx.couleurLames || "—")
    .replace(/\{\{type_pose\}\}/g,   ctx.typePose || "—")
    .replace(/\{\{orientation_lames\}\}/g, ctx.lamesOrientation || "Lames parallèles à la façade")
    .replace(/\{\{poteaux\}\}/g,    String(ctx.poteaux))
    .replace(/\{\{hauteur_poteaux\}\}/g, hauteurPoteauxFormate)
    .replace(/\{\{poteaux_supp\}\}/g, poteauxSuppText)
    .replace(/\{\{longueur_poteaux_supp\}\}/g, longueurPoteauxSuppFormate)
    .replace(/\{\{moteur\}\}/g,     ctx.moteur ?? "")
    .replace(/\{\{options_supp\}\}/g, optionsSuppText)
    .trim();

  let section = ctx.sectionPoteaux;
  if (!section && ctx.nom.toLowerCase().includes("oris solid")) {
    section = "136×136mm";
  }

  if (section) {
    // Inject post section
    desc = desc.replace(/poteaux\s*\(hauteur/gi, `poteaux (section ${section}, hauteur`);
    desc = desc.replace(/poteaux\s*\(h\s*:/gi, `poteaux (section ${section}, h :`);
    if (desc.includes("Hauteur poteaux :")) {
      desc = desc.replace("Hauteur poteaux :", `Poteaux (section ${section}) - Hauteur :`);
    }
  }

  if (ctx.poteauxSupp && ctx.poteauxSupp > 0) {
    const details = section ? `section ${section}, hauteur ${longueurPoteauxSuppFormate}` : `hauteur ${longueurPoteauxSuppFormate}`;
    const lineText = `— ${ctx.poteauxSupp} poteau${ctx.poteauxSupp > 1 ? "x" : ""} supplémentaire${ctx.poteauxSupp > 1 ? "s" : ""} (${details})`;
    if (!desc.includes("poteaux supplémentaire") && !desc.includes("poteau supplémentaire")) {
      desc = desc + "\n" + lineText;
    } else {
      desc = desc.replace(/\{\{poteaux_supp\}\}\s*poteaux\s*supplémentaires/gi, lineText);
      desc = desc.replace(/\{\{poteaux_supp\}\}\s*poteau\s*supplémentaire/gi, lineText);
    }
  }

  if (optionsSuppText && !resultTemplate.includes("{{options_supp}}")) {
    desc = desc + "\nOptions : " + optionsSuppText;
  }

  return desc;
}

// ── Parseur Excel TSV ─────────────────────────────────────────────────────────

/**
 * Détecte automatiquement si les dimensions sont en cm ou mm.
 * Règle : si toutes les valeurs de largeur sont < 2000 → cm → on multiplie par 10.
 * Exemples MB Aluminium : 306, 406, 506... → cm → converti en 3060, 4060, 5060mm
 * Exemples déjà en mm   : 3000, 4000, 5000... → conservés tels quels
 */
function detectAndConvertDim(values: number[]): { values: number[]; unitDetected: "cm" | "mm" } {
  const maxVal = Math.max(...values);
  if (maxVal < 2000) {
    // Dimensions en cm — conversion vers mm
    return { values: values.map((v) => Math.round(v * 10)), unitDetected: "cm" };
  }
  return { values, unitDetected: "mm" };
}

export function parseExcelGrid(tsv: string): GrilleTarif | null {
  const lines = tsv
    .trim()
    .split(/\r?\n/)
    .map((l) =>
      l.split("\t").map((c) => c.trim().replace(/\s/g, "").replace(",", ".").replace(/[€$£]/g, ""))
    );

  if (lines.length < 2) return null;

  // Ligne 0 → largeurs (ignorer la 1ère cellule vide/label)
  const largeursRaw = lines[0]
    .slice(1)
    .map((c) => parseFloat(c.replace(/[^\d.]/g, "")))
    .filter((n) => !isNaN(n) && n > 0);

  if (largeursRaw.length === 0) return null;

  // Conversion cm→mm si nécessaire
  const { values: largeurs } = detectAndConvertDim(largeursRaw);

  // Lignes suivantes → profondeurs + prix
  const profondeursRaw: number[] = [];
  const prixAchatHT: number[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const profRaw = parseFloat(row[0].replace(/[^\d.]/g, ""));
    if (isNaN(profRaw) || profRaw <= 0) continue;
    profondeursRaw.push(profRaw);

    const prix = row.slice(1, largeursRaw.length + 1).map((c) => {
      const n = parseFloat(c.replace(/[^\d.]/g, ""));
      return isNaN(n) ? 0 : n;
    });
    while (prix.length < largeurs.length) prix.push(0);
    prixAchatHT.push(prix);
  }

  if (profondeursRaw.length === 0) return null;

  // Conversion cm→mm pour les profondeurs (même règle)
  const { values: profondeurs } = detectAndConvertDim(profondeursRaw);

  return { largeurs, profondeurs, prixAchatHT };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateGrille(grille: GrilleTarif): string | null {
  if (grille.largeurs.length === 0)  return "Aucune largeur définie";
  if (grille.profondeurs.length === 0) return "Aucune profondeur définie";
  if (grille.prixAchatHT.length !== grille.profondeurs.length)
    return "Nombre de lignes de prix ≠ nombre de profondeurs";
  for (const row of grille.prixAchatHT)
    if (row.length !== grille.largeurs.length)
      return "Nombre de colonnes de prix ≠ nombre de largeurs";
  return null;
}

// ── Formatage ─────────────────────────────────────────────────────────────────

/** Affiche en mètres pour l'interface (ex: "3,06 m") */
export function formatMM(mm: number): string {
  return `${(mm / 1000).toFixed(2).replace(".", ",")} m`;
}

/** Affiche en millimètres pour le devis (ex: "3060 mm") */
export function formatDimDevis(mm: number): string {
  return `${mm} mm`;
}

export function formatCoef(coef: number): string {
  return `×${coef.toFixed(2)} (+${((coef - 1) * 100).toFixed(0)}%)`;
}

/** Convertit cm → mm (tarif fournisseur en cm → app en mm) */
export function cmToMm(cm: number): number {
  return cm * 10;
}

/** Convertit mm → cm */
export function mmToCm(mm: number): number {
  return mm / 10;
}

export interface AbaquePanneau {
  hauteurVerre: number;        // en cm (ex: 190)
  encastrementMin: number;     // en cm (ex: 198)
  encastrementMax: number;     // en cm (ex: 202)
  largeursPermises: number[];   // largeurs autorisées en cm
}

export const ABAQUE_COULISSANT: AbaquePanneau[] = [
  { hauteurVerre: 190, encastrementMin: 198, encastrementMax: 202, largeursPermises: [90, 98, 103] },
  { hauteurVerre: 195, encastrementMin: 203, encastrementMax: 207, largeursPermises: [82, 90, 98, 103] },
  { hauteurVerre: 200, encastrementMin: 208, encastrementMax: 212, largeursPermises: [82, 90, 98, 103] },
  { hauteurVerre: 205, encastrementMin: 213, encastrementMax: 217, largeursPermises: [82, 90, 98, 103] },
  { hauteurVerre: 210, encastrementMin: 218, encastrementMax: 222, largeursPermises: [82, 90, 98, 103] },
  { hauteurVerre: 215, encastrementMin: 223, encastrementMax: 227, largeursPermises: [82, 90, 98, 103] },
  { hauteurVerre: 220, encastrementMin: 228, encastrementMax: 232, largeursPermises: [82, 90, 98, 103] },
  { hauteurVerre: 225, encastrementMin: 233, encastrementMax: 237, largeursPermises: [82, 90, 98, 103] },
  { hauteurVerre: 230, encastrementMin: 238, encastrementMax: 242, largeursPermises: [90, 98, 103] },
  { hauteurVerre: 235, encastrementMin: 243, encastrementMax: 247, largeursPermises: [90, 98, 103] },
  { hauteurVerre: 240, encastrementMin: 248, encastrementMax: 252, largeursPermises: [90, 98, 103] },
  { hauteurVerre: 245, encastrementMin: 253, encastrementMax: 257, largeursPermises: [90, 98, 103] },
  { hauteurVerre: 250, encastrementMin: 258, encastrementMax: 262, largeursPermises: [90, 98, 103] },
];

export function blankModeleCoulissant(): ModeleCoulissant {
  return {
    id: uid(),
    typeModele: "coulissant",
    nom: "",
    nomFournisseur: "PAROIS COULISSANTES MB",
    fournisseurId: "",
    fournisseurNom: "",
    margeDefaut: 1.45,
    vantauxMin: 2,
    vantauxMax: 6,
    tarifsPanneau: [
      {
        id: uid(),
        label: "Verre clair standard",
        prixHT: 145,
        description: "Panneau + rail sup/inf + profils U + roulettes + joint brosse + 1 poignée"
      },
      {
        id: uid(),
        label: "Verre teinté standard",
        prixHT: 173,
        description: "Panneau teinté + rail sup/inf + profils U + roulettes + joint brosse + 1 poignée"
      },
      {
        id: uid(),
        label: "Verre clair sur mesure",
        prixHT: 236,
        description: "Panneau sur mesure + rail sup/inf + profils U + roulettes + joint brosse + 1 poignée"
      },
      {
        id: uid(),
        label: "Verre teinté sur mesure",
        prixHT: 264,
        description: "Panneau teinté sur mesure + rail sup/inf + profils U + roulettes + joint brosse + 1 poignée"
      },
    ],
    options: [
      { id: uid(), nom: "Serrure + éléments d'entraînement", surchargeHT: 120, surchargePct: 0 },
      { id: uid(), nom: "Poignée supplémentaire", surchargeHT: 9, surchargePct: 0 },
      { id: uid(), nom: "Joint brosse supplémentaire", surchargeHT: 9, surchargePct: 0 },
    ],
    couleurs: [
      { id: uid(), nom: "RAL 9016 Blanc", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 7016 Anthracite FST", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 9007 Gris métallique FST", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "RAL 9005 Noir FST", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "DB703 Gris pailleté", surchargeHT: 0, surchargePct: 0 },
    ],
    templateDescription:
`Parois coulissantes aluminium {{nom}} sur mesure
Configuration : {{vantaux}} vantaux coulissants (verre {{largeur_verre}} × {{hauteur_verre}} cm)
Hauteur d'encastrement : {{hauteur_encastrement}} cm
Verre : {{tarif_panneau}}
Couleur structure : {{couleur}}
{{options_texte}}
Verre trempé 10 mm — Joints brosses — Profils aluminium thermolaqués
Poignée incluse — Livraison départ usine`,
  };
}

export interface ResultatCoulissant {
  nombreVantaux: number;
  prixPanneau: number;
  prixAchatBaseHT: number;   // N × prixPanneau
  surchargesHT: number;      // total options sélectionnées
  surchargeCouleurHT?: number; // surcharge couleur
  prixAchatTotalHT: number;
  coefficient: number;
  prixVenteHT: number;
}

export function calculerPrixCoulissant(
  modele: ModeleCoulissant,
  nombreVantaux: number,
  tarifPanneauId: string,
  optionsSelectionnees: string[],  // ids des options choisies
  couleurId: string,               // id de la couleur choisie
  coefficient: number
): ResultatCoulissant {
  const tarif = modele.tarifsPanneau.find(t => t.id === tarifPanneauId);
  if (!tarif) throw new Error("Tarif panneau introuvable");
  
  const prixBase = nombreVantaux * tarif.prixHT;
  
  const surcharges = modele.options
    .filter(o => optionsSelectionnees.includes(o.id))
    .reduce((sum, o) => sum + o.surchargeHT + (prixBase * o.surchargePct / 100), 0);
  
  const selectedColor = modele.couleurs?.find(c => c.id === couleurId);
  const surchargeCouleur = selectedColor 
    ? (selectedColor.surchargeHT + (prixBase * selectedColor.surchargePct / 100))
    : 0;

  const prixTotal = prixBase + surcharges + surchargeCouleur;
  const prixVente = Math.round(prixTotal * coefficient * 100) / 100;
  
  return {
    nombreVantaux,
    prixPanneau: tarif.prixHT,
    prixAchatBaseHT: prixBase,
    surchargesHT: surcharges,
    surchargeCouleurHT: surchargeCouleur,
    prixAchatTotalHT: prixTotal,
    coefficient,
    prixVenteHT: prixVente,
  };
}

export function genererDescriptionCoulissant(
  modele: ModeleCoulissant,
  ctx: {
    vantaux: number;
    tarifPanneau: string;
    couleur: string;
    options: string[];
    largeurVerre?: number;
    hauteurVerre?: number;
    hauteurEncastrement?: string;
  }
): string {
  const optionsText = ctx.options.length > 0
    ? ctx.options.map(o => `${o} incluse`).join("\n")
    : "";

  let template = modele.templateDescription || "";
  let desc = template
    .replace(/\{\{nom\}\}/g, modele.nom)
    .replace(/\{\{vantaux\}\}/g, String(ctx.vantaux))
    .replace(/\{\{tarif_panneau\}\}/g, ctx.tarifPanneau)
    .replace(/\{\{couleur\}\}/g, ctx.couleur)
    .replace(/\{\{options_texte\}\}/g, optionsText)
    .replace(/\{\{largeur_verre\}\}/g, ctx.largeurVerre ? String(ctx.largeurVerre) : "")
    .replace(/\{\{hauteur_verre\}\}/g, ctx.hauteurVerre ? String(ctx.hauteurVerre) : "")
    .replace(/\{\{hauteur_encastrement\}\}/g, ctx.hauteurEncastrement ? String(ctx.hauteurEncastrement) : "")
    .trim();

  // Règle de repli (Fallback auto-injection) si le template ne contient pas les dimensions du verre
  if (ctx.largeurVerre && ctx.hauteurVerre && !template.includes("{{largeur_verre}}") && !template.includes("{{hauteur_verre}}")) {
    const encText = ctx.hauteurEncastrement ? ` — Encastrement : ${ctx.hauteurEncastrement} cm` : "";
    const glassLine = `Dimensions verre : ${ctx.largeurVerre} cm (largeur) × ${ctx.hauteurVerre} cm (hauteur)${encText}`;
    if (/Configuration\s*:/i.test(desc)) {
      desc = desc.replace(/Configuration\s*:\s*[^\n]*/i, `Configuration : ${ctx.vantaux} vantaux coulissants (verre ${ctx.largeurVerre} × ${ctx.hauteurVerre} cm)${encText}`);
    } else {
      desc = desc + "\n" + glassLine;
    }
  }

  if (optionsText && !modele.templateDescription.includes("{{options_texte}}")) {
    desc += "\n" + optionsText;
  }
  
  // Remove empty line if options_texte is empty or clean up excess newlines
  desc = desc.replace(/\n\n+/g, "\n");
  
  return desc;
}

export function blankModeleParoiFixe(): ModeleParoiFixe {
  return {
    id: uid(),
    typeModele: "paroi_fixe",
    nom: "",
    nomFournisseur: "PAROIS FIXES MB",
    fournisseurId: "",
    fournisseurNom: "",
    margeDefaut: 1.45,
    couleurs: [
      { id: uid(), nom: "Blanc RAL 9016", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Gris métallique RAL 9007", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "IJzerglimmer DB703", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Anthracite RAL 7016", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Noir RAL 9005", surchargeHT: 0, surchargePct: 0 },
    ],
    templateDescription:
`Parois latérales fixes aluminium {{nom}} sur mesure
Configuration : {{type_paroi}}
Dimensions : Largeur {{largeur}} cm × Hauteur {{hauteur}} cm
Couleur structure : {{couleur}}
{{notes}}
Structure aluminium — Remplissage de qualité supérieure
Fabrication sur mesure`,
  };
}

export interface ResultatParoiFixe {
  prixAchatBaseHT: number;
  surchargeHauteurHT: number;
  prixAchatTotalHT: number;
  coefficient: number;
  prixVenteHT: number;
}

export function calculerPrixParoiFixe(
  modele: ModeleParoiFixe,
  state: {
    typeParoi: string;
    largeurParoi: number;
    hauteurParoi: number;
    prixAchatBaseHT: number;
  },
  coefficient: number
): ResultatParoiFixe {
  let surchargeHauteurHT = 0;
  
  if (state.typeParoi === "Verre fixe rectangle" && state.hauteurParoi > 220) {
    surchargeHauteurHT = 150;
  } else if (state.typeParoi === "Verre fixe incliné" && state.hauteurParoi > 275) {
    surchargeHauteurHT = 150;
  }

  const prixAchatTotal = state.prixAchatBaseHT + surchargeHauteurHT;
  const prixVente = Math.round(prixAchatTotal * coefficient * 100) / 100;

  return {
    prixAchatBaseHT: state.prixAchatBaseHT,
    surchargeHauteurHT,
    prixAchatTotalHT: prixAchatTotal,
    coefficient,
    prixVenteHT: prixVente,
  };
}

export function genererDescriptionParoiFixe(
  modele: ModeleParoiFixe,
  ctx: {
    typeParoi: string;
    largeur: number;
    hauteur: number;
    couleur: string;
    notes: string;
  }
): string {
  let template = modele.templateDescription || "";
  
  let hauteurStr = String(ctx.hauteur);
  if (ctx.typeParoi.includes("12 lattes")) {
    hauteurStr = "192";
  } else if (ctx.typeParoi.includes("10 lattes")) {
    hauteurStr = "200";
  } else if (!ctx.hauteur) {
    hauteurStr = "—";
  }

  let desc = template
    .replace(/\{\{nom\}\}/g, modele.nom)
    .replace(/\{\{type_paroi\}\}/g, ctx.typeParoi)
    .replace(/\{\{largeur\}\}/g, String(ctx.largeur))
    .replace(/\{\{hauteur\}\}/g, hauteurStr)
    .replace(/\{\{couleur\}\}/g, ctx.couleur)
    .replace(/\{\{notes\}\}/g, ctx.notes)
    .trim();

  desc = desc.replace(/\n\n+/g, "\n");
  return desc;
}

export function blankModeleParoiGrille(): ModeleParoiGrille {
  return {
    id: uid(),
    typeModele: "paroi_avec_grille",
    nom: "",
    nomFournisseur: "PAROIS FIXES MB",
    fournisseurId: "",
    fournisseurNom: "",
    margeDefaut: 1.45,
    typesParoi: [
      { id: uid(), nom: "Aluminium 12 lattes H192 cm", largeurs: [2500, 3000, 3500, 4000, 5000], prixAchatHT: [0, 0, 0, 0, 0] },
      { id: uid(), nom: "Aluminium 10 lattes H200 cm", largeurs: [2500, 3000, 3500, 4000, 5000], prixAchatHT: [0, 0, 0, 0, 0] },
      { id: uid(), nom: "Verre fixe rectangle", largeurs: [2500, 3000, 3500, 4000, 5000], prixAchatHT: [0, 0, 0, 0, 0] },
      { id: uid(), nom: "Verre fixe incliné", largeurs: [2500, 3000, 3500, 4000, 5000], prixAchatHT: [0, 0, 0, 0, 0] },
      { id: uid(), nom: "Polycarbonate", largeurs: [2500, 3000, 3500, 4000, 5000], prixAchatHT: [0, 0, 0, 0, 0] },
    ],
    couleurs: [
      { id: uid(), nom: "Blanc RAL 9016", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Gris métallique RAL 9007", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "IJzerglimmer DB703", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Anthracite RAL 7016", surchargeHT: 0, surchargePct: 0 },
      { id: uid(), nom: "Noir RAL 9005", surchargeHT: 0, surchargePct: 0 },
    ],
    templateDescription:
`Paroi latérale fixe MB Aluminium — {{type_paroi}}
Largeur : {{largeur}} cm
Couleur structure : {{couleur}}
{{notes}}
Fabrication sur mesure — Prix MB Partners HT, TVA non incluse`,
  };
}

export interface ResultatParoiGrille {
  prixAchatBaseHT: number;
  surchargeCouleurHT: number;
  surchargeHauteurHT: number;
  prixAchatTotalHT: number;
  coefficient: number;
  prixVenteHT: number;
  largeurGrille: number;
}

export function calculerPrixParoiGrille(
  modele: ModeleParoiGrille,
  state: {
    typeParoiId: string;
    largeurMm: number;
    hauteurCm?: number;
    couleurId: string;
  },
  coefficient: number
): ResultatParoiGrille {
  const typeParoi = modele.typesParoi.find((t) => t.id === state.typeParoiId);
  if (!typeParoi) throw new Error("Type de paroi introuvable");

  // 1. Regrouper les largeurs avec leurs index et prix correspondants
  const items = typeParoi.largeurs.map((w, idx) => ({
    w,
    idx,
    price: typeParoi.prixAchatHT[idx] ?? 0,
  }));

  // 2. Filtrer pour ne garder que les largeurs >= largeur ciblée ET avec un tarif > 0
  const validLarger = items
    .filter((item) => item.w >= state.largeurMm && item.price > 0)
    .sort((a, b) => a.w - b.w);

  let selectedIndex = -1;
  let largeurGrille = 0;

  if (validLarger.length > 0) {
    // Sélectionner la dimension supérieure la plus proche ayant un tarif > 0
    selectedIndex = validLarger[0].idx;
    largeurGrille = validLarger[0].w;
  } else {
    // Si aucune dimension supérieure n'a un tarif > 0, on cherche la plus grande dimension avec un tarif > 0
    const anyWithPrice = items
      .filter((item) => item.price > 0)
      .sort((a, b) => b.w - a.w); // Tri décroissant pour avoir la plus grande largeur

    if (anyWithPrice.length > 0) {
      selectedIndex = anyWithPrice[0].idx;
      largeurGrille = anyWithPrice[0].w;
    } else {
      // Repli absolu si tous les tarifs sont à 0 ou non renseignés
      const sortedAll = [...items].sort((a, b) => b.w - a.w);
      selectedIndex = sortedAll[0]?.idx ?? 0;
      largeurGrille = sortedAll[0]?.w ?? 0;
    }
  }

  const prixAchatBaseHT = typeParoi.prixAchatHT[selectedIndex] || 0;

  // Surcharge couleur
  const selectedColor = modele.couleurs?.find((c) => c.id === state.couleurId);
  const surchargeCouleurHT = selectedColor
    ? selectedColor.surchargeHT + (prixAchatBaseHT * selectedColor.surchargePct) / 100
    : 0;

  // Surcharge hauteur
  let surchargeHauteurHT = 0;
  if (state.hauteurCm !== undefined) {
    const nomLower = typeParoi.nom.toLowerCase();
    const isRectangle = nomLower.includes("verre fixe rectangle");
    const isIncline = nomLower.includes("verre fixe incliné") || nomLower.includes("verre fixe incline");
    if (isRectangle && state.hauteurCm > 220) {
      surchargeHauteurHT = 150;
    } else if (isIncline && state.hauteurCm > 275) {
      surchargeHauteurHT = 150;
    }
  }

  const prixAchatTotalHT = prixAchatBaseHT + surchargeCouleurHT + surchargeHauteurHT;
  const prixVenteHT = Math.round(prixAchatTotalHT * coefficient * 100) / 100;

  return {
    prixAchatBaseHT,
    surchargeCouleurHT,
    surchargeHauteurHT,
    prixAchatTotalHT,
    coefficient,
    prixVenteHT,
    largeurGrille,
  };
}

export function genererDescriptionParoiGrille(
  modele: ModeleParoiGrille,
  ctx: {
    typeParoi: string;
    largeur: number;
    hauteur?: number;
    couleur: string;
    notes: string;
  }
): string {
  let template = modele.templateDescription || "";

  let desc = template
    .replace(/\{\{nom\}\}/g, modele.nom)
    .replace(/\{\{type_paroi\}\}/g, ctx.typeParoi)
    .replace(/\{\{largeur\}\}/g, String(ctx.largeur))
    .replace(/\{\{couleur\}\}/g, ctx.couleur)
    .replace(/\{\{notes\}\}/g, ctx.notes)
    .trim();

  desc = desc.replace(/\n\n+/g, "\n");
  return desc;
}

