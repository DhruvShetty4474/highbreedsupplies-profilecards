import type { AdminMetrics, Card, Lead } from "@/lib/types";
import {
  DEMO_ADMIN_ID,
  DEMO_CLIENT_ID,
  demoAccounts,
  getDemoProfileById,
  getDemoProfileByUsername,
} from "@/lib/demo-store";

export {
  DEMO_ADMIN_ID,
  DEMO_CLIENT_ID,
  getDemoProfileById,
  getDemoProfileByUsername,
};

export const demoCards: Card[] = [
  {
    card_id: "HB000001",
    public_token: "A7X92KP4",
    nfc_url: "https://highbreedsupplies.com/c/A7X92KP4",
    qr_url: "https://highbreedsupplies.com/c/A7X92KP4",
    status: "UNCLAIMED",
    user_id: null,
    batch_id: "BATCH-2026-001",
    programmed_at: null,
    activated_at: null,
    blocked_at: null,
    programming_verified: false,
    nfc_uid: null,
  },
  {
    card_id: "HB000002",
    public_token: "tok_hb000002_demo",
    nfc_url: "https://highbreedsupplies.com/c/tok_hb000002_demo",
    qr_url: "https://highbreedsupplies.com/c/tok_hb000002_demo",
    status: "ACTIVE",
    user_id: DEMO_CLIENT_ID,
    batch_id: "BATCH-2026-001",
    programmed_at: "2026-03-01T10:00:00.000Z",
    activated_at: "2026-03-10T12:00:00.000Z",
    blocked_at: null,
    programming_verified: true,
    nfc_uid: null,
  },
  {
    card_id: "HB000003",
    public_token: "tok_hb000003_demo",
    nfc_url: "https://highbreedsupplies.com/c/tok_hb000003_demo",
    qr_url: "https://highbreedsupplies.com/c/tok_hb000003_demo",
    status: "BLOCKED",
    user_id: null,
    batch_id: "BATCH-2026-001",
    programmed_at: "2026-03-01T10:05:00.000Z",
    activated_at: null,
    blocked_at: "2026-03-15T09:00:00.000Z",
    programming_verified: true,
    nfc_uid: null,
  },
  {
    card_id: "HB000004",
    public_token: "tok_hb000004_demo",
    nfc_url: "https://highbreedsupplies.com/c/tok_hb000004_demo",
    qr_url: "https://highbreedsupplies.com/c/tok_hb000004_demo",
    status: "UNCLAIMED",
    user_id: null,
    batch_id: "BATCH-2026-001",
    programmed_at: "2026-03-01T10:10:00.000Z",
    activated_at: null,
    blocked_at: null,
    programming_verified: true,
    nfc_uid: null,
  },
];

export const demoLeads: Lead[] = [
  {
    id: "lead-1",
    cardholder_user_id: DEMO_CLIENT_ID,
    visitor_name: "Mehta Equities",
    visitor_email: "rm@mehtaequities.com",
    visitor_phone: "+919820012345",
    visitor_note: "Interested in bulk HighCards for RM team.",
    created_at: "2026-03-12T08:30:00.000Z",
  },
  {
    id: "lead-2",
    cardholder_user_id: DEMO_CLIENT_ID,
    visitor_name: "Ananya Shah",
    visitor_email: "ananya@example.com",
    visitor_phone: "+917718090545",
    visitor_note: "Met at India Blockchain Week — follow up?",
    created_at: "2026-03-14T16:10:00.000Z",
  },
  {
    id: "lead-3",
    cardholder_user_id: DEMO_CLIENT_ID,
    visitor_name: "Linq Partner Desk",
    visitor_email: "partners@example.com",
    visitor_phone: null,
    visitor_note: "Channel partnership inquiry.",
    created_at: "2026-03-16T11:00:00.000Z",
  },
];

export function getDemoCardByToken(token: string) {
  return demoCards.find((c) => c.public_token === token);
}

export function getDemoCardById(cardId: string) {
  return demoCards.find((c) => c.card_id === cardId);
}

export function getDemoLeadsForUser(userId: string) {
  return demoLeads.filter((l) => l.cardholder_user_id === userId);
}

export function getDemoMetrics(): AdminMetrics {
  const clients = demoAccounts.filter((a) => a.profile.role === "client");
  return {
    total_cards: demoCards.length,
    unclaimed: demoCards.filter((c) => c.status === "UNCLAIMED").length,
    active: demoCards.filter((c) => c.status === "ACTIVE").length,
    blocked: demoCards.filter((c) => c.status === "BLOCKED").length,
    programmed: demoCards.filter((c) => c.programming_verified).length,
    total_profiles: clients.length,
    total_leads: demoLeads.length,
    batches: 1,
  };
}
