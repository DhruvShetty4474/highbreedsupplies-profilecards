/**
 * Persist self-registered / admin-created demo accounts across Vercel
 * serverless cold starts via an httpOnly cookie (lean credentials only).
 */
import {
  DEMO_ADMIN_ID,
  DEMO_CLIENT_ID,
  DEMO_DEMO_ID,
  type DemoAccount,
  demoAccounts,
  demoStats,
} from "@/lib/demo-store";
import { DEFAULT_PROFILE_LAYOUT, type Profile } from "@/lib/types";
import type { NextResponse } from "next/server";

export const DEMO_REGISTRY_COOKIE = "hb_demo_registry";

const SEED_IDS = new Set([DEMO_ADMIN_ID, DEMO_CLIENT_ID, DEMO_DEMO_ID]);

type LeanAccount = {
  user_id: string;
  login_id: string;
  password: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  designation: string;
  role: "client" | "admin";
  avatar_url?: string | null;
  banner_url?: string | null;
};

function toLean(account: DemoAccount): LeanAccount {
  return {
    user_id: account.user_id,
    login_id: account.login_id,
    password: account.password,
    username: account.profile.username,
    full_name: account.profile.full_name,
    email: account.profile.email,
    phone: account.profile.phone,
    designation: account.profile.designation || "",
    role: account.profile.role === "admin" ? "admin" : "client",
    avatar_url: account.profile.avatar_url,
    // Skip huge data-URL banners in cookie — keep short http(s) URLs only
    banner_url:
      account.profile.banner_url &&
      account.profile.banner_url.startsWith("http")
        ? account.profile.banner_url
        : null,
  };
}

function fromLean(lean: LeanAccount): DemoAccount {
  const profile: Profile = {
    user_id: lean.user_id,
    username: lean.username,
    full_name: lean.full_name,
    designation: lean.designation,
    location: "",
    bio: "",
    avatar_url: lean.avatar_url ?? null,
    banner_url: lean.banner_url ?? null,
    video_url: null,
    phone: lean.phone,
    email: lean.email,
    role: lean.role,
    layout: { ...DEFAULT_PROFILE_LAYOUT },
    social_links: [],
    content_blocks: [],
  };
  return {
    user_id: lean.user_id,
    login_id: lean.login_id,
    password: lean.password,
    profile,
  };
}

export function encodeDemoRegistry(accounts: DemoAccount[]) {
  const lean = accounts
    .filter((a) => !SEED_IDS.has(a.user_id))
    .map(toLean);
  return Buffer.from(JSON.stringify(lean), "utf8").toString("base64url");
}

export function decodeDemoRegistry(raw: string | undefined): LeanAccount[] {
  if (!raw) return [];
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as LeanAccount[]) : [];
  } catch {
    return [];
  }
}

/** Merge cookie registry into in-memory demoAccounts (idempotent). */
export function hydrateDemoAccountsFromCookie(raw: string | undefined) {
  const leans = decodeDemoRegistry(raw);
  for (const lean of leans) {
    if (demoAccounts.some((a) => a.user_id === lean.user_id)) continue;
    if (demoAccounts.some((a) => a.login_id === lean.login_id)) continue;
    demoAccounts.push(fromLean(lean));
    if (!demoStats.some((s) => s.user_id === lean.user_id)) {
      demoStats.push({
        user_id: lean.user_id,
        reaches: 0,
        shares: 0,
        contact_saves: 0,
      });
    }
  }
  return leans.length;
}

export function snapshotExtraAccounts() {
  return demoAccounts.filter((a) => !SEED_IDS.has(a.user_id));
}

export function attachDemoRegistryCookie(response: NextResponse) {
  const value = encodeDemoRegistry(snapshotExtraAccounts());
  // Cap ~3.5KB — drop older extras if somehow oversized
  if (value.length > 3500) {
    const extras = snapshotExtraAccounts().slice(-8);
    response.cookies.set(DEMO_REGISTRY_COOKIE, encodeDemoRegistry(extras), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }
  response.cookies.set(DEMO_REGISTRY_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
