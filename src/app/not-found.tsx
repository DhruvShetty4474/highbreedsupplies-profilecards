import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-hb-mesh px-5">
      <div className="max-w-sm rounded-[32px] border border-white/70 bg-white/90 p-8 text-center shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hb-leaf">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl text-hb-ink">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-hb-leaf">
          That profile or route doesn&apos;t exist in HIGHBREED.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Back home</Button>
        </Link>
      </div>
    </main>
  );
}
