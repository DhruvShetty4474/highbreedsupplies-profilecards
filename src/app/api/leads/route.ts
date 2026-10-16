import { demoLeads } from "@/lib/demo-data";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const schema = z.object({
  cardholder_user_id: z.string().min(1),
  visitor_name: z.string().min(1).max(120),
  visitor_email: z.string().email().optional().or(z.literal("")),
  visitor_phone: z.string().max(40).optional().or(z.literal("")),
  visitor_note: z.string().max(1000).optional().or(z.literal("")),
  source_card_id: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead payload" }, { status: 400 });
  }

  const row = {
    cardholder_user_id: parsed.data.cardholder_user_id,
    visitor_name: parsed.data.visitor_name.trim(),
    visitor_email: parsed.data.visitor_email || null,
    visitor_phone: parsed.data.visitor_phone || null,
    visitor_note: parsed.data.visitor_note || null,
    source_card_id: parsed.data.source_card_id || null,
  };

  if (isDemoMode()) {
    demoLeads.unshift({
      id: randomUUID(),
      ...row,
      created_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createServiceClient() ?? createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { error } = await supabase.from("leads").insert(row);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
