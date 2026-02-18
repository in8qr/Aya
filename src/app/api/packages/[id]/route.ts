import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateBody = z.object({
  name: z.string().min(1).optional(),
  priceDisplay: z.string().min(1).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  description: z.string().optional(),
  deliverables: z.string().optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user && !pkg.visible) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(pkg);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = (await params).id;
  const body = await request.json();
  const parsed = updateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const pkg = await prisma.package.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(pkg);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = (await params).id;
  await prisma.package.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
