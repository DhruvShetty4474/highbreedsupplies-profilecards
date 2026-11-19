"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Promote a customer to manager, or back. */
export function RoleToggle({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const next = role === "manager" ? "client" : "manager";

  async function toggle() {
    const msg =
      next === "manager"
        ? "Make this user a manager? They get the manager dashboard and approve cash payments for their batches."
        : "Remove manager access? Their batches stay assigned until you change them.";
    if (!window.confirm(msg)) return;
    setPending(true);
    const res = await fetch(`/api/admin/customers/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error || "Could not change role");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="min-h-9 rounded-full border border-hb-sand bg-white px-4 py-2 text-xs font-semibold text-hb-action disabled:opacity-50"
    >
      {pending ? "Saving…" : next === "manager" ? "Make manager" : "Remove manager role"}
    </button>
  );
}
