// Types
export interface QuoteOption {
  id: string;
  designation: string;
  prixHT: number;
  tva: number;
}

export interface QuoteLine {
  id: string;
  image?: string;
  designation: string;
  description: string;
  quantite: number;
  prixUnitaireHT: number;
  tva: number;
  options: QuoteOption[];
  prixAchatHT?: number;
  categorie?: string;
  prixOriginalHT?: number;
  unite?: string;
  configuratorState?: any;
}

export interface QuoteClient {
  type: "particulier" | "professionnel";
  civilite?: string;
  prenom: string;
  nom: string;
  societe: string;
  email: string;
  telephone: string;
  rue: string;
  ville: string;
  codePostal: string;
  pays: string;
}

export interface PaymentStepAmount {
  label: string;
  pourcentage: number;
  montant: number;
}

export interface Quote {
  id: string;
  numero: string;
  date: string;
  validite: number;
  statut: "brouillon" | "envoye" | "accepte" | "refuse";
  client: QuoteClient;
  lignes: QuoteLine[];
  conditionsPaiement: string;
  paymentConditionId?: string;
  delaiRealisation: string;
  notes: string;
  delai?: string;
  montantsPaiement?: PaymentStepAmount[];
  commercialId?: string;
  adresseLivraison?: {
    identique: boolean;
    nom?: string;
    rue?: string;
    ville?: string;
    codePostal?: string;
    pays?: string;
  };
}

// Catalogs
export const PRODUCT_CATALOG = [
  "Pergola Bioclimatique à Lames Orientables",
  "Jardin d'Hiver & Parois Vitrées",
  "Carport Aluminium Sur-Mesure",
  "Pergola à Toile Rétractable",
  "Store Screen ZIP",
  "Prestation personnalisée",
];

export const OPTION_CATALOG = [
  "Motorisation Somfy",
  "Éclairage LED Intégré",
  "Chauffage Infrarouge",
  "Paroi Vitrée Coulissante",
  "Store Intégré",
  "Domotique Connectée",
  "Pose & Installation",
  "Étude Architecturale 3D",
  "Option personnalisée",
];

export const TVA_RATES = [0, 3, 10, 17, 20];
export const VALIDITE_OPTIONS = [15, 30, 45, 60];
export const PAYS_OPTIONS = ["France", "Luxembourg", "Belgique", "Allemagne", "Autre"];

export const STATUT_LABELS: Record<Quote["statut"], string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};

// Helpers
export const uid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export function formatEUR(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR");
}

export function formatClientName(client?: { civilite?: string; nom?: string; prenom?: string } | null): string {
  if (!client) return "";
  const civ = (client.civilite || "").trim();
  const nom = (client.nom || "").trim().toUpperCase();
  const prenom = (client.prenom || "").trim();
  
  if (civ && prenom) {
    return `${civ} ${nom} ${prenom}`;
  } else if (civ) {
    return `${civ} ${nom}`;
  } else if (prenom) {
    return `${nom} ${prenom}`;
  } else {
    return nom;
  }
}

export function expiryDate(date: string, validite: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + validite);
  return d.toISOString().split("T")[0];
}

export function lineMontantHT(l: QuoteLine): number {
  return l.quantite * l.prixUnitaireHT;
}

export function lineTVA(l: QuoteLine): number {
  return lineMontantHT(l) * (l.tva / 100);
}

export function optionTTC(o: QuoteOption): number {
  return o.prixHT * (1 + o.tva / 100);
}

export function calcTotals(lignes: QuoteLine[]) {
  let sousTotal = 0;
  const tvaMap: Record<number, number> = {};

  for (const l of lignes) {
    const ht = lineMontantHT(l);
    sousTotal += ht;
    tvaMap[l.tva] = (tvaMap[l.tva] || 0) + ht * (l.tva / 100);

    for (const o of l.options) {
      sousTotal += o.prixHT;
      tvaMap[o.tva] = (tvaMap[o.tva] || 0) + o.prixHT * (o.tva / 100);
    }
  }

  const totalTVA = Object.values(tvaMap).reduce((a, b) => a + b, 0);
  return { sousTotal, tvaMap, totalTVA, totalTTC: sousTotal + totalTVA };
}

// localStorage
const STORAGE_KEY = "oralis_quotes";

export function loadQuotes(): Quote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQuotes(quotes: Quote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

export function nextQuoteNumber(quotes: Quote[]): string {
  const year = new Date().getFullYear();
  const existing = quotes
    .map((q) => {
      const m = q.numero.match(/ORALIS-\d+-(\d+)/);
      return m ? parseInt(m[1]) : 0;
    })
    .filter(Boolean);
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `ORALIS-${year}-${String(next).padStart(3, "0")}`;
}

export function emptyClient(): QuoteClient {
  return {
    type: "particulier",
    prenom: "",
    nom: "",
    societe: "",
    email: "",
    telephone: "",
    rue: "",
    ville: "",
    codePostal: "",
    pays: "France",
  };
}

export function emptyLine(tvaDefault: number = 20): QuoteLine {
  return {
    id: uid(),
    image: "",
    designation: "",
    description: "",
    quantite: 1,
    prixUnitaireHT: 0,
    tva: tvaDefault,
    options: [],
    prixAchatHT: 0,
    categorie: "",
    prixOriginalHT: 0,
    unite: "unité",
  };
}

export function emptyOption(tvaDefault: number = 20): QuoteOption {
  return { id: uid(), designation: "", prixHT: 0, tva: tvaDefault };
}

export function createEmptyQuote(quotes: Quote[]): Quote {
  return {
    id: uid(),
    numero: nextQuoteNumber(quotes),
    date: new Date().toISOString().split("T")[0],
    validite: 30,
    statut: "brouillon",
    client: emptyClient(),
    lignes: [emptyLine()],
    conditionsPaiement: "50% à la commande, 45% à la livraison, 5% à la réception des travaux",
    paymentConditionId: "std-50-45-5",
    delaiRealisation: "6 à 8 semaines",
    notes: "",
    delai: "De 8 à 10 semaines",
    adresseLivraison: { identique: true },
  };
}

export function createEmptyQuoteWithNumber(numero: string): Quote {
  return {
    id: uid(),
    numero,
    date: new Date().toISOString().split("T")[0],
    validite: 30,
    statut: "brouillon",
    client: emptyClient(),
    lignes: [emptyLine()],
    conditionsPaiement: "50% à la commande, 45% à la livraison, 5% à la réception des travaux",
    paymentConditionId: "std-50-45-5",
    delaiRealisation: "6 à 8 semaines",
    notes: "",
    delai: "De 8 à 10 semaines",
    adresseLivraison: { identique: true },
  };
}

// Sample data
export function getSampleQuote(): Quote {
  return {
    id: "sample1",
    numero: "ORALIS-2026-001",
    date: "2026-03-10",
    validite: 30,
    statut: "envoye",
    client: {
      type: "particulier",
      prenom: "Jean-Pierre",
      nom: "Müller",
      societe: "",
      email: "jp.muller@email.lu",
      telephone: "+352 621 123 456",
      rue: "12 Rue de la Gare",
      ville: "Luxembourg",
      codePostal: "1616",
      pays: "Luxembourg",
    },
    lignes: [
      {
        id: "l1",
        designation: "Pergola Bioclimatique à Lames Orientables",
        description: "Structure aluminium laqué RAL 7016, dimensions 6m x 4m",
        quantite: 1,
        prixUnitaireHT: 18500,
        tva: 17,
        options: [
          { id: "o1", designation: "Motorisation Somfy", prixHT: 1200, tva: 17 },
          { id: "o2", designation: "Éclairage LED Intégré", prixHT: 800, tva: 17 },
        ],
      },
    ],
    conditionsPaiement: "50% à la commande, 45% à la livraison, 5% à la réception des travaux",
    delaiRealisation: "6 à 8 semaines",
    notes: "",
  };
}

export function initializeStorage() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing === null) {
    saveQuotes([getSampleQuote()]);
  }
}
