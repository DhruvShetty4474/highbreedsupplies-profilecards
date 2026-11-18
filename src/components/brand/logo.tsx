import { cn } from "@/lib/utils";

/** The ribbon "hb" mark on a white tile (reads well on light and dark). */
export function HighbreedMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[22%] bg-white shadow-soft",
        size === "sm" && "h-10 w-10 p-1",
        size === "md" && "h-16 w-16 p-2",
        size === "lg" && "h-28 w-28 p-3",
        className
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/hb-mark.png" alt="" className="h-full w-full object-contain" />
    </div>
  );
}

export function HighbreedWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <HighbreedMark size="sm" />
      <div>
        <p className="font-sans text-lg font-extrabold leading-none tracking-[0.04em] text-hb-forest">
          HIGHBREED
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.42em] text-[#4f86c6]">
          Supplies
        </p>
      </div>
    </div>
  );
}

/** Full stacked logo (mark + HIGHBREED SUPPLIES), transparent background. */
export function HighbreedLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/highbreed-logo.png"
      alt="Highbreed Supplies"
      className={cn("h-auto w-40", className)}
    />
  );
}
