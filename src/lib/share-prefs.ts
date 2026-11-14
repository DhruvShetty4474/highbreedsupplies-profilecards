/** Quick Share preference types + share URL helpers. Stored on profiles. */

export type QuickShareMode = "text" | "email" | null;

export type PageSharePrefs = {
  user_id: string;
  offline: boolean;
  quick_share: QuickShareMode;
};

export function publicProfileUrl(username: string, origin?: string) {
  const base =
    origin?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/${username}`;
}

/** QR as a PNG data URL, generated locally (no third-party QR service). */
export async function qrDataUrl(data: string, size = 280) {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(data, { width: size, margin: 2, errorCorrectionLevel: "M" });
}
