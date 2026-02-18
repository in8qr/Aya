import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { logError } from "@/lib/logger";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
});

function firstValidationError(parsed: z.SafeParseError<unknown>): string {
  const flat = parsed.error.flatten();
  const field = flat.fieldErrors as Record<string, string[] | undefined>;
  const first = field?.name?.[0] ?? field?.email?.[0] ?? field?.password?.[0] ?? field?.phone?.[0];
  return first ?? "Invalid request. Check name, email and password.";
}

export async function POST(request: NextRequest) {
  try {
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

    const hashed = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        password: hashed,
        role: "CUSTOMER",
        active: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    logError("POST /api/auth/register failed", e);
    return NextResponse.json(
      { error: "Registration failed. Please try again or contact support." },
      { status: 503 }
    );
  }
}
