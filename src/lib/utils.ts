import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { customAlphabet } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const tokenAlphabet = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  24
);

export function generatePublicToken() {
  return `tok_${tokenAlphabet()}`;
}

export function formatCardId(sequence: number) {
  return `HB${String(sequence).padStart(6, "0")}`;
}

export function appUrl(path = "") {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://highbreedsupplies.com";
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function cardNfcUrl(token: string) {
  return appUrl(`/c/${token}`);
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function avatarHue(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [160, 175, 145, 200, 30, 280, 210];
  return hues[Math.abs(hash) % hues.length];
}
