import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/site-settings";
import { sendResultsReadyEmail } from "@/lib/email";
import { logError } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { z } from "zod";

const bodySchema = z.object({ password: z.string().min(1, "Password is required") });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "TEAM") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = (await params).id;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, preferredLocale: true } },
      package: { select: { name: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.assignedTeamId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessionResults = await prisma.attachment.count({
    where: { bookingId: id, type: "SESSION_RESULT" },
  });
  if (sessionResults === 0) {
    return NextResponse.json(
      { error: "Upload at least one session result before notifying the customer." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.password?.[0] ?? "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { password } = parsed.data;
  const resultsPasswordHash = await bcrypt.hash(password, 10);
  const locale = (booking.customerLocale ?? booking.customer.preferredLocale) === "ar" ? "ar" : "en";
  const baseUrl = await getAppUrl();
  const bookingsPath = locale === "ar" ? "/ar/bookings" : "/en/bookings";
  const bookingsUrl = `${baseUrl}${bookingsPath}`;

  await prisma.booking.update({
    where: { id },
    data: {
      resultsPasswordHash,
      resultsNotifiedAt: new Date(),
      sessionStatus: "COMPLETED",
    },
  });

  try {
    await sendResultsReadyEmail({
      to: booking.customer.email,
      customerName: booking.customer.name,
      packageName: booking.package.name,
      resultsPassword: password,
      bookingsUrl,
      locale,
    });
  } catch (e) {
    logError("Results ready email failed", e);
    return NextResponse.json(
      { error: "Notification saved but email could not be sent. Check server logs." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

