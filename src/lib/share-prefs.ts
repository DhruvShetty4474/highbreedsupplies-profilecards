/** In-memory Quick Share preferences (demo). */

export type QuickShareMode = "text" | "email" | null;

export type PageSharePrefs = {
  user_id: string;
  offline: boolean;
  quick_share: QuickShareMode;
};

const prefs = new Map<string, PageSharePrefs>();

export function getSharePrefs(userId: string): PageSharePrefs {
  const existing = prefs.get(userId);
  if (existing) return existing;
  const created: PageSharePrefs = {
    user_id: userId,
    offline: false,
    quick_share: null,
  };
  prefs.set(userId, created);
  return created;
}

export function updateSharePrefs(
  userId: string,
  patch: Partial<Omit<PageSharePrefs, "user_id">>
) {
  const current = getSharePrefs(userId);
  const next = { ...current, ...patch, user_id: userId };
  prefs.set(userId, next);
  return next;
}

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
