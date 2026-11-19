import { desc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { getDb, schema } from "@/db";
import { requireManagerPage } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";

export const metadata = { title: "Manager · Customers" };

export default async function ManagerCustomersPage() {
  const me = await requireManagerPage();
  const base = getDb()
    .select({
      user_id: schema.profiles.user_id,
      full_name: schema.profiles.full_name,
      username: schema.profiles.username,
      email: schema.profiles.email,
      phone: schema.profiles.phone,
      created_at: schema.profiles.created_at,
      card_id: schema.cards.card_id,
      card_status: schema.cards.status,
    })
    .from(schema.profiles)
    .leftJoin(schema.cards, eq(schema.cards.user_id, schema.profiles.user_id))
    .orderBy(desc(schema.profiles.created_at))
    .limit(500);
  // Admins see every customer; managers only the ones they referred.
  const rows =
    isAdminRole(me.role)
      ? await base.where(eq(schema.profiles.role, "client"))
      : await base.where(eq(schema.profiles.referred_by, me.user_id));

  return (
    <div>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">Manager</p>
        <h1 className="mt-1 font-display text-4xl text-hb-ink">My customers</h1>
        <p className="mt-2 text-sm text-hb-leaf">
          Customers who registered a card from your batches.
        </p>
      </header>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft">
        {rows.length === 0 ? (
          <p className="text-sm text-hb-leaf">
            No customers yet. They appear here as soon as they register a card from your batch.
          </p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.1em] text-hb-leaf">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Contact</th>
                <th className="py-2">Card</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hb-sand/70">
              {rows.map((r) => (
                <tr key={`${r.user_id}:${r.card_id ?? ""}`}>
                  <td className="py-2">
                    <a
                      href={`/${r.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-hb-action"
                    >
                      {r.full_name || r.username}
                    </a>
                  </td>
                  <td className="py-2 text-hb-leaf">
                    {[r.phone, r.email].filter(Boolean).join(" · ")}
                  </td>
                  <td className="py-2">
                    {r.card_id ? (
                      <span className="inline-flex items-center gap-2">
                        {r.card_id}
                        <Badge
                          tone={
                            r.card_status === "ACTIVE"
                              ? "success"
                              : r.card_status === "RESERVED"
                                ? "warn"
                                : "danger"
                          }
                        >
                          {r.card_status === "RESERVED" ? "Awaiting payment" : r.card_status}
                        </Badge>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-hb-leaf">
                    {new Date(r.created_at).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
