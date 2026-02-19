import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as bcrypt from "bcryptjs";

const createBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "TEAM"]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const team = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "TEAM"] } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      role: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(team);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
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
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      password: hashed,
      role: parsed.data.role,
      active: true,
      emailVerifiedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      role: true,
      createdAt: true,
    },
  });
  return NextResponse.json(user);
}
