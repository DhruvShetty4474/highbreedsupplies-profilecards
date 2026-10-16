"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function BatchGenerator() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: Number(form.get("quantity")),
        batch_label: String(form.get("batch_label")),
        notes: String(form.get("notes") || ""),
      }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Batch generation failed");
      return;
    }
    const body = await res.json();
    setResult(
      `Created ${body.cards.length} cards in ${body.batch_id}. First: ${body.cards[0]?.card_id}`
    );
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-soft md:grid-cols-2"
    >
      <Input
        name="batch_label"
        label="Batch label"
        defaultValue="Factory Run — Mumbai"
        required
      />
      <Input
        name="quantity"
        label="Quantity"
        type="number"
        min={1}
        max={500}
        defaultValue={5}
        required
      />
      <div className="md:col-span-2">
        <Input name="notes" label="Notes" placeholder="Optional print notes" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Generating…" : "Generate unprogrammed cards"}
        </Button>
        {error ? (
          <p className="mt-2 text-sm text-hb-danger" role="alert">
            {error}
          </p>
        ) : null}
        {result ? (
          <p className="mt-2 text-sm text-hb-action">{result}</p>
        ) : null}
      </div>
    </form>
  );
}
