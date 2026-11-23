"use client";

import { PublicProfileView } from "@/components/profile/public-profile";
import type { Profile } from "@/lib/types";
import { Eye, EyeOff, Smartphone } from "lucide-react";

/** A realistic phone frame around the live profile preview. */
export function PhoneFrame({ profile }: { profile: Profile }) {
  return (
    <div className="relative mx-auto w-[300px] rounded-[46px] bg-[#0d1714] p-[10px] shadow-[0_30px_60px_-20px_rgba(6,46,36,0.55),inset_0_0_0_2px_rgba(255,255,255,0.08)]">
      {/* side buttons */}
      <span className="absolute -left-[3px] top-[110px] h-12 w-[3px] rounded-l bg-[#0d1714]" />
      <span className="absolute -left-[3px] top-[170px] h-12 w-[3px] rounded-l bg-[#0d1714]" />
      <span className="absolute -right-[3px] top-[140px] h-16 w-[3px] rounded-r bg-[#0d1714]" />
      <div className="relative h-[600px] overflow-hidden rounded-[36px] bg-white">
        {/* dynamic island */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-[#0d1714]" />
        <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <PublicProfileView profile={profile} preview compact />
        </div>
        {/* home indicator */}
        <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-black/30" />
      </div>
    </div>
  );
}

export function PreviewToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={open}
      className="hb-focus inline-flex h-10 items-center gap-1.5 rounded-xl border border-hb-sand bg-white px-3 text-xs font-semibold text-hb-forest"
    >
      {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {open ? "Hide preview" : "Show preview"}
    </button>
  );
}

/** Right-hand (desktop) or below-form (mobile) preview panel. */
export function PreviewPanel({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  return (
    <aside className="w-full shrink-0 xl:sticky xl:top-6 xl:w-[360px] xl:self-start">
      <div className="rounded-3xl border border-hb-sand/80 bg-[radial-gradient(420px_260px_at_50%_0%,rgba(240,201,74,0.18),transparent_60%),#F3F7F4] px-4 pb-6 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-hb-leaf">
            <Smartphone className="h-3.5 w-3.5" /> Live preview
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-hb-action"
          >
            Hide
          </button>
        </div>
        <PhoneFrame profile={profile} />
        <p className="mt-4 text-center text-[11px] text-hb-leaf">
          What visitors see when they tap the card.
        </p>
      </div>
    </aside>
  );
}
