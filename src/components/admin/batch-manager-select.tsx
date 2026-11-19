"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BatchManagerSelect({
  batchId,
  managerId,
  managers,
}: {
  batchId: string;
  managerId: string | null;
  managers: { user_id: string; full_name: string; username: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function change(value: string) {
    setPending(true);
    const res = await fetch(`/api/admin/batches/${batchId}/manager`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manager_id: value || null }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error || "Could not change manager");
    }
    router.refresh();
  }

  return (
    <select
      aria-label="Batch manager"
      defaultValue={managerId ?? ""}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      className="h-10 max-w-[220px] rounded-xl border border-hb-sand bg-white px-3 text-sm text-hb-ink"
    >
      <option value="">No manager</option>
      {managers.map((m) => (
        <option key={m.user_id} value={m.user_id}>
          {m.full_name || m.username}
        </option>
      ))}
    </select>
  );
}
