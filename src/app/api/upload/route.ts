import { getSessionProfile } from "@/lib/auth";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { NextResponse } from "next/server";

// NOTE: Phase 4 replaces this with presigned direct uploads + quota.
const MAX_BYTES = 5 * 1024 * 1024;

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

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Media storage is not configured" }, { status: 503 });
  }
  if (bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 5 MB)" }, { status: 413 });
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
