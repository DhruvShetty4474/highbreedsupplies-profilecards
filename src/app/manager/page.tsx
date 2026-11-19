import { CashApproveButton } from "@/components/manager/cash-approve-button";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db";
import { requireManagerPage } from "@/lib/auth";
import { fetchOrdersForManager, formatInr } from "@/lib/orders";
import Link from "next/link";

export const metadata = { title: "Manager · Payments" };

function when(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "—";
}

export default async function ManagerPaymentsPage() {
  const me = await requireManagerPage();
  // Admins see every manager's orders.
  const rows = await fetchOrdersForManager(getDb(), me.role === "admin" ? null : me.user_id);

  const cashWaiting = rows.filter((r) => r.order.status === "PENDING" && r.order.method === "CASH");
  const otherPending = rows.filter((r) => r.order.status === "PENDING" && r.order.method !== "CASH");
  const paid = rows.filter((r) => r.order.status === "PAID");
  const collected = paid.reduce((a, r) => a + r.order.amount_paise, 0);
  const cashCollected = paid
    .filter((r) => r.order.method === "CASH")
    .reduce((a, r) => a + r.order.amount_paise, 0);

  const stats = [
    ["Cash to approve", String(cashWaiting.length)],
    ["Paid orders", String(paid.length)],
    ["Total collected", formatInr(collected)],
    ["Cash collected", formatInr(cashCollected)],
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">Manager</p>
        <h1 className="mt-1 font-display text-4xl text-hb-ink">Payments</h1>
        <p className="mt-2 max-w-2xl text-sm text-hb-leaf">
          When a customer pays you cash, tap <b>Approve cash</b> and read them the code. UPI
          payments confirm by themselves.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-hb-sand/80 bg-white p-4 shadow-soft">
            <p className="text-xs text-hb-leaf">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-hb-ink">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-hb-leaf">
          Cash waiting for approval
        </h2>
        {cashWaiting.length === 0 ? (
          <p className="mt-4 text-sm text-hb-leaf">Nothing to approve right now.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hb-sand/70">
            {cashWaiting.map(({ order, full_name }) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-hb-ink">{order.customer_name || full_name}</p>
                  <p className="text-xs text-hb-leaf">
                    {order.customer_phone} · Card {order.card_id} · {when(order.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatInr(order.amount_paise)}</span>
                  {order.cash_code_hash ? <Badge tone="warn">Code issued</Badge> : null}
                  <CashApproveButton
                    orderId={order.id}
                    amount={formatInr(order.amount_paise)}
                    customer={order.customer_name || full_name || "the customer"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {otherPending.length > 0 ? (
        <section className="rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-hb-leaf">
            Started, not paid yet
          </h2>
          <ul className="mt-4 divide-y divide-hb-sand/70">
            {otherPending.map(({ order, full_name }) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <b>{order.customer_name || full_name}</b> · Card {order.card_id}
                  {order.method === "UPI" ? " · UPI started" : ""}
                </span>
                <span className="text-hb-leaf">{when(order.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-hb-leaf">
          Paid &amp; invoiced
        </h2>
        {paid.length === 0 ? (
          <p className="mt-4 text-sm text-hb-leaf">No payments yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.1em] text-hb-leaf">
                <tr>
                  <th className="py-2">Invoice</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Mode</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hb-sand/70">
                {paid.map(({ order, full_name }) => (
                  <tr key={order.id}>
                    <td className="py-2">
                      <Link href={`/invoice/${order.id}`} className="font-semibold text-hb-action">
                        {order.invoice_no}
                      </Link>
                    </td>
                    <td className="py-2">{order.customer_name || full_name}</td>
                    <td className="py-2">{order.method}</td>
                    <td className="py-2">{when(order.paid_at)}</td>
                    <td className="py-2 text-right">{formatInr(order.amount_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
