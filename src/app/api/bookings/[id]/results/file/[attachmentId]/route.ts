import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getReceiptFileBuffer } from "@/lib/local-storage";
import { getReceiptSignedUrl, isS3Configured } from "@/lib/s3";

function verifyResultsToken(token: string, bookingId: string): boolean {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (sig !== expectedSig) return false;
  let data: { b: string; exp: number };
  try {
    data = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  } catch {
    return false;
  }
  if (data.b !== bookingId || data.exp < Date.now()) return false;
  return true;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id: bookingId, attachmentId } = await params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !verifyResultsToken(token, bookingId)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  }

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, bookingId, type: "SESSION_RESULT" },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isS3Configured()) {
    const url = await getReceiptSignedUrl(attachment.fileUrl);
    return NextResponse.redirect(url);
  }

  const buf = getReceiptFileBuffer(attachment.fileUrl);
  if (!buf) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  const ext = attachment.fileUrl.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
    },
  });
}
