"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Card } from "@/lib/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function ProgrammingWorkbench({ cards }: { cards: Card[] }) {
  const router = useRouter();
  const [cardId, setCardId] = useState(cards[0]?.card_id ?? "");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [readback, setReadback] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = useMemo(
    () => cards.find((c) => c.card_id === cardId),
    [cards, cardId]
  );

  async function loadProgrammingData() {
    setPending(true);
    setMessage(null);
    const res = await fetch(`/api/admin/cards/${cardId}/programming-data`);
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error || "Failed to load programming data");
      return;
    }
    const body = await res.json();
    setPayload(body);
    setReadback(String(body.nfc_url || ""));
  }

  async function verify() {
    setPending(true);
    setMessage(null);
    const res = await fetch(`/api/admin/cards/${cardId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nfc_payload_readback: readback,
        device_meta: { tool: "highbreed-admin-ui", ts: Date.now() },
      }),
    });
    setPending(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(body.error || "Verification failed");
      return;
    }
    setMessage(
      body.success
        ? "Read-back verified. Card flagged UNCLAIMED + programmed."
        : "Read-back mismatch — card not marked programmed."
    );
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hb-leaf">
          Select card
        </p>
        <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
          {cards.map((card) => (
            <button
              key={card.card_id}
              type="button"
              onClick={() => setCardId(card.card_id)}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm ${
                card.card_id === cardId
                  ? "bg-hb-action text-white"
                  : "bg-hb-mist text-hb-forest"
              }`}
            >
              <span>{card.card_id}</span>
              <span className="text-[10px] opacity-80">
                {card.programming_verified ? "OK" : "…"}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-4 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-soft">
        <div>
          <p className="text-sm text-hb-leaf">Selected</p>
          <p className="font-display text-3xl text-hb-ink">
            {selected?.card_id ?? "—"}
          </p>
        </div>

        <Button onClick={loadProgrammingData} disabled={!cardId || pending}>
          Fetch programming JSON
        </Button>

        {payload ? (
          <pre className="overflow-x-auto rounded-2xl bg-hb-ink p-4 text-xs text-hb-mint">
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : null}

        <Input
          label="NFC read-back payload"
          value={readback}
          onChange={(e) => setReadback(e.target.value)}
          hint="Paste the URI returned by the writer after programming"
        />

        <Button
          variant="secondary"
          onClick={verify}
          disabled={!cardId || !readback || pending}
        >
          Verify read-back & sync state
        </Button>

        {message ? (
          <p className="text-sm text-hb-action" role="status">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
