import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Read .env manually
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env file not found at " + envPath);
  }
  const envContent = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      env[key] = value.trim();
    }
  });

  const supabaseUrl = env["VITE_SUPABASE_URL"];
  const supabaseServiceKey = env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env");
  }

  console.log("Initializing Supabase Admin client...");
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  // 1. Get a valid user_id
  console.log("Fetching users from auth...");
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError) {
    throw new Error("Failed to list users: " + usersError.message);
  }
  const users = usersData.users || [];
  if (users.length === 0) {
    throw new Error("No users found in auth.users database.");
  }
  const userId = users[0].id;
  console.log(`Using user_id: ${userId} (${users[0].email})`);

  // 2. Fetch suppliers to find MB supplier
  console.log("Fetching suppliers...");
  const { data: suppliers, error: supError } = await supabaseAdmin.from("fournisseurs").select("*");
  if (supError) {
    throw new Error("Failed to load suppliers: " + supError.message);
  }

  let supplierId = "";
  let supplierNom = "";
  
  const mbSupplier = (suppliers || []).find((s) => s.nom.toLowerCase().includes("mb") || s.societe?.toLowerCase().includes("mb"));
  if (mbSupplier) {
    supplierId = mbSupplier.id;
    supplierNom = mbSupplier.nom;
    console.log(`Found matching supplier: ${supplierNom} (${supplierId})`);
  } else if (suppliers && suppliers.length > 0) {
    supplierId = suppliers[0].id;
    supplierNom = suppliers[0].nom;
    console.log(`No specific MB supplier found. Fallback to first supplier: ${supplierNom} (${supplierId})`);
  } else {
    supplierId = "00000000-0000-0000-0000-000000000000";
    supplierNom = "MB";
    console.log(`No suppliers in database. Using default/fallback: ${supplierNom} (${supplierId})`);
  }

  // 3. Define the model
  const modelId = "9a6dcf8e-161b-4f9e-a89e-29219e918451"; // stable UUID for idempotency
  const payload = {
    id: modelId,
    typeModele: "coulissant",
    nom: "Baie Coulissante MB",
    nomFournisseur: "PAROIS COULISSANTES MB",
    fournisseurId: supplierId,
    fournisseurNom: supplierNom,
    margeDefaut: 2.7,
    vantauxMin: 2,
    vantauxMax: 4,
    isCustomDimension: true,
    grillesVantaux: {
      "2": {
        largeurs: [2000, 2500, 3000, 3500, 4000],
        prixAchatHT: [883, 1027, 1170, 1314, 1458]
      },
      "4": {
        largeurs: [3000, 4000, 5000, 6000, 7000],
        prixAchatHT: [1291, 1486, 1645, 1743, 1841]
      }
    },
    surchargesHauteur: [
      { limite: 2299, surcharge: 150 },
      { limite: 2499, surcharge: 150 }
    ],
    tarifsPanneau: [
      {
        id: "standard-442",
        label: "Verre de sécurité retardateur d'effraction 44.2",
        prixHT: 0,
        description: "Inclus de série"
      }
    ],
    options: [
      { id: "opt-ventilation", nom: "Grille de ventilation", surchargeHT: 210, surchargePct: 0 },
      { id: "opt-poignees", nom: "Poignées intégrées", surchargeHT: 45, surchargePct: 0 }
    ],
    couleurs: [
      { id: "col-ral9016", nom: "RAL 9016 Blanc", surchargeHT: 0, surchargePct: 0 },
      { id: "col-ral9007", "nom": "RAL 9007 Gris Métallique", surchargeHT: 0, surchargePct: 0 },
      { id: "col-db703", "nom": "DB703 Gris Pailleté", surchargeHT: 0, surchargePct: 0 },
      { id: "col-ral7016", "nom": "RAL 7016 Anthracite", surchargeHT: 0, surchargePct: 0 },
      { id: "col-ral9005", "nom": "RAL 9005 Noir", surchargeHT: 0, surchargePct: 0 }
    ],
    templateDescription:
`{{nom}} sur mesure
Configuration : {{vantaux}} vantaux coulissants
Dimensions : Largeur {{largeur}} mm × Hauteur {{hauteur}} mm
Verre : Verre de sécurité retardateur d'effraction 44.2
Couleur structure : {{couleur}}
Fabrication entièrement sur mesure`,
    descriptionGenerale: "Les baies coulissantes Oralis créent une extension de vie idéale toute l'année. Construction robuste offrant une excellente isolation, système de verrouillage intégré sécurisé. Disponibles en 2 ou 4 vantaux. Structure aluminium thermolaquée. Verre de sécurité retardateur d'effraction 44.2 inclus. Option Double Vitrage 44.2/12/4 disponible sur demande.",
    ordre: 10,
  };

  console.log("Upserting model in Supabase modeles table...");
  const dbRow = {
    id: modelId,
    user_id: userId,
    data: payload,
    updated_at: new Date().toISOString()
  };

  const { error: upsertError } = await supabaseAdmin
    .from("modeles")
    .upsert(dbRow, { onConflict: "id" });

  if (upsertError) {
    throw new Error("Failed to upsert model: " + upsertError.message);
  }

  console.log("SUCCESS! Model 'Baie Coulissante MB' created/updated successfully.");
}

main().catch((err) => {
  console.error("ERROR running create-modele script:", err);
  process.exit(1);
});
