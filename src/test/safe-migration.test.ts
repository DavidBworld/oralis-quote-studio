import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabase } from "@/lib/supabase";
import {
  detectLocalStorageData,
  getLocalStorageCounts,
  getSupabaseCounts,
  migrateLocalStorageToSupabase,
  clearLocalStorageData,
} from "@/lib/safe-migration";

// Simple RFC4122 compliant UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

describe("Safe Migration Integration Test", () => {
  const testEmail = `test-mig-${Math.random().toString(36).substring(7)}@test.com`;
  const testPassword = "SuperSecurePassword123!!!";

  beforeAll(async () => {
    // 1. Sign out to ensure clean state
    await supabase.auth.signOut();
    localStorage.clear();

    // 2. Register/Sign in test user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    if (signUpError) {
      console.warn("Sign Up failed in test setup:", signUpError.message);
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInError) {
      console.warn("Sign In failed in test setup:", signInError.message);
    }
  });

  afterAll(async () => {
    await supabase.auth.signOut();
    localStorage.clear();
  });

  it("should detect local storage data, calculate counts, migrate to Supabase, and clear local data", async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("Skipping test: email confirmation might be enabled, or sign-in failed.");
      return;
    }

    // 1. Initially, no data should exist in local storage
    expect(detectLocalStorageData()).toBe(false);

    // Generate fresh dynamic UUIDs for this test run to avoid database conflicts across test runs
    const clientId = generateUUID();
    const quoteId = generateUUID();
    const orderId = generateUUID();
    const invoiceId = generateUUID();
    const supplierId = generateUUID();
    const modelId = generateUUID();

    // 2. Seed some mock data in localStorage
    localStorage.setItem(
      "oralis_clients",
      JSON.stringify([
        {
          id: clientId,
          code: "CLI-001",
          nom: "Client1",
          prenom: "Test1",
        },
      ])
    );
    localStorage.setItem(
      "oralis_quotes",
      JSON.stringify([
        {
          id: quoteId,
          numero: "DEV-001",
          validite: 30,
        },
      ])
    );
    localStorage.setItem(
      "oralis_commandes",
      JSON.stringify([
        {
          id: orderId,
          numero: "CMD-001",
          statut: "En attente",
        },
      ])
    );
    localStorage.setItem(
      "oralis_factures",
      JSON.stringify([
        {
          id: invoiceId,
          numero: "FAC-001",
          statut: "Brouillon",
        },
      ])
    );
    localStorage.setItem(
      "oralis_fournisseurs",
      JSON.stringify([
        {
          id: supplierId,
          nom: "Fournisseur1",
        },
      ])
    );
    localStorage.setItem(
      "oralis_modeles_pergola",
      JSON.stringify([
        {
          id: modelId,
          nom: "Modele1",
          typeModele: "pergola",
        },
      ])
    );
    localStorage.setItem(
      "oralis_settings",
      JSON.stringify({
        company: { nom: "Entreprise Test", motDePasse: "123" },
        comptabilite: { nomEntreprise: "Entreprise Test" },
      })
    );

    // 3. Detect and Count check
    expect(detectLocalStorageData()).toBe(true);
    const localCounts = getLocalStorageCounts();
    expect(localCounts.clients).toBe(1);
    expect(localCounts.devis).toBe(1);
    expect(localCounts.commandes).toBe(1);
    expect(localCounts.factures).toBe(1);
    expect(localCounts.fournisseurs).toBe(1);
    expect(localCounts.modeles).toBe(1);
    expect(localCounts.settings).toBe(2);

    // 4. Perform Migration to Supabase
    const migrationResult = await migrateLocalStorageToSupabase();
    if (!migrationResult.success) {
      console.error("Migration failed with errors:", migrationResult.errors);
    }
    expect(migrationResult.success).toBe(true);
    expect(migrationResult.errors).toBeUndefined();

    // 5. Verify Supabase Counts match local counts
    const dbCounts = await getSupabaseCounts();
    expect(dbCounts.clients).toBe(1);
    expect(dbCounts.devis).toBe(1);
    expect(dbCounts.commandes).toBe(1);
    expect(dbCounts.factures).toBe(1);
    expect(dbCounts.fournisseurs).toBe(1);
    expect(dbCounts.modeles).toBe(1);
    expect(dbCounts.settings).toBe(2);

    // Verify migration status key
    expect(localStorage.getItem("oralis_migration_status")).toBe("migrated");

    // 6. Clear local data
    clearLocalStorageData();
    const localCountsAfterClear = getLocalStorageCounts();
    expect(localCountsAfterClear.clients).toBe(0);
    expect(localCountsAfterClear.devis).toBe(0);
    expect(localCountsAfterClear.settings).toBe(0);
    expect(localStorage.getItem("oralis_migration_status")).toBe("cleared");

    // Ensure remote data in database is NOT affected by local clearing
    const dbCountsAfterClear = await getSupabaseCounts();
    expect(dbCountsAfterClear.clients).toBe(1);
  });
});
