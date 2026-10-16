"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Card } from "@/lib/types";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClaimCardPanel({
  card,
  sessionUsername,
}: {
  card: Card;
  sessionUsername?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/cards/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_token: card.public_token }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push(`/login?next=/c/${card.public_token}`);
        return;
      }
      setError(body.error || "Could not claim card");
      return;
    }
    const body = await res.json();
    router.push(body.redirect || "/dashboard");
    router.refresh();
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-soft"
    >
      <div className="bg-hb-banner px-6 py-8 text-white">
        <Badge tone="action" className="bg-white/15 text-white">
          Unclaimed HighCard
        </Badge>
        <h1 className="mt-4 font-display text-3xl leading-tight">
          Activate your physical card
        </h1>
        <p className="mt-3 text-sm text-white/85">
          Link <span className="font-semibold">{card.card_id}</span> to your
          HIGHBREED profile in one tap. Your NFC and QR already point here.
        </p>
      </div>

      <div className="space-y-4 px-6 py-6">
        <div className="rounded-2xl bg-hb-mist/80 p-4 text-sm text-hb-forest">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-hb-action" />
            <p>
              After claiming, every tap opens your live profile with Save
              Contact, social blocks, and lead capture.
            </p>
          </div>
        </div>

        {sessionUsername ? (
          <>
            <p className="text-sm text-hb-leaf">
              Signed in as{" "}
              <span className="font-semibold text-hb-ink">
                @{sessionUsername}
              </span>
            </p>
            <Button className="w-full" disabled={pending} onClick={claim}>
              {pending ? "Linking…" : `Link to @${sessionUsername}`}
            </Button>
          </>
        ) : (
          <div className="grid gap-3">
            <Link href={`/login?next=/c/${card.public_token}`}>
              <Button className="w-full">Log in to claim</Button>
            </Link>
            <Link href={`/signup?card=${card.public_token}`}>
              <Button variant="secondary" className="w-full">
                Create account & claim
              </Button>
            </Link>
          </div>
        )}

        {error ? (
          <p className="text-sm text-hb-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </motion.section>
  );
}
