"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

/** Vertically elongated phone chrome for public profiles + live previews. */
export function PhoneFrame({
  children,
  className,
  scale = "md",
}: {
  children: ReactNode;
  className?: string;
  scale?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "relative mx-auto overflow-hidden rounded-[2.4rem] border-[3px] border-[#1a2e28] bg-[#0b1613] p-[10px] shadow-[0_40px_100px_-32px_rgba(0,0,0,0.65)]",
        scale === "sm" && "w-[280px]",
        scale === "md" && "w-[340px] sm:w-[360px]",
        scale === "lg" && "w-[390px]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-[14px] z-30 flex justify-center">
        <div className="h-[22px] w-[108px] rounded-full bg-[#0b1613]" />
      </div>
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.9rem] bg-[#F6FAF8]",
          scale === "sm" ? "h-[560px]" : "h-[min(720px,78dvh)]"
        )}
      >
        <div className="h-full overflow-y-auto overscroll-contain scrollbar-thin">
          {children}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[18px] z-30 flex justify-center">
        <div className="h-[4px] w-[110px] rounded-full bg-white/25" />
      </div>
    </div>
  );
}

/** Full-bleed abstract canvas behind a centered phone card (widescreen public views). */
export function PublicCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-dvh w-full overflow-x-hidden",
        "bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(61,190,139,0.35),transparent_55%),radial-gradient(700px_420px_at_90%_10%,rgba(15,61,50,0.35),transparent_50%),linear-gradient(165deg,#071512_0%,#0F3D32_42%,#123F35_100%)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-start justify-center px-3 py-6 sm:px-6 sm:py-10 lg:items-center">
        {children}
      </div>
    </div>
  );
}
