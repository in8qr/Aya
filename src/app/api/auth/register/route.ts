import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { logError } from "@/lib/logger";
import { sendVerificationOtpEmail, OTP_EXPIRY_MINUTES, generateOtp } from "@/lib/email-verification";
import { getClientKey, isRateLimited } from "@/lib/rate-limit";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  locale: z.enum(["en", "ar"]).optional(),
});

function firstValidationError(parsed: z.SafeParseError<unknown>): string {
  const flat = parsed.error.flatten();
  const field = flat.fieldErrors as Record<string, string[] | undefined>;
  const first = field?.name?.[0] ?? field?.email?.[0] ?? field?.password?.[0] ?? field?.phone?.[0];
  return first ?? "Invalid request. Check name, email and password.";
}

const REGISTER_RATE_LIMIT = 5;
const REGISTER_WINDOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const key = getClientKey(request);
    if (isRateLimited(`register:${key}`, REGISTER_RATE_LIMIT, REGISTER_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: firstValidationError(parsed) },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const locale = parsed.data.locale === "ar" ? "ar" : "en";
    const hashed = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        password: hashed,
        role: "CUSTOMER",
        active: true,
        emailVerifiedAt: null,
        preferredLocale: locale,
      },
    });

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await prisma.emailVerificationOtp.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email, otpHash, expiresAt },
      update: { otpHash, expiresAt },
    });

    const sent = await sendVerificationOtpEmail(parsed.data.email, otp, locale);
    if (!sent) {
      return NextResponse.json(
        { error: "Account created but we couldn't send the verification email. Check server SMTP configuration or contact support." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Check your email for the verification code.",
      email: parsed.data.email,
    });
  } catch (e) {
    logError("POST /api/auth/register failed", e);
    return NextResponse.json(
      { error: "Registration failed. Please try again or contact support." },
      { status: 503 }
    );
  }
}
