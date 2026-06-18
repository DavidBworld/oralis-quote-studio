import { supabase } from "@/lib/supabase";

export interface Commercial {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  role: "manager" | "commercial" | "comptable" | "acheteur";
  pays: string;
  actif: boolean;
  createdAt?: string;
}

/**
 * Charge tous les commerciaux de l'utilisateur connecté depuis Supabase.
 */
export async function dbLoadCommerciaux(): Promise<Commercial[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("Utilisateur non authentifié dans dbLoadCommerciaux, renvoi d'un tableau vide.");
      return [];
    }

    const { data, error } = await supabase
      .from("commerciaux")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur lors du chargement des commerciaux depuis Supabase :", error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      prenom: row.prenom,
      nom: row.nom,
      email: row.email,
      telephone: row.telephone,
      role: row.role as Commercial["role"],
      pays: row.pays,
      actif: row.actif,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error("Erreur attrapée dans dbLoadCommerciaux :", err);
    return [];
  }
}

/**
 * Insère ou met à jour un commercial dans Supabase pour l'utilisateur connecté.
 */
export async function dbSaveCommercial(commercial: Commercial): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Aucun utilisateur authentifié pour enregistrer le commercial.");
  }

  const dbRow = {
    id: commercial.id,
    user_id: user.id,
    prenom: commercial.prenom,
    nom: commercial.nom,
    email: commercial.email,
    telephone: commercial.telephone,
    role: commercial.role,
    pays: commercial.pays,
    actif: commercial.actif,
  };

  const { error } = await supabase
    .from("commerciaux")
    .upsert(dbRow, { onConflict: "id" });

  if (error) {
    console.error("Erreur lors de l'enregistrement du commercial dans Supabase :", error);
    throw error;
  }
}

/**
 * Supprime un commercial de Supabase.
 */
export async function dbDeleteCommercial(commercialId: string): Promise<void> {
  const { error } = await supabase
    .from("commerciaux")
    .delete()
    .eq("id", commercialId);

  if (error) {
    console.error("Erreur lors de la suppression du commercial de Supabase :", error);
    throw error;
  }
}
