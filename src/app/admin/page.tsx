import { fetchAdminMetrics } from "@/lib/data";
import Link from "next/link";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const metrics = await fetchAdminMetrics();

  const cards = [
    { label: "Total cards", value: metrics.total_cards, hint: "In inventory" },
    { label: "Unclaimed", value: metrics.unclaimed, hint: "Ready to activate" },
    { label: "Active", value: metrics.active, hint: "Linked to customers" },
    { label: "Programmed", value: metrics.programmed, hint: "NFC write verified" },
    { label: "Customers", value: metrics.total_profiles, hint: "Client accounts" },
    { label: "Leads", value: metrics.total_leads, hint: "Visitor captures" },
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
            Create customers, generate HighCard batches, and program NTAG213
            chips. Programming only writes a URL to the chip — never customer
            personal data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/customers"
            className="inline-flex h-11 items-center rounded-xl bg-hb-action px-4 text-sm font-semibold text-white shadow-lift"
          >
            Manage customers
          </Link>
          <Link
            href="/admin/programming"
            className="inline-flex h-11 items-center rounded-xl border border-hb-sand bg-white px-4 text-sm font-semibold text-hb-forest"
          >
            NFC programming
          </Link>
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">
              {card.label}
            </p>
            <p className="mt-3 font-display text-4xl text-hb-ink">{card.value}</p>
            <p className="mt-1 text-xs text-hb-leaf/80">{card.hint}</p>
          </article>
        ))}
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
          <h2 className="font-display text-2xl text-hb-ink">
            What is “NFC programming”?
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-hb-leaf">
            <li>
              <strong className="text-hb-ink">Generate a card</strong> in Card
              Inventory — each gets a secret link like{" "}
              <code className="rounded bg-hb-mist px-1">/c/A7X92KP4</code>.
            </li>
            <li>
              <strong className="text-hb-ink">Fetch programming data</strong>{" "}
              (admin-only API) — returns the exact URL to write with NXP
              TagWriter.
            </li>
            <li>
              <strong className="text-hb-ink">Write + verify</strong> — after
              read-back matches, card becomes PROGRAMMED but still UNCLAIMED.
            </li>
            <li>
              <strong className="text-hb-ink">Customer activates</strong> — they
              log in and claim the card; status becomes ACTIVE and taps open
              their profile.
            </li>
          </ol>
        </article>

        <article className="rounded-2xl border border-hb-sand/80 bg-hb-cta p-6 text-white shadow-lift">
          <h2 className="font-display text-2xl">Quick links</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/admin/customers" className="underline decoration-white/40">
                Create / edit customers (pranay & demo)
              </Link>
            </li>
            <li>
              <Link href="/admin/cards" className="underline decoration-white/40">
                Generate card batches
              </Link>
            </li>
            <li>
              <Link
                href="/admin/programming"
                className="underline decoration-white/40"
              >
                Open programming workbench
              </Link>
            </li>
            <li>
              <Link href="/c/A7X92KP4" className="underline decoration-white/40">
                Test unclaimed card → /c/A7X92KP4
              </Link>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
