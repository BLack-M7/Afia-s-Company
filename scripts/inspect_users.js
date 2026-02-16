import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Add logging to see where we are
console.log("Starting user inspection script...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "../.env");

console.log(`Loading .env from: ${envPath}`);

// Load env vars from parent directory
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Error loading .env file:", result.error);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`Supabase URL: ${supabaseUrl ? "Found" : "Missing"}`);
console.log(`Supabase Service Key: ${supabaseServiceKey ? "Found" : "Missing"}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
  console.log("Fetching users from Supabase Auth...");
  try {
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      const users = data.users;

      if (!users || users.length === 0) {
        console.log("No users found.");
        return;
      }

      console.log("\n--- User List ---");
      users.forEach((user) => {
        console.log(`Email: ${user.email}`);
        console.log(`ID: ${user.id}`);
        console.log(`Confirmed: ${user.email_confirmed_at ? "YES" : "NO"}`);
        console.log(`Last Sign In: ${user.last_sign_in_at || "Never"}`);
        // Safely access providers
        const providers = user.app_metadata?.providers || [];
        console.log(`Providers: ${providers.join(", ")}`);
        console.log("-------------------");
      });
  } catch (err) {
      console.error("Unexpected error:", err);
  }
}

listUsers();
