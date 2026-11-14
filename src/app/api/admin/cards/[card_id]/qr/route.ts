import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { fetchCardById } from "@/lib/data";

type Params = { params: Promise<{ card_id: string }> };

/** Admin: download a print-ready QR for one card (?format=svg|png). */
export async function GET(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { card_id } = await params;
    const card = await fetchCardById(card_id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const format = new URL(request.url).searchParams.get("format") === "png" ? "png" : "svg";
    const opts = { errorCorrectionLevel: "M" as const, margin: 2 };
    const headers = {
      "Content-Disposition": `attachment; filename="${card.card_id}-qr.${format}"`,
      "Cache-Control": "private, no-store",
    };

    if (format === "png") {
      const buf = await QRCode.toBuffer(card.qr_url, { ...opts, type: "png", width: 1024 });
      return new NextResponse(new Uint8Array(buf), {
        headers: { ...headers, "Content-Type": "image/png" },
      });
    }
    const svg = await QRCode.toString(card.qr_url, { ...opts, type: "svg" });
    return new NextResponse(svg, {
      headers: { ...headers, "Content-Type": "image/svg+xml" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
