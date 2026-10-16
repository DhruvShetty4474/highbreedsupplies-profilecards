import { listClientAccounts } from "@/lib/demo-store";
import { avatarHue, initials, isDemoMode } from "@/lib/utils";
import { ChevronRight, Share2 } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Share pages" };

export default function AdminSharePagesPage() {
  const customers = isDemoMode() ? listClientAccounts() : [];

  return (
    <div>
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
          Distribution
        </p>
        <h1 className="mt-1 font-display text-4xl text-hb-ink">
          Share the pages
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hb-leaf">
          Choose a customer page to open Share tools — QR code, public link,
          offline toggle, and Quick Share setup (visitor / client perspective).
        </p>
      </header>

      <ul className="overflow-hidden rounded-3xl border border-hb-sand/80 bg-white shadow-soft">
        {customers.map((c) => {
          const hue = avatarHue(c.profile.full_name);
          return (
            <li key={c.user_id} className="border-b border-hb-sand/70 last:border-none">
              <Link
                href={`/admin/share/${c.user_id}`}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-hb-fog/50"
              >
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: `hsl(${hue} 42% 42%)` }}
                >
                  {c.profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(c.profile.full_name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-hb-ink">
                    {c.profile.full_name}
                  </p>
                  <p className="truncate text-sm text-hb-leaf">
                    @{c.profile.username} · /{c.profile.username}
                  </p>
                </div>
                <span className="hidden items-center gap-1 text-xs font-semibold text-hb-action sm:inline-flex">
                  <Share2 className="h-3.5 w-3.5" />
                  Share page
                </span>
                <ChevronRight className="h-5 w-5 text-hb-leaf" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
