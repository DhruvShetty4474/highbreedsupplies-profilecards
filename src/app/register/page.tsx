import { SignupForm } from "@/components/auth/signup-form";
import { HighbreedWordmark } from "@/components/brand/logo";
import { getSessionProfile } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { card?: string; next?: string };
}) {
  const session = await getSessionProfile();
  if (session) {
    redirect(
      searchParams.next ||
        (session.role === "admin" ? "/admin" : "/dashboard")
    );
  }

  const loginHref = searchParams.card
    ? `/login?next=/c/${searchParams.card}`
    : "/login";

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(155deg,#0A1F1A_0%,#0F3D32_42%,#1F6B54_78%,#C9A227_120%)] lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(700px_400px_at_20%_20%,rgba(232,197,71,0.4),transparent_55%),radial-gradient(500px_300px_at_80%_80%,rgba(31,107,84,0.4),transparent_50%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 text-white">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 font-display text-lg font-semibold backdrop-blur">
              hb
            </div>
            <div>
              <p className="font-display text-xl tracking-tight">HIGHBREED</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">
                HighCard Platform
              </p>
            </div>
          </div>
          <h1 className="mt-16 max-w-md font-display text-5xl leading-[1.08] tracking-tight text-white">
            Create your HighCard page
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
            Register with email and password, build your digital profile, then
            share it with QR, link, or an NFC HighCard.
          </p>
        </div>
        <ul className="relative mt-10 grid max-w-lg gap-3 text-sm text-white/80">
          {[
            "Free self-serve customer accounts",
            "Edit profile with live visitor preview",
            "Share via QR, link & Quick Share",
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
              Use your email and a password. Admins can still create accounts
              and will see everyone under Customers.
            </p>
            <div className="mt-8">
              <SignupForm cardToken={searchParams.card} />
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
