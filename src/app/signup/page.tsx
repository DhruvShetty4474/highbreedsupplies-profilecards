import { redirect } from "next/navigation";

export const metadata = { title: "Create account" };

/** Legacy path — customer self-registration lives at /register */
export default function SignupRedirectPage({
  searchParams,
}: {
  searchParams: { card?: string; next?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.card) params.set("card", searchParams.card);
  if (searchParams.next) params.set("next", searchParams.next);
  const qs = params.toString();
  redirect(qs ? `/register?${qs}` : "/register");
}
