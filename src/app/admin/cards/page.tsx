import { requireAdminPage } from "@/lib/auth";
import { BatchGenerator } from "@/components/admin/batch-generator";
import { CardRowActions } from "@/components/admin/card-row-actions";
import { Badge } from "@/components/ui/badge";
import { fetchAllCards, fetchBatches, fetchManagers } from "@/lib/data";
import { BatchManagerSelect } from "@/components/admin/batch-manager-select";
import type { ProgrammingStatus } from "@/lib/types";

export const metadata = { title: "Admin Cards" };

function toneFor(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "BLOCKED") return "danger" as const;
  return "warn" as const;
}

const programmingLabel: Record<ProgrammingStatus, string> = {
  UNPROGRAMMED: "not written",
  PROGRAMMED: "NFC verified",
  FAILED: "NFC verify failed",
};

export default async function AdminCardsPage() {
  await requireAdminPage();
  const [cards, batches, managers] = await Promise.all([
    fetchAllCards(),
    fetchBatches(),
    fetchManagers(),
  ]);

  return (
    <main>
      <h1 className="font-display text-4xl text-hb-ink">Card inventory</h1>
      <p className="mt-2 text-sm text-hb-leaf">
        Generate unprogrammed batches for physical printing and factory NFC
        write jobs. Programming (NFC write) is tracked separately from
        activation.
      </p>

      <div className="mt-6">
        <BatchGenerator managers={managers} />
      </div>

      {batches.length ? (
        <section className="mt-8 overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-soft">
          <div className="border-b border-hb-sand px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">
            Batches
          </div>
          <ul className="divide-y divide-hb-sand/70">
            {batches.map((b) => (
              <li
                key={b.batch_id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-hb-ink">{b.label}</p>
                  <p className="text-xs text-hb-leaf">
                    {b.batch_id} · {b.quantity} cards · {b.created_at.slice(0, 10)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <BatchManagerSelect
                    batchId={b.batch_id}
                    managerId={b.manager_id ?? null}
                    managers={managers}
                  />
                  <a
                    href={`/api/admin/batches/${b.batch_id}/export`}
                    className="text-xs font-semibold text-hb-action"
                  >
                    Export CSV
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-soft">
        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-hb-sand px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf md:grid-cols-[1fr_auto_auto]">
          <span>Card</span>
          <span>Status</span>
          <span className="hidden md:block">Actions</span>
        </div>
        <ul className="divide-y divide-hb-sand/70">
          {cards.map((card) => (
            <li
              key={card.card_id}
              className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_auto_auto]"
            >
              <div className="min-w-0">
                <p className="font-semibold text-hb-ink">{card.card_id}</p>
                <p className="truncate text-xs text-hb-leaf">
                  {card.public_token} · {programmingLabel[card.programming_status]}
                </p>
              </div>
              <Badge tone={toneFor(card.status)}>{card.status}</Badge>
              <div className="col-span-2 md:col-span-1">
                <CardRowActions cardId={card.card_id} status={card.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
