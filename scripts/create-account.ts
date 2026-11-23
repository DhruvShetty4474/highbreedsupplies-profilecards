/**
 * Operator tool: create (or reset) a verified account with a given role.
 * Used to create the first admin and the super admin directly in D1.
 *
 *   ACCOUNT_PASSWORD='...' npx tsx scripts/create-account.ts <email> <role> "<name>" [--remote]
 *
 * role: superadmin | admin | manager | client
 * The password comes from ACCOUNT_PASSWORD (kept out of shell history/args).
 * Writes .seed/account.sql (git-ignored), applies it, then deletes it.
 * Existing account: password, role and verification are updated in place.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import { customAlphabet } from "nanoid";

const args = process.argv.slice(2);
const [email, role, name] = args.filter((a) => !a.startsWith("--"));
const password = process.env.ACCOUNT_PASSWORD;
const ROLES = ["superadmin", "admin", "manager", "client"];
if (!email || !/^[^\s@']+@[^\s@']+$/.test(email) || !ROLES.includes(role) || !name || !password) {
  console.error(
    'Usage: ACCOUNT_PASSWORD=... npx tsx scripts/create-account.ts <email> <superadmin|admin|manager|client> "<name>" [--remote]'
  );
  process.exit(1);
}

// Strong passwords only: 12+ chars with upper, lower, digit and symbol.
if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  console.error("ACCOUNT_PASSWORD must be 12+ characters with upper, lower, digit and symbol.");
  process.exit(1);
}

const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const suffix = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 8);

async function main() {
  const now = Date.now();
  const id = randomUUID().replace(/-/g, "");
  const e = email.toLowerCase();
  const hash = await hashPassword(password!);
  // Random username: the super admin must not be findable at /<username>.
  const username = `${role === "superadmin" ? "u" : role}_${suffix()}`;
  const sql = [
    `INSERT OR IGNORE INTO user (id,name,email,email_verified,created_at,updated_at) VALUES (${q(id)},${q(name)},${q(e)},1,${now},${now});`,
    `UPDATE user SET email_verified=1, updated_at=${now} WHERE email=${q(e)};`,
    `INSERT OR IGNORE INTO account (id,account_id,provider_id,user_id,password,created_at,updated_at) SELECT ${q(randomUUID())}, id, 'credential', id, ${q(hash)}, ${now}, ${now} FROM user WHERE email=${q(e)} AND NOT EXISTS (SELECT 1 FROM account WHERE user_id=user.id AND provider_id='credential');`,
    `UPDATE account SET password=${q(hash)}, updated_at=${now} WHERE provider_id='credential' AND user_id=(SELECT id FROM user WHERE email=${q(e)});`,
    `INSERT OR IGNORE INTO profiles (user_id,username,full_name,email,role) SELECT id, ${q(username)}, ${q(name)}, ${q(e)}, ${q(role)} FROM user WHERE email=${q(e)};`,
    // Sign out every existing session so the old password stops working everywhere.
    `DELETE FROM session WHERE user_id=(SELECT id FROM user WHERE email=${q(e)});`,
    `UPDATE profiles SET role=${q(role)} WHERE user_id=(SELECT id FROM user WHERE email=${q(e)});`,
  ].join("\n");

  mkdirSync(".seed", { recursive: true });
  const file = ".seed/account.sql";
  writeFileSync(file, sql + "\n");
  try {
    execFileSync(
      "npx",
      ["wrangler", "d1", "execute", "highbreed", args.includes("--remote") ? "--remote" : "--local", `--file=${file}`],
      { stdio: "inherit", shell: process.platform === "win32" }
    );
  } finally {
    rmSync(file, { force: true });
  }
  console.log(`Account ready (${role}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
