import { HighbreedWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = { title: "Accounts" };

/** Public self-signup disabled — only admin creates customer IDs. */
export default function SignupPage({
  searchParams,
}: {
  searchParams: { card?: string };
}) {
  const loginHref = searchParams.card
    ? `/login?next=/c/${searchParams.card}`
    : "/login";

  return (
    <main className="grid min-h-dvh place-items-center bg-[#F3F8F6] px-6">
      <div className="w-full max-w-md rounded-3xl border border-hb-sand/80 bg-white p-8 shadow-soft">
        <HighbreedWordmark />
        <h1 className="mt-6 font-display text-3xl text-hb-ink">
          Accounts are invite-only
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-hb-leaf">
          Customer login IDs are created by a HIGHBREED administrator. If you
          received a physical HighCard, sign in with the credentials they gave
          you, then claim the card from your Devices page.
        </p>
        <Link href={loginHref} className="mt-6 block">
          <Button className="w-full">Go to sign in</Button>
        </Link>
      </div>
    </main>
  );
}
