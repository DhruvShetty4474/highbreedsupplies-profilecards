import { getAuth } from "@/lib/auth-server";

/** Better Auth endpoints: /api/auth/sign-in/email, /api/auth/sign-out, etc. */
export async function GET(request: Request) {
  return getAuth().handler(request);
}

export async function POST(request: Request) {
  // Accounts are created only through /api/auth/signup (needs a HighCard).
  if (new URL(request.url).pathname.startsWith("/api/auth/sign-up")) {
    return Response.json({ error: "Not available" }, { status: 404 });
  }
  return getAuth().handler(request);
}
