import { DEFAULT_PROFILE_LAYOUT, type Profile } from "@/lib/types";
import { customAlphabet } from "nanoid";

export const DEMO_ADMIN_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_CLIENT_ID = "22222222-2222-2222-2222-222222222222";

const idNano = customAlphabet("0123456789abcdef", 32);

export type DemoAccount = {
  user_id: string;
  login_id: string;
  password: string;
  profile: Profile;
};

export type ProfileStats = {
  user_id: string;
  reaches: number;
  shares: number;
  contact_saves: number;
};

/** In-memory auth store for demo / local prototype */
export const demoAccounts: DemoAccount[] = [
  {
    user_id: DEMO_ADMIN_ID,
    login_id: "admin",
    password: "123123",
    profile: {
      user_id: DEMO_ADMIN_ID,
      username: "admin",
      full_name: "HIGHBREED Admin",
      designation: "Platform Administrator",
      location: "Mumbai",
      bio: "Operations control for HighCard provisioning and analytics.",
      avatar_url: null,
      banner_url: null,
      video_url: null,
      phone: "+919876543210",
      email: "admin@highbreedsupplies.com",
      role: "admin",
      social_links: [],
    },
  },
  {
    user_id: DEMO_CLIENT_ID,
    login_id: "pranay",
    password: "pranay123",
    profile: {
      user_id: DEMO_CLIENT_ID,
      username: "pranay_brid",
      full_name: "Highbreed Supplies",
      designation: "Founder at Highbreed Supplies",
      location: "Mumbai",
      bio: "What we are — premium NFC HighCards and digital identity for modern businesses.",
      avatar_url: null,
      banner_url: null,
      video_url:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      phone: "+917718090545",
      email: "highbreedworkflow1360@gmail.com",
      role: "client",
      layout: { ...DEFAULT_PROFILE_LAYOUT },
      social_links: [
        {
          id: "s1",
          type: "website",
          label: "Website",
          path: "https://highbreedsupplies.com",
          visible: true,
          sort_order: 0,
        },
        {
          id: "s2",
          type: "instagram",
          label: "Instagram",
          path: "https://instagram.com/highbreedsupplies",
          visible: true,
          sort_order: 1,
        },
        {
          id: "s3",
          type: "linkedin",
          label: "LinkedIn",
          path: "https://linkedin.com/company/highbreed-supplies",
          visible: true,
          sort_order: 2,
        },
        {
          id: "s4",
          type: "facebook",
          label: "Facebook",
          path: "https://facebook.com/highbreedsupplies",
          visible: true,
          sort_order: 3,
        },
        {
          id: "s5",
          type: "whatsapp",
          label: "WhatsApp",
          path: "https://wa.me/917718090545",
          visible: true,
          sort_order: 4,
        },
        {
          id: "s6",
          type: "google_review",
          label: "Leave a Google Review",
          path: "https://g.page/r/highbreed/review",
          visible: true,
          sort_order: 5,
        },
      ],
    },
  },
];

export const demoStats: ProfileStats[] = [
  {
    user_id: DEMO_CLIENT_ID,
    reaches: 128,
    shares: 34,
    contact_saves: 19,
  },
];

export function findAccountByLogin(loginId: string) {
  const key = loginId.trim().toLowerCase();
  return demoAccounts.find((a) => a.login_id.toLowerCase() === key) ?? null;
}

export function findAccountByUserId(userId: string) {
  return demoAccounts.find((a) => a.user_id === userId) ?? null;
}

export function getDemoProfileById(userId: string) {
  return findAccountByUserId(userId)?.profile ?? null;
}

export function getDemoProfileByUsername(username: string) {
  return (
    demoAccounts.find(
      (a) => a.profile.username.toLowerCase() === username.toLowerCase()
    )?.profile ?? null
  );
}

export function listClientAccounts() {
  return demoAccounts.filter((a) => a.profile.role === "client");
}

export function createDemoCustomer(input: {
  login_id: string;
  password: string;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  designation?: string;
}) {
  const login = input.login_id.trim().toLowerCase();
  const username = input.username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

  if (login.length < 3) throw new Error("Login ID must be at least 3 characters");
  if (username.length < 3) throw new Error("Username must be at least 3 characters");
  if (input.password.length < 4) throw new Error("Password must be at least 4 characters");
  if (findAccountByLogin(login)) throw new Error("Login ID already exists");
  if (getDemoProfileByUsername(username)) throw new Error("Username already exists");

  const user_id = `${idNano().slice(0, 8)}-${idNano().slice(0, 4)}-${idNano().slice(0, 4)}-${idNano().slice(0, 4)}-${idNano().slice(0, 12)}`;

  const profile: Profile = {
    user_id,
    username,
    full_name: input.full_name.trim(),
    designation: input.designation?.trim() || "",
    location: "",
    bio: "",
    avatar_url: null,
    banner_url: null,
    video_url: null,
    phone: input.phone || null,
    email: input.email || null,
    role: "client",
    layout: { ...DEFAULT_PROFILE_LAYOUT },
    social_links: [],
  };

  demoAccounts.push({
    user_id,
    login_id: login,
    password: input.password,
    profile,
  });

  demoStats.push({
    user_id,
    reaches: 0,
    shares: 0,
    contact_saves: 0,
  });

  return { user_id, login_id: login, profile };
}

export function updateDemoProfile(userId: string, updates: Partial<Profile>) {
  const account = findAccountByUserId(userId);
  if (!account) return null;
  account.profile = {
    ...account.profile,
    ...updates,
    user_id: account.user_id,
    role: account.profile.role,
    social_links: updates.social_links ?? account.profile.social_links,
    layout: updates.layout ?? account.profile.layout,
  };
  return account.profile;
}

export function getStats(userId: string): ProfileStats {
  let row = demoStats.find((s) => s.user_id === userId);
  if (!row) {
    row = { user_id: userId, reaches: 0, shares: 0, contact_saves: 0 };
    demoStats.push(row);
  }
  return row;
}

export function bumpStat(
  userId: string,
  field: "reaches" | "shares" | "contact_saves"
) {
  const row = getStats(userId);
  row[field] += 1;
  return row;
}
