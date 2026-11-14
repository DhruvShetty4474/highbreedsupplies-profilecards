import { HighbreedWordmark } from "@/components/brand/logo";

/** Centered card used by the smaller auth pages (forgot/reset password). */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-hb-fog px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-hb-sand/80 bg-white p-7 shadow-soft sm:p-9">
        <HighbreedWordmark />
        <h1 className="mt-8 font-display text-3xl text-hb-ink">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm leading-relaxed text-hb-leaf">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
