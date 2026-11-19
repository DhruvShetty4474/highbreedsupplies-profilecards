"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { FormEvent, useEffect, useState } from "react";

export type OtpPurpose = "email-verification" | "sign-in";

const RESEND_SECONDS = 30;

/**
 * "We emailed you a 6-digit code" step. Verifying signs the user in (the
 * session cookie is set by Better Auth), then `onVerified` runs.
 */
export function OtpStep({
  email,
  purpose,
  onVerified,
  onBack,
  intro,
}: {
  email: string;
  purpose: OtpPurpose;
  onVerified: () => void;
  onBack?: () => void;
  intro?: string;
}) {
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function verify(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const code = otp.replace(/\D/g, "");
    const { error: err } =
      purpose === "sign-in"
        ? await authClient.signIn.emailOtp({ email, otp: code })
        : await authClient.emailOtp.verifyEmail({ email, otp: code });
    setPending(false);
    if (err) {
      setError(
        err.status === 429
          ? authErrorMessage(err)
          : "That code is wrong or has expired. Check the latest email or send a new code."
      );
      return;
    }
    onVerified();
  }

  async function resend() {
    setError(null);
    setNotice(null);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: purpose,
    });
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    setCooldown(RESEND_SECONDS);
    setNotice("A new code is on its way.");
  }

  return (
    <form className="space-y-4" onSubmit={verify}>
      <p className="rounded-xl bg-hb-mist px-4 py-3 text-sm text-hb-forest">
        {intro ?? "We emailed a 6-digit code to"}{" "}
        <span className="font-semibold break-all">{email}</span>. It expires in
        10 minutes.
      </p>
      <Input
        name="otp"
        label="6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        placeholder="123456"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        className="text-center text-2xl tracking-[0.5em]"
        autoFocus
        required
      />
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
        {pending ? "Checking…" : "Verify code"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        {onBack ? (
          <button type="button" onClick={onBack} className="min-h-11 font-semibold text-hb-leaf">
            ← Change email
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="min-h-11 font-semibold text-hb-action disabled:text-hb-leaf/60"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
