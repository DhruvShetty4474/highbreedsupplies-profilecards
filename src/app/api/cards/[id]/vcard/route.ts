import { fetchProfileById, fetchProfileByUsername } from "@/lib/data";
import { buildVCard } from "@/lib/vcard";
import { NextResponse } from "next/server";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const id = params.id;
  let profile = await fetchProfileById(id);
  if (!profile) {
    profile = await fetchProfileByUsername(id);
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const vcard = buildVCard(profile);
  const filename = `${profile.username || "highbreed"}.vcf`;

  return new NextResponse(vcard, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
