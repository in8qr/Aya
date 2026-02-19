import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReceiptSignedUrl, isS3Configured } from "@/lib/s3";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, attachmentId } = await params;
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, bookingId: id },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let url: string;
  if (isS3Configured()) {
    url = await getReceiptSignedUrl(attachment.fileUrl);
  } else {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    url = `${baseUrl}/api/storage/receipts/${encodeURIComponent(attachment.fileUrl)}`;
  }
  return NextResponse.json({ url });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId, attachmentId } = await params;
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, bookingId },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.attachment.delete({ where: { id: attachmentId } });
  return NextResponse.json({ success: true });
}
