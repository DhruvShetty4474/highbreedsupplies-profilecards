/**
 * Generate seed SQL for D1: one admin, one client, a demo batch of cards.
 *
 *   npm run db:seed:local      # writes .seed/seed.sql and applies it locally
 *
 * Passwords are hashed with Better Auth's own hasher so sign-in works.
 * Override defaults with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * Safe to re-run: every insert is INSERT OR IGNORE.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { customAlphabet } from "nanoid";

const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const token = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  24
);
const q = (v: string | null) => (v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`);

type SeedUser = {
  email: string;
  password: string;
  name: string;
  username: string;
  role: "admin" | "client";
  designation: string;
};

const users: SeedUser[] = [
  {
    email: process.env.SEED_ADMIN_EMAIL || "admin@highbreedsupplies.com",
    password: process.env.SEED_ADMIN_PASSWORD || "HighbreedAdmin!23",
    name: "HIGHBREED Admin",
    username: "highbreed_admin",
    role: "admin",
    designation: "Platform Administrator",
  },
  {
    email: "client@example.com",
    password: "HighbreedClient!23",
    name: "Sample Client",
    username: "sample_client",
    role: "client",
    designation: "Founder",
  },
];

async function main() {
  const now = Date.now();
  const out: string[] = [];

  for (const u of users) {
    const id = randomUUID().replace(/-/g, "");
    const hash = await hashPassword(u.password);
    // Re-runs keep the existing user (email is UNIQUE), so later rows that
    // reference `id` look the real id up by email.
    out.push(
      `INSERT OR IGNORE INTO user (id,name,email,email_verified,created_at,updated_at) VALUES (${q(id)},${q(u.name)},${q(u.email)},1,${now},${now});`,
      `INSERT OR IGNORE INTO account (id,account_id,provider_id,user_id,password,created_at,updated_at) SELECT ${q(randomUUID())}, id, 'credential', id, ${q(hash)}, ${now}, ${now} FROM user WHERE email=${q(u.email)} AND NOT EXISTS (SELECT 1 FROM account WHERE user_id=user.id AND provider_id='credential');`,
      `INSERT OR IGNORE INTO profiles (user_id,username,full_name,designation,email,role) SELECT id, ${q(u.username)}, ${q(u.name)}, ${q(u.designation)}, ${q(u.email)}, ${q(u.role)} FROM user WHERE email=${q(u.email)};`,
      // Make sure a re-seed also fixes the role (admin set server-side only).
      `UPDATE profiles SET role=${q(u.role)} WHERE user_id=(SELECT id FROM user WHERE email=${q(u.email)});`
    );
  }

  const batchId = "BATCH-SEED-001";
  out.push(
    `INSERT OR IGNORE INTO card_batches (batch_id,label,quantity,notes) VALUES (${q(batchId)},'Seed batch',5,'Local development cards');`
  );
  for (let i = 1; i <= 5; i++) {
    const t = `tok_${token()}`;
    const url = `${appUrl}/c/${t}`;
    out.push(
      `INSERT OR IGNORE INTO cards (card_id,public_token,nfc_url,qr_url,batch_id) VALUES (${q(`HB${String(i).padStart(6, "0")}`)},${q(t)},${q(url)},${q(url)},${q(batchId)});`
    );
  }

  // Keep the card_id counter ahead of the seeded HB000001..HB000005.
  out.push(
    "INSERT INTO counters (name,value) VALUES ('card_id',5) ON CONFLICT(name) DO UPDATE SET value=max(value,5);"
  );

  mkdirSync(".seed", { recursive: true });
  writeFileSync(".seed/seed.sql", out.join("\n") + "\n");
  console.log("Wrote .seed/seed.sql");
  for (const u of users) console.log(`  ${u.role.padEnd(6)} ${u.email} / ${u.password}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
