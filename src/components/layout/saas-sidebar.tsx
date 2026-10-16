"use client";

import { HighbreedMark } from "@/components/brand/logo";
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
import { useEffect, useState } from "react";

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
  description?: string;
};

export function SaasSidebar({
  items,
  footer,
  title,
  subtitle,
}: {
  items: SidebarItem[];
  footer?: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1.5 px-3 py-4">
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
              "group hb-focus relative flex items-start gap-3 rounded-2xl px-3 py-3 transition",
              active
                ? "bg-white text-hb-ink shadow-soft"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-hb-mint" />
            ) : null}
            <span
              className={cn(
                "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                active ? "bg-hb-action text-white" : "bg-white/10 text-hb-mint"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-wide">
                {item.label}
              </span>
              {item.description ? (
                <span
                  className={cn(
                    "mt-0.5 block text-[11px] leading-snug",
                    active ? "text-hb-leaf" : "text-white/50"
                  )}
                >
                  {item.description}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="border-b border-white/10 px-5 py-5">
      <div className="flex items-center gap-3">
        <HighbreedMark size="sm" className="rounded-xl shadow-none" />
        <div className="min-w-0">
          <p className="font-display text-lg tracking-tight text-white">
            HIGHBREED
          </p>
          <p className="truncate text-[10px] uppercase tracking-[0.2em] text-hb-mint/80">
            {title || "Workspace"}
          </p>
        </div>
      </div>
      {subtitle ? (
        <p className="mt-3 text-xs leading-relaxed text-white/55">{subtitle}</p>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile / tablet top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-hb-sand/70 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <HighbreedMark size="sm" className="h-9 w-9 rounded-xl" />
          <div>
            <p className="text-sm font-semibold text-hb-ink">HIGHBREED</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-hb-leaf">
              {title}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="hb-focus grid h-11 w-11 place-items-center rounded-2xl border border-hb-sand bg-hb-fog"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5 text-hb-forest" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-hb-ink/50 backdrop-blur-[2px]"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[min(88vw,300px)] flex-col bg-[linear-gradient(180deg,#071512_0%,#0F3D32_55%,#123F35_100%)] shadow-lift">
            <div className="flex items-start justify-between">
              <div className="flex-1">{brand}</div>
              <button
                type="button"
                className="m-3 grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
            <div className="mt-auto border-t border-white/10 bg-black/20 p-4 text-white">
              {footer}
            </div>
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col bg-[linear-gradient(180deg,#071512_0%,#0F3D32_50%,#0A2E26_100%)] lg:flex xl:w-[300px]">
        {brand}
        {nav}
        <div className="mt-auto border-t border-white/10 bg-black/15 p-4 text-white">
          {footer}
        </div>
      </aside>
    </>
  );
}
