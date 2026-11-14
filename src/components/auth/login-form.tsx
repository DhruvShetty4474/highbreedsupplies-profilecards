"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({
  nextPath,
  notice,
}: {
  nextPath?: string;
  notice?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
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
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Invalid credentials");
      return;
    }
    const body = await res.json();
    router.push(nextPath || (body.role === "admin" ? "/admin" : "/dashboard"));
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Input
        name="login_id"
        label="Email or Login ID"
        placeholder="you@company.com or login ID"
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
      <p className="text-center text-xs leading-relaxed text-hb-leaf">
        Role is assigned automatically from your account.{" "}
        <Link href="/register" className="font-semibold text-hb-action">
          Create a customer account
        </Link>
      </p>
    </form>
  );
}
