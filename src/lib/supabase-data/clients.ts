import { supabase } from "@/lib/supabase";
import type { Client } from "@/lib/client-data";

/**
 * Charge tous les clients de l'utilisateur connecté depuis Supabase.
 */
export async function dbLoadClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur lors du chargement des clients depuis Supabase :", error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    code: row.code,
    type: row.type,
    statut: row.statut,
    favori: row.favori,
    civilite: row.civilite || "",
    prenom: row.prenom,
    nom: row.nom,
    societe: row.societe,
    email: row.email,
    telephone: row.telephone,
    mobile: row.mobile,
    adresse: row.adresse,
    ville: row.ville,
    codePostal: row.code_postal,
    pays: row.pays,
    tvaDefaut: row.tva_defaut,
    modeReglement: row.mode_reglement,
    origine: row.origine,
    profil: row.profil,
    commercial: row.commercial,
    noteInterne: row.note_interne,
    pipeline: row.pipeline,
    motifPerte: row.motif_perte,
    interactions: row.interactions || [],
    resteAFaire: row.reste_a_faire || [],
    photos: row.photos || [],
    createdAt: row.created_at,
  }));
}

/**
 * Insère ou met à jour un client dans Supabase pour l'utilisateur connecté.
 */
export async function dbSaveClient(client: Client): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Aucun utilisateur authentifié pour enregistrer le client.");
  }

  const dbRow = {
    id: client.id,
    user_id: user.id,
    code: client.code,
    type: client.type,
    statut: client.statut,
    favori: client.favori,
    civilite: client.civilite || "",
    prenom: client.prenom,
    nom: client.nom,
    societe: client.societe,
    email: client.email,
    telephone: client.telephone,
    mobile: client.mobile,
    adresse: client.adresse,
    ville: client.ville,
    code_postal: client.codePostal,
    pays: client.pays,
    tva_defaut: client.tvaDefaut,
    mode_reglement: client.modeReglement,
    origine: client.origine,
    profil: client.profil,
    commercial: client.commercial,
    note_interne: client.noteInterne,
    pipeline: client.pipeline,
    motif_perte: client.motifPerte,
    interactions: client.interactions,
    reste_a_faire: client.resteAFaire,
    photos: client.photos,
  };

  const { error } = await supabase
    .from("clients")
    .upsert(dbRow, { onConflict: "id" });

  if (error) {
    console.error("Erreur lors de l'enregistrement du client dans Supabase :", error);
    throw error;
  }
}

/**
 * Supprime un client de Supabase.
 */
export async function dbDeleteClient(clientId: string): Promise<void> {
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (error) {
    console.error("Erreur lors de la suppression du client de Supabase :", error);
    throw error;
  }
}
