import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
});

// GET – public: list carousel slides
export async function GET() {
  try {
    const slides = await prisma.homeCarouselSlide.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, imageUrl: true, caption: true, sortOrder: true },
    });
    return NextResponse.json(slides);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

// POST – admin: add a slide
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 }
    );
  }

  const maxOrder = await prisma.homeCarouselSlide.aggregate({
    _max: { sortOrder: true },
  });
  const sortOrder =
    parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  const slide = await prisma.homeCarouselSlide.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      caption: parsed.data.caption ?? null,
      sortOrder,
    },
  });

  return NextResponse.json({
    id: slide.id,
    imageUrl: slide.imageUrl,
    caption: slide.caption,
    sortOrder: slide.sortOrder,
  });
}
