import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadReceiptFile } from "@/lib/s3";
import { z } from "zod";

const createBody = z.object({
  name: z.string().min(1),
  fileUrl: z.string().min(1),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = (await params).id;
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { customerId: true, assignedTeamId: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { bookingId: id },
    orderBy: { uploadedAt: "asc" },
  });
  return NextResponse.json(attachments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = (await params).id;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const name = formData.get("name") as string | null;
  const file = formData.get("file") as File | null;
  if (!name?.trim()) {
    return NextResponse.json({ error: "Missing attachment name" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "pdf";
  const key = `receipts/${id}/${Date.now()}-${name.replace(/\W/g, "_")}.${ext}`;

  await uploadReceiptFile(key, buffer, file.type || "application/octet-stream");

  const attachment = await prisma.attachment.create({
    data: {
      bookingId: id,
      type: "RECEIPT",
      name: name.trim(),
      fileUrl: key,
      uploadedById: session.user.id,
    },
  });
  return NextResponse.json(attachment);
}
