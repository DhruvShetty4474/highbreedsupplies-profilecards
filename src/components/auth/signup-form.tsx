"use client";

import { OtpStep } from "@/components/auth/otp-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Register → 6-digit email code → (card flow) /activate/<token>.
 * Without a card token the user lands on their dashboard.
 */
export function SignupForm({ cardToken }: { cardToken?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);

  const after = cardToken ? `/activate/${encodeURIComponent(cardToken)}` : "/go";
  const loginHref = cardToken ? `/login?next=${encodeURIComponent(after)}` : "/login";

  function finish() {
    router.push(after);
    router.refresh();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("The two passwords don't match.");
      return;
    }
    setPending(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        full_name: form.get("full_name"),
      }),
    });
    setPending(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Could not create account");
      return;
    }
    if (body.verification_required) {
      setVerifyEmail(body.email);
      return;
    }
    finish();
  }

  if (verifyEmail) {
    return <OtpStep email={verifyEmail} purpose="email-verification" onVerified={finish} />;
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
        name="email"
        type="email"
        label="Email"
        placeholder="you@company.com"
        autoComplete="email"
        inputMode="email"
        required
      />
      <Input
        name="password"
        type="password"
        label="Create password"
        placeholder="e.g. Highfis@2026"
        autoComplete="new-password"
        minLength={8} pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,128}" title="8+ characters with a capital, a small letter, a number and a special character"
        required
      />
      <Input
        name="confirm"
        type="password"
        label="Confirm password"
        autoComplete="new-password"
        minLength={8} pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,128}" title="8+ characters with a capital, a small letter, a number and a special character"
        required
      />
      {error ? (
        <p className="text-sm text-hb-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account & get code"}
      </Button>
      <p className="text-center text-xs leading-relaxed text-hb-leaf">
        Already registered?{" "}
        <Link href={loginHref} className="font-semibold text-hb-action">
          Sign in
        </Link>
      </p>
    </form>
  );
}
