"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ManagerOption = { user_id: string; full_name: string; username: string };

export function BatchGenerator({ managers }: { managers: ManagerOption[] }) {
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
        manager_id: String(form.get("manager_id") || "") || null,
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
      <label className="block space-y-1.5 md:col-span-2">
        <span className="text-sm font-medium text-hb-forest">Manager</span>
        <select
          name="manager_id"
          defaultValue=""
          className="h-12 w-full rounded-2xl border border-hb-sand bg-white/90 px-4 text-base text-hb-ink hb-focus"
        >
          <option value="">No manager (customers aren&apos;t referred)</option>
          {managers.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name || m.username} (@{m.username})
            </option>
          ))}
        </select>
        <span className="text-xs text-hb-leaf/70">
          Customers who register these cards are referred to this manager, who approves their cash payments.
          {managers.length === 0 ? " Make someone a manager under Customers first." : ""}
        </span>
      </label>
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
