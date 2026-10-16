import { fetchAdminMetrics } from "@/lib/data";
import Link from "next/link";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const metrics = await fetchAdminMetrics();

  const cards = [
    { label: "Total cards", value: metrics.total_cards },
    { label: "Unclaimed", value: metrics.unclaimed },
    { label: "Active", value: metrics.active },
    { label: "Blocked", value: metrics.blocked },
    { label: "Programmed", value: metrics.programmed },
    { label: "Profiles", value: metrics.total_profiles },
    { label: "Leads", value: metrics.total_leads },
    { label: "Batches", value: metrics.batches },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
            Operations
          </p>
          <h1 className="mt-1 font-display text-4xl text-hb-ink">
            Admin overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-hb-leaf">
            Provision factory batches, verify NFC write/read-back, and monitor
            printing + activation metrics across the full desktop console.
          </p>
        </div>
        <Link
          href="/admin/cards"
          className="inline-flex h-11 items-center rounded-xl bg-hb-action px-4 text-sm font-semibold text-white shadow-lift"
        >
          Generate batch
        </Link>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">
              {card.label}
            </p>
            <p className="mt-3 font-display text-4xl text-hb-ink">{card.value}</p>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <h2 className="font-display text-2xl text-hb-ink">Provisioning API</h2>
        <p className="mt-2 text-sm text-hb-leaf">
          External writers (NXP TagWriter / USB) should query:
        </p>
        <code className="mt-3 block overflow-x-auto rounded-xl bg-hb-ink px-4 py-3 text-xs text-hb-mint">
          GET /api/admin/cards/&#123;card_id&#125;/programming-data
        </code>
        <p className="mt-3 text-sm text-hb-leaf">
          Confirm read-back with{" "}
          <code className="rounded bg-hb-mist px-1.5 py-0.5 text-hb-forest">
            POST /api/admin/cards/&#123;card_id&#125;/verify
          </code>
          . Cards stay <strong>UNCLAIMED</strong> until customer activation.
        </p>
      </section>
    </div>
  );
}
