import { and, desc, eq } from "drizzle-orm";
import { ActivationFlow } from "@/components/activate/activation-flow";
import { HighbreedWordmark } from "@/components/brand/logo";
import { getConfig } from "@/config";
import { getDb, schema } from "@/db";
import { getSessionProfile } from "@/lib/auth";
import { RESERVATION_DAYS, releaseCard, TOKEN_RE } from "@/lib/cards";
import { fetchCardByToken, fetchProfileById } from "@/lib/data";
import { formatInr, priceBreakup } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activate your HighCard" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[linear-gradient(165deg,#062E24_0%,#0B5C45_52%,#083D30_100%)] px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-5 [&_*]:text-white">
          <HighbreedWordmark />
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-lift sm:p-8">{children}</div>
      </div>
    </main>
  );
}

function Notice({ icon, title, text, children }: {
  icon: React.ReactNode;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <Shell>
      {icon}
      <h1 className="mt-4 font-display text-3xl text-hb-ink">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-hb-leaf">{text}</p>
      {children}
    </Shell>
  );
}

type Props = { params: Promise<{ token: string }> };

/** Scan → register → (1) card code → (2) pay → card live + invoice. */
export default async function ActivatePage({ params }: Props) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();

  const profile = await getSessionProfile();
  if (!profile) redirect(`/register?card=${token}`);

  let card = await fetchCardByToken(token);
  if (!card) notFound();
  if (card.status === "RESERVED" && (await releaseCard(getDb(), card.card_id, { onlyIfExpired: true }))) {
    card = (await fetchCardByToken(token))!;
  }

  if (card.status === "BLOCKED") {
    return (
      <Notice
        icon={<ShieldAlert className="h-10 w-10 text-hb-danger" />}
        title="Card disabled"
        text="This HighCard has been disabled. Contact HIGHBREED support if you think this is a mistake."
      />
    );
  }
  if (card.user_id && card.user_id !== profile.user_id) {
    return (
      <Notice
        icon={<ShieldAlert className="h-10 w-10 text-hb-danger" />}
        title="Already registered"
        text="This card is registered to a different account. Sign in with that account, or contact support."
      />
    );
  }

  const db = getDb();
  if (card.status === "ACTIVE") {
    const paid = await db
      .select({ id: schema.orders.id, invoice_no: schema.orders.invoice_no })
      .from(schema.orders)
      .where(and(eq(schema.orders.card_id, card.card_id), eq(schema.orders.status, "PAID")))
      .orderBy(desc(schema.orders.paid_at))
      .get();
    return (
      <Notice
        icon={<CheckCircle2 className="h-10 w-10 text-hb-action" />}
        title="Your HighCard is live 🎉"
        text={`Card ${card.card_id} now opens your profile whenever someone taps or scans it.`}
      >
        <div className="mt-6 grid gap-3">
          <Link
            href="/dashboard/pages"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-hb-cta font-semibold text-hb-ink"
          >
            Set up my profile
          </Link>
          {paid ? (
            <Link
              href={`/invoice/${paid.id}`}
              className="inline-flex h-12 items-center justify-center rounded-2xl border-2 border-hb-sand font-semibold text-hb-forest"
            >
              View invoice {paid.invoice_no}
            </Link>
          ) : null}
        </div>
      </Notice>
    );
  }

  // UNCLAIMED → step 1 (code). RESERVED by me → step 2 (pay).
  const [settings, manager, pendingOrder] = await Promise.all([
    getSettings(db),
    card.manager_id ? fetchProfileById(card.manager_id) : null,
    db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.card_id, card.card_id),
          eq(schema.orders.user_id, profile.user_id),
          eq(schema.orders.status, "PENDING")
        )
      )
      .get(),
  ]);

  const amount = pendingOrder?.amount_paise ?? Math.round(settings.card_price_inr * 100);
  const gstBp = pendingOrder?.gst_rate_bp ?? Math.round(settings.gst_rate_percent * 100);
  const b = priceBreakup(amount, gstBp);

  return (
    <Shell>
      <ActivationFlow
        token={token}
        cardId={card.card_id}
        step={card.status === "UNCLAIMED" ? "code" : "pay"}
        managerName={manager?.full_name || null}
        price={
          amount > 0
            ? {
                total: formatInr(b.total),
                taxable: formatInr(b.taxable),
                tax: formatInr(b.tax),
                gstPercent: gstBp / 100,
              }
            : null
        }
        razorpayEnabled={getConfig().features.razorpay}
        termsText={settings.terms_text}
        prefill={{
          name: profile.full_name,
          email: profile.email ?? "",
          phone: profile.phone ?? "",
        }}
        pendingCashOrderId={pendingOrder?.method === "CASH" ? pendingOrder.id : null}
        reservedUntil={
          card.reserved_at
            ? new Date(new Date(card.reserved_at).getTime() + RESERVATION_DAYS * 86_400_000).toLocaleDateString(
                "en-IN",
                { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }
              )
            : null
        }
      />
    </Shell>
  );
}
