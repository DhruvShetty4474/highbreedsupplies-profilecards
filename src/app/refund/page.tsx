import { LegalPage, getBusiness } from "@/components/legal/legal-page";

export const metadata = { title: "Refund & cancellation policy" };
export const dynamic = "force-dynamic";

export default async function RefundPage() {
  const b = await getBusiness();
  return (
    <LegalPage title="Refund & cancellation policy" updated="24 November 2026" business={b}>
      <h2>Cancellation</h2>
      <p>
        You can cancel an order any time before payment is completed. Unpaid card reservations are
        cancelled automatically after 7 days.
      </p>
      <h2>Refunds</h2>
      <ul>
        <li>Faulty card: if the card&apos;s NFC or QR does not work, contact us within 7 days of
          activation and we will replace the card free of charge, or refund you if a replacement is
          not possible.</li>
        <li>Duplicate or failed payment: if you were charged twice or your payment went through but the
          card was not activated, we refund the extra amount in full.</li>
        <li>Once a card is activated and working, the activation fee is non-refundable.</li>
      </ul>
      <h2>Processing time</h2>
      <p>
        Approved refunds are sent to the original payment method (UPI/bank) within 5–7 working days.
        Cash payments are refunded through the manager who collected them.
      </p>
      <h2>Shipping</h2>
      <p>Cards are handed over in person by our authorised managers; no shipping charges apply.</p>
    </LegalPage>
  );
}
