import { and, count, eq, isNull, sql, sum } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { requireAdminPage } from "@/lib/auth";
import { fetchManagers } from "@/lib/data";
import { formatInr } from "@/lib/orders";

export const metadata = { title: "Managers" };
export const dynamic = "force-dynamic";

/** Admin overview: every manager's cards, customers and money at a glance. */
export default async function AdminManagersPage() {
  await requireAdminPage();
  const db = getDb();
  const [managers, cardRows, custRows, paidRows, cashRows] = await Promise.all([
    fetchManagers(),
    db
      .select({ id: schema.cards.manager_id, n: count() })
      .from(schema.cards)
      .where(isNull(schema.cards.deleted_at))
      .groupBy(schema.cards.manager_id),
    db
      .select({ id: schema.profiles.referred_by, n: count() })
      .from(schema.profiles)
      .where(and(eq(schema.profiles.role, "client"), isNull(schema.profiles.deleted_at)))
      .groupBy(schema.profiles.referred_by),
    db
      .select({
        id: schema.orders.manager_id,
        n: count(),
        total: sum(schema.orders.amount_paise),
        cash: sql<number>`coalesce(sum(case when ${schema.orders.method} = 'CASH' then ${schema.orders.amount_paise} else 0 end), 0)`,
      })
      .from(schema.orders)
      .where(eq(schema.orders.status, "PAID"))
      .groupBy(schema.orders.manager_id),
    db
      .select({ id: schema.orders.manager_id, n: count() })
      .from(schema.orders)
      .where(and(eq(schema.orders.status, "PENDING"), eq(schema.orders.method, "CASH")))
      .groupBy(schema.orders.manager_id),
  ]);

  const key = (id: string | null) => id ?? "none";
  const by = <T extends { id: string | null }>(rows: T[]) => new Map(rows.map((r) => [key(r.id), r]));
  const cards = by(cardRows);
  const custs = by(custRows);
  const paid = by(paidRows);
  const cash = by(cashRows);

  const list = [
    ...managers.map((m) => ({ id: m.user_id, name: m.full_name || m.username, username: m.username })),
    { id: "none", name: "No manager", username: null as string | null },
  ];

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">Admin</p>
      <h1 className="mt-1 font-display text-4xl text-hb-ink">Managers</h1>
      <p className="mt-2 max-w-2xl text-sm text-hb-leaf">
        Every manager&apos;s cards, customers and collections. Open a manager to see their payments or
        customers. You can approve cash and do everything a manager can.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/manager" className="rounded-xl bg-hb-cta px-4 py-2 font-semibold text-hb-ink">
          All payments →
        </Link>
        <Link href="/manager/customers" className="rounded-xl border border-hb-sand bg-white px-4 py-2 font-semibold text-hb-forest">
          All customers →
        </Link>
      </div>

      {managers.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-hb-sand bg-white p-6 text-sm text-hb-leaf">
          No managers yet. Open a customer under <b>Customers</b> and press <b>Make manager</b>.
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.1em] text-hb-leaf">
            <tr>
              <th className="py-2">Manager</th>
              <th className="py-2 text-right">Cards</th>
              <th className="py-2 text-right">Customers</th>
              <th className="py-2 text-right">Paid orders</th>
              <th className="py-2 text-right">Collected</th>
              <th className="py-2 text-right">Cash</th>
              <th className="py-2 text-right">Cash to approve</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-hb-sand/70">
            {list.map((m) => {
              const p = paid.get(m.id);
              const waiting = cash.get(m.id)?.n ?? 0;
              return (
                <tr key={m.id}>
                  <td className="py-3">
                    <p className="font-semibold text-hb-ink">{m.name}</p>
                    {m.username ? <p className="text-xs text-hb-leaf">@{m.username}</p> : null}
                  </td>
                  <td className="py-3 text-right">{cards.get(m.id)?.n ?? 0}</td>
                  <td className="py-3 text-right">{custs.get(m.id)?.n ?? 0}</td>
                  <td className="py-3 text-right">{p?.n ?? 0}</td>
                  <td className="py-3 text-right">{formatInr(Number(p?.total ?? 0))}</td>
                  <td className="py-3 text-right">{formatInr(Number(p?.cash ?? 0))}</td>
                  <td className={`py-3 text-right ${waiting ? "font-semibold text-hb-danger" : ""}`}>{waiting}</td>
                  <td className="py-3 text-right text-xs font-semibold">
                    <Link href={`/manager?m=${m.id}`} className="text-hb-action">Payments</Link>
                    {" · "}
                    <Link href={`/manager/customers?m=${m.id}`} className="text-hb-action">Customers</Link>
                    {m.id !== "none" ? (
                      <>
                        {" · "}
                        <Link href={`/admin/customers/${m.id}`} className="text-hb-action">Profile</Link>
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
