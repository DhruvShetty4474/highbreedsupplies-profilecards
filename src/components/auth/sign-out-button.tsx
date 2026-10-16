"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="rounded-xl border border-hb-ink/20 px-3 py-1.5 text-xs font-semibold text-hb-ink"
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
