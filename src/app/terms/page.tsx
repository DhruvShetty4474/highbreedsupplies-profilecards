import { LegalPage, getBusiness } from "@/components/legal/legal-page";

export const metadata = { title: "Terms & conditions" };
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const b = await getBusiness();
  return (
    <LegalPage title="Terms & conditions" updated="24 November 2026" business={b}>
      <p>
        These terms apply to the purchase and use of {b.name} NFC/QR digital business cards and the
        highfis.com service. By activating a card or creating an account you agree to them.
      </p>
      <h2>The service</h2>
      <ul>
        <li>Each card links to one online profile that you manage on highfis.com.</li>
        <li>A card is activated with the one-time activation code supplied in its packaging, and becomes
          active once payment is confirmed. Each activation code can be used only once.</li>
        <li>Prices are shown in Indian Rupees and include GST where applicable. A GST invoice is issued
          for every paid order.</li>
      </ul>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Keep your login details safe and provide accurate information.</li>
        <li>Do not publish unlawful, misleading or infringing content on your profile.</li>
        <li>Report a lost or stolen card so we can block it.</li>
      </ul>
      <h2>Our rights</h2>
      <p>
        We may suspend or block a card or account that is misused or breaks these terms. We aim to keep
        the service available at all times but cannot guarantee uninterrupted access.
      </p>
      <h2>Liability</h2>
      <p>
        Our total liability for any claim is limited to the amount you paid for the card concerned.
      </p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India. Courts in Maharashtra have jurisdiction.</p>
    </LegalPage>
  );
}
