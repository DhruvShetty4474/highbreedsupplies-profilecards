import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  SaasSidebar,
  type SidebarItem,
} from "@/components/layout/saas-sidebar";
import { getSessionProfile } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

const items: SidebarItem[] = [
  { href: "/admin", label: "Overview", icon: "layoutDashboard", exact: true },
  { href: "/admin/customers", label: "Customers", icon: "users" },
  { href: "/admin/cards", label: "Card Inventory", icon: "creditCard" },
  { href: "/admin/programming", label: "NFC Programming", icon: "cpu" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
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
    <div className="min-h-dvh bg-[#F3F8F6]">
      <SaasSidebar
        title="Admin console"
        items={items}
        footer={
          <div className="space-y-3">
            <div>
              <p className="truncate text-sm font-semibold text-hb-ink">
                {profile.full_name}
              </p>
              <p className="text-xs text-hb-leaf">Administrator</p>
            </div>
            <Link
              href="/dashboard"
              className="block text-xs font-semibold text-hb-action"
            >
              Client workspace →
            </Link>
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
