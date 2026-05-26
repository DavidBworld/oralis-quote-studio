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
  type GrilleTarif,
  type ModelePergola,
} from "../lib/configurator-data";

describe("calculerPoteaux", () => {
  const regles = [
    { largeurMinMm: 0, largeurMaxMm: 4000, nombrePoteaux: 2 },
    { largeurMinMm: 4001, largeurMaxMm: 6000, nombrePoteaux: 3 },
    { largeurMinMm: 6001, largeurMaxMm: 10000, nombrePoteaux: 4 },
  ];

  it("should match rules within range", () => {
    expect(calculerPoteaux(regles, 3000)).toBe(2);
    expect(calculerPoteaux(regles, 4000)).toBe(2);
    expect(calculerPoteaux(regles, 4001)).toBe(3);
    expect(calculerPoteaux(regles, 5500)).toBe(3);
    expect(calculerPoteaux(regles, 6000)).toBe(3);
    expect(calculerPoteaux(regles, 8000)).toBe(4);
  });

  it("should return 2 by default if no rule matches", () => {
    expect(calculerPoteaux(regles, 12000)).toBe(2);
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
Poteaux: {{poteaux}}`;

    const ctx = {
      nom: "Pergola Design",
      largeurMm: 4250,
      profondeurMm: 2900,
      toiture: "Polycarbonate transparent",
      couleur: "RAL 7016",
      poteaux: 3,
      typeDim: "largeur_profondeur" as const,
    };

    const desc = genererDescription(template, ctx);
    expect(desc).toContain("Pergola Design sur mesure");
    expect(desc).toContain("Largeur 4,25m x Profondeur 2,90m");
    expect(desc).toContain("Toiture: Polycarbonate transparent");
    expect(desc).toContain("Couleur: RAL 7016");
    expect(desc).toContain("Poteaux: 3");
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

  it("should format dimensions for quote description without spaces", () => {
    expect(formatDimDevis(3000)).toBe("3,00m");
    expect(formatDimDevis(4250)).toBe("4,25m");
  });

  it("should format coefficient", () => {
    expect(formatCoef(1.4)).toBe("×1.40 (+40%)");
    expect(formatCoef(1.55)).toBe("×1.55 (+55%)");
  });
});
