import { getSessionUser, requireAdminPage } from "@/lib/auth";
import { AccountSecurity } from "@/components/auth/account-security";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { redirect } from "next/navigation";
import { BusinessSettingsForm } from "@/components/admin/business-settings-form";
import { getDb } from "@/db";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const profile = await requireAdminPage();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const business = await getSettings(getDb());

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-4xl text-hb-ink">Admin settings</h1>
      <p className="mt-2 text-sm text-hb-leaf">
        Session and provisioning preferences for the HIGHBREED console.
      </p>
      <section className="mt-8 rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <h2 className="font-display text-2xl text-hb-ink">Pricing &amp; invoices</h2>
        <p className="mt-1 mb-5 text-sm text-hb-leaf">
          What customers pay to activate a HighCard, and the seller details printed on every invoice.
        </p>
        <BusinessSettingsForm settings={business} />
      </section>
      <section className="mt-8 rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <p className="text-sm text-hb-forest">
          Signed in as <strong>{profile.email || profile.full_name}</strong>
        </p>
        <p className="mt-2 text-xs text-hb-leaf">
          Factory writers should call{" "}
          <code className="rounded bg-hb-mist px-1">
            /api/admin/cards/&#123;card_id&#125;/programming-data
          </code>{" "}
          with an admin session cookie.
        </p>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </section>
      <div className="mt-4">
        <AccountSecurity email={user.email} emailVerified={user.emailVerified} />
      </div>
    </div>
  );
}
