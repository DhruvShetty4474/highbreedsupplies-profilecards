"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isDemoMode } from "@/lib/utils";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm({ cardToken }: { cardToken?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isDemoMode()) {
      setError("Demo mode: use Client login, then claim the card.");
      return;
    }
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        full_name: form.get("full_name"),
        username: form.get("username"),
        card_token: cardToken,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not create account");
      return;
    }
    router.push(cardToken ? `/c/${cardToken}` : "/dashboard");
    router.refresh();
  }

  if (isDemoMode()) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-hb-leaf">
          Jump into the client portal to claim an unprogrammed HighCard.
        </p>
        <Link href="/login">
          <Button className="w-full">Open demo login</Button>
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Input name="full_name" label="Full name" required />
      <Input
        name="username"
        label="Username"
        hint="Letters, numbers, underscore — becomes your public URL"
        required
      />
      <Input name="email" type="email" label="Email" required />
      <Input name="password" type="password" label="Password" required />
      {error ? (
        <p className="text-sm text-hb-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
