import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { HighbreedWordmark } from "@/components/brand/logo";
import { hasPaidAccess, pendingCardToken } from "@/lib/access";
import { getSessionProfile } from "@/lib/auth";
import { homeFor } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activate your HighCard" };

/** Where unpaid customers land: finish paying, or scan a card to start. */
export default async function ActivateHome() {
  const me = await getSessionProfile();
  if (!me) redirect("/login");
  if (await hasPaidAccess(me)) redirect(homeFor(me.role));
  const token = await pendingCardToken(me.user_id);
  if (token) redirect(`/activate/${encodeURIComponent(token)}`);

  return (
    <main className="grid min-h-dvh place-items-center bg-hb-mesh px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 p-8 text-center shadow-soft">
        <div className="flex justify-center">
          <HighbreedWordmark />
        </div>
        <h1 className="mt-6 font-display text-3xl text-hb-ink">Activate your HighCard</h1>
        <p className="mt-3 text-sm leading-relaxed text-hb-leaf">
          Your account is ready, but it has no active card yet. Tap your HighCard on your phone
          (or scan its QR code), enter the activation code from the packaging and complete the
          payment. Your profile goes live right after.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-hb-action">
            Use a different account
          </Link>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
