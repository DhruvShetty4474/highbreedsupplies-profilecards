import { HighbreedWordmark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { getSessionProfile } from "@/lib/auth";
import { fetchCardByToken, fetchProfileById } from "@/lib/data";
import { Hourglass, ShieldAlert } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { releaseCard, resolveCardView, TOKEN_RE } from "@/lib/cards";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/** Public card routes: centered card on canvas (same shell as profiles). */
function PublicCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-[radial-gradient(1000px_560px_at_12%_-8%,rgba(240,201,74,0.22),transparent_55%),radial-gradient(800px_480px_at_90%_0%,rgba(11,92,69,0.45),transparent_50%),linear-gradient(165deg,#062E24_0%,#0B5C45_52%,#083D30_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-stretch justify-center px-0 py-0 sm:px-6 sm:py-10 lg:items-center">
        <div className="w-full max-w-[440px] overflow-hidden bg-hb-fog shadow-lift sm:rounded-[2rem] sm:border sm:border-hb-gold/25">
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function CardTokenRouterPage({ params }: Props) {
  const { token } = await params;
  let card = TOKEN_RE.test(token) ? await fetchCardByToken(token) : null;
  // An unpaid reservation that ran out frees the card for whoever scans it.
  if (card?.status === "RESERVED" && (await releaseCard(getDb(), card.card_id, { onlyIfExpired: true }))) {
    card = await fetchCardByToken(token);
  }
  const owner =
    card?.status === "ACTIVE" && card.user_id
      ? await fetchProfileById(card.user_id)
      : null;
  const result = resolveCardView(card, owner);

  if (result.view === "not_found") notFound();
  if (result.view === "profile") redirect(`/${result.username}`);

  if (result.view === "blocked") {
    const card = result.card;
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

  // New card: scanning it starts registration (or activation if signed in).
  const session = await getSessionProfile();
  const activate = `/activate/${result.card.public_token}`;
  if (result.view === "activate") {
    redirect(session ? activate : `/register?card=${result.card.public_token}`);
  }

  // RESERVED: the holder finishes payment; anyone else sees "pending".
  if (session && session.user_id === result.card.user_id) redirect(activate);
  return (
    <PublicCardShell>
      <div className="p-6 pt-10">
        <HighbreedWordmark />
        <div className="mt-8 rounded-[32px] border border-white/70 bg-white/90 px-6 py-8 shadow-soft">
          <Hourglass className="h-9 w-9 text-hb-action" />
          <h1 className="mt-4 font-display text-3xl text-hb-ink">Activation in progress</h1>
          <p className="mt-3 text-sm leading-relaxed text-hb-leaf">
            This HighCard has been registered and is waiting for payment. The
            profile will appear here as soon as it&apos;s activated.
          </p>
          {!session ? (
            <a
              href={`/login?next=${encodeURIComponent(activate)}`}
              className="mt-6 inline-flex min-h-11 items-center font-semibold text-hb-action"
            >
              Is this your card? Sign in to finish →
            </a>
          ) : null}
        </div>
      </div>
    </PublicCardShell>
  );
}
