"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function DeviceClaimForm({ suggestions }: { suggestions: string[] }) {
  const router = useRouter();
  const [token, setToken] = useState(suggestions[0] ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/cards/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_token: token }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Claim failed");
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 space-y-3 rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-soft"
    >
      <Input
        label="Public token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="tok_…"
        required
      />
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setToken(s)}
              className="rounded-full bg-hb-mist px-3 py-1 text-xs text-hb-forest"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-hb-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Claiming…" : "Link HighCard"}
      </Button>
    </form>
  );
}
