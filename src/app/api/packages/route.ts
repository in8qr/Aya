import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logError } from "@/lib/logger";

const createBody = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  priceDisplay: z.string().min(1),
  durationMinutes: z.number().int().min(1),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  deliverables: z.string().optional(),
  deliverablesAr: z.string().optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/** Resolve localized name, description, deliverables for a package. */
function localizePackage(
  pkg: { name: string; nameAr: string | null; description: string | null; descriptionAr: string | null; deliverables: string | null; deliverablesAr: string | null },
  locale: string
) {
  const isAr = locale === "ar";
  return {
    ...pkg,
    name: (isAr && pkg.nameAr) ? pkg.nameAr : pkg.name,
    description: (isAr && pkg.descriptionAr) ? pkg.descriptionAr : pkg.description,
    deliverables: (isAr && pkg.deliverablesAr) ? pkg.deliverablesAr : pkg.deliverables,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const visibleOnly = !session?.user || session.user.role === "CUSTOMER";
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") || "en").toLowerCase() === "ar" ? "ar" : "en";

    const packages = await prisma.package.findMany({
      where: visibleOnly ? { visible: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    const isAdmin = session?.user?.role === "ADMIN";
    const payload = isAdmin ? packages : packages.map((pkg) => localizePackage(pkg, locale));
    return NextResponse.json(payload);
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
