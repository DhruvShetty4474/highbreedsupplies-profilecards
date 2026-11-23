"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Admin: "cash received" → card goes ACTIVE now, invoice issued. */
export function AdminActivateButton({ cardId, label = "Activate" }: { cardId: string; label?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function go() {
    if (
      !window.confirm(
        `Activate ${cardId} now?\n\nOnly do this if the payment was received. The card goes live and a paid invoice is created with you as the approver.`
      )
    )
      return;
    setPending(true);
    const res = await fetch(`/api/admin/cards/${cardId}/activate`, { method: "POST" });
    setPending(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(j.error || "Could not activate");
      return;
    }
    router.refresh();
  }
  return (
    <button type="button" onClick={go} disabled={pending} className="font-semibold text-hb-action">
      {pending ? "Activating…" : label}
    </button>
  );
}
