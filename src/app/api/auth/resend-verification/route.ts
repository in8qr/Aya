import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { sendVerificationOtpEmail, OTP_EXPIRY_MINUTES, generateOtp } from "@/lib/email-verification";
import { getClientKey, isRateLimited } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
});

const RESEND_RATE_LIMIT = 5;
const RESEND_WINDOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const key = getClientKey(request);
    if (isRateLimited(`resend:${key}`, RESEND_RATE_LIMIT, RESEND_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!user || user.emailVerifiedAt) {
      return NextResponse.json(
        { error: "No unverified account found for this email." },
        { status: 400 }
      );
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await prisma.emailVerificationOtp.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email, otpHash, expiresAt },
      update: { otpHash, expiresAt },
    });

    const locale = user.preferredLocale === "ar" ? "ar" : "en";
    const sent = await sendVerificationOtpEmail(parsed.data.email, otp, locale);
    if (!sent) {
      return NextResponse.json(
        { error: "Could not send verification email. Check server configuration." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, message: "Verification code sent." });
  } catch {
    return NextResponse.json(
      { error: "Request failed. Please try again." },
      { status: 503 }
    );
  }
}
