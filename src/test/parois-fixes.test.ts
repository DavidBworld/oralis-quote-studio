import { describe, it, expect } from "vitest";
import {
  blankModeleParoiFixe,
  calculerPrixParoiFixe,
  genererDescriptionParoiFixe,
  type ModeleParoiFixe,
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
