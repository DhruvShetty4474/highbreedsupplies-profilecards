"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("password") || "");
    if (newPassword !== String(form.get("confirm") || "")) {
      setError("Passwords don't match");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) {
      setError(
        error.status === 400
          ? "This reset link is invalid or has expired. Request a new one."
          : authErrorMessage(error)
      );
      return;
    }
    router.push("/login?reset=1");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Input
        name="password"
        type="password"
        label="New password"
        placeholder="At least 8 characters"
        minLength={8}
        maxLength={128}
        autoComplete="new-password"
        required
      />
      <Input
        name="confirm"
        type="password"
        label="Confirm new password"
        minLength={8}
        maxLength={128}
        autoComplete="new-password"
        required
      />
      {error ? (
        <p className="text-sm text-hb-danger" role="alert">
          {error}{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            Request a new link
          </Link>
        </p>
      ) : null}
      <Button className="h-12 w-full" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
