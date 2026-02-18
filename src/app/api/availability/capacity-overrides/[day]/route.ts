import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayStr = (await params).day;
  const day = startOfDay(new Date(dayStr));
  await prisma.capacityOverride.deleteMany({ where: { day } });
  return NextResponse.json({ success: true });
}
