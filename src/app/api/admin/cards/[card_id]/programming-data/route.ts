import { getSessionProfile } from "@/lib/auth";
import { fetchCardById } from "@/lib/data";
import { NextResponse } from "next/server";

type Params = { params: { card_id: string } };

/**
 * Factory provisioning payload for NXP TagWriter / USB writers.
 * Protected by admin session. Returns the exact NFC URI string to write.
 */
export async function GET(_request: Request, { params }: Params) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const card = await fetchCardById(params.card_id);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const programming_status = card.programming_verified
    ? "PROGRAMMED"
    : "UNPROGRAMMED";

  return NextResponse.json({
    card_id: card.card_id,
    public_token: card.public_token,
    /** Lifecycle status for the smart router (UNCLAIMED | ACTIVE | BLOCKED) */
    status: card.status,
    /** Factory write state — programming ≠ activation */
    programming_status,
    programming_verified: card.programming_verified,
    nfc_uid: card.nfc_uid ?? null,
    /** Exact URI payload for NFC NDEF URI record */
    nfc_url: card.nfc_url,
    qr_url: card.qr_url,
    brand_url: "https://highbreedsupplies.com",
    write_instructions: {
      ndef_type: "U",
      record: card.nfc_url,
      verify_endpoint: `/api/admin/cards/${card.card_id}/verify`,
      note: "Mark PROGRAMMED only after successful read-back. Do not auto-activate.",
    },
  });
}
