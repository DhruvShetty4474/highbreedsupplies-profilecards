import type { Metadata } from "next";
// Self-hosted (no build-time fetch from Google Fonts).
import "@fontsource-variable/fraunces";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HIGHBREED — HighCard Digital Identity",
    template: "%s · HIGHBREED",
  },
  description:
    "Premium NFC business cards and mobile-first digital profiles. Claim, customize, and capture leads with HIGHBREED.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://highbreedsupplies.com"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
