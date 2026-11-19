import { getSessionProfile } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Post-sign-in landing: sends each role to its own home. */
export default async function GoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  // Only same-site paths (blocks open redirects like //evil.com).
  if (next && /^\/(?!\/)/.test(next)) redirect(next);
  redirect(homeFor(profile.role));
}
