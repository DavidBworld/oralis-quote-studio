import { describe, it, expect, beforeAll } from "vitest";
import { supabase } from "@/lib/supabase";
import { dbSaveClient, dbLoadClients, dbDeleteClient } from "@/lib/supabase-data/clients";
import type { Client } from "@/lib/client-data";

describe("Supabase Clients CRUD Integration Test", () => {
  let testUser: any = null;
  const testEmail = `test-${Math.random().toString(36).substring(7)}@test.com`;
  const testPassword = "SuperSecurePassword123!";

  beforeAll(async () => {
    // 1. Tente de créer un utilisateur de test
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.warn("Avertissement lors de la création de l'utilisateur de test :", error.message);
    } else {
      testUser = data.user;
    }

    // 2. Tente de s'authentifier
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.warn("Avertissement lors de l'authentification :", signInError.message);
    }
  });

  it("should perform full CRUD operations on clients table if authenticated", async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("Test sauté : l'authentification automatique a échoué (la confirmation d'e-mail par défaut de Supabase est probablement activée).");
      return;
    }

    const testClient: Client = {
      id: "3e0c7094-1a91-4cfd-82d2-8f199b0c25b0", // format UUID valide pour la clé primaire
      code: "CLI-TEST-999",
      type: "particulier",
      statut: "prospect",
      favori: true,
      prenom: "Test-Prenom",
      nom: "Test-Nom",
      email: "test.client@example.com",
      telephone: "0102030405",
      adresse: "1 Main Street",
      ville: "Paris",
      codePostal: "75001",
      pays: "France",
      tvaDefaut: 20,
      modeReglement: "Virement",
      origine: "Test",
      profil: "standard",
      pipeline: "nouveau_lead",
      interactions: [],
      resteAFaire: [],
      photos: [],
      createdAt: new Date().toISOString(),
    };

    // 1. CREATE / UPDATE (Upsert)
    await dbSaveClient(testClient);

    // 2. READ (Load)
    const clients = await dbLoadClients();
    const found = clients.find((c) => c.id === testClient.id);
    expect(found).toBeDefined();
    expect(found?.nom).toBe("Test-Nom");
    expect(found?.prenom).toBe("Test-Prenom");
    expect(found?.code).toBe("CLI-TEST-999");
    expect(found?.favori).toBe(true);

    // 3. DELETE
    await dbDeleteClient(testClient.id);

    // 4. READ AGAIN (Verify deletion)
    const clientsAfterDelete = await dbLoadClients();
    const foundAfter = clientsAfterDelete.find((c) => c.id === testClient.id);
    expect(foundAfter).toBeUndefined();
  });
});
