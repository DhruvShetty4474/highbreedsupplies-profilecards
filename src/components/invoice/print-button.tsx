"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-hb-forest px-5 font-semibold text-white print:hidden"
    >
      <Printer className="h-4 w-4" /> Print / Save as PDF
    </button>
  );
}
