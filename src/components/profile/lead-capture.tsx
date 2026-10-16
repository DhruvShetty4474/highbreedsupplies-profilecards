"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FormEvent, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  cardholderUserId: string;
  cardholderName: string;
};

export function LeadCapture({
  open,
  onClose,
  cardholderUserId,
  cardholderName,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      cardholder_user_id: cardholderUserId,
      visitor_name: String(form.get("visitor_name") || ""),
      visitor_email: String(form.get("visitor_email") || ""),
      visitor_phone: String(form.get("visitor_phone") || ""),
      visitor_note: String(form.get("visitor_note") || ""),
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not send your info");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        setDone(false);
        setError(null);
        onClose();
      }}
      title="Share Your Info"
    >
      {done ? (
        <div className="space-y-4 py-4 text-center">
          <p className="font-display text-2xl text-hb-ink">You&apos;re in.</p>
          <p className="text-sm text-hb-leaf">
            {cardholderName} will receive your details shortly.
          </p>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={onSubmit}>
          <p className="text-sm text-hb-leaf">
            Leave your details so {cardholderName} can follow up.
          </p>
          <Input
            name="visitor_name"
            label="Name"
            placeholder="Your full name"
            required
          />
          <Input
            name="visitor_email"
            label="Email"
            type="email"
            placeholder="you@company.com"
          />
          <Input
            name="visitor_phone"
            label="Phone"
            type="tel"
            placeholder="+91…"
          />
          <Textarea
            name="visitor_note"
            label="Note"
            placeholder="How did you meet?"
          />
          {error ? (
            <p className="text-sm text-hb-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send to Highbreed"}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
