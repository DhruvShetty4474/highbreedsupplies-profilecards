"use client";

import { Sheet } from "@/components/ui/sheet";
import { Info } from "lucide-react";
import { useState } from "react";

const STEPS: { title: string; body: string }[] = [
  {
    title: "1. Create the cards first",
    body: "Go to Card inventory → Generate cards. Each card gets an ID (HB000123), a secret link (https://highfis.com/c/tok_…) and an activation code (e.g. K7P2QX). Only create batches once highfis.com is live — the link is fixed forever.",
  },
  {
    title: "2. Pick a card here",
    body: "Select it in the list on the left. You'll see its link and activation code. The badge shows … (not written yet), OK (verified) or FAIL (wrong data on the chip).",
  },
  {
    title: "3. Write the link onto the NFC chip",
    body: "Copy the link. On an NFC phone open NXP TagWriter or NFC Tools → Write → Add a record → URL/URI → paste → hold the blank card to the back of the phone. (USB writers: paste the same link.)",
  },
  {
    title: "4. Read it back",
    body: "With the same app choose Read, tap the card again, and copy the URL it shows.",
  },
  {
    title: "5. Verify",
    body: "Paste that URL into “NFC read-back payload” and press Verify. Match → OK (PROGRAMMED). Different → FAIL: write the card again and re-verify.",
  },
  {
    title: "6. Print & pack",
    body: "Print the QR (Card inventory → QR SVG/PNG) on the card. Print the activation code on a slip INSIDE the packaging — never on the card itself. Then give the batch to its manager.",
  },
];

/** ⓘ button + "How to program a card" guide for the NFC programming page. */
export function ProgrammingHelp() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How to use NFC programming"
        title="How to use"
        className="hb-focus inline-flex h-11 items-center gap-2 rounded-full border border-hb-sand bg-white px-4 text-sm font-semibold text-hb-action shadow-soft"
      >
        <Info className="h-5 w-5" />
        How to use
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="How to program a HighCard" className="max-w-lg">
        <div className="max-h-[70dvh] space-y-4 overflow-y-auto pr-1">
          {STEPS.map((s) => (
            <div key={s.title}>
              <p className="font-semibold text-hb-ink">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-hb-leaf">{s.body}</p>
            </div>
          ))}
          <p className="rounded-xl bg-hb-mist px-4 py-3 text-xs leading-relaxed text-hb-forest">
            Programming only writes the chip. The card stays unclaimed until a customer scans it,
            registers, enters the activation code and pays.
          </p>
        </div>
      </Sheet>
    </>
  );
}
