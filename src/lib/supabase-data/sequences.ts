import { supabase } from "@/lib/supabase";

/**
 * Récupère et incrémente le prochain numéro de séquence pour le type donné (devis ou facture).
 * Gère automatiquement le changement d'année et l'initialisation à 250 au 1er janvier.
 */
export async function dbGetNextSequenceNumber(type: "devis" | "facture", anneeOverride?: number): Promise<string> {
  const annee = anneeOverride || new Date().getFullYear();
  
  const { data, error } = await supabase.rpc("increment_sequence", {
    p_type: type,
    p_annee: annee
  });

  if (error) {
    console.error("Erreur lors de l'incrémentation de la séquence :", error);
    // Fallback de sécurité (ne devrait jamais arriver si le RPC est bien configuré)
    return `OR${annee}999`; 
  }

  const num = data as number;
  return `OR${annee}${num}`;
}

/**
 * Resynchronise silencieusement le compteur si l'utilisateur a modifié manuellement un numéro
 * pour une valeur supérieure au compteur actuel.
 */
export async function dbResyncSequenceNumber(numero: string, type: "devis" | "facture"): Promise<void> {
  if (!numero) return;

  // Regex pour matcher OR2026261 ou ORA2026261 (extraction année + compteur)
  const match = numero.match(/^ORA?(\d{4})(\d{3,})$/);
  
  if (!match) {
    console.warn(`[Sequences] Le numéro '${numero}' ne correspond pas au format attendu (OR[année][compteur]). Resynchronisation ignorée.`);
    return;
  }

  const annee = parseInt(match[1], 10);
  const val = parseInt(match[2], 10);

  const { error } = await supabase.rpc("resync_sequence", {
    p_type: type,
    p_annee: annee,
    p_nouvelle_valeur: val
  });

  if (error) {
    console.error(`[Sequences] Erreur lors de la resynchronisation du compteur pour ${numero} :`, error);
  }
}
