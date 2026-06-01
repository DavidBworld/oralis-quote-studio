import { describe, it, expect } from "vitest";
import {
  calculerPoteaux,
  determinerPrixBase,
  calculerPrix,
  genererDescription,
  parseExcelGrid,
  validateGrille,
  formatMM,
  formatDimDevis,
  formatCoef,
  blankModeleScreen,
  blankModeleCoulissant,
  calculerPrixCoulissant,
  genererDescriptionCoulissant,
  getLabelsModele,
  ABAQUE_COULISSANT,
  type GrilleTarif,
  type ModelePergola,
  type ModeleCoulissant,
} from "../lib/configurator-data";

describe("calculerPoteaux", () => {
  const regles = [
    { largeurMinMm: 0, largeurMaxMm: 4000, nombrePoteaux: 2 },
    { largeurMinMm: 4001, largeurMaxMm: 6000, nombrePoteaux: 3 },
    { largeurMinMm: 6001, largeurMaxMm: 10000, nombrePoteaux: 4 },
  ];

  it("should match rules within range without depth", () => {
    expect(calculerPoteaux(regles, 3000, 2000)).toBe(2);
    expect(calculerPoteaux(regles, 4000, 4000)).toBe(2);
    expect(calculerPoteaux(regles, 4001, 3500)).toBe(3);
    expect(calculerPoteaux(regles, 5500, 5000)).toBe(3);
    expect(calculerPoteaux(regles, 6000, 1000)).toBe(3);
    expect(calculerPoteaux(regles, 8000, 3000)).toBe(4);
  });

  it("should return 2 by default if no rule matches", () => {
    expect(calculerPoteaux(regles, 12000, 2000)).toBe(2);
  });

  it("should handle optional depth range constraints correctly", () => {
    const reglesAvecProfondeur = [
      // Si largeur 0-6000 et profondeur 0-3000 -> 2 poteaux
      { largeurMinMm: 0, largeurMaxMm: 6000, profondeurMinMm: 0, profondeurMaxMm: 3000, nombrePoteaux: 2 },
      // Si largeur 0-6000 et profondeur 3001-6000 -> 4 poteaux
      { largeurMinMm: 0, largeurMaxMm: 6000, profondeurMinMm: 3001, profondeurMaxMm: 6000, nombrePoteaux: 4 },
      // Règle générale largeur 6001-10000 (sans contrainte profondeur) -> 6 poteaux
      { largeurMinMm: 6001, largeurMaxMm: 10000, nombrePoteaux: 6 },
    ];

    expect(calculerPoteaux(reglesAvecProfondeur, 4000, 2500)).toBe(2);
    expect(calculerPoteaux(reglesAvecProfondeur, 4000, 4000)).toBe(4);
    expect(calculerPoteaux(reglesAvecProfondeur, 8000, 2000)).toBe(6);
    expect(calculerPoteaux(reglesAvecProfondeur, 8000, 5000)).toBe(6);
  });
});

describe("determinerPrixBase", () => {
  const grille: GrilleTarif = {
    largeurs: [3000, 4000, 5000],
    profondeurs: [2000, 3000, 4000],
    prixAchatHT: [
      [1000, 1200, 1500], // depth 2000: w3000, w4000, w5000
      [2000, 2400, 3000], // depth 3000: w3000, w4000, w5000
      [3000, 3600, 4500], // depth 4000: w3000, w4000, w5000
    ],
  };

  it("should fetch exact dimensions", () => {
    const result = determinerPrixBase(grille, 3000, 2000);
    expect(result.prix).toBe(1000);
    expect(result.largeurGrille).toBe(3000);
    expect(result.profondeurGrille).toBe(2000);

    const result2 = determinerPrixBase(grille, 4000, 3000);
    expect(result2.prix).toBe(2400);
    expect(result2.largeurGrille).toBe(4000);
    expect(result2.profondeurGrille).toBe(3000);
  });

  it("should round up dimensions to the next higher slot", () => {
    const result = determinerPrixBase(grille, 3200, 2500);
    // 3200 width rounded to 4000; 2500 depth rounded to 3000
    // prixAchatHT[1][1] = 2400
    expect(result.prix).toBe(2400);
    expect(result.largeurGrille).toBe(4000);
    expect(result.profondeurGrille).toBe(3000);

    const result2 = determinerPrixBase(grille, 2900, 1900);
    // 2900 width rounded to 3000; 1900 depth rounded to 2000
    // prixAchatHT[0][0] = 1000
    expect(result2.prix).toBe(1000);
    expect(result2.largeurGrille).toBe(3000);
    expect(result2.profondeurGrille).toBe(2000);
  });

  it("should throw error if dimensions exceed grid maximums", () => {
    expect(() => determinerPrixBase(grille, 5100, 3000)).toThrow();
    expect(() => determinerPrixBase(grille, 3000, 4100)).toThrow();
  });
});

describe("calculerPrix", () => {
  const model: ModelePergola = {
    id: "m1",
    nom: "Climalux",
    nomFournisseur: "CL-16",
    fournisseurId: "f1",
    fournisseurNom: "MB Aluminium",
    typeDim: "largeur_profondeur",
    margeDefaut: 1.4,
    grille: {
      largeurs: [3000, 4000],
      profondeurs: [2000, 3000],
      prixAchatHT: [
        [1000, 1200],
        [1500, 1800],
      ],
    },
    toitures: [
      { id: "t1", nom: "Polycarbonate", surchargeHT: 0, surchargePct: 0 },
      { id: "t2", nom: "Verre (+15%)", surchargeHT: 0, surchargePct: 15 },
    ],
    couleurs: [
      { id: "c1", nom: "RAL 7016", surchargeHT: 0, surchargePct: 0 },
      { id: "c2", nom: "RAL Spec (+250€)", surchargeHT: 250, surchargePct: 0 },
    ],
    reglesPoteau: [{ largeurMinMm: 0, largeurMaxMm: 6000, nombrePoteaux: 2 }],
    templateDescription: "{{nom}} sur mesure",
    image: "test_image.jpg",
  };

  it("should calculate correct base price, surcharges, coefficient, and margin", () => {
    // 3500x2500 -> rounded to 4000x3000 -> base price 1800
    // Toiture: Glass (+15% of base price = +270)
    // Couleur: RAL Spec (+250)
    // Total Purchase HT = 1800 + 270 + 250 = 2320
    // Sale price with coefficient 1.5 = 2320 * 1.5 = 3480
    const result = calculerPrix(model, 3500, 2500, "t2", "c2", 1.5);

    expect(result.prixAchatBaseHT).toBe(1800);
    expect(result.surchargeToitureHT).toBe(270);
    expect(result.surchargeCouleurHT).toBe(250);
    expect(result.prixAchatTotalHT).toBe(2320);
    expect(result.prixVenteHT).toBe(3480);
    expect(result.nombrePoteaux).toBe(2);
  });
});

describe("genererDescription", () => {
  it("should interpolate template variables correctly", () => {
    const template = `{{nom}} sur mesure
Largeur {{largeur}} x {{dim2_label}} {{profondeur}}
Toiture: {{toiture}}
Couleur: {{couleur}}
Poteaux: {{poteaux}} (hauteur {{hauteur_poteaux}})`;

    const ctx = {
      nom: "Pergola Design",
      largeurMm: 4250,
      profondeurMm: 2900,
      toiture: "Polycarbonate transparent",
      couleur: "RAL 7016",
      poteaux: 3,
      typeDim: "largeur_profondeur" as const,
      hauteurPoteauxMm: 2800,
    };

    const desc = genererDescription(template, ctx);
    expect(desc).toContain("Pergola Design sur mesure");
    expect(desc).toContain("Largeur 4250 mm x Profondeur 2900 mm");
    expect(desc).toContain("Toiture: Polycarbonate transparent");
    expect(desc).toContain("Couleur: RAL 7016");
    expect(desc).toContain("Poteaux: 3 (hauteur 2800 mm)");
  });

  it("should apply fallback auto-injection of post height if missing from template", () => {
    const template = `{{nom}} sur mesure
Dimensions : Largeur {{largeur}} × Profondeur {{profondeur}} — {{poteaux}} poteaux`;
    const ctx = {
      nom: "Pergola Design",
      largeurMm: 4000,
      profondeurMm: 3000,
      toiture: "Polycarbonate transparent",
      couleur: "RAL 7016",
      poteaux: 2,
      typeDim: "largeur_profondeur" as const,
      hauteurPoteauxMm: 2600,
    };
    const desc = genererDescription(template, ctx);
    expect(desc).toContain("Dimensions : Largeur 4000 mm × Profondeur 3000 mm — 2 poteaux (hauteur 2600 mm)");
  });
});

describe("parseExcelGrid", () => {
  it("should parse a valid TSV structure", () => {
    const tsv = `P \\ L\t3000\t4000\t5000\n2000\t1000\t1200\t1500\n3000\t2000\t2400\t3000`;
    const result = parseExcelGrid(tsv);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.largeurs).toEqual([3000, 4000, 5000]);
      expect(result.profondeurs).toEqual([2000, 3000]);
      expect(result.prixAchatHT).toEqual([
        [1000, 1200, 1500],
        [2000, 2400, 3000],
      ]);
    }
  });

  it("should handle spaces and commas/currencies", () => {
    const tsv = `P \\ L\t3 000\t4 000\n2 000\t1 000,50 €\t1 200.75 €`;
    const result = parseExcelGrid(tsv);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.largeurs).toEqual([3000, 4000]);
      expect(result.profondeurs).toEqual([2000]);
      expect(result.prixAchatHT).toEqual([[1000.5, 1200.75]]);
    }
  });

  it("should return null for malformed TSV", () => {
    expect(parseExcelGrid("")).toBeNull();
    expect(parseExcelGrid("only one line")).toBeNull();
  });
});

describe("validateGrille", () => {
  it("should return error if widths or depths are empty", () => {
    const grille1: GrilleTarif = { largeurs: [], profondeurs: [2000], prixAchatHT: [[]] };
    expect(validateGrille(grille1)).toBe("Aucune largeur définie");

    const grille2: GrilleTarif = { largeurs: [3000], profondeurs: [], prixAchatHT: [] };
    expect(validateGrille(grille2)).toBe("Aucune profondeur définie");
  });

  it("should return error if rows/columns mismatch matrix", () => {
    const grille: GrilleTarif = {
      largeurs: [3000, 4000],
      profondeurs: [2000, 3000],
      prixAchatHT: [[1000, 1200]], // missing second row
    };
    expect(validateGrille(grille)).toBe("Nombre de lignes de prix ≠ nombre de profondeurs");

    const grille2: GrilleTarif = {
      largeurs: [3000, 4000],
      profondeurs: [2000],
      prixAchatHT: [[1000]], // row 0 missing second column
    };
    expect(validateGrille(grille2)).toBe("Nombre de colonnes de prix ≠ nombre de largeurs");
  });

  it("should return null for a valid grid", () => {
    const grille: GrilleTarif = {
      largeurs: [3000, 4000],
      profondeurs: [2000],
      prixAchatHT: [[1000, 1200]],
    };
    expect(validateGrille(grille)).toBeNull();
  });
});

describe("formatting helpers", () => {
  it("should format millimeters to meters on UI", () => {
    expect(formatMM(3000)).toBe("3,00 m");
    expect(formatMM(4250)).toBe("4,25 m");
  });

  it("should format dimensions for quote description in mm", () => {
    expect(formatDimDevis(3000)).toBe("3000 mm");
    expect(formatDimDevis(4250)).toBe("4250 mm");
  });

  it("should format coefficient", () => {
    expect(formatCoef(1.4)).toBe("×1.40 (+40%)");
    expect(formatCoef(1.55)).toBe("×1.55 (+55%)");
  });
});

describe("Option pricing modes (ml and m2)", () => {
  it("should calculate correct surcharge for m2 options", () => {
    const model: ModelePergola = {
      id: "m_test",
      nom: "Test Model",
      nomFournisseur: "MB Test",
      fournisseurId: "f1",
      fournisseurNom: "Fournisseur A",
      typeDim: "largeur_profondeur",
      margeDefaut: 1.5,
      grille: {
        largeurs: [3000, 4000],
        profondeurs: [2000, 3000],
        prixAchatHT: [
          [1000, 1200],
          [1500, 1800],
        ],
      },
      toitures: [
        { id: "t_m2", nom: "IQRELAX Polycarbonate", surchargeHT: 50, surchargePct: 0, modeCalcul: "m2" },
      ],
      couleurs: [],
      reglesPoteau: [],
      templateDescription: "",
    };

    // Pergola 4000 x 3000 (area: 4m x 3m = 12m2)
    // Surcharge toiture = 12 * 50 = 600€
    const result = calculerPrix(model, 4000, 3000, "t_m2", "", 1.0);
    expect(result.surchargeToitureHT).toBe(600);
    expect(result.prixAchatTotalHT).toBe(1800 + 600);
  });

  it("should calculate correct surcharge for ml options based on post height and qty", () => {
    const model: ModelePergola = {
      id: "m_test",
      nom: "Test Model",
      nomFournisseur: "MB Test",
      fournisseurId: "f1",
      fournisseurNom: "Fournisseur A",
      typeDim: "largeur_profondeur",
      margeDefaut: 1.5,
      grille: {
        largeurs: [3000, 4000],
        profondeurs: [2000, 3000],
        prixAchatHT: [
          [1000, 1200],
          [1500, 1800],
        ],
      },
      toitures: [],
      couleurs: [
        { id: "c_ml", nom: "Poteaux Supplémentaires", surchargeHT: 100, surchargePct: 0, modeCalcul: "ml" },
      ],
      reglesPoteau: [],
      templateDescription: "",
    };

    // 2 additional posts of 3m height (total ml = 2 * 3 = 6ml)
    // Surcharge = 6 * 100 = 600€
    const result = calculerPrix(model, 4000, 3000, "", "c_ml", 1.0, 3000, 2);
    expect(result.surchargeCouleurHT).toBe(600);
    expect(result.prixAchatTotalHT).toBe(1800 + 600);
  });

  it("should calculate correctly for ORIS SOLID posts surcharge", () => {
    const model: ModelePergola = {
      id: "oris-solid-test",
      nom: "ORIS SOLID",
      nomFournisseur: "MB Oris",
      fournisseurId: "f1",
      fournisseurNom: "MB",
      typeDim: "largeur_profondeur",
      margeDefaut: 1.4,
      grille: {
        largeurs: [3000, 4000],
        profondeurs: [2000, 3000],
        prixAchatHT: [
          [1000, 1200],
          [1500, 1800],
        ],
      },
      toitures: [],
      couleurs: [],
      reglesPoteau: [
        { largeurMinMm: 0, largeurMaxMm: 6000, nombrePoteaux: 2 }
      ],
      templateDescription: "{{nom}} — {{poteaux}} poteaux (hauteur {{hauteur_poteaux}})",
    };

    // Case 1: Standard height (2500mm), 0 extra posts
    // Prix total should be 1800 (base grid price)
    const result1 = calculerPrix(model, 4000, 3000, "", "", 1.0, 2500, 0);
    expect(result1.prixAchatTotalHT).toBe(1800);
    expect(result1.surchargePoteauxAchatHT).toBe(0);

    // Case 2: Standard height (2500mm), 2 extra posts (2.5m * 32e = 80e each, total 160e)
    // Prix total = 1800 + 160 = 1960
    const result2 = calculerPrix(model, 4000, 3000, "", "", 1.0, 2500, 2);
    expect(result2.surchargePoteauxAchatHT).toBe(160);
    expect(result2.prixAchatTotalHT).toBe(1960);

    // Case 3: Tall height (3000mm) for standard posts, 0 extra posts
    // Standard posts do not receive any surcharge. Surcharge is 0.
    const result3 = calculerPrix(model, 4000, 3000, "", "", 1.0, 3000, 0);
    expect(result3.surchargePoteauxAchatHT).toBe(0);
    expect(result3.prixAchatTotalHT).toBe(1800);

    // Case 4: Tall height (3000mm) for standard posts, 2 extra posts with length 3500mm
    // Surcharge: 2 * 3.5m * 32e = 224e
    const result4 = calculerPrix(model, 4000, 3000, "", "", 1.0, 3000, 2, 3500);
    expect(result4.surchargePoteauxAchatHT).toBe(224);
    expect(result4.prixAchatTotalHT).toBe(2024);

    // Description generation check
    const desc = genererDescription(model.templateDescription, {
      nom: model.nom,
      largeurMm: 4000,
      profondeurMm: 3000,
      toiture: "—",
      couleur: "—",
      poteaux: 2,
      typeDim: "largeur_profondeur",
      hauteurPoteauxMm: 3000,
    });
    expect(desc).toContain("section 136×136mm");
  });

  it("should calculate correctly for custom post section and linear meter surcharge", () => {
    const model: ModelePergola = {
      id: "custom-poteau-model",
      nom: "Pergola Deluxe",
      nomFournisseur: "Deluxe",
      fournisseurId: "f1",
      fournisseurNom: "MB",
      typeDim: "largeur_profondeur",
      margeDefaut: 1.5,
      grille: {
        largeurs: [4000],
        profondeurs: [3000],
        prixAchatHT: [[2000]],
      },
      toitures: [],
      couleurs: [],
      reglesPoteau: [{ largeurMinMm: 0, largeurMaxMm: 6000, nombrePoteaux: 2 }],
      templateDescription: "{{nom}} — {{poteaux}} poteaux",
      sectionPoteaux: "150x150 mm",
      tarifPoteauSuppHT: 45, // 45€ / ml HT
    };

    // 2 additional posts of 3000mm length -> 2 * 3.0m * 45e = 270e HT surcharge
    const result = calculerPrix(model, 4000, 3000, "", "", 1.0, 2500, 2, 3000);
    expect(result.surchargePoteauxAchatHT).toBe(270);
    expect(result.prixAchatTotalHT).toBe(2270);

    const desc = genererDescription(model.templateDescription, {
      nom: model.nom,
      largeurMm: 4000,
      profondeurMm: 3000,
      toiture: "—",
      couleur: "—",
      poteaux: 2,
      typeDim: "largeur_profondeur",
      hauteurPoteauxMm: 2500,
      poteauxSupp: 2,
      longueurPoteauxSuppMm: 3000,
      sectionPoteaux: model.sectionPoteaux,
    });
    expect(desc).toContain("section 150x150 mm");
    expect(desc).toContain("2 poteaux supplémentaires (section 150x150 mm, hauteur 3000 mm)");
  });
});

describe("Screen models and model labels", () => {
  it("should create a screen model with correct default properties", () => {
    const screen = blankModeleScreen();
    expect(screen.typeModele).toBe("screen");
    expect(screen.typeDim).toBe("largeur_hauteur");
    expect(screen.margeDefaut).toBe(1.5);
    expect(screen.reglesPoteau).toEqual([]);
    expect(screen.toitures.length).toBe(8);
    expect(screen.couleurs.length).toBe(5);
    expect(screen.templateDescription).toContain("Screen ZIP motorisé Somfy");
  });

  it("should return correct UI labels based on model type", () => {
    const screenLabels = getLabelsModele("screen");
    expect(screenLabels.toituresLabel).toBe("Couleur de la toile");
    expect(screenLabels.dim2Label).toBe("Hauteur");
    expect(screenLabels.showPoteaux).toBe(false);

    const voletLabels = getLabelsModele("volet");
    expect(voletLabels.toituresLabel).toBe("Couleur de la toile");
    expect(voletLabels.dim2Label).toBe("Hauteur");
    expect(voletLabels.showPoteaux).toBe(false);

    const pergolaLabels = getLabelsModele("pergola");
    expect(pergolaLabels.toituresLabel).toBe("Toitures / Couvertures");
    expect(pergolaLabels.dim2Label).toBe("Profondeur");
    expect(pergolaLabels.showPoteaux).toBe(true);

    const undefinedLabels = getLabelsModele();
    expect(undefinedLabels.toituresLabel).toBe("Toitures / Couvertures");
    expect(undefinedLabels.dim2Label).toBe("Profondeur");
    expect(undefinedLabels.showPoteaux).toBe(true);
  });

  it("should calculate correctly with additional options on screens", () => {
    const model: ModelePergola = {
      id: "screen-with-options",
      nom: "ZIP Screen",
      nomFournisseur: "ZIP",
      fournisseurId: "f1",
      fournisseurNom: "MB",
      typeModele: "screen",
      typeDim: "largeur_hauteur",
      margeDefaut: 1.5,
      grille: {
        largeurs: [3000],
        profondeurs: [2000],
        prixAchatHT: [[1000]],
      },
      toitures: [],
      couleurs: [],
      optionsSupp: [
        { id: "opt_capteur", nom: "Capteur vent Somfy", surchargeHT: 120, surchargePct: 0 },
        { id: "opt_laquage", nom: "Coloris RAL spécifique", surchargeHT: 0, surchargePct: 10 },
      ],
      reglesPoteau: [],
      templateDescription: "{{nom}} sur mesure\nOptions : {{options_supp}}",
    };

    // Case 1: No extra options selected
    const result1 = calculerPrix(model, 3000, 2000, "", "", 1.5, 2500, 0, 2500, []);
    expect(result1.prixAchatTotalHT).toBe(1000);
    expect(result1.surchargeOptionsSuppHT).toBe(0);

    // Case 2: Somfy wind sensor selected (surcharge: 120)
    const result2 = calculerPrix(model, 3000, 2000, "", "", 1.5, 2500, 0, 2500, ["opt_capteur"]);
    expect(result2.prixAchatTotalHT).toBe(1120);
    expect(result2.surchargeOptionsSuppHT).toBe(120);

    // Case 3: Both options selected (sensor: 120, specific color: 10% of 1000 = 100, total = 220)
    const result3 = calculerPrix(model, 3000, 2000, "", "", 1.5, 2500, 0, 2500, ["opt_capteur", "opt_laquage"]);
    expect(result3.prixAchatTotalHT).toBe(1220);
    expect(result3.surchargeOptionsSuppHT).toBe(220);

    // Case 4: Description interpolation check
    const desc = genererDescription(model.templateDescription, {
      nom: model.nom,
      largeurMm: 3000,
      profondeurMm: 2000,
      toiture: "—",
      couleur: "—",
      poteaux: 0,
      typeDim: "largeur_hauteur",
      optionsSupp: ["Capteur vent Somfy", "Coloris RAL spécifique"],
    });
    expect(desc).toContain("Options : Capteur vent Somfy, Coloris RAL spécifique");
  });
});

describe("ModeleCoulissant calculations & description", () => {
  it("should generate a blank sliding panel model with default properties", () => {
    const model = blankModeleCoulissant();
    expect(model.typeModele).toBe("coulissant");
    expect(model.vantauxMin).toBe(2);
    expect(model.vantauxMax).toBe(6);
    expect(model.tarifsPanneau.length).toBe(4);
    expect(model.options.length).toBe(3);
    expect(model.templateDescription).toContain("{{tarif_panneau}}");
  });

  it("should calculate sliding panel pricing correctly", () => {
    const model = blankModeleCoulissant();
    const standardClairId = model.tarifsPanneau[0].id; // Verre clair standard (145)
    
    // Test basic calculation: 3 panels * 145 = 435, margin 1.45 = 630.75
    const result = calculerPrixCoulissant(model, 3, standardClairId, [], 1.45);
    expect(result.nombreVantaux).toBe(3);
    expect(result.prixPanneau).toBe(145);
    expect(result.prixAchatBaseHT).toBe(435);
    expect(result.surchargesHT).toBe(0);
    expect(result.prixAchatTotalHT).toBe(435);
    expect(result.prixVenteHT).toBe(630.75);

    // Test with options: Serrure (+120)
    const serrureId = model.options[0].id;
    const resultWithOptions = calculerPrixCoulissant(model, 3, standardClairId, [serrureId], 1.45);
    expect(resultWithOptions.prixAchatBaseHT).toBe(435);
    expect(resultWithOptions.surchargesHT).toBe(120);
    expect(resultWithOptions.prixAchatTotalHT).toBe(555);
    expect(resultWithOptions.prixVenteHT).toBe(804.75);

    // Test with percentage options: add custom 10% option
    const modelWithPct = {
      ...model,
      options: [
        ...model.options,
        { id: "opt_custom", nom: "Option custom %", surchargeHT: 0, surchargePct: 10 }
      ]
    };
    const resultWithPct = calculerPrixCoulissant(modelWithPct, 4, standardClairId, ["opt_custom"], 1.45);
    // Base = 4 * 145 = 580. Surcharge = 10% of 580 = 58. Total = 638.
    expect(resultWithPct.prixAchatBaseHT).toBe(580);
    expect(resultWithPct.surchargesHT).toBe(58);
    expect(resultWithPct.prixAchatTotalHT).toBe(638);
  });

  it("should generate description for sliding panel correctly", () => {
    const model = blankModeleCoulissant();
    model.nom = "ORALIS";
    
    const desc = genererDescriptionCoulissant(model, {
      vantaux: 3,
      tarifPanneau: "Verre clair standard",
      couleur: "Anthracite RAL 7016",
      options: ["Serrure + éléments d'entraînement"],
      largeurVerre: 90,
      hauteurVerre: 200,
      hauteurEncastrement: "208 - 212",
    });

    expect(desc).toContain("Parois coulissantes aluminium ORALIS sur mesure");
    expect(desc).toContain("Configuration : 3 vantaux coulissants (verre 90 × 200 cm)");
    expect(desc).toContain("Hauteur d'encastrement : 208 - 212 cm");
    expect(desc).toContain("Verre : Verre clair standard");
    expect(desc).toContain("Couleur structure : Anthracite RAL 7016");
    expect(desc).toContain("Serrure + éléments d'entraînement incluse");
  });

  it("should use fallback auto-injection if template lacks glass size variables", () => {
    const model = blankModeleCoulissant();
    model.nom = "ORALIS";
    model.templateDescription = `Configuration : {{vantaux}} vantaux coulissants\nVerre : {{tarif_panneau}}`;

    const desc = genererDescriptionCoulissant(model, {
      vantaux: 3,
      tarifPanneau: "Verre clair standard",
      couleur: "Anthracite RAL 7016",
      options: [],
      largeurVerre: 90,
      hauteurVerre: 200,
      hauteurEncastrement: "208 - 212",
    });

    expect(desc).toContain("Configuration : 3 vantaux coulissants (verre 90 × 200 cm) — Encastrement : 208 - 212 cm");
    expect(desc).toContain("Verre : Verre clair standard");
  });

  it("should validate abacus definitions", () => {
    expect(ABAQUE_COULISSANT.length).toBe(13);
    const abac190 = ABAQUE_COULISSANT.find(a => a.hauteurVerre === 190);
    expect(abac190?.largeursPermises).toEqual([90, 98, 103]);
    
    const abac200 = ABAQUE_COULISSANT.find(a => a.hauteurVerre === 200);
    expect(abac200?.largeursPermises).toEqual([82, 90, 98, 103]);
  });
});

