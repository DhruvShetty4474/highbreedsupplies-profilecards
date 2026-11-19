"use client";

import type { CardStatus } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CardRowActions({
  cardId,
  status,
}: {
  cardId: string;
  status: CardStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const blocked = status === "BLOCKED";

  async function release() {
    if (!window.confirm(`Release ${cardId}? The unpaid reservation is cancelled and anyone with the card can register it again.`)) return;
    await send("release");
  }

  async function toggle() {
    const action = blocked ? "unblock" : "block";
    if (
      action === "block" &&
      !window.confirm(`Block ${cardId}? Taps/scans will show a "card disabled" page.`)
    ) {
      return;
    }
    await send(action);
  }

  async function send(action: "block" | "unblock" | "release") {
    setPending(true);
    const res = await fetch(`/api/admin/cards/${cardId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setPending(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(body.error || "Could not update card");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
      <a href={`/api/admin/cards/${cardId}/qr?format=svg`} className="text-hb-action">
        QR SVG
      </a>
      <a href={`/api/admin/cards/${cardId}/qr?format=png`} className="text-hb-action">
        PNG
      </a>
      <a href={`/api/admin/cards/${cardId}/programming-data`} className="text-hb-leaf">
        JSON
      </a>
      {status === "RESERVED" ? (
        <button type="button" onClick={release} disabled={pending} className="text-hb-goldDeep">
          Release
        </button>
      ) : null}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={blocked ? "text-hb-action" : "text-hb-danger"}
      >
        {pending ? "…" : blocked ? "Unblock" : "Block"}
      </button>
    </div>
  );
}
