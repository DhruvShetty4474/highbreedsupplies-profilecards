import { SignOutButton } from "@/components/auth/sign-out-button";
import { SaasSidebar, type SidebarItem } from "@/components/layout/saas-sidebar";
import { getSessionProfile } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

const items: SidebarItem[] = [
  {
    href: "/manager",
    label: "Payments",
    icon: "banknote",
    exact: true,
    description: "Approve cash, track UPI, invoices",
  },
  {
    href: "/manager/customers",
    label: "My customers",
    icon: "users",
    description: "Everyone you referred",
  },
];

export const dynamic = "force-dynamic";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login?next=/manager");
  if (profile.role !== "manager" && profile.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-hb-fog">
      <SaasSidebar
        title="Manager"
        subtitle="Approve cash payments and follow up with the customers you referred."
        items={items}
        footer={
          <div className="space-y-3">
            <div>
              <p className="truncate text-sm font-semibold text-white">{profile.full_name}</p>
              <p className="text-xs text-white/55">
                {profile.role === "admin" ? "Administrator (all managers)" : "Manager"}
              </p>
            </div>
            <Link href="/dashboard" className="block text-xs font-semibold text-hb-mint">
              My own card & profile →
            </Link>
            {profile.role === "admin" ? (
              <Link href="/admin" className="block text-xs font-semibold text-hb-mint">
                Admin Console →
              </Link>
            ) : null}
            <SignOutButton variant="onDark" />
          </div>
        }
      />
      <div className="lg:pl-[280px] xl:pl-[300px]">
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
