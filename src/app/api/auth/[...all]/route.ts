import { getAuth } from "@/lib/auth-server";

/** Better Auth endpoints: /api/auth/sign-in/email, /api/auth/sign-out, etc. */
export async function GET(request: Request) {
  return getAuth().handler(request);
}

export async function POST(request: Request) {
  return getAuth().handler(request);
}
