import { DEMO_SESSION_COOKIE } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["admin", "client"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, role: parsed.data.role });
  response.cookies.set(DEMO_SESSION_COOKIE, parsed.data.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
