import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "../.env");
const logPath = path.join(__dirname, "fix_log.txt");

function log(message) {
  const line = `${new Date().toISOString()} - ${message}\n`;
  fs.appendFileSync(logPath, line);
  console.log(message);
}

// Clear log
fs.writeFileSync(logPath, "Starting fix_users.js...\n");

dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  log("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUsers() {
  log("Fetching users...");
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      log(`Error fetching users: ${error.message}`);
      return;
    }

    const users = data.users;
    if (!users || users.length === 0) {
      log("No users found.");
      return;
    }

    log(`Found ${users.length} users.`);

    for (const user of users) {
      if (!user.email_confirmed_at) {
        log(`Confirming user: ${user.email} (${user.id})`);
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (updateError) {
          log(`Failed to confirm ${user.email}: ${updateError.message}`);
        } else {
          log(`Successfully confirmed ${user.email}`);
        }
      } else {
        log(`User already confirmed: ${user.email}`);
      }
    }
    log("Done.");
  } catch (err) {
    log(`Unexpected error: ${err.message}`);
  }
}

fixUsers();
