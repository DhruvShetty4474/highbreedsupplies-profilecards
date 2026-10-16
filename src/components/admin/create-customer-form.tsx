"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCustomerForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login_id: form.get("login_id"),
        password: form.get("password"),
        username: form.get("username"),
        full_name: form.get("full_name"),
        email: form.get("email") || undefined,
        phone: form.get("phone") || undefined,
        designation: form.get("designation") || undefined,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not create customer");
      return;
    }
    const body = await res.json();
    setSuccess(
      `Created ${body.customer.full_name} — login: ${body.customer.login_id}`
    );
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-2xl border border-hb-sand/80 bg-white p-5 shadow-soft md:grid-cols-2"
    >
      <Input name="login_id" label="Login ID" placeholder="e.g. ananya" required />
      <Input
        name="password"
        type="password"
        label="Temporary password"
        required
      />
      <Input
        name="username"
        label="Public username"
        placeholder="e.g. ananya_shah"
        hint="Becomes /username on the public profile"
        required
      />
      <Input name="full_name" label="Full name" required />
      <Input name="email" label="Email" type="email" />
      <Input name="phone" label="Phone" />
      <div className="md:col-span-2">
        <Input name="designation" label="Headline / designation" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create customer account"}
        </Button>
        {error ? (
          <p className="mt-2 text-sm text-hb-danger" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-2 text-sm text-hb-action">{success}</p>
        ) : null}
      </div>
    </form>
  );
}
