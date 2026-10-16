import { getSessionProfile } from "@/lib/auth";
import {
  createDemoCustomer,
  listClientAccounts,
} from "@/lib/demo-store";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  login_id: z.string().min(3),
  password: z.string().min(4),
  username: z.string().min(3),
  full_name: z.string().min(2),
  email: z.string().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
});

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!isDemoMode()) {
    return NextResponse.json({
      error: "Customer listing via API is demo-backed; wire Supabase admin list next.",
      customers: [],
    });
  }

  const customers = listClientAccounts().map((a) => ({
    user_id: a.user_id,
    login_id: a.login_id,
    username: a.profile.username,
    full_name: a.profile.full_name,
    email: a.profile.email,
    phone: a.profile.phone,
    designation: a.profile.designation,
  }));

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid customer payload" }, { status: 400 });
  }

  if (!isDemoMode()) {
    return NextResponse.json(
      { error: "Enable DEMO_MODE or implement Supabase admin user creation." },
      { status: 503 }
    );
  }

  try {
    const created = createDemoCustomer(parsed.data);
    return NextResponse.json({
      ok: true,
      customer: {
        user_id: created.user_id,
        login_id: created.login_id,
        username: created.profile.username,
        full_name: created.profile.full_name,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create customer" },
      { status: 400 }
    );
  }
}
