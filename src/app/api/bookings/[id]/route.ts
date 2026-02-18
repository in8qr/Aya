import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkCapacity } from "@/lib/capacity";
import { sendAssignmentEmail, sendConfirmationEmail, sendRejectionEmail } from "@/lib/email";
import { logError } from "@/lib/logger";

const assignBody = z.object({ assignedTeamId: z.string().uuid().nullable() });
const rejectBody = z.object({ reason: z.string().max(2000).optional() });

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
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      package: true,
      assignedTeam: { select: { id: true, name: true, email: true } },
      attachments: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.user.role === "ADMIN") {
    return NextResponse.json(booking);
  }
  if (session.user.role === "TEAM" && booking.assignedTeamId === session.user.id) {
    return NextResponse.json(booking);
  }
  if (booking.customerId === session.user.id) {
    const { attachments, ...rest } = booking;
    void attachments; // exclude from response for customer
    return NextResponse.json({ ...rest, attachments: undefined });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      package: true,
      assignedTeam: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body !== null && typeof body === "object" && "assignedTeamId" in body) {
    const parsed = assignBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(parsed.error.flatten(), { status: 400 });
    }
    const { assignedTeamId } = parsed.data;
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        assignedTeamId,
        status: assignedTeamId ? "ASSIGNED" : "PENDING_REVIEW",
      },
      include: {
        customer: true,
        package: true,
        assignedTeam: true,
      },
    });
    if (assignedTeamId) {
      const teamUser = await prisma.user.findUnique({
        where: { id: assignedTeamId },
      });
      if (teamUser?.email) {
        try {
          await sendAssignmentEmail({
            to: teamUser.email,
            teamMemberName: teamUser.name,
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            customerPhone: booking.customer.phone ?? null,
            packageName: booking.package.name,
            startAt: booking.startAt,
            durationMinutes: booking.durationMinutes,
            location: booking.location,
          });
        } catch (e) {
          logError("Assignment email failed", e);
        }
      }
    }
    return NextResponse.json(updated);
  }

  if (typeof body === "object" && body !== null && "status" in body && (body as { status: string }).status === "CONFIRMED") {
    const capacityResult = await checkCapacity(
      booking.startAt,
      booking.durationMinutes,
      id
    );
    if (!capacityResult.allowed) {
      return NextResponse.json(
        { error: capacityResult.reason },
        { status: 400 }
      );
    }
    await prisma.booking.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });
    try {
      await sendConfirmationEmail({
        to: booking.customer.email,
        customerName: booking.customer.name,
        packageName: booking.package.name,
        startAt: booking.startAt,
        durationMinutes: booking.durationMinutes,
        location: booking.location,
        teamMemberName: booking.assignedTeam?.name ?? null,
      });
    } catch (e) {
      logError("Confirmation email failed", e);
    }
    const updated = await prisma.booking.findUnique({
      where: { id },
      include: { customer: true, package: true, assignedTeam: true },
    });
    return NextResponse.json(updated);
  }

  if (typeof body === "object" && body !== null && "status" in body && (body as { status: string }).status === "REJECTED") {
    const parsed = rejectBody.safeParse(body);
    const reason = parsed.success && parsed.data.reason ? parsed.data.reason.trim() : null;
    await prisma.booking.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    try {
      await sendRejectionEmail({
        to: booking.customer.email,
        customerName: booking.customer.name,
        packageName: booking.package.name,
        startAt: booking.startAt,
        reason: reason ?? undefined,
      });
    } catch (e) {
      logError("Rejection email failed", e);
    }
    const updated = await prisma.booking.findUnique({
      where: { id },
      include: { customer: true, package: true, assignedTeam: true },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
