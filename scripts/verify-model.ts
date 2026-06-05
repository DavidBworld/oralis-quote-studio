import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const envPath = path.resolve(process.cwd(), ".env");
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

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  const modelId = "9a6dcf8e-161b-4f9e-a89e-29219e918451";
  
  console.log(`Querying model ID ${modelId}...`);
  const { data, error } = await supabaseAdmin
    .from("modeles")
    .select("*")
    .eq("id", modelId);

  if (error) {
    console.error("Error fetching model:", error.message);
  } else if (!data || data.length === 0) {
    console.log("No model found with that ID.");
  } else {
    console.log("Database Row:", JSON.stringify(data[0], null, 2));
  }
}

main().catch(err => {
  console.error(err);
});
