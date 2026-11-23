import { and, desc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import Link from "next/link";
import { ManagerFilter } from "@/components/manager/manager-filter";
import { AdminActivateButton } from "@/components/admin/admin-activate-button";
import { Badge } from "@/components/ui/badge";
import { getDb, schema } from "@/db";
import { requireManagerPage } from "@/lib/auth";
import { fetchManagers } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Manager · Customers" };

const DAY = 864e5;

type Status = { label: string; tone: "success" | "warn" | "danger" };

export default async function ManagerCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const me = await requireManagerPage();
  const admin = isAdminRole(me.role);
  const { m = "" } = await searchParams;
  const db = getDb();
  const mgr = alias(schema.profiles, "mgr");

  // Managers: only customers they referred. Admins: everyone, or one manager via ?m=.
  const scope = !admin
    ? eq(schema.profiles.referred_by, me.user_id)
    : m === "none"
      ? isNull(schema.profiles.referred_by)
      : m
        ? eq(schema.profiles.referred_by, m)
        : undefined;

  const [rows, managers, settings] = await Promise.all([
    db
      .select({
        user_id: schema.profiles.user_id,
        full_name: schema.profiles.full_name,
        username: schema.profiles.username,
        email: schema.profiles.email,
        phone: schema.profiles.phone,
        created_at: schema.profiles.created_at,
        card_id: schema.cards.card_id,
        card_status: schema.cards.status,
        manager_name: mgr.full_name,
        manager_username: mgr.username,
      })
      .from(schema.profiles)
      .leftJoin(
        schema.cards,
        and(eq(schema.cards.user_id, schema.profiles.user_id), isNull(schema.cards.deleted_at))
      )
      .leftJoin(mgr, eq(mgr.user_id, schema.profiles.referred_by))
      .where(and(eq(schema.profiles.role, "client"), isNull(schema.profiles.deleted_at), scope))
      .orderBy(desc(schema.profiles.created_at))
      .limit(500),
    admin ? fetchManagers() : Promise.resolve([]),
    getSettings(db),
  ]);

  function statusOf(r: (typeof rows)[number]): Status {
    if (r.card_status === "ACTIVE") return { label: "Paid", tone: "success" };
    if (r.card_status === "RESERVED") return { label: "Awaiting payment", tone: "warn" };
    if (r.card_status === "BLOCKED") return { label: "Card blocked", tone: "danger" };
    const left = new Date(r.created_at).getTime() + settings.free_trial_days * DAY - Date.now();
    return left > 0
      ? { label: `Free trial · ${Math.ceil(left / DAY)}d left`, tone: "warn" }
      : { label: "Trial ended", tone: "danger" };
  }

  return (
    <div>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
          {admin ? "Admin · all managers" : "Manager"}
        </p>
        <h1 className="mt-1 font-display text-4xl text-hb-ink">
          {admin ? "All customers" : "My customers"}
        </h1>
        <p className="mt-2 text-sm text-hb-leaf">
          {admin
            ? "Every customer, which manager referred them, and whether they've paid."
            : "Customers who registered a card from your batches."}
        </p>
        {admin ? (
          <div className="mt-4">
            <ManagerFilter managers={managers} value={m} />
          </div>
        ) : null}
      </header>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft">
        {rows.length === 0 ? (
          <p className="text-sm text-hb-leaf">
            No customers yet. They appear here as soon as they register a card from{" "}
            {admin ? "a batch" : "your batch"}.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.1em] text-hb-leaf">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Contact</th>
                {admin ? <th className="py-2">Manager</th> : null}
                <th className="py-2">Card</th>
                <th className="py-2">Status</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hb-sand/70">
              {rows.map((r) => {
                const st = statusOf(r);
                return (
                  <tr key={`${r.user_id}:${r.card_id ?? ""}`}>
                    <td className="py-2">
                      {admin ? (
                        <Link href={`/admin/customers/${r.user_id}`} className="font-semibold text-hb-action">
                          {r.full_name || r.username}
                        </Link>
                      ) : (
                        <a
                          href={`/${r.username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-hb-action"
                        >
                          {r.full_name || r.username}
                        </a>
                      )}
                      <span className="block text-xs text-hb-leaf">@{r.username}</span>
                    </td>
                    <td className="py-2 text-hb-leaf">{[r.phone, r.email].filter(Boolean).join(" · ")}</td>
                    {admin ? (
                      <td className="py-2 text-hb-forest">
                        {r.manager_name || (r.manager_username ? `@${r.manager_username}` : "—")}
                      </td>
                    ) : null}
                    <td className="py-2">{r.card_id ?? "—"}</td>
                    <td className="py-2">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {admin && r.card_status === "RESERVED" && r.card_id ? (
                          <span className="text-xs">
                            <AdminActivateButton cardId={r.card_id} />
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-2 text-hb-leaf">
                      {new Date(r.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
