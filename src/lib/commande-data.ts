import { uid, type Quote, type QuoteLine, calcTotals, formatEUR, formatDate, type PaymentStepAmount } from "@/lib/quote-data";

// ── Types ──

export interface CommandeFacture {
  factureId: string;
  numero: string;
  type: "acompte_commande" | "acompte_livraison" | "solde" | "intermediaire";
  label: string;
  pctPrevu: number;
  montantTTC: number;
  dateCreation: string;
}

export interface Commande {
  id: string;
  numero: string;
  devisId: string;
  devisNumero: string;
  client: Quote["client"];
  lignes: QuoteLine[];
  referenceAffaire: string;
  dateLivraison: string;
  dateCreation: string;
  statut: "en_cours" | "livree" | "terminee" | "annulee";
  totalHT: number;
  totalTTC: number;
  factures: CommandeFacture[];
  notes: string;
  montantsPaiement?: PaymentStepAmount[];
}

// ── Labels ──

export const COMMANDE_STATUT_LABELS: Record<Commande["statut"], string> = {
  en_cours: "En cours",
  livree: "Livrée",
  terminee: "Terminée",
  annulee: "Annulée",
};

export const COMMANDE_STATUT_CLASS: Record<Commande["statut"], string> = {
  en_cours: "bg-[hsl(220_75%_96%)] text-[hsl(220_75%_45%)] rounded-full",
  livree: "bg-[hsl(30_80%_95%)] text-[hsl(30_80%_40%)] rounded-full",
  terminee: "status-accepte",
  annulee: "status-refuse",
};

// ── Echeancier par défaut: 50% / 45% / 5% ──

export const ECHEANCIER_DEFAUT = [
  { type: "acompte_commande" as const, label: "Acompte à la commande", pct: 50 },
  { type: "acompte_livraison" as const, label: "Acompte à la livraison", pct: 45 },
  { type: "solde" as const, label: "Solde fin de travaux", pct: 5 },
];

// ── localStorage ──

const STORAGE_KEY = "oralis_commandes";

export function loadCommandes(): Commande[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCommandes(commandes: Commande[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(commandes));
}

export function nextCommandeNumber(commandes?: Commande[]): string {
  const all = commandes || loadCommandes();
  const y = new Date().getFullYear();
  const nums = all.map((c) => {
    const m = c.numero.match(/CMD-\d+-(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }).filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `ORALIS-CMD-${y}-${String(next).padStart(3, "0")}`;
}

// ── Numérotation facture: OR2026250, OR2026251... ──

export function nextFactureNumberOR(factures?: any[]): string {
  try {
    const allFactures = factures || JSON.parse(localStorage.getItem("oralis_factures") || "[]");
    const y = new Date().getFullYear().toString().slice(-2); // "26"
    const prefix = `OR${new Date().getFullYear()}`;
    const nums = allFactures
      .map((f: any) => {
        const m = f.numero.match(/^OR\d{4}(\d+)$/);
        return m ? parseInt(m[1]) : 0;
      })
      .filter((n: number) => n > 0);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 250;
    return `${prefix}${next}`;
  } catch {
    return `OR${new Date().getFullYear()}250`;
  }
}

// ── Calculs commande ──

export function getCommandeTotalFacture(commande: Commande): number {
  return commande.factures.reduce((s, f) => s + f.montantTTC, 0);
}

export function getCommandeResteAFacturer(commande: Commande): number {
  return commande.totalTTC - getCommandeTotalFacture(commande);
}

export function getProchainEcheancier(commande: Commande): { type: "acompte_commande" | "acompte_livraison" | "solde" | "intermediaire", label: string, pct: number, montant?: number } | null {
  const facturesCreees = commande.factures.length;
  if (commande.montantsPaiement && commande.montantsPaiement.length > 0) {
    if (facturesCreees < commande.montantsPaiement.length) {
      const step = commande.montantsPaiement[facturesCreees];
      const type = facturesCreees === 0 
        ? "acompte_commande" 
        : (facturesCreees === commande.montantsPaiement.length - 1 ? "solde" : "acompte_livraison");
      return {
        type,
        label: step.label,
        pct: step.pourcentage,
        montant: step.montant
      };
    }
    return null;
  }

  if (facturesCreees < ECHEANCIER_DEFAUT.length) {
    return ECHEANCIER_DEFAUT[facturesCreees];
  }
  return null;
}

// ── Créer une commande depuis un devis accepté ──

export function createCommandeFromDevis(quote: Quote, referenceAffaire: string, dateLivraison: string, commandes?: Commande[], dateCreation?: string): Commande {
  const totals = calcTotals(quote.lignes);
  return {
    id: uid(),
    numero: nextCommandeNumber(commandes),
    devisId: quote.id,
    devisNumero: quote.numero,
    client: quote.client,
    lignes: quote.lignes,
    referenceAffaire,
    dateLivraison,
    dateCreation: dateCreation || new Date().toISOString().split("T")[0],
    statut: "en_cours",
    totalHT: totals.sousTotal,
    totalTTC: totals.totalTTC,
    factures: [],
    notes: "",
    montantsPaiement: quote.montantsPaiement,
  };
}

// ── Créer une facture liée à une commande ──

export function createFactureFromCommande(
  commande: Commande,
  type: CommandeFacture["type"],
  label: string,
  pctPrevu: number,
  montantTTC: number,
  dateFacture: string,
  dateEcheance: string,
  modePaiement: string,
  factureNumeroCustom?: string
): any {
  const totals = calcTotals(commande.lignes);

  // Calculer la ventilation TVA proportionnelle
  const tvaBreakdown = Object.entries(totals.tvaMap).map(([taux, montantTVA]) => {
    const t = parseFloat(taux);
    let baseHT = 0;
    for (const l of commande.lignes) {
      if (l.tva === t) baseHT += l.quantite * l.prixUnitaireHT;
      for (const o of l.options) { if (o.tva === t) baseHT += o.prixHT; }
    }
    return { taux: t, baseHT, montantTVA: montantTVA as number, montantTTC: baseHT + (montantTVA as number) };
  });

  const factureNumero = factureNumeroCustom || nextFactureNumberOR();
  const factureId = uid();

  const facture = {
    id: factureId,
    numero: factureNumero,
    type: type === "acompte_commande" || type === "acompte_livraison" || type === "intermediaire" ? "acompte" : "solde",
    devisId: commande.devisId,
    devisNumero: commande.devisNumero,
    commandeId: commande.id,
    commandeNumero: commande.numero,
    client: commande.client,
    lignes: commande.lignes,
    totalHT: totals.sousTotal,
    totalTTC: totals.totalTTC,
    montantAcompte: montantTTC,
    montantAcomptePct: pctPrevu,
    libelle: label,
    dateFacture,
    dateEcheance,
    modePaiement,
    statut: "non_payee",
    reglements: [],
    dateCreation: new Date().toISOString().split("T")[0],
    tvaBreakdown,
  };

  const commandeFacture: CommandeFacture = {
    factureId,
    numero: factureNumero,
    type,
    label,
    pctPrevu,
    montantTTC,
    dateCreation: dateFacture,
  };

  return { facture, commandeFacture };
}
