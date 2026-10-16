import {
  CreditCard,
  Cpu,
  Pencil,
  Share2,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

const actions = [
  {
    href: "/admin/customers",
    label: "Edit Profile",
    hint: "Pick a customer, edit blocks, preview live",
    icon: Pencil,
    wide: true,
    tone: "light" as const,
  },
  {
    href: "/admin/share",
    label: "Share",
    hint: "QR, link & share tools per page",
    icon: Share2,
    wide: true,
    tone: "primary" as const,
  },
  {
    href: "/admin/customers",
    label: "Customers",
    hint: "Create login IDs",
    icon: Users,
    wide: false,
    tone: "light" as const,
  },
  {
    href: "/admin/cards",
    label: "Activate / cards",
    hint: "Batch HighCards",
    icon: CreditCard,
    wide: false,
    tone: "light" as const,
  },
  {
    href: "/admin/programming",
    label: "NFC program",
    hint: "TagWriter payload",
    icon: Cpu,
    wide: false,
    tone: "light" as const,
  },
  {
    href: "/c/A7X92KP4",
    label: "Test claim",
    hint: "Open unclaimed card",
    icon: Zap,
    wide: false,
    tone: "light" as const,
  },
];

export function AdminQuickActions() {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl text-hb-ink">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label + action.href}
              href={action.href}
              className={[
                "rounded-[24px] p-4 shadow-soft transition hover:brightness-[1.02]",
                action.wide ? "col-span-2" : "col-span-1",
                action.tone === "primary"
                  ? "bg-hb-action text-white shadow-lift"
                  : "border border-hb-sand/80 bg-white text-hb-ink",
              ].join(" ")}
            >
              <Icon
                className={
                  action.tone === "primary"
                    ? "h-5 w-5 text-white"
                    : "h-5 w-5 text-hb-action"
                }
              />
              <p className="mt-3 text-base font-semibold">{action.label}</p>
              <p
                className={
                  action.tone === "primary"
                    ? "mt-1 text-xs text-white/80"
                    : "mt-1 text-xs text-hb-leaf"
                }
              >
                {action.hint}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
