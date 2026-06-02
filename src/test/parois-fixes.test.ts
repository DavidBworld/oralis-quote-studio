import { describe, it, expect } from "vitest";
import {
  blankModeleParoiFixe,
  calculerPrixParoiFixe,
  genererDescriptionParoiFixe,
  type ModeleParoiFixe,
  blankModeleParoiGrille,
  calculerPrixParoiGrille,
  genererDescriptionParoiGrille,
  type ModeleParoiGrille,
} from "../lib/configurator-data";

describe("Parois Fixes Model tests", () => {
  const model: ModeleParoiFixe = blankModeleParoiFixe();

  describe("calculerPrixParoiFixe", () => {
    it("should calculate base price with coefficient and no height surcharge", () => {
      const state = {
        typeParoi: "Aluminium 12 lattes (192 cm de haut)",
        largeurParoi: 150,
        hauteurParoi: 192,
        prixAchatBaseHT: 800,
      };
      const result = calculerPrixParoiFixe(model, state, 1.5);
      expect(result.prixAchatBaseHT).toBe(800);
      expect(result.surchargeHauteurHT).toBe(0);
      expect(result.prixAchatTotalHT).toBe(800);
      expect(result.prixVenteHT).toBe(1200); // 800 * 1.5
    });

    it("should add 150 EUR surcharge for Verre fixe rectangle when height > 220 cm", () => {
      const state = {
        typeParoi: "Verre fixe rectangle",
        largeurParoi: 100,
        hauteurParoi: 230, // > 220
        prixAchatBaseHT: 500,
      };
      const result = calculerPrixParoiFixe(model, state, 1.4);
      expect(result.surchargeHauteurHT).toBe(150);
      expect(result.prixAchatTotalHT).toBe(650); // 500 + 150
      expect(result.prixVenteHT).toBe(910); // 650 * 1.4
    });

    it("should NOT add surcharge for Verre fixe rectangle when height <= 220 cm", () => {
      const state = {
        typeParoi: "Verre fixe rectangle",
        largeurParoi: 100,
        hauteurParoi: 220, // = 220
        prixAchatBaseHT: 500,
      };
      const result = calculerPrixParoiFixe(model, state, 1.4);
      expect(result.surchargeHauteurHT).toBe(0);
      expect(result.prixAchatTotalHT).toBe(500);
    });

    it("should add 150 EUR surcharge for Verre fixe incliné when height > 275 cm", () => {
      const state = {
        typeParoi: "Verre fixe incliné",
        largeurParoi: 150,
        hauteurParoi: 280, // > 275
        prixAchatBaseHT: 600,
      };
      const result = calculerPrixParoiFixe(model, state, 1.5);
      expect(result.surchargeHauteurHT).toBe(150);
      expect(result.prixAchatTotalHT).toBe(750); // 600 + 150
      expect(result.prixVenteHT).toBe(1125); // 750 * 1.5
    });

    it("should NOT add surcharge for Verre fixe incliné when height <= 275 cm", () => {
      const state = {
        typeParoi: "Verre fixe incliné",
        largeurParoi: 150,
        hauteurParoi: 270, // < 275
        prixAchatBaseHT: 600,
      };
      const result = calculerPrixParoiFixe(model, state, 1.5);
      expect(result.surchargeHauteurHT).toBe(0);
      expect(result.prixAchatTotalHT).toBe(600);
    });
  });

  describe("genererDescriptionParoiFixe", () => {
    it("should interpolate template variables properly", () => {
      model.nom = "MB FIXED 2026";
      const desc = genererDescriptionParoiFixe(model, {
        typeParoi: "Verre fixe rectangle",
        largeur: 120,
        hauteur: 240,
        couleur: "RAL 7016 Anthracite",
        notes: "Attention : Hauteur importante",
      });

      expect(desc).toContain("MB FIXED 2026");
      expect(desc).toContain("Verre fixe rectangle");
      expect(desc).toContain("Largeur 120 cm");
      expect(desc).toContain("Hauteur 240 cm");
      expect(desc).toContain("RAL 7016 Anthracite");
      expect(desc).toContain("Attention : Hauteur importante");
    });

    it("should override height to 192 cm automatically for Aluminium 12 lattes", () => {
      const desc = genererDescriptionParoiFixe(model, {
        typeParoi: "Aluminium 12 lattes (192 cm de haut)",
        largeur: 100,
        hauteur: 0, // input is ignored
        couleur: "RAL 9016 Blanc",
        notes: "",
      });
      expect(desc).toContain("Hauteur 192 cm");
    });

    it("should override height to 200 cm automatically for Aluminium 10 lattes", () => {
      const desc = genererDescriptionParoiFixe(model, {
        typeParoi: "Aluminium 10 lattes (200 cm de haut)",
        largeur: 100,
        hauteur: 0, // input is ignored
        couleur: "RAL 9016 Blanc",
        notes: "",
      });
      expect(desc).toContain("Hauteur 200 cm");
    });
  });
});

describe("Paroi avec Grille Model tests", () => {
  const model: ModeleParoiGrille = blankModeleParoiGrille();

  describe("calculerPrixParoiGrille", () => {
    it("should select price based on width using arrondi supérieur", () => {
      // Modify model to have mock prices for Aluminium 12 lattes H192 cm
      const typeAlu = model.typesParoi[0]; // Aluminium 12 lattes H192 cm
      typeAlu.largeurs = [2500, 3000, 3500, 4000, 5000];
      typeAlu.prixAchatHT = [500, 600, 700, 800, 1000];

      const state = {
        typeParoiId: typeAlu.id,
        largeurMm: 2800, // should round up to 3000 -> price 600
        couleurId: model.couleurs[0].id, // Blanc (no surcharge)
      };

      const result = calculerPrixParoiGrille(model, state, 1.5);
      expect(result.prixAchatBaseHT).toBe(600);
      expect(result.largeurGrille).toBe(3000);
      expect(result.surchargeCouleurHT).toBe(0);
      expect(result.surchargeHauteurHT).toBe(0);
      expect(result.prixAchatTotalHT).toBe(600);
      expect(result.prixVenteHT).toBe(900); // 600 * 1.5
    });

    it("should fallback to max width if largeurMm exceeds all entries", () => {
      const typeAlu = model.typesParoi[0];
      const state = {
        typeParoiId: typeAlu.id,
        largeurMm: 6000, // exceeds max (5000)
        couleurId: model.couleurs[0].id,
      };
      typeAlu.prixAchatHT = [500, 600, 700, 800, 1000];

      const result = calculerPrixParoiGrille(model, state, 1.5);
      expect(result.prixAchatBaseHT).toBe(1000);
      expect(result.largeurGrille).toBe(5000);
    });

    it("should apply height surcharge for Verre type > 220 cm", () => {
      const typeVerre = model.typesParoi[2]; // Verre fixe rectangle
      typeVerre.prixAchatHT = [600, 700, 800, 900, 1100];
      
      const state = {
        typeParoiId: typeVerre.id,
        largeurMm: 3000, // 3000 -> price 700
        hauteurCm: 230, // > 220
        couleurId: model.couleurs[0].id,
      };

      const result = calculerPrixParoiGrille(model, state, 1.5);
      expect(result.prixAchatBaseHT).toBe(700);
      expect(result.surchargeHauteurHT).toBe(150);
      expect(result.prixAchatTotalHT).toBe(850); // 700 + 150
      expect(result.prixVenteHT).toBe(1275); // 850 * 1.5
    });

    it("should apply color surcharge", () => {
      const typeAlu = model.typesParoi[0];
      typeAlu.prixAchatHT = [500, 600, 700, 800, 1000];

      // Add a custom color with surcharge
      const customColor = { id: "custom_c", nom: "Custom Bronze", surchargeHT: 50, surchargePct: 10 };
      model.couleurs.push(customColor);

      const state = {
        typeParoiId: typeAlu.id,
        largeurMm: 3000, // price 600
        couleurId: "custom_c",
      };

      const result = calculerPrixParoiGrille(model, state, 1.5);
      expect(result.prixAchatBaseHT).toBe(600);
      expect(result.surchargeCouleurHT).toBe(110); // 50 + 10% of 600 = 50 + 60 = 110
      expect(result.prixAchatTotalHT).toBe(710); // 600 + 110
      expect(result.prixVenteHT).toBe(1065); // 710 * 1.5
    });
  });

  describe("genererDescriptionParoiGrille", () => {
    it("should format final description using the default template", () => {
      const desc = genererDescriptionParoiGrille(model, {
        typeParoi: "Aluminium 12 lattes H192 cm",
        largeur: 250,
        couleur: "IJzerglimmer DB703",
        notes: "Note : Largeur supérieure à 96 cm",
      });

      expect(desc).toContain("Paroi latérale fixe MB Aluminium — Aluminium 12 lattes H192 cm");
      expect(desc).toContain("Largeur : 250 cm");
      expect(desc).toContain("Couleur structure : IJzerglimmer DB703");
      expect(desc).toContain("Note : Largeur supérieure à 96 cm");
    });
  });
});

