import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  SaasSidebar,
  type SidebarItem,
} from "@/components/layout/saas-sidebar";
import { getSessionProfile } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login?next=/dashboard");

  return (
    <div className="min-h-dvh bg-[#EEF4F1]">
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
            {profile.role === "admin" ? (
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
          {children}
        </main>
      </div>
    </div>
  );
}
