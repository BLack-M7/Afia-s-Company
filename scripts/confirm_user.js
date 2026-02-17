import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from parent directory
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const emailToConfirm = process.argv[2];

if (!emailToConfirm) {
  console.log("Usage: node scripts/confirm_user.js <email>");
  // If no email provided, list unconfirmed users
  listUnconfirmed();
} else {
  confirmUser(emailToConfirm);
}

async function listUnconfirmed() {
  console.log("Listing unconfirmed users...");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error:", error);
    return;
  }

  const unconfirmed = users.filter(u => !u.email_confirmed_at);
  
  if (unconfirmed.length === 0) {
    console.log("No unconfirmed users found.");
  } else {
    unconfirmed.forEach(u => console.log(`- ${u.email} (ID: ${u.id})`));
    console.log("\nTo confirm one, run: node scripts/confirm_user.js <email>");
  }
}

async function confirmUser(email) {
  console.log(`Attempting to confirm ${email}...`);
  
  // First find the user to get ID
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) return console.error(listError);
  
  const user = users.find(u => u.email === email);
  if (!user) return console.error("User not found.");

  const { error } = await supabase.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  );

  if (error) {
    console.error("Failed to confirm:", error.message);
  } else {
    console.log(`Successfully confirmed ${email}! You can now log in.`);
  }
}
