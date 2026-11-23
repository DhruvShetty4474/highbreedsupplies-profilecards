"use client";

import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Red "Delete user" with a type-the-username confirmation. */
export function DeleteUserButton({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/admin/customers/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm_username: typed }),
    });
    setPending(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not delete user");
      return;
    }
    router.push("/admin/customers");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hb-focus inline-flex h-10 items-center rounded-full border border-hb-danger/40 bg-white px-4 text-sm font-semibold text-hb-danger"
      >
        Delete user
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Delete @${username}?`} className="max-w-md">
        <div className="space-y-4 text-sm text-hb-forest">
          <p>This permanently removes:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>their account, profile, photos and all logins</li>
            <li>their saved contacts (leads)</li>
          </ul>
          <p>
            Their <strong>active card is blocked</strong> (you can unblock or re-issue it later). An unpaid
            reserved card is released for sale. <strong>Invoices are kept</strong> for tax records.
          </p>
          <p className="font-semibold text-hb-danger">This can&apos;t be undone.</p>
          <Input
            label={`Type ${username} to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
          {error ? (
            <p className="text-hb-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <button
              type="button"
              disabled={pending || typed.trim().toLowerCase() !== username.toLowerCase()}
              onClick={remove}
              className="inline-flex h-11 items-center rounded-2xl bg-hb-danger px-5 font-semibold text-white disabled:opacity-40"
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
