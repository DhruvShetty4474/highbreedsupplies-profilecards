import { ProgrammingWorkbench } from "@/components/admin/programming-workbench";
import { fetchAllCards } from "@/lib/data";

export const metadata = { title: "NFC Programming" };

export default async function AdminProgrammingPage() {
  const cards = await fetchAllCards();

  return (
    <main>
      <h1 className="font-display text-4xl text-hb-ink">NFC programming</h1>
      <p className="mt-2 max-w-2xl text-sm text-hb-leaf">
        Pull the exact <code>nfc_url</code> payload for TagWriter / USB writers,
        then log a successful read-back. Cards remain UNCLAIMED until customer
        activation.
      </p>
      <div className="mt-6">
        <ProgrammingWorkbench cards={cards} />
      </div>
    </main>
  );
}
