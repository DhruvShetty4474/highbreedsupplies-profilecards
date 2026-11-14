#!/usr/bin/env node
/**
 * Promote / demote an existing account. Roles are only ever changed here,
 * by the seed script, or via ADMIN_EMAILS at signup — never by an API.
 *
 *   npm run admin:grant -- someone@example.com            # local D1
 *   npm run admin:grant -- someone@example.com --remote   # production D1
 *   npm run admin:grant -- someone@example.com --revoke
 */
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
if (!email || !/^[^\s@']+@[^\s@']+$/.test(email)) {
  console.error("Usage: npm run admin:grant -- <email> [--remote] [--revoke]");
  process.exit(1);
}
const role = args.includes("--revoke") ? "client" : "admin";
const where = args.includes("--remote") ? "--remote" : "--local";
const sql = `UPDATE profiles SET role='${role}' WHERE user_id=(SELECT id FROM user WHERE email='${email.toLowerCase()}');`;
execFileSync("npx", ["wrangler", "d1", "execute", "highbreed", where, "--command", sql], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
console.log(`${email} → ${role} (${where.slice(2)}). Check "changes": 1 above.`);
