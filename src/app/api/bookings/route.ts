import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkCapacity } from "@/lib/capacity";
import { logError } from "@/lib/logger";

const createBody = z.object({
  packageId: z.string().min(1),
  startAt: z.string(),
  durationMinutes: z.number().int().min(1),
  location: z.string().optional(),
  notes: z.string().optional(),
  locale: z.enum(["en", "ar"]).optional(),
  customerId: z.string().uuid().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role === "ADMIN") {
    const bookings = await prisma.booking.findMany({
      orderBy: { startAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        package: { select: { id: true, name: true, durationMinutes: true } },
        assignedTeam: { select: { id: true, name: true, email: true } },
        attachments: true,
      },
    });
    return NextResponse.json(bookings);
  }
  if (role === "TEAM") {
    const bookings = await prisma.booking.findMany({
      where: { assignedTeamId: session.user.id },
      orderBy: { startAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        package: { select: { id: true, name: true, durationMinutes: true } },
      },
    });
    return NextResponse.json(bookings);
  }
  const bookings = await prisma.booking.findMany({
    where: { customerId: session.user.id },
    orderBy: { startAt: "desc" },
    include: {
      package: { select: { id: true, name: true, durationMinutes: true } },
      assignedTeam: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== "CUSTOMER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createBody.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = first?.packageId?.[0] ?? first?.startAt?.[0] ?? "Invalid request. Please check date, time and package.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { packageId, startAt: startAtStr, durationMinutes, location, notes, locale } = parsed.data;
    const startAt = new Date(startAtStr);
    if (Number.isNaN(startAt.getTime())) {
      return NextResponse.json({ error: "Invalid date or time." }, { status: 400 });
    }

    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.visible) {
      return NextResponse.json({ error: "Package not found or not available" }, { status: 404 });
    }

    const capacityResult = await checkCapacity(startAt, durationMinutes);
    if (!capacityResult.allowed) {
      return NextResponse.json(
        { error: capacityResult.reason },
        { status: 400 }
      );
    }

    const customerId =
      session.user.role === "CUSTOMER"
        ? session.user.id
        : parsed.data.customerId ?? null;
    if (session.user.role === "ADMIN" && parsed.data.customerId) {
      const customer = await prisma.user.findFirst({
        where: { id: parsed.data.customerId, role: "CUSTOMER" },
      });
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 400 });
      }
    }

    const customerLocale = locale === "ar" ? "ar" : "en";
    const booking = await prisma.booking.create({
      data: {
        customerId: customerId ?? session.user.id,
        packageId,
        startAt,
        durationMinutes,
        location: location ?? null,
        notes: notes ?? null,
        customerLocale,
        status: "PENDING_REVIEW",
      },
      include: {
        package: { select: { name: true } },
        customer: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(booking);
  } catch (e) {
    logError("POST /api/bookings failed", e);
    return NextResponse.json(
      { error: "Could not submit booking. Database may be unavailable. Check logs/app.log." },
      { status: 503 }
    );
  }
}
