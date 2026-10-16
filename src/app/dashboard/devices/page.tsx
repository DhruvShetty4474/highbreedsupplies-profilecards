import { DeviceClaimForm } from "@/components/dashboard/device-claim-form";
import { Badge } from "@/components/ui/badge";
import { getSessionProfile } from "@/lib/auth";
import { fetchAllCards } from "@/lib/data";
import { redirect } from "next/navigation";

export const metadata = { title: "Cards / Devices" };

export default async function DashboardDevicesPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const cards = await fetchAllCards();
  const mine = cards.filter((c) => c.user_id === profile.user_id);
  const claimable = cards.filter(
    (c) => c.status === "UNCLAIMED" && c.programming_verified
  );

  return (
    <div>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
          Hardware
        </p>
        <h1 className="mt-1 font-display text-4xl text-hb-ink">
          Cards / Devices
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-hb-leaf">
          Link programmed HighCards to your account. NFC and QR tokens resolve
          through the smart router at <code>/c/[token]</code>.
        </p>
      </header>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-hb-leaf">
            Your cards
          </h2>
          <div className="mt-4 space-y-3">
            {mine.length === 0 ? (
              <p className="rounded-xl border border-dashed border-hb-sand px-4 py-8 text-center text-sm text-hb-leaf">
                No active HighCard yet. Claim a programmed token on the right.
              </p>
            ) : (
              mine.map((card) => (
                <article
                  key={card.card_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hb-sand/70 bg-hb-fog/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-hb-ink">{card.card_id}</p>
                    <p className="truncate text-xs text-hb-leaf">{card.nfc_url}</p>
                  </div>
                  <Badge tone="success">{card.status}</Badge>
                </article>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-hb-leaf">
            Claim a card
          </h2>
          <DeviceClaimForm
            suggestions={claimable.map((c) => c.public_token)}
          />
        </section>
      </div>
    </div>
  );
}
