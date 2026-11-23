"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ManagerOption = { user_id: string; full_name: string; username: string };

export function BatchGenerator({ managers }: { managers: ManagerOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"single" | "batch">("single");
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
        quantity: mode === "single" ? 1 : Number(form.get("quantity")),
        batch_label:
          String(form.get("batch_label") || "").trim() ||
          `Single card — ${new Date().toLocaleDateString("en-IN")}`,
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
      body.cards.length === 1
        ? `Created ${body.cards[0]?.card_id} (activation code ${body.cards[0]?.activation_code ?? "—"}).`
        : `Created ${body.cards.length} cards in ${body.batch_id}. First: ${body.cards[0]?.card_id}`
    );
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-soft md:grid-cols-2"
    >
      <div className="md:col-span-2 inline-flex w-fit rounded-2xl border border-hb-sand bg-hb-mist/60 p-1 text-sm font-semibold" role="tablist">
        {(["single", "batch"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-xl px-4 py-2 ${mode === m ? "bg-white text-hb-ink shadow-soft" : "text-hb-leaf"}`}
          >
            {m === "single" ? "Single card" : "Batch"}
          </button>
        ))}
      </div>
      <Input
        name="batch_label"
        label={mode === "single" ? "Label (optional)" : "Batch label"}
        placeholder={mode === "single" ? "e.g. Rahul Sharma — walk-in" : "e.g. Factory Run — Mumbai"}
        required={mode === "batch"}
      />
      {mode === "batch" ? (
        <Input
          name="quantity"
          label="Quantity"
          type="number"
          min={2}
          max={500}
          defaultValue={5}
          required
        />
      ) : (
        <div />
      )}
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
          {pending ? "Generating…" : mode === "single" ? "Create 1 card" : "Generate cards"}
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
