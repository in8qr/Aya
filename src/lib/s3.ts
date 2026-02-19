import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION ?? "us-east-1";
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

/** True when S3/MinIO is configured (endpoint + credentials). When false, use local receipt storage. */
export function isS3Configured(): boolean {
  return !!(
    endpoint &&
    forcePathStyle &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

const s3 =
  endpoint && forcePathStyle
    ? new S3Client({
        region,
        endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
        },
      })
    : new S3Client({
        region: process.env.S3_REGION ?? "us-east-1",
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
        },
      });

const portfolioBucket = process.env.S3_PORTFOLIO_BUCKET ?? "aya-portfolio";
const receiptsBucket = process.env.S3_RECEIPTS_BUCKET ?? "aya-receipts";

export function getPortfolioBucket() {
  return portfolioBucket;
}

export function getReceiptsBucket() {
  return receiptsBucket;
}

export async function uploadPortfolioFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: portfolioBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/storage/portfolio/${encodeURIComponent(key)}`;
}

export async function uploadReceiptFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: receiptsBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getReceiptSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: receiptsBucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function getPortfolioObject(key: string) {
  return s3.send(
    new GetObjectCommand({ Bucket: portfolioBucket, Key: key })
  );
}

export async function deletePortfolioFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: portfolioBucket, Key: key }));
}

export async function deleteReceiptFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: receiptsBucket, Key: key }));
}
