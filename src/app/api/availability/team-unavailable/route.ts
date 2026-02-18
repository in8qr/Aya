import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createBody = z.object({
  teamUserId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEAM")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamUserId = request.nextUrl.searchParams.get("teamUserId");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const where: { teamUserId?: string; startAt?: { gte: Date }; endAt?: { lte: Date } } = {};
  if (session.user.role === "TEAM") {
    where.teamUserId = session.user.id;
  } else if (teamUserId) {
    where.teamUserId = teamUserId;
  }
  if (from) where.startAt = { gte: new Date(from) };
  if (to) where.endAt = { lte: new Date(to) };

  const list = await prisma.teamUnavailable.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      teamUser: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json(list);
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

  const item = await prisma.teamUnavailable.create({
    data: {
      teamUserId: parsed.data.teamUserId,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      reason: parsed.data.reason ?? null,
    },
    include: {
      teamUser: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(item);
}
