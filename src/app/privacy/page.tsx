import { LegalPage, getBusiness } from "@/components/legal/legal-page";

export const metadata = { title: "Privacy policy" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const b = await getBusiness();
  return (
    <LegalPage title="Privacy policy" updated="24 November 2026" business={b}>
      <p>
        This policy explains how {b.name} (&quot;we&quot;) collects and uses information when you use
        highfis.com and our NFC/QR digital business cards.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email address and password.</li>
        <li>Profile details you choose to publish: photo, job title, company, phone, links and similar.</li>
        <li>Billing details at checkout: name, phone, email, address and GSTIN (if provided).</li>
        <li>Contact details visitors share with you through your profile (leads).</li>
        <li>Basic usage data such as card taps and profile views.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To create your account and send one-time sign-in and verification codes by email.</li>
        <li>To show your public profile when someone taps or scans your card.</li>
        <li>To process payments and issue GST invoices.</li>
        <li>To prevent fraud and abuse, and to provide support.</li>
      </ul>
      <h2>Sharing</h2>
      <p>
        We do not sell or rent your personal data. We share it only with trusted service providers who
        help us operate the service, under confidentiality obligations, or where required by law. Your
        public profile is visible to anyone with your card or link; everything else stays private.
      </p>
      <h2>Payments</h2>
      <p>
        Online payments are processed by a secure, RBI-compliant payment partner. We never see or store
        your UPI PIN, card or bank details.
      </p>
      <h2>Retention and your choices</h2>
      <p>
        You can edit your profile at any time. To delete your account and data, email us from your
        registered address. Invoices are kept as required by Indian tax law.
      </p>
      <h2>Security</h2>
      <p>
        We use industry-standard safeguards to protect your information. No method of transmission or
        storage is completely secure, but we take reasonable steps to keep your data safe.
      </p>
    </LegalPage>
  );
}
