"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ nextPath }: { nextPath?: string }) {
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
        label="Login ID"
        placeholder="Your login ID"
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
      {error ? (
        <p className="text-sm text-hb-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs leading-relaxed text-hb-leaf">
        Role is assigned automatically from your account. Customer accounts are
        created by an administrator.
      </p>
    </form>
  );
}
