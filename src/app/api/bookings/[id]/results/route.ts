import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReceiptSignedUrl, isS3Configured } from "@/lib/s3";
import { getAppUrl } from "@/lib/site-settings";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";

const bodySchema = z.object({ password: z.string().min(1, "Password is required") });

const RESULTS_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function createResultsToken(bookingId: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  const exp = Date.now() + RESULTS_TOKEN_EXPIRY_MS;
  const payload = JSON.stringify({ b: bookingId, exp });
  const payloadB64 = Buffer.from(payload, "utf-8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = (await params).id;
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      customerId: true,
      resultsPasswordHash: true,
      sessionStatus: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.customerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.sessionStatus !== "COMPLETED") {
    return NextResponse.json({ error: "Results are not available for this booking." }, { status: 400 });
  }
  if (!booking.resultsPasswordHash) {
    return NextResponse.json({ error: "Results are not ready yet." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.password?.[0] ?? "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const passwordValid = await bcrypt.compare(parsed.data.password, booking.resultsPasswordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { bookingId: id, type: "SESSION_RESULT" },
    orderBy: { uploadedAt: "asc" },
    select: { id: true, name: true, fileUrl: true },
  });

  const baseUrl = await getAppUrl();
  const token = createResultsToken(id);

  const results = await Promise.all(
    attachments.map(async (a) => {
      if (isS3Configured()) {
        const url = await getReceiptSignedUrl(a.fileUrl);
        return { id: a.id, name: a.name, url };
      }
      const url = `${baseUrl}/api/bookings/${id}/results/file/${a.id}?token=${encodeURIComponent(token)}`;
      return { id: a.id, name: a.name, url };
    })
  );

  return NextResponse.json({ results });
}
