import { supabase } from "@/lib/supabase";
import type { Fournisseur } from "@/pages/Fournisseurs";

/**
 * Charge tous les fournisseurs depuis Supabase pour l'utilisateur connecté.
 */
export async function dbLoadFournisseurs(): Promise<Fournisseur[]> {
  const { data, error } = await supabase
    .from("fournisseurs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur lors du chargement des fournisseurs depuis Supabase :", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nom: row.nom || "",
    societe: row.societe || "",
    email: row.email || "",
    telephone: row.telephone || "",
    adresse: row.adresse || "",
    categorie: row.categorie || "",
    notes: row.notes || "",
    produits: row.produits || [],
    dateCreation: row.date_creation || "",
  }));
}

/**
 * Insère ou met à jour un fournisseur dans Supabase.
 */
export async function dbSaveFournisseur(f: Fournisseur): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Aucun utilisateur authentifié pour enregistrer le fournisseur.");
  }

  const dbRow = {
    id: f.id,
    user_id: user.id,
    nom: f.nom,
    societe: f.societe,
    email: f.email,
    telephone: f.telephone,
    adresse: f.adresse,
    categorie: f.categorie,
    notes: f.notes,
    produits: f.produits,
    date_creation: f.dateCreation,
  };

  const { error } = await supabase
    .from("fournisseurs")
    .upsert(dbRow, { onConflict: "id" });

  if (error) {
    console.error("Erreur lors de l'enregistrement du fournisseur dans Supabase :", error);
    throw error;
  }
}

/**
 * Supprime un fournisseur de Supabase.
 */
export async function dbDeleteFournisseur(fournisseurId: string): Promise<void> {
  const { error } = await supabase
    .from("fournisseurs")
    .delete()
    .eq("id", fournisseurId);

  if (error) {
    console.error("Erreur lors de la suppression du fournisseur de Supabase :", error);
    throw error;
  }
}
