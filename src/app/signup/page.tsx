import { redirect } from "next/navigation";

export const metadata = { title: "Create account" };

/** Legacy path — customer self-registration lives at /register */
export default async function SignupRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.card) params.set("card", sp.card);
  if (sp.next) params.set("next", sp.next);
  const qs = params.toString();
  redirect(qs ? `/register?${qs}` : "/register");
}
