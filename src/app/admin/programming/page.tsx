import { requireAdminPage } from "@/lib/auth";
import { ProgrammingWorkbench } from "@/components/admin/programming-workbench";
import { fetchAllCards } from "@/lib/data";
import { ProgrammingHelp } from "@/components/admin/programming-help";
import Link from "next/link";

export const metadata = { title: "NFC Programming" };

export default async function AdminProgrammingPage() {
  await requireAdminPage();
  const cards = await fetchAllCards();

  return (
    <main>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-hb-ink">NFC programming</h1>
          <p className="mt-2 max-w-2xl text-sm text-hb-leaf">
            Write each card&apos;s link onto its NFC chip, then verify it. Cards
            stay unclaimed until a customer activates and pays.
          </p>
        </div>
        <ProgrammingHelp />
      </div>
      <div className="mt-6">
        {cards.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-hb-sand bg-white/90 px-6 py-12 text-center shadow-soft">
            <p className="font-display text-2xl text-hb-ink">No cards to program yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-hb-leaf">
              Card links are created in Card inventory. Create a batch there (once
              highfis.com is live), then come back here to write each card.
            </p>
            <Link
              href="/admin/cards"
              className="mt-5 inline-flex h-11 items-center rounded-2xl bg-hb-cta px-5 font-semibold text-hb-ink"
            >
              Go to Card inventory →
            </Link>
          </div>
        ) : (
          <ProgrammingWorkbench cards={cards} />
        )}
      </div>
    </main>
  );
}
