"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessSettings } from "@/lib/settings";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function BusinessSettingsForm({ settings }: { settings: BusinessSettings }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);
    const json = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: json.error || "Could not save" });
    if (res.ok) router.refresh();
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <Input
        name="card_price_inr"
        type="number"
        min={0}
        step="0.01"
        label="Card price (₹, GST included)"
        hint="0 = payments off. Applies to new orders only."
        defaultValue={settings.card_price_inr}
        required
      />
      <Input
        name="gst_rate_percent"
        type="number"
        min={0}
        max={28}
        step="0.01"
        label="GST rate (%)"
        defaultValue={settings.gst_rate_percent}
        required
      />
      <Input name="seller_name" label="Business name (on invoice)" defaultValue={settings.seller_name} required />
      <Input
        name="seller_gstin"
        label="Your GSTIN"
        placeholder="27ABCDE1234F1Z5"
        defaultValue={settings.seller_gstin}
      />
      <Input name="seller_phone" label="Phone" defaultValue={settings.seller_phone} />
      <Input name="seller_email" label="Email" type="email" defaultValue={settings.seller_email} />
      <Input name="hsn_code" label="HSN code" hint="852352 = smart cards" defaultValue={settings.hsn_code} />
      <div className="sm:col-span-2">
        <Textarea name="seller_address" label="Business address" rows={3} defaultValue={settings.seller_address} />
      </div>
      <div className="sm:col-span-2">
        <Textarea
          name="terms_text"
          label="Terms & conditions (shown on the payment page)"
          rows={4}
          defaultValue={settings.terms_text}
          required
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save business settings"}
        </Button>
        {msg ? (
          <p className={msg.ok ? "text-sm text-hb-action" : "text-sm text-hb-danger"} role="status">
            {msg.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
