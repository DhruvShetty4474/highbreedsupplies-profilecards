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
    href: "/admin",
    label: "Overview",
    icon: "layoutDashboard",
    exact: true,
    description: "Card & customer metrics",
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: "users",
    description: "Create & edit profiles",
  },
  {
    href: "/admin/share",
    label: "Share pages",
    icon: "share",
    description: "QR, link & Quick Share",
  },
  {
    href: "/admin/cards",
    label: "Card inventory",
    icon: "creditCard",
    description: "Generate NFC/QR batches",
  },
  {
    href: "/admin/programming",
    label: "NFC programming",
    icon: "cpu",
    description: "Write URL + verify chip",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "settings",
    description: "Session & support",
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-hb-fog">
      <SaasSidebar
        title="Admin"
        subtitle="Provision HighCards, create customers, and program NTAG213 chips."
        items={items}
        footer={
          <div className="space-y-3">
            <div>
              <p className="truncate text-sm font-semibold text-white">
                {profile.full_name}
              </p>
              <p className="text-xs text-white/55">Administrator</p>
            </div>
            <Link
              href="/dashboard"
              className="block text-xs font-semibold text-hb-mint"
            >
              Preview customer view →
            </Link>
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
