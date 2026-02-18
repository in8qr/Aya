import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const teamOnly = request.nextUrl.searchParams.get("teamOnly") === "true";

  if (!start || !end) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  const fixedWhere: {
    startAt: { gte: Date; lte: Date };
    assignedTeamId?: string;
  } = {
    startAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (session.user.role === "TEAM" && teamOnly) {
    Object.assign(fixedWhere, { assignedTeamId: session.user.id });
  }

  const bookings = await prisma.booking.findMany({
    where: fixedWhere,
    include: {
      package: { select: { name: true, durationMinutes: true } },
      customer: { select: { name: true } },
      assignedTeam: { select: { id: true, name: true } },
    },
  });

  const events = bookings.map((b) => {
    const endAt = new Date(b.startAt.getTime() + b.durationMinutes * 60 * 1000);
    const title = `${b.package.name}${b.customer ? ` – ${b.customer.name}` : ""}`;
    const extendedProps = {
      bookingId: b.id,
      status: b.status,
      packageName: b.package.name,
      customerName: b.customer?.name,
      assignedTeamId: b.assignedTeam?.id,
      assignedTeamName: b.assignedTeam?.name,
    };

    // Long events (8+ hours) show as all-day bars so they don't display a time and span days clearly
    if (b.durationMinutes >= 480) {
      const dayStart = startOfDay(b.startAt);
      const dayEnd = addDays(startOfDay(endAt), 1);
      return {
        id: b.id,
        title,
        start: dayStart.toISOString(),
        end: dayEnd.toISOString(),
        allDay: true,
        extendedProps,
      };
    }

    return {
      id: b.id,
      title,
      start: b.startAt.toISOString(),
      end: endAt.toISOString(),
      extendedProps,
    };
  });

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(events);
  }

  const dayBlocks = await prisma.dayBlock.findMany({
    where: {
      day: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
  });

  const blockEvents = dayBlocks.map((block) => {
    const start = block.fullDay
      ? startOfDay(block.day)
      : (block.startAt ?? startOfDay(block.day));
    const end = block.fullDay
      ? endOfDay(block.day)
      : (block.endAt ?? endOfDay(block.day));
    return {
      id: `block-${block.id}`,
      title: block.reason ?? "Blocked",
      start: start.toISOString(),
      end: end.toISOString(),
      display: "background" as const,
      extendedProps: { type: "block" },
    };
  });

  return NextResponse.json([...events, ...blockEvents]);
}
