import { LoginForm } from "@/components/auth/login-form";
import { HighbreedWordmark } from "@/components/brand/logo";
import { getSessionProfile } from "@/lib/auth";
import { isDemoMode } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = await getSessionProfile();
  if (session) {
    redirect(
      searchParams.next ||
        (session.role === "admin" ? "/admin" : "/dashboard")
    );
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel — desktop SaaS auth */}
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(155deg,#071512_0%,#0F3D32_45%,#1F6B54_100%)] lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(700px_400px_at_20%_20%,rgba(61,190,139,0.45),transparent_55%),radial-gradient(500px_300px_at_80%_80%,rgba(14,124,102,0.35),transparent_50%)]" />
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
            Sign in to your workspace
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
            Manage digital profiles, NFC HighCards, and visitor leads from a
            full desktop console — built for operators, not a phone mockup.
          </p>
        </div>
        <ul className="relative mt-10 grid max-w-lg gap-3 text-sm text-white/80">
          {[
            "Client & admin role-based dashboards",
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
      <section className="flex flex-col justify-center bg-[#F3F8F6] px-6 py-10 sm:px-10 lg:px-16">
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
              Sign in with your login ID. Your role (admin or customer) is
              applied automatically from the account.
            </p>
            <div className="mt-8">
              <LoginForm nextPath={searchParams.next} />
            </div>
          </div>
          <p className="mt-6 text-center text-sm leading-relaxed text-hb-leaf">
            Need a customer account? Ask your HIGHBREED administrator to create
            your login ID.
            {isDemoMode() ? (
              <>
                <br />
                <span className="mt-2 inline-block text-xs">
                  Demo admin: <strong>admin</strong> / <strong>123123</strong>
                  {" · "}
                  Sample customer: <strong>pranay</strong> /{" "}
                  <strong>pranay123</strong>
                </span>
              </>
            ) : null}
          </p>
        </div>
      </section>
    </main>
  );
}
