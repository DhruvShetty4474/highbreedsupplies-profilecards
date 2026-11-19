import { getConfig } from "@/config";
import { GoogleButton } from "@/components/auth/google-button";
import { SignupForm } from "@/components/auth/signup-form";
import { HighbreedMark, HighbreedWordmark } from "@/components/brand/logo";
import { getSessionProfile } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; next?: string }>;
}) {
  const sp = await searchParams;
  // Only same-site paths (blocks open redirects like //evil.com).
  if (sp.next && !/^\/(?!\/)/.test(sp.next)) sp.next = undefined;
  const activate = sp.card ? `/activate/${encodeURIComponent(sp.card)}` : null;
  const session = await getSessionProfile();
  if (session) redirect(activate || sp.next || homeFor(session.role));

  const loginHref = activate ? `/login?next=${encodeURIComponent(activate)}` : "/login";

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(155deg,#062E24_0%,#0B5C45_48%,#D4A017_115%)] lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(700px_400px_at_18%_18%,rgba(240,201,74,0.45),transparent_55%),radial-gradient(520px_320px_at_88%_78%,rgba(11,92,69,0.35),transparent_50%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 text-white">
            <HighbreedMark size="sm" className="h-11 w-11 rounded-2xl" />
            <div>
              <p className="font-display text-xl tracking-tight">HIGHBREED</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                Supplies
              </p>
            </div>
          </div>
          <h1 className="mt-16 max-w-md font-display text-5xl leading-[1.08] tracking-tight text-white">
            Create your HighCard page
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
            Register with your email, confirm the 6-digit code we send you,
            then activate your HighCard.
          </p>
        </div>
        <ul className="relative mt-10 grid max-w-lg gap-3 text-sm text-white/80">
          {[
            "1. Create your account",
            "2. Enter the code printed on your card",
            "3. Pay by UPI or cash — your card goes live",
          ].map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur"
            >
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex flex-col justify-center bg-hb-fog px-6 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <HighbreedWordmark />
          </div>
          <div className="mt-8 rounded-3xl border border-hb-sand/80 bg-white/90 p-8 shadow-soft backdrop-blur-md lg:mt-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
              Customer registration
            </p>
            <h2 className="mt-2 font-display text-3xl text-hb-ink">
              Create account
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-hb-leaf">
              {activate
                ? "Create your account to activate this HighCard. We'll email you a code to confirm it's you."
                : "Use your email and a password. We'll email you a code to confirm it's you."}
            </p>
            <div className="mt-8">
              {getConfig().features.google ? (
                <GoogleButton next={activate ?? "/go"} />
              ) : null}
              <SignupForm cardToken={sp.card} />
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-hb-leaf">
            Already have an account?{" "}
            <Link href={loginHref} className="font-semibold text-hb-action">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
