"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useState } from "react";

/** "I received the cash" → one-time code to read out to the customer. */
export function CashApproveButton({
  orderId,
  amount,
  customer,
}: {
  orderId: string;
  amount: string;
  customer: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState<{ code: string; expires: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/manager/orders/${orderId}/cash-code`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error || "Could not generate a code");
      return;
    }
    setCode({
      code: json.code,
      expires: new Date(json.expires_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => { setOpen(true); setConfirming(true); setCode(null); }}>
        Approve cash
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Approve cash payment">
        {code ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-hb-leaf">Tell {customer} this code:</p>
            <p className="select-all rounded-2xl bg-hb-mist py-5 font-display text-5xl tracking-[0.25em] text-hb-ink">
              {code.code}
            </p>
            <p className="text-xs text-hb-leaf">
              Valid once, until {code.expires}. Their card activates as soon as they enter it.
            </p>
            <Button className="w-full" variant="secondary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : confirming ? (
          <div className="space-y-4">
            <p className="text-sm text-hb-forest">
              Only continue once you have received <b>{amount}</b> in cash from <b>{customer}</b>.
              The code you get marks the order as paid.
            </p>
            {error ? <p className="text-sm text-hb-danger" role="alert">{error}</p> : null}
            <Button className="h-12 w-full" disabled={pending} onClick={generate}>
              {pending ? "Generating…" : `I received ${amount} — generate code`}
            </Button>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
