import { CreateCustomerForm } from "@/components/admin/create-customer-form";
import { listClientAccounts } from "@/lib/demo-store";
import { getStats } from "@/lib/demo-store";
import { isDemoMode } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Customers" };

export default function AdminCustomersPage() {
  const customers = isDemoMode() ? listClientAccounts() : [];

  return (
    <div>
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
          Accounts
        </p>
        <h1 className="mt-1 font-display text-4xl text-hb-ink">Customers</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hb-leaf">
          Only administrators can create customer login IDs. After creation, the
          customer can sign in, edit their profile blocks, claim a programmed
          HighCard, and view reach / share / lead metrics.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-hb-leaf">
          Create customer
        </h2>
        <CreateCustomerForm />
      </section>

      <section className="overflow-hidden rounded-2xl border border-hb-sand/80 bg-white shadow-soft">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-3 border-b border-hb-sand bg-hb-fog/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-hb-leaf">
          <span>Customer</span>
          <span>Login ID</span>
          <span>Metrics</span>
          <span>Profile</span>
        </div>
        <ul className="divide-y divide-hb-sand/70">
          {customers.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-hb-leaf">
              No customers yet.
            </li>
          ) : (
            customers.map((c) => {
              const stats = getStats(c.user_id);
              return (
                <li
                  key={c.user_id}
                  className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-3 px-5 py-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-hb-ink">
                      {c.profile.full_name}
                    </p>
                    <p className="truncate text-xs text-hb-leaf">
                      @{c.profile.username}
                    </p>
                  </div>
                  <p className="font-medium text-hb-forest">{c.login_id}</p>
                  <p className="text-xs text-hb-leaf">
                    {stats.reaches} reaches · {stats.shares} shares ·{" "}
                    {stats.contact_saves} saves
                  </p>
                  <Link
                    href={`/${c.profile.username}`}
                    target="_blank"
                    className="text-xs font-semibold text-hb-action"
                  >
                    Open
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
