import { getSessionProfile } from "@/lib/auth";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { isDemoMode } from "@/lib/utils";
import { NextResponse } from "next/server";

const MAX_DEMO_BYTES = 900_000; // ~0.9MB for data-URL demo storage

export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "media");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Please upload an image file (JPG, PNG, WebP)" },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  if (isDemoMode() || !isR2Configured()) {
    if (bytes.length > MAX_DEMO_BYTES) {
      return NextResponse.json(
        {
          error:
            "Image is too large for demo upload (max ~900KB). Compress it or paste a public image URL.",
        },
        { status: 413 }
      );
    }
    const b64 = bytes.toString("base64");
    const url = `data:${file.type || "image/jpeg"};base64,${b64}`;
    return NextResponse.json({ ok: true, url, key: `demo/${kind}` });
  }

  const ext = file.name.split(".").pop() || "bin";
  const key = `profiles/${profile.user_id}/${kind}-${Date.now()}.${ext}`;

  const url = await uploadToR2({
    key,
    body: bytes,
    contentType: file.type || "application/octet-stream",
  });

  return NextResponse.json({ ok: true, url, key });
}
