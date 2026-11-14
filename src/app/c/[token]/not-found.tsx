import { HighbreedWordmark } from "@/components/brand/logo";

/** Unknown / malformed card token → HTTP 404. */
export default function CardNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-hb-fog px-5">
      <div className="w-full max-w-[440px] rounded-[2rem] bg-white p-8 shadow-soft">
        <HighbreedWordmark />
        <h1 className="mt-8 font-display text-3xl text-hb-ink">Card not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-hb-leaf">
          This HighCard link is invalid or has not been provisioned yet.
        </p>
      </div>
    </main>
  );
}
