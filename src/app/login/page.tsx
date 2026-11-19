import { getConfig } from "@/config";
import { GoogleButton } from "@/components/auth/google-button";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { HighbreedMark, HighbreedWordmark } from "@/components/brand/logo";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; error?: string }>;
}) {
  const { next: rawNext, reset, error } = await searchParams;
  // Only same-site paths (blocks open redirects like //evil.com).
  const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : undefined;
  const google = getConfig().features.google;
  const session = await getSessionProfile();
  if (session) {
    redirect(
      next ||
        homeFor(session.role)
    );
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel — desktop SaaS auth */}
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
            Sign in to your workspace
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
            Manage digital profiles, NFC HighCards, and visitor leads from a
            full desktop console — built for operators, not a phone mockup.
          </p>
        </div>
        <ul className="relative mt-10 grid max-w-lg gap-3 text-sm text-white/80">
          {[
            "Customer, manager & admin dashboards",
            "Profile block editor with live preview",
            "Factory NFC provisioning & lead CRM",
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

      {/* Form panel */}
      <section className="flex flex-col justify-center bg-hb-fog px-6 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <HighbreedWordmark />
          </div>
          <div className="mt-8 rounded-3xl border border-hb-sand/80 bg-white/90 p-8 shadow-soft backdrop-blur-md lg:mt-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
              Account access
            </p>
            <h2 className="mt-2 font-display text-3xl text-hb-ink">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-hb-leaf">
              Sign in with your password, or get a one-time code by email.
            </p>
            <div className="mt-8">
              {google ? <GoogleButton next={next || "/dashboard"} /> : null}
              {error === "google" ? (
                <p className="mb-3 text-sm text-hb-danger" role="alert">
                  Google sign-in didn&apos;t complete. Please try again.
                </p>
              ) : null}
              <LoginForm
                nextPath={next}
                notice={reset ? "Password updated — sign in with your new password." : undefined}
              />
            </div>
          </div>
          <p className="mt-6 text-center text-sm leading-relaxed text-hb-leaf">
            New here?{" "}
            <Link href="/register" className="font-semibold text-hb-action">
              Register with email
            </Link>
            {" · "}Admins can also create customer accounts.
          </p>
        </div>
      </section>
    </main>
  );
}
