import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { logError } from "@/lib/logger";

const bodySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or verification code." },
        { status: 400 }
      );
    }

    const record = await prisma.emailVerificationOtp.findUnique({
      where: { email: parsed.data.email },
    });
    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired code. Request a new one from the register page." },
        { status: 400 }
      );
    }
    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationOtp.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "Verification code has expired. Request a new one." },
        { status: 400 }
      );
    }

    const ok = await bcrypt.compare(parsed.data.otp, record.otpHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: parsed.data.email },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationOtp.delete({ where: { id: record.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    logError("POST /api/auth/verify-email failed", e);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 503 }
    );
  }
}
