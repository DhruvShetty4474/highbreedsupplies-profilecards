"use client";

import Link from "next/link";
import { OtpStep, type OtpPurpose } from "@/components/auth/otp-step";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "password" | "code";

export function LoginForm({
  nextPath,
  notice,
}: {
  nextPath?: string;
  notice?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpFor, setOtpFor] = useState<{ email: string; purpose: OtpPurpose } | null>(null);

  function done() {
    // /go sends each role to its own home (or back to `next`).
    router.push(nextPath ? `/go?next=${encodeURIComponent(nextPath)}` : "/go");
    router.refresh();
  }

  async function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login_id: form.get("login_id"),
        password: form.get("password"),
      }),
    });
    setPending(false);
    const body = await res.json().catch(() => ({}));
    if (res.status === 403 && body.code === "EMAIL_NOT_VERIFIED" && body.email) {
      // Better Auth has just emailed a fresh verification code.
      setOtpFor({ email: body.email, purpose: "email-verification" });
      return;
    }
    if (!res.ok) {
      setError(body.error || "Invalid credentials");
      return;
    }
    done();
  }

  async function onSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email")).trim().toLowerCase();
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    setPending(false);
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    setOtpFor({ email, purpose: "sign-in" });
  }

  if (otpFor) {
    return (
      <OtpStep
        email={otpFor.email}
        purpose={otpFor.purpose}
        intro={
          otpFor.purpose === "email-verification"
            ? "Please verify your email first. We sent a 6-digit code to"
            : undefined
        }
        onVerified={done}
        onBack={() => setOtpFor(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-hb-mist p-1" role="tablist">
        {(
          [
            ["password", "Password"],
            ["code", "Email code"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "min-h-11 rounded-xl text-sm font-semibold transition",
              mode === m ? "bg-white text-hb-ink shadow-soft" : "text-hb-leaf"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "password" ? (
        <form className="space-y-4" onSubmit={onPassword}>
          <Input
            name="login_id"
            label="Email or username"
            placeholder="you@company.com"
            autoComplete="username"
            required
          />
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <div className="-mt-2 text-right">
            <Link href="/forgot-password" className="text-xs font-semibold text-hb-action">
              Forgot password?
            </Link>
          </div>
          {notice && !error ? (
            <p className="text-sm text-hb-action" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-hb-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="h-12 w-full" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onSendCode}>
          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
          <p className="text-xs text-hb-leaf">
            We&apos;ll email you a 6-digit code — no password needed.
          </p>
          {error ? (
            <p className="text-sm text-hb-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="h-12 w-full" type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send code"}
          </Button>
        </form>
      )}

      <p className="text-center text-xs leading-relaxed text-hb-leaf">
        Got a new HighCard? Scan its QR or tap it on your phone to register.{" "}
        <Link href="/register" className="font-semibold text-hb-action">
          Create an account
        </Link>
      </p>
    </div>
  );
}
