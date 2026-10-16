import { getSessionProfile } from "@/lib/auth";
import { fetchAllCards, fetchLeadsForUser } from "@/lib/data";
import { getStats } from "@/lib/demo-store";
import { isDemoMode } from "@/lib/utils";
import {
  ArrowUpRight,
  CreditCard,
  ExternalLink,
  Share2,
  Users,
  Eye,
  Download,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Overview" };

export default async function DashboardHomePage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const [leads, cards] = await Promise.all([
    fetchLeadsForUser(profile.user_id),
    fetchAllCards(),
  ]);
  const myCards = cards.filter((c) => c.user_id === profile.user_id);
  const stats = isDemoMode()
    ? getStats(profile.user_id)
    : { reaches: 0, shares: 0, contact_saves: 0 };

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
            Overview
          </p>
          <h1 className="mt-1 font-display text-4xl text-hb-ink">
            Welcome, {profile.full_name.split(" ")[0] || profile.username}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-hb-leaf">
            Track profile reaches, shares, contact saves, and visitor leads.
            Edit your digital card anytime from the profile workbench.
          </p>
        </div>
        <Link
          href={`/${profile.username}`}
          target="_blank"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-hb-action px-4 text-sm font-semibold text-white shadow-lift"
        >
          View public page
          <ExternalLink className="h-4 w-4" />
        </Link>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Reaches", value: stats.reaches, icon: Eye },
          { label: "Shares", value: stats.shares, icon: Share2 },
          { label: "Contact saves", value: stats.contact_saves, icon: Download },
          { label: "Leads captured", value: leads.length, icon: Users },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">
                  {stat.label}
                </p>
                <Icon className="h-4 w-4 text-hb-action" />
              </div>
              <p className="mt-3 font-display text-4xl text-hb-ink">
                {stat.value}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-hb-sand/80 bg-white/90 p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">
            Active HighCards
          </p>
          <p className="mt-3 font-display text-4xl text-hb-ink">
            {myCards.length}
          </p>
        </article>
        <article className="rounded-2xl border border-hb-sand/80 bg-hb-cta p-5 text-white shadow-lift">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
            Public URL
          </p>
          <p className="mt-3 truncate text-lg font-semibold">
            /{profile.username}
          </p>
        </article>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-hb-sand/80 bg-white/90 p-6 shadow-soft">
          <h2 className="font-display text-2xl text-hb-ink">Quick actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                href: "/dashboard/pages",
                label: "Edit profile blocks",
                icon: Wrench,
              },
              {
                href: "/dashboard/devices",
                label: "Claim / manage cards",
                icon: CreditCard,
              },
              {
                href: "/dashboard/contacts",
                label: "Review leads",
                icon: Users,
              },
              {
                href: `/${profile.username}`,
                label: "Preview public profile",
                icon: ArrowUpRight,
                external: true,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  className="flex items-center gap-3 rounded-xl border border-hb-sand/70 bg-hb-fog/50 px-4 py-3 text-sm font-semibold text-hb-forest transition hover:border-hb-action/30 hover:bg-white"
                >
                  <Icon className="h-4 w-4 text-hb-action" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
          <h2 className="font-display text-2xl text-hb-ink">Recent leads</h2>
          <ul className="mt-4 space-y-3">
            {leads.slice(0, 4).map((lead) => (
              <li
                key={lead.id}
                className="rounded-xl border border-hb-sand/60 px-3 py-2.5 text-sm"
              >
                <p className="font-semibold text-hb-ink">{lead.visitor_name}</p>
                <p className="truncate text-xs text-hb-leaf">
                  {lead.visitor_note || lead.visitor_email || "No note"}
                </p>
              </li>
            ))}
            {leads.length === 0 ? (
              <li className="text-sm text-hb-leaf">
                No leads yet — share your public page to start capturing.
              </li>
            ) : null}
          </ul>
        </article>
      </section>
    </div>
  );
}
