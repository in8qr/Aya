import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logError } from "@/lib/logger";

const createBody = z.object({
  name: z.string().min(1),
  priceDisplay: z.string().min(1),
  durationMinutes: z.number().int().min(1),
  description: z.string().optional(),
  deliverables: z.string().optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const visibleOnly = !session?.user || session.user.role === "CUSTOMER";

    const packages = await prisma.package.findMany({
      where: visibleOnly ? { visible: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(packages);
  } catch (e) {
    logError("GET /api/packages failed", e);
    return NextResponse.json(
      { error: "Database unavailable. Check that PostgreSQL is running and migrations are applied." },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(parsed.error.flatten(), { status: 400 });
    }

    const pkg = await prisma.package.create({
      data: {
        ...parsed.data,
        visible: parsed.data.visible ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
    return NextResponse.json(pkg);
  } catch (e) {
    logError("POST /api/packages failed", e);
    return NextResponse.json(
      { error: "Could not create package. Database may be unavailable." },
      { status: 503 }
    );
  }
}
