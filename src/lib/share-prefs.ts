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

export function qrImageUrl(data: string, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=12`;
}
