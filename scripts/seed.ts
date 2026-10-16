/**
 * Seed HIGHBREED demo users, profiles, cards, and leads.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... npm run db:seed
 *
 * Requires the SQL migration in supabase/migrations/001_initial_schema.sql
 * to be applied first.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://highbreedsupplies.com";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function token() {
  return `tok_${randomBytes(12).toString("hex")}`;
}

async function ensureUser(email: string, password: string, meta: Record<string, string>) {
  const { data: listed } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users?.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error || !data.user) {
    throw new Error(error?.message || `Failed creating ${email}`);
  }
  return data.user.id;
}

async function main() {
  console.log("Seeding HIGHBREED…");

  const adminId = await ensureUser("admin@highbreedsupplies.com", "HighbreedAdmin!23", {
    full_name: "HIGHBREED Admin",
    username: "highbreed_admin",
    role: "admin",
  });

  const clientId = await ensureUser(
    "pranay@highbreedsupplies.com",
    "HighbreedClient!23",
    {
      full_name: "Highbreed Supplies",
      username: "pranay_brid",
      role: "client",
    }
  );

  await supabase.from("profiles").upsert([
    {
      user_id: adminId,
      username: "highbreed_admin",
      full_name: "HIGHBREED Admin",
      designation: "Platform Administrator",
      location: "Mumbai",
      role: "admin",
      email: "admin@highbreedsupplies.com",
    },
    {
      user_id: clientId,
      username: "pranay_brid",
      full_name: "Highbreed Supplies",
      designation: "Founder at Highbreed Supplies",
      location: "Mumbai",
      bio: "Premium NFC HighCards and digital identity for modern businesses.",
      phone: "+917718090545",
      email: "highbreedworkflow1360@gmail.com",
      role: "client",
      video_url:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      social_links: [
        {
          id: "s1",
          type: "website",
          label: "Website",
          path: "https://highbreedsupplies.com",
        },
        {
          id: "s2",
          type: "instagram",
          label: "Instagram",
          path: "https://instagram.com/highbreedsupplies",
        },
        {
          id: "s3",
          type: "linkedin",
          label: "LinkedIn",
          path: "https://linkedin.com/company/highbreed-supplies",
        },
        {
          id: "s4",
          type: "whatsapp",
          label: "WhatsApp",
          path: "https://wa.me/917718090545",
        },
        {
          id: "s5",
          type: "google_review",
          label: "Leave a Google Review",
          path: "https://g.page/r/highbreed/review",
        },
      ],
    },
  ]);

  await supabase.from("card_batches").upsert({
    batch_id: "BATCH-2026-001",
    label: "Factory Run A — Mumbai",
    quantity: 4,
    notes: "Seed batch",
    created_by: adminId,
  });

  const tokens = [token(), token(), token(), token()];
  const cards = [
    {
      card_id: "HB000001",
      public_token: tokens[0],
      status: "UNCLAIMED",
      programming_verified: false,
      user_id: null,
    },
    {
      card_id: "HB000002",
      public_token: tokens[1],
      status: "ACTIVE",
      programming_verified: true,
      user_id: clientId,
      programmed_at: new Date().toISOString(),
      activated_at: new Date().toISOString(),
    },
    {
      card_id: "HB000003",
      public_token: tokens[2],
      status: "BLOCKED",
      programming_verified: true,
      user_id: null,
      programmed_at: new Date().toISOString(),
      blocked_at: new Date().toISOString(),
    },
    {
      card_id: "HB000004",
      public_token: tokens[3],
      status: "UNCLAIMED",
      programming_verified: true,
      user_id: null,
      programmed_at: new Date().toISOString(),
    },
  ].map((c) => ({
    ...c,
    nfc_url: `${appUrl}/c/${c.public_token}`,
    qr_url: `${appUrl}/c/${c.public_token}`,
    batch_id: "BATCH-2026-001",
  }));

  await supabase.from("cards").upsert(cards);

  await supabase.from("leads").delete().eq("cardholder_user_id", clientId);
  await supabase.from("leads").insert([
    {
      cardholder_user_id: clientId,
      visitor_name: "Ananya Shah",
      visitor_email: "ananya@example.com",
      visitor_phone: "+917718090545",
      visitor_note: "Met at India Blockchain Week — follow up?",
    },
    {
      cardholder_user_id: clientId,
      visitor_name: "Mehta Equities",
      visitor_email: "rm@mehtaequities.com",
      visitor_phone: "+919820012345",
      visitor_note: "Interested in bulk HighCards for RM team.",
    },
  ]);

  console.log("Seed complete.");
  console.log("Admin:  admin@highbreedsupplies.com / HighbreedAdmin!23");
  console.log("Client: pranay@highbreedsupplies.com / HighbreedClient!23");
  console.log("Active card token:", tokens[1]);
  console.log("Claimable token:", tokens[3]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
