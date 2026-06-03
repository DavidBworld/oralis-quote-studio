import { supabase } from "@/lib/supabase";
import type { Commande } from "@/lib/commande-data";

/**
 * Charge toutes les commandes de l'utilisateur connecté depuis Supabase.
 */
export async function dbLoadCommandes(): Promise<Commande[]> {
  const { data, error } = await supabase
    .from("commandes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur lors du chargement des commandes depuis Supabase :", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    numero: row.numero || "",
    devisId: row.devis_id || "",
    devisNumero: row.devis_numero || "",
    client: row.client || {},
    lignes: row.lignes || [],
    referenceAffaire: row.reference_affaire || "",
    dateLivraison: row.date_livraison || "",
    dateCreation: row.date_creation || "",
    statut: row.statut || "en_cours",
    totalHT: Number(row.total_ht || 0),
    totalTTC: Number(row.total_ttc || 0),
    factures: row.factures || [],
    notes: row.notes || "",
  }));
}

/**
 * Insère ou met à jour une commande dans Supabase pour l'utilisateur connecté.
 */
export async function dbSaveCommande(commande: Commande): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Aucun utilisateur authentifié pour enregistrer la commande.");
  }

  const dbRow = {
    id: commande.id,
    user_id: user.id,
    numero: commande.numero,
    devis_id: commande.devisId,
    devis_numero: commande.devisNumero,
    client: commande.client,
    lignes: commande.lignes,
    reference_affaire: commande.referenceAffaire,
    date_livraison: commande.dateLivraison,
    date_creation: commande.dateCreation,
    statut: commande.statut,
    total_ht: commande.totalHT,
    total_ttc: commande.totalTTC,
    factures: commande.factures,
    notes: commande.notes,
  };

  const { error } = await supabase
    .from("commandes")
    .upsert(dbRow, { onConflict: "id" });

  if (error) {
    console.error("Erreur lors de l'enregistrement de la commande dans Supabase :", error);
    throw error;
  }
}

/**
 * Supprime une commande de Supabase.
 */
export async function dbDeleteCommande(commandeId: string): Promise<void> {
  const { error } = await supabase
    .from("commandes")
    .delete()
    .eq("id", commandeId);

  if (error) {
    console.error("Erreur lors de la suppression de la commande de Supabase :", error);
    throw error;
  }
}
