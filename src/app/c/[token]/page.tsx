import { ClaimCardPanel } from "@/components/cards/claim-card-panel";
import { HighbreedWordmark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { getSessionProfile } from "@/lib/auth";
import { fetchCardByToken, fetchProfileById } from "@/lib/data";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: { token: string } };

/** Public card routes: centered card on canvas (same shell as profiles). */
function PublicCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-[radial-gradient(1000px_560px_at_12%_-8%,rgba(61,190,139,0.28),transparent_55%),radial-gradient(800px_480px_at_90%_0%,rgba(15,61,50,0.4),transparent_50%),linear-gradient(165deg,#071512_0%,#0F3D32_48%,#123F35_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-stretch justify-center px-0 py-0 sm:px-6 sm:py-10 lg:items-center">
        <div className="w-full max-w-[440px] overflow-hidden bg-[#F7FBF9] shadow-lift sm:rounded-[2rem] sm:border sm:border-white/25">
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function CardTokenRouterPage({ params }: Props) {
  const card = await fetchCardByToken(params.token);

  if (!card) {
    return (
      <PublicCardShell>
        <div className="p-8 pt-12">
          <HighbreedWordmark />
          <h1 className="mt-8 font-display text-3xl text-hb-ink">
            Card not found
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-hb-leaf">
            This HighCard token is invalid or has not been provisioned yet.
          </p>
        </div>
      </PublicCardShell>
    );
  }

  if (card.status === "BLOCKED") {
    return (
      <PublicCardShell>
        <div>
          <div className="bg-gradient-to-br from-hb-danger/90 to-hb-forest px-7 py-10 text-white">
            <ShieldAlert className="h-10 w-10" />
            <h1 className="mt-4 font-display text-3xl">Card disabled</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              This HighCard has been disabled for security. Contact HIGHBREED
              support if you believe this is a mistake.
            </p>
          </div>
          <div className="space-y-3 px-7 py-6 text-sm text-hb-leaf">
            <div className="flex items-center justify-between">
              <span>Card ID</span>
              <span className="font-semibold text-hb-ink">{card.card_id}</span>
            </div>
            <Badge tone="danger">Blocked</Badge>
          </div>
        </div>
      </PublicCardShell>
    );
  }

  if (card.status === "ACTIVE" && card.user_id) {
    const profile = await fetchProfileById(card.user_id);
    if (profile?.username) {
      redirect(`/${profile.username}`);
    }
  }

  const session = await getSessionProfile();

  return (
    <PublicCardShell>
      <div className="p-6 pt-10">
        <HighbreedWordmark />
        <ClaimCardPanel card={card} sessionUsername={session?.username} />
      </div>
    </PublicCardShell>
  );
}
