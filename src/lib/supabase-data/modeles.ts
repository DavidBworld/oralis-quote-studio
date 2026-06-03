import { supabase } from "@/lib/supabase";
import { type AnyModele, migrateModeles } from "@/lib/configurator-data";

/**
 * Charge tous les modèles depuis Supabase pour l'utilisateur connecté.
 */
export async function dbLoadModeles(): Promise<AnyModele[]> {
  const { data, error } = await supabase
    .from("modeles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erreur lors du chargement des modèles depuis Supabase :", error);
    throw error;
  }

  const rawList = (data || []).map((row) => {
    const m = row.data as AnyModele;
    m.id = row.id;
    // Attach database created_at timestamp to allow ordering swaps
    (m as any).createdAt = row.created_at;
    return m;
  });

  // Run data migrations on loaded models
  return migrateModeles(rawList);
}

/**
 * Insère ou met à jour un modèle dans Supabase pour l'utilisateur connecté.
 */
export async function dbSaveModele(modele: AnyModele, createdAt?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Aucun utilisateur authentifié pour enregistrer le modèle.");
  }

  // Remove temporary createdAt property from database content
  const cleanModele = { ...modele };
  delete (cleanModele as any).createdAt;

  const dbRow: any = {
    id: cleanModele.id,
    user_id: user.id,
    data: cleanModele,
  };

  if (createdAt) {
    dbRow.created_at = createdAt;
  }

  const { error } = await supabase
    .from("modeles")
    .upsert(dbRow, { onConflict: "id" });

  if (error) {
    console.error("Erreur lors de l'enregistrement du modèle dans Supabase :", error);
    throw error;
  }
}

/**
 * Supprime un modèle de Supabase.
 */
export async function dbDeleteModele(modeleId: string): Promise<void> {
  const { error } = await supabase
    .from("modeles")
    .delete()
    .eq("id", modeleId);

  if (error) {
    console.error("Erreur lors de la suppression du modèle de Supabase :", error);
    throw error;
  }
}
