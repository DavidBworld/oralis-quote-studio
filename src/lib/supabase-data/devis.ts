import { supabase } from "@/lib/supabase";
import type { Quote } from "@/lib/quote-data";

/**
 * Charge tous les devis de l'utilisateur connecté depuis Supabase.
 */
export async function dbLoadQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("devis")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur lors du chargement des devis depuis Supabase :", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    numero: row.numero,
    date: row.date,
    validite: row.validite,
    statut: row.statut,
    client: row.client || {},
    lignes: row.lignes || [],
    conditionsPaiement: row.conditions_paiement || "",
    paymentConditionId: row.payment_condition_id || "",
    delaiRealisation: row.delai_realisation || "",
    notes: row.notes || "",
    delai: row.delai || "",
  }));
}

/**
 * Insère ou met à jour un devis dans Supabase pour l'utilisateur connecté.
 */
export async function dbSaveQuote(quote: Quote): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Aucun utilisateur authentifié pour enregistrer le devis.");
  }

  const dbRow = {
    id: quote.id,
    user_id: user.id,
    numero: quote.numero,
    date: quote.date,
    validite: quote.validite,
    statut: quote.statut,
    client: quote.client,
    lignes: quote.lignes,
    conditions_paiement: quote.conditionsPaiement,
    payment_condition_id: quote.paymentConditionId,
    delai_realisation: quote.delaiRealisation,
    notes: quote.notes,
    delai: quote.delai,
  };

  const { error } = await supabase
    .from("devis")
    .upsert(dbRow, { onConflict: "id" });

  if (error) {
    console.error("Erreur lors de l'enregistrement du devis dans Supabase :", error);
    throw error;
  }
}

/**
 * Supprime un devis de Supabase.
 */
export async function dbDeleteQuote(quoteId: string): Promise<void> {
  const { error } = await supabase
    .from("devis")
    .delete()
    .eq("id", quoteId);

  if (error) {
    console.error("Erreur lors de la suppression du devis de Supabase :", error);
    throw error;
  }
}
