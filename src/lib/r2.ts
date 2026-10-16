import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) {
    throw new Error("R2 is not configured. Set R2_* env vars.");
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );

  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (publicBase) {
    return `${publicBase}/${params.key}`;
  }

  return await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: params.key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}
