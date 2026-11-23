"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { user_id: string; full_name: string; username: string };

/** Admin-only: narrow manager pages to one manager (?m=<id>). */
export function ManagerFilter({ managers, value }: { managers: Option[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="inline-flex items-center gap-2 text-sm text-hb-forest">
      <span className="font-semibold">Manager</span>
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          if (e.target.value) p.set("m", e.target.value);
          else p.delete("m");
          router.push(p.size ? `${pathname}?${p}` : pathname);
        }}
        className="h-10 rounded-xl border border-hb-sand bg-white px-3 text-sm text-hb-ink hb-focus"
      >
        <option value="">All managers</option>
        <option value="none">No manager</option>
        {managers.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {m.full_name || m.username}
          </option>
        ))}
      </select>
    </label>
  );
}
