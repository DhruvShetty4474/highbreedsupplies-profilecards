"use client";

import { cn } from "@/lib/utils";
import {
  Contact,
  Home,
  LayoutGrid,
  Menu,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", icon: Home, match: "/dashboard" },
  {
    href: "/dashboard/pages",
    label: "Pages",
    icon: LayoutGrid,
    match: "/dashboard/pages",
  },
  {
    href: "/dashboard/devices",
    label: "Device",
    icon: Smartphone,
    match: "/dashboard/devices",
  },
  {
    href: "/dashboard/contacts",
    label: "Contacts",
    icon: Contact,
    match: "/dashboard/contacts",
  },
  {
    href: "/dashboard/menu",
    label: "Menu",
    icon: Menu,
    match: "/dashboard/menu",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="hb-shell">
        <div className="flex items-center justify-between rounded-[28px] border border-white/70 bg-white/90 px-2 py-2 shadow-nav backdrop-blur-xl">
          {items.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.match);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "hb-focus flex min-w-[58px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold uppercase tracking-wide transition",
                  active ? "text-hb-action" : "text-hb-leaf/70"
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "stroke-[2.4px]")}
                />
                {active ? item.label : <span className="sr-only">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
