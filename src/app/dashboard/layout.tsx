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
  },
  {
    href: "/dashboard/pages",
    label: "Profile Block Editor",
    icon: "wrench",
  },
  {
    href: "/dashboard/devices",
    label: "Cards / Devices",
    icon: "creditCard",
  },
  {
    href: "/dashboard/contacts",
    label: "Leads",
    icon: "users",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: "settings",
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
    <div className="min-h-dvh bg-[#F3F8F6]">
      <SaasSidebar
        title="Client workspace"
        items={items}
        footer={
          <div className="space-y-3">
            <div>
              <p className="truncate text-sm font-semibold text-hb-ink">
                {profile.full_name}
              </p>
              <p className="truncate text-xs text-hb-leaf">@{profile.username}</p>
            </div>
            {profile.role === "admin" ? (
              <Link
                href="/admin"
                className="block text-xs font-semibold text-hb-action"
              >
                Open Admin Console →
              </Link>
            ) : null}
            <SignOutButton />
          </div>
        }
      />
      <div className="lg:pl-[260px]">
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
