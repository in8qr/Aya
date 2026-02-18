import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfDay } from "date-fns";

const upsertBody = z.object({
  day: z.string().datetime(),
  capacity: z.number().int().min(0),
  reason: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) {
    const overrides = await prisma.capacityOverride.findMany({
      orderBy: { day: "asc" },
    });
    return NextResponse.json(overrides);
  }

  const overrides = await prisma.capacityOverride.findMany({
    where: {
      day: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    orderBy: { day: "asc" },
  });
  return NextResponse.json(overrides);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = upsertBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const day = startOfDay(new Date(parsed.data.day));
  const override = await prisma.capacityOverride.upsert({
    where: { day },
    create: {
      day,
      capacity: parsed.data.capacity,
      reason: parsed.data.reason ?? null,
    },
    update: {
      capacity: parsed.data.capacity,
      reason: parsed.data.reason ?? null,
    },
  });
  return NextResponse.json(override);
}
