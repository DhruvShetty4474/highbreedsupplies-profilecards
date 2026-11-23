import Link from "next/link";
import type { ReactNode } from "react";
import { getDb } from "@/db";
import { getSettings } from "@/lib/settings";

export type Business = { name: string; email: string; phone: string; address: string; gstin: string };

export async function getBusiness(): Promise<Business> {
  const s = await getSettings(getDb()).catch(() => null);
  return {
    name: s?.seller_name || "HIGHBREED SUPPLIES",
    email: s?.seller_email || "highbreedsuppliesotp56@gmail.com",
    phone: s?.seller_phone || "",
    address: s?.seller_address || "",
    gstin: s?.seller_gstin || "",
  };
}

/** Shared shell for the public policy pages (privacy, terms, refund). */
export function LegalPage({
  title,
  updated,
  business,
  children,
}: {
  title: string;
  updated: string;
  business: Business;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-hb-mesh px-4 py-10">
      <article className="mx-auto max-w-2xl rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-soft sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hb-leaf">{business.name}</p>
        <h1 className="mt-2 font-display text-4xl text-hb-ink">{title}</h1>
        <p className="mt-1 text-xs text-hb-leaf">Last updated: {updated}</p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-hb-forest [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-hb-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
          <h2>Contact</h2>
          <p>
            {business.name}
            {business.address ? <><br />{business.address}</> : null}
            <br />Email: <a className="text-hb-action underline" href={`mailto:${business.email}`}>{business.email}</a>
            {business.phone ? <><br />Phone: {business.phone}</> : null}
            {business.gstin ? <><br />GSTIN: {business.gstin}</> : null}
          </p>
        </div>
        <nav className="mt-8 flex flex-wrap gap-4 border-t border-hb-sand pt-4 text-xs font-semibold text-hb-action">
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms &amp; conditions</Link>
          <Link href="/refund">Refund &amp; cancellation</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </article>
    </main>
  );
}
