import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { cardsToCsv } from "@/lib/cards";
import { fetchCardsForBatch } from "@/lib/data";

type Params = { params: Promise<{ batch_id: string }> };

/** Admin: CSV for the printer / NFC writer. */
export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { batch_id } = await params;
    const cards = await fetchCardsForBatch(batch_id);
    if (!cards.length) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    return new NextResponse(cardsToCsv(cards), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${batch_id.replace(/[^A-Za-z0-9_-]/g, "")}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
