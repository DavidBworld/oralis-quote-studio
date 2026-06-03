import { supabase } from "@/lib/supabase";
import { type AppSettings, defaultSettings } from "@/lib/settings-data";
import { uid } from "@/lib/quote-data";

/**
 * Charge tous les paramètres depuis Supabase pour l'utilisateur connecté.
 * Reconstruit l'objet AppSettings en fusionnant avec les valeurs par défaut
 * et en appliquant les migrations nécessaires.
 */
export async function dbLoadSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*");

  if (error) {
    console.error("Erreur lors du chargement des paramètres depuis Supabase :", error);
    throw error;
  }

  const defaults = defaultSettings();
  const dbData: Record<string, any> = {};

  if (data && data.length > 0) {
    data.forEach((row) => {
      dbData[row.key] = row.value;
    });
  }

  // Merge loaded keys with default settings
  const merged = {
    ...defaults,
    ...dbData,
    company: { ...defaults.company, ...dbData.company },
    comptabilite: { ...defaults.comptabilite, ...dbData.comptabilite },
    paymentConditionsList: dbData.paymentConditionsList || defaults.paymentConditionsList,
  };

  // If no logo was set, use the default logo
  if (!merged.logo) {
    merged.logo = defaults.logo;
  }

  // Identical migrations to loadSettings()
  if (merged.comptabilite.nomEntreprise === "ORALIS SAS") {
    merged.comptabilite.nomEntreprise = "TOUT POUR MA TERRASSE - SAS";
  }
  if (merged.comptabilite.emailComptabilite === "compta@pergola-oralis.com") {
    merged.comptabilite.emailComptabilite = "contact@pergola-oralis.com";
  }
  if (merged.company.nom === "ORALIS SAS") {
    merged.company.nom = "TOUT POUR MA TERRASSE - SAS";
  }
  if (merged.company.email === "compta@pergola-oralis.com") {
    merged.company.email = "contact@pergola-oralis.com";
  }

  if (merged.coefficients) {
    merged.coefficients = merged.coefficients.map((c: any) => ({
      id: c.id || uid(),
      ...c
    }));
  }
  if (merged.paymentConditionsList) {
    merged.paymentConditionsList = merged.paymentConditionsList.map((p: any) => ({
      id: p.id || uid(),
      ...p,
      steps: (p.steps || []).map((s: any) => ({
        id: s.id || uid(),
        ...s
      }))
    }));
  }
  if (merged.fournisseurRemises) {
    merged.fournisseurRemises = merged.fournisseurRemises.map((r: any) => ({
      id: r.id || uid(),
      ...r
    }));
  }
  if (merged.catalogProduits) {
    merged.catalogProduits = merged.catalogProduits.map((p: any) => ({
      id: p.id || uid(),
      ...p
    }));
  }
  if (merged.catalogPose) {
    merged.catalogPose = merged.catalogPose.map((p: any) => ({
      id: p.id || uid(),
      ...p
    }));
  }

  return merged;
}

/**
 * Enregistre les paramètres dans Supabase en effectuant un upsert pour chaque clé.
 */
export async function dbSaveSettings(settings: AppSettings): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Aucun utilisateur authentifié pour enregistrer les paramètres.");
  }

  const keys = Object.keys(settings);
  const settingsToInsert = keys.map((key) => ({
    user_id: user.id,
    key: key,
    value: (settings as any)[key],
  }));

  const { error } = await supabase
    .from("settings")
    .upsert(settingsToInsert, { onConflict: "user_id,key" });

  if (error) {
    console.error("Erreur lors de l'enregistrement des paramètres dans Supabase :", error);
    throw error;
  }
}
