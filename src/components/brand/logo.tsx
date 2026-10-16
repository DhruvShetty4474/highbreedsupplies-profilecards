import { cn } from "@/lib/utils";

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
        "relative grid place-items-center overflow-hidden rounded-[22%] bg-hb-banner text-white shadow-soft",
        size === "sm" && "h-10 w-10",
        size === "md" && "h-16 w-16",
        size === "lg" && "h-28 w-28",
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
      <span
        className={cn(
          "relative font-display font-semibold tracking-tight",
          size === "sm" && "text-sm",
          size === "md" && "text-xl",
          size === "lg" && "text-4xl"
        )}
      >
        hb
      </span>
    </div>
  );
}

export function HighbreedWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <HighbreedMark size="sm" />
      <div>
        <p className="font-display text-lg leading-none tracking-tight text-hb-ink">
          HIGHBREED
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-hb-leaf">
          HighCard Platform
        </p>
      </div>
    </div>
  );
}
