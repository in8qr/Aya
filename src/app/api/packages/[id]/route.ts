import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateBody = z.object({
  name: z.string().min(1).optional(),
  nameAr: z.string().nullable().optional(),
  priceDisplay: z.string().min(1).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  description: z.string().optional(),
  descriptionAr: z.string().nullable().optional(),
  deliverables: z.string().optional(),
  deliverablesAr: z.string().nullable().optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function localizePackage(
  pkg: { name: string; nameAr: string | null; description: string | null; descriptionAr: string | null; deliverables: string | null; deliverablesAr: string | null },
  locale: string
) {
  const isAr = locale === "ar";
  return {
    ...pkg,
    name: (isAr && pkg.nameAr) ? pkg.nameAr : pkg.name,
    description: (isAr && pkg.descriptionAr) ? pkg.descriptionAr : pkg.description,
    deliverables: (isAr && pkg.deliverablesAr) ? pkg.deliverablesAr : pkg.deliverables,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN" && !pkg.visible) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get("locale") || "en").toLowerCase() === "ar" ? "ar" : "en";
  return NextResponse.json(localizePackage(pkg, locale));
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
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = updateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const raw = parsed.data;
  const data: Record<string, unknown> = {};
  if (raw.name !== undefined) data.name = raw.name;
  if (raw.nameAr !== undefined) data.nameAr = raw.nameAr;
  if (raw.priceDisplay !== undefined) data.priceDisplay = raw.priceDisplay;
  if (raw.durationMinutes !== undefined) data.durationMinutes = raw.durationMinutes;
  if (raw.description !== undefined) data.description = raw.description;
  if (raw.descriptionAr !== undefined) data.descriptionAr = raw.descriptionAr;
  if (raw.deliverables !== undefined) data.deliverables = raw.deliverables;
  if (raw.deliverablesAr !== undefined) data.deliverablesAr = raw.deliverablesAr;
  if (raw.sortOrder !== undefined) data.sortOrder = raw.sortOrder;
  if (typeof body.visible === "boolean") data.visible = body.visible;
  else if (raw.visible !== undefined) data.visible = raw.visible;

  const pkg = await prisma.package.update({
    where: { id },
    data: data as Parameters<typeof prisma.package.update>[0]["data"],
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
