import { supabase } from "@/lib/supabase";
import type { Facture } from "@/pages/Factures";

/**
 * Charge toutes les factures de l'utilisateur connecté depuis Supabase.
 */
export async function dbLoadFactures(): Promise<Facture[]> {
  const { data, error } = await supabase
    .from("factures")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur lors du chargement des factures depuis Supabase :", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    numero: row.numero || "",
    type: row.type || "acompte",
    devisId: row.devis_id || "",
    devisNumero: row.devis_numero || "",
    commandeId: row.commande_id || "",
    client: row.client || {},
    lignes: row.lignes || [],
    totalHT: Number(row.total_ht || 0),
    totalTTC: Number(row.total_ttc || 0),
    montantAcompte: Number(row.montant_acompte || 0),
    montantAcomptePct: Number(row.montant_acompte_pct || 0),
    montantAcompte2: row.montant_acompte2 ? Number(row.montant_acompte2) : undefined,
    montantAcompte2Pct: row.montant_acompte2_pct ? Number(row.montant_acompte2_pct) : undefined,
    labelAcompte1: row.label_acompte1 || "",
    labelAcompte2: row.label_acompte2 || "",
    libelle: row.libelle || "",
    dateFacture: row.date_facture || "",
    dateEcheance: row.date_echeance || "",
    modePaiement: row.mode_paiement || "",
    modeReglement: row.mode_reglement || "",
    statut: row.statut || "non_payee",
    reglements: row.reglements || [],
    tvaBreakdown: row.tva_breakdown || [],
    referenceAffaire: row.reference_affaire || "",
    commercial: row.commercial || "",
    interlocuteur: row.interlocuteur || "",
    delai: row.delai || "",
    dureeValidite: row.duree_validite || "",
    exclureTotalCmd: row.exclure_total_cmd || false,
    retenueGarantie: row.retenue_garantie || false,
    marcheRG: row.marche_rg || "",
    dateLeveeRG: row.date_levee_rg || "",
    pctRG: row.pct_rg ? Number(row.pct_rg) : undefined,
    dateRappel1: row.date_rappel1 || "",
    dateCreation: row.date_creation || "",
  }));
}

/**
 * Insère ou met à jour une facture dans Supabase pour l'utilisateur connecté.
 */
export async function dbSaveFacture(facture: Facture): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Aucun utilisateur authentifié pour enregistrer la facture.");
  }

  const dbRow = {
    id: facture.id,
    user_id: user.id,
    local_id: facture.id,
    numero: facture.numero,
    type: facture.type,
    devis_id: facture.devisId,
    devis_numero: facture.devisNumero,
    commande_id: facture.commandeId,
    client: facture.client,
    lignes: facture.lignes,
    total_ht: facture.totalHT,
    total_ttc: facture.totalTTC,
    montant_acompte: facture.montantAcompte,
    montant_acompte_pct: facture.montantAcomptePct,
    montant_acompte2: facture.montantAcompte2,
    montant_acompte2_pct: facture.montantAcompte2Pct,
    label_acompte1: facture.labelAcompte1,
    label_acompte2: facture.labelAcompte2,
    libelle: facture.libelle,
    date_facture: facture.dateFacture,
    date_echeance: facture.dateEcheance,
    mode_paiement: facture.modePaiement,
    mode_reglement: facture.modeReglement,
    statut: facture.statut,
    reglements: facture.reglements,
    tva_breakdown: facture.tvaBreakdown,
    reference_affaire: facture.referenceAffaire,
    commercial: facture.commercial,
    interlocuteur: facture.interlocuteur,
    delai: facture.delai,
    duree_validite: facture.dureeValidite,
    exclure_total_cmd: facture.exclureTotalCmd,
    retenue_garantie: facture.retenueGarantie,
    marche_rg: facture.marcheRG,
    date_levee_rg: facture.dateLeveeRG,
    pct_rg: facture.pctRG,
    date_rappel1: facture.dateRappel1,
    date_creation: facture.dateCreation,
  };

  const { error } = await supabase
    .from("factures")
    .upsert(dbRow, { onConflict: "id" });

  if (error) {
    console.error("Erreur lors de l'enregistrement de la facture dans Supabase :", error);
    throw error;
  }
}

/**
 * Supprime une facture de Supabase.
 */
export async function dbDeleteFacture(factureId: string): Promise<void> {
  const { error } = await supabase
    .from("factures")
    .delete()
    .eq("id", factureId);

  if (error) {
    console.error("Erreur lors de la suppression de la facture de Supabase :", error);
    throw error;
  }
}
