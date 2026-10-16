import { getSessionProfile } from "@/lib/auth";
import { fetchLeadsForUser } from "@/lib/data";
import { avatarHue, initials } from "@/lib/utils";
import { format } from "date-fns";
import { redirect } from "next/navigation";

export const metadata = { title: "Leads" };

export default async function DashboardContactsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  const leads = await fetchLeadsForUser(profile.user_id);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
            CRM
          </p>
          <h1 className="mt-1 font-display text-4xl text-hb-ink">Leads</h1>
          <p className="mt-2 text-sm text-hb-leaf">
            Contacts captured from the public &quot;Share Your Info&quot; banner.
          </p>
        </div>
        <p className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-hb-forest shadow-soft">
          {leads.length} total
        </p>
      </header>

      <div className="mt-8 overflow-hidden rounded-2xl border border-hb-sand/80 bg-white shadow-soft">
        <div className="hidden grid-cols-[1.2fr_1fr_1fr_140px] gap-4 border-b border-hb-sand bg-hb-fog/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-hb-leaf md:grid">
          <span>Contact</span>
          <span>Email</span>
          <span>Note</span>
          <span>Date</span>
        </div>
        <ul className="divide-y divide-hb-sand/70">
          {leads.length === 0 ? (
            <li className="px-5 py-12 text-center text-sm text-hb-leaf">
              No leads yet — share your public profile to start capturing.
            </li>
          ) : (
            leads.map((lead) => {
              const hue = avatarHue(lead.visitor_name);
              return (
                <li
                  key={lead.id}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1fr_1fr_140px] md:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: `hsl(${hue} 42% 42%)` }}
                    >
                      {initials(lead.visitor_name) || "+"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-hb-ink">
                        {lead.visitor_name}
                      </p>
                      <p className="truncate text-xs text-hb-leaf md:hidden">
                        {lead.visitor_email || lead.visitor_phone || "—"}
                      </p>
                    </div>
                  </div>
                  <p className="hidden truncate text-sm text-hb-forest md:block">
                    {lead.visitor_email || lead.visitor_phone || "—"}
                  </p>
                  <p className="truncate text-sm text-hb-leaf">
                    {lead.visitor_note || "—"}
                  </p>
                  <p className="text-xs text-hb-leaf">
                    {format(new Date(lead.created_at), "MMM d, yyyy")}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
