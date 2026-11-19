import { fetchProfileById, fetchProfileByUsername } from "@/lib/data";
import { appUrl } from "@/lib/utils";
import { buildVCard } from "@/lib/vcard";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  let profile = /^[0-9A-Za-z]{20,}$/.test(id) ? await fetchProfileById(id) : null;
  if (profile?.role === "superadmin") profile = null;
  if (!profile) {
    profile = await fetchProfileByUsername(id);
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const vcard = buildVCard(profile, appUrl());
  const filename = `${profile.username || "highbreed"}.vcf`;

  return new NextResponse(vcard, {
    status: 200,
    headers: {
      // Served inline: iOS shows the native "Add Contact" sheet straight
      // away; Android downloads it and offers Open → Contacts.
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
