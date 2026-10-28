import {
  DEFAULT_PROFILE_LAYOUT,
  type ContentBlock,
  type Profile,
} from "@/lib/types";
import { customAlphabet } from "nanoid";

export const DEMO_ADMIN_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_CLIENT_ID = "22222222-2222-2222-2222-222222222222";
export const DEMO_DEMO_ID = "33333333-3333-3333-3333-333333333333";

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

const pranayBlocks: ContentBlock[] = [
  {
    id: "b1",
    type: "text",
    title: "What we offer",
    body: "Premium NFC HighCards, digital identity pages, and lead capture for modern Indian businesses.",
    sort_order: 0,
    visible: true,
  },
  {
    id: "b2",
    type: "image",
    title: "HighCard product",
    url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    sort_order: 1,
    visible: true,
  },
  {
    id: "b3",
    type: "gallery",
    title: "Moments",
    urls: [
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80",
    ],
    sort_order: 2,
    visible: true,
  },
  {
    id: "b4",
    type: "video",
    title: "Intro video",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    sort_order: 3,
    visible: true,
  },
];

/** Only: admin + pranay + demo customer */
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
      bio: "Factory provisioning, customer accounts, and NFC operations.",
      avatar_url: null,
      banner_url: null,
      video_url: null,
      phone: "+919876543210",
      email: "admin@highbreedsupplies.com",
      role: "admin",
      social_links: [],
      content_blocks: [],
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
      bio: "Premium NFC HighCards and digital identity for modern businesses.",
      avatar_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
      banner_url:
        "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80",
      video_url: null,
      phone: "+917718090545",
      email: "highbreedworkflow1360@gmail.com",
      role: "client",
      layout: { ...DEFAULT_PROFILE_LAYOUT },
      content_blocks: pranayBlocks,
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
          type: "whatsapp",
          label: "WhatsApp",
          path: "https://wa.me/917718090545",
          visible: true,
          sort_order: 3,
        },
      ],
    },
  },
  {
    user_id: DEMO_DEMO_ID,
    login_id: "demo",
    password: "demo123",
    profile: {
      user_id: DEMO_DEMO_ID,
      username: "demo",
      full_name: "Demo Customer",
      designation: "Sales Lead · Sample Account",
      location: "Bengaluru",
      bio: "This is a clean sample customer profile you can edit from Admin → Customers.",
      avatar_url:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
      banner_url:
        "https://images.unsplash.com/photo-1579546929518-9e396f30ccb4?w=1200&q=80",
      video_url: null,
      phone: "+919876501234",
      email: "demo@highbreedsupplies.com",
      role: "client",
      layout: { ...DEFAULT_PROFILE_LAYOUT },
      content_blocks: [
        {
          id: "d1",
          type: "image",
          title: "Featured",
          url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
          sort_order: 0,
          visible: true,
        },
        {
          id: "d2",
          type: "text",
          title: "About this demo",
          body: "Use login demo / demo123. Admin can edit this profile from the Customers screen.",
          sort_order: 1,
          visible: true,
        },
      ],
      social_links: [
        {
          id: "ds1",
          type: "website",
          label: "Website",
          path: "https://highbreedsupplies.com",
          visible: true,
          sort_order: 0,
        },
        {
          id: "ds2",
          type: "linkedin",
          label: "LinkedIn",
          path: "https://linkedin.com",
          visible: true,
          sort_order: 1,
        },
      ],
    },
  },
];

export const demoStats: ProfileStats[] = [
  { user_id: DEMO_CLIENT_ID, reaches: 0, shares: 0, contact_saves: 0 },
  { user_id: DEMO_DEMO_ID, reaches: 0, shares: 0, contact_saves: 0 },
];

export function findAccountByLogin(loginId: string) {
  const key = loginId.trim().toLowerCase();
  return (
    demoAccounts.find(
      (a) =>
        a.login_id.toLowerCase() === key ||
        a.profile.email?.toLowerCase() === key
    ) ?? null
  );
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
  if (findAccountByLogin(login)) throw new Error("Login ID or email already exists");
  if (getDemoProfileByUsername(username)) throw new Error("Username already exists");
  if (
    input.email &&
    demoAccounts.some(
      (a) => a.profile.email?.toLowerCase() === input.email!.trim().toLowerCase()
    )
  ) {
    throw new Error("Email already registered");
  }

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
    content_blocks: [],
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
    content_blocks: updates.content_blocks ?? account.profile.content_blocks,
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
