import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSessionProfile } from "@/lib/auth";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Settings" };

export default async function DashboardSettingsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  return (
    <div className="max-w-2xl">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
          Account
        </p>
        <h1 className="mt-1 font-display text-4xl text-hb-ink">Settings</h1>
      </header>

      <section className="mt-8 rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <p className="font-display text-2xl text-hb-ink">{profile.full_name}</p>
        <div className="mt-4 space-y-2 text-sm text-hb-leaf">
          {profile.phone ? (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {profile.phone}
            </p>
          ) : null}
          {profile.email ? (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {profile.email}
            </p>
          ) : null}
        </div>
        <Link
          href="/dashboard/pages"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-hb-mist px-4 text-sm font-semibold text-hb-action"
        >
          Edit profile blocks
        </Link>
      </section>

      <section className="mt-4 rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <h2 className="text-sm font-semibold text-hb-ink">Legal & support</h2>
        <ul className="mt-3 space-y-2 text-sm text-hb-leaf">
          <li>
            <a href="#" className="underline">
              Terms of Use
            </a>
          </li>
          <li>
            <a href="#" className="underline">
              Privacy Policy
            </a>
          </li>
          <li>
            <a href="mailto:support@highbreedsupplies.com">Help & Support</a>
          </li>
        </ul>
        <div className="mt-5">
          <SignOutButton />
        </div>
        <p className="mt-4 text-xs text-hb-leaf/70">App Version: 1.0.0 (HIGHBREED)</p>
      </section>
    </div>
  );
}
