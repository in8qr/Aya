import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logError } from "@/lib/logger";

const createBody = z.object({
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().url(),
  sortOrder: z.number().int().optional(),
  visible: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const visibleOnly = !session?.user || session.user.role !== "ADMIN";

    const items = await prisma.portfolioItem.findMany({
      where: visibleOnly ? { visible: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    let filtered = items;
    if (category) {
      filtered = filtered.filter((i) => i.category === category);
    }
    if (tag) {
      filtered = filtered.filter((i) => i.tags.includes(tag));
    }
    return NextResponse.json(filtered);
  } catch (e) {
    logError("GET /api/portfolio failed", e);
    return NextResponse.json(
      { error: "Database unavailable. Check that PostgreSQL is running." },
      { status: 503 }
    );
  }
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

  const item = await prisma.portfolioItem.create({
    data: {
      ...parsed.data,
      sortOrder: parsed.data.sortOrder ?? 0,
      visible: parsed.data.visible ?? true,
    },
  });
  return NextResponse.json(item);
}
