export type AppRole = "admin" | "client";
export type CardStatus = "UNCLAIMED" | "ACTIVE" | "BLOCKED";

export type SocialLink = {
  id: string;
  type:
    | "website"
    | "instagram"
    | "linkedin"
    | "facebook"
    | "whatsapp"
    | "twitter"
    | "youtube"
    | "google_review"
    | "email"
    | "phone"
    | "custom";
  label: string;
  path: string;
  sort_order?: number;
  visible?: boolean;
};

/** Visibility + order for public profile sections */
export type ProfileLayout = {
  show_hero: boolean;
  show_save_contact: boolean;
  show_exchange_contact: boolean;
  show_quick_actions: boolean;
  show_about: boolean;
  show_video: boolean;
  show_social: boolean;
  show_business: boolean;
  show_lead_banner: boolean;
  /** Section order keys */
  section_order: Array<
    "about" | "video" | "social" | "business"
  >;
};

export const DEFAULT_PROFILE_LAYOUT: ProfileLayout = {
  show_hero: true,
  show_save_contact: true,
  show_exchange_contact: true,
  show_quick_actions: true,
  show_about: true,
  show_video: true,
  show_social: true,
  show_business: true,
  show_lead_banner: true,
  section_order: ["about", "video", "social", "business"],
};

export type Profile = {
  user_id: string;
  username: string;
  full_name: string;
  designation: string;
  location: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  video_url: string | null;
  phone: string | null;
  email: string | null;
  social_links: SocialLink[];
  layout?: ProfileLayout;
  role: AppRole;
  theme?: { accent?: string; surface?: string };
  created_at?: string;
  updated_at?: string;
};

export type Card = {
  card_id: string;
  public_token: string;
  nfc_url: string;
  qr_url: string;
  /** Optional physical NTAG213 UID — not used as auth by itself */
  nfc_uid?: string | null;
  status: CardStatus;
  user_id: string | null;
  batch_id: string | null;
  programmed_at: string | null;
  activated_at: string | null;
  blocked_at: string | null;
  programming_verified: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Lead = {
  id: string;
  cardholder_user_id: string;
  visitor_name: string;
  visitor_email: string | null;
  visitor_phone: string | null;
  visitor_note: string | null;
  source_card_id?: string | null;
  created_at: string;
};

export type CardBatch = {
  batch_id: string;
  label: string;
  quantity: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type AdminMetrics = {
  total_cards: number;
  unclaimed: number;
  active: number;
  blocked: number;
  programmed: number;
  total_profiles: number;
  total_leads: number;
  batches: number;
};
