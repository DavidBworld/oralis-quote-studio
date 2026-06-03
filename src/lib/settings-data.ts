import { uid } from "@/lib/quote-data";

// ── Types ──

export interface CompanySettings {
  nom: string;
  rue: string;
  ville: string;
  codePostal: string;
  pays: string;
  telephone: string;
  email: string;
  siteWeb: string;
  siret: string;
  tvaIntra: string;
  formeJuridique: string;
  capitalSocial: string;
  rcsVille: string;
  mentionGarantie: string;
  conditionsPaiement: string;
  delaiRealisation: string;
  motDePasse: string;
}

export interface ComptabiliteSettings {
  nomEntreprise: string;
  adresseEntreprise: string;
  cpVilleEntreprise: string;
  telephone: string;
  emailComptabilite: string;
  siret: string;
  iban: string;
  bic: string;
}

export interface DocumentSettings {
  enTete: string;
  piedDePage: string;
  couleurPrincipale: string;
  couleurSecondaire: string;
  afficherLogo: boolean;
  afficherPhoto: boolean;
  mentionLegale: string;
  zoneSignature: boolean;
  texteSignatureClient: string;
  texteSignatureEntreprise: string;
}

export interface CoefficientRow {
  id: string;
  categorie: string;
  coefficient: number;
}

export interface TVARateSetting {
  rate: number;
  label: string;
  enabled: boolean;
}

export interface FournisseurRemise {
  id: string;
  fournisseur: string;
  remise: number;
  notes: string;
}

export interface CatalogProduct {
  id: string;
  reference: string;
  designation: string;
  description: string;
  prixAchatHT: number;
  categorie: string;
  fournisseur: string;
  unite: string;
}

export interface CatalogPose {
  id: string;
  typePose: string;
  description: string;
  unite: string;
  prixUnitaireHT: number;
  dureeEstimee: number;
}

export interface PaymentConditionStep {
  id: string;
  type: "acompte" | "solde";
  label: string;
  pct: number;
}

export interface PaymentCondition {
  id: string;
  nom: string;
  steps: PaymentConditionStep[];
}

export interface AppSettings {
  company: CompanySettings;
  logo: string; // base64 or ""
  documentDevis: DocumentSettings;
  documentFacture: DocumentSettings;
  coefficients: CoefficientRow[];
  tvaRates: TVARateSetting[];
  fournisseurRemises: FournisseurRemise[];
  catalogProduits: CatalogProduct[];
  catalogPose: CatalogPose[];
  paymentConditionsList: PaymentCondition[];
  comptabilite: ComptabiliteSettings;
}

// ── Defaults ──

const SETTINGS_KEY = "oralis_settings";

export function defaultCompany(): CompanySettings {
  return {
    nom: "ORALIS SAS",
    rue: "30 rue de la poudrière",
    ville: "Saint Max",
    codePostal: "54130",
    pays: "France",
    telephone: "+352 661 457 599",
    email: "contact@pergola-oralis.com",
    siteWeb: "pergola-oralis.com",
    siret: "903 507 283",
    tvaIntra: "FR33903507283",
    formeJuridique: "SAS",
    capitalSocial: "",
    rcsVille: "Nancy",
    mentionGarantie: "Garantie décennale",
    conditionsPaiement: "50% à la commande, 45% à la livraison, 5% à la réception des travaux",
    delaiRealisation: "6 à 8 semaines",
    motDePasse: "ORALIS2026",
  };
}

export function defaultDocumentSettings(): DocumentSettings {
  return {
    enTete: "",
    piedDePage: "",
    couleurPrincipale: "#C9A84C",
    couleurSecondaire: "#0D0D0D",
    afficherLogo: true,
    afficherPhoto: false,
    mentionLegale: "",
    zoneSignature: true,
    texteSignatureClient: "Bon pour accord",
    texteSignatureEntreprise: "Cachet ORALIS",
  };
}

export function defaultCoefficients(): CoefficientRow[] {
  return [
    { id: uid(), categorie: "Pergolas bioclimatiques", coefficient: 2.20 },
    { id: uid(), categorie: "Jardins d'hiver", coefficient: 2.10 },
    { id: uid(), categorie: "Carports", coefficient: 2.00 },
    { id: uid(), categorie: "Stores & protections", coefficient: 2.50 },
    { id: uid(), categorie: "Pose & installation", coefficient: 3.00 },
    { id: uid(), categorie: "Options & accessoires", coefficient: 2.80 },
  ];
}

export function defaultTVARates(): TVARateSetting[] {
  return [
    { rate: 0, label: "0% (exonéré)", enabled: true },
    { rate: 3, label: "3% (Luxembourg réduit)", enabled: true },
    { rate: 10, label: "10% (France réduit)", enabled: true },
    { rate: 17, label: "17% (Luxembourg standard)", enabled: true },
    { rate: 20, label: "20% (France standard)", enabled: true },
  ];
}

export function defaultPaymentConditions(): PaymentCondition[] {
  return [
    {
      id: "std-50-45-5",
      nom: "Standard (50% / 45% / 5%)",
      steps: [
        { id: "step-1", type: "acompte", label: "à la commande", pct: 50 },
        { id: "step-2", type: "acompte", label: "à la livraison", pct: 45 },
        { id: "step-3", type: "solde", label: "à la fin des travaux", pct: 5 }
      ]
    },
    {
      id: "std-30-40-30",
      nom: "Standard 2 (30% / 40% / 30%)",
      steps: [
        { id: "step-4", type: "acompte", label: "à la commande", pct: 30 },
        { id: "step-5", type: "acompte", label: "à la livraison", pct: 40 },
        { id: "step-6", type: "solde", label: "à la fin des travaux", pct: 30 }
      ]
    },
    {
      id: "solde-100",
      nom: "Paiement 100% commande",
      steps: [
        { id: "step-7", type: "solde", label: "à la commande", pct: 100 }
      ]
    }
  ];
}

export function defaultSettings(): AppSettings {
  return {
    company: defaultCompany(),
    logo: "/oralis-logo.png",
    documentDevis: defaultDocumentSettings(),
    documentFacture: defaultDocumentSettings(),
    coefficients: defaultCoefficients(),
    tvaRates: defaultTVARates(),
    fournisseurRemises: [],
    catalogProduits: [],
    catalogPose: [],
    paymentConditionsList: defaultPaymentConditions(),
    comptabilite: defaultComptabilite(),
  };
}

export function defaultComptabilite(): ComptabiliteSettings {
  return {
    nomEntreprise: "ORALIS SAS",
    adresseEntreprise: "30 rue de la poudrière",
    cpVilleEntreprise: "54130 Saint Max",
    telephone: "+352 661 457 599",
    emailComptabilite: "compta@pergola-oralis.com",
    siret: "903 507 283",
    iban: "FR76 3000 2000 1000 0123 4567 890",
    bic: "AGRIFRPPXXX",
  };
}

// ── Persistence ──

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle new fields
      const defaults = defaultSettings();
      const merged = {
        ...defaults,
        ...parsed,
        company: { ...defaults.company, ...parsed.company },
        comptabilite: { ...defaults.comptabilite, ...parsed.comptabilite },
        paymentConditionsList: parsed.paymentConditionsList || defaults.paymentConditionsList
      };
      // If no logo was set, use the default ORALIS logo
      if (!merged.logo) merged.logo = defaults.logo;

      // Migrate / ensure unique ids exist on all items
      if (merged.coefficients) {
        merged.coefficients = merged.coefficients.map((c: any) => ({
          id: c.id || uid(),
          ...c
        }));
      }
      if (merged.paymentConditionsList) {
        merged.paymentConditionsList = merged.paymentConditionsList.map((p: any) => ({
          id: p.id || uid(),
          ...p,
          steps: (p.steps || []).map((s: any) => ({
            id: s.id || uid(),
            ...s
          }))
        }));
      }
      if (merged.fournisseurRemises) {
        merged.fournisseurRemises = merged.fournisseurRemises.map((r: any) => ({
          id: r.id || uid(),
          ...r
        }));
      }
      if (merged.catalogProduits) {
        merged.catalogProduits = merged.catalogProduits.map((p: any) => ({
          id: p.id || uid(),
          ...p
        }));
      }
      if (merged.catalogPose) {
        merged.catalogPose = merged.catalogPose.map((p: any) => ({
          id: p.id || uid(),
          ...p
        }));
      }

      return merged;
    }
    return defaultSettings();
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Helpers ──

export function getEnabledTVARates(settings: AppSettings): number[] {
  return settings.tvaRates.filter((t) => t.enabled).map((t) => t.rate);
}

export function getCoefficient(settings: AppSettings, categorie: string): number {
  const found = settings.coefficients.find(
    (c) => c.categorie.toLowerCase() === categorie.toLowerCase()
  );
  return found ? found.coefficient : 1;
}

export function getProductDesignations(settings: AppSettings): string[] {
  const catalogNames = settings.catalogProduits.map((p) => p.designation);
  return catalogNames;
}

export function getLegalMention(settings: AppSettings): string {
  if (settings.documentDevis.mentionLegale) return settings.documentDevis.mentionLegale;
  const c = settings.company;
  return `SIRET ${c.siret} — TVA ${c.tvaIntra} — RCS ${c.rcsVille} — ${c.mentionGarantie}`;
}

export function checkPassword(input: string): boolean {
  const settings = loadSettings();
  // "RESET" permet de toujours entrer en cas d'oubli du mot de passe
  if (input === "RESET") return true;
  return input === settings.company.motDePasse;
}

export function formatEURCoeff(prixAchat: number, coeff: number): string {
  return (prixAchat * coeff).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
