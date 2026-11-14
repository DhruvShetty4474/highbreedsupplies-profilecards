import { AwsClient } from "aws4fetch";
import { getConfig } from "@/config";

/**
 * Minimal object-store interface used by the media code. Production uses
 * R2's S3 API (presigned browser uploads need it anyway); tests use an
 * in-memory fake.
 */
export interface MediaStore {
  presignPut(key: string, contentType: string, expiresSeconds?: number): Promise<string>;
  head(key: string): Promise<{ size: number; contentType: string | null } | null>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export function mediaPublicBase() {
  return getConfig().R2_PUBLIC_URL;
}

export function isR2Configured() {
  return getConfig().features.media;
}

let override: MediaStore | null = null;
export function setMediaStoreForTesting(store: MediaStore | null) {
  override = store;
}

/** R2 via its S3-compatible endpoint, or null when R2 env vars are missing. */
export function getMediaStore(): MediaStore | null {
  if (override) return override;
  if (!isR2Configured()) return null;

  const config = getConfig();
  const client = new AwsClient({
    accessKeyId: config.R2_ACCESS_KEY_ID!,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${config.R2_BUCKET_NAME}`;
  const objectUrl = (key: string) =>
    `${endpoint}/${key.split("/").map(encodeURIComponent).join("/")}`;

  return {
    async presignPut(key, contentType, expiresSeconds = 600) {
      const url = new URL(objectUrl(key));
      url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
      // Content-Type is a signed header: the browser must send exactly it.
      const signed = await client.sign(
        new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }),
        { aws: { signQuery: true, allHeaders: true } }
      );
      return signed.url;
    },
    async head(key) {
      const res = await client.fetch(objectUrl(key), { method: "HEAD" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`R2 HEAD failed: ${res.status}`);
      return {
        size: Number(res.headers.get("content-length") ?? 0),
        contentType: res.headers.get("content-type"),
      };
    },
    async delete(key) {
      const res = await client.fetch(objectUrl(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE failed: ${res.status}`);
    },
    publicUrl(key) {
      return `${mediaPublicBase()}/${key}`;
    },
  };
}
