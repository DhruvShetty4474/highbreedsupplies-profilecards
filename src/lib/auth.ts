import "server-only";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth-server";
import { fetchProfileById } from "@/lib/data";
import type { Profile } from "@/lib/types";

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message = status === 401 ? "Authentication required" : "Forbidden"
  ) {
    super(message);
  }
}

/** Profile of the signed-in user, or null. Role always comes from the DB. */
export async function getSessionProfile(): Promise<Profile | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  return fetchProfileById(session.user.id);
}

export async function requireUser(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) throw new AuthError(401);
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (profile.role !== "admin") throw new AuthError(403, "Admin access required");
  return profile;
}
