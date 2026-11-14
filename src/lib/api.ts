import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

/** Map thrown AuthError → 401/403 JSON; everything else → 500. */
export function errorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
