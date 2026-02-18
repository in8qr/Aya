import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfDay } from "date-fns";

const createBody = z.object({
  day: z.string().datetime(),
  fullDay: z.boolean().optional(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
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
    const blocks = await prisma.dayBlock.findMany({
      orderBy: { day: "asc" },
    });
    return NextResponse.json(blocks);
  }

  const blocks = await prisma.dayBlock.findMany({
    where: {
      day: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    orderBy: { day: "asc" },
  });
  return NextResponse.json(blocks);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const day = startOfDay(new Date(parsed.data.day));
  const block = await prisma.dayBlock.create({
    data: {
      day,
      fullDay: parsed.data.fullDay ?? false,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : null,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null,
      reason: parsed.data.reason ?? null,
    },
  });
  return NextResponse.json(block);
}
