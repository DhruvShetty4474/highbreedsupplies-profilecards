"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm({ cardToken }: { cardToken?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    const body = (await res.json()) as {
      card_claimed?: boolean;
      card_error?: string;
      verification_required?: boolean;
    };
    if (body.verification_required) {
      setDone(
        (body.card_claimed ? "Your HighCard is activated. " : "") +
          "Check your inbox and click the verification link to sign in."
      );
      return;
    }
    if (body.card_error) {
      setDone(`Account created. ${body.card_error}`);
      window.setTimeout(() => router.push("/dashboard"), 2500);
      return;
    }
    router.push(body.card_claimed ? `/c/${cardToken}` : "/dashboard");
    router.refresh();
  }

  if (done) {
    return (
      <p className="rounded-xl bg-hb-mist px-4 py-4 text-sm text-hb-forest" role="status">
        {done}
      </p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Input
        name="full_name"
        label="Full name"
        placeholder="Your name"
        autoComplete="name"
        required
      />
      <Input
        name="username"
        label="Username"
        placeholder="e.g. ananya"
        hint="Letters, numbers, underscore — becomes your public URL"
        autoComplete="username"
        required
      />
      <Input
        name="email"
        type="email"
        label="Email"
        placeholder="you@company.com"
        autoComplete="email"
        required
      />
      <Input
        name="password"
        type="password"
        label="Password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        minLength={8}
        required
      />
      {error ? (
        <p className="text-sm text-hb-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
      <p className="text-center text-xs leading-relaxed text-hb-leaf">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-hb-action">
          Sign in
        </Link>
      </p>
    </form>
  );
}
