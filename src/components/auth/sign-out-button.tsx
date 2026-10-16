"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function SignOutButton({
  variant = "default",
}: {
  variant?: "default" | "onDark";
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={cn(
        "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
        variant === "onDark"
          ? "border border-white/25 bg-white/10 text-white hover:bg-white/15"
          : "border border-hb-ink/20 bg-white text-hb-ink"
      )}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
