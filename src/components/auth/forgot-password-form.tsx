"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    // Same message whether or not the account exists (no enumeration).
    if (error && error.status === 429) {
      setError(authErrorMessage(error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-sm text-hb-leaf">
        <p role="status">
          If an account exists for that email, a reset link is on its way. The
          link is valid for 1 hour.
        </p>
        <Link href="/login" className="font-semibold text-hb-action">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Input name="email" type="email" label="Email" autoComplete="email" required />
      {error ? (
        <p className="text-sm text-hb-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-xs text-hb-leaf">
        <Link href="/login" className="font-semibold text-hb-action">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
