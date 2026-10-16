import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "action";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        tone === "neutral" && "bg-hb-mist text-hb-forest",
        tone === "success" && "bg-emerald-100 text-emerald-800",
        tone === "warn" && "bg-orange-100 text-orange-800",
        tone === "danger" && "bg-red-100 text-red-800",
        tone === "action" && "bg-hb-action/10 text-hb-action",
        className
      )}
    >
      {children}
    </span>
  );
}
