import { eq } from "drizzle-orm";
import { PrintButton } from "@/components/invoice/print-button";
import { getDb, schema } from "@/db";
import { getSessionProfile } from "@/lib/auth";
import { formatInr, priceBreakup } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** Tax invoice for a paid order. Visible to the customer, their manager, admins. */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getSessionProfile();
  if (!viewer) redirect(`/login?next=/invoice/${encodeURIComponent(id)}`);

  const db = getDb();
  const order = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).get();
  const allowed =
    order &&
    (viewer.role === "admin" ||
      order.user_id === viewer.user_id ||
      order.manager_id === viewer.user_id);
  if (!order || !allowed || order.status !== "PAID" || !order.invoice_no) notFound();

  const s = await getSettings(db);
  const b = priceBreakup(order.amount_paise, order.gst_rate_bp);
  // Inter-state (IGST) only when both GSTINs are known and the state codes differ.
  const interState = Boolean(
    s.seller_gstin && order.customer_gstin && s.seller_gstin.slice(0, 2) !== order.customer_gstin.slice(0, 2)
  );
  const rate = order.gst_rate_bp / 100;
  const half = Math.floor(b.tax / 2);

  return (
    <main className="min-h-dvh bg-hb-fog px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 print:hidden">
        <Link href="/go" className="inline-flex min-h-11 items-center font-semibold text-hb-action">
          ← Back
        </Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 text-sm text-hb-ink shadow-soft sm:p-10 print:rounded-none print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hb-sand pb-6">
          <div>
            <p className="font-display text-2xl">{s.seller_name}</p>
            {s.seller_address ? <p className="mt-1 whitespace-pre-line text-hb-leaf">{s.seller_address}</p> : null}
            {s.seller_gstin ? <p className="mt-1">GSTIN: <b>{s.seller_gstin}</b></p> : null}
            {s.seller_phone || s.seller_email ? (
              <p className="mt-1 text-hb-leaf">{[s.seller_phone, s.seller_email].filter(Boolean).join(" · ")}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hb-leaf">Tax invoice</p>
            <p className="mt-1 text-lg font-semibold">{order.invoice_no}</p>
            <p className="text-hb-leaf">Date: {fmtDate(order.paid_at!)}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-hb-sand py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">Billed to</p>
            <p className="mt-1 font-semibold">{order.customer_name}</p>
            <p className="whitespace-pre-line text-hb-leaf">{order.customer_address}</p>
            <p className="text-hb-leaf">{order.customer_phone} · {order.customer_email}</p>
            {order.customer_gstin ? <p>GSTIN: <b>{order.customer_gstin}</b></p> : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hb-leaf">Payment</p>
            <p className="mt-1 font-semibold">{order.method === "UPI" ? "UPI (Razorpay)" : "Cash"}</p>
            {order.razorpay_payment_id ? <p className="text-hb-leaf">Ref: {order.razorpay_payment_id}</p> : null}
            <p className="text-hb-leaf">Order: {order.id}</p>
          </div>
        </section>

        <table className="mt-6 w-full text-left">
          <thead className="text-xs uppercase tracking-[0.1em] text-hb-leaf">
            <tr className="border-b border-hb-sand">
              <th className="py-2">Item</th>
              <th className="py-2">HSN</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Taxable value</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-hb-sand/60">
              <td className="py-3">HIGHBREED NFC HighCard {order.card_id} + digital profile</td>
              <td className="py-3">{s.hsn_code}</td>
              <td className="py-3 text-right">1</td>
              <td className="py-3 text-right">{formatInr(b.taxable)}</td>
            </tr>
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1">
          <div className="flex justify-between"><dt>Taxable value</dt><dd>{formatInr(b.taxable)}</dd></div>
          {interState ? (
            <div className="flex justify-between"><dt>IGST @ {rate}%</dt><dd>{formatInr(b.tax)}</dd></div>
          ) : (
            <>
              <div className="flex justify-between"><dt>CGST @ {rate / 2}%</dt><dd>{formatInr(half)}</dd></div>
              <div className="flex justify-between"><dt>SGST @ {rate / 2}%</dt><dd>{formatInr(b.tax - half)}</dd></div>
            </>
          )}
          <div className="flex justify-between border-t border-hb-sand pt-2 text-base font-semibold">
            <dt>Total paid</dt><dd>{formatInr(b.total)}</dd>
          </div>
        </dl>

        <footer className="mt-10 border-t border-hb-sand pt-4 text-xs text-hb-leaf">
          This is a computer-generated invoice and does not need a signature.
        </footer>
      </article>
    </main>
  );
}
