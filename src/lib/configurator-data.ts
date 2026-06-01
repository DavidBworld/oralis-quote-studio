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

/** Règle de calcul automatique du nombre de poteaux selon largeur */
export interface ReglePoteau {
  largeurMinMm: number;
  largeurMaxMm: number;
  nombrePoteaux: number;
}

/** Modèle de pergola configurable */
export interface ModelePergola {
  id: string;
  nom: string;                    // nom catalogue ORALIS — visible client
  nomFournisseur: string;         // nom MB Aluminium — usage interne uniquement
  fournisseurId: string;
  fournisseurNom: string;
  typeDim: "largeur_profondeur" | "largeur_hauteur";
  margeDefaut: number;            // coefficient ex: 1.4
  grille: GrilleTarif;
  toitures: OptionConfigurable[];
  couleurs: OptionConfigurable[];
  reglesPoteau: ReglePoteau[];    // calcul automatique nb poteaux
  templateDescription: string;   // template avec {{variables}} pour le devis
  image?: string;                 // image optionnelle du modèle
  sectionPoteaux?: string;        // ex: "136x136 mm"
  tarifPoteauSuppHT?: number;     // prix d'achat par ml pour poteaux supp
}

/** Résultat de calcul complet */
export interface ResultatCalcul {
  prixAchatBaseHT: number;
  surchargeToitureHT: number;
  surchargeCouleurHT: number;
  surchargePoteauxAchatHT?: number; // Surcharge poteaux pour ORIS SOLID
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
function migrateModeles(modeles: ModelePergola[]): ModelePergola[] {
  let migrated = false;
  const fixed = modeles.map((m) => {
    const maxLarg = Math.max(...(m.grille?.largeurs ?? [0]));
    if (maxLarg > 0 && maxLarg < 2000) {
      migrated = true;
      return {
        ...m,
        grille: {
          ...m.grille,
          largeurs:    m.grille.largeurs.map((v) => Math.round(v * 10)),
          profondeurs: m.grille.profondeurs.map((v) => Math.round(v * 10)),
        },
        reglesPoteau: (m.reglesPoteau ?? []).map((r) =>
          r.largeurMaxMm < 2000
            ? { ...r, largeurMinMm: r.largeurMinMm * 10, largeurMaxMm: r.largeurMaxMm * 10 }
            : r
        ),
      };
    }
    return m;
  });
  if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(fixed));
  return fixed;
}

export function loadModeles(): ModelePergola[] {
  try { return migrateModeles(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return []; }
}

export function saveModeles(modeles: ModelePergola[]): void {
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
  "{{poteaux}}",
  "{{hauteur_poteaux}}",
  "{{poteaux_supp}}",
  "{{longueur_poteaux_supp}}",
  "{{moteur}}",
];

export function blankModele(): ModelePergola {
  return {
    id: uid(),
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
    image: "",
    sectionPoteaux: "",
    tarifPoteauSuppHT: 0,
  };
}

// ── Calcul poteaux ────────────────────────────────────────────────────────────

/**
 * Calcule le nombre de poteaux en fonction de la largeur et des règles définies.
 * Retourne 2 par défaut si aucune règle ne correspond.
 */
export function calculerPoteaux(regles: ReglePoteau[], largeurMm: number): number {
  const regle = regles.find(
    (r) => largeurMm >= r.largeurMinMm && largeurMm <= r.largeurMaxMm
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
  longueurPoteauxSupp: number = 2500
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
  const surchargeCouleurHT = calcOptionSurcharge(couleur);
  const nombrePoteaux = calculerPoteaux(modele.reglesPoteau, largeur);

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

  const prixAchatTotalHT = prix + surchargeToitureHT + surchargeCouleurHT + surchargePoteauxAchatHT;
  const prixVenteHT = Math.round(prixAchatTotalHT * coefficient * 100) / 100;

  return {
    prixAchatBaseHT: prix,
    surchargeToitureHT,
    surchargeCouleurHT,
    surchargePoteauxAchatHT,
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
  const hauteurPoteauxFormate = ctx.hauteurPoteauxMm ? formatDimDevis(ctx.hauteurPoteauxMm) : "2,50m";
  const poteauxSuppText = String(ctx.poteauxSupp || 0);
  const longueurPoteauxSuppFormate = ctx.longueurPoteauxSuppMm ? formatDimDevis(ctx.longueurPoteauxSuppMm) : "2,50m";

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

  let desc = resultTemplate
    .replace(/\{\{nom\}\}/g,        ctx.nom)
    .replace(/\{\{largeur\}\}/g,    largeurFormate)
    .replace(/\{\{profondeur\}\}/g, dim2Formate)
    .replace(/\{\{hauteur\}\}/g,    dim2Formate)
    .replace(/\{\{dim2_label\}\}/g, dim2Label)
    .replace(/\{\{toiture\}\}/g,    ctx.toiture)
    .replace(/\{\{couleur\}\}/g,    ctx.couleur)
    .replace(/\{\{poteaux\}\}/g,    String(ctx.poteaux))
    .replace(/\{\{hauteur_poteaux\}\}/g, hauteurPoteauxFormate)
    .replace(/\{\{poteaux_supp\}\}/g, poteauxSuppText)
    .replace(/\{\{longueur_poteaux_supp\}\}/g, longueurPoteauxSuppFormate)
    .replace(/\{\{moteur\}\}/g,     ctx.moteur ?? "")
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

/** Affiche en mètres pour le devis (ex: "3,06m") — sans espace */
export function formatDimDevis(mm: number): string {
  return `${(mm / 1000).toFixed(2).replace(".", ",")}m`;
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
