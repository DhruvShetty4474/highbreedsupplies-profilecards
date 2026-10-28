import { CreateCustomerForm } from "@/components/admin/create-customer-form";
import { getStats, listClientAccounts } from "@/lib/demo-store";
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
          Create login IDs here, or customers can self-register at{" "}
          <a href="/register" className="font-semibold text-hb-action">
            /register
          </a>
          . Self-registered users appear in this list so you can edit and share
          their pages.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-hb-leaf">
          Create customer
        </h2>
        <CreateCustomerForm />
      </section>

      <section className="overflow-hidden rounded-2xl border border-hb-sand/80 bg-white shadow-soft">
        <div className="hidden grid-cols-[1.2fr_1fr_1.2fr_auto] gap-3 border-b border-hb-sand bg-hb-fog/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-hb-leaf md:grid">
          <span>Customer</span>
          <span>Login ID</span>
          <span>Metrics</span>
          <span>Actions</span>
        </div>
        <ul className="divide-y divide-hb-sand/70">
          {customers.map((c) => {
            const stats = getStats(c.user_id);
            return (
              <li
                key={c.user_id}
                className="flex flex-col gap-3 px-5 py-4 text-sm md:grid md:grid-cols-[1.2fr_1fr_1.2fr_auto] md:items-center"
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
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/admin/customers/${c.user_id}`}
                    className="text-xs font-semibold text-hb-action"
                  >
                    Edit + preview
                  </Link>
                  <Link
                    href={`/admin/share/${c.user_id}`}
                    className="text-xs font-semibold text-hb-action"
                  >
                    Share
                  </Link>
                  <Link
                    href={`/${c.profile.username}`}
                    target="_blank"
                    className="text-xs font-semibold text-hb-leaf"
                  >
                    Visitor view
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
