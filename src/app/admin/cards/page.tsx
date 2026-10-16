import { BatchGenerator } from "@/components/admin/batch-generator";
import { Badge } from "@/components/ui/badge";
import { fetchAllCards } from "@/lib/data";

export const metadata = { title: "Admin Cards" };

function toneFor(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "BLOCKED") return "danger" as const;
  return "warn" as const;
}

export default async function AdminCardsPage() {
  const cards = await fetchAllCards();

  return (
    <main>
      <h1 className="font-display text-4xl text-hb-ink">Card inventory</h1>
      <p className="mt-2 text-sm text-hb-leaf">
        Generate unprogrammed batches for physical printing and factory NFC
        write jobs.
      </p>

      <div className="mt-6">
        <BatchGenerator />
      </div>

      <div className="mt-8 overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-soft">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-hb-sand px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">
          <span>Card</span>
          <span>Status</span>
          <span>NFC</span>
        </div>
        <ul className="divide-y divide-hb-sand/70">
          {cards.map((card) => (
            <li
              key={card.card_id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-semibold text-hb-ink">{card.card_id}</p>
                <p className="truncate text-xs text-hb-leaf">
                  {card.public_token}
                  {card.programming_verified ? " · verified" : " · pending write"}
                </p>
              </div>
              <Badge tone={toneFor(card.status)}>{card.status}</Badge>
              <a
                href={`/api/admin/cards/${card.card_id}/programming-data`}
                className="text-xs font-semibold text-hb-action"
              >
                JSON
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
