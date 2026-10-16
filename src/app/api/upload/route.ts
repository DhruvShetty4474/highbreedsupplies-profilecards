import { getSessionProfile } from "@/lib/auth";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error:
          "R2 is not configured. Set R2_* env vars, or paste a public media URL in the editor.",
      },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "media");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "bin";
  const key = `profiles/${profile.user_id}/${kind}-${Date.now()}.${ext}`;

  const url = await uploadToR2({
    key,
    body: bytes,
    contentType: file.type || "application/octet-stream",
  });

  return NextResponse.json({ ok: true, url, key });
}
