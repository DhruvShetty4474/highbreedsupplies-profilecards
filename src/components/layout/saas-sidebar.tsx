"use client";

import { HighbreedWordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import {
  Cpu,
  CreditCard,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/** String keys only — Server Components cannot pass Lucide icon functions to clients. */
export type SidebarIconName =
  | "layoutDashboard"
  | "wrench"
  | "creditCard"
  | "users"
  | "settings"
  | "cpu";

const ICONS: Record<SidebarIconName, LucideIcon> = {
  layoutDashboard: LayoutDashboard,
  wrench: Wrench,
  creditCard: CreditCard,
  users: Users,
  settings: Settings,
  cpu: Cpu,
};

export type SidebarItem = {
  href: string;
  label: string;
  icon: SidebarIconName;
  exact?: boolean;
};

export function SaasSidebar({
  items,
  footer,
  title,
}: {
  items: SidebarItem[];
  footer?: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "hb-focus flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-hb-action text-white shadow-soft"
                : "text-hb-forest hover:bg-hb-mist"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-hb-sand/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <HighbreedWordmark />
        <button
          type="button"
          className="hb-focus grid h-10 w-10 place-items-center rounded-xl border border-hb-sand bg-white"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5 text-hb-forest" />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-hb-ink/40"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[280px] flex-col border-r border-hb-sand bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-hb-sand px-4 py-4">
              <HighbreedWordmark />
              <button
                type="button"
                className="hb-focus grid h-9 w-9 place-items-center rounded-lg"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {title ? (
              <p className="px-5 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
                {title}
              </p>
            ) : null}
            {nav}
            <div className="mt-auto border-t border-hb-sand p-4">{footer}</div>
          </aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-hb-sand/90 bg-white/95 backdrop-blur lg:flex">
        <div className="border-b border-hb-sand px-5 py-5">
          <HighbreedWordmark />
          {title ? (
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
              {title}
            </p>
          ) : null}
        </div>
        {nav}
        <div className="mt-auto border-t border-hb-sand p-4">{footer}</div>
      </aside>
    </>
  );
}
