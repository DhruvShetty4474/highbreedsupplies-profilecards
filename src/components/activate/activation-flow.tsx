"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { checkoutSchema } from "@/lib/billing";
import { Banknote, CreditCard, LocateFixed, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export type ActivationProps = {
  token: string;
  cardId: string;
  step: "code" | "pay";
  managerName: string | null;
  price: { total: string; taxable: string; tax: string; gstPercent: number } | null;
  razorpayEnabled: boolean;
  termsText: string;
  prefill: { name: string; email: string; phone: string };
  /** An existing PENDING order waiting for the manager's cash code. */
  pendingCashOrderId: string | null;
};

type RazorpayOptions = Record<string, unknown> & {
  handler: (r: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
};
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => { open(): void; on(e: string, cb: () => void): void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export function ActivationFlow(props: ActivationProps) {
  return props.step === "code" ? <CodeStep {...props} /> : <PayStep {...props} />;
}

function StepHeader({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
        Step {n} of 2
      </p>
      <h1 className="mt-1 font-display text-3xl text-hb-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-hb-leaf">{text}</p>
    </div>
  );
}

function CodeStep({ token }: ActivationProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const code = String(new FormData(e.currentTarget).get("code"));
    const { ok, json } = await post(`/api/activate/${token}/code`, { code });
    setPending(false);
    if (!ok) {
      setError(json.error || "Could not confirm the card");
      return;
    }
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <StepHeader
        n={1}
        title="Enter your card code"
        text="Find the code printed on your HighCard (it starts with HB, e.g. HB000123). This proves the card is in your hands."
      />
      <Input
        name="code"
        label="Card code"
        placeholder="HB000123"
        autoCapitalize="characters"
        autoComplete="off"
        className="text-center text-xl uppercase tracking-[0.3em]"
        required
      />
      {error ? (
        <p className="text-sm text-hb-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="h-12 w-full" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}

function PayStep(props: ActivationProps) {
  const { token, managerName, price, razorpayEnabled, termsText, prefill } = props;
  const router = useRouter();
  const [pending, setPending] = useState<"UPI" | "CASH" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [cashOrder, setCashOrder] = useState<string | null>(props.pendingCashOrderId);
  const [cashOpen, setCashOpen] = useState(Boolean(props.pendingCashOrderId));

  async function useLocation() {
    if (!navigator.geolocation) {
      setError("Location isn't available on this device. Please type your address.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          // Free, key-less reverse geocoding meant for browser use.
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`
          );
          const g = await res.json();
          const parts = [g.locality, g.city, g.principalSubdivision, g.postcode, g.countryName]
            .filter((p: unknown, i: number, a: unknown[]) => p && a.indexOf(p) === i);
          setAddress((prev) => (prev ? `${prev}, ` : "") + parts.join(", "));
        } catch {
          setError("Couldn't look up your address. Please type it.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError("Location permission was denied. Please type your address.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function submit(method: "UPI" | "CASH", form: HTMLFormElement) {
    setError(null);
    const f = new FormData(form);
    const input = {
      name: String(f.get("name") ?? ""),
      phone: String(f.get("phone") ?? ""),
      email: String(f.get("email") ?? ""),
      gstin: String(f.get("gstin") ?? ""),
      address: String(f.get("address") ?? ""),
      terms: f.get("terms") === "on",
      method,
    };
    const check = checkoutSchema.safeParse(input);
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setPending(method);
    const { ok, json } = await post(`/api/activate/${token}/checkout`, input);
    if (!ok) {
      setPending(null);
      setError(json.error || "Could not start payment");
      return;
    }
    if (method === "CASH") {
      setPending(null);
      setCashOrder(json.order_id);
      setCashOpen(true);
      return;
    }
    if (!(await loadRazorpay()) || !window.Razorpay) {
      setPending(null);
      setError("Couldn't load the payment window. Check your connection and try again.");
      return;
    }
    const r = json.razorpay;
    const rzp = new window.Razorpay({
      key: r.key,
      order_id: r.order_id,
      amount: r.amount,
      currency: r.currency,
      name: r.name,
      description: r.description,
      prefill: r.prefill,
      theme: { color: "#0B5C45" },
      // Show only UPI (apps, QR, UPI ID).
      config: {
        display: {
          blocks: { upi: { name: "Pay using UPI", instruments: [{ method: "upi" }] } },
          sequence: ["block.upi"],
          preferences: { show_default_blocks: false },
        },
      },
      modal: { ondismiss: () => setPending(null) },
      handler: async (resp) => {
        const v = await post(`/api/orders/${json.order_id}/razorpay-verify`, resp);
        setPending(null);
        if (!v.ok) {
          setError(
            "We couldn't confirm the payment yet. If money was deducted it will be confirmed automatically within a few minutes."
          );
          return;
        }
        router.refresh();
      },
    });
    rzp.on("payment.failed", () => {
      setPending(null);
      setError("Payment failed or was cancelled. You can try again.");
    });
    rzp.open();
  }

  if (!price) {
    return (
      <div className="space-y-3">
        <StepHeader n={2} title="Payment" text="Payments aren't set up yet." />
        <p className="rounded-xl bg-hb-mist px-4 py-3 text-sm text-hb-forest">
          Your card is reserved for you. Please contact your manager
          {managerName ? ` (${managerName})` : ""} to complete activation.
        </p>
      </div>
    );
  }

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(razorpayEnabled ? "UPI" : "CASH", e.currentTarget);
        }}
      >
        <StepHeader
          n={2}
          title="Payment"
          text="Fill in your billing details. Your invoice is generated as soon as the payment is confirmed."
        />

        <div className="rounded-2xl border border-hb-sand/80 bg-hb-fog/60 p-4 text-sm">
          {managerName ? (
            <p className="mb-3 text-hb-leaf">
              Your manager: <span className="font-semibold text-hb-ink">{managerName}</span>
            </p>
          ) : null}
          <div className="flex justify-between text-hb-leaf">
            <span>HighCard + digital profile</span>
            <span>{price.taxable}</span>
          </div>
          <div className="mt-1 flex justify-between text-hb-leaf">
            <span>GST ({price.gstPercent}%)</span>
            <span>{price.tax}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-hb-sand pt-2 text-base font-semibold text-hb-ink">
            <span>Total</span>
            <span>{price.total}</span>
          </div>
        </div>

        <Input name="name" label="Full name" defaultValue={prefill.name} autoComplete="name" required />
        <Input
          name="phone"
          type="tel"
          label="Mobile number"
          inputMode="tel"
          autoComplete="tel"
          placeholder="98765 43210"
          defaultValue={prefill.phone}
          required
        />
        <Input
          name="email"
          type="email"
          label="Email"
          inputMode="email"
          autoComplete="email"
          defaultValue={prefill.email}
          required
        />
        <Input
          name="gstin"
          label="GSTIN (optional)"
          placeholder="For a business invoice, e.g. 27ABCDE1234F1Z5"
          autoCapitalize="characters"
          autoComplete="off"
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-hb-forest">Address</span>
            <button
              type="button"
              onClick={useLocation}
              disabled={locating}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-hb-action disabled:opacity-60"
            >
              <LocateFixed className="h-4 w-4" />
              {locating ? "Finding you…" : "Use my location"}
            </button>
          </div>
          <Textarea
            name="address"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="House / office, street, area, city, PIN code"
            autoComplete="street-address"
            required
          />
        </div>

        <label className="flex min-h-11 items-start gap-3 rounded-2xl bg-hb-mist/70 p-3 text-sm text-hb-forest">
          <input type="checkbox" name="terms" className="mt-0.5 h-5 w-5 shrink-0 accent-hb-action" required />
          <span>
            I agree to the terms &amp; conditions: {termsText}
          </span>
        </label>

        {error ? (
          <p className="text-sm text-hb-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!razorpayEnabled || pending !== null}
            onClick={(e) => void submit("UPI", e.currentTarget.form!)}
          >
            <CreditCard className="h-5 w-5" />
            {pending === "UPI" ? "Opening…" : "Pay with UPI"}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="w-full"
            disabled={pending !== null}
            onClick={(e) => void submit("CASH", e.currentTarget.form!)}
          >
            <Banknote className="h-5 w-5" />
            {pending === "CASH" ? "Saving…" : "Pay with Cash"}
          </Button>
        </div>
        {!razorpayEnabled ? (
          <p className="text-xs text-hb-leaf">UPI payments are coming soon. Cash is available now.</p>
        ) : null}
        <p className="flex items-center gap-2 text-xs text-hb-leaf">
          <ShieldCheck className="h-4 w-4 text-hb-action" />
          UPI payments are processed securely by Razorpay.
        </p>
      </form>

      {cashOrder ? (
        <CashCodeSheet
          open={cashOpen}
          onClose={() => setCashOpen(false)}
          orderId={cashOrder}
          total={price.total}
          managerName={managerName}
        />
      ) : null}
      {cashOrder && !cashOpen ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => setCashOpen(true)}>
          I have the cash code from my manager
        </Button>
      ) : null}
    </>
  );
}

function CashCodeSheet({
  open,
  onClose,
  orderId,
  total,
  managerName,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  total: string;
  managerName: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const code = String(new FormData(e.currentTarget).get("code"));
    const { ok, json } = await post(`/api/orders/${orderId}/cash`, { code });
    setPending(false);
    if (!ok) {
      setError(json.error || "Could not confirm the code");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Pay with cash">
      <form className="space-y-4" onSubmit={onSubmit}>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-hb-forest">
          <li>
            Give <span className="font-semibold">{total}</span> in cash to your manager
            {managerName ? ` (${managerName})` : ""}.
          </li>
          <li>They approve it on their dashboard and tell you a 6-digit code.</li>
          <li>Enter the code below — your card goes live immediately.</li>
        </ol>
        <Input
          name="code"
          label="Code from your manager"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123456"
          className="text-center text-2xl tracking-[0.5em]"
          required
        />
        {error ? (
          <p className="text-sm text-hb-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="h-12 w-full" type="submit" disabled={pending}>
          {pending ? "Confirming…" : "Confirm payment"}
        </Button>
      </form>
    </Sheet>
  );
}
