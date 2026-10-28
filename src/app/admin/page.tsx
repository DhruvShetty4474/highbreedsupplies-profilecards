import { AdminQuickActions } from "@/components/admin/quick-actions";
import { fetchAdminMetrics } from "@/lib/data";
import {
  DEMO_REGISTRY_COOKIE,
  hydrateDemoAccountsFromCookie,
} from "@/lib/demo-registry";
import { listClientAccounts } from "@/lib/demo-store";
import { isDemoMode } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const metrics = await fetchAdminMetrics();
  if (isDemoMode()) {
    hydrateDemoAccountsFromCookie(
      cookies().get(DEMO_REGISTRY_COOKIE)?.value
    );
  }
  const customers = isDemoMode() ? listClientAccounts() : [];

  const cards = [
    { label: "Total cards", value: metrics.total_cards },
    { label: "Unclaimed", value: metrics.unclaimed },
    { label: "Active", value: metrics.active },
    { label: "Customers", value: metrics.total_profiles },
  ];

  return (
    <div>
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
          Operations
        </p>
        <h1 className="mt-1 font-display text-4xl text-hb-ink">
          Hi, Admin
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-hb-leaf">
          Edit customer profiles with a live visitor preview, share pages via
          QR/link, and provision HighCards.
        </p>
      </header>

      <AdminQuickActions />

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl text-hb-ink">
            Edit profiles
          </h2>
          <Link
            href="/admin/customers"
            className="text-sm font-semibold text-hb-action"
          >
            See all
          </Link>
        </div>
        <p className="mb-4 text-sm text-hb-leaf">
          Open a customer to edit blocks and preview how the page looks to
          visitors before saving.
        </p>
        <ul className="overflow-hidden rounded-3xl border border-hb-sand/80 bg-white shadow-soft">
          {customers.map((c) => (
            <li
              key={c.user_id}
              className="border-b border-hb-sand/70 last:border-none"
            >
              <Link
                href={`/admin/customers/${c.user_id}`}
                className="flex items-center gap-3 px-5 py-4 transition hover:bg-hb-fog/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-hb-ink">
                    {c.profile.full_name}
                  </p>
                  <p className="text-sm text-hb-leaf">
                    @{c.profile.username} · Edit + live preview
                  </p>
                </div>
                <span className="text-xs font-semibold text-hb-action">
                  Edit
                </span>
                <ChevronRight className="h-5 w-5 text-hb-leaf" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">
              {card.label}
            </p>
            <p className="mt-3 font-display text-4xl text-hb-ink">
              {card.value}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
