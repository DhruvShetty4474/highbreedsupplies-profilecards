"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Admin = { user_id: string; full_name: string; email: string };

export function AdminsManager({ admins }: { admins: Admin[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    setMsg(null);
    const f = new FormData(form);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: f.get("full_name"),
        email: f.get("email"),
        password: f.get("password") || undefined,
      }),
    });
    setPending(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg({ ok: false, text: json.error || "Could not add admin" });
      return;
    }
    form.reset();
    setMsg({ ok: true, text: json.promoted ? "Existing account is now an admin." : "Admin account created." });
    router.refresh();
  }

  async function remove(a: Admin) {
    if (!window.confirm(`Remove admin rights from ${a.email}? They are signed out immediately.`)) return;
    const res = await fetch(`/api/admin/admins/${a.user_id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      window.alert(json.error || "Could not remove admin");
    }
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <h2 className="font-display text-2xl text-hb-ink">Admins</h2>
        {admins.length === 0 ? (
          <p className="mt-4 text-sm text-hb-leaf">No admins yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hb-sand/70">
            {admins.map((a) => (
              <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-hb-ink">{a.full_name}</p>
                  <p className="truncate text-xs text-hb-leaf">{a.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(a)}
                  className="min-h-11 text-sm font-semibold text-hb-danger"
                >
                  Remove admin
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-hb-sand/80 bg-white p-6 shadow-soft">
        <h2 className="font-display text-2xl text-hb-ink">Add an admin</h2>
        <p className="mt-1 text-sm text-hb-leaf">
          If the email already has an account it&apos;s promoted (password not needed). Otherwise a new
          account is created with this password.
        </p>
        <form className="mt-5 space-y-3" onSubmit={add}>
          <Input name="full_name" label="Full name" required />
          <Input name="email" type="email" label="Email" required />
          <Input
            name="password"
            type="password"
            label="Password (new accounts only)"
            minLength={8} pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,128}" title="8+ characters with a capital, a small letter, a number and a special character"
            autoComplete="new-password"
          />
          {msg ? (
            <p className={msg.ok ? "text-sm text-hb-action" : "text-sm text-hb-danger"} role="status">
              {msg.text}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add admin"}
          </Button>
        </form>
      </section>
    </div>
  );
}
