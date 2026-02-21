import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { zodErrorToMessage } from "@/lib/zod-error";
import { z } from "zod";

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

export async function PATCH(request: NextRequest) {
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

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: zodErrorToMessage(parsed.error) },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      prisma.homeCarouselSlide.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
