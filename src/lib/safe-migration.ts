import { supabase } from "@/lib/supabase";

export interface MigrationCounts {
  clients: number;
  devis: number;
  commandes: number;
  factures: number;
  fournisseurs: number;
  modeles: number;
  settings: number;
}

export interface MigrationResult {
  success: boolean;
  countsBefore: MigrationCounts;
  countsAfter: MigrationCounts;
  errors?: string[];
}

/**
 * Detects if there is any local storage data available that hasn't been migrated/skipped yet.
 */
export function detectLocalStorageData(): boolean {
  const status = localStorage.getItem("oralis_migration_status");
  // If migration is already marked as migrated or skipped, don't prompt again.
  if (status === "migrated" || status === "skipped") {
    return false;
  }

  const counts = getLocalStorageCounts();
  // Return true if there is any user data locally
  return (
    counts.clients > 0 ||
    counts.devis > 0 ||
    counts.commandes > 0 ||
    counts.factures > 0 ||
    counts.fournisseurs > 0 ||
    counts.modeles > 0 ||
    counts.settings > 0
  );
}

/**
 * Returns counts of records for each module in localStorage.
 */
export function getLocalStorageCounts(): MigrationCounts {
  const clients = JSON.parse(localStorage.getItem("oralis_clients") || "[]");
  const devis = JSON.parse(localStorage.getItem("oralis_quotes") || "[]");
  const commandes = JSON.parse(localStorage.getItem("oralis_commandes") || "[]");
  const factures = JSON.parse(localStorage.getItem("oralis_factures") || "[]");
  const fournisseurs = JSON.parse(localStorage.getItem("oralis_fournisseurs") || "[]");
  const modeles = JSON.parse(localStorage.getItem("oralis_modeles_pergola") || "[]");
  const settingsRaw = localStorage.getItem("oralis_settings");

  let settingsCount = 0;
  if (settingsRaw) {
    try {
      const parsed = JSON.parse(settingsRaw);
      settingsCount = Object.keys(parsed).length;
    } catch {}
  }

  return {
    clients: Array.isArray(clients) ? clients.length : 0,
    devis: Array.isArray(devis) ? devis.length : 0,
    commandes: Array.isArray(commandes) ? commandes.length : 0,
    factures: Array.isArray(factures) ? factures.length : 0,
    fournisseurs: Array.isArray(fournisseurs) ? fournisseurs.length : 0,
    modeles: Array.isArray(modeles) ? modeles.length : 0,
    settings: settingsCount,
  };
}

/**
 * Retrieves exact count of records for the logged-in user from Supabase.
 */
export async function getSupabaseCounts(): Promise<MigrationCounts> {
  const counts: MigrationCounts = {
    clients: 0,
    devis: 0,
    commandes: 0,
    factures: 0,
    fournisseurs: 0,
    modeles: 0,
    settings: 0,
  };

  const { count: clientsCount, error: clientsError } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });
  if (!clientsError) counts.clients = clientsCount || 0;

  const { count: devisCount, error: devisError } = await supabase
    .from("devis")
    .select("*", { count: "exact", head: true });
  if (!devisError) counts.devis = devisCount || 0;

  const { count: commandesCount, error: commandesError } = await supabase
    .from("commandes")
    .select("*", { count: "exact", head: true });
  if (!commandesError) counts.commandes = commandesCount || 0;

  const { count: facturesCount, error: facturesError } = await supabase
    .from("factures")
    .select("*", { count: "exact", head: true });
  if (!facturesError) counts.factures = facturesCount || 0;

  const { count: fournisseursCount, error: fournisseursError } = await supabase
    .from("fournisseurs")
    .select("*", { count: "exact", head: true });
  if (!fournisseursError) counts.fournisseurs = fournisseursCount || 0;

  const { count: modelesCount, error: modelesError } = await supabase
    .from("modeles")
    .select("*", { count: "exact", head: true });
  if (!modelesError) counts.modeles = modelesCount || 0;

  const { count: settingsCount, error: settingsError } = await supabase
    .from("settings")
    .select("*", { count: "exact", head: true });
  if (!settingsError) counts.settings = settingsCount || 0;

  return counts;
}

/**
 * Performs a secure migration of all localStorage data to Supabase.
 */
export async function migrateLocalStorageToSupabase(): Promise<MigrationResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Utilisateur non connecté à Supabase");
  }
  const userId = user.id;

  const countsBefore = await getSupabaseCounts();
  const errors: string[] = [];

  // 1. Clients Migration
  const localClients = JSON.parse(localStorage.getItem("oralis_clients") || "[]");
  if (Array.isArray(localClients) && localClients.length > 0) {
    const clientsToInsert = localClients.map((c: any) => {
      const item: any = {
        user_id: userId,
        local_id: c.id,
        code: c.code,
        type: c.type,
        statut: c.statut,
        favori: c.favori || false,
        civilite: c.civilite,
        prenom: c.prenom,
        nom: c.nom,
        societe: c.societe,
        email: c.email,
        telephone: c.telephone,
        mobile: c.mobile,
        adresse: c.adresse,
        ville: c.ville,
        code_postal: c.codePostal,
        pays: c.pays,
        tva_defaut: c.tvaDefaut,
        mode_reglement: c.modeReglement,
        origine: c.origine,
        profil: c.profil,
        commercial: c.commercial,
        note_interne: c.noteInterne,
        pipeline: c.pipeline,
        motif_perte: c.motifPerte,
        interactions: c.interactions || [],
        reste_a_faire: c.resteAFaire || [],
        photos: c.photos || [],
      };

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(c.id)) {
        item.id = c.id;
      }
      return item;
    });

    const { error } = await supabase
      .from("clients")
      .upsert(clientsToInsert, { onConflict: "user_id,local_id" });
    if (error) errors.push(`Erreur migration Clients : ${error.message}`);
  }

  // 2. Modeles Migration
  const localModeles = JSON.parse(localStorage.getItem("oralis_modeles_pergola") || "[]");
  if (Array.isArray(localModeles) && localModeles.length > 0) {
    const modelesToInsert = localModeles.map((m: any) => {
      const item: any = {
        user_id: userId,
        local_id: m.id,
        data: m,
      };
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(m.id)) {
        item.id = m.id;
      }
      return item;
    });

    const { error } = await supabase
      .from("modeles")
      .upsert(modelesToInsert, { onConflict: "user_id,local_id" });
    if (error) errors.push(`Erreur migration Modèles : ${error.message}`);
  }

  // 3. Fournisseurs Migration
  const localFournisseurs = JSON.parse(localStorage.getItem("oralis_fournisseurs") || "[]");
  if (Array.isArray(localFournisseurs) && localFournisseurs.length > 0) {
    const fournisseursToInsert = localFournisseurs.map((f: any) => {
      const item: any = {
        user_id: userId,
        local_id: f.id,
        nom: f.nom,
        societe: f.societe,
        email: f.email,
        telephone: f.telephone,
        adresse: f.adresse,
        categorie: f.categorie,
        notes: f.notes,
        produits: f.produits || [],
        date_creation: f.dateCreation,
      };
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(f.id)) {
        item.id = f.id;
      }
      return item;
    });

    const { error } = await supabase
      .from("fournisseurs")
      .upsert(fournisseursToInsert, { onConflict: "user_id,local_id" });
    if (error) errors.push(`Erreur migration Fournisseurs : ${error.message}`);
  }

  // 4. Devis Migration (fuses oralis_devis_favoris)
  const localDevis = JSON.parse(localStorage.getItem("oralis_quotes") || "[]");
  const localFavoris = JSON.parse(localStorage.getItem("oralis_devis_favoris") || "[]");
  const favorisList = Array.isArray(localFavoris) ? localFavoris : [];
  if (Array.isArray(localDevis) && localDevis.length > 0) {
    const devisToInsert = localDevis.map((q: any) => {
      const item: any = {
        user_id: userId,
        local_id: q.id,
        numero: q.numero,
        date: q.date,
        validite: q.validite,
        statut: q.statut,
        client: q.client || {},
        lignes: q.lignes || [],
        conditions_paiement: q.conditionsPaiement,
        payment_condition_id: q.paymentConditionId,
        delai_realisation: q.delaiRealisation,
        notes: q.notes,
        favori: favorisList.includes(q.id),
        montants_paiement: q.montantsPaiement || [],
      };

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(q.id)) {
        item.id = q.id;
      }
      return item;
    });

    const { error } = await supabase
      .from("devis")
      .upsert(devisToInsert, { onConflict: "user_id,local_id" });
    if (error) errors.push(`Erreur migration Devis : ${error.message}`);
  }

  // 5. Commandes Migration
  const localCommandes = JSON.parse(localStorage.getItem("oralis_commandes") || "[]");
  if (Array.isArray(localCommandes) && localCommandes.length > 0) {
    const commandesToInsert = localCommandes.map((c: any) => ({
      id: c.id,
      user_id: userId,
      numero: c.numero,
      devis_id: c.devisId,
      devis_numero: c.devisNumero,
      client: c.client || {},
      lignes: c.lignes || [],
      reference_affaire: c.referenceAffaire,
      date_livraison: c.dateLivraison,
      date_creation: c.dateCreation,
      statut: c.statut,
      total_ht: c.totalHT,
      total_ttc: c.totalTTC,
      factures: c.factures || [],
      notes: c.notes,
      montants_paiement: c.montantsPaiement || [],
    }));

    const { error } = await supabase.from("commandes").upsert(commandesToInsert);
    if (error) errors.push(`Erreur migration Commandes : ${error.message}`);
  }

  // 6. Factures Migration
  const localFactures = JSON.parse(localStorage.getItem("oralis_factures") || "[]");
  if (Array.isArray(localFactures) && localFactures.length > 0) {
    const facturesToInsert = localFactures.map((f: any) => {
      const item: any = {
        user_id: userId,
        local_id: f.id,
        numero: f.numero,
        type: f.type,
        devis_id: f.devisId,
        devis_numero: f.devisNumero,
        commande_id: f.commandeId,
        client: f.client || {},
        lignes: f.lignes || [],
        total_ht: f.totalHT,
        total_ttc: f.totalTTC,
        montant_acompte: f.montantAcompte,
        montant_acompte_pct: f.montantAcomptePct,
        montant_acompte2: f.montantAcompte2,
        montant_acompte2_pct: f.montantAcompte2Pct,
        label_acompte1: f.labelAcompte1,
        label_acompte2: f.labelAcompte2,
        libelle: f.libelle,
        date_facture: f.dateFacture,
        date_echeance: f.dateEcheance,
        mode_paiement: f.modePaiement,
        mode_reglement: f.modeReglement,
        statut: f.statut,
        reglements: f.reglements || [],
        tva_breakdown: f.tvaBreakdown || [],
        reference_affaire: f.referenceAffaire,
        commercial: f.commercial,
        interlocuteur: f.interlocuteur,
        delai: f.delai,
        duree_validite: f.dureeValidite,
        exclure_total_cmd: f.exclureTotalCmd || false,
        retenue_garantie: f.retenueGarantie || false,
        marche_rg: f.marcheRg,
        date_levee_rg: f.dateLeveeRg,
        pct_rg: f.pctRg,
        date_rappel1: f.dateRappel1,
        date_creation: f.dateCreation,
      };

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(f.id)) {
        item.id = f.id;
      }
      return item;
    });

    const { error } = await supabase
      .from("factures")
      .upsert(facturesToInsert, { onConflict: "user_id,local_id" });
    if (error) errors.push(`Erreur migration Factures : ${error.message}`);
  }

  // 7. Settings Migration
  const settingsRaw = localStorage.getItem("oralis_settings");
  if (settingsRaw) {
    try {
      const parsed = JSON.parse(settingsRaw);
      const keys = Object.keys(parsed);
      const settingsToInsert = keys.map((key) => ({
        user_id: userId,
        key: key,
        value: parsed[key],
      }));

      // Settings table has UNIQUE (user_id, key) constraint, so upsert handles conflicts
      const { error } = await supabase
        .from("settings")
        .upsert(settingsToInsert, { onConflict: "user_id,key" });
      if (error) errors.push(`Erreur migration Settings : ${error.message}`);
    } catch (e: any) {
      errors.push(`Erreur parse Settings : ${e.message}`);
    }
  }

  const countsAfter = await getSupabaseCounts();
  const success = errors.length === 0;

  if (success) {
    localStorage.setItem("oralis_migration_status", "migrated");
  }

  return {
    success,
    countsBefore,
    countsAfter,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Clears the localStorage key data.
 * IMPORTANT: Call this ONLY after explicit confirmation.
 */
export function clearLocalStorageData(): void {
  const keysToClear = [
    "oralis_clients",
    "oralis_quotes",
    "oralis_commandes",
    "oralis_factures",
    "oralis_fournisseurs",
    "oralis_modeles_pergola",
    "oralis_devis_favoris",
    "oralis_settings",
  ];
  keysToClear.forEach((k) => localStorage.removeItem(k));
  localStorage.setItem("oralis_migration_status", "cleared");
}
