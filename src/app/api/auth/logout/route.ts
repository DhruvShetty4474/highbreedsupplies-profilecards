import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-server";

export async function POST(request: Request) {
  try {
    await getAuth().api.signOut({ headers: request.headers });
  } catch {
    // No active session — still a successful logout from the client's view.
  }
  return NextResponse.json({ ok: true });
}
