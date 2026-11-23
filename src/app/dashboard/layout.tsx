import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  SaasSidebar,
  type SidebarItem,
} from "@/components/layout/saas-sidebar";
import { getSessionProfile } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/roles";
import { accessState } from "@/lib/access";

const items: SidebarItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: "layoutDashboard",
    exact: true,
    description: "Reaches, shares, leads at a glance",
  },
  {
    href: "/dashboard/pages",
    label: "Profile editor",
    icon: "wrench",
    description: "Avatar, media, social blocks",
  },
  {
    href: "/dashboard/share",
    label: "Share",
    icon: "share",
    description: "QR, link & Quick Share",
  },
  {
    href: "/dashboard/devices",
    label: "Cards / Devices",
    icon: "creditCard",
    description: "Claim & manage HighCards",
  },
  {
    href: "/dashboard/contacts",
    label: "Leads",
    icon: "users",
    description: "Visitor info from your page",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: "settings",
    description: "Account & support",
  },
];

// Session + D1 reads: never prerender.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login?next=/dashboard");
  const access = await accessState(profile);
  if (access.kind === "card_unpaid") redirect(`/activate/${encodeURIComponent(access.token)}`);
  if (access.kind === "expired") redirect("/activate");

  return (
    <div className="min-h-dvh bg-hb-fog">
      <SaasSidebar
        title="Customer"
        subtitle="Edit your digital card, claim NFC devices, and review visitor leads."
        items={items}
        footer={
          <div className="space-y-3">
            <div>
              <p className="truncate text-sm font-semibold text-white">
                {profile.full_name}
              </p>
              <p className="truncate text-xs text-white/55">
                @{profile.username}
              </p>
            </div>
            {profile.role === "manager" || isAdminRole(profile.role) ? (
              <Link href="/manager" className="block text-xs font-semibold text-hb-mint">
                Open Manager Dashboard →
              </Link>
            ) : null}
            {isAdminRole(profile.role) ? (
              <Link
                href="/admin"
                className="block text-xs font-semibold text-hb-mint"
              >
                Open Admin Console →
              </Link>
            ) : null}
            <SignOutButton variant="onDark" />
          </div>
        }
      />
      <div className="lg:pl-[280px] xl:pl-[300px]">
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          {access.kind === "trial" ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hb-gold/40 bg-[#FFF8E6] px-4 py-3 text-sm text-[#5C4A12]">
              <p>
                <strong>Free trial:</strong> {access.daysLeft} day{access.daysLeft === 1 ? "" : "s"} left.
                Activate a HighCard to keep your profile live after that.
              </p>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
